'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DocumentBody from '../../components/DocumentBody';
import type { DocumentDetail } from '../../lib/api';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.blackvaultdocs.com';
const SITE_URL = 'https://blackvaultdocs.com';

// CloudFront serves this page (HTTP 200) for any URL that 403/404s on S3
// — see seo-engine/scripts/apply-cf-fallback.mjs. The component then
// inspects `window.location.pathname` and either:
//   - renders a document detail for `/documents/<slug>/` not in the SSG
//     set (typo, very recent indexing, or future cap-overflow), OR
//   - renders a generic "not found" UI with `<meta name="robots"
//     content="noindex,nofollow">` for anything else so Google de-indexes
//     them as soft-404s.
//
// IMPORTANT: this file MUST emit a fully self-contained HTML at
// `out/documents/dynamic/index.html`. Anything that depends on params
// or server-only APIs will break the build.

type ApiResponse = {
  document: DocumentDetail;
  topic:
    | {
        slug: string;
        name: string;
        description: string | null;
        doc_count: number;
      }
    | null;
  agency: { slug: string; name: string } | null;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  related: { slug: string; title: string }[];
};

type LoadState =
  | { phase: 'loading'; slug: string | null }
  | { phase: 'not-a-document'; pathname: string }
  | { phase: 'document-not-found'; slug: string }
  | { phase: 'api-error'; slug: string }
  | { phase: 'ready'; slug: string; data: ApiResponse };

function parseSlugFromPath(pathname: string): string | null {
  // Slugs are kebab-cased ASCII; route is /documents/<slug>/
  const m = pathname.match(/^\/documents\/([a-z0-9][a-z0-9-]*)\/?$/i);
  return m ? m[1] : null;
}

function isKnownNonDocumentPath(pathname: string): boolean {
  // Stale sitemap URLs (e.g. /figures/jfk-assassination/) hit this shell via
  // CloudFront 404 → /documents/dynamic/index.html. Treat immediately as
  // not-found with noindex instead of flashing the homepage title.
  return /^\/(figures|topics|agencies|years|nara)\/[^/]+\/?$/i.test(pathname);
}

async function fetchDocument(slug: string): Promise<ApiResponse | null> {
  const res = await fetch(
    `${API_BASE}/api/public/documents/${encodeURIComponent(slug)}`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`api ${res.status}`);
  const json = (await res.json()) as ApiResponse;
  if (!json?.document?.slug) return null;
  return json;
}

function NotADocument({ pathname }: { pathname: string }) {
  return (
    <>
      <title>Page not found · BlackVaultDocs</title>
      <meta name="robots" content="noindex,nofollow" />
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-mono text-3xl font-extrabold tracking-tight text-white">
          Not found
        </h1>
        <p className="mt-4 text-sm text-gray-400">
          We couldn’t find{' '}
          <code className="font-mono text-red-400">{pathname}</code> in the
          archive.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-red-400 hover:text-red-300"
        >
          ← Back to BlackVaultDocs
        </Link>
      </div>
    </>
  );
}

function DocumentNotFound({ slug }: { slug: string }) {
  return (
    <>
      <title>Document not found · BlackVaultDocs</title>
      <meta name="robots" content="noindex,nofollow" />
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-mono text-3xl font-extrabold tracking-tight text-white">
          Document not found
        </h1>
        <p className="mt-4 text-sm text-gray-400">
          No declassified record matches the slug{' '}
          <code className="font-mono text-red-400 break-all">{slug}</code>. It
          may have been re-slugged after a NARA update, or the URL is a typo.
        </p>
        <Link
          href="/documents/"
          className="mt-8 inline-block text-sm text-red-400 hover:text-red-300"
        >
          ← Browse the index
        </Link>
      </div>
    </>
  );
}

function ApiError({ slug }: { slug: string }) {
  return (
    <>
      <title>Temporarily unavailable · BlackVaultDocs</title>
      <meta name="robots" content="noindex,nofollow" />
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-mono text-3xl font-extrabold tracking-tight text-white">
          Temporarily unavailable
        </h1>
        <p className="mt-4 text-sm text-gray-400">
          api.blackvaultdocs.com didn’t respond for{' '}
          <code className="font-mono text-red-400 break-all">{slug}</code>.
          Try refreshing in a moment.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-8 inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          Retry
        </button>
      </div>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading document…</span>
      <div className="h-3 w-40 rounded bg-gray-900" />
      <div className="mt-6 h-10 w-3/4 rounded bg-gray-900" />
      <div className="mt-3 h-4 w-1/3 rounded bg-gray-900" />
      <div className="mt-10 h-32 rounded-md border border-gray-800 bg-gray-900/40" />
      <div className="mt-6 h-44 rounded-md border border-gray-800 bg-gray-900/40" />
      <div className="mt-6 h-72 rounded-md border border-gray-800 bg-gray-900/40" />
    </div>
  );
}

export default function DynamicDocumentPage() {
  const [state, setState] = useState<LoadState>({
    phase: 'loading',
    slug: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname;
    const slug = parseSlugFromPath(pathname);

    if (!slug || isKnownNonDocumentPath(pathname)) {
      setState({ phase: 'not-a-document', pathname });
      return;
    }

    setState({ phase: 'loading', slug });

    let cancelled = false;
    fetchDocument(slug)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setState({ phase: 'document-not-found', slug });
        } else {
          setState({ phase: 'ready', slug, data });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState({ phase: 'api-error', slug });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.phase === 'loading') {
    // Don't emit a robots meta during loading — let the layout default
    // (index,follow) apply. The not-found branches below explicitly set
    // noindex,nofollow if appropriate.
    return <LoadingSkeleton />;
  }

  if (state.phase === 'not-a-document') {
    return <NotADocument pathname={state.pathname} />;
  }

  if (state.phase === 'document-not-found') {
    return <DocumentNotFound slug={state.slug} />;
  }

  if (state.phase === 'api-error') {
    return <ApiError slug={state.slug} />;
  }

  // ready
  const { data, slug } = state;
  const doc = data.document;
  const topic = data.topic;
  const agency = data.agency;
  const collectionLabel = topic?.name ?? 'National Archives';
  const agencyLabel = agency?.name ?? 'NARA';
  const description = [
    `Declassified ${collectionLabel} document "${doc.title}"`,
    `released by ${agencyLabel}`,
    doc.external_id
      ? `NARA record ${doc.external_id.replace(/^\//, '')}.`
      : null,
    'Indexed by BlackVaultDocs — original PDF hosted at archives.gov.',
  ]
    .filter(Boolean)
    .join(' ');
  const canonical = `${SITE_URL}/documents/${slug}/`;

  return (
    <>
      <title>{`${doc.title} · ${collectionLabel}`}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={`${doc.title} — ${collectionLabel}`} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="article" />
      <DocumentBody
        doc={doc}
        topic={topic}
        agency={agency}
        prev={data.prev ?? null}
        next={data.next ?? null}
        related={data.related ?? []}
      />
    </>
  );
}
