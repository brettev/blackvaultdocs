import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listTopics, getTopic } from '../../lib/api';
import { breadcrumbJsonLd, jsonLdString, SITE_URL } from '../../lib/jsonLd';

export const dynamic = 'force-static';
export const dynamicParams = false;

type Params = { year: string };

const YEAR_DESCRIPTIONS: Record<string, string> = {
  '2017':
    'The 2017–2018 JFK Records Act release, ordered by the White House in October 2017 after the 25-year delay under the President John F. Kennedy Assassination Records Collection Act of 1992 expired.',
  '2021':
    'The 2021 JFK Records Act release, published by the National Archives in December 2021 under President Biden — declassifying roughly 1,500 previously-withheld assassination records.',
  '2022':
    'The 2022 JFK Records Act release, a supplementary NARA disclosure following the October 2022 transparency order covering residual records identified for review.',
  '2023':
    'The 2023 JFK Records Act release, continuing the post-deadline review of assassination-era records withheld in prior declassification rounds.',
  '2025':
    'The 2025 release cycle — the largest declassification wave to date, covering JFK, RFK, and MLK assassination and surveillance records under a new transparency executive order.',
};

function slugYear(slug: string): string | null {
  const m = slug.match(/-(\d{4})$/);
  return m ? m[1] : null;
}

async function yearGroups(): Promise<Record<string, Array<{ slug: string; name: string; doc_count: number; agency_slug: string | null }>>> {
  const topics = await listTopics(500);
  const out: Record<string, Array<{ slug: string; name: string; doc_count: number; agency_slug: string | null }>> = {};
  for (const t of topics) {
    const y = slugYear(t.slug);
    if (!y) continue;
    (out[y] ||= []).push({
      slug: t.slug,
      name: t.name,
      doc_count: t.doc_count,
      agency_slug: t.agency_slug,
    });
  }
  return out;
}

export async function generateStaticParams(): Promise<Params[]> {
  const groups = await yearGroups();
  return Object.keys(groups).map((year) => ({ year }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { year } = await params;
  const groups = await yearGroups();
  const list = groups[year];
  if (!list?.length) return { title: `Release year ${year} not found` };
  const totalDocs = list.reduce((s, t) => s + (t.doc_count ?? 0), 0);
  return {
    title: `${year} declassification releases`,
    description:
      `${list.length} collection${list.length === 1 ? '' : 's'}, ${totalDocs.toLocaleString()} declassified documents — ${YEAR_DESCRIPTIONS[year] ?? `Documents released by the National Archives in ${year}.`}`,
    alternates: { canonical: `/years/${year}/` },
    openGraph: {
      title: `${year} declassification releases`,
      description: `${totalDocs.toLocaleString()} declassified documents across ${list.length} collections, published in ${year}.`,
      type: 'article',
    },
  };
}

export default async function YearPage({ params }: { params: Promise<Params> }) {
  const { year } = await params;
  const groups = await yearGroups();
  const list = groups[year];
  if (!list?.length) notFound();

  const totalDocs = list.reduce((s, t) => s + (t.doc_count ?? 0), 0);

  // Pull a few sample docs per collection so this page has real content
  // beyond the card grid.
  const samples = await Promise.all(
    list.map(async (t) => {
      const res = await getTopic(t.slug, { page: 1, limit: 6 });
      return { slug: t.slug, name: t.name, docs: res?.documents ?? [] };
    }),
  );

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Release years', path: '/years/' },
    { name: year, path: `/years/${year}/` },
  ]);

  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/years/${year}/`,
    url: `${SITE_URL}/years/${year}/`,
    name: `${year} declassification releases`,
    description: YEAR_DESCRIPTIONS[year] ?? `Declassified documents released in ${year}.`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'BlackVaultDocs',
      url: `${SITE_URL}/`,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: list.length,
      itemListElement: list.map((t, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${SITE_URL}/topics/${t.slug}/`,
        name: t.name,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <nav className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> /{' '}
        <Link href="/years/" className="hover:text-gray-300">years</Link> /{' '}
        <span className="text-gray-300">{year}</span>
      </nav>

      <header className="mt-4 border-b border-gray-800 pb-8">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            {year} declassification releases
          </h1>
          <span className="font-mono text-xs uppercase tracking-widest text-red-500">
            {totalDocs.toLocaleString()} documents · {list.length} collection{list.length === 1 ? '' : 's'}
          </span>
        </div>
        <p className="mt-4 max-w-3xl text-gray-300">
          {YEAR_DESCRIPTIONS[year] ?? `Collections published by the National Archives in ${year}.`}
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-200">Collections released in {year}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {list.map((t) => (
            <Link
              key={t.slug}
              href={`/topics/${t.slug}/`}
              className="group rounded-lg border border-gray-800 bg-gray-900/50 p-5 hover:border-red-800 hover:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-100 group-hover:text-white">
                  {t.name}
                </h3>
                <span className="font-mono text-xs shrink-0 text-red-500">
                  {t.doc_count.toLocaleString()}
                </span>
              </div>
              <div className="mt-3 text-xs font-mono uppercase tracking-widest text-gray-500">
                {t.agency_slug ?? 'unclassified'} //
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 space-y-10">
        {samples.map((s) => (
          <div key={s.slug}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-gray-200">
                Sample from {s.name}
              </h2>
              <Link
                href={`/topics/${s.slug}/`}
                className="text-xs font-mono uppercase tracking-widest text-red-400 hover:text-red-300"
              >
                Browse all →
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/40">
              {s.docs.map((d) => (
                <li key={d.slug} className="flex items-center gap-4 px-4 py-3">
                  <Link
                    href={`/documents/${d.slug}/`}
                    className="flex-1 truncate font-mono text-sm text-gray-200 hover:text-white"
                  >
                    {d.title}
                  </Link>
                  {d.pdf_url ? (
                    <a
                      href={d.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs uppercase tracking-widest text-red-400 hover:text-red-300"
                    >
                      PDF ↗
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-12 rounded-md border border-gray-800 bg-gray-900/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
          About {year} declassifications
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          BlackVaultDocs groups releases by the calendar year the National
          Archives published them. The {year} cycle totals{' '}
          {totalDocs.toLocaleString()} records across {list.length} collection
          {list.length === 1 ? '' : 's'}. Each record links to the original
          PDF hosted by archives.gov, with structured metadata extracted at
          ingestion time.
        </p>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(collectionPage) }}
      />
    </main>
  );
}
