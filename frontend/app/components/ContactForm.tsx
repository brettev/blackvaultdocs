'use client';

import { useState } from 'react';

const LEADS_URL =
  process.env.NEXT_PUBLIC_MARKETING_LEADS_URL ??
  'https://api.blackvaultdocs.com/api/public/marketing/leads';

export function ContactForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrMsg(null);
    try {
      const res = await fetch(LEADS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          message: message.trim() || null,
          source: 'contact-page',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus('err');
        setErrMsg(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setStatus('ok');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch {
      setStatus('err');
      setErrMsg('Network error. Please try again.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="bvd-c-first" className="block text-sm font-medium text-gray-300 mb-1">
            First name
          </label>
          <input
            id="bvd-c-first"
            type="text"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div>
          <label htmlFor="bvd-c-last" className="block text-sm font-medium text-gray-300 mb-1">
            Last name
          </label>
          <input
            id="bvd-c-last"
            type="text"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>
      <div>
        <label htmlFor="bvd-c-email" className="block text-sm font-medium text-gray-300 mb-1">
          Email
        </label>
        <input
          id="bvd-c-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>
      <div>
        <label htmlFor="bvd-c-phone" className="block text-sm font-medium text-gray-300 mb-1">
          Phone <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          id="bvd-c-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>
      <div>
        <label htmlFor="bvd-c-msg" className="block text-sm font-medium text-gray-300 mb-1">
          Message
        </label>
        <textarea
          id="bvd-c-msg"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        By submitting, you agree we may email you about your message.
      </p>
      {errMsg ? <p className="text-sm text-red-400">{errMsg}</p> : null}
      {status === 'ok' ? (
        <p className="text-sm text-emerald-400">Thanks — we received your message.</p>
      ) : null}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
      >
        {status === 'loading' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
