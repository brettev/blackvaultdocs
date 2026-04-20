import Link from 'next/link';
import type { Metadata } from 'next';
import { listDocuments, listTopics } from '../lib/api';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'All documents',
  description:
    'Recent declassified documents indexed by BlackVaultDocs — drawn from the full corpus of FOIA releases at the National Archives.',
  alternates: { canonical: '/documents/' },
};

export default async function DocumentsIndexPage() {
  const [listing, topics] = await Promise.all([
    listDocuments({ page: 1, limit: 100 }),
    listTopics(50),
  ]);
  const docs = listing?.data ?? [];
  const total = listing?.total ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <nav className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> // documents
      </nav>

      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">
        All documents
      </h1>
      <p className="mt-3 max-w-2xl text-gray-400">
        {total.toLocaleString()} declassified documents indexed. Showing the
        most recently ingested records below — to explore a focused subset,
        pick a collection.
      </p>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
          Jump to a collection
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {topics.map((t) => (
            <Link
              key={t.slug}
              href={`/topics/${t.slug}/`}
              className="rounded-full border border-gray-800 bg-gray-900/60 px-3 py-1 text-xs text-gray-300 hover:border-red-800 hover:text-white"
            >
              {t.name}
              <span className="ml-2 font-mono text-[10px] text-red-500">
                {t.doc_count.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-200">Recent documents</h2>
        <ul className="mt-4 divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/40">
          {docs.map((d) => (
            <li key={d.slug} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href={`/documents/${d.slug}/`}
                className="flex-1 text-sm text-gray-200 hover:text-white truncate font-mono"
              >
                {d.title}
              </Link>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {d.topic_slug ? (
                  <Link
                    href={`/topics/${d.topic_slug}/`}
                    className="font-mono uppercase tracking-widest text-gray-400 hover:text-gray-200"
                  >
                    {d.topic_slug}
                  </Link>
                ) : null}
                {d.pdf_url ? (
                  <a
                    href={d.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono uppercase tracking-widest text-red-400 hover:text-red-300"
                  >
                    PDF ↗
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
