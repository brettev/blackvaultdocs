import Link from 'next/link';
import type { Metadata } from 'next';
import { listTopics } from '../lib/api';
import { breadcrumbJsonLd, jsonLdString } from '../lib/jsonLd';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'All collections',
  description:
    'Browse every declassified document collection indexed by BlackVaultDocs — JFK, RFK, MLK, and other FOIA releases from the National Archives.',
  alternates: { canonical: '/topics/' },
};

export default async function TopicsIndexPage() {
  const topics = await listTopics(500);
  const total = topics.reduce((s, t) => s + (t.doc_count ?? 0), 0);
  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Collections', path: '/topics/' },
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> // collections
      </nav>

      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">
        All collections
      </h1>
      <p className="mt-3 max-w-2xl text-gray-400">
        {topics.length.toLocaleString()} collections · {total.toLocaleString()} documents indexed.
        Each collection corresponds to a declassification release published by
        the National Archives.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {topics.map((t) => (
          <Link
            key={t.slug}
            href={`/topics/${t.slug}/`}
            className="group rounded-lg border border-gray-800 bg-gray-900/50 p-5 hover:border-red-800 hover:bg-gray-900"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-100 group-hover:text-white">
                {t.name}
              </h2>
              <span className="font-mono text-xs shrink-0 text-red-500">
                {t.doc_count.toLocaleString()} docs
              </span>
            </div>
            {t.description ? (
              <p className="mt-2 line-clamp-3 text-sm text-gray-400">{t.description}</p>
            ) : null}
            <div className="mt-3 text-xs font-mono uppercase tracking-widest text-gray-500">
              {t.agency_slug ?? 'unclassified'} //
            </div>
          </Link>
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }}
      />
    </div>
  );
}
