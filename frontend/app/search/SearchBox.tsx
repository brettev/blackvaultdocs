'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SearchIndexEntry } from '../lib/api';

const MAX_RESULTS = 100;

export function SearchBox({ index }: { index: SearchIndexEntry[] }) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<string>('');

  const topics = useMemo(() => {
    const seen = new Map<string, number>();
    for (const row of index) {
      if (!row.topic) continue;
      seen.set(row.topic, (seen.get(row.topic) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }, [index]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2 && !topic) return [];
    const out: SearchIndexEntry[] = [];
    for (const row of index) {
      if (topic && row.topic !== topic) continue;
      if (q.length >= 2) {
        const haystack = `${row.title} ${row.slug}`.toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      out.push(row);
      if (out.length >= MAX_RESULTS) break;
    }
    return out;
  }, [query, topic, index]);

  const showing = query.trim().length >= 2 || topic !== '';

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="bvd-search-q" className="sr-only">
          Search the archive
        </label>
        <input
          id="bvd-search-q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, slugs, NARA IDs…"
          aria-label="Search titles, slugs, and NARA IDs"
          className="flex-1 rounded-md border border-gray-800 bg-gray-950 px-4 py-3 font-mono text-sm text-gray-100 placeholder:text-gray-600 focus:border-red-800 focus:outline-none"
        />
        <label htmlFor="bvd-search-topic" className="sr-only">
          Filter by collection
        </label>
        <select
          id="bvd-search-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="rounded-md border border-gray-800 bg-gray-950 px-3 py-3 font-mono text-sm text-gray-200 focus:border-red-800 focus:outline-none"
        >
          <option value="">All collections</option>
          {topics.map(([slug, n]) => (
            <option key={slug} value={slug}>
              {slug} ({n.toLocaleString()})
            </option>
          ))}
        </select>
      </div>

      {showing ? (
        <p
          className="mt-3 text-xs font-mono uppercase tracking-widest text-gray-500"
          role="status"
          aria-live="polite"
        >
          {results.length === MAX_RESULTS ? 'First ' : ''}
          {results.length.toLocaleString()} result{results.length === 1 ? '' : 's'}
          {topic ? ` in ${topic}` : ''}
          {results.length === MAX_RESULTS ? ' — refine to see more' : ''}
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="mt-4 divide-y divide-gray-800 overflow-hidden rounded-md border border-gray-800 bg-gray-900/40">
          {results.map((r) => (
            <li key={r.slug} className="flex items-center gap-4 px-4 py-3">
              <Link
                href={`/documents/${r.slug}/`}
                className="flex-1 truncate font-mono text-sm text-gray-200 hover:text-white"
              >
                {r.title}
              </Link>
              {r.topic ? (
                <Link
                  href={`/topics/${r.topic}/`}
                  className="font-mono text-xs uppercase tracking-widest text-gray-500 hover:text-gray-300"
                >
                  {r.topic}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : showing ? (
        <div className="mt-4 rounded-md border border-gray-800 bg-gray-900/40 p-6 text-sm text-gray-400">
          No documents match <span className="font-mono text-gray-200">{query}</span>
          {topic ? ` in ${topic}` : ''}. Try broadening the query or removing the
          collection filter.
        </div>
      ) : null}
    </div>
  );
}
