<?php

declare(strict_types=1);

namespace App\Ingestion\Sink;

use App\Ingestion\Dto\ScrapedAgency;
use App\Ingestion\Dto\ScrapedDocument;
use App\Ingestion\Dto\ScrapedTopic;

/**
 * Writes scraped records as newline-delimited JSON.
 *
 * Used when the scraper runs somewhere other than the production server —
 * typically a developer laptop, because the source is behind an anti-bot
 * firewall (e.g. Cloudflare challenges on vault.fbi.gov) or because we're
 * bulk-ingesting a large external dataset before pushing it to prod.
 *
 * The file is later transferred to the server and replayed via
 * `php bin/console app:bvd:import --from-jsonl=<file>`.
 *
 * Record order is caller-controlled; by convention scrapers emit their
 * agencies and topics first so the import can replay safely even on a
 * fresh database.
 */
final class JsonlSink implements SinkInterface
{
    /** @var resource */
    private $fh;

    private int $docsWritten = 0;
    private int $topicsWritten = 0;
    private int $agenciesWritten = 0;

    public function __construct(string $path)
    {
        $dir = \dirname($path);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new \RuntimeException("Could not create directory: $dir");
        }
        $fh = @fopen($path, 'wb');
        if ($fh === false) {
            throw new \RuntimeException("Could not open JSONL output: $path");
        }
        $this->fh = $fh;
    }

    public function writeAgency(ScrapedAgency $a): void
    {
        $this->writeLine($a->toJsonlArray());
        $this->agenciesWritten++;
    }

    public function writeTopic(ScrapedTopic $t): void
    {
        $this->writeLine($t->toJsonlArray());
        $this->topicsWritten++;
    }

    public function writeDocument(ScrapedDocument $d): int
    {
        $this->writeLine($d->toJsonlArray());
        $this->docsWritten++;
        // JSONL is append-only; we can't tell "new" vs "duplicate" without a
        // database round-trip, so treat every line as "added" for reporting
        // purposes. The import replay will report the real new-vs-dedupe
        // numbers.
        return 1;
    }

    public function finish(): void
    {
        if (\is_resource($this->fh)) {
            fflush($this->fh);
            fclose($this->fh);
        }
    }

    public function stats(): array
    {
        return [
            'agencies' => $this->agenciesWritten,
            'topics' => $this->topicsWritten,
            'documents' => $this->docsWritten,
        ];
    }

    private function writeLine(array $row): void
    {
        $json = json_encode($row, \JSON_UNESCAPED_SLASHES | \JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            throw new \RuntimeException('json_encode failed: ' . json_last_error_msg());
        }
        fwrite($this->fh, $json . "\n");
    }
}
