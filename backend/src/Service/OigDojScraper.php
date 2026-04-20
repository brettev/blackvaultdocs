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
 * Scraper for oig.justice.gov — the U.S. Department of Justice Office of the
 * Inspector General. OIG publishes ~3,100 audits, investigations, reviews,
 * and evaluations of DOJ components (FBI, DEA, ATF, BOP, USMS, OJP, etc.).
 *
 * Every report is indexed from a single paginated Drupal Views listing at
 * `/reports?page=N` (0–310 currently). Each row in that listing exposes
 * title, publication date, report type, DOJ component, and the detail-page
 * path — enough to build rich document records without hitting each
 * detail page. PDF URLs live on the detail pages; we leave `pdf_url` null
 * in the first pass and link users to the detail page.
 *
 * Topic grouping is by DOJ component being overseen, e.g. all FBI-related
 * reports cluster under `doj-oig-fbi`. Component labels are lowercased and
 * slugified; comma-separated multi-component listings collapse into
 * `doj-oig-multiple-components`.
 *
 * Known limitation: reports published before ~2008 often lack a Component(s)
 * span entirely in the listing markup, so they default to `doj-oig-other`
 * (~1 500 rows at the time of first ingestion). Fixing that requires a
 * per-detail-page enrichment pass — currently tracked alongside the PDF-URL
 * enrichment TODO since both need per-report HTTP fetches.
 */
final class OigDojScraper implements ScraperInterface
{
    private const SOURCE = 'oig-doj';
    private const LISTING = 'https://oig.justice.gov/reports';
    private const AGENCY_SLUG = 'doj-oig';

    /** Used to derive a friendly topic name from the component slug. */
    private const COMPONENT_NAME_OVERRIDES = [
        'fbi' => 'Federal Bureau of Investigation',
        'dea' => 'Drug Enforcement Administration',
        'atf' => 'Bureau of Alcohol, Tobacco, Firearms and Explosives',
        'bop' => 'Federal Bureau of Prisons',
        'usms' => 'U.S. Marshals Service',
        'ojp' => 'Office of Justice Programs',
        'cows' => 'Office of Community Oriented Policing Services',
        'eoir' => 'Executive Office for Immigration Review',
        'ovw' => 'Office on Violence Against Women',
        'nsd' => 'National Security Division',
        'crm' => 'Criminal Division',
        'crt' => 'Civil Rights Division',
        'enrd' => 'Environment and Natural Resources Division',
        'atr' => 'Antitrust Division',
        'tax' => 'Tax Division',
        'other-component' => 'Other DOJ Components',
        'multiple-components' => 'Multiple DOJ Components',
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
        $maxTopics = (int) ($options['max_topics'] ?? 0);    // interpreted as max listing pages
        $delayMs   = (int) ($options['delay_ms'] ?? 2000);
        $progress  = $options['progress'] ?? null;

        $sink->writeAgency(new ScrapedAgency(
            slug: self::AGENCY_SLUG,
            name: 'U.S. DOJ Office of the Inspector General',
            description: 'The U.S. Department of Justice Office of the Inspector General (OIG) conducts independent audits, investigations, and reviews of DOJ components — the FBI, DEA, ATF, Bureau of Prisons, U.S. Marshals Service, and others — and publishes its reports on oig.justice.gov.',
        ));

        $lastPage = $this->discoverLastPage();
        if ($lastPage < 0) {
            $this->logger->warning('[oig-doj] could not discover pagination, using 0');
            $lastPage = 0;
        }

        $pagesToVisit = range(0, $lastPage);
        if ($maxTopics > 0) {
            $pagesToVisit = \array_slice($pagesToVisit, 0, $maxTopics);
        }

        $docsAdded = 0;
        $docsSeen = 0;
        $topicsEmitted = [];   // dedupe
        $pagesProcessed = 0;

        foreach ($pagesToVisit as $pageIdx) {
            try {
                [$seen, $added] = $this->scrapePage($sink, $pageIdx, $topicsEmitted);
                $docsSeen += $seen;
                $docsAdded += $added;
                $pagesProcessed++;
                $this->logger->info(\sprintf('[oig-doj] page %d — seen=%d added=%d', $pageIdx, $seen, $added));
                if (\is_callable($progress)) {
                    $progress("page=$pageIdx", $docsAdded, $docsSeen);
                }
            } catch (\Throwable $e) {
                $this->logger->error('[oig-doj] page {p} failed: {msg}', [
                    'p' => $pageIdx, 'msg' => $e->getMessage(),
                ]);
            }

            $this->sleep($delayMs);
        }

        return [
            'topics' => \count($topicsEmitted),
            'docs_seen' => $docsSeen,
            'docs_added' => $docsAdded,
        ];
    }

