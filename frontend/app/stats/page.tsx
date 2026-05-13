import Link from 'next/link';
import type { Metadata } from 'next';
import { getStats } from '../lib/api';
import { breadcrumbJsonLd, jsonLdString } from '../lib/jsonLd';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Archive stats',
  description:
    'Live stats for the BlackVaultDocs archive — per-collection counts, per-source breakdown, and the latest ingestion runs.',
  alternates: { canonical: '/stats/' },
};

export default async function StatsPage() {
  const stats = await getStats();
  const totals = [
    { label: 'Documents', value: stats?.total_documents ?? 0 },
    { label: 'Collections', value: stats?.total_topics ?? 0 },
    { label: 'Agencies', value: stats?.total_agencies ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> // stats
      </nav>

      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">
        Archive stats
      </h1>
      <p className="mt-3 max-w-2xl text-gray-400">
        Live counts pulled from the BlackVaultDocs API. Every document has a
        canonical URL under <code className="font-mono text-gray-200">/documents/</code>,
        a collection tag, and a source agency — use the tables below as a map
        into the corpus.
      </p>

      <section className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {totals.map((t) => (
          <div key={t.label} className="rounded-md border border-gray-800 bg-gray-900/60 p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
              {t.label}
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-100">
              {t.value.toLocaleString()}
            </div>
          </div>
        ))}
        {stats?.last_scrape?.finished_at ? (
          <div className="rounded-md border border-gray-800 bg-gray-900/60 p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
              Last refreshed
            </div>
            <div className="mt-1 font-mono text-sm text-gray-100">
              {formatDate(stats.last_scrape.finished_at)}
            </div>
          </div>
        ) : null}
      </section>

      {stats?.by_topic?.length ? (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-gray-200">Documents by collection</h2>
          <div className="mt-4 overflow-hidden rounded-md border border-gray-800">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Document counts by collection, with source agency and total document count.
              </caption>
              <thead className="bg-gray-900/60 text-[10px] uppercase tracking-widest text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-mono">Collection</th>
                  <th scope="col" className="px-4 py-2 text-left font-mono">Slug</th>
                  <th scope="col" className="px-4 py-2 text-left font-mono">Agency</th>
                  <th scope="col" className="px-4 py-2 text-right font-mono">Documents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-950">
                {stats.by_topic.map((t) => (
                  <tr key={t.slug}>
                    <th scope="row" className="px-4 py-2 text-left font-normal text-gray-200">
                      <Link href={`/topics/${t.slug}/`} className="hover:text-white">
                        {t.name}
                      </Link>
                    </th>
                    <td className="px-4 py-2 font-mono text-gray-500">{t.slug}</td>
                    <td className="px-4 py-2 font-mono text-gray-400">
                      {t.agency_slug ? (
                        <Link href={`/agencies/${t.agency_slug}/`} className="hover:text-white">
                          {t.agency_slug}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-red-400">
                      {t.doc_count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {stats?.by_source?.length ? (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-gray-200">Documents by source</h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-3">
            {stats.by_source.map((s) => (
              <li
                key={s.source}
                className="flex items-baseline justify-between rounded-md border border-gray-800 bg-gray-900/40 px-4 py-3 text-sm"
              >
                <span className="font-mono text-gray-300">{s.source}</span>
                <span className="font-mono text-red-400">{s.doc_count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {stats?.recent_scrapes?.length ? (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-gray-200">Recent ingestion runs</h2>
          <div className="mt-4 overflow-hidden rounded-md border border-gray-800">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Recent ingestion runs by source, including status, document counts, and timestamps.
              </caption>
              <thead className="bg-gray-900/60 text-[10px] uppercase tracking-widest text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-mono">Source</th>
                  <th scope="col" className="px-4 py-2 text-left font-mono">Status</th>
                  <th scope="col" className="px-4 py-2 text-right font-mono">Added</th>
                  <th scope="col" className="px-4 py-2 text-right font-mono">Seen</th>
                  <th scope="col" className="px-4 py-2 text-left font-mono">Started</th>
                  <th scope="col" className="px-4 py-2 text-left font-mono">Finished</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 bg-gray-950">
                {stats.recent_scrapes.map((s) => (
                  <tr key={s.id}>
                    <th scope="row" className="px-4 py-2 text-left font-mono font-normal text-gray-300">{s.source}</th>
                    <td className="px-4 py-2 font-mono text-gray-400">{s.status}</td>
                    <td className="px-4 py-2 text-right font-mono text-red-400">
                      {s.rows_added.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-gray-400">
                      {s.rows_seen.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-mono text-gray-500">{formatDate(s.started_at)}</td>
                    <td className="px-4 py-2 font-mono text-gray-500">
                      {s.finished_at ? formatDate(s.finished_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {stats?.recently_indexed?.length ? (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-gray-200">Recently indexed</h2>
          <ul className="mt-4 divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/40">
            {stats.recently_indexed.map((d) => (
              <li key={d.slug} className="flex items-center gap-4 px-4 py-3">
                <Link
                  href={`/documents/${d.slug}/`}
                  className="flex-1 truncate font-mono text-sm text-gray-200 hover:text-white"
                >
                  {d.title}
                </Link>
                <span className="font-mono text-xs text-gray-500">{formatDate(d.scraped_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Archive stats', path: '/stats/' },
            ]),
          ),
        }}
      />
    </div>
  );
}

function formatDate(s: string): string {
  try {
    return new Date(s.replace(' ', 'T') + 'Z').toISOString().slice(0, 16).replace('T', ' ');
  } catch {
    return s.slice(0, 16);
  }
}
