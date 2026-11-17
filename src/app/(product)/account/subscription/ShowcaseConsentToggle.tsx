'use client';
// Showcase consent toggle on the (Hebrew, RTL) account page (terms section 10 showcase sub-clause, approved 2026-11-17).
// Every string is approved Hebrew read from consentCopy.generated.ts (docs/legal/showcase-consent-legal-FINAL-2026-11-17.json)
// or accountCopy.ts; this component has zero Hebrew bytes. Off -> on records a grant (source 'account'); on -> off
// records the withdrawal at once and shows the after-off notice. The server answers with the stored state.
import { useEffect, useState } from 'react';
import { renderMixed } from '@/lib/bidi';
import { CARD_UPDATE_BUTTON_COPY } from '@/lib/payments/accountCopy';
import { SHOWCASE_CONSENT_COPY } from '@/lib/showcase/consentCopy.generated';
import { SUBSCRIPTION_CANCELED_EVENT } from './accountEvents';

const COPY = SHOWCASE_CONSENT_COPY.accountToggle;

export function ShowcaseConsentView({
  granted,
  busy,
  notice,
  error,
  onToggle,
}: {
  granted: boolean;
  busy: boolean;
  notice: boolean;
  error: string | null;
  onToggle: () => void;
}) {
  return (
    <section aria-labelledby="showcase-consent-label" className="rounded-2xl border border-white/10 bg-white/5 p-6 text-start" data-showcase-toggle={granted ? 'on' : 'off'}>
      <div className="flex items-center justify-between gap-4">
        <h2 id="showcase-consent-label" className="text-base font-bold">{renderMixed(COPY.label)}</h2>
        <button
          type="button"
          role="switch"
          aria-checked={granted}
          aria-labelledby="showcase-consent-label"
          aria-describedby="showcase-consent-state"
          disabled={busy}
          onClick={onToggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60 ${granted ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-white/30 bg-white/10'}`}
        >
          {/* Knob: start edge when off, end edge when on (logical properties keep it right in RTL). */}
          <span aria-hidden="true" className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-all ${granted ? 'end-1' : 'start-1'}`} />
        </button>
      </div>
      <p id="showcase-consent-state" className="mt-2 text-sm text-[var(--muted)]">{renderMixed(granted ? COPY.onState : COPY.offState)}</p>
      <p role="status" aria-live="polite" className="mt-2 text-sm">
        {error ? <span className="text-red-400">{renderMixed(error)}</span> : notice && !granted ? renderMixed(COPY.afterOffNotice) : null}
      </p>
    </section>
  );
}

export default function ShowcaseConsentToggle({ token, initialGranted }: { token: string; initialGranted: boolean }) {
  const [granted, setGranted] = useState(initialGranted);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A cancel on this page withdraws the consent on the server (cancel route); mirror it and lock the switch.
  const [canceledHere, setCanceledHere] = useState(false);

  useEffect(() => {
    const onCanceled = () => { setCanceledHere(true); setGranted(false); setNotice(false); };
    window.addEventListener(SUBSCRIPTION_CANCELED_EVENT, onCanceled);
    return () => window.removeEventListener(SUBSCRIPTION_CANCELED_EVENT, onCanceled);
  }, []);

  async function toggle() {
    if (busy || canceledHere) return;
    const next = !granted;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/showcase/consent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ token, granted: next }),
      });
      const payload = await response.json().catch(() => null) as { ok?: boolean; granted?: boolean } | null;
      if (!response.ok || payload?.ok !== true || typeof payload.granted !== 'boolean') throw new Error(String(response.status));
      setGranted(payload.granted);
      setNotice(!payload.granted && granted);
    } catch {
      setError(CARD_UPDATE_BUTTON_COPY.errorGenericNoBox);
    } finally {
      setBusy(false);
    }
  }

  return <ShowcaseConsentView granted={granted} busy={busy || canceledHere} notice={notice} error={error} onToggle={toggle} />;
}
