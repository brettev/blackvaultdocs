import type { Metadata } from 'next';
import { SITE_URL } from './jsonLd';

type TopicSeoInput = {
  slug: string;
  name: string;
  description?: string | null;
  doc_count: number;
};

/** Topic hub CTR template — doc count + declassified suffix for collection SERPs. */
export function buildTopicTitle(topic: TopicSeoInput, releaseYear?: string | null): string {
  const year = releaseYear ? ` (${releaseYear})` : '';
  const count = topic.doc_count.toLocaleString();
  return `${topic.name}${year} — ${count} Declassified Documents`;
}

export function buildTopicDescription(topic: TopicSeoInput, releaseYear?: string | null): string {
  const year = releaseYear ? ` ${releaseYear} release` : '';
  const base =
    topic.description?.trim() ||
    `${topic.doc_count.toLocaleString()} declassified US government documents in the ${topic.name} collection`;
  return `${base}${year ? ` —${year}` : ''}. NARA record IDs, archives.gov PDF links, and full citations on BlackVaultDocs.`;
}

export function buildTopicMetadata(topic: TopicSeoInput, releaseYear?: string | null): Metadata {
  const title = buildTopicTitle(topic, releaseYear);
  const description = buildTopicDescription(topic, releaseYear);
  const canonical = `${SITE_URL}/topics/${topic.slug}/`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      images: [{ url: `/og/topics/${topic.slug}.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/og/topics/${topic.slug}.png`],
    },
  };
}
