import Link from 'next/link';
import type { Metadata } from 'next';
import { breadcrumbJsonLd, jsonLdString } from '../lib/jsonLd';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms of use for blackvaultdocs.com.',
  alternates: { canonical: '/terms/' },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Terms of Use', path: '/terms/' },
            ]),
          ),
        }}
      />

      <nav aria-label="Breadcrumb" className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">
          home
        </Link>{' '}
        // terms
      </nav>

      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">Terms of Use</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: April 26, 2026</p>

      <div className="mt-8 space-y-8 text-gray-300">
        <section>
          <h2 className="text-xl font-bold text-white">Agreement</h2>
          <p className="mt-3">
            By using <strong>blackvaultdocs.com</strong> (the &quot;Site&quot;), you agree to these Terms.
            If you do not agree, do not use the Site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">What the Site is</h2>
          <p className="mt-3">
            The Site is an <strong>independent index and research aid</strong> for declassified
            records. <strong>Documents are hosted by third parties</strong> (principally the U.S.
            National Archives). We link to authoritative sources and may display metadata and
            summaries. We are <strong>not affiliated with the U.S. government</strong> or the
            National Archives.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Accuracy and AI-assisted text</h2>
          <p className="mt-3">
            Metadata and thematic descriptions may be produced with automated or human-assisted
            workflows and <strong>may contain errors</strong>. Do not rely on the Site as the sole
            source for scholarship, litigation, or publication without verifying against the
            original record.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">No government records guarantee</h2>
          <p className="mt-3">
            Inclusion in the index does not imply completeness of any government release, nor
            confirmation of the authenticity of a third-party-hosted file. Official repositories
            control redactions, withdrawals, and versioning.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Acceptable use</h2>
          <p className="mt-3">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Use the Site unlawfully or to violate others&apos; rights</li>
            <li>Attempt unauthorized access to our systems or APIs</li>
            <li>Overload or disrupt the Site (including abusive automated access)</li>
            <li>Misrepresent the Site as an official government source</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Intellectual property</h2>
          <p className="mt-3">
            Site design, branding, software, and original editorial content are owned by us or our
            licensors. Underlying government works may be in the public domain or subject to
            agency-specific terms; our compilation and presentation may be protected.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Disclaimer of warranties</h2>
          <p className="mt-3">
            THE SITE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, TO THE MAXIMUM EXTENT
            PERMITTED BY LAW.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Limitation of liability</h2>
          <p className="mt-3">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL,
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SITE.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Changes</h2>
          <p className="mt-3">We may update these Terms; continued use constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Contact</h2>
          <p className="mt-3">
            Legal:{' '}
            <a href="mailto:legal@blackvaultdocs.com" className="text-red-400 hover:text-red-300">
              legal@blackvaultdocs.com
            </a>
            . General questions:{' '}
            <Link href="/contact/" className="text-red-400 hover:text-red-300">
              Contact Us
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