    private function discoverLastPage(): int
    {
        $html = $this->fetchHtml(self::LISTING);
        if ($html === null) {
            return -1;
        }
        if (preg_match_all('/[?&]page=(\d+)/', $html, $m)) {
            $max = 0;
            foreach ($m[1] as $n) {
                $max = max($max, (int) $n);
            }
            return $max;
        }
        return 0;
    }

    /**
     * @param array<string,bool> $topicsEmitted updated by reference
     * @return array{0:int,1:int} [seen, added]
     */
    private function scrapePage(SinkInterface $sink, int $pageIdx, array &$topicsEmitted): array
    {
        $url = self::LISTING . ($pageIdx > 0 ? "?page=$pageIdx" : '');
        $html = $this->fetchHtml($url);
        if ($html === null) {
            return [0, 0];
        }

        $seen = 0;
        $added = 0;

        // Split into views-row chunks.
        if (!preg_match_all('#<div class="views-row">(.*?)(?=<div class="views-row">|<nav|</div>\s*</div>\s*<nav)#s', $html, $rowMatches)) {
            // Fall back to the last row in the list (no terminator); retry
            // with a looser split.
            preg_match_all('#<div class="views-row">(.*?)</div>\s*</div>#s', $html, $rowMatches);
        }

        foreach ($rowMatches[1] as $row) {
            $entry = $this->parseRow($row);
            if ($entry === null) {
                continue;
            }
            $seen++;

            $topicSlug = 'doj-oig-' . ($entry['component_slug'] ?? 'other');
            if (!isset($topicsEmitted[$topicSlug])) {
                $sink->writeTopic(new ScrapedTopic(
                    slug: $topicSlug,
                    name: $this->topicName($entry['component_slug'], $entry['component_name']),
                    description: \sprintf(
                        'U.S. DOJ Office of the Inspector General reports (audits, investigations, evaluations, and reviews) concerning %s.',
                        $entry['component_name'] ?? 'this DOJ component',
                    ),
                    agencySlug: self::AGENCY_SLUG,
                ));
                $topicsEmitted[$topicSlug] = true;
            }

            $docSlug = 'doj-oig-' . $entry['url_tail'];
            $docSlug = substr(preg_replace('/[^a-z0-9-]+/i', '-', strtolower($docSlug)) ?? 'doc', 0, 220);

            $summary = sprintf(
                '%s report by the DOJ Office of the Inspector General%s%s.',
                $entry['type'] ?? 'OIG',
                $entry['component_name'] !== null ? ' concerning ' . $entry['component_name'] : '',
                $entry['location'] !== null ? '; subject location: ' . $entry['location'] : '',
            );

            $added += $sink->writeDocument(new ScrapedDocument(
                slug: $docSlug,
                source: self::SOURCE,
                externalId: $entry['url_tail'],
                title: $entry['title'],
                summary: $summary,
                sourceUrl: $entry['detail_url'],
                pdfUrl: null,
                topicSlug: $topicSlug,
                agencySlug: self::AGENCY_SLUG,
                classification: $entry['type'],
                releasedAt: $entry['released_at'],
            ));
        }

        return [$seen, $added];
    }

