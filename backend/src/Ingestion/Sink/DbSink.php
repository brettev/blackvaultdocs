<?php

declare(strict_types=1);

namespace App\Ingestion\Sink;

use App\Ingestion\Dto\ScrapedAgency;
use App\Ingestion\Dto\ScrapedDocument;
use App\Ingestion\Dto\ScrapedTopic;
use Doctrine\DBAL\Connection;

/**
 * Upserts scraped records directly into MySQL.
 *
 * Idempotent by design: agencies and topics are `INSERT ... ON DUPLICATE KEY
 * UPDATE`, documents are `INSERT IGNORE` keyed by the (source, external_id)
 * unique index. Re-running a scrape or replaying a JSONL file is always safe.
 *
 * Aggregate `doc_count` columns on topics/agencies are recomputed once at
 * `finish()` time rather than per-insert, to avoid N×2 UPDATEs during bulk
 * backfills of hundreds of thousands of rows.
 */
final class DbSink implements SinkInterface
{
    public function __construct(
        private readonly Connection $conn,
    ) {
    }

    public function writeAgency(ScrapedAgency $a): void
    {
        $this->conn->executeStatement(
            'INSERT INTO agencies (slug, name, description)
             VALUES (:slug, :name, :desc)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                description = COALESCE(VALUES(description), description)',
            [
                'slug' => mb_substr($a->slug, 0, 160),
                'name' => mb_substr($a->name, 0, 255),
                'desc' => $a->description,
            ],
        );
    }

    public function writeTopic(ScrapedTopic $t): void
    {
        $this->conn->executeStatement(
            'INSERT INTO topics (slug, name, description, agency_slug)
             VALUES (:slug, :name, :desc, :agency)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                description = COALESCE(VALUES(description), description),
                agency_slug = COALESCE(VALUES(agency_slug), agency_slug)',
            [
                'slug' => mb_substr($t->slug, 0, 200),
                'name' => mb_substr($t->name, 0, 255),
                'desc' => $t->description !== null ? mb_substr($t->description, 0, 2000) : null,
                'agency' => $t->agencySlug,
            ],
        );
    }

    public function writeDocument(ScrapedDocument $d): int
    {
        $affected = $this->conn->executeStatement(
            'INSERT IGNORE INTO documents
                (slug, source, external_id, title, summary, source_url, pdf_url,
                 file_size_bytes, page_count, classification, released_at,
                 topic_slug, agency_slug)
             VALUES
                (:slug, :source, :extid, :title, :summary, :surl, :purl,
                 :size, :pages, :cls, :released,
                 :topic, :agency)',
            [
                'slug' => mb_substr($d->slug, 0, 220),
                'source' => mb_substr($d->source, 0, 32),
                'extid' => $d->externalId !== null ? mb_substr($d->externalId, 0, 255) : null,
                'title' => mb_substr($d->title, 0, 500),
                'summary' => $d->summary,
                'surl' => mb_substr($d->sourceUrl, 0, 1000),
                'purl' => $d->pdfUrl !== null ? mb_substr($d->pdfUrl, 0, 1000) : null,
                'size' => $d->fileSizeBytes,
                'pages' => $d->pageCount,
                'cls' => $d->classification !== null ? mb_substr($d->classification, 0, 64) : null,
                'released' => $d->releasedAt,
                'topic' => mb_substr($d->topicSlug, 0, 200),
                'agency' => $d->agencySlug !== null ? mb_substr($d->agencySlug, 0, 160) : null,
            ],
        );
        return (int) $affected > 0 ? 1 : 0;
    }

    public function finish(): void
    {
        $this->refreshCounts();
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
}
