-- BlackVaultDocs — initial schema.
--
-- Flat schema optimized for the first ingestion source (FBI Vault). Additional
-- sources (CIA CREST, National Security Archive, etc.) slot in via the
-- `source` column on documents. topics/agencies are upserted from document
-- metadata during ingestion.

CREATE TABLE IF NOT EXISTS agencies (
    slug         VARCHAR(160) NOT NULL,
    name         VARCHAR(255) NOT NULL,
    description  TEXT NULL,
    doc_count    INT NOT NULL DEFAULT 0,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS topics (
    slug         VARCHAR(200) NOT NULL,
    name         VARCHAR(255) NOT NULL,
    description  TEXT NULL,
    agency_slug  VARCHAR(160) NULL,
    doc_count    INT NOT NULL DEFAULT 0,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (slug),
    KEY idx_topic_agency (agency_slug),
    KEY idx_topic_doc_count (doc_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
    slug            VARCHAR(220) NOT NULL,
    source          VARCHAR(32)  NOT NULL,
    external_id     VARCHAR(255) NULL,
    title           VARCHAR(500) NOT NULL,
    summary         TEXT NULL,
    source_url      VARCHAR(1000) NOT NULL,
    pdf_url         VARCHAR(1000) NULL,
    file_size_bytes BIGINT NULL,
    page_count      INT NULL,
    classification  VARCHAR(64) NULL,
    released_at     DATE NULL,
    topic_slug      VARCHAR(200) NULL,
    agency_slug     VARCHAR(160) NULL,
    scraped_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (slug),
    UNIQUE KEY uniq_source_extid (source, external_id),
    KEY idx_doc_topic (topic_slug),
    KEY idx_doc_agency (agency_slug),
    KEY idx_doc_source (source),
    KEY idx_doc_released (released_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scrape_log (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    source      VARCHAR(32)  NOT NULL,
    task        VARCHAR(64)  NOT NULL,
    url         VARCHAR(1000) NULL,
    status      VARCHAR(24)  NOT NULL,
    rows_added  INT NOT NULL DEFAULT 0,
    rows_seen   INT NOT NULL DEFAULT 0,
    error       TEXT NULL,
    started_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_scrape_source (source),
    KEY idx_scrape_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
