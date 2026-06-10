/**
 * Thematic topic hubs that are not rows in the `topics` table. Documents stay
 * tagged to their release collection (`jfk-release-2017`, etc.); these hubs
 * surface a cross-release slice via the public API `q` filter on title,
 * summary, slug, and external_id.
 */
import type { TopicRow } from './api';

export type VirtualTopic = {
  slug: string;
  name: string;
  description: string;
  agency_slug: string | null;
  /** Minimum 2 chars — passed to `/api/public/documents?q=` */
  searchQuery: string;
  relatedFigures?: string[];
  relatedTopics?: string[];
  about?: string;
};

export const VIRTUAL_TOPICS: VirtualTopic[] = [
  {
    slug: 'castro-communist-subversion',
    name: 'Castro-Communist Subversion',
    description:
      'Papers of the ICCCA Subcommittee on Castro-Communist Subversion — overview memos, monthly action reports, and Latin America counter-subversion files from the JFK Assassination Records Collection.',
    agency_slug: 'nara',
    searchQuery: 'castro-communist',
    relatedFigures: ['fidel-castro'],
    relatedTopics: ['jfk-release-2017', 'jfk-release-2023'],
    about:
      'The Subcommittee on Castro-Communist Subversion was chartered under the Interdepartmental Committee on Cuba (ICCCA) during the Kennedy administration to track Cuban-backed subversion across Latin America. Califano Papers and Taylor Papers file series in the JFK Assassination Records Collection preserve overview papers, monthly combat-subversion reports, and supporting cables. BlackVaultDocs indexes every release whose title or manifest mentions Castro-Communist subversion while keeping each record in its parent JFK release collection for year-based browsing.',
  },
];

export function findVirtualTopic(slug: string): VirtualTopic | undefined {
  return VIRTUAL_TOPICS.find((t) => t.slug === slug);
}

export function listVirtualTopics(): VirtualTopic[] {
  return VIRTUAL_TOPICS;
}

export function virtualTopicsForFigure(figureSlug: string): VirtualTopic[] {
  return VIRTUAL_TOPICS.filter((t) => t.relatedFigures?.includes(figureSlug));
}

export function virtualTopicAsRow(v: VirtualTopic, docCount: number): TopicRow {
  return {
    slug: v.slug,
    name: v.name,
    description: v.description,
    agency_slug: v.agency_slug,
    doc_count: docCount,
    updated_at: new Date().toISOString(),
  };
}

export type DocumentHubLink = { slug: string; name: string };

/** JFK release collections — documents keep topic_slug on these while thematic hubs cross-link. */
export const JFK_RELEASE_TOPIC_SLUGS: Record<string, string> = {
  'jfk-release-2017': 'JFK Assassination Records — 2017 Release',
  'jfk-release-2023': 'JFK Assassination Records — 2023 Release',
};

export function documentMentionsCastro(doc: { title: string; slug: string }): boolean {
  return /castro/i.test(`${doc.title} ${doc.slug}`);
}

/** Internal hub links for document pages — JFK release breadcrumb + Castro virtual topic. */
export function getDocumentHubLinks(
  doc: { title: string; slug: string; topic_slug?: string | null },
  topic: DocumentHubLink | null,
): DocumentHubLink[] {
  const links: DocumentHubLink[] = [];
  const topicSlug = topic?.slug ?? doc.topic_slug ?? null;

  if (topicSlug && topicSlug in JFK_RELEASE_TOPIC_SLUGS) {
    links.push({
      slug: topicSlug,
      name: topic?.name ?? JFK_RELEASE_TOPIC_SLUGS[topicSlug],
    });
  }

  if (documentMentionsCastro(doc)) {
    const vt = findVirtualTopic('castro-communist-subversion');
    if (vt && !links.some((l) => l.slug === vt.slug)) {
      links.push({ slug: vt.slug, name: vt.name });
    }
  }

  return links;
}
