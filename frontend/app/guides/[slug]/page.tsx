import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AiCopyBlock from '../../components/AiCopyBlock';
import { isTieKind, listGuideCopy, loadAiCopyBySlug } from '../../lib/aiCopy';
import { SITE_URL, breadcrumbJsonLd, jsonLdString } from '../../lib/jsonLd';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listGuideCopy().map((x) => ({ slug: x.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const copy = loadAiCopyBySlug(slug);
  if (!copy || isTieKind(copy.kind)) return { title: 'Guide not found' };
  const canonical = `${SITE_URL}${copy.canonicalPath}`;
  return {
    title: copy.title,
    description: copy.metaDescription,
    alternates: { canonical },
    openGraph: { title: copy.title, description: copy.metaDescription, url: canonical },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const copy = loadAiCopyBySlug(slug);
  if (!copy || isTieKind(copy.kind)) notFound();
  const canonical = `${SITE_URL}${copy.canonicalPath}`;
  const crumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Guides', path: '/guides/' },
    { name: copy.h1, path: copy.canonicalPath },
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(crumbs) }} />
      <Link href="/guides/" className="text-sm text-gray-500 hover:text-gray-100 mb-6 inline-block">
        ← All guides
      </Link>
      <AiCopyBlock copy={copy} variant="full" />
    </div>
  );
}
