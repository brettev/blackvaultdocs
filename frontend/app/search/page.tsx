import Link from 'next/link';
import type { Metadata } from 'next';
import { buildSearchIndex } from '../lib/api';
import { breadcrumbJsonLd, jsonLdString } from '../lib/jsonLd';
import { SearchBox } from './SearchBox';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Search the archive',
  description:
    'Search every declassified document indexed by BlackVaultDocs — JFK, RFK, MLK and other NARA FOIA releases. Client-side fuzzy match over the full corpus.',
  alternates: { canonical: '/search/' },
};

export default async function SearchPage() {
  // Build a tiny index at build time so the page ships static. For ~12k
  // docs with slug+title+topic, the JSON is ~1.5 MB uncompressed / ~300 KB
  // gzipped — small enough to inline, still responsive to filter in the
  // browser.
  const index = await buildSearchIndex(30000, 500);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <nav className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> // search
      </nav>

      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">Search the archive</h1>
      <p className="mt-3 max-w-2xl text-gray-400">
        Full-corpus search across {index.length.toLocaleString()} indexed
        documents. Matches anywhere in the title, slug, or NARA record
        identifier. Use quotes to search for exact phrases
        (<code className="font-mono text-gray-200">&quot;104-10014&quot;</code>).
      </p>

      <SearchBox index={index} />

      <section className="mt-12 rounded-md border border-gray-800 bg-gray-900/40 p-6 text-sm text-gray-400">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-300">
          Tips
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            NARA identifiers like <code className="font-mono text-gray-200">104-10020-10016</code> are indexed verbatim.
          </li>
          <li>
            Prefix results with a collection slug (e.g. <code className="font-mono text-gray-200">mlk</code>) to filter by release.
          </li>
          <li>
            All matches resolve to a canonical <code className="font-mono text-gray-200">/documents/&lt;slug&gt;/</code> page with the original PDF link.
          </li>
        </ul>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Search', path: '/search/' },
            ]),
          ),
        }}
      />
    </main>
  );
}
