import type { DocumentDetail } from './api';

const NARA_RE = /\b(\d{3}-\d{5}-\d{5})\b/;

type DocSeoFields = Pick<DocumentDetail, 'title' | 'slug' | 'external_id' | 'summary'>;

/** Extract NARA Record Identification Number from slug, external_id, or title. */
export function extractNaraId(doc: Pick<DocSeoFields, 'external_id' | 'title' | 'slug'>): string | null {
  const candidates = [doc.external_id, doc.title, doc.slug].filter(Boolean) as string[];
  for (const raw of candidates) {
    const m = raw.replace(/^\//, '').match(NARA_RE);
    if (m) return m[1];
  }
  return null;
}

/** Human-readable subject line — prefer summary snippet when title is opaque/ID-like. */
export function documentSubject(doc: Pick<DocSeoFields, 'title' | 'summary'>, maxLen = 72): string {
  const title = (doc.title || '').trim();
  const looksLikeId =
    NARA_RE.test(title) ||
    /^[a-z0-9-]+$/i.test(title) ||
    title.length < 12;
  const raw = looksLikeId && doc.summary ? doc.summary.trim() : title;
  if (raw.length <= maxLen) return raw;
  const cut = raw.slice(0, maxLen);
  const sp = cut.lastIndexOf(' ');
  return (sp > 40 ? cut.slice(0, sp) : cut).trim() + '…';
}

/**
 * Intelligence P0 template: {NARA ID} — {subject/agency} | Declassified
 * Layout template appends " | BlackVaultDocs" — keep title segment without duplicate suffix.
 */
export function buildDocumentTitle(
  doc: DocSeoFields,
  agencyName?: string | null,
): string {
  const naraId = extractNaraId(doc);
  const subject = documentSubject(doc);
  const agency = agencyName?.trim();
  const tail = agency && !subject.toLowerCase().includes(agency.toLowerCase())
    ? `${subject} — ${agency}`
    : subject;
  if (naraId) return `${naraId} — ${tail} | Declassified`;
  return `${tail} | Declassified`;
}

export function buildDocumentDescription(
  doc: DocSeoFields,
  collectionLabel: string,
  agencyLabel: string,
): string {
  const naraId = extractNaraId(doc);
  const subject = documentSubject(doc, 120);
  const parts = [
    naraId ? `NARA record ${naraId}` : null,
    `declassified ${collectionLabel} document`,
    subject ? `"${subject}"` : null,
    agencyLabel ? `from ${agencyLabel}` : null,
    'Full citation and archives.gov source on BlackVaultDocs.',
  ].filter(Boolean);
  return parts.join(' — ');
}
