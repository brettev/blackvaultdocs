<?php

declare(strict_types=1);

namespace App\Ingestion;

use Doctrine\DBAL\Connection;

/**
 * Thin wrapper around the `scrape_log` table so scrapers don't have to know
 * about it. Only meaningful when the sink is a `DbSink` (we're writing live
 * to the server's DB). For local JSONL captures the command simply doesn't
 * wire this up.
 */
final class ScrapeLogger
{
    public function __construct(
        private readonly Connection $conn,
    ) {
    }

    public function start(string $source, string $task, ?string $url = null): int
    {
        $this->conn->executeStatement(
            'INSERT INTO scrape_log (source, task, url, status) VALUES (?, ?, ?, ?)',
            [$source, $task, $url, 'running'],
        );
        return (int) $this->conn->lastInsertId();
    }

    public function tick(int $id, int $rowsAdded, int $rowsSeen): void
    {
        $this->conn->executeStatement(
            'UPDATE scrape_log SET rows_added = ?, rows_seen = ? WHERE id = ?',
            [$rowsAdded, $rowsSeen, $id],
        );
    }

    public function finish(int $id, string $status, int $rowsAdded, int $rowsSeen, ?string $error = null): void
    {
        $this->conn->executeStatement(
            'UPDATE scrape_log
                SET status = ?, rows_added = ?, rows_seen = ?, error = ?, finished_at = NOW()
              WHERE id = ?',
            [$status, $rowsAdded, $rowsSeen, $error, $id],
        );
    }
}
