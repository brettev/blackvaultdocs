/**
 * With `output: 'export'`, Next.js requires at least one entry from
 * `generateStaticParams` for every dynamic segment. When the corpus / API
 * yields zero rows, we emit a single sentinel param and `notFound()` at
 * runtime so the URL is never linked in sitemaps.
 */
export const STATIC_EXPORT_DOC_SLUG = '__bvd_export_placeholder__';
export const STATIC_EXPORT_AGENCY_SLUG = '__bvd_export_placeholder__';
export const STATIC_EXPORT_NARA_ID = '__bvd_export_placeholder__';
export const STATIC_EXPORT_YEAR = '0000';
export const STATIC_EXPORT_TOPIC_PAGE = {
  slug: '__bvd_export_placeholder__',
  page: '2',
} as const;
