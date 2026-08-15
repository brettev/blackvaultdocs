import type { Metadata } from 'next';
import Link from 'next/link';
import { listGuideCopy, loadAiCopyBySlug } from '../lib/aiCopy';
import { SITE_URL } from '../lib/jsonLd';

export const metadata: Metadata = {
  title: 'Collection Guides',
  description: 'Explainers for declassified collections, figures, and agency reading rooms on BlackVaultDocs.',
  alternates: { canonical: `${SITE_URL}/guides/` },
};

export default function GuidesIndexPage() {
  const items = listGuideCopy().sort((a, b) => a.slug.localeCompare(b.slug));
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-100 mb-3">Collection guides</h1>
      <p className="text-gray-400 mb-10">
        Written context for NARA and FOIA collections indexed on BlackVaultDocs. PDFs stay on the originating archive.
      </p>
      <ul className="divide-y divide-gray-800">
        {items.map((item) => {
          const copy = loadAiCopyBySlug(item.slug);
          if (!copy) return null;
          return (
            <li key={item.slug} className="py-4">
              <Link href={copy.canonicalPath || `/guides/${item.slug}/`} className="text-gray-100 hover:text-red-400 font-medium">
                {copy.h1 || copy.title}
              </Link>
              <p className="text-sm text-gray-500 mt-1">{copy.metaDescription}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
