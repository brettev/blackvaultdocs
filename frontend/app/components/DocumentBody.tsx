import Link from 'next/link';
import { breadcrumbJsonLd, jsonLdString } from '../lib/jsonLd';
import type { DocumentDetail } from '../lib/api';

type Topic = {
  slug: string;
  name: string;
  description: string | null;
  doc_count: number;
};

type Agency = { slug: string; name: string };
type Neighbour = { slug: string; title: string } | null;
type Related = { slug: string; title: string };

interface Props {
  doc: DocumentDetail;
  topic: Topic | null;
  agency: Agency | null;
  prev: Neighbour;
  next: Neighbour;
  related: Related[];
}

// Pure presentational body for a single declassified document. Used by
// both the SSG page (top 20k docs baked in at build time) and the CSR
// fallback (`app/documents/dynamic/page.tsx`) so crawlers see pixel-
// identical HTML regardless of which path served the page.
export default function DocumentBody({
  doc,
  topic,
  agency,
  prev,
  next,
  related,
}: Props) {
  const naraId = doc.external_id?.replace(/^\//, '').replace(/\.pdf$/i, '') ?? null;
  const jsonLd = buildJsonLd({ doc, topic, agency });
  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Documents', path: '/documents/' },
    ...(topic ? [{ name: topic.name, path: `/topics/${topic.slug}/` }] : []),
    { name: doc.title, path: `/documents/${doc.slug}/` },
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link>
        {' / '}
        <Link href="/documents/" className="hover:text-gray-300">documents</Link>
        {topic ? (
          <>
            {' / '}
            <Link href={`/topics/${topic.slug}/`} className="hover:text-gray-300">
              {topic.slug}
            </Link>
          </>
        ) : null}
      </nav>

      <h1 className="mt-4 break-words text-3xl font-extrabold tracking-tight text-white md:text-4xl font-mono">
        {doc.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
        {topic ? (
          <Link
            href={`/topics/${topic.slug}/`}
            className="rounded-full border border-gray-800 bg-gray-900/60 px-3 py-1 font-mono uppercase tracking-widest hover:border-red-800 hover:text-white"
          >
            {topic.name}
          </Link>
        ) : null}
        {agency ? (
          <Link
            href={`/agencies/${agency.slug}/`}
            className="rounded-full border border-gray-800 bg-gray-900/60 px-3 py-1 font-mono uppercase tracking-widest hover:border-red-800 hover:text-white"
          >
            {agency.name}
          </Link>
        ) : null}
        <span className="font-mono uppercase tracking-widest text-gray-500">
          src: {doc.source}
        </span>
      </div>

      {doc.pdf_url ? (
        <div className="mt-8 rounded-md border border-gray-800 bg-gray-900/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
            Original document
          </h2>
          <p className="mt-2 break-all font-mono text-sm text-gray-300">{doc.pdf_url}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={doc.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              Open PDF at source ↗
            </a>
            <a
              href={doc.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:border-gray-500 hover:text-white"
            >
              View release page ↗
            </a>
            {naraId ? (
              <a
                href={`https://catalog.archives.gov/search?q=${encodeURIComponent(naraId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:border-gray-500 hover:text-white"
              >
                NARA catalog search ↗
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <dl className="mt-8 grid gap-3 rounded-md border border-gray-800 bg-gray-900/40 p-5 text-sm md:grid-cols-2">
        {naraId ? <MetaRow label="NARA ID" value={naraId} /> : null}
        <MetaRow label="Source" value={doc.source} />
        {topic ? <MetaRow label="Collection" value={topic.name} /> : null}
        {agency ? <MetaRow label="Agency" value={agency.name} /> : null}
        {doc.classification ? (
          <MetaRow label="Classification" value={doc.classification} />
        ) : null}
        {doc.released_at ? <MetaRow label="Released" value={doc.released_at} /> : null}
        {doc.page_count ? <MetaRow label="Pages" value={String(doc.page_count)} /> : null}
        {doc.file_size_bytes ? (
          <MetaRow label="Size" value={formatBytes(doc.file_size_bytes)} />
        ) : null}
        <MetaRow label="Slug" value={doc.slug} />
        <MetaRow label="Indexed" value={doc.scraped_at} />
      </dl>

      {doc.pdf_url ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
            In-browser preview
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            Streamed from archives.gov. If the preview fails to load, use
            the &quot;Open PDF at source&quot; button above.
          </p>
          <div className="mt-3 overflow-hidden rounded-md border border-gray-800 bg-gray-900">
            <object
              data={doc.pdf_url}
              type="application/pdf"
              className="h-[70vh] w-full"
              aria-label={`PDF preview of ${doc.title}`}
            >
              <div className="p-6 text-sm text-gray-400">
                Your browser can&apos;t preview PDFs inline.{' '}
                <a
                  href={doc.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300"
                >
                  Open the PDF at archives.gov ↗
                </a>
              </div>
            </object>
          </div>
        </section>
      ) : null}

      {(prev || next) && topic ? (
        <nav aria-label={`Previous and next document in ${topic.slug}`} className="mt-12 flex flex-col gap-3 border-t border-gray-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {prev ? (
            <Link
              href={`/documents/${prev.slug}/`}
              className="group rounded-md border border-gray-800 bg-gray-900/40 px-4 py-3 text-sm text-gray-300 hover:border-red-800 hover:text-white sm:max-w-[48%]"
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                ← Previous in {topic.slug}
              </div>
              <div className="mt-1 truncate font-mono">{prev.title}</div>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/documents/${next.slug}/`}
              className="group rounded-md border border-gray-800 bg-gray-900/40 px-4 py-3 text-right text-sm text-gray-300 hover:border-red-800 hover:text-white sm:max-w-[48%]"
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                Next in {topic.slug} →
              </div>
              <div className="mt-1 truncate font-mono">{next.title}</div>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      {related.length > 0 && topic ? (
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
            More from {topic.name}
          </h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/documents/${r.slug}/`}
                  className="block rounded-md border border-gray-800 bg-gray-900/40 px-3 py-2 font-mono text-xs text-gray-300 hover:border-red-800 hover:text-white truncate"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-gray-500">
            <Link
              href={`/topics/${topic.slug}/`}
              className="text-red-400 hover:text-red-300"
            >
              Browse all {topic.doc_count.toLocaleString()} documents in {topic.name} →
            </Link>
          </p>
        </section>
      ) : null}

      {topic?.description ? (
        <section className="mt-12 rounded-md border border-gray-800 bg-gray-900/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
            About the {topic.name} collection
          </h2>
          <p className="mt-2 text-sm text-gray-300">{topic.description}</p>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }}
      />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm text-gray-200 font-mono">{value}</dd>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type JsonLdInput = {
  doc: {
    slug: string;
    title: string;
    pdf_url: string | null;
    source_url: string;
    released_at: string | null;
    scraped_at: string;
    file_size_bytes: number | null;
    page_count: number | null;
  };
  topic: { slug: string; name: string } | null;
  agency: { slug: string; name: string } | null;
};

function buildJsonLd({ doc, topic, agency }: JsonLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    '@id': `https://blackvaultdocs.com/documents/${doc.slug}/`,
    name: doc.title,
    identifier: doc.slug,
    url: `https://blackvaultdocs.com/documents/${doc.slug}/`,
    contentUrl: doc.pdf_url ?? doc.source_url,
    encodingFormat: 'application/pdf',
    fileFormat: 'application/pdf',
    ...(doc.file_size_bytes ? { contentSize: String(doc.file_size_bytes) } : {}),
    ...(doc.page_count ? { numberOfPages: doc.page_count } : {}),
    ...(doc.released_at ? { datePublished: doc.released_at } : {}),
    dateCreated: doc.scraped_at,
    isPartOf: topic
      ? {
          '@type': 'Collection',
          name: topic.name,
          url: `https://blackvaultdocs.com/topics/${topic.slug}/`,
        }
      : undefined,
    publisher: agency
      ? {
          '@type': 'GovernmentOrganization',
          name: agency.name,
          url: `https://blackvaultdocs.com/agencies/${agency.slug}/`,
        }
      : {
          '@type': 'GovernmentOrganization',
          name: 'National Archives and Records Administration',
          url: 'https://www.archives.gov/',
        },
  };
}
