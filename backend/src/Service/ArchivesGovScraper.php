<?php

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Paced scraper for archives.gov declassified-document "release" pages.
 *
 * archives.gov publishes a handful of canonical landing pages per collection
 * (JFK 2017, 2018, 2021, 2022, 2023, 2025; MLK 2025; Nixon; etc.) where every
 * released PDF is linked directly from a single HTML page. Those pages act
 * as perfect "topic" anchors for BlackVaultDocs:
 *  - topic = the release landing page
 *  - document = each linked PDF with its visible label
 *
 * Unlike vault.fbi.gov, archives.gov does not 403 AWS egress IPs, so we can
 * scrape politely with a normal HTTP client. Default pace is 1 request / 2s
 * with jitter so that we don't form a periodic fingerprint or hammer the
 * upstream CDN.
 */
final class ArchivesGovScraper
{
    private const SOURCE = 'archives_gov';
    private const BASE_URL = 'https://www.archives.gov';

    /**
     * Seed topic pages. Each row is:
     *   [slug, name, agency_slug, url, description]
     * Slugs are stable and used as DB keys.
     */
    private const TOPICS = [
        [
            'slug' => 'jfk-release-2025',
            'name' => 'JFK Assassination Records — 2025 Release',
            'agency' => 'nara',
            'url' => 'https://www.archives.gov/research/jfk/release-2025',
            'description' => 'Files released by the National Archives in 2025 under the President John F. Kennedy Assassination Records Collection Act of 1992, including previously redacted CIA, FBI, and State Department cables.',
        ],
        [
            'slug' => 'jfk-release-2023',
            'name' => 'JFK Assassination Records — 2023 Release',
            'agency' => 'nara',
            'url' => 'https://www.archives.gov/research/jfk/release2023',
            'description' => 'Files disclosed in 2023 from the President John F. Kennedy Assassination Records Collection, including newly released cables, memoranda, and operational files.',
        ],
        [
            'slug' => 'jfk-release-2022',
            'name' => 'JFK Assassination Records — 2022 Release',
            'agency' => 'nara',
            'url' => 'https://www.archives.gov/research/jfk/release2022',
            'description' => 'Files disclosed in 2022 from the President John F. Kennedy Assassination Records Collection.',
        ],
        [
            'slug' => 'jfk-release-2021',
            'name' => 'JFK Assassination Records — 2021 Release',
            'agency' => 'nara',
            'url' => 'https://www.archives.gov/research/jfk/release2021',
            'description' => 'Files disclosed in 2021 from the President John F. Kennedy Assassination Records Collection.',
        ],
        [
            'slug' => 'jfk-release-2018',
            'name' => 'JFK Assassination Records — 2018 Release',
            'agency' => 'nara',
            'url' => 'https://www.archives.gov/research/jfk/2018-release',
            'description' => 'Files disclosed in 2018 from the President John F. Kennedy Assassination Records Collection.',
        ],
        [
            'slug' => 'jfk-release-2017',
            'name' => 'JFK Assassination Records — 2017 Release',
            'agency' => 'nara',
            'url' => 'https://www.archives.gov/research/jfk/2017-release',
            'description' => 'Files disclosed in 2017 from the President John F. Kennedy Assassination Records Collection.',
        ],
        [
            'slug' => 'mlk-release-2025',
            'name' => 'MLK Jr. FBI Surveillance Records — 2025 Release',
            'agency' => 'nara',
            'url' => 'https://www.archives.gov/research/mlk',
            'description' => 'FBI surveillance records on the Rev. Dr. Martin Luther King Jr. disclosed by the National Archives in 2025 pursuant to Executive Order 14176.',
        ],
        [
            'slug' => 'rfk-release-2025',
            'name' => 'Robert F. Kennedy Assassination Records — 2025 Release',
            'agency' => 'nara',
            'url' => 'https://www.archives.gov/research/rfk',
            'description' => 'Files disclosed by the National Archives in 2025 from the Robert F. Kennedy assassination collection.',
        ],
    ];

    private const AGENCIES = [
        'nara' => [
            'name' => 'National Archives and Records Administration',
            'description' => 'Independent federal agency that preserves and documents government and historical records, including FOIA-released materials from the CIA, FBI, State Department, and others.',
        ],
    ];

