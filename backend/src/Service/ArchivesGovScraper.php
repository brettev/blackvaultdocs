<?php

declare(strict_types=1);

namespace App\Service;

use App\Ingestion\Dto\ScrapedAgency;
use App\Ingestion\Dto\ScrapedDocument;
use App\Ingestion\Dto\ScrapedTopic;
use App\Ingestion\ScraperInterface;
use App\Ingestion\Sink\SinkInterface;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Paced scraper for archives.gov declassified-document "release" pages.
 *
 * archives.gov publishes a handful of canonical landing pages per collection
 * (JFK 2017, 2018, 2021, 2022, 2023, 2025; MLK 2025; RFK 2025) where every
 * released PDF is linked directly from a single HTML page. Those pages act
 * as perfect "topic" anchors for BlackVaultDocs:
 *  - topic = the release landing page
 *  - document = each linked PDF with its visible label / filename stem
 *
 * Unlike vault.fbi.gov, archives.gov does not 403 AWS egress IPs, so we can
 * scrape politely with a normal HTTP client. Default pace is 1 request / 2s
 * with jitter so we don't form a periodic fingerprint or hammer the upstream
 * CDN.
 */
final class ArchivesGovScraper implements ScraperInterface
{
    private const SOURCE = 'archives-gov';
    private const BASE_URL = 'https://www.archives.gov';

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
            'url' => 'https://www.archives.gov/research/jfk/release-2023',
            'description' => 'Files disclosed in 2023 from the President John F. Kennedy Assassination Records Collection, including newly released cables, memoranda, and operational files.',
        ],
        [
            'slug' => 'jfk-release-2022',
            'name' => 'JFK Assassination Records — 2022 Release',
            'agency' => 'nara',
            'url' => 'https://www.archives.gov/research/jfk/release-2022',
            'description' => 'Files disclosed in 2022 from the President John F. Kennedy Assassination Records Collection.',
        ],
        [
            'slug' => 'jfk-release-2021',
            'name' => 'JFK Assassination Records — 2021 Release',
            'agency' => 'nara',
            'url' => 'https://www.archives.gov/research/jfk/release-2021',
            'description' => 'Files disclosed in 2021 from the President John F. Kennedy Assassination Records Collection.',
        ],
        [
            // archives.gov folds the 2017 and 2018 releases into a single
            // landing page. We keep the legacy 2017 slug for URL stability
            // and call the collection "2017–2018" in the UI.
            'slug' => 'jfk-release-2017',
            'name' => 'JFK Assassination Records — 2017–2018 Release',
            'agency' => 'nara',
            'url' => 'https://www.archives.gov/research/jfk/release-2017-2018',
            'description' => 'Files disclosed in 2017 and 2018 from the President John F. Kennedy Assassination Records Collection, merged onto a single archives.gov landing page.',
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
        private readonly LoggerInterface $logger,
    ) {
    }

    public function sourceKey(): string
    {
        return self::SOURCE;
    }

    public function run(SinkInterface $sink, array $options = []): array
    {
        $maxTopics = (int) ($options['max_topics'] ?? 0);
        $maxDocs   = (int) ($options['max_docs_per_topic'] ?? 0);
        $delayMs   = (int) ($options['delay_ms'] ?? 2000);
        $progress  = $options['progress'] ?? null;

        foreach (self::AGENCIES as $slug => $meta) {
            $sink->writeAgency(new ScrapedAgency($slug, $meta['name'], $meta['description']));
        }

        $topics = self::TOPICS;
        if ($maxTopics > 0) {
            $topics = \array_slice($topics, 0, $maxTopics);
        }

        $docsAdded = 0;
        $docsSeen = 0;
        $topicsProcessed = 0;

        foreach ($topics as $topic) {
            try {
                [$seen, $added] = $this->scrapeTopic($sink, $topic, $maxDocs);
                $docsSeen += $seen;
                $docsAdded += $added;
                $topicsProcessed++;
                $this->logger->info(\sprintf(
                    '[archives-gov] topic %s — seen=%d added=%d',
                    $topic['slug'], $seen, $added,
                ));
                if (\is_callable($progress)) {
                    $progress($topic['slug'], $docsAdded, $docsSeen);
                }
            } catch (\Throwable $e) {
                $this->logger->error('[archives-gov] topic failed {slug}: {msg}', [
                    'slug' => $topic['slug'], 'msg' => $e->getMessage(),
                ]);
            }

            $this->sleep($delayMs);
        }

        return [
            'topics' => $topicsProcessed,
            'docs_seen' => $docsSeen,
            'docs_added' => $docsAdded,
        ];
    }

    /**
     * @return array{0:int,1:int} [seen, added]
     */
    private function scrapeTopic(SinkInterface $sink, array $topic, int $maxDocs): array
    {
        $html = $this->fetchHtml($topic['url']);
        if ($html === null) {
            return [0, 0];
        }

        $sink->writeTopic(new ScrapedTopic(
            slug: $topic['slug'],
            name: $topic['name'],
            description: $topic['description'] ?? null,
            agencySlug: $topic['agency'],
        ));

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
            if ($abs === null || isset($dedupe[$abs])) {
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
            if ($label === '' || \strlen($label) < 6 || \strcasecmp($label, 'PDF') === 0) {
                $label = $filenameStem;
            }

            $seen++;
            if ($maxDocs > 0 && $seen > $maxDocs) {
                break;
            }

            $doc = new ScrapedDocument(
                slug: $this->slugifyFromUrl($externalId, $topic['slug']),
                source: self::SOURCE,
                externalId: $externalId,
                title: $label,
                summary: null,
                sourceUrl: $abs,
                pdfUrl: $abs,
                topicSlug: $topic['slug'],
                agencySlug: $topic['agency'],
            );
            $added += $sink->writeDocument($doc);
        }

        return [$seen, $added];
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
        return substr(trim($slug, '-'), 0, 220);
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
