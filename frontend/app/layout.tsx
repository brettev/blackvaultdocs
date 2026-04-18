import './globals.css';
export const metadata = {
  title: 'BlackVaultDocs - Declassified Document Archive',
  description: 'Structured search and LLM-powered analysis over declassified US government documents, FOIA releases, and open intelligence disclosures.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
