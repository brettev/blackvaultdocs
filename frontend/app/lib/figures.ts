/**
 * Catalogue of notable figures whose names recur across the declassified
 * corpus. Each entry defines:
 *
 *   slug       — URL segment (/figures/<slug>/)
 *   name       — canonical display name
 *   aliases    — every surface form that should match a document title,
 *                case-insensitively. Include common transliterations and
 *                surname-only forms when they're unambiguous.
 *   blurb      — 1-2 sentence human-readable context for the top of the
 *                page and for meta description.
 *
 * Keep this tight — only include figures we actually have coverage for.
 * The page silently 404s when no documents match, so adding a figure here
 * pre-commits to SERP-worthy content appearing at build time.
 */
export type Figure = {
  slug: string;
  name: string;
  aliases: string[];
  blurb: string;
  role?: string;
};

export const FIGURES: Figure[] = [
  {
    slug: 'lee-harvey-oswald',
    name: 'Lee Harvey Oswald',
    role: 'Accused assassin of President John F. Kennedy',
    aliases: ['Lee Harvey Oswald', 'Oswald, Lee'],
    blurb:
      'Lee Harvey Oswald was the accused assassin of President John F. Kennedy, arrested on November 22, 1963 and killed two days later by Jack Ruby. His name recurs throughout the CIA, FBI, and Warren Commission records in the JFK Assassination Records Collection.',
  },
  {
    slug: 'jack-ruby',
    name: 'Jack Ruby',
    role: 'Killed Lee Harvey Oswald in police custody',
    aliases: ['Jack Ruby', 'Ruby, Jack', 'Jacob Rubenstein'],
    blurb:
      'Dallas nightclub operator Jack Ruby fatally shot Lee Harvey Oswald in the Dallas police basement on November 24, 1963. FBI and Warren Commission interviews of Ruby and his associates appear repeatedly in the JFK release series.',
  },
  {
    slug: 'sirhan-sirhan',
    name: 'Sirhan Sirhan',
    role: 'Convicted assassin of Senator Robert F. Kennedy',
    aliases: ['Sirhan', 'Sirhan Sirhan', 'Sirhan Bishara'],
    blurb:
      'Sirhan Sirhan was convicted of assassinating Senator Robert F. Kennedy on June 5, 1968 at the Ambassador Hotel in Los Angeles. Investigative files on Sirhan sit at the center of the RFK Assassination Records Collection.',
  },
  {
    slug: 'martin-luther-king-jr',
    name: 'Martin Luther King Jr.',
    role: 'Civil rights leader; target of sustained FBI surveillance',
    aliases: [
      'Martin Luther King',
      'Martin Luther King Jr',
      'Martin Luther King, Jr',
      'MLK',
      'Rev. King',
      'Dr. King',
      'King, Martin Luther',
    ],
    blurb:
      'Dr. Martin Luther King Jr. was the subject of sustained FBI counterintelligence operations from 1962 until his assassination in April 1968. Records released under Executive Order 14176 document airtels, wiretap transcripts, and field-office reports.',
  },
  {
    slug: 'james-earl-ray',
    name: 'James Earl Ray',
    role: 'Convicted assassin of Martin Luther King Jr.',
    aliases: ['James Earl Ray', 'Ray, James Earl'],
    blurb:
      'James Earl Ray pleaded guilty in 1969 to the assassination of Martin Luther King Jr. on April 4, 1968 in Memphis, Tennessee. Files on Ray and his movements appear across the FBI\'s MURKIN case series.',
  },
  {
    slug: 'john-f-kennedy',
    name: 'John F. Kennedy',
    role: '35th President of the United States',
    aliases: ['John F. Kennedy', 'John Kennedy', 'President Kennedy', 'JFK', 'Kennedy, John F'],
    blurb:
      'President John F. Kennedy was assassinated on November 22, 1963 in Dallas, Texas. His name appears throughout CIA, FBI, State Department, and Secret Service records in the JFK Assassination Records Collection.',
  },
  {
    slug: 'robert-f-kennedy',
    name: 'Robert F. Kennedy',
    role: 'US Attorney General; Senator; assassinated 1968',
    aliases: ['Robert F. Kennedy', 'Robert Kennedy', 'Senator Kennedy', 'RFK', 'Kennedy, Robert'],
    blurb:
      'Robert F. Kennedy served as US Attorney General from 1961–1964 and as a US Senator from New York until his assassination on June 5, 1968 in Los Angeles. Investigative files are central to the RFK Assassination Records Collection.',
  },
  {
    slug: 'j-edgar-hoover',
    name: 'J. Edgar Hoover',
    role: 'FBI Director, 1924–1972',
    aliases: ['J. Edgar Hoover', 'Edgar Hoover', 'Director Hoover', 'Hoover, J'],
    blurb:
      'J. Edgar Hoover directed the FBI from 1924 until his death in 1972 and personally authorized surveillance operations that dominate the MLK, JFK, and civil-rights-era files in the BlackVaultDocs corpus.',
  },
  {
    slug: 'fidel-castro',
    name: 'Fidel Castro',
    role: 'Prime Minister and President of Cuba, 1959–2008',
    aliases: ['Fidel Castro', 'Castro, Fidel'],
    blurb:
      'Fidel Castro led Cuba from the 1959 revolution until 2008 and was a principal subject of CIA operations discussed throughout the JFK Assassination Records Collection, including the MONGOOSE and AMLASH programs.',
  },
  {
    slug: 'e-howard-hunt',
    name: 'E. Howard Hunt',
    role: 'CIA officer; Watergate burglar',
    aliases: ['E. Howard Hunt', 'Howard Hunt', 'Hunt, E Howard', 'Hunt, Howard'],
    blurb:
      'E. Howard Hunt was a longtime CIA officer whose name recurs in both the JFK assassination files and post-1972 investigative records stemming from the Watergate break-in.',
  },
  {
    slug: 'james-jesus-angleton',
    name: 'James Jesus Angleton',
    role: 'CIA Chief of Counterintelligence, 1954–1975',
    aliases: ['Angleton', 'James Angleton', 'James Jesus Angleton'],
    blurb:
      'James Jesus Angleton led CIA counterintelligence for two decades and personally managed the Agency\'s Oswald file. His cables and memoranda appear extensively in the JFK release series.',
  },
  {
    slug: 'david-atlee-phillips',
    name: 'David Atlee Phillips',
    role: 'CIA Western Hemisphere officer',
    aliases: ['David Atlee Phillips', 'David Phillips', 'Phillips, David Atlee'],
    blurb:
      'David Atlee Phillips ran CIA operations against Cuba from Mexico City in the period immediately preceding the Kennedy assassination, a focal point of post-1992 declassification.',
  },
  {
    slug: 'george-joannides',
    name: 'George Joannides',
    role: 'CIA officer — DRE case officer, 1963',
    aliases: ['George Joannides', 'Joannides'],
    blurb:
      'George Joannides was a CIA case officer who handled the DRE Cuban exile group during Lee Harvey Oswald\'s August 1963 contacts. His role was the single most litigated JFK-era disclosure question through the 2020s.',
  },
  {
    slug: 'allen-dulles',
    name: 'Allen Dulles',
    role: 'CIA Director 1953–1961; Warren Commission member',
    aliases: ['Allen Dulles', 'Dulles, Allen'],
    blurb:
      'Allen Dulles directed the CIA from 1953 to 1961 and served on the Warren Commission investigating the assassination of President Kennedy. His correspondence appears across both the JFK collection and early Cold War State Department files.',
  },
];

