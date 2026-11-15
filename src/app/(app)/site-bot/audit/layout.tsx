import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { connection } from 'next/server';
import { isPaidFlowAllowedForRequest } from '@/lib/site-bot/paidFlowGate';
import { PaidBuyCtaProvider } from './paidBuyCta';
import { SCORECARD_COPY } from '@/lib/site-bot/scorecardCopy';

// Title = the existing scorecard form title (Yonatan 2026-11-13, anchor audit_title); the root
// template appends the RLM-anchored brand. The page stays noindex.
export const metadata: Metadata = {
  title: SCORECARD_COPY.FORM_TITLE,
  robots: { index: false },
};

// Paid-journey v2 M1 (F1): the audit result shows the buy CTA ONLY when the runtime
// SITE_BOT_PAID_FLOW gate (src/lib/site-bot/paidFlowGate.ts) allows this request ('open', or
// 'rehearsal' with a valid admin cookie). Closed (the production default) returns children
// exactly as the audit-only release does, and <PaidBuyCtaSlot> on the page renders nothing.
// connection() keeps the decision per request instead of baking it in at build time.
export default async function AuditLayout({ children }: { children: ReactNode }) {
  await connection();
  if (await isPaidFlowAllowedForRequest()) {
    return <PaidBuyCtaProvider>{children}</PaidBuyCtaProvider>;
  }
  return children;
}
