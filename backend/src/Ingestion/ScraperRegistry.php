<?php

declare(strict_types=1);

namespace App\Ingestion;

use Symfony\Component\DependencyInjection\Attribute\AutowireIterator;

/**
 * Resolves CLI `--source=<key>` to a `ScraperInterface` impl.
 *
 * New sources are picked up automatically via the `App\Ingestion\ScraperInterface`
 * tag (autoconfigured by Symfony). To add a new scraper, drop a class
 * implementing the interface anywhere under `src/` and it's wired.
 */
final class ScraperRegistry
{
    /** @var array<string, ScraperInterface> */
    private array $byKey = [];

    /**
     * @param iterable<ScraperInterface> $scrapers
     */
    public function __construct(
        #[AutowireIterator(ScraperInterface::class)]
        iterable $scrapers,
    ) {
        foreach ($scrapers as $s) {
            $this->byKey[$s->sourceKey()] = $s;
        }
    }

    public function has(string $key): bool
    {
        return isset($this->byKey[$key]);
    }

    public function get(string $key): ScraperInterface
    {
        if (!isset($this->byKey[$key])) {
            throw new \InvalidArgumentException(\sprintf(
                'Unknown source "%s". Known: %s',
                $key,
                implode(', ', array_keys($this->byKey)) ?: '(none registered)',
            ));
        }
        return $this->byKey[$key];
    }

    /** @return string[] */
    public function keys(): array
    {
        return array_keys($this->byKey);
    }
}
