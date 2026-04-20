import Link from 'next/link';
import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'About',
  description:
    'BlackVaultDocs is a structured, machine-readable index of declassified US government records — JFK, RFK, MLK, and other FOIA releases from the National Archives.',
  alternates: { canonical: '/about/' },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <nav className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">home</Link> // about
      </nav>

      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">
        About BlackVaultDocs
      </h1>

      <p className="mt-6 text-gray-300">
        BlackVaultDocs is an open, machine-readable index of declassified US
        government records. The archive catalogues documents released through
        FOIA, special disclosure statutes (like the JFK Records Act), and
        executive-order-driven releases.
      </p>

      <h2 className="mt-10 text-xl font-bold text-white">Where the documents come from</h2>
      <p className="mt-3 text-gray-300">
        Every document indexed here is hosted at its original source — the
        National Archives at <a href="https://www.archives.gov/" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300">archives.gov</a>.
        We do not rehost or mirror any files. Instead, we extract canonical
        metadata (record identifier, collection, agency, release date where
        available) and provide deep-links so researchers can always see the
        primary source.
      </p>

      <h2 className="mt-10 text-xl font-bold text-white">Why this archive exists</h2>
      <p className="mt-3 text-gray-300">
        Government release pages are PDF-heavy and search-hostile. A raw
        directory of 2,000 files named <code className="text-gray-100">104-10414-10124.pdf</code> is
        hard to reference, link, or reason about. BlackVaultDocs turns those
        releases into structured data: each record gets a canonical URL, a
        collection tag, and an agency — so the corpus is usable by
        researchers, journalists, and machines alike.
      </p>

      <h2 className="mt-10 text-xl font-bold text-white">Corrections and additions</h2>
      <p className="mt-3 text-gray-300">
        Found a mislabeled record or know of a collection we should ingest?
        Reach out and we&apos;ll add it. Priority collections include FBI Vault
        FOIA releases, CIA CREST, DOJ OIG reports, and State Department
        declassified cables.
      </p>

      <p className="mt-10 text-sm text-gray-500">
        BlackVaultDocs is not affiliated with any US government agency or with
        The Black Vault (theblackvault.com).
      </p>
    </main>
  );
}
