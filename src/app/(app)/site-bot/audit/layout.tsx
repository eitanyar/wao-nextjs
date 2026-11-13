import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PaidBuyCtaProvider } from './paidBuyCta';
import { SCORECARD_COPY } from '@/lib/site-bot/scorecardCopy';

// Title = the existing scorecard form title (Yonatan 2026-11-13, anchor audit_title); the root
// template appends the RLM-anchored brand. The page stays noindex.
export const metadata: Metadata = {
  title: SCORECARD_COPY.FORM_TITLE,
  robots: { index: false },
};

// Paid-journey v2 M1 (F1): the audit result shows the buy CTA ONLY when
// SITE_BOT_PAID_FLOW=1 on a non-production server. With the flag unset (prod
// default) this returns children exactly as the audit-only release does, and
// <PaidBuyCtaSlot> on the page renders nothing.
export default function AuditLayout({ children }: { children: ReactNode }) {
  if (process.env.SITE_BOT_PAID_FLOW === '1' && process.env.NODE_ENV !== 'production') {
    return <PaidBuyCtaProvider>{children}</PaidBuyCtaProvider>;
  }
  return children;
}
