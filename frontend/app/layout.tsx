import { GoogleAnalytics } from '@/app/components/GoogleAnalytics';
import './globals.css';
import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from './components/SiteChrome';
import { jsonLdString, websiteJsonLd } from './lib/jsonLd';

export const metadata: Metadata = {
  metadataBase: new URL('https://blackvaultdocs.com'),
  title: {
    default: 'BlackVaultDocs — Declassified US Government Document Archive',
    template: '%s | BlackVaultDocs',
  },
  description:
    'A structured, searchable archive of declassified US government records — JFK, RFK, MLK, and other FOIA releases from the National Archives.',
  openGraph: {
    type: 'website',
    siteName: 'BlackVaultDocs',
    title: 'BlackVaultDocs — Declassified US Government Document Archive',
    description:
      'Browse JFK, RFK, MLK and other FOIA-released collections indexed from the National Archives.',
    images: [{ url: '/og/home.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BlackVaultDocs',
    description:
      'Declassified US government documents, indexed from the National Archives.',
    images: ['/og/home.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen flex flex-col">
        <GoogleAnalytics />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-red-700 focus:outline-none"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLd()) }}
        />
      </body>
    </html>
  );
}
