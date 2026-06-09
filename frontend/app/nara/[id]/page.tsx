import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { loadNaraIdMap } from '../../lib/corpus';

/**
 * Short-URL entry point for NARA Record Identification Numbers.
 *
 * Researchers almost always type the raw record ID into Google
 * ("104-10003-10041"), so `/nara/<id>/` resolves to the canonical
 * `/documents/<slug>/` page with a server-side redirect.
 */

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const map = await loadNaraIdMap();
  const hit = map[id];
  if (!hit) return { title: 'NARA record not found' };
  return {
    title: `NARA ${id} — ${hit.title}`,
    description: `NARA Record Identification Number ${id} resolves to "${hit.title}". Indexed by BlackVaultDocs.`,
    alternates: { canonical: `/documents/${hit.slug}/` },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function NaraIdRedirectPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const map = await loadNaraIdMap();
  const hit = map[id];
  if (!hit) notFound();

  const target = `/documents/${hit.slug}/`;
  redirect(target);
}
