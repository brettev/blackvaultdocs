import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  alternates: { canonical: null },
};

const BOOTSTRAP = `
(function () {
  var p = location.pathname;
  var base = 'https://blackvaultdocs.com';
  var canonical = null;
  var robots = null;
  if (/^\\/documents\\/([a-z0-9][a-z0-9-]*)\\/?$/i.test(p)) {
    canonical = base + p.replace(/\\/?$/, '/');
  } else if (
    /^\\/(figures|topics|agencies|years|nara)\\/[^/]+\\/?$/i.test(p)
  ) {
    robots = 'noindex,nofollow';
  } else {
    robots = 'noindex,nofollow';
  }
  if (robots) {
    var m = document.createElement('meta');
    m.name = 'robots';
    m.content = robots;
    document.head.appendChild(m);
  }
  if (canonical) {
    document.querySelectorAll('link[rel="canonical"]').forEach(function (l) {
      l.remove();
    });
    var l = document.createElement('link');
    l.rel = 'canonical';
    l.href = canonical;
    document.head.appendChild(l);
  }
})();
`;

export default function DocumentsDynamicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script id="bvd-fallback-bootstrap" strategy="beforeInteractive">
        {BOOTSTRAP}
      </Script>
      {children}
    </>
  );
}
