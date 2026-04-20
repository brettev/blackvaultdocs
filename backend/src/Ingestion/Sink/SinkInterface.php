<?php

declare(strict_types=1);

namespace App\Ingestion\Sink;

use App\Ingestion\Dto\ScrapedAgency;
use App\Ingestion\Dto\ScrapedDocument;
use App\Ingestion\Dto\ScrapedTopic;

/**
 * Destination for scraped records.
 *
 * Two primary implementations:
 *  - `DbSink` upserts into MySQL (used on the server for live ingestion and
 *    when replaying JSONL imports).
 *  - `JsonlSink` writes one record per line to a file (used locally for
 *    sources that can't be crawled from the AWS egress IP — e.g. when we
 *    solve Cloudflare challenges with a real browser and capture the output
 *    for later scp + import).
 */
interface SinkInterface
{
    public function writeAgency(ScrapedAgency $agency): void;

    public function writeTopic(ScrapedTopic $topic): void;

    /**
     * @return int 1 if the document is new, 0 if it already existed.
     */
    public function writeDocument(ScrapedDocument $doc): int;

    /**
     * Called once after a scrape run finishes. Implementations may use this
     * to flush buffers, close files, or refresh aggregate counts.
     */
    public function finish(): void;
}
