import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadCorpus, type CorpusRow } from '../../lib/corpus';
import { FIGURES, findFigure, titleMatchesFigure, type Figure } from '../../lib/figures';
import { breadcrumbJsonLd, jsonLdString, SITE_URL } from '../../lib/jsonLd';

export const dynamic = 'force-static';
export const dynamicParams = false;

const MAX_DOCS_SHOWN = 200;

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return FIGURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const figure = findFigure(slug);
  if (!figure) return { title: 'Figure not found' };
  return {
    title: `${figure.name} — declassified files`,
    description:
      `${figure.blurb} BlackVaultDocs indexes every record whose title mentions ${figure.name} across declassified US government releases.`,
    alternates: { canonical: `/figures/${figure.slug}/` },
    openGraph: {
      title: `${figure.name} — declassified files`,
      description: figure.blurb,
      type: 'article',
      images: [{ url: `/og/figures/${figure.slug}.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${figure.name} — declassified files`,
      images: [`/og/figures/${figure.slug}.png`],
    },
  };
}

export default async function FigureDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const figure = findFigure(slug);
  if (!figure) notFound();

  const corpus = await loadCorpus();
  const matches = corpus.filter((d) => titleMatchesFigure(d.title, figure));

  const byTopic = new Map<string, { slug: string | null; count: number; sample: CorpusRow | null }>();
  for (const m of matches) {
    const key = m.topic_slug ?? '__none';
    const cur = byTopic.get(key) ?? { slug: m.topic_slug, count: 0, sample: null };
    cur.count += 1;
    if (!cur.sample) cur.sample = m;
    byTopic.set(key, cur);
  }
  const topicRows = [...byTopic.values()].sort((a, b) => b.count - a.count);

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Figures', path: '/figures/' },
    { name: figure.name, path: `/figures/${figure.slug}/` },
  ]);

  const personJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/figures/${figure.slug}/#person`,
    name: figure.name,
    description: figure.blurb,
    ...(figure.role ? { jobTitle: figure.role } : {}),
    mainEntityOfPage: `${SITE_URL}/figures/${figure.slug}/`,
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <nav className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> /{' '}
        <Link href="/figures/" className="hover:text-gray-300">figures</Link> /{' '}
        <span className="text-gray-300">{figure.slug}</span>
      </nav>

      <header className="mt-4 border-b border-gray-800 pb-8">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            {figure.name}
          </h1>
          <span className="font-mono text-xs uppercase tracking-widest text-red-500">
            {matches.length.toLocaleString()} matching documents
          </span>
        </div>
        {figure.role ? (
          <p className="mt-2 text-sm text-gray-400">{figure.role}</p>
        ) : null}
        <p className="mt-4 max-w-3xl text-gray-300">{figure.blurb}</p>
      </header>

      {matches.length === 0 ? (
        <section className="mt-12 rounded-md border border-gray-800 bg-gray-900/40 p-6">
          <p className="text-sm text-gray-400">
            No declassified records in the BlackVaultDocs index currently match
            the title pattern for {figure.name}. This can happen when agencies
            redact names in release manifests or when a figure is only
            mentioned in the full text of a PDF rather than in its title.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-200">
              Records by collection
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {topicRows.map((row) => (
                <li
                  key={row.slug ?? '__none'}
                  className="rounded-md border border-gray-800 bg-gray-900/40 p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    {row.slug ? (
                      <Link
                        href={`/topics/${row.slug}/`}
                        className="truncate font-mono text-sm text-red-400 hover:text-red-300"
                      >
                        {row.slug}
                      </Link>
                    ) : (
                      <span className="font-mono text-sm text-gray-500">— uncollected —</span>
                    )}
                    <span className="font-mono text-xs text-gray-500">
                      {row.count.toLocaleString()}
                    </span>
                  </div>
                  {row.sample ? (
                    <p className="mt-1 truncate text-xs text-gray-500">
                      e.g. {row.sample.title}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12">
            <h2 className="text-lg font-semibold text-gray-200">
              Documents mentioning {figure.name}
            </h2>
            <ul className="mt-4 divide-y divide-gray-800 rounded-md border border-gray-800 bg-gray-900/40">
              {matches.slice(0, MAX_DOCS_SHOWN).map((d) => (
                <li key={d.slug} className="flex items-baseline gap-4 px-4 py-3">
                  <Link
                    href={`/documents/${d.slug}/`}
                    className="flex-1 truncate font-mono text-sm text-gray-200 hover:text-white"
                  >
                    {d.title}
                  </Link>
                  {d.topic_slug ? (
                    <span className="shrink-0 font-mono text-xs text-gray-500">
                      {d.topic_slug}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            {matches.length > MAX_DOCS_SHOWN ? (
              <p className="mt-3 text-xs text-gray-500">
                Showing the first {MAX_DOCS_SHOWN.toLocaleString()} of{' '}
                {matches.length.toLocaleString()} matches. Use{' '}
                <Link href="/search/" className="text-red-400 hover:text-red-300">/search/</Link> to
                filter within a specific release.
              </p>
            ) : null}
          </section>
        </>
      )}

      <RelatedFigures currentSlug={figure.slug} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }}
      />
    </main>
  );
}

function RelatedFigures({ currentSlug }: { currentSlug: string }) {
  const others = FIGURES.filter((f) => f.slug !== currentSlug).slice(0, 6);
  return (
    <section className="mt-12 rounded-md border border-gray-800 bg-gray-900/40 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
        Other figures in the corpus
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {others.map((f) => (
          <li key={f.slug}>
            <Link
              href={`/figures/${f.slug}/`}
              className="font-mono text-sm text-red-400 hover:text-red-300"
            >
              {f.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
