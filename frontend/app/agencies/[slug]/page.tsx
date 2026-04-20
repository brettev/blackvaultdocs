import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAgency, listAgencies } from '../../lib/api';

export const dynamic = 'force-static';
export const dynamicParams = false;

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const agencies = await listAgencies();
  return agencies.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await getAgency(slug);
  if (!res) return { title: 'Agency not found' };
  const { agency } = res;
  return {
    title: agency.name,
    description:
      agency.description ??
      `Declassified documents from ${agency.name} indexed by BlackVaultDocs.`,
    alternates: { canonical: `/agencies/${agency.slug}/` },
  };
}

export default async function AgencyDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const res = await getAgency(slug);
  if (!res) notFound();
  const { agency, topics } = res;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <nav className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> /{' '}
        <Link href="/agencies/" className="hover:text-gray-300">agencies</Link> /{' '}
        <span className="text-gray-300">{agency.slug}</span>
      </nav>

      <header className="mt-4 border-b border-gray-800 pb-8">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            {agency.name}
          </h1>
          <span className="font-mono text-xs uppercase tracking-widest text-red-500">
            {agency.doc_count.toLocaleString()} documents
          </span>
        </div>
        {agency.description ? (
          <p className="mt-4 max-w-3xl text-gray-300">{agency.description}</p>
        ) : null}
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-200">Collections</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {topics.map((t) => (
            <Link
              key={t.slug}
              href={`/topics/${t.slug}/`}
              className="group rounded-lg border border-gray-800 bg-gray-900/50 p-5 hover:border-red-800 hover:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-gray-100 group-hover:text-white">
                  {t.name}
                </h3>
                <span className="font-mono text-xs shrink-0 text-red-500">
                  {t.doc_count.toLocaleString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
