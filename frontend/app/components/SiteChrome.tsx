import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-3 group" aria-label="BlackVaultDocs home">
          <span aria-hidden="true" className="font-mono text-xs uppercase tracking-[0.3em] text-red-500 group-hover:text-red-400">
            bvd //
          </span>
          <span className="text-lg font-extrabold tracking-tight text-gray-100 group-hover:text-white">
            BlackVaultDocs
          </span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-4 text-sm text-gray-400 sm:gap-5">
          <Link href="/topics/" className="hover:text-gray-100">Collections</Link>
          <Link href="/years/" className="hover:text-gray-100 hidden sm:inline">Years</Link>
          <Link href="/documents/" className="hover:text-gray-100">Documents</Link>
          <Link href="/agencies/" className="hover:text-gray-100 hidden sm:inline">Agencies</Link>
          <Link href="/search/" className="hover:text-gray-100">Search</Link>
          <Link href="/stats/" className="hover:text-gray-100 hidden md:inline">Stats</Link>
          <Link href="/guides/" className="hover:text-gray-100 hidden md:inline">Guides</Link>
          <Link href="/ties/" className="hover:text-gray-100 hidden md:inline">Ties</Link>
          <Link href="/about/" className="hover:text-gray-100 hidden md:inline">About</Link>
          <Link href="/privacy/" className="hover:text-gray-100 hidden lg:inline">Privacy</Link>
          <Link href="/terms/" className="hover:text-gray-100 hidden lg:inline">Terms</Link>
          <Link href="/contact/" className="hover:text-gray-100">Contact</Link>
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
          <div aria-hidden="true" className="font-mono text-xs uppercase tracking-[0.3em] text-red-500">bvd //</div>
          <h2 className="mt-2 text-base font-bold text-gray-100">BlackVaultDocs</h2>
          <p className="mt-2 text-sm text-gray-500">
            A structured index of declassified US government records — JFK, RFK,
            MLK, and other FOIA-released collections. Sourced from public
            archives.gov releases; individual documents are served directly
            from the National Archives.
          </p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-300">Browse</h2>
          <ul className="mt-3 space-y-1">
            <li><Link href="/topics/" className="hover:text-gray-100">All collections</Link></li>
            <li><Link href="/years/" className="hover:text-gray-100">Release years</Link></li>
            <li><Link href="/documents/" className="hover:text-gray-100">All documents</Link></li>
            <li><Link href="/agencies/" className="hover:text-gray-100">Agencies</Link></li>
            <li><Link href="/search/" className="hover:text-gray-100">Search</Link></li>
            <li><Link href="/guides/" className="hover:text-gray-100">Guides</Link></li>
            <li><Link href="/ties/" className="hover:text-gray-100">Ties</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-300">About</h2>
          <ul className="mt-3 space-y-1">
            <li><Link href="/about/" className="hover:text-gray-100">About the archive</Link></li>
            <li><Link href="/privacy/" className="hover:text-gray-100">Privacy Policy</Link></li>
            <li><Link href="/terms/" className="hover:text-gray-100">Terms of Use</Link></li>
            <li><Link href="/accessibility/" className="hover:text-gray-100">Accessibility</Link></li>
            <li><Link href="/contact/" className="hover:text-gray-100">Contact Us</Link></li>
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
