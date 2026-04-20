import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-3 group">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-red-500 group-hover:text-red-400">
            bvd //
          </span>
          <span className="text-lg font-extrabold tracking-tight text-gray-100 group-hover:text-white">
            BlackVaultDocs
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-gray-400">
          <Link href="/topics/" className="hover:text-gray-100">Collections</Link>
          <Link href="/documents/" className="hover:text-gray-100">Documents</Link>
          <Link href="/agencies/" className="hover:text-gray-100">Agencies</Link>
          <Link href="/about/" className="hover:text-gray-100 hidden sm:inline">About</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 text-gray-400 mt-20">
      <div className="mx-auto max-w-6xl px-6 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-red-500">bvd //</div>
          <h4 className="mt-2 text-base font-bold text-gray-100">BlackVaultDocs</h4>
          <p className="mt-2 text-sm text-gray-500">
            A structured index of declassified US government records — JFK, RFK,
            MLK, and other FOIA-released collections. Sourced from public
            archives.gov releases; individual documents are served directly
            from the National Archives.
          </p>
        </div>
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-widest text-gray-300">Browse</h5>
          <ul className="mt-3 space-y-1">
            <li><Link href="/topics/" className="hover:text-gray-100">All collections</Link></li>
            <li><Link href="/documents/" className="hover:text-gray-100">All documents</Link></li>
            <li><Link href="/agencies/" className="hover:text-gray-100">Agencies</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-widest text-gray-300">About</h5>
          <ul className="mt-3 space-y-1">
            <li><Link href="/about/" className="hover:text-gray-100">About the archive</Link></li>
            <li>
              <a href="https://www.archives.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-100">
                National Archives (source)
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-900 text-xs text-gray-600">
        <div className="mx-auto max-w-6xl px-6 py-4">
          © {new Date().getFullYear()} BlackVaultDocs. Not affiliated with any government agency.
        </div>
      </div>
    </footer>
  );
}