    /**
     * @return null|array{
     *   title:string,
     *   detail_url:string,
     *   url_tail:string,
     *   released_at:?string,
     *   type:?string,
     *   component_name:?string,
     *   component_slug:string,
     *   location:?string,
     * }
     */
    private function parseRow(string $row): ?array
    {
        if (!preg_match('#<a[^>]+href="(/reports/[^"]+)"[^>]*>(.*?)</a>#s', $row, $titleM)) {
            return null;
        }
        $detailPath = html_entity_decode($titleM[1], \ENT_QUOTES | \ENT_HTML5, 'UTF-8');
        $title = $this->tidyText($titleM[2]);
        if ($title === '' || $detailPath === '') {
            return null;
        }

        $releasedAt = null;
        if (preg_match('#<time[^>]+datetime="([^"]+)"#', $row, $dtM)) {
            $releasedAt = substr($dtM[1], 0, 10);   // YYYY-MM-DD
        }

        $type = null;
        if (preg_match('#<span>Type:\s*</span>\s*<span>([^<]+)</span>#', $row, $tM)) {
            $type = $this->tidyText($tM[1]);
        }

        $componentName = null;
        if (preg_match('#views-label-field-doj-component[^<]*</span>\s*<span class="field-content">([^<]+)</span>#', $row, $cM)) {
            $componentName = $this->tidyText($cM[1]);
        }

        $location = null;
        if (preg_match('#views-field-field-location[^<]*<span class="field-content">([^<]+?)(?:</span>|<)#s', $row, $lM)) {
            $location = $this->tidyText(str_replace("\n", ', ', $lM[1]));
        }

        $componentSlug = $componentName !== null
            ? $this->componentSlug($componentName)
            : 'other';

        return [
            'title' => $title,
            'detail_url' => 'https://oig.justice.gov' . $detailPath,
            'url_tail' => trim(substr($detailPath, \strlen('/reports/')), '/'),
            'released_at' => $releasedAt,
            'type' => $type,
            'component_name' => $componentName,
            'component_slug' => $componentSlug,
            'location' => $location,
        ];
    }

    private function componentSlug(string $name): string
    {
        // DOJ lists reports that span multiple components by writing out the
        // full comma-separated list in the single Component(s) field (e.g.
        // "Drug Enforcement Administration, Federal Bureau of Investigation").
        // Route all of those into one bucket rather than exploding them into
        // one-off long-slug topics.
        if (str_contains($name, ',')) {
            return 'multiple-components';
        }
        $norm = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $name) ?? 'other');
        $norm = trim($norm, '-');
        // Collapse obvious long names to canonical short keys.
        $aliases = [
            'federal-bureau-of-investigation' => 'fbi',
            'drug-enforcement-administration' => 'dea',
            'federal-bureau-of-prisons' => 'bop',
            'u-s-marshals-service' => 'usms',
            'us-marshals-service' => 'usms',
            'united-states-marshals-service' => 'usms',
            'office-of-justice-programs' => 'ojp',
            'bureau-of-alcohol-tobacco-firearms-and-explosives' => 'atf',
            'office-on-violence-against-women' => 'ovw',
            'executive-office-for-immigration-review' => 'eoir',
            'national-security-division' => 'nsd',
            'criminal-division' => 'crm',
            'civil-rights-division' => 'crt',
            'antitrust-division' => 'atr',
            'tax-division' => 'tax',
            'environment-and-natural-resources-division' => 'enrd',
            'office-of-community-oriented-policing-services' => 'cops',
            'multiple-components' => 'multiple-components',
            'other-component' => 'other-component',
            'other-components' => 'other-component',
        ];
        return $aliases[$norm] ?? substr($norm, 0, 60);
    }

    private function topicName(string $slug, ?string $rawName): string
    {
        $friendly = self::COMPONENT_NAME_OVERRIDES[$slug] ?? $rawName ?? ucwords(str_replace('-', ' ', $slug));
        return "DOJ OIG — $friendly";
    }

    private function fetchHtml(string $url): ?string
    {
        try {
            $r = $this->http->request('GET', $url, [
                'timeout' => 30,
                'headers' => [
                    'User-Agent' => 'Mozilla/5.0 (compatible; BlackVaultDocsBot/1.0; +https://blackvaultdocs.com/about)',
                    'Accept' => 'text/html,application/xhtml+xml',
                ],
            ]);
            if ($r->getStatusCode() >= 400) {
                $this->logger->warning('[oig-doj] non-2xx {url} status={s}', ['url' => $url, 's' => $r->getStatusCode()]);
                return null;
            }
            return $r->getContent();
        } catch (\Throwable $e) {
            $this->logger->warning('[oig-doj] fetch failed {url}: {msg}', ['url' => $url, 'msg' => $e->getMessage()]);
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

    private function sleep(int $ms): void
    {
        $jitter = (int) ($ms * (mt_rand(-25, 25) / 100));
        usleep(max(50, $ms + $jitter) * 1000);
    }
}
