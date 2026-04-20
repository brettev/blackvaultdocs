import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTopic, listDocuments, listTopics } from '../../lib/api';

export const dynamic = 'force-static';
export const dynamicParams = false;

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const topics = await listTopics(500);
  return topics.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await getTopic(slug);
  if (!res) return { title: 'Collection not found' };
  const { topic } = res;
  return {
    title: topic.name,
    description:
      topic.description ??
      `${topic.doc_count.toLocaleString()} declassified documents in the ${topic.name} collection — indexed from the National Archives.`,
    alternates: { canonical: `/topics/${topic.slug}/` },
    openGraph: {
      title: topic.name,
      description: topic.description ?? undefined,
      type: 'article',
    },
  };
}

const DOCS_PER_PAGE = 250;

export default async function TopicDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const res = await getTopic(slug);
  if (!res) notFound();
  const { topic } = res;

  // getTopic returns up to 200 docs. For a richer view, paginate the
  // /documents endpoint (up to 250 rows) which sorts by most-recent scrape.
  const docsRes = await listDocuments({ topic: slug, page: 1, limit: DOCS_PER_PAGE });
  const docs = docsRes?.data ?? res.documents ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <nav className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> /{' '}
        <Link href="/topics/" className="hover:text-gray-300">collections</Link> /{' '}
        <span className="text-gray-300">{topic.slug}</span>
      </nav>

      <header className="mt-4 border-b border-gray-800 pb-8">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            {topic.name}
          </h1>
          <span className="font-mono text-xs uppercase tracking-widest text-red-500">
            {topic.doc_count.toLocaleString()} documents
          </span>
        </div>
        {topic.agency_slug ? (
          <p className="mt-2 text-sm text-gray-400">
            Source agency:{' '}
            <Link
              href={`/agencies/${topic.agency_slug}/`}
              className="font-mono text-red-400 hover:text-red-300"
            >
              {topic.agency_slug}
            </Link>
          </p>
        ) : null}
        {topic.description ? (
          <p className="mt-4 max-w-3xl text-gray-300">{topic.description}</p>
        ) : null}
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-200">
          Documents ({docs.length.toLocaleString()}
          {topic.doc_count > docs.length ? ` of ${topic.doc_count.toLocaleString()}` : ''})
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Listing the first {DOCS_PER_PAGE} documents in this collection. Each
          row links to the original PDF at the National Archives.
        </p>
        <ul className="mt-6 divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/40">
          {docs.map((d) => (
            <li key={d.slug} className="flex items-center gap-4 px-4 py-3">
              <Link
                href={`/documents/${d.slug}/`}
                className="flex-1 text-sm text-gray-200 hover:text-white truncate font-mono"
              >
                {d.title}
              </Link>
              {d.pdf_url ? (
                <a
                  href={d.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono uppercase tracking-widest text-red-400 hover:text-red-300"
                >
                  PDF ↗
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-md border border-gray-800 bg-gray-900/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
          About this collection
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          Documents in the {topic.name} collection were released by the
          National Archives as part of ongoing declassification programs. Each
          file retains its original NARA Record Identification Number so it
          can be cross-referenced against academic and journalistic citations.
        </p>
      </section>
    </main>
  );
}
