<?php

declare(strict_types=1);

namespace App\Ingestion\Dto;

/**
 * A single originating agency (e.g. NARA, FBI, CIA).
 *
 * Scrapers emit one of these before any topic/document that references them
 * via `agency_slug`, so the import pipeline can upsert into `agencies`
 * regardless of source.
 */
final class ScrapedAgency
{
    public function __construct(
        public string $slug,
        public string $name,
        public ?string $description = null,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self(
            slug: (string) $row['slug'],
            name: (string) $row['name'],
            description: isset($row['description']) ? (string) $row['description'] : null,
        );
    }

    public function toJsonlArray(): array
    {
        return [
            'type' => 'agency',
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
        ];
    }
}
