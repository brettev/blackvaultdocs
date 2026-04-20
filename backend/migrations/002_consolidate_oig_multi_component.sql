-- Consolidate DOJ OIG multi-component topics created by the first ingestion
-- run. Reports where the Component(s) field contained a comma-separated list
-- produced one long-slug topic per unique combination (e.g.
-- doj-oig-bureau-of-alcohol-tobacco-firearms-and-explosives-drug-enfor).
-- They now all fold into `doj-oig-multiple-components`.
--
-- Also normalize `doj-oig-united-states-marshals-service` to the canonical
-- short key `doj-oig-usms` (alias missed in the first scraper version).
--
-- Applied 2026-04-20. Idempotent — safe to re-run.

-- 1. Make sure the target topics exist.
INSERT INTO topics (slug, name, description, agency_slug)
VALUES (
    'doj-oig-multiple-components',
    'DOJ OIG — Multiple DOJ Components',
    'U.S. DOJ Office of the Inspector General reports that span more than one DOJ component (e.g. joint audits or cross-component investigations involving the FBI, DEA, ATF, BOP, USMS, OJP, etc.).',
    'doj-oig'
) ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    agency_slug = VALUES(agency_slug);

INSERT INTO topics (slug, name, description, agency_slug)
VALUES (
    'doj-oig-usms',
    'DOJ OIG — U.S. Marshals Service',
    'U.S. DOJ Office of the Inspector General reports concerning the United States Marshals Service.',
    'doj-oig'
) ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    agency_slug = VALUES(agency_slug);

-- 2. Move documents off the USMS long-form slug onto the canonical one.
UPDATE documents
   SET topic_slug = 'doj-oig-usms'
 WHERE topic_slug = 'doj-oig-united-states-marshals-service';

-- 3. Move every document currently on a multi-component topic over to
--    `doj-oig-multiple-components`. We identify those topics by doj-oig
--    prefix + slug length > 40 chars, which excludes every canonical
--    topic (longest canonical: `doj-oig-usms` @ 12 chars,
--    `doj-oig-multiple-components` @ 27, `doj-oig-other-component` @ 23,
--    `doj-oig-cops` @ 12, `doj-oig-fbi` @ 11, etc).
UPDATE documents
   SET topic_slug = 'doj-oig-multiple-components'
 WHERE topic_slug LIKE 'doj-oig-%'
   AND CHAR_LENGTH(topic_slug) > 40;

-- 4. Drop the now-empty composite / legacy topics.
DELETE FROM topics
 WHERE slug LIKE 'doj-oig-%'
   AND CHAR_LENGTH(slug) > 40;

DELETE FROM topics
 WHERE slug = 'doj-oig-united-states-marshals-service';

-- 5. Refresh doc_counts.
UPDATE topics t
 LEFT JOIN (
    SELECT topic_slug, COUNT(*) AS n FROM documents
    WHERE topic_slug IS NOT NULL GROUP BY topic_slug
 ) d ON d.topic_slug = t.slug
   SET t.doc_count = IFNULL(d.n, 0);
