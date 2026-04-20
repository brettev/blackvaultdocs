import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDocument, listAllDocumentSlugs } from '../../lib/api';

export const dynamic = 'force-static';
export const dynamicParams = false;

// Static-generation cap: we prebuild one HTML page per document. This is the
// biggest lever on build time / bundle size, so it's tuned per-environment
// via MAX_STATIC_DOCS (set by CI for reduced builds).
const MAX_STATIC_DOCS = Number(process.env.MAX_STATIC_DOCS ?? 20000);

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await listAllDocumentSlugs({ max: MAX_STATIC_DOCS, pageSize: 200 });
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await getDocument(slug);
  if (!res) return { title: 'Document not found' };
  const { document: doc, topic, agency } = res;
  const collectionLabel = topic?.name ?? 'National Archives';
  return {
    title: `${doc.title} · ${collectionLabel}`,
    description: `Declassified ${collectionLabel} document ${doc.title}${agency ? ` — released by ${agency.name}` : ''}. Indexed by BlackVaultDocs; original PDF hosted at the source archive.`,
    alternates: { canonical: `/documents/${doc.slug}/` },
    openGraph: {
      title: doc.title,
      description: `Declassified document from the ${collectionLabel} release.`,
      type: 'article',
    },
  };
}

export default async function DocumentDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const res = await getDocument(slug);
  if (!res) notFound();
  const { document: doc, topic, agency } = res;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <nav className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> /{' '}
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

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
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
          <p className="mt-2 text-sm text-gray-300 break-all font-mono">{doc.pdf_url}</p>
          <a
            href={doc.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            Open PDF at source ↗
          </a>
        </div>
      ) : null}

      <dl className="mt-8 grid gap-3 rounded-md border border-gray-800 bg-gray-900/40 p-5 text-sm md:grid-cols-2">
        <MetaRow label="NARA ID" value={doc.external_id} />
        <MetaRow label="Source" value={doc.source} />
        {topic ? <MetaRow label="Collection" value={topic.name} /> : null}
        {agency ? <MetaRow label="Agency" value={agency.name} /> : null}
        {doc.classification ? <MetaRow label="Classification" value={doc.classification} /> : null}
        {doc.released_at ? <MetaRow label="Released" value={doc.released_at} /> : null}
        {doc.page_count ? <MetaRow label="Pages" value={String(doc.page_count)} /> : null}
        {doc.file_size_bytes ? <MetaRow label="Size" value={formatBytes(doc.file_size_bytes)} /> : null}
        <MetaRow label="Indexed" value={doc.scraped_at} />
      </dl>

      {topic?.description ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
            About the {topic.name} collection
          </h2>
          <p className="mt-2 text-sm text-gray-300">{topic.description}</p>
          <p className="mt-3">
            <Link
              href={`/topics/${topic.slug}/`}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Browse other documents in this collection →
            </Link>
          </p>
        </section>
      ) : null}
    </main>
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
