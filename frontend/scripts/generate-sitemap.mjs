#!/usr/bin/env node
/**
 * Generate public/sitemap.xml from the BlackVaultDocs public API.
 *
 * Strategy:
 *   - Pull every topic and agency (cheap — only ~10s of each)
 *   - Pull up to MAX_DOCUMENTS document slugs, paginating at PAGE_SIZE
 *   - Emit one <url> per route. All trailingSlash-true to match next.config.
 *
 * Run automatically via `prebuild`. Fails open (writes a minimal sitemap) if
 * the API is unreachable so the build can still produce a static export.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blackvaultdocs.com').replace(/\/$/, '');
const API = (process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.blackvaultdocs.com').replace(/\/$/, '');

const MAX_DOCUMENTS = Number(process.env.MAX_SITEMAP_DOCS ?? 20000);
const PAGE_SIZE = 200;

const FIXED_ROUTES = [
  '/',
  '/topics/',
  '/documents/',
  '/agencies/',
  '/search/',
  '/stats/',
  '/about/',
];

const TOPIC_DOCS_PER_PAGE = 100;

async function fetchJson(path) {
  const url = `${API}${path}`;
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[sitemap] fetch failed ${url}: ${err.message}`);
    return null;
  }
}

async function listTopics() {
  const res = await fetchJson('/api/public/topics?limit=500');
  return res?.data ?? [];
}

async function listAgencySlugs() {
  const res = await fetchJson('/api/public/agencies');
  return (res?.data ?? []).map((a) => a.slug);
}

async function listAllDocumentSlugs(max = MAX_DOCUMENTS) {
  const slugs = [];
  let page = 1;
  while (slugs.length < max) {
    const res = await fetchJson(`/api/public/documents?page=${page}&limit=${PAGE_SIZE}`);
    const rows = res?.data ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      slugs.push(r.slug);
      if (slugs.length >= max) break;
    }
    if (page >= (res?.pages ?? 1)) break;
    page += 1;
  }
  return slugs;
}

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urlTag(loc, lastmod) {
  return `  <url><loc>${xmlEscape(`${SITE}${loc}`)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>weekly</changefreq></url>`;
}

async function main() {
  console.log('[sitemap] starting');
  const today = new Date().toISOString().slice(0, 10);

  const [topics, agencySlugs, docSlugs] = await Promise.all([
    listTopics(),
    listAgencySlugs(),
    listAllDocumentSlugs(MAX_DOCUMENTS),
  ]);

  console.log(`[sitemap] topics=${topics.length} agencies=${agencySlugs.length} docs=${docSlugs.length}`);

  const urls = [];
  for (const r of FIXED_ROUTES) urls.push(urlTag(r, today));
  for (const t of topics) {
    urls.push(urlTag(`/topics/${t.slug}/`, today));
    const pageCount = Math.ceil((t.doc_count || 0) / TOPIC_DOCS_PER_PAGE);
    for (let p = 2; p <= pageCount; p++) {
      urls.push(urlTag(`/topics/${t.slug}/page/${p}/`, today));
    }
  }
  for (const s of agencySlugs) urls.push(urlTag(`/agencies/${s}/`, today));
  for (const s of docSlugs) urls.push(urlTag(`/documents/${s}/`));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(resolve(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf8');

  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE}/sitemap.xml`,
    '',
  ].join('\n');
  await writeFile(resolve(PUBLIC_DIR, 'robots.txt'), robots, 'utf8');

  console.log(`[sitemap] wrote ${urls.length} urls to public/sitemap.xml`);
}

main().catch((err) => {
  console.error('[sitemap] failed:', err);
  process.exit(1);
});
