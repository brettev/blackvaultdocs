import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDocument } from '../../lib/api';
import DocumentBody from '../../components/DocumentBody';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
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
