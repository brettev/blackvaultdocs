import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTopic, listTopics } from '../../../../lib/api';
import { breadcrumbJsonLd, jsonLdString } from '../../../../lib/jsonLd';

export const dynamic = 'force-static';
export const dynamicParams = false;

const DOCS_PER_PAGE = 100;

type Params = { slug: string; page: string };

export async function generateStaticParams(): Promise<Params[]> {
  const topics = await listTopics(500);
  const all: Params[] = [];
  for (const t of topics) {
    const pages = Math.ceil((t.doc_count || 0) / DOCS_PER_PAGE);
    // Page 1 lives at /topics/<slug>/ — skip it here.
    for (let p = 2; p <= pages; p++) {
      all.push({ slug: t.slug, page: String(p) });
    }
  }
  return all;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, page } = await params;
  const n = Number(page);
  const res = await getTopic(slug, { page: n, limit: DOCS_PER_PAGE });
  if (!res) return { title: 'Collection not found' };
  const { topic } = res;
  const pages = res.pages ?? Math.max(1, Math.ceil((topic.doc_count || 0) / DOCS_PER_PAGE));
  return {
    title: `${topic.name} — Page ${n} of ${pages}`,
    description:
      `Documents ${((n - 1) * DOCS_PER_PAGE + 1).toLocaleString()}–${Math.min(n * DOCS_PER_PAGE, topic.doc_count).toLocaleString()} of ${topic.doc_count.toLocaleString()} in the ${topic.name} collection — indexed from archives.gov.`,
    alternates: { canonical: `/topics/${topic.slug}/page/${n}/` },
    robots: n > 1 ? { index: true, follow: true } : undefined,
  };
}

export default async function TopicPageN({ params }: { params: Promise<Params> }) {
  const { slug, page } = await params;
  const n = Number(page);
  if (!Number.isFinite(n) || n < 2) notFound();
  const res = await getTopic(slug, { page: n, limit: DOCS_PER_PAGE });
  if (!res) notFound();
  const { topic, documents } = res;
  const pages = res.pages ?? Math.max(1, Math.ceil((topic.doc_count || 0) / DOCS_PER_PAGE));
  if (n > pages) notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Collections', path: '/topics/' },
    { name: topic.name, path: `/topics/${topic.slug}/` },
    { name: `Page ${n}`, path: `/topics/${topic.slug}/page/${n}/` },
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <nav className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> /{' '}
        <Link href="/topics/" className="hover:text-gray-300">collections</Link> /{' '}
        <Link href={`/topics/${topic.slug}/`} className="hover:text-gray-300">
          {topic.slug}
        </Link>{' '}
        / <span className="text-gray-300">page {n}</span>
      </nav>

      <header className="mt-4 border-b border-gray-800 pb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
          {topic.name}
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Page {n} of {pages.toLocaleString()} · showing{' '}
          {documents.length.toLocaleString()} of{' '}
          {topic.doc_count.toLocaleString()} documents.
        </p>
      </header>

      <section className="mt-6">
        <ul className="divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/40">
          {documents.map((d) => (
            <li key={d.slug} className="flex items-center gap-4 px-4 py-3">
              <Link
                href={`/documents/${d.slug}/`}
                className="flex-1 truncate font-mono text-sm text-gray-200 hover:text-white"
              >
                {d.title}
              </Link>
              {d.pdf_url ? (
                <a
                  href={d.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs uppercase tracking-widest text-red-400 hover:text-red-300"
                >
                  PDF ↗
                </a>
              ) : null}
            </li>
          ))}
        </ul>

        <TopicPagination slug={topic.slug} current={n} pages={pages} />
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }}
      />
    </main>
  );
}

function TopicPagination({ slug, current, pages }: { slug: string; current: number; pages: number }) {
  const window = paginationWindow(current, pages);
  const hrefFor = (p: number) => (p === 1 ? `/topics/${slug}/` : `/topics/${slug}/page/${p}/`);
  return (
    <nav className="mt-6 flex items-center justify-between gap-4 text-xs font-mono uppercase tracking-widest text-gray-400">
      <div>
        {current > 1 ? (
          <Link
            href={hrefFor(current - 1)}
            className="rounded border border-gray-800 bg-gray-900/40 px-3 py-1 hover:border-red-800 hover:text-white"
          >
            ← prev
          </Link>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {window.map((p, i) =>
          p === '…' ? (
            <span key={`e-${i}`} className="px-2 text-gray-600">
              …
            </span>
          ) : p === current ? (
            <span
              key={p}
              className="rounded border border-red-700 bg-red-900/30 px-3 py-1 text-white"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={hrefFor(p)}
              className="rounded border border-gray-800 bg-gray-900/40 px-3 py-1 hover:border-red-800 hover:text-white"
            >
              {p}
            </Link>
          ),
        )}
      </div>
      <div>
        {current < pages ? (
          <Link
            href={hrefFor(current + 1)}
            className="rounded border border-gray-800 bg-gray-900/40 px-3 py-1 hover:border-red-800 hover:text-white"
          >
            next →
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

function paginationWindow(current: number, total: number): Array<number | '…'> {
  const out: Array<number | '…'> = [];
  const add = (x: number | '…') => {
    if (out[out.length - 1] !== x) out.push(x);
  };
  const isLow = current <= 4;
  const isHigh = current >= total - 3;
  add(1);
  if (!isLow) add('…');
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);
  for (let p = start; p <= end; p++) add(p);
  if (!isHigh) add('…');
  if (total > 1) add(total);
  return out;
}
