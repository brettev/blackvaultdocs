<?php

declare(strict_types=1);

namespace App\Ingestion\Dto;

/**
 * A single declassified / FOIA-released document.
 *
 * Every scraper (archives.gov, DOJ OIG, NARA Catalog API, CIA CREST, etc.)
 * produces these and hands them to a `SinkInterface`, which either upserts
 * to MySQL or writes them as JSONL for later import on the server.
 */
final class ScrapedDocument
{
    public function __construct(
        public string $slug,
        public string $source,
        public ?string $externalId,
        public string $title,
        public ?string $summary,
        public string $sourceUrl,
        public ?string $pdfUrl,
        public string $topicSlug,
        public ?string $agencySlug = null,
        public ?string $classification = null,
        public ?string $releasedAt = null,
        public ?int $pageCount = null,
        public ?int $fileSizeBytes = null,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self(
            slug: (string) $row['slug'],
            source: (string) $row['source'],
            externalId: isset($row['external_id']) ? (string) $row['external_id'] : null,
            title: (string) $row['title'],
            summary: isset($row['summary']) ? (string) $row['summary'] : null,
            sourceUrl: (string) $row['source_url'],
            pdfUrl: isset($row['pdf_url']) ? (string) $row['pdf_url'] : null,
            topicSlug: (string) $row['topic_slug'],
            agencySlug: isset($row['agency_slug']) ? (string) $row['agency_slug'] : null,
            classification: isset($row['classification']) ? (string) $row['classification'] : null,
            releasedAt: isset($row['released_at']) ? (string) $row['released_at'] : null,
            pageCount: isset($row['page_count']) ? (int) $row['page_count'] : null,
            fileSizeBytes: isset($row['file_size_bytes']) ? (int) $row['file_size_bytes'] : null,
        );
    }

    public function toJsonlArray(): array
    {
        return [
            'type' => 'document',
            'slug' => $this->slug,
            'source' => $this->source,
            'external_id' => $this->externalId,
            'title' => $this->title,
            'summary' => $this->summary,
            'source_url' => $this->sourceUrl,
            'pdf_url' => $this->pdfUrl,
            'topic_slug' => $this->topicSlug,
            'agency_slug' => $this->agencySlug,
            'classification' => $this->classification,
            'released_at' => $this->releasedAt,
            'page_count' => $this->pageCount,
            'file_size_bytes' => $this->fileSizeBytes,
        ];
    }
}
