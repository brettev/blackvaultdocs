<?php

declare(strict_types=1);

namespace App\Ingestion;

use App\Ingestion\Sink\SinkInterface;

/**
 * Every content source (archives.gov, DOJ OIG, NARA Catalog API, CIA CREST,
 * FBI Vault via Playwright, etc.) implements this. The orchestrating
 * `ScrapeCommand` resolves the source key to a scraper, constructs the
 * appropriate sink (DB vs JSONL), and hands off.
 */
interface ScraperInterface
{
    /**
     * Stable key used in `documents.source`, CLI `--source=<key>`, and
     * `scrape_log.source`. Must be short and lowercase-hyphenated.
     * Examples: "archives-gov", "oig-doj", "nara-catalog".
     */
    public function sourceKey(): string;

    /**
     * @param array{
     *   max_topics?: int,
     *   max_docs_per_topic?: int,
     *   delay_ms?: int,
     *   progress?: callable(string, int, int): void,
     * } $options
     *
     * @return array{topics: int, docs_seen: int, docs_added: int}
     */
    public function run(SinkInterface $sink, array $options = []): array;
}
