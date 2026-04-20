/**
 * Tiny typed client for the BlackVaultDocs public API. All calls are
 * executed at build-time (static export) with a generous timeout. We never
 * throw — callers decide how to handle nulls so that a flaky backend can't
 * break a whole page tree.
 *
 * The backend is a small Symfony API sitting behind a shared-hosting Apache
 * (MPM prefork, MaxRequestWorkers=150) that also serves ~30 other sites.
 * If we fan out thousands of parallel fetches during `next build`, we can
 * saturate the worker pool and wedge every tenant. Every request here must
 * therefore have a bounded timeout, and concurrency must be bounded at the
 * call-site (see `pMap` below).
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.blackvaultdocs.com';

const DEFAULT_TIMEOUT_MS = Number(process.env.BVD_API_TIMEOUT_MS ?? 20_000);
const DEFAULT_RETRIES = Number(process.env.BVD_API_RETRIES ?? 2);
const GLOBAL_CONCURRENCY = Number(process.env.BVD_API_CONCURRENCY ?? 8);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A crude global semaphore that caps in-flight HTTP requests to the API.
 * Next.js `output: export` can spin up dozens of parallel page renders, each
 * of which calls this client. Without a cap, a 15k-document build opens
 * hundreds of concurrent TCP connections and trivially wedges the shared
 * Apache pool that also serves ~30 other tenants.
 */
let inFlight = 0;
const waiters: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (inFlight < GLOBAL_CONCURRENCY) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiters.push(resolve));
}

function releaseSlot(): void {
  const next = waiters.shift();
  if (next) {
    next();
    return;
  }
  inFlight = Math.max(0, inFlight - 1);
}

/**
 * Bounded parallel map. Keeps at most `concurrency` promises in flight at
 * once so that static export cannot accidentally open hundreds of TCP
 * connections to the API.
 */
export async function pMap<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const n = items.length;
  const results = new Array<R>(n);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(Math.max(concurrency, 1), n) }, async () => {
    while (cursor < n) {
      const i = cursor++;
      results[i] = await mapper(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export type DocumentRow = {
  slug: string;
  title: string;
  summary: string | null;
  source: string;
  source_url: string;
  pdf_url: string | null;
  topic_slug: string | null;
  agency_slug: string | null;
  classification: string | null;
  released_at: string | null;
  scraped_at: string;
};

export type DocumentDetail = DocumentRow & {
  external_id: string;
  file_size_bytes: number | null;
  page_count: number | null;
};

export type TopicRow = {
  slug: string;
  name: string;
  description: string | null;
  agency_slug: string | null;
  doc_count: number;
  updated_at: string;
};

export type AgencyRow = {
  slug: string;
  name: string;
  description: string | null;
  doc_count: number;
};

export type ScrapeLogRow = {
  id: number;
  source: string;
  task: string;
  status: string;
  rows_added: number;
  rows_seen: number;
  started_at: string;
  finished_at: string | null;
};

export type Stats = {
  total_documents: number;
  total_topics: number;
  total_agencies: number;
  last_scrape: ScrapeLogRow | null;
  by_topic: Array<Pick<TopicRow, 'slug' | 'name' | 'agency_slug' | 'doc_count'>>;
  by_source: Array<{ source: string; doc_count: number }>;
  recent_scrapes: ScrapeLogRow[];
  recently_indexed: Array<{ slug: string; title: string; topic_slug: string | null; scraped_at: string }>;
};

export type DocNeighbour = { slug: string; title: string } | null;

type ListEnvelope<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

async function getJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const url = `${API_BASE}${path}`;
  await acquireSlot();
  try {
    for (let attempt = 0; attempt <= DEFAULT_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          ...init,
          headers: { accept: 'application/json', ...(init?.headers ?? {}) },
          signal: controller.signal,
          next: { revalidate: 0 },
        } as RequestInit);
        if (res.ok) {
          return (await res.json()) as T;
        }
        if (res.status >= 500 && attempt < DEFAULT_RETRIES) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        return null;
      } catch (err) {
        if (attempt < DEFAULT_RETRIES) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`[api] ${path} failed after ${DEFAULT_RETRIES + 1} attempts: ${reason}`);
        return null;
      } finally {
        clearTimeout(timer);
      }
    }
    return null;
  } finally {
    releaseSlot();
  }
}

