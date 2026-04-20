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
  },
  twitter: {
    card: 'summary',
    title: 'BlackVaultDocs',
    description:
      'Declassified US government documents, indexed from the National Archives.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLd()) }}
        />
      </body>
    </html>
  );
}
