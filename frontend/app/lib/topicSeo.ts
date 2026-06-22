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
  const slug = topic.slug;
  if (slug === 'jfk-release-2025') {
    return `JFK Assassination Records 2025 Release — ${topic.doc_count.toLocaleString()} Declassified NARA Files`;
  }
  if (slug === 'jfk-release-2023') {
    return `JFK Assassination Records 2023 Release — NARA Record IDs & PDFs`;
  }
  if (slug === 'jfk-assassination') {
    return `JFK Assassination Files — Declassified NARA Records (2017–2025 Releases)`;
  }
  const year = releaseYear ? ` (${releaseYear})` : '';
  const count = topic.doc_count.toLocaleString();
  return `${topic.name}${year} — ${count} Declassified Documents`;
}

export function buildTopicDescription(topic: TopicSeoInput, releaseYear?: string | null): string {
  const slug = topic.slug;
  if (slug === 'jfk-release-2025') {
    return `Browse the March 2025 JFK assassination records release: ${topic.doc_count.toLocaleString()} declassified NARA documents with record IDs, archives.gov PDF links, and full citations on BlackVaultDocs.`;
  }
  if (slug === 'jfk-release-2023') {
    return `2023 JFK assassination records release from the National Archives — ${topic.doc_count.toLocaleString()} declassified documents with NARA IDs (e.g. 104-10250-10280), PDF downloads, and metadata on BlackVaultDocs.`;
  }
  if (slug === 'jfk-assassination') {
    return `Curated hub for JFK assassination declassification: Warren Commission exhibits, CIA 201 files, and NARA release collections from 2017 through 2025. Search by record ID or browse by release year.`;
  }
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