export async function getStats(): Promise<Stats | null> {
  return getJson<Stats>('/api/public/stats');
}

export async function listTopics(limit = 200): Promise<TopicRow[]> {
  const res = await getJson<ListEnvelope<TopicRow>>(`/api/public/topics?limit=${limit}`);
  return res?.data ?? [];
}

export async function getTopic(
  slug: string,
  opts: { page?: number; limit?: number } = {},
): Promise<{
  topic: TopicRow;
  documents: Pick<DocumentRow, 'slug' | 'title' | 'source' | 'pdf_url' | 'released_at'>[];
  page: number;
  limit: number;
  pages: number;
} | null> {
  const qs = new URLSearchParams();
  if (opts.page) qs.set('page', String(opts.page));
  if (opts.limit) qs.set('limit', String(opts.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return getJson(`/api/public/topics/${encodeURIComponent(slug)}${suffix}`);
}

export async function listDocuments(params: {
  topic?: string;
  agency?: string;
  page?: number;
  limit?: number;
} = {}): Promise<ListEnvelope<DocumentRow> | null> {
  const qs = new URLSearchParams();
  if (params.topic) qs.set('topic', params.topic);
  if (params.agency) qs.set('agency', params.agency);
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 50));
  return getJson<ListEnvelope<DocumentRow>>(`/api/public/documents?${qs.toString()}`);
}

export async function getDocument(slug: string): Promise<{
  document: DocumentDetail;
  topic: { slug: string; name: string; description: string | null; doc_count: number } | null;
  agency: { slug: string; name: string } | null;
  prev: DocNeighbour;
  next: DocNeighbour;
  related: { slug: string; title: string }[];
} | null> {
  return getJson(`/api/public/documents/${encodeURIComponent(slug)}`);
}

export async function listAgencies(): Promise<AgencyRow[]> {
  const res = await getJson<{ data: AgencyRow[] }>('/api/public/agencies');
  return res?.data ?? [];
}

export async function getAgency(slug: string): Promise<{ agency: AgencyRow; topics: { slug: string; name: string; doc_count: number }[] } | null> {
  return getJson(`/api/public/agencies/${encodeURIComponent(slug)}`);
}

/**
 * Walk the paginated /documents endpoint and return every slug. Used by
 * `generateStaticParams` to prebuild one page per document — capped so
 * Next.js build doesn't OOM on very large corpora.
 */
export async function listAllDocumentSlugs(params: { topic?: string; max?: number; pageSize?: number } = {}): Promise<string[]> {
  const max = params.max ?? 20000;
  const pageSize = params.pageSize ?? 200;
  const out: string[] = [];
  let page = 1;
  while (out.length < max) {
    const res = await listDocuments({ topic: params.topic, page, limit: pageSize });
    const rows = res?.data ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      out.push(r.slug);
      if (out.length >= max) break;
    }
    if (page >= (res?.pages ?? 1)) break;
    page += 1;
  }
  return out;
}

/**
 * Build a lightweight search index of every document — slug + title + topic.
 * Small enough (<2 MB for ~12k docs) to ship as a static JSON and filter
 * client-side on the /search/ page. Called at build time by the search page.
 */
export type SearchIndexEntry = { slug: string; title: string; topic: string | null };

export async function buildSearchIndex(max = 30000, pageSize = 500): Promise<SearchIndexEntry[]> {
  const out: SearchIndexEntry[] = [];
  let page = 1;
  while (out.length < max) {
    const res = await listDocuments({ page, limit: pageSize });
    const rows = res?.data ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      out.push({ slug: r.slug, title: r.title, topic: r.topic_slug });
      if (out.length >= max) break;
    }
    if (page >= (res?.pages ?? 1)) break;
    page += 1;
  }
  return out;
}
