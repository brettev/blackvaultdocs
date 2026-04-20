<?php

declare(strict_types=1);

namespace App\Service;

use App\Ingestion\Dto\ScrapedAgency;
use App\Ingestion\Dto\ScrapedDocument;
use App\Ingestion\Dto\ScrapedTopic;
use App\Ingestion\ScraperInterface;
use App\Ingestion\Sink\SinkInterface;
use PhpOffice\PhpSpreadsheet\Reader\IReadFilter;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx as XlsxReader;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Manifest-first scraper for the archives.gov JFK release XLSX indexes.
 *
 * archives.gov ships a companion spreadsheet on every JFK release landing
 * page (e.g. `/files/research/jfk/national-archives-jfk-assassination-records-2023-release.xlsx`).
 * Those workbooks contain ONE ROW PER PDF — including records whose file
 * name is only linked from a separate table server-rendered in a
 * JavaScript widget on the landing page, meaning {@see ArchivesGovScraper}
 * (which only walks inline `<a href="*.pdf">` links) picks up ~50 docs
 * per release when the true count is 2,000–20,000.
 *
 * This scraper:
 *  1. Downloads each XLSX into a system temp file,
 *  2. Streams the rows with PhpSpreadsheet (in read-only mode),
 *  3. Constructs a canonical PDF URL from the `File Name` column, and
 *  4. Emits one {@see ScrapedDocument} per row.
 *
 * It writes to the same topic slugs the HTML scraper uses, so running both
 * end-to-end idempotently converges on the complete manifest. The two
 * scrapers share the `archives-gov` agency but register under distinct
 * source keys — `archives-gov-xlsx` — so they can be run independently
 * and tracked separately in `scrape_log`.
 */
final class ArchivesGovXlsxScraper implements ScraperInterface
{
    private const SOURCE = 'archives-gov-xlsx';
    private const AGENCY_SLUG = 'nara';

    /**
     * Read the sheet in N-row chunks. The 2017 manifest has ~54k rows and
     * loading it in one shot with PhpSpreadsheet pushes the CLI process
     * over 1 GB of resident memory; chunking lets us process arbitrarily
     * large manifests in bounded memory.
     */
    private const CHUNK_ROWS = 2_000;