export function findFigure(slug: string): Figure | undefined {
  return FIGURES.find((f) => f.slug === slug);
}

/**
 * Case-insensitive, separator-tolerant match of any alias against a title.
 *
 * BVD ingests document titles from heterogenous sources — some use spaces
 * ("FBI memo on Lee Harvey Oswald"), some use underscores from the
 * underlying PDF filename ("00440377_lee_harvey_oswald_351.pdf"), and
 * some use hyphens. We normalise both the title and the alias so any
 * run of non-alphanumeric characters acts as a single separator, then
 * require a non-word boundary on each side so we don't match inside a
 * longer word (e.g. "Ray" won't match "raytheon").
 */
export function titleMatchesFigure(title: string, figure: Figure): boolean {
  const normTitle = normaliseForMatch(title);
  for (const alias of figure.aliases) {
    const a = normaliseForMatch(alias);
    if (!a) continue;
    // Demand a word boundary if the alias starts or ends in an alnum
    // character, so "ray" cannot match "raytheon" but "JFK" can sit
    // between any separators.
    const startsAlnum = /^[a-z0-9]/.test(a);
    const endsAlnum = /[a-z0-9]$/.test(a);
    const left = startsAlnum ? '(^|[^a-z0-9])' : '';
    const right = endsAlnum ? '($|[^a-z0-9])' : '';
    const re = new RegExp(`${left}${escapeRegex(a)}${right}`);
    if (re.test(normTitle)) return true;
  }
  return false;
}

function normaliseForMatch(s: string): string {
  // Collapse any run of non-alphanumerics into a single space so
  // "lee_harvey_oswald" matches "lee harvey oswald".
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
