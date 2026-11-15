import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { isPaidFlowAllowedForRequest } from '@/lib/site-bot/paidFlowGate';
import StartPaidFlow from './StartPaidFlow';

export const metadata: Metadata = {
  robots: { index: false },
};

// Paid-journey v2: the intake chat (./StartPaidFlow) renders ONLY when the runtime
// SITE_BOT_PAID_FLOW gate (src/lib/site-bot/paidFlowGate.ts) allows this request. Closed (the
// production default) 307s to /site-bot, as the old next.config redirect did. connection() makes
// the page render per request, so the gate is never answered once at build time.
export default async function SiteBotStartPage() {
  await connection();
  if (await isPaidFlowAllowedForRequest()) {
    return <StartPaidFlow />;
  }
  redirect('/site-bot');
}
