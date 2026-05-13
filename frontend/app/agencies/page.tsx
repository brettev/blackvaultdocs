import Link from 'next/link';
import type { Metadata } from 'next';
import { listAgencies } from '../lib/api';
import { breadcrumbJsonLd, jsonLdString } from '../lib/jsonLd';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Agencies',
  description:
    'Federal agencies whose declassified documents are indexed by BlackVaultDocs.',
  alternates: { canonical: '/agencies/' },
};

export default async function AgenciesIndexPage() {
  const agencies = await listAgencies();
  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Agencies', path: '/agencies/' },
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> // agencies
      </nav>

      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">
        Agencies
      </h1>
      <p className="mt-3 max-w-2xl text-gray-400">
        Federal agencies whose declassified records are represented in the
        archive. New sources will be added as additional collections go
        through ingestion.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {agencies.map((a) => (
          <Link
            key={a.slug}
            href={`/agencies/${a.slug}/`}
            className="group rounded-lg border border-gray-800 bg-gray-900/50 p-5 hover:border-red-800 hover:bg-gray-900"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-100 group-hover:text-white">
                {a.name}
              </h2>
              <span className="font-mono text-xs shrink-0 text-red-500">
                {a.doc_count.toLocaleString()} docs
              </span>
            </div>
            {a.description ? (
              <p className="mt-2 line-clamp-3 text-sm text-gray-400">{a.description}</p>
            ) : null}
          </Link>
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }}
      />
    </div>
  );
}
