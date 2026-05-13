import Link from 'next/link';
import type { Metadata } from 'next';
import { breadcrumbJsonLd, jsonLdString } from '../lib/jsonLd';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How BlackVaultDocs handles information when you use blackvaultdocs.com — public archives, analytics, and contact forms.',
  alternates: { canonical: '/privacy/' },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Privacy Policy', path: '/privacy/' },
            ]),
          ),
        }}
      />

      <nav aria-label="Breadcrumb" className="text-xs font-mono uppercase tracking-widest text-gray-500">
        <Link href="/" className="hover:text-gray-300">
          home
        </Link>{' '}
        // privacy
      </nav>

      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: April 26, 2026</p>

      <div className="mt-8 space-y-8 text-gray-300">
        <section>
          <h2 className="text-xl font-bold text-white">Overview</h2>
          <p className="mt-3">
            BlackVaultDocs (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates{' '}
            <strong>blackvaultdocs.com</strong> (the &quot;Site&quot;). We index and describe{' '}
            <strong>declassified U.S. government records</strong> that are publicly released by the
            National Archives and related agencies. Individual document files are served from their
            official sources (for example{' '}
            <a
              href="https://www.archives.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400 hover:text-red-300"
            >
              archives.gov
            </a>
            ); we provide metadata, navigation, and thematic context.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Public data and generated content</h2>
          <p className="mt-3">
            Catalog fields, titles, agency names, collection tags, and similar information reflect
            <strong> public releases</strong>. Some descriptive or thematic text on the Site may be
            <strong> machine-assisted</strong> or editorially reviewed summaries intended to help
            researchers navigate large corpora. It may contain errors; always verify against the
            primary document at the National Archives or the releasing authority.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">What we collect from you</h2>
          <p className="mt-3">
            <strong className="text-white">Browsing:</strong> We and our providers may process
            standard server logs (IP, user agent, URLs, timestamps) and may use cookies or similar
            technologies for security, preferences, or aggregate analytics.
          </p>
          <p className="mt-3">
            <strong className="text-white">Newsletter:</strong> If offered, we store the email you
            provide to send updates you request.
          </p>
          <p className="mt-3">
            <strong className="text-white">Contact forms:</strong> If you use{' '}
            <Link href="/contact/" className="text-red-400 hover:text-red-300">
              Contact Us
            </Link>
            , we collect the fields you submit (such as name, email, optional phone, and message)
            and retain them to respond and operate the Site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">How we use data</h2>
          <p className="mt-3">
            We use information to run and secure the Site, respond to inquiries, send optional
            newsletters, comply with law, and understand aggregate traffic. We do not sell your
            personal information as a commodity.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Service providers</h2>
          <p className="mt-3">
            We use vendors for hosting, CDN, email delivery, and databases. They process data under
            appropriate agreements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Retention &amp; security</h2>
          <p className="mt-3">
            We retain submissions as needed for operations and legal compliance, then delete or
            anonymize when appropriate. We use reasonable safeguards; no online service is perfectly
            secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Children</h2>
          <p className="mt-3">
            The Site is not directed at children under 13, and we do not knowingly collect their
            data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Your choices (U.S.)</h2>
          <p className="mt-3">
            You may have rights to access, correct, delete, or opt out of certain processing
            depending on your state. Contact{' '}
            <a href="mailto:privacy@blackvaultdocs.com" className="text-red-400 hover:text-red-300">
              privacy@blackvaultdocs.com
            </a>
            . For general questions, use{' '}
            <Link href="/contact/" className="text-red-400 hover:text-red-300">
              Contact Us
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">International visitors</h2>
          <p className="mt-3">
            If you access the Site from outside the United States, you consent to processing in the
            U.S. and other jurisdictions where we operate.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Changes</h2>
          <p className="mt-3">We may update this policy; the date above will change when we do.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Contact</h2>
          <p className="mt-3">
            Privacy:{' '}
            <a href="mailto:privacy@blackvaultdocs.com" className="text-red-400 hover:text-red-300">
              privacy@blackvaultdocs.com
            </a>
            . General inquiries:{' '}
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
