import Link from 'next/link';
import type { Metadata } from 'next';
import { getStats, listTopics } from './lib/api';
import { breadcrumbJsonLd, jsonLdString } from './lib/jsonLd';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

function slugYear(slug: string): string | null {
  const m = slug.match(/-(\d{4})$/);
  return m ? m[1] : null;
}

export default async function Home() {
  const [stats, topics] = await Promise.all([getStats(), listTopics(500)]);
  const topTopics = topics.slice(0, 6);
  const recent = stats?.recently_indexed?.slice(0, 8) ?? [];

  const yearTotals = new Map<string, number>();
  for (const t of topics) {
    const y = slugYear(t.slug);
    if (!y) continue;
    yearTotals.set(y, (yearTotals.get(y) ?? 0) + (t.doc_count ?? 0));
  }
  const years = [...yearTotals.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const breadcrumb = breadcrumbJsonLd([{ name: 'Home', path: '/' }]);

  return (
    <div>
      <section className="border-b border-gray-900 bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-red-500">
            Declassified. Indexed. Searchable.
          </p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-white md:text-6xl">
            The black vault, structured.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-gray-300">
            BlackVaultDocs is a machine-readable index of declassified US
            government records — JFK, RFK, MLK, and other FOIA-released
            collections. Every document links directly to the original PDF at
            the National Archives, with structured metadata so researchers,
            journalists, and LLMs can reason over the full corpus.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Documents" value={stats?.total_documents ?? 0} />
            <StatTile label="Collections" value={stats?.total_topics ?? 0} />
            <StatTile label="Agencies" value={stats?.total_agencies ?? 0} />
            <StatTile
              label="Last updated"
              value={stats?.last_scrape?.finished_at ? formatDate(stats.last_scrape.finished_at) : '—'}
              mono
            />
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/topics/"
              className="inline-flex items-center rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
            >
              Browse collections →
            </Link>
            <Link
              href="/search/"
              className="inline-flex items-center rounded-md border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 hover:border-gray-500 hover:text-white"
            >
              Search the archive
            </Link>
            <Link
              href="/years/"
              className="inline-flex items-center rounded-md border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 hover:border-gray-500 hover:text-white"
            >
              Browse by year
            </Link>
            <Link
              href="/stats/"
              className="inline-flex items-center rounded-md border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 hover:border-gray-500 hover:text-white"
            >
              Archive stats
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-white">Featured collections</h2>
          <Link href="/topics/" className="text-sm text-gray-400 hover:text-gray-100">
            All collections →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topTopics.map((t) => (
            <Link
              key={t.slug}
              href={`/topics/${t.slug}/`}
              className="group rounded-lg border border-gray-800 bg-gray-900/50 p-5 hover:border-red-800 hover:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-gray-100 group-hover:text-white">
                  {t.name}
                </h3>
                <span className="font-mono text-xs text-red-500">
                  {t.doc_count.toLocaleString()}
                </span>
              </div>
              {t.description ? (
                <p className="mt-2 line-clamp-3 text-sm text-gray-400">
                  {t.description}
                </p>
              ) : null}
              <div className="mt-4 text-xs font-mono uppercase tracking-widest text-gray-500">
                {t.agency_slug ?? 'unclassified'} //
              </div>
            </Link>
          ))}
        </div>
      </section>

      {years.length > 0 ? (
        <section className="border-t border-gray-900">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-white">Browse by release year</h2>
              <Link href="/years/" className="text-sm text-gray-400 hover:text-gray-100">
                All years →
              </Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 md:grid-cols-5">
              {years.map(([y, n]) => (
                <Link
                  key={y}
                  href={`/years/${y}/`}
                  className="group rounded-lg border border-gray-800 bg-gray-900/50 p-4 hover:border-red-800 hover:bg-gray-900"
                >
                  <div className="text-2xl font-extrabold text-white group-hover:text-white">
                    {y}
                  </div>
                  <div className="mt-1 text-xs font-mono uppercase tracking-widest text-red-500">
                    {n.toLocaleString()} docs
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="border-t border-gray-900">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-white">Recently indexed</h2>
              <Link href="/stats/" className="text-sm text-gray-400 hover:text-gray-100">
                Archive stats →
              </Link>
            </div>
            <ul className="mt-6 divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/40">
              {recent.map((d) => (
                <li key={d.slug} className="flex items-center gap-4 px-4 py-3">
                  <Link
                    href={`/documents/${d.slug}/`}
                    className="flex-1 truncate font-mono text-sm text-gray-200 hover:text-white"
                  >
                    {d.title}
                  </Link>
                  {d.topic_slug ? (
                    <Link
                      href={`/topics/${d.topic_slug}/`}
                      className="font-mono text-xs uppercase tracking-widest text-gray-500 hover:text-gray-300"
                    >
                      {d.topic_slug}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }}
      />

      <section className="border-t border-gray-900 bg-gray-900/40">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-bold text-white">Why this archive exists</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-3 text-sm text-gray-400">
            <div>
              <h3 className="text-gray-200 font-semibold">Structured, not scanned</h3>
              <p className="mt-2">
                Every PDF has a canonical slug, source URL, agency, and
                collection tag — so queries beat keyword search on the
                originating release pages.
              </p>
            </div>
            <div>
              <h3 className="text-gray-200 font-semibold">Original sources only</h3>
              <p className="mt-2">
                We link directly to the PDFs hosted by the National Archives.
                No re-uploads, no mirrors — you always see the primary source.
              </p>
            </div>
            <div>
              <h3 className="text-gray-200 font-semibold">Built for discovery</h3>
              <p className="mt-2">
                Fast, static pages crawlable by humans and LLMs. Use the
                collection and agency indexes as your jumping-off points.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value, mono = false }: { label: string; value: number | string; mono?: boolean }) {
  const display = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <div className="rounded-md border border-gray-800 bg-gray-900/60 p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold text-gray-100 ${mono ? 'font-mono text-lg' : ''}`}>
        {display}
      </div>
    </div>
  );
}

function formatDate(s: string): string {
  try {
    return new Date(s.replace(' ', 'T') + 'Z').toISOString().slice(0, 10);
  } catch {
    return s.slice(0, 10);
  }
}