    public function __construct(
        private readonly HttpClientInterface $http,
        private readonly Connection $conn,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function run(int $maxTopics = 0, int $maxDocsPerTopic = 0, int $delayMs = 2000): array
    {
        $this->ensureAgencies();
        $logId = $this->startLog('scrape', 'archives.gov');

        $topics = self::TOPICS;
        if ($maxTopics > 0) {
            $topics = array_slice($topics, 0, $maxTopics);
        }

        $docsAdded = 0;
        $docsSeen = 0;
        $topicsProcessed = 0;

        foreach ($topics as $topic) {
            try {
                [$seen, $added] = $this->scrapeTopic($topic, $maxDocsPerTopic);
                $docsSeen += $seen;
                $docsAdded += $added;
                $topicsProcessed++;
                $this->logger->info(sprintf(
                    '[archives-gov] topic %s — seen=%d added=%d',
                    $topic['slug'], $seen, $added,
                ));

                $this->conn->executeStatement(
                    'UPDATE scrape_log SET rows_added = ?, rows_seen = ? WHERE id = ?',
                    [$docsAdded, $docsSeen, $logId],
                );
            } catch (\Throwable $e) {
                $this->logger->error('[archives-gov] topic failed {slug}: {msg}', [
                    'slug' => $topic['slug'], 'msg' => $e->getMessage(),
                ]);
            }

            $this->sleep($delayMs);
        }

        $this->finishLog($logId, 'completed', $docsAdded, $docsSeen);
        $this->refreshCounts();

        return [
            'topics' => $topicsProcessed,
            'docs_seen' => $docsSeen,
            'docs_added' => $docsAdded,
        ];
    }

    /**
     * Scrape a single archives.gov release page. Treats every linked PDF on
     * the page as an individual document row.
     */
    private function scrapeTopic(array $topic, int $maxDocs): array
    {
        $html = $this->fetchHtml($topic['url']);
        if ($html === null) {
            return [0, 0];
        }

        $this->upsertTopic($topic['slug'], $topic['name'], $topic['description'] ?? null, $topic['agency']);

        // Parse <a> tags pointing at PDFs. archives.gov always exposes the
        // visible label as the anchor text; if the label is empty (icon-only
        // link) we fall back to the filename.
        preg_match_all(
            '#<a[^>]+href="([^"]+\.pdf)"[^>]*>(.*?)</a>#is',
            $html,
            $matches,
            \PREG_SET_ORDER,
        );

        $seen = 0;
        $added = 0;
        $dedupe = [];

        foreach ($matches as $m) {
            $href = html_entity_decode($m[1], \ENT_QUOTES | \ENT_HTML5, 'UTF-8');
            $label = $this->tidyText($m[2]);

            $abs = $this->absoluteUrl($topic['url'], $href);
            if ($abs === null) {
                continue;
            }
            if (isset($dedupe[$abs])) {
                continue;
            }
            $dedupe[$abs] = true;

            $externalId = (string) parse_url($abs, \PHP_URL_PATH);
            $filename = rawurldecode(basename($externalId));
            $filenameStem = preg_replace('/\.pdf$/i', '', $filename) ?? $filename;

            // archives.gov release pages almost universally render the
            // anchor as a tiny "PDF" icon/label — useless as an SEO title.
            // Prefer the filename stem, which for the Kennedy releases
            // encodes the NARA Record Identification Number (e.g.
            // "104-10020-10016") — the canonical handle researchers use.
            if ($label === '' || strlen($label) < 6 || strcasecmp($label, 'PDF') === 0) {
                $label = $filenameStem;
            }

            $seen++;
            if ($maxDocs > 0 && $seen > $maxDocs) {
                break;
            }

            $docSlug = $this->slugifyFromUrl($externalId, $topic['slug']);

            $inserted = $this->upsertDocument([
                'slug' => $docSlug,
                'source' => self::SOURCE,
                'external_id' => $externalId,
                'title' => $label,
                'summary' => null,
                'source_url' => $abs,
                'pdf_url' => $abs,
                'topic_slug' => $topic['slug'],
                'agency_slug' => $topic['agency'],
                'classification' => null,
                'released_at' => null,
            ]);
            $added += $inserted;
        }

        return [$seen, $added];
    }

    private function upsertTopic(string $slug, string $name, ?string $description, string $agencySlug): void
    {
        $this->conn->executeStatement(
            'INSERT INTO topics (slug, name, description, agency_slug)
             VALUES (:slug, :name, :desc, :agency)
             ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), agency_slug = VALUES(agency_slug)',
            [
                'slug' => $slug,
                'name' => mb_substr($name, 0, 255),
                'desc' => $description !== null ? mb_substr($description, 0, 2000) : null,
                'agency' => $agencySlug,
            ],
        );
    }

    private function upsertDocument(array $row): int
    {
        $affected = $this->conn->executeStatement(
            'INSERT IGNORE INTO documents
                (slug, source, external_id, title, summary, source_url, pdf_url,
                 topic_slug, agency_slug, classification, released_at)
             VALUES
                (:slug, :source, :extid, :title, :summary, :surl, :purl,
                 :topic, :agency, :cls, :released)',
            [
                'slug' => mb_substr($row['slug'], 0, 220),
                'source' => $row['source'],
                'extid' => mb_substr($row['external_id'], 0, 255),
                'title' => mb_substr($row['title'], 0, 500),
                'summary' => $row['summary'],
                'surl' => mb_substr($row['source_url'], 0, 1000),
                'purl' => $row['pdf_url'] !== null ? mb_substr($row['pdf_url'], 0, 1000) : null,
                'topic' => $row['topic_slug'],
                'agency' => $row['agency_slug'],
                'cls' => $row['classification'],
                'released' => $row['released_at'],
            ],
        );
        return (int) $affected > 0 ? 1 : 0;
    }

