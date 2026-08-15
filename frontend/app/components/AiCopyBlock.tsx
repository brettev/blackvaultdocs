import Link from 'next/link';
import type { AiCopy } from '../lib/aiCopy';
import { jsonLdString } from '../lib/jsonLd';

export default function AiCopyBlock({
  copy,
  variant = 'full',
}: {
  copy: AiCopy;
  variant?: 'full' | 'overlay';
}) {
  const sections = variant === 'overlay' ? copy.sections.slice(0, 2) : copy.sections;
  const faqs = copy.faqs || [];
  const faqLd = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  return (
    <div className="mb-10">
      {faqLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqLd) }} />
      ) : null}
      {variant === 'full' ? (
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-100 mb-4">{copy.h1}</h1>
      ) : null}
      <p className="text-gray-300 leading-relaxed text-lg mb-6">{copy.lede}</p>
      {copy.takeaways?.length ? (
        <section className="mb-8 rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-3">Key figures</h2>
          <ul className="space-y-2 text-gray-300 text-sm">
            {copy.takeaways.map((t) => (
              <li key={t} className="pl-4 border-l-2 border-red-500/70">{t}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {sections.map((s) => (
        <section key={s.h2} className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-gray-100">{s.h2}</h2>
          {s.paragraphs.map((p) => (
            <p key={p.slice(0, 48)} className="text-gray-300 leading-relaxed mb-3">{p}</p>
          ))}
        </section>
      ))}
      {variant === 'overlay' && copy.canonicalPath ? (
        <p className="mb-8">
          <Link href={copy.canonicalPath} className="text-red-400 hover:text-red-300 font-medium">
            Full analysis: {copy.h1} →
          </Link>
        </p>
      ) : null}
      {faqs.length ? (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-100">Questions</h2>
          <dl className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold text-red-400">{f.q}</dt>
                <dd className="mt-1 text-sm text-gray-400 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {variant === 'full' && copy.internalLinks?.length ? (
        <nav className="mb-6 text-sm">
          <h2 className="text-xl font-bold mb-3">Related records</h2>
          <ul className="flex flex-wrap gap-3">
            {copy.internalLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="px-3 py-1.5 rounded border border-gray-800 hover:border-red-500/50 hover:text-red-400">
                  {l.anchor}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <p className="text-xs text-gray-500">{copy.sourceNote}</p>
    </div>
  );
}
