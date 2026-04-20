/**
 * Shared JSON-LD helpers. Keep `@type` values consistent and prefer
 * absolute URLs so Google doesn't have to resolve relative hrefs.
 */

export const SITE_URL = 'https://blackvaultdocs.com';

export type Crumb = { name: string; path?: string };

export function breadcrumbJsonLd(crumbs: Crumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: `${SITE_URL}${c.path}` } : {}),
    })),
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: 'BlackVaultDocs',
    description:
      'Structured, searchable index of declassified US government documents — JFK, RFK, MLK, and other FOIA releases from the National Archives.',
    publisher: {
      '@type': 'Organization',
      name: 'BlackVaultDocs',
      url: `${SITE_URL}/`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Tiny helper to stringify JSON-LD safely for dangerouslySetInnerHTML.
 */
export function jsonLdString(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
