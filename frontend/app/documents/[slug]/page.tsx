import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDocument, listAllDocumentSlugs } from '../../lib/api';
import { STATIC_EXPORT_DOC_SLUG } from '../../lib/staticExportPlaceholder';
import DocumentBody from '../../components/DocumentBody';

export const dynamic = 'force-static';
export const dynamicParams = false;

// Static-generation cap: we prebuild one HTML page per document. This is the
// biggest lever on build time / bundle size, so it's tuned per-environment
// via MAX_STATIC_DOCS (set by CI for reduced builds). Anything above this
// cap (and any typo URLs that hit S3 with no matching key) gets routed by
// CloudFront 403/404 → /documents/dynamic/index.html (HTTP 200), which is a
// CSR fallback that fetches from api.blackvaultdocs.com or shows a
// noindex,nofollow soft-404 page.
const MAX_STATIC_DOCS = Number(process.env.MAX_STATIC_DOCS ?? 20000);

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await listAllDocumentSlugs({ max: MAX_STATIC_DOCS, pageSize: 500 });
  if (slugs.length === 0) return [{ slug: STATIC_EXPORT_DOC_SLUG }];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === STATIC_EXPORT_DOC_SLUG) return { title: 'Not found' };
  const res = await getDocument(slug);
  if (!res) return { title: 'Document not found' };
  const { document: doc, topic, agency } = res;
  const collectionLabel = topic?.name ?? 'National Archives';
  const agencyLabel = agency?.name ?? 'NARA';
  const description = [
    `Declassified ${collectionLabel} document "${doc.title}"`,
    `released by ${agencyLabel}`,
    doc.external_id ? `NARA record ${doc.external_id.replace(/^\//, '')}.` : null,
    'Indexed by BlackVaultDocs — original PDF hosted at archives.gov.',
  ]
    .filter(Boolean)
    .join(' ');
  return {
    title: `${doc.title} · ${collectionLabel}`,
    description,
    alternates: { canonical: `/documents/${doc.slug}/` },
    openGraph: {
      title: `${doc.title} — ${collectionLabel}`,
      description,
      type: 'article',
    },
  };
}

export default async function DocumentDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (slug === STATIC_EXPORT_DOC_SLUG) notFound();
  const res = await getDocument(slug);
  if (!res) notFound();
  return (
    <DocumentBody
      doc={res.document}
      topic={res.topic}
      agency={res.agency}
      prev={res.prev ?? null}
      next={res.next ?? null}
      related={res.related ?? []}
    />
  );
}
