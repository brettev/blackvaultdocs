/**
 * Build-time helpers that walk the entire document corpus in one pass and
 * index it by multiple lookup keys. Used by the /figures/ and /nara/ routes
 * to avoid pulling /api/public/documents repeatedly during
 * generateStaticParams — every page we add there re-lists the corpus, which
 * multiplies pressure on the shared Apache pool.
 *
 * Internally memoised: a single call to `loadCorpus()` during `next build`
 * issues one sequence of paginated requests; subsequent calls reuse the
 * resolved promise for the lifetime of the build process.
 */
import { listDocuments, type DocumentRow } from './api';

export type CorpusRow = Pick<
  DocumentRow,
  'slug' | 'title' | 'topic_slug' | 'agency_slug' | 'source'
>;

const MAX_CORPUS = Number(process.env.MAX_CORPUS_DOCS ?? 30000);
const PAGE_SIZE = 500;

let cache: Promise<CorpusRow[]> | null = null;

export function loadCorpus(): Promise<CorpusRow[]> {
  if (cache) return cache;
  cache = (async () => {
    const out: CorpusRow[] = [];
    let page = 1;
    while (out.length < MAX_CORPUS) {
      const res = await listDocuments({ page, limit: PAGE_SIZE });
      const rows = res?.data ?? [];
      if (rows.length === 0) break;
      for (const r of rows) {
        out.push({
          slug: r.slug,
          title: r.title,
          topic_slug: r.topic_slug,
          agency_slug: r.agency_slug,
          source: r.source,
        });
        if (out.length >= MAX_CORPUS) break;
      }
      if (page >= (res?.pages ?? 1)) break;
      page += 1;
    }
    return out;
  })();
  return cache;
}

/**
 * NARA Record Identification Numbers are canonically formatted
 * `AAA-BBBBB-CCCCC` — three groups of digits separated by hyphens. They
 * appear in most JFK release titles, in the document slug tail, and in
 * filenames on archives.gov.
 */
const NARA_ID_RE = /\b(\d{3}-\d{5}-\d{5})\b/;

export function extractNaraId(row: CorpusRow): string | null {
  const hitTitle = NARA_ID_RE.exec(row.title);
  if (hitTitle) return hitTitle[1];
  const hitSlug = NARA_ID_RE.exec(row.slug);
  if (hitSlug) return hitSlug[1];
  return null;
}

/**
 * Map every NARA ID -> canonical document slug. If the same ID appears on
 * multiple rows (legitimate when the same record shows up in 2 releases),
 * we keep the first hit — deterministic because the API returns rows in
 * scraped_at DESC.
 */
export async function loadNaraIdMap(): Promise<Record<string, CorpusRow>> {
  const rows = await loadCorpus();
  const out: Record<string, CorpusRow> = {};
  for (const r of rows) {
    const id = extractNaraId(r);
    if (id && !out[id]) out[id] = r;
  }
  return out;
}
