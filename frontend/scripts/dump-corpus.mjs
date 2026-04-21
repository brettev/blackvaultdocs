#!/usr/bin/env node
/**
 * Pre-build dump of the public document corpus.
 *
 * `next build` spawns N worker processes for static-page generation
 * and each worker that imports `app/lib/corpus.ts` would otherwise
 * re-paginate `/api/public/documents` from page 1. With ~50k docs and
 * a Symfony API capped at ~200 rows/page that's hundreds of HTTP
 * round trips per worker — long enough to trip Next's 60s static-page
 * timeout and stall the whole build.
 *
 * This script runs once, writes `.corpus-cache.json`, and lets every
 * worker hydrate from disk in milliseconds.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', '.corpus-cache.json');

const API = (process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.blackvaultdocs.com').replace(/\/$/, '');
const MAX = Number(process.env.MAX_CORPUS_DOCS ?? 60000);
const PAGE_SIZE = 500;

async function fetchJson(path) {
  const res = await fetch(`${API}${path}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

async function main() {
  console.log(`[corpus] starting (max=${MAX})`);
  const out = [];
  let page = 1;
  while (out.length < MAX) {
    const res = await fetchJson(`/api/public/documents?page=${page}&limit=${PAGE_SIZE}`);
    const rows = res?.data ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      out.push({
        slug: r.slug,
        title: r.title,
        topic_slug: r.topic_slug,
        agency_slug: r.agency_slug,
        source: r.source,
        scraped_at: r.scraped_at ?? null,
      });
      if (out.length >= MAX) break;
    }
    if (page % 10 === 0 || rows.length < PAGE_SIZE) {
      console.log(`[corpus]   page=${page} rows=${out.length}`);
    }
    if (page >= (res?.pages ?? 1)) break;
    page += 1;
  }
  await writeFile(OUT, JSON.stringify(out));
  console.log(`[corpus] wrote ${out.length} rows -> ${OUT}`);
}

main().catch((err) => {
  console.error('[corpus] failed:', err);
  process.exit(1);
});
