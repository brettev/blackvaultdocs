export type GaEventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: 'event' | 'config' | 'js' | 'set', ...args: unknown[]) => void;
  }
}

export function gaEvent(name: string, params?: GaEventParams): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params ?? {});
}

export function trackGenerateLead(p: { form_id: string; source?: string }): void {
  gaEvent('generate_lead', {
    form_id: p.form_id,
    ...(p.source ? { form_destination: p.source } : {}),
  });
}

export function trackSignUp(p: { method?: string; brand?: string }): void {
  gaEvent('sign_up', {
    method: p.method ?? 'email',
    ...(p.brand ? { item_brand: p.brand } : {}),
  });
}
