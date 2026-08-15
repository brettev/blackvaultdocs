import type { Metadata } from 'next';
import Link from 'next/link';
import { listTieCopy, loadAiCopyBySlug } from '../lib/aiCopy';
import { SITE_URL } from '../lib/jsonLd';

export const metadata: Metadata = {
  title: 'Archive Ties',
  description: 'Cross-collection relationships in declassified US government records indexed on BlackVaultDocs.',
  alternates: { canonical: `${SITE_URL}/ties/` },
};

export default function TiesIndexPage() {
  const items = listTieCopy().sort((a, b) => a.slug.localeCompare(b.slug));
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-100 mb-3">Archive ties</h1>
      <p className="text-gray-400 mb-10">
        Relationship pages that join figures, agencies, and collections. PDFs stay on the originating archive.
      </p>
      <p className="text-sm text-gray-500 mb-8">
        Collection explainers:{' '}
        <Link href="/guides/" className="text-red-400 hover:text-red-300">
          guides
        </Link>
      </p>
      {items.length === 0 ? (
        <p className="text-gray-500">Relationship pages will land here as collection joins are written.</p>
      ) : (
        <ul className="divide-y divide-gray-800">
          {items.map((item) => {
            const copy = loadAiCopyBySlug(item.slug);
            if (!copy) return null;
            return (
              <li key={item.slug} className="py-4">
                <Link href={copy.canonicalPath || `/ties/${item.slug}/`} className="text-gray-100 hover:text-red-400 font-medium">
                  {copy.h1 || copy.title}
                </Link>
                <p className="text-sm text-gray-500 mt-1">{copy.metaDescription}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
