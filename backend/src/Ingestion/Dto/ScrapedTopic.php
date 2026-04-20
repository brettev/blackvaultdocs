<?php

declare(strict_types=1);

namespace App\Ingestion\Dto;

/**
 * A single collection / release / "topic" page under which individual
 * documents are grouped (e.g. "JFK Assassination Records — 2025 Release",
 * "Operation Paperclip", "Hoover Official Files").
 */
final class ScrapedTopic
{
    public function __construct(
        public string $slug,
        public string $name,
        public ?string $description = null,
        public ?string $agencySlug = null,
    ) {
    }

    public static function fromArray(array $row): self
    {
        return new self(
            slug: (string) $row['slug'],
            name: (string) $row['name'],
            description: isset($row['description']) ? (string) $row['description'] : null,
            agencySlug: isset($row['agency_slug']) ? (string) $row['agency_slug'] : null,
        );
    }

    public function toJsonlArray(): array
    {
        return [
            'type' => 'topic',
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
            'agency_slug' => $this->agencySlug,
        ];
    }
}
