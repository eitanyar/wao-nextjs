import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { isPaidFlowAllowedForRequest } from '@/lib/site-bot/paidFlowGate';

export const metadata: Metadata = {
  robots: { index: false },
};

// Paid-journey v2 M0.5 (B16): the mock checkout page under /site-bot/pay renders ONLY when the
// runtime SITE_BOT_PAID_FLOW gate (src/lib/site-bot/paidFlowGate.ts) allows this request. Closed
// (the production default) 307s every /site-bot/pay/* path to /site-bot before any child renders,
// as the old next.config redirect did. connection() keeps the decision per request.
export default async function SiteBotPayLayout({ children }: { children: ReactNode }) {
  await connection();
  if (await isPaidFlowAllowedForRequest()) {
    return children;
  }
  redirect('/site-bot');
}
