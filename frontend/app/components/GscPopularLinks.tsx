import Link from 'next/link';
import gscPopular from '../lib/gsc-popular-data';

export default function GscPopularLinks() {
  const pages = gscPopular.popularPages.slice(0, 8);
  if (!pages.length) return null;

  return (
    <section className="mt-10 rounded-lg border border-gray-800 bg-gray-900/40 p-6">
      <h2 className="text-lg font-bold text-white">Frequently searched records</h2>
      <p className="mt-1 text-sm text-gray-400">NARA IDs and collections with the highest Google impressions.</p>
      <ul className="mt-4 space-y-2">
        {pages.map((p) => (
          <li key={p.path}>
            <Link href={p.path} className="text-sm text-red-400 hover:underline">
              {p.path}
            </Link>
            <span className="ml-2 text-xs text-gray-500">{p.impressions.toLocaleString()} imp</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
