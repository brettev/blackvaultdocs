import type { DocumentDetail } from './api';

const NARA_RE = /\b(\d{3}-\d{5}-\d{5})\b/;
const NARA_ID_ONLY = /^\d{3}-\d{5}-\d{5}$/;

type DocSeoFields = Pick<DocumentDetail, 'title' | 'slug' | 'external_id' | 'summary'>;

/** Normalize archives.gov external_id paths to a bare NARA record ID when possible. */
export function normalizeExternalId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^\//, '').replace(/\.pdf$/i, '').trim();
  if (NARA_ID_ONLY.test(cleaned)) return cleaned;
  const m = cleaned.match(NARA_RE);
  return m ? m[1] : null;
}

/** Extract NARA Record Identification Number — external_id first, then title/slug. */
export function extractNaraId(doc: Pick<DocSeoFields, 'external_id' | 'title' | 'slug'>): string | null {
  const fromExternal = normalizeExternalId(doc.external_id);
  if (fromExternal) return fromExternal;
  for (const raw of [doc.title, doc.slug].filter(Boolean) as string[]) {
    const m = raw.replace(/^\//, '').match(NARA_RE);
    if (m) return m[1];
  }
  return null;
}

function stripNaraIdFromText(text: string, naraId: string): string {
  const escaped = naraId.replace(/-/g, '\\-');
  return text
    .replace(new RegExp(escaped, 'g'), '')
    .replace(/\s*—\s*—/g, ' — ')
    .replace(/^\s*—\s*|\s*—\s*$/g, '')
    .trim();
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
  let subject = documentSubject(doc);
  if (naraId) subject = stripNaraIdFromText(subject, naraId) || documentSubject(doc);
  const agency = agencyName?.trim();
  const tail = agency && subject && !subject.toLowerCase().includes(agency.toLowerCase())
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
  let subject = documentSubject(doc, 120);
  if (naraId) subject = stripNaraIdFromText(subject, naraId);
  const tail = [
    `declassified ${collectionLabel} document`,
    subject ? `"${subject}"` : null,
    agencyLabel ? `from ${agencyLabel}` : null,
    'Full PDF citation and archives.gov source on BlackVaultDocs.',
  ].filter(Boolean).join(' — ');
  // Lead with bare record ID for GSC exact-match queries (mirrors /nara/[id]/ meta).
  if (naraId) return `${naraId} PDF — ${tail}`;
  return tail;
}
