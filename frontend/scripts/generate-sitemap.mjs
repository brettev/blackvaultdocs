#!/usr/bin/env node
/**
 * Generate a sitemap-index + per-collection sitemap set from the
 * BlackVaultDocs public API.
 *
 * Google's hard cap on a single sitemap file is 50,000 URLs (or 50 MB
 * uncompressed). At ~15k docs today we're still well under that cap, but
 * the corpus is growing with every scraper pass and we want per-collection
 * `<lastmod>` granularity so Googlebot can recrawl only the collections
 * that actually changed.
 *
 * Output layout:
 *   /sitemap.xml                    — sitemap index (entry point in robots.txt)
 *   /sitemaps/sitemap-core.xml      — fixed routes, agencies, years, figures
 *   /sitemaps/sitemap-topics.xml    — one URL per topic + every pagination page
 *   /sitemaps/sitemap-figures.xml   — one URL per figure
 *   /sitemaps/sitemap-nara.xml      — one URL per NARA-ID short link
 *   /sitemaps/sitemap-docs-<source>-<index>.xml
 *                                   — documents chunked by source + 10k cap
 *
 * The script fails open (writes a minimal index + core sitemap) if the API
 * is unreachable so the build can still complete.
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');
const SITEMAPS_DIR = resolve(PUBLIC_DIR, 'sitemaps');
const CORPUS_CACHE = resolve(__dirname, '..', '.corpus-cache.json');

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blackvaultdocs.com').replace(/\/$/, '');
const API = (process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.blackvaultdocs.com').replace(/\/$/, '');

const MAX_DOCUMENTS = Number(process.env.MAX_SITEMAP_DOCS ?? 60000);
const DOCS_PER_FILE = 10_000;
const PAGE_SIZE = 500;

const FIXED_ROUTES = [
  '/',
  '/topics/',
  '/years/',
  '/documents/',
  '/agencies/',
  '/figures/',
  '/search/',
  '/stats/',
  '/about/',
];

const TOPIC_DOCS_PER_PAGE = 100;

const FIGURE_SLUGS = [
  'lee-harvey-oswald',
  'jack-ruby',
  'sirhan-sirhan',
  'martin-luther-king-jr',
  'james-earl-ray',
  'john-f-kennedy',
  'robert-f-kennedy',
  'j-edgar-hoover',
  'fidel-castro',
  'e-howard-hunt',
  'james-jesus-angleton',
  'david-atlee-phillips',
  'george-joannides',
  'allen-dulles',
];

const NARA_ID_RE = /\b(\d{3}-\d{5}-\d{5})\b/;

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

async function listAgencies() {
  const res = await fetchJson('/api/public/agencies');
  return res?.data ?? [];
}

async function listAllDocuments(max = MAX_DOCUMENTS) {
  if (existsSync(CORPUS_CACHE)) {
    try {
      const raw = await readFile(CORPUS_CACHE, 'utf8');
      const rows = JSON.parse(raw);
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.slice(0, max).map((r) => ({
          slug: r.slug,
          source: r.source ?? 'unknown',
          title: r.title ?? '',
          scraped_at: r.scraped_at ?? null,
        }));
      }
    } catch {
    }
  }

  const out = [];
  let page = 1;
  while (out.length < max) {
    const res = await fetchJson(`/api/public/documents?page=${page}&limit=${PAGE_SIZE}`);
    const rows = res?.data ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      out.push({
        slug: r.slug,
        source: r.source ?? 'unknown',
        title: r.title ?? '',
        scraped_at: r.scraped_at ?? null,
      });
      if (out.length >= max) break;
    }
    if (page >= (res?.pages ?? 1)) break;
    page += 1;
  }
  return out;
}

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urlTag(loc, lastmod, changefreq = 'weekly') {
  const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
  return `  <url><loc>${xmlEscape(`${SITE}${loc}`)}</loc>${lm}<changefreq>${changefreq}</changefreq></url>`;
}

function urlsetDoc(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function indexDoc(entries) {
  const body = entries
    .map(
      (e) =>
        `  <sitemap><loc>${xmlEscape(`${SITE}${e.path}`)}</loc><lastmod>${e.lastmod}</lastmod></sitemap>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

function mostRecent(dates) {
  const valid = dates.filter((d) => typeof d === 'string' && d.length >= 10);
  if (valid.length === 0) return null;
  valid.sort();
  return valid[valid.length - 1].slice(0, 10);
}

async function writeSitemap(filename, urls) {
  await writeFile(resolve(SITEMAPS_DIR, filename), urlsetDoc(urls), 'utf8');
  console.log(`[sitemap]   wrote sitemaps/${filename} (${urls.length} urls)`);
}

async function main() {
  console.log('[sitemap] starting');
  await mkdir(SITEMAPS_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);

  const [topics, agencies, docs] = await Promise.all([
    listTopics(),
    listAgencies(),
    listAllDocuments(MAX_DOCUMENTS),
  ]);
  const agencySlugs = agencies.map((a) => a.slug);
  console.log(
    `[sitemap] topics=${topics.length} agencies=${agencySlugs.length} docs=${docs.length}`,
  );

  const indexEntries = [];

  /* ---------- core ---------- */
  const coreUrls = [];
  for (const r of FIXED_ROUTES) coreUrls.push(urlTag(r, today, 'daily'));
  for (const s of agencySlugs) coreUrls.push(urlTag(`/agencies/${s}/`, today));
  const years = new Set();
  for (const t of topics) {
    const y = t.slug.match(/-(\d{4})$/);
    if (y) years.add(y[1]);
  }
  for (const y of [...years].sort()) coreUrls.push(urlTag(`/years/${y}/`, today));
  await writeSitemap('sitemap-core.xml', coreUrls);
  indexEntries.push({ path: '/sitemaps/sitemap-core.xml', lastmod: today });

  /* ---------- topics ---------- */
  const topicUrls = [];
  for (const t of topics) {
    const lastmod = (t.updated_at ?? '').slice(0, 10) || today;
    topicUrls.push(urlTag(`/topics/${t.slug}/`, lastmod));
    const pageCount = Math.ceil((t.doc_count || 0) / TOPIC_DOCS_PER_PAGE);
    for (let p = 2; p <= pageCount; p++) {
      topicUrls.push(urlTag(`/topics/${t.slug}/page/${p}/`, lastmod));
    }
  }
  await writeSitemap('sitemap-topics.xml', topicUrls);
  const topicsLastmod =
    mostRecent(topics.map((t) => t.updated_at ?? null)) ?? today;
  indexEntries.push({ path: '/sitemaps/sitemap-topics.xml', lastmod: topicsLastmod });

  /* ---------- figures ---------- */
  const figureUrls = [urlTag('/figures/', today, 'weekly')];
  for (const slug of FIGURE_SLUGS) figureUrls.push(urlTag(`/figures/${slug}/`, today));
  await writeSitemap('sitemap-figures.xml', figureUrls);
  indexEntries.push({ path: '/sitemaps/sitemap-figures.xml', lastmod: today });

  /* ---------- NARA short links ---------- */
  const naraSet = new Set();
  for (const d of docs) {
    const hit = NARA_ID_RE.exec(d.title) ?? NARA_ID_RE.exec(d.slug);
    if (hit) naraSet.add(hit[1]);
  }
  if (naraSet.size > 0) {
    const naraUrls = [...naraSet].sort().map((id) => urlTag(`/nara/${id}/`, today));
    await writeSitemap('sitemap-nara.xml', naraUrls);
    indexEntries.push({ path: '/sitemaps/sitemap-nara.xml', lastmod: today });
  }

  /* ---------- documents, partitioned by source then chunked ---------- */
  const bySource = new Map();
  for (const d of docs) {
    const arr = bySource.get(d.source) ?? [];
    arr.push(d);
    bySource.set(d.source, arr);
  }
  for (const [source, list] of [...bySource.entries()].sort()) {
    list.sort((a, b) => a.slug.localeCompare(b.slug));
    for (let i = 0; i < list.length; i += DOCS_PER_FILE) {
      const chunk = list.slice(i, i + DOCS_PER_FILE);
      const idx = Math.floor(i / DOCS_PER_FILE) + 1;
      const fname = `sitemap-docs-${source}-${idx}.xml`;
      const urls = chunk.map((d) =>
        urlTag(
          `/documents/${d.slug}/`,
          (d.scraped_at ?? '').slice(0, 10) || today,
          'monthly',
        ),
      );
      await writeSitemap(fname, urls);
      const lastmod = mostRecent(chunk.map((d) => d.scraped_at)) ?? today;
      indexEntries.push({ path: `/sitemaps/${fname}`, lastmod });
    }
  }

  /* ---------- inject dynamic blog ---------- */
  indexEntries.push({ path: '/sitemap-blog.xml', lastmod: today });

  /* ---------- write the index ---------- */
  await writeFile(resolve(PUBLIC_DIR, 'sitemap.xml'), indexDoc(indexEntries), 'utf8');
  console.log(`[sitemap] wrote sitemap.xml (index of ${indexEntries.length} sitemaps)`);

  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE}/sitemap.xml`,
    '',
  ].join('\n');
  await writeFile(resolve(PUBLIC_DIR, 'robots.txt'), robots, 'utf8');

  console.log('[sitemap] done');
}

main().catch((err) => {
  console.error('[sitemap] failed:', err);
  process.exit(1);
});