    private function ensureAgencies(): void
    {
        foreach (self::AGENCIES as $slug => $meta) {
            $this->conn->executeStatement(
                'INSERT INTO agencies (slug, name, description)
                 VALUES (:slug, :name, :desc)
                 ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)',
                [
                    'slug' => $slug,
                    'name' => $meta['name'],
                    'desc' => $meta['description'],
                ],
            );
        }
    }

    public function refreshCounts(): void
    {
        $this->conn->executeStatement(
            'UPDATE topics t
             LEFT JOIN (
                SELECT topic_slug, COUNT(*) AS n FROM documents
                WHERE topic_slug IS NOT NULL GROUP BY topic_slug
             ) d ON d.topic_slug = t.slug
             SET t.doc_count = IFNULL(d.n, 0)'
        );
        $this->conn->executeStatement(
            'UPDATE agencies a
             LEFT JOIN (
                SELECT agency_slug, COUNT(*) AS n FROM documents
                WHERE agency_slug IS NOT NULL GROUP BY agency_slug
             ) d ON d.agency_slug = a.slug
             SET a.doc_count = IFNULL(d.n, 0)'
        );
    }

    private function fetchHtml(string $url): ?string
    {
        try {
            $response = $this->http->request('GET', $url, [
                'timeout' => 30,
                'headers' => [
                    'User-Agent' => 'Mozilla/5.0 (compatible; BlackVaultDocsBot/1.0; +https://blackvaultdocs.com/about)',
                    'Accept' => 'text/html,application/xhtml+xml',
                ],
            ]);
            if ($response->getStatusCode() >= 400) {
                $this->logger->warning('[archives-gov] non-2xx {url} status={s}', [
                    'url' => $url, 's' => $response->getStatusCode(),
                ]);
                return null;
            }
            return $response->getContent();
        } catch (\Throwable $e) {
            $this->logger->warning('[archives-gov] fetch failed {url}: {msg}', [
                'url' => $url, 'msg' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function startLog(string $task, ?string $url): int
    {
        $this->conn->executeStatement(
            'INSERT INTO scrape_log (source, task, url, status) VALUES (?, ?, ?, ?)',
            [self::SOURCE, $task, $url, 'running'],
        );
        return (int) $this->conn->lastInsertId();
    }

    private function finishLog(int $id, string $status, int $added, int $seen, ?string $error = null): void
    {
        $this->conn->executeStatement(
            'UPDATE scrape_log SET status = ?, rows_added = ?, rows_seen = ?, error = ?, finished_at = NOW() WHERE id = ?',
            [$status, $added, $seen, $error, $id],
        );
    }

    private function tidyText(string $s): string
    {
        $s = html_entity_decode($s, \ENT_QUOTES | \ENT_HTML5, 'UTF-8');
        $s = strip_tags($s);
        $s = preg_replace('/\s+/u', ' ', $s);
        return trim((string) $s);
    }

    private function slugifyFromUrl(string $path, string $topicSlug): string
    {
        $tail = basename($path);
        $tail = preg_replace('/\.pdf$/i', '', $tail) ?? $tail;
        $slug = $topicSlug . '-' . $tail;
        $slug = preg_replace('/[^a-z0-9-]+/i', '-', strtolower($slug)) ?: 'doc';
        $slug = substr(trim($slug, '-'), 0, 220);
        return $slug;
    }

    private function absoluteUrl(string $base, string $href): ?string
    {
        $href = trim($href);
        if ($href === '' || str_starts_with($href, '#') || str_starts_with($href, 'mailto:')) {
            return null;
        }
        if (str_starts_with($href, '//')) {
            return 'https:' . $href;
        }
        if (str_starts_with($href, 'http://') || str_starts_with($href, 'https://')) {
            $host = parse_url($href, \PHP_URL_HOST);
            if ($host !== null && !str_ends_with((string) $host, 'archives.gov')) {
                return null;
            }
            return $href;
        }
        $parts = parse_url($base);
        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? 'www.archives.gov';
        if (str_starts_with($href, '/')) {
            return $scheme . '://' . $host . $href;
        }
        $path = $parts['path'] ?? '/';
        $dir = substr($path, 0, (int) strrpos($path, '/'));
        return $scheme . '://' . $host . rtrim($dir, '/') . '/' . $href;
    }

    private function sleep(int $ms): void
    {
        $jitter = (int) ($ms * (mt_rand(-25, 25) / 100));
        usleep(max(50, $ms + $jitter) * 1000);
    }
}
