-- Normalize `source` keys to the current convention (hyphen-separated,
-- matches the `--source=` CLI flag and `ScraperInterface::sourceKey()`).
-- Applied to the server on 2026-04-20 as part of the ingestion-refactor
-- commit. Idempotent — running it again is a no-op.

UPDATE documents  SET source = 'archives-gov' WHERE source = 'archives_gov';
UPDATE scrape_log SET source = 'archives-gov' WHERE source = 'archives_gov';
