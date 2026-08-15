import Link from 'next/link';
import { listRelatedTies } from '../lib/aiCopy';

export default function RelatedTies({
  pathname,
  title = 'Related ties',
}: {
  pathname: string;
  title?: string;
}) {
  const items = listRelatedTies(pathname);
  if (!items.length) return null;
  return (
    <section className="mb-10 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-3">{title}</h2>
      <ul className="space-y-2">
        {items.map((copy) => (
          <li key={copy.slug}>
            <Link href={copy.canonicalPath} className="text-gray-200 hover:text-red-400">
              {copy.h1 || copy.title}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm">
        <Link href="/ties/" className="text-gray-500 hover:text-gray-100">
          All archive ties →
        </Link>
      </p>
    </section>
  );
}
