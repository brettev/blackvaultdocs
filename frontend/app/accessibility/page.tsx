import Link from 'next/link';
import type { Metadata } from 'next';
import { breadcrumbJsonLd, jsonLdString } from '../lib/jsonLd';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Accessibility Statement',
  description:
    'Our commitment to making blackvaultdocs.com accessible to everyone. We strive to meet WCAG 2.1 Level AA.',
  alternates: { canonical: '/accessibility/' },
};

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Accessibility', path: '/accessibility/' },
            ]),
          ),
        }}
      />

      <nav className="text-xs font-mono uppercase tracking-widest text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-gray-300">
          home
        </Link>{' '}
        // accessibility
      </nav>

      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">
        Accessibility Statement
      </h1>

      <div className="mt-8 space-y-8 text-gray-300">
        <p>
          BlackVaultDocs is committed to making our website accessible to as
          many people as possible, including people with disabilities. We
          strive to meet{' '}
          <a
            href="https://www.w3.org/WAI/WCAG21/quickref/?versions=2.1&levels=aa"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 hover:text-red-300"
          >
            Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
          </a>{' '}
          across our site.
        </p>

        <section>
          <h2 className="text-xl font-bold text-white">What we do</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              We design new pages with accessibility in mind &mdash; keyboard
              navigation, semantic HTML, sufficient color contrast, and clear
              focus indicators.
            </li>
            <li>
              We run automated accessibility audits (
              <code className="font-mono text-gray-100">axe-core</code> and{' '}
              <code className="font-mono text-gray-100">Pa11y</code>) against
              the site on a regular cadence.
            </li>
            <li>
              When we are made aware of an accessibility issue, we work to
              address it as part of our ongoing maintenance.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">What we cannot promise</h2>
          <p className="mt-3">
            Accessibility is an ongoing effort, not a finish line. Despite our
            best efforts:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              Some older content may not yet meet our current accessibility
              standards.
            </li>
            <li>
              Third-party content (PDF documents hosted by the National
              Archives, embeds, or other external material) may have
              accessibility limitations outside our direct control. Original
              declassified PDFs are served from{' '}
              <a
                href="https://www.archives.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-300"
              >
                archives.gov
              </a>{' '}
              and may include scanned imagery without OCR text.
            </li>
            <li>
              New issues may be introduced when we add features or content;
              our automated audits help catch these but are not exhaustive.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">How to report a problem</h2>
          <p className="mt-3">
            If you encounter an accessibility barrier on BlackVaultDocs, please
            let us know so we can fix it.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-white">Email:</strong>{' '}
              <a
                href="mailto:privacy@blackvaultdocs.com"
                className="text-red-400 hover:text-red-300"
              >
                privacy@blackvaultdocs.com
              </a>
            </li>
            <li>
              <strong className="text-white">What to include:</strong> the
              page URL, the device and browser/assistive technology you were
              using, and a description of the issue.
            </li>
          </ul>
          <p className="mt-3">
            We aim to respond to accessibility reports within a reasonable
            timeframe and work toward a resolution. Reporting an issue does
            not waive any rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white">Standards and approach</h2>
          <p className="mt-3">
            This site targets <strong className="text-white">WCAG 2.1 Level AA</strong>.
            The Web Content Accessibility Guidelines define how to make web
            content more accessible to people with disabilities &mdash;
            including blindness and low vision, deafness and hearing loss,
            limited movement, speech disabilities, photosensitivity, and
            combinations of these.
          </p>
        </section>

        <p className="text-sm text-gray-500">
          <em>
            This statement was last reviewed on{' '}
            <strong className="text-gray-300">2026-05-01</strong>.
          </em>
        </p>
      </div>

      <p className="mt-12 text-sm text-gray-500">
        <Link href="/privacy/" className="hover:text-gray-300">
          Privacy Policy
        </Link>
        {' · '}
        <Link href="/terms/" className="hover:text-gray-300">
          Terms of Use
        </Link>
        {' · '}
        <Link href="/contact/" className="hover:text-gray-300">
          Contact
        </Link>
      </p>
    </div>
  );
}
