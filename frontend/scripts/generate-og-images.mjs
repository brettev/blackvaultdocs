#!/usr/bin/env node
/**
 * Generate 1200x630 OG images for the site's high-value landing pages.
 *
 * We use `satori` (JSX -> SVG) + `@resvg/resvg-js` (SVG -> PNG) so the
 * whole pipeline is synchronous, zero-network, and runs inside the regular
 * Node process `npm run build` already launches.
 *
 * Scope is deliberate: home, every topic (~20), every agency (~2), every
 * year (~10), every figure (~15). That's roughly 50 images at 1200x630 —
 * a few hundred KB in the static export — not the 15k documents, which
 * would blow up the build and give no per-doc SERP lift.
 *
 * Usage:
 *   node scripts/generate-og-images.mjs
 *
 * Env:
 *   NEXT_PUBLIC_API_BASE   — backend base (defaults to production)
 *   OG_FONT_CACHE_DIR      — where to cache the font (defaults to
 *                            node_modules/.cache/og-font)
 */
import { writeFile, mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');
const OG_DIR = resolve(PUBLIC_DIR, 'og');

const API = (process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.blackvaultdocs.com').replace(/\/$/, '');

const FONT_CACHE_DIR =
  process.env.OG_FONT_CACHE_DIR ?? resolve(__dirname, '..', 'node_modules', '.cache', 'og-font');
const FONT_URL = 'https://github.com/rsms/inter/raw/v4.0/docs/font-files/InterDisplay-Bold.otf';
const FONT_CACHE_PATH = resolve(FONT_CACHE_DIR, 'InterDisplay-Bold.otf');

// Palette kept in sync with the dark landing-page theme: near-black
// background, white headline, red accent.
const BG = '#0a0a0a';
const ACCENT = '#dc2626';
const MUTED = '#9ca3af';
const TEXT = '#ffffff';

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

async function loadFont() {
  try {
    const s = await stat(FONT_CACHE_PATH);
    if (s.size > 0) return readFile(FONT_CACHE_PATH);
  } catch {
    // fall through
  }
  console.log(`[og] downloading font from ${FONT_URL}`);
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`font download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(FONT_CACHE_DIR, { recursive: true });
  await writeFile(FONT_CACHE_PATH, buf);
  return buf;
}

async function fetchJson(path) {
  try {
    const res = await fetch(`${API}${path}`, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function card({ eyebrow, title, subtitle, stat }) {
  return {
    type: 'div',
    props: {
      style: {
        width: 1200,
        height: 630,
        background: BG,
        display: 'flex',
        flexDirection: 'column',
        padding: '64px 72px',
        position: 'relative',
        color: TEXT,
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 8,
              background: ACCENT,
            },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: 20,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: ACCENT,
              marginBottom: 24,
              fontWeight: 700,
            },
            children: eyebrow,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: title.length > 60 ? 56 : 72,
              fontWeight: 900,
              lineHeight: 1.05,
              color: TEXT,
              maxWidth: 1000,
            },
            children: title,
          },
        },
        subtitle
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: 28,
                  fontWeight: 500,
                  color: MUTED,
                  marginTop: 24,
                  maxWidth: 1000,
                  lineHeight: 1.3,
                },
                children: subtitle,
              },
            }
          : null,
        {
          type: 'div',
          props: {
            style: {
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'baseline',
              gap: 16,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 32,
                    fontWeight: 900,
                    letterSpacing: 1,
                    color: TEXT,
                  },
                  children: 'BlackVaultDocs',
                },
              },
              stat
                ? {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: 22,
                        color: MUTED,
                        fontWeight: 500,
                      },
                      children: stat,
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },
      ].filter(Boolean),
    },
  };
}

async function render(outfile, spec, font) {
  const svg = await satori(card(spec), {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Inter', data: font, weight: 700, style: 'normal' }],
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  await writeFile(outfile, png);
}

async function main() {
  console.log('[og] starting');
  await mkdir(OG_DIR, { recursive: true });
  const font = await loadFont();

  /* ---------- home ---------- */
  const stats = await fetchJson('/api/public/stats');
  const docCount = stats?.total_documents ?? null;
  const topicCount = stats?.total_topics ?? null;
  await render(
    resolve(OG_DIR, 'home.png'),
    {
      eyebrow: 'Declassified archive',
      title: 'Structured index of declassified US government records',
      subtitle: 'JFK, RFK, MLK, DOJ OIG, and more — searchable and citable',
      stat:
        docCount && topicCount
          ? `${docCount.toLocaleString()} documents across ${topicCount} collections`
          : 'BlackVaultDocs',
    },
    font,
  );
  console.log('[og]   home.png');

  /* ---------- topics ---------- */
  const topicsRes = await fetchJson('/api/public/topics?limit=500');
  const topics = topicsRes?.data ?? [];
  await mkdir(resolve(OG_DIR, 'topics'), { recursive: true });
  for (const t of topics) {
    const y = t.slug.match(/-(\d{4})$/);
    await render(
      resolve(OG_DIR, 'topics', `${t.slug}.png`),
      {
        eyebrow: y ? `Collection · ${y[1]}` : 'Collection',
        title: t.name,
        subtitle: t.description ? t.description.slice(0, 180) : null,
        stat: `${(t.doc_count ?? 0).toLocaleString()} documents`,
      },
      font,
    );
  }
  console.log(`[og]   ${topics.length} topic images`);

  /* ---------- agencies ---------- */
  const agenciesRes = await fetchJson('/api/public/agencies');
  const agencies = agenciesRes?.data ?? [];
  await mkdir(resolve(OG_DIR, 'agencies'), { recursive: true });
  for (const a of agencies) {
    await render(
      resolve(OG_DIR, 'agencies', `${a.slug}.png`),
      {
        eyebrow: 'Source agency',
        title: a.name,
        subtitle: a.description ? a.description.slice(0, 180) : null,
        stat: `${(a.doc_count ?? 0).toLocaleString()} indexed records`,
      },
      font,
    );
  }
  console.log(`[og]   ${agencies.length} agency images`);

  /* ---------- years ---------- */
  const years = new Set();
  for (const t of topics) {
    const y = t.slug.match(/-(\d{4})$/);
    if (y) years.add(y[1]);
  }
  await mkdir(resolve(OG_DIR, 'years'), { recursive: true });
  for (const y of [...years].sort()) {
    await render(
      resolve(OG_DIR, 'years', `${y}.png`),
      {
        eyebrow: 'Release year',
        title: `${y} declassification releases`,
        subtitle: 'Collections of records disclosed in this calendar year',
        stat: 'BlackVaultDocs',
      },
      font,
    );
  }
  console.log(`[og]   ${years.size} year images`);

  /* ---------- figures ---------- */
  await mkdir(resolve(OG_DIR, 'figures'), { recursive: true });
  for (const slug of FIGURE_SLUGS) {
    const pretty = slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .replace(/\bJr\b/, 'Jr.')
      .replace(/\bF\b/, 'F.')
      .replace(/\bE\b/, 'E.')
      .replace(/\bJ\b/, 'J.');
    await render(
      resolve(OG_DIR, 'figures', `${slug}.png`),
      {
        eyebrow: 'Figure',
        title: pretty,
        subtitle: 'Declassified records mentioning this person',
        stat: 'BlackVaultDocs',
      },
      font,
    );
  }
  console.log(`[og]   ${FIGURE_SLUGS.length} figure images`);

  console.log('[og] done');
}

main().catch((err) => {
  console.error('[og] failed:', err);
  // Don't fail the build if OG generation has a hiccup — metadata will
  // just fall back to the text-only card.
  process.exit(0);
});
