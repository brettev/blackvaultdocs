import type { Metadata } from 'next';
import { ContactForm } from '../components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact BlackVaultDocs with questions about the archive or document collections.',
  alternates: { canonical: 'https://blackvaultdocs.com/contact/' },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-100 mb-3">Contact Us</h1>
      <p className="text-gray-400 mb-8 leading-relaxed">
        Questions about the archive, a collection, or a technical issue? Send a note below.
      </p>
      <ContactForm />
    </div>
  );
}
