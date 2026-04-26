import Script from 'next/script';
import { GA4_MEASUREMENT_ID } from '@/app/lib/ga-constants';

export function GoogleAnalytics() {
  if (!GA4_MEASUREMENT_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA4_MEASUREMENT_ID}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}
