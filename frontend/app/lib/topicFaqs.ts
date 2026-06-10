/**
 * Curated FAQ content per collection slug. Used to emit FAQPage JSON-LD on
 * `/topics/<slug>/` so the page is eligible for SERP FAQ rich results, and
 * to render a visible FAQ block at the bottom of the page (which Google now
 * requires for rich-result eligibility).
 *
 * Keep answers factual, source-linkable, and 30–60 words each. If a topic
 * isn't listed here, `buildGenericTopicFaqs` emits a usable default.
 */

export type Faq = { question: string; answer: string };

const JFK_COMMON_HISTORY =
  'Under the President John F. Kennedy Assassination Records Collection Act of 1992, all records related to the assassination were required to be publicly disclosed by October 26, 2017. Subsequent Presidential orders extended certain redactions, which is why releases continued through 2025.';

const MLK_HISTORY =
  'The FBI opened sustained surveillance of Dr. Martin Luther King Jr. in 1962 under J. Edgar Hoover. Thousands of resulting files were sealed by a 1977 federal court order until January 31, 2027. Executive Order 14176, signed in January 2025, directed the Department of Justice and the National Archives to accelerate public release of those records.';

const RFK_HISTORY =
  'Robert F. Kennedy was assassinated on June 5, 1968 at the Ambassador Hotel in Los Angeles. Federal investigative files — spanning the FBI, CIA, and State Department — were largely sealed for decades and only began appearing on the National Archives website in 2025 under Executive Order 14176.';

