import Link from 'next/link';
import type { Metadata } from 'next';
import { listTopics } from '../lib/api';
import { breadcrumbJsonLd, jsonLdString, SITE_URL } from '../lib/jsonLd';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Release years',
  description:
    'Browse declassified US government document releases by the year they were published at the National Archives.',
  alternates: { canonical: '/years/' },
};

function slugYear(slug: string): string | null {
  const m = slug.match(/-(\d{4})$/);
  return m ? m[1] : null;
}

export default async function YearsIndexPage() {
  const topics = await listTopics(500);
  const byYear = new Map<string, number>();
  const topicsByYear = new Map<string, number>();
  for (const t of topics) {
    const y = slugYear(t.slug);
    if (!y) continue;
    byYear.set(y, (byYear.get(y) ?? 0) + (t.doc_count ?? 0));
    topicsByYear.set(y, (topicsByYear.get(y) ?? 0) + 1);
  }
  const years = [...byYear.keys()].sort().reverse();

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Release years', path: '/years/' },
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> // years
      </nav>

      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">
        Browse by release year
      </h1>
      <p className="mt-3 max-w-2xl text-gray-400">
        Every declassification release indexed by BlackVaultDocs, grouped by
        the calendar year the National Archives published it. Click a year to
        see all collections in that release cycle.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {years.map((y) => (
          <Link
            key={y}
            href={`/years/${y}/`}
            className="group rounded-lg border border-gray-800 bg-gray-900/50 p-5 hover:border-red-800 hover:bg-gray-900"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-3xl font-extrabold text-white">{y}</h2>
              <span className="font-mono text-xs uppercase tracking-widest text-red-500">
                {(byYear.get(y) ?? 0).toLocaleString()} docs
              </span>
            </div>
            <div className="mt-3 text-xs font-mono uppercase tracking-widest text-gray-400">
              {topicsByYear.get(y)} collection{topicsByYear.get(y) === 1 ? '' : 's'}
            </div>
          </Link>
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': `${SITE_URL}/years/`,
            url: `${SITE_URL}/years/`,
            name: 'Release years',
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: years.map((y, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                url: `${SITE_URL}/years/${y}/`,
                name: `${y} declassification releases`,
              })),
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }}
      />
    </div>
  );
}
