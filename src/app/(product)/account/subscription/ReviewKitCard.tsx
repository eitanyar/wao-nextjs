'use client';
// Site-Bot review-request kit card (src/lib/site-bot/reviewKit.ts reviewCardFor). Rendered only when the server built a
// view: active Site-Bot subscription, site live, usable Place ID, approved copy. Every string arrives in `view`; this
// component has zero Hebrew bytes. WAO never messages the end customer: the WhatsApp link has no recipient.
import { useRef, useState } from 'react';
import type { ReviewCardView } from '@/lib/site-bot/reviewKit';

export default function ReviewKitCard({ view }: { view: ReviewCardView }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(view.message);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 4000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-labelledby="review-kit-heading" className="rounded-2xl border border-white/10 bg-white/5 p-6 text-start">
      <h2 id="review-kit-heading" className="text-lg font-bold">{view.heading}</h2>
      <p className="mt-2 text-sm text-[var(--muted)] whitespace-pre-line">{view.intro}</p>
      <p dir="rtl" className="mt-3 rounded-lg border border-white/20 p-3 text-base whitespace-pre-line break-words" data-review-message="true">
        {view.message}
      </p>
      <div className="mt-3 grid gap-2">
        <button type="button" onClick={copyMessage} className="min-h-11 w-full rounded-lg border border-white/20 px-4 py-2 text-base font-semibold">
          {view.copyButton}
        </button>
        <a
          href={view.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-base font-semibold text-black"
        >
          {view.whatsappButton}
        </a>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-green-400">{copied ? view.copiedToast : ''}</p>
      <p className="mt-2 text-xs text-[var(--muted)] whitespace-pre-line">{view.senderNote}</p>
    </section>
  );
}
