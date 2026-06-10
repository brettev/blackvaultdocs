import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTopic } from '../../lib/api';
import { breadcrumbJsonLd, jsonLdString, SITE_URL } from '../../lib/jsonLd';
import {
  buildGenericTopicFaqs,
  faqPageJsonLd,
  getTopicFaqs,
} from '../../lib/topicFaqs';
import { buildTopicMetadata } from '../../lib/topicSeo';
import { findFigure } from '../../lib/figures';
import { findVirtualTopic } from '../../lib/virtualTopics';

// Page 1 is `/topics/<slug>/`. Further pages live under
// `/topics/<slug>/page/<n>/` so the main URL stays canonical.

type Params = { slug: string };

const DOCS_PER_PAGE = 100;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await getTopic(slug, { page: 1, limit: DOCS_PER_PAGE });
  if (!res) return { title: 'Collection not found' };
  const { topic } = res;
  const yearMatch = topic.slug.match(/-(\d{4})$/);
  const releaseYear = yearMatch ? yearMatch[1] : null;
  const meta = buildTopicMetadata(topic, releaseYear);
  if (topic.doc_count === 0) {
    return { ...meta, robots: { index: false, follow: true } };
  }
  return meta;
}

export default async function TopicDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const res = await getTopic(slug, { page: 1, limit: DOCS_PER_PAGE });
  if (!res) notFound();
  const { topic, documents } = res;
  const pages = res.pages ?? Math.max(1, Math.ceil((topic.doc_count || documents.length) / DOCS_PER_PAGE));
  const virtual = findVirtualTopic(topic.slug);

  const yearMatch = topic.slug.match(/-(\d{4})$/);
  const releaseYear = yearMatch ? yearMatch[1] : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/topics/${topic.slug}/`,
    url: `${SITE_URL}/topics/${topic.slug}/`,
    name: topic.name,
    description: topic.description,
    isPartOf: {
      '@type': 'WebSite',
      name: 'BlackVaultDocs',
      url: `${SITE_URL}/`,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: topic.doc_count,
      itemListElement: documents.slice(0, 25).map((d, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${SITE_URL}/documents/${d.slug}/`,
        name: d.title,
      })),
    },
  };

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Collections', path: '/topics/' },
    { name: topic.name, path: `/topics/${topic.slug}/` },
  ]);

  const faqs =
    getTopicFaqs(topic.slug) ??
    buildGenericTopicFaqs({
      topicName: topic.name,
      docCount: topic.doc_count,
      agencyLabel: topic.agency_slug === 'nara'
        ? 'the National Archives'
        : topic.agency_slug === 'doj-oig'
          ? 'the DOJ Office of the Inspector General'
          : 'the originating agency',
      releaseYear,
    });
  const faqJsonLd = faqPageJsonLd(faqs);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-xs font-mono uppercase tracking-widest text-gray-500">
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
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-400">
          {topic.agency_slug ? (
            <span>
              Source agency:{' '}
              <Link
                href={`/agencies/${topic.agency_slug}/`}
                className="font-mono text-red-400 hover:text-red-300"
              >
                {topic.agency_slug}
              </Link>
            </span>
          ) : null}
          {releaseYear ? (
            <span>
              Release year:{' '}
              <Link
                href={`/years/${releaseYear}/`}
                className="font-mono text-red-400 hover:text-red-300"
              >
                {releaseYear}
              </Link>
            </span>
          ) : null}
        </div>
        {topic.description ? (
          <p className="mt-4 max-w-3xl text-gray-300">{topic.description}</p>
        ) : null}
        {virtual?.relatedFigures?.length || virtual?.relatedTopics?.length ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {virtual.relatedFigures?.map((figSlug) => {
              const fig = findFigure(figSlug);
              return fig ? (
                <Link
                  key={figSlug}
                  href={`/figures/${figSlug}/`}
                  className="rounded-md border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:border-gray-500"
                >
                  {fig.name} →
                </Link>
              ) : null;
            })}
            {virtual.relatedTopics?.map((topicSlug) => (
              <Link
                key={topicSlug}
                href={`/topics/${topicSlug}/`}
                className="rounded-md border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:border-gray-500"
              >
                {topicSlug} release →
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-gray-200">
            Documents — page 1 of {pages.toLocaleString()}
          </h2>
          <span className="text-xs text-gray-500 font-mono">
            {documents.length.toLocaleString()} shown
          </span>
        </div>
        <ul className="mt-4 divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/40">
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

        {pages > 1 ? (
          <TopicPagination slug={topic.slug} current={1} pages={pages} />
        ) : null}
      </section>

      <section className="mt-12 rounded-md border border-gray-800 bg-gray-900/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
          About this collection
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          {virtual?.about ??
            `Documents in the ${topic.name} collection were released by the National Archives as part of ongoing declassification programs. Each file retains its original NARA Record Identification Number so it can be cross-referenced against academic and journalistic citations. Use the pagination below to walk the full ${topic.doc_count.toLocaleString()}-record list, or jump to any individual document for metadata and an in-browser PDF preview.`}
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-gray-200">
          Frequently asked questions
        </h2>
        <div className="mt-4 divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/40">
          {faqs.map((f, i) => (
            <details
              key={i}
              className="group px-5 py-4 open:bg-gray-900/70"
              {...(i === 0 ? { open: true } : {})}
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-gray-200 group-open:text-white">
                {f.question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-gray-300">
                {f.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd) }}
      />
    </div>
  );
}

function TopicPagination({ slug, current, pages }: { slug: string; current: number; pages: number }) {
  const window = paginationWindow(current, pages);
  return (
    <nav aria-label="Collection pagination" className="mt-6 flex items-center justify-between gap-4 text-xs font-mono uppercase tracking-widest text-gray-400">
      <div>
        {current > 1 ? (
          <Link
            href={current === 2 ? `/topics/${slug}/` : `/topics/${slug}/page/${current - 1}/`}
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
              href={p === 1 ? `/topics/${slug}/` : `/topics/${slug}/page/${p}/`}
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
            href={`/topics/${slug}/page/${current + 1}/`}
            className="rounded border border-gray-800 bg-gray-900/40 px-3 py-1 hover:border-red-800 hover:text-white"
          >
            next →
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

// Returns a compact pagination window: [1, '…', 4, 5, 6, '…', 42]
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
