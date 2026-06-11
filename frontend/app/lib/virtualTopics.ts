/**
 * Thematic topic hubs that are not rows in the `topics` table. Documents stay
 * tagged to their release collection (`jfk-release-2017`, etc.); these hubs
 * surface a cross-release slice via the public API `q` filter on title,
 * summary, slug, and external_id.
 */
import type { TopicRow } from './api';

/** Max documents shown on a virtual topic hub (paginated below this). */
export const VIRTUAL_TOPIC_MAX_DOCS = 200;

export type VirtualTopic = {
  slug: string;
  name: string;
  description: string;
  agency_slug: string | null;
  /** Minimum 2 chars — passed to `/api/public/documents?q=` */
  searchQuery: string;
  /** Cap hub list + metadata doc_count (default {@link VIRTUAL_TOPIC_MAX_DOCS}). */
  maxDocs?: number;
  relatedFigures?: string[];
  relatedTopics?: string[];
  about?: string;
  /** Narrative intro paragraphs rendered under the hub header. */
  intro?: string[];
};

export function capVirtualDocCount(total: number, topic: Pick<VirtualTopic, 'maxDocs'>): number {
  return Math.min(total, topic.maxDocs ?? VIRTUAL_TOPIC_MAX_DOCS);
}

export const VIRTUAL_TOPICS: VirtualTopic[] = [
  {
    slug: 'jfk-assassination',
    name: 'JFK Assassination Files',
    description:
      'Curated hub for the declassified JFK assassination records: every release collection (2017–2025), key figures from the Warren Commission and HSCA investigations, and the most-cited declassification memos and cables indexed by title.',
    agency_slug: 'nara',
    // Matches titles/summaries that explicitly reference the JFK assassination
    // (declassification memos, review-board records, status reports) — the
    // most-cited records in the collection, kept under one curated page.
    searchQuery: 'jfk assassination',
    maxDocs: VIRTUAL_TOPIC_MAX_DOCS,
    relatedFigures: [
      'john-f-kennedy',
      'lee-harvey-oswald',
      'jack-ruby',
      'j-edgar-hoover',
      'james-jesus-angleton',
      'allen-dulles',
    ],
    relatedTopics: [
      'jfk-release-2017',
      'jfk-release-2023',
      'castro-communist-subversion',
    ],
    intro: [
      'President John F. Kennedy was assassinated in Dallas, Texas on November 22, 1963. The federal investigative record that followed — Warren Commission exhibits, CIA 201 files, FBI field reports, and House Select Committee on Assassinations (HSCA) working papers — was consolidated by the President John F. Kennedy Assassination Records Collection Act of 1992, which required public disclosure of every assassination-related record held by the US government.',
      'Disclosure happened in tranches: the statutory 2017–2018 release published the bulk of the collection, with follow-on releases in 2021, 2022, 2023, and the final unredacted batch of roughly 80,000 pages in March 2025 under Executive Order 14176. Each record carries a NARA Record Identification Number (e.g. 104-10003-10041) identifying the originating agency, file series, and item — the same citation format used in academic and journalistic work on the assassination.',
      'This hub collects the full set of release collections, the key figures who appear throughout the files — Lee Harvey Oswald, Jack Ruby, J. Edgar Hoover, James Angleton — and the records whose titles explicitly reference the JFK assassination: declassification memos, review-board status reports, and the administrative paper trail of the disclosure program itself.',
    ],
    about:
      'The President John F. Kennedy Assassination Records Collection at the National Archives spans more than 40,000 indexed records released between 2017 and 2025. This thematic hub lists the records whose titles or manifest summaries explicitly reference the JFK assassination, and links to each release-year collection for the full record set. Every document links directly to the original PDF on archives.gov and retains its NARA Record Identification Number for citation.',
  },
  {
    slug: 'castro-communist-subversion',
    name: 'Castro-Communist Subversion',
    description:
      'Castro and Castro-Communist subversion records from the JFK Assassination Records Collection — ICCCA subcommittee memos, monthly combat-subversion reports, and related Cuba policy files indexed by title.',
    agency_slug: 'nara',
    // Broader than `castro-communist` (5 strict hits) — aligns with the Fidel
    // Castro figure hub (~191 title matches) while staying under maxDocs.
    searchQuery: 'castro',
    maxDocs: VIRTUAL_TOPIC_MAX_DOCS,
    relatedFigures: ['fidel-castro'],
    relatedTopics: ['jfk-release-2017', 'jfk-release-2023'],
    about:
      'The Subcommittee on Castro-Communist Subversion was chartered under the Interdepartmental Committee on Cuba (ICCCA) during the Kennedy administration to track Cuban-backed subversion across Latin America. Califano Papers and Taylor Papers file series in the JFK Assassination Records Collection preserve overview papers, monthly combat-subversion reports, and supporting cables. This thematic hub lists every indexed record whose title mentions Castro (including strict Castro-Communist subversion file series) while keeping each document in its parent JFK release collection for year-based browsing.',
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

/** JFK-release docs whose titles reference the assassination link to the curated hub. */
export function documentMentionsJfkAssassination(doc: {
  title: string;
  topic_slug?: string | null;
}): boolean {
  const inJfkRelease = (doc.topic_slug ?? '').startsWith('jfk-release');
  return inJfkRelease && /assassination/i.test(doc.title);
}

/** Internal hub links for document pages — JFK release breadcrumb + thematic virtual topics. */
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

  if (documentMentionsJfkAssassination({ ...doc, topic_slug: topicSlug })) {
    const vt = findVirtualTopic('jfk-assassination');
    if (vt && !links.some((l) => l.slug === vt.slug)) {
      links.push({ slug: vt.slug, name: vt.name });
    }
  }

  if (documentMentionsCastro(doc)) {
    const vt = findVirtualTopic('castro-communist-subversion');
    if (vt && !links.some((l) => l.slug === vt.slug)) {
      links.push({ slug: vt.slug, name: vt.name });
    }
  }

  return links;
}