const TOPIC_FAQS: Record<string, Faq[]> = {
  'jfk-release-2025': [
    {
      question: 'What is the JFK 2025 release?',
      answer:
        'On March 18, 2025, the National Archives published roughly 80,000 pages of previously withheld records from the President John F. Kennedy Assassination Records Collection — the largest single batch released since 2017 and the first release without redactions under Executive Order 14176.',
    },
    {
      question: 'How were these documents compiled?',
      answer:
        'BlackVaultDocs indexes every PDF linked from the archives.gov 2025 release landing page. Each record retains its original NARA Record Identification Number (e.g. 104-10003-10041) so it can be cross-referenced against the JFK Assassination Records Collection.',
    },
    {
      question: 'Why did it take until 2025?',
      answer: JFK_COMMON_HISTORY,
    },
    {
      question: 'Are the PDFs hosted here?',
      answer:
        'No. Every PDF link points to the canonical file on archives.gov. BlackVaultDocs stores only metadata — title, NARA ID, release date, collection, and agency — so researchers can search and cite without mirroring the primary source.',
    },
  ],
  'jfk-release-2023': [
    {
      question: 'What is the JFK 2023 release?',
      answer:
        'The 2023 release added newly declassified CIA, FBI, and State Department cables to the President John F. Kennedy Assassination Records Collection, continuing the disclosure program mandated by the 1992 Assassination Records Act.',
    },
    {
      question: 'Why did it take until 2023?',
      answer: JFK_COMMON_HISTORY,
    },
    {
      question: 'Is this the complete 2023 release?',
      answer:
        'The archives.gov landing page for the 2023 release links a sample of inline PDFs plus a downloadable index file listing every record. BlackVaultDocs indexes the inline links today; the long tail from the index file is planned.',
    },
  ],
  'jfk-release-2022': [
    {
      question: 'What is the JFK 2022 release?',
      answer:
        'The 2022 release, published December 15, 2022, made an additional tranche of assassination-related records public and narrowed the set of records still under a Presidential deferral. It followed the Biden White House memorandum of December 15, 2021.',
    },
    {
      question: 'Why did it take until 2022?',
      answer: JFK_COMMON_HISTORY,
    },
  ],
  'jfk-release-2021': [
    {
      question: 'What is the JFK 2021 release?',
      answer:
        'The 2021 release was the first batch of JFK assassination records disclosed under a White House Memorandum dated October 22, 2021, which directed agencies to continue review of materials still postponed from full public disclosure.',
    },
    {
      question: 'Why did it take until 2021?',
      answer: JFK_COMMON_HISTORY,
    },
  ],
  'jfk-release-2017': [
    {
      question: 'What is the JFK 2017–2018 release?',
      answer:
        'The 2017–2018 release, beginning October 26, 2017, was the statutory disclosure ordered by the 1992 Assassination Records Act. Several hundred records remained partially withheld at the time and were the subject of subsequent disclosure tranches through 2025.',
    },
    {
      question: 'Why did the National Archives merge 2017 and 2018?',
      answer:
        'archives.gov consolidated the October 2017, April 2018, and summer 2018 releases onto a single landing page (`/research/jfk/release-2017-2018`). BlackVaultDocs keeps the legacy `jfk-release-2017` slug for URL stability.',
    },
    {
      question: 'Why did it take until 2017?',
      answer: JFK_COMMON_HISTORY,
    },
  ],
  'mlk-release-2025': [
    {
      question: 'What is the MLK 2025 release?',
      answer:
        'On July 21, 2025, the National Archives published the largest disclosure to date from the FBI surveillance file on Dr. Martin Luther King Jr., covering airtels, memos, and field-office reports between 1962 and 1968. The release followed Executive Order 14176.',
    },
    {
      question: 'Are the 1977 sealed files released?',
      answer:
        'Executive Order 14176 directed early disclosure of records that had been sealed by a 1977 federal court order until 2027. The 2025 release represents the first large batch produced under that directive; additional records are expected.',
    },
    {
      question: 'Why were MLK files sealed for so long?',
      answer: MLK_HISTORY,
    },
  ],
  'rfk-release-2025': [
    {
      question: 'What is the RFK 2025 release?',
      answer:
        'On April 11, 2025, the National Archives published the first large tranche of records related to the assassination of Senator Robert F. Kennedy — spanning FBI, CIA, and State Department holdings — under Executive Order 14176.',
    },
    {
      question: 'Why did the RFK files take so long to release?',
      answer: RFK_HISTORY,
    },
    {
      question: 'What is the NARA Record Identification Number?',
      answer:
        'The NARA Record Identification Number (RIF) is the canonical identifier for every assassination-collection record — a three-part code of the form AGENCY-FILESERIES-ITEM (e.g. 104-10003-10041). BlackVaultDocs preserves it in each document slug and exposes it on the document detail page.',
    },
  ],
  'castro-communist-subversion': [
    {
      question: 'What is the Castro-Communist Subversion collection?',
      answer:
        'It is a thematic index of declassified records whose titles or manifest comments reference the ICCCA Subcommittee on Castro-Communist Subversion — overview papers, monthly combat-subversion reports, and supporting files from the JFK Assassination Records Collection released on archives.gov.',
    },
    {
      question: 'Who chaired the Subcommittee on Castro-Communist Subversion?',
      answer:
        'The subcommittee operated under the Interdepartmental Committee on Cuba (ICCCA) during the Kennedy administration. Indexed papers include memos from Marine Corps Brigadier General Victor H. Krulak to the ICCCA and file series from Joseph Califano\'s and Maxwell Taylor\'s personal papers.',
    },
    {
      question: 'Why are these records in the JFK collection?',
      answer:
        'Congress mandated disclosure of assassination-related records in 1992. Files on Cuba policy and counter-subversion that agencies deemed relevant to the Kennedy assassination were folded into the President John F. Kennedy Assassination Records Collection and released in tranches from 2017 through 2025.',
    },
    {
      question: 'Are the PDFs hosted on BlackVaultDocs?',
      answer:
        'No. Every PDF link points to the canonical file on archives.gov. BlackVaultDocs stores metadata — NARA record ID, title, release date, and parent JFK release collection — so researchers can search and cite without mirroring the primary source.',
    },
  ],
  'doj-oig-fbi': [
    {
      question: 'What is this collection?',
      answer:
        'Audits, reviews, and inspections by the Department of Justice Office of the Inspector General concerning the Federal Bureau of Investigation. Reports range from forensic-lab audits to reviews of FBI terrorism investigations and FISA compliance.',
    },
    {
      question: 'How current are these reports?',
      answer:
        'BlackVaultDocs mirrors the listing pages at oig.justice.gov. Each entry links back to the original OIG detail page where the full PDF is hosted; download counts and redaction status are authoritative at the source.',
    },
  ],
};

/** Catch-all for topics that don't have curated FAQs. */
export function buildGenericTopicFaqs(input: {
  topicName: string;
  docCount: number;
  agencyLabel: string;
  releaseYear: string | null;
}): Faq[] {
  const faqs: Faq[] = [
    {
      question: `What is the ${input.topicName} collection?`,
      answer:
        `${input.topicName} is a set of ${input.docCount.toLocaleString()} declassified documents released by ` +
        `${input.agencyLabel}. Each record is indexed by BlackVaultDocs with its original identifier so it can be ` +
        `cross-referenced against agency citations.`,
    },
    {
      question: 'Are the PDFs hosted on BlackVaultDocs?',
      answer:
        'No. Every PDF link points to the canonical file on the originating agency\'s website. BlackVaultDocs stores only the metadata — title, identifier, release date, and collection — so researchers can search and cite without mirroring the primary source.',
    },
  ];
  if (input.releaseYear) {
    faqs.push({
      question: `When were the ${input.topicName} records released?`,
      answer: `The ${input.topicName} collection was disclosed in ${input.releaseYear}. See the release-year index for every collection published that year.`,
    });
  }
  return faqs;
}

export function getTopicFaqs(slug: string): Faq[] | null {
  return TOPIC_FAQS[slug] ?? null;
}

export function faqPageJsonLd(faqs: Faq[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}
