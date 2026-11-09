'use client';

import { createContext, useContext, type ReactNode } from 'react';
import Link from 'next/link';
import { INTAKE_COPY } from '@/lib/site-bot/intakeCopy';

// Paid-journey v2 M1 (F1): the "build my site" CTA on the confirmed audit result.
// The audit page renders <PaidBuyCtaSlot>, which renders NOTHING unless the audit
// layout wrapped the page in <PaidBuyCtaProvider>, and the layout does that ONLY
// when SITE_BOT_PAID_FLOW=1 on a non-production server. With the flag unset (prod
// default) the provider is never rendered, the slot returns null and the audit
// result markup is byte-identical to the audit-only release.

const PaidBuyCtaContext = createContext(false);

export function PaidBuyCtaProvider({ children }: { children: ReactNode }) {
  return <PaidBuyCtaContext.Provider value={true}>{children}</PaidBuyCtaContext.Provider>;
}

export function paidBuyCtaHref(auditId: string, placeId: string): string {
  return `/site-bot/start?${new URLSearchParams({ auditId, placeId }).toString()}`;
}

export function PaidBuyCtaSlot({ auditId, placeId }: { auditId?: string; placeId?: string }) {
  const enabled = useContext(PaidBuyCtaContext);
  if (!enabled || !auditId || !placeId) return null;
  return (
    <div data-paid-buy-cta="true" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '20px', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
      <Link href={paidBuyCtaHref(auditId, placeId)} className="btn-primary" style={{ justifyContent: 'center', padding: '14px 24px', textAlign: 'center' }}>
        {INTAKE_COPY.M1_CTA_LABEL}
      </Link>
      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--muted)' }}>{INTAKE_COPY.M1_CTA_SUBLINE}</p>
    </div>
  );
}
