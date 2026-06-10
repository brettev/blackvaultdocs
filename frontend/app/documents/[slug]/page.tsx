import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDocument } from '../../lib/api';
import { buildDocumentDescription, buildDocumentTitle } from '../../lib/documentSeo';
import DocumentBody from '../../components/DocumentBody';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await getDocument(slug);
  if (!res) return { title: 'Document not found' };
  const { document: doc, topic, agency } = res;
  const collectionLabel = topic?.name ?? 'National Archives';
  const agencyLabel = agency?.name ?? 'NARA';
  const title = buildDocumentTitle(doc, agencyLabel);
  const description = buildDocumentDescription(doc, collectionLabel, agencyLabel);
  return {
    title,
    description,
    alternates: { canonical: `/documents/${doc.slug}/` },
    openGraph: { title, description, type: 'article' },
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
