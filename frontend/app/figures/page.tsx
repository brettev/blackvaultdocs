import Link from 'next/link';
import type { Metadata } from 'next';
import { FIGURES, titleMatchesFigure } from '../lib/figures';
import { loadCorpus } from '../lib/corpus';
import { breadcrumbJsonLd, jsonLdString, SITE_URL } from '../lib/jsonLd';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Figures in the declassified record',
  description:
    'Named historical figures whose files recur across the declassified US government record — JFK, RFK, MLK, Oswald, Hoover, and more.',
  alternates: { canonical: '/figures/' },
};

export default async function FiguresIndexPage() {
  const corpus = await loadCorpus();
  const counts = FIGURES.map((f) => ({
    figure: f,
    count: corpus.reduce((n, row) => (titleMatchesFigure(row.title, f) ? n + 1 : n), 0),
  })).sort((a, b) => b.count - a.count);

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Figures', path: '/figures/' },
  ]);

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${SITE_URL}/figures/`,
    itemListElement: counts.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/figures/${c.figure.slug}/`,
      name: c.figure.name,
    })),
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <nav className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> /{' '}
        <span className="text-gray-300">figures</span>
      </nav>

      <header className="mt-4 border-b border-gray-800 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
          Figures in the declassified record
        </h1>
        <p className="mt-3 max-w-2xl text-gray-300">
          Named individuals whose files recur across the BlackVaultDocs corpus.
          Each page collects every declassified document whose title mentions
          that person — useful as a starting point for biographical research
          or SERP queries like{' '}
          <span className="font-mono text-gray-400">&ldquo;oswald file&rdquo;</span> or{' '}
          <span className="font-mono text-gray-400">&ldquo;hoover memo&rdquo;</span>.
        </p>
      </header>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {counts.map(({ figure, count }) => (
          <li
            key={figure.slug}
            className="rounded-md border border-gray-800 bg-gray-900/40 p-4 hover:border-red-800"
          >
            <Link href={`/figures/${figure.slug}/`} className="block">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-white">{figure.name}</span>
                <span className="font-mono text-xs text-red-500">
                  {count.toLocaleString()}
                </span>
              </div>
              {figure.role ? (
                <p className="mt-1 text-xs text-gray-500">{figure.role}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(itemList) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }}
      />
    </main>
  );
}
