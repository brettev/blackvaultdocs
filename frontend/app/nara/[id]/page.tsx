import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadNaraIdMap } from '../../lib/corpus';
import { breadcrumbJsonLd, jsonLdString, SITE_URL } from '../../lib/jsonLd';
import { STATIC_EXPORT_NARA_ID } from '../../lib/staticExportPlaceholder';

export const dynamic = 'force-static';
export const dynamicParams = false;

/**
 * Short-URL entry point for NARA Record Identification Numbers.
 *
 * Researchers almost always type the raw record ID into Google
 * ("104-10003-10041"), so we prebuild `/nara/<id>/` as a thin redirect
 * that:
 *   1. Sets <link rel="canonical"> to the canonical `/documents/<slug>/`
 *      so Google consolidates ranking signals onto the real page.
 *   2. Uses `<meta http-equiv="refresh" content="0">` so static hosting
 *      (S3 + CloudFront, no rewrite rules) still issues an instant
 *      client-side redirect.
 *   3. Renders a human-readable fallback for non-JS browsers / old
 *      crawlers.
 */

type Params = { id: string };

export async function generateStaticParams(): Promise<Params[]> {
  const map = await loadNaraIdMap();
  const ids = Object.keys(map);
  if (ids.length === 0) return [{ id: STATIC_EXPORT_NARA_ID }];
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  if (id === STATIC_EXPORT_NARA_ID) return { title: 'Not found' };
  const map = await loadNaraIdMap();
  const hit = map[id];
  if (!hit) return { title: 'NARA record not found' };
  return {
    title: `NARA ${id} — ${hit.title}`,
    description: `NARA Record Identification Number ${id} resolves to "${hit.title}". Indexed by BlackVaultDocs.`,
    alternates: { canonical: `/documents/${hit.slug}/` },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function NaraIdRedirectPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (id === STATIC_EXPORT_NARA_ID) notFound();
  const map = await loadNaraIdMap();
  const hit = map[id];
  if (!hit) notFound();

  const target = `/documents/${hit.slug}/`;
  const absoluteTarget = `${SITE_URL}${target}`;

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'NARA IDs', path: '/nara/' },
    { name: id, path: `/nara/${id}/` },
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <meta httpEquiv="refresh" content={`0; url=${target}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(target)});`,
        }}
      />

      <h1 className="text-2xl font-extrabold tracking-tight text-white">
        NARA record {id}
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        Redirecting to the canonical document page…
      </p>

      <div className="mt-8 rounded-md border border-gray-800 bg-gray-900/40 p-6">
        <p className="text-xs font-mono uppercase tracking-widest text-gray-500">
          Resolved to
        </p>
        <Link
          href={target}
          className="mt-2 block text-lg font-semibold text-red-400 hover:text-red-300"
        >
          {hit.title}
        </Link>
        {hit.topic_slug ? (
          <p className="mt-2 text-xs text-gray-500">
            Collection:{' '}
            <Link
              href={`/topics/${hit.topic_slug}/`}
              className="font-mono text-gray-400 hover:text-gray-200"
            >
              {hit.topic_slug}
            </Link>
          </p>
        ) : null}
        <p className="mt-6 text-xs text-gray-500">
          If you are not redirected automatically,{' '}
          <a href={target} className="text-red-400 hover:text-red-300">
            click here
          </a>
          .
        </p>
      </div>

      <link rel="canonical" href={absoluteTarget} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }}
      />
    </div>
  );
}