    /**
     * @var list<array{slug:string,name:string,description:string,agency:string,xlsx:string,base_pdf_url:string}>
     */
    private const MANIFESTS = [
        [
            'slug' => 'jfk-release-2023',
            'name' => 'JFK Assassination Records — 2023 Release',
            'agency' => self::AGENCY_SLUG,
            'description' => 'Files disclosed in 2023 from the President John F. Kennedy Assassination Records Collection, including newly released cables, memoranda, and operational files. Sourced from the official NARA release manifest (XLSX).',
            'xlsx' => 'https://www.archives.gov/files/research/jfk/national-archives-jfk-assassination-records-2023-release.xlsx',
            // File Name values in the XLSX look like "2023/08/104-10105-10271.pdf".
            // NARA hosts them at https://www.archives.gov/files/research/jfk/releases/2023/<path>.
            'base_pdf_url' => 'https://www.archives.gov/files/research/jfk/releases/',
        ],
        [
            'slug' => 'jfk-release-2022',
            'name' => 'JFK Assassination Records — 2022 Release',
            'agency' => self::AGENCY_SLUG,
            'description' => 'Files disclosed in 2022 from the President John F. Kennedy Assassination Records Collection. Sourced from the official NARA release manifest (XLSX).',
            'xlsx' => 'https://www.archives.gov/files/research/jfk/national-archives-jfk-assassination-records-2022-release.xlsx',
            'base_pdf_url' => 'https://www.archives.gov/files/research/jfk/releases/',
        ],
        [
            'slug' => 'jfk-release-2017',
            'name' => 'JFK Assassination Records — 2017–2018 Release',
            'agency' => self::AGENCY_SLUG,
            'description' => 'Files disclosed in 2017 and 2018 from the President John F. Kennedy Assassination Records Collection, merged onto a single archives.gov landing page. Sourced from the official NARA release manifest (XLSX).',
            'xlsx' => 'https://www.archives.gov/files/research/jfk/national-archives-jfk-assassination-records-2017-2018-release.xlsx',
            'base_pdf_url' => 'https://www.archives.gov/files/research/jfk/releases/',
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
        $onlyTopic = $options['topic'] ?? null;
        $maxDocs = (int) ($options['max_docs_per_topic'] ?? 0);
        $progress = $options['progress'] ?? null;

        $sink->writeAgency(new ScrapedAgency(
            self::AGENCY_SLUG,
            'National Archives and Records Administration',
            'Independent federal agency that preserves and documents government and historical records, including FOIA-released materials from the CIA, FBI, State Department, and others.',
        ));

        $docsSeen = 0;
        $docsAdded = 0;
        $topicsProcessed = 0;

        foreach (self::MANIFESTS as $manifest) {
            if ($onlyTopic !== null && $manifest['slug'] !== $onlyTopic) {
                continue;
            }
            try {
                [$seen, $added] = $this->ingestManifest($sink, $manifest, $maxDocs);
                $docsSeen += $seen;
                $docsAdded += $added;
                $topicsProcessed++;
                if (\is_callable($progress)) {
                    $progress($manifest['slug'], $docsAdded, $docsSeen);
                }
                $this->logger->info(\sprintf(
                    '[archives-gov-xlsx] topic %s — seen=%d added=%d',
                    $manifest['slug'], $seen, $added,
                ));
            } catch (\Throwable $e) {
                $this->logger->error('[archives-gov-xlsx] manifest failed {slug}: {msg}', [
                    'slug' => $manifest['slug'],
                    'msg' => $e->getMessage(),
                ]);
            }
        }

        return [
            'topics' => $topicsProcessed,
            'docs_seen' => $docsSeen,
            'docs_added' => $docsAdded,
        ];
    }

    /**
     * @param array{slug:string,name:string,description:string,agency:string,xlsx:string,base_pdf_url:string} $manifest
     *
     * @return array{0:int,1:int} [seen, added]
     */
    private function ingestManifest(SinkInterface $sink, array $manifest, int $maxDocs): array
    {
        $tmp = $this->downloadToTemp($manifest['xlsx']);
        if ($tmp === null) {
            return [0, 0];
        }

        try {
            $sink->writeTopic(new ScrapedTopic(
                slug: $manifest['slug'],
                name: $manifest['name'],
                description: $manifest['description'],
                agencySlug: $manifest['agency'],
            ));

            $reader = new XlsxReader();
            $reader->setReadDataOnly(true);
            $reader->setReadEmptyCells(false);

            // `listWorksheetInfo` parses just the sheet metadata (row/col
            // counts) without loading the cell graph, so we can plan the
            // chunk loop before committing to a full load.
            $info = $reader->listWorksheetInfo($tmp);
            if (empty($info)) {
                $this->logger->warning('[archives-gov-xlsx] no sheets in {slug}', ['slug' => $manifest['slug']]);
                return [0, 0];
            }
            $maxRow = (int) ($info[0]['totalRows'] ?? 0);
            if ($maxRow < 2) {
                return [0, 0];
            }

            // Header pass: load only row 1 so we can learn the column layout
            // in bounded memory.
            $reader->setReadFilter($this->rowFilter(1, 1));
            $book = $reader->load($tmp);
            $sheet = $book->getActiveSheet();
            $headerRow = $sheet->rangeToArray('A1:Z1', null, false, false, false)[0] ?? [];
            $cols = $this->indexColumns($headerRow);
            $book->disconnectWorksheets();
            unset($book, $sheet);

            if (!isset($cols['file_name'], $cols['record_num'])) {
                $this->logger->warning('[archives-gov-xlsx] unrecognised header for {slug}', [
                    'slug' => $manifest['slug'],
                    'header' => $headerRow,
                ]);
                return [0, 0];
            }

            $seen = 0;
            $added = 0;
            for ($startRow = 2; $startRow <= $maxRow; $startRow += self::CHUNK_ROWS) {
                $endRow = min($maxRow, $startRow + self::CHUNK_ROWS - 1);
                $reader->setReadFilter($this->rowFilter($startRow, $endRow));
                $book = $reader->load($tmp);
                $sheet = $book->getActiveSheet();
                $values = $sheet->rangeToArray("A{$startRow}:Z{$endRow}", null, false, false, false);
                foreach ($values as $offset => $rowValues) {
                    $doc = $this->rowToDocument($rowValues, $cols, $manifest);
                    if ($doc === null) {
                        continue;
                    }
                    $seen++;
                    if ($maxDocs > 0 && $seen > $maxDocs) {
                        $book->disconnectWorksheets();
                        unset($book, $sheet);
                        return [$seen, $added];
                    }
                    $added += $sink->writeDocument($doc);
                }
                $book->disconnectWorksheets();
                unset($book, $sheet, $values);
                gc_collect_cycles();
            }

            return [$seen, $added];
        } finally {
            @unlink($tmp);
        }
    }

    /**
     * @param list<mixed> $header
     * @return array<string,int> map of canonical key -> 0-indexed column
     */
    private function indexColumns(array $header): array
    {
        $map = [];
        foreach ($header as $i => $label) {
            $k = $this->canonicalHeader((string) ($label ?? ''));
            if ($k !== '') {
                $map[$k] = $i;
            }
        }
        return $map;
    }

    private function canonicalHeader(string $label): string
    {
        $label = strtolower(trim($label));
        return match ($label) {
            'file name' => 'file_name',
            'record num', 'record number' => 'record_num',
            'nara release date' => 'release_date',
            'agency' => 'agency',
            'originator' => 'originator',
            'doc date' => 'doc_date',
            'doc type' => 'doc_type',
            'to name' => 'to_name',
            'from name' => 'from_name',
            'title' => 'title',
            'num pages', 'pages released' => 'num_pages',
            'comments' => 'comments',
            default => '',
        };
    }

    /**
     * @param list<mixed> $row
     * @param array<string,int> $cols
     * @param array{slug:string,agency:string,base_pdf_url:string} $manifest
     */
    private function rowToDocument(array $row, array $cols, array $manifest): ?ScrapedDocument
    {
        $fileName = $this->cell($row, $cols, 'file_name');
        $recordNum = $this->cell($row, $cols, 'record_num');
        if ($fileName === '' && $recordNum === '') {
            return null;
        }

        $pdfUrl = $this->buildPdfUrl($manifest['base_pdf_url'], $fileName);
        $externalId = $recordNum !== '' ? $recordNum : basename($fileName, '.pdf');

        $title = $this->cell($row, $cols, 'title');
        if ($title === '') {
            $title = $externalId;
        }
        // Prefix the title with the NARA ID so every auto-built page is
        // self-identifying in search results — the canonical "record
        // 104-10105-10271: PROPOSED SECURITY DELETIONS …" form researchers
        // recognise.
        if ($recordNum !== '' && !str_contains($title, $recordNum)) {
            $title = $recordNum . ' — ' . $title;
        }
        $title = $this->tidy($title);

        $summary = $this->buildSummary($row, $cols);
        $releasedAt = $this->parseDate($this->cell($row, $cols, 'release_date'));
        $pages = $this->cell($row, $cols, 'num_pages');
        $pageCount = ($pages !== '' && is_numeric($pages)) ? (int) $pages : null;

        $slug = $this->slugify($manifest['slug'], $externalId, $fileName);

        return new ScrapedDocument(
            slug: $slug,
            source: self::SOURCE,
            externalId: $externalId !== '' ? $externalId : null,
            title: $title,
            summary: $summary,
            sourceUrl: $pdfUrl ?? $manifest['base_pdf_url'],
            pdfUrl: $pdfUrl,
            topicSlug: $manifest['slug'],
            agencySlug: $manifest['agency'],
            releasedAt: $releasedAt,
            pageCount: $pageCount,
        );
    }

    /**
     * @param list<mixed> $row
     * @param array<string,int> $cols
     */
    private function cell(array $row, array $cols, string $key): string
    {
        $idx = $cols[$key] ?? null;
        if ($idx === null) return '';
        $v = $row[$idx] ?? null;
        if ($v === null) return '';
        if ($v instanceof \DateTimeInterface) {
            return $v->format('Y-m-d');
        }
        return trim((string) $v);
    }

    /**
     * @param list<mixed> $row
     * @param array<string,int> $cols
     */
    private function buildSummary(array $row, array $cols): ?string
    {
        $parts = [];
        foreach ([
            'originator' => 'Originator',
            'agency' => 'Agency',
            'doc_type' => 'Doc type',
            'from_name' => 'From',
            'to_name' => 'To',
            'doc_date' => 'Doc date',
            'comments' => 'Comments',
        ] as $key => $label) {
            $v = $this->cell($row, $cols, $key);
            if ($v !== '') {
                $parts[] = "$label: $v";
            }
        }
        if (empty($parts)) return null;
        // 480 chars is a conservative cap that keeps summaries well under
        // the Google SERP snippet ceiling while leaving room for the title.
        return mb_substr(implode(' · ', $parts), 0, 480);
    }

    private function buildPdfUrl(string $base, string $fileName): ?string
    {
        $fileName = trim($fileName);
        if ($fileName === '') return null;
        $fileName = ltrim($fileName, '/');
        $encoded = implode('/', array_map('rawurlencode', explode('/', $fileName)));
        return rtrim($base, '/') . '/' . $encoded;
    }

    private function parseDate(string $v): ?string
    {
        if ($v === '') return null;
        if (preg_match('#^\d{4}-\d{2}-\d{2}$#', $v)) return $v;
        // archives.gov formats are almost always MM/DD/YYYY.
        if (preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})$#', $v, $m)) {
            return \sprintf('%04d-%02d-%02d', (int) $m[3], (int) $m[1], (int) $m[2]);
        }
        try {
            $d = new \DateTimeImmutable($v);
            return $d->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    private function slugify(string $topicSlug, string $recordNum, string $fileName): string
    {
        $tail = $recordNum !== '' ? $recordNum : preg_replace('/\.pdf$/i', '', basename($fileName)) ?? basename($fileName);
        $slug = $topicSlug . '-' . $tail;
        $slug = preg_replace('/[^a-z0-9-]+/i', '-', strtolower($slug)) ?: 'doc';
        return substr(trim($slug, '-'), 0, 220);
    }

    private function tidy(string $s): string
    {
        $s = preg_replace('/\s+/u', ' ', $s) ?? $s;
        return trim($s);
    }

    /**
     * Build a PhpSpreadsheet read filter that accepts only the given
     * inclusive row range. Wrapped in an anonymous class so it isn't
     * picked up by Symfony service autowiring.
     */
    private function rowFilter(int $startRow, int $endRow): IReadFilter
    {
        return new class($startRow, $endRow) implements IReadFilter {
            public function __construct(
                private readonly int $startRow,
                private readonly int $endRow,
            ) {
            }

            public function readCell($columnAddress, $row, $worksheetName = ''): bool
            {
                return $row >= $this->startRow && $row <= $this->endRow;
            }
        };
    }

    private function downloadToTemp(string $url): ?string
    {
        try {
            $response = $this->http->request('GET', $url, [
                'timeout' => 120,
                'headers' => [
                    'User-Agent' => 'Mozilla/5.0 (compatible; BlackVaultDocsBot/1.0; +https://blackvaultdocs.com/about)',
                    'Accept' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream',
                ],
            ]);
            if ($response->getStatusCode() >= 400) {
                $this->logger->warning('[archives-gov-xlsx] HTTP {status} for {url}', [
                    'status' => $response->getStatusCode(),
                    'url' => $url,
                ]);
                return null;
            }
            $tmp = tempnam(sys_get_temp_dir(), 'bvd-xlsx-');
            if ($tmp === false) return null;
            file_put_contents($tmp, $response->getContent());
            return $tmp;
        } catch (\Throwable $e) {
            $this->logger->warning('[archives-gov-xlsx] download failed {url}: {msg}', [
                'url' => $url,
                'msg' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
