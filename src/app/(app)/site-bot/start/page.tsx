import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { isPaidFlowAllowedForRequest } from '@/lib/site-bot/paidFlowGate';
import { auditResultPath, interviewStartDecision } from '@/lib/site-bot/offerState';
import StartPaidFlow from './StartPaidFlow';

export const metadata: Metadata = {
  robots: { index: false },
};

// Paid-journey v2: the intake chat (./StartPaidFlow) renders ONLY when the runtime
// SITE_BOT_PAID_FLOW gate (src/lib/site-bot/paidFlowGate.ts) allows this request. Closed (the
// production default) 307s to /site-bot, as the old next.config redirect did. connection() makes
// the page render per request, so the gate is never answered once at build time.
// Launch step 1: with the gate open the interview also needs a confirmed, eligible free check and a
// launch-cap spot (src/lib/site-bot/offerState.ts, read-only here; the spot is claimed by
// POST /api/site-bot/interview-start). Otherwise 307 to the audit result, which shows the owner his
// waiting list or block; no audit at all goes to the free check. Props are read only after the gate.
export default async function SiteBotStartPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  if (await isPaidFlowAllowedForRequest()) {
    const query = await props.searchParams;
    const auditId = typeof query.auditId === 'string' ? query.auditId : undefined;
    const placeId = typeof query.placeId === 'string' ? query.placeId : undefined;
    const decision = await interviewStartDecision(auditId, placeId);
    if (decision.kind === 'allowed') return <StartPaidFlow />;
    redirect(decision.kind === 'blocked' && auditId && placeId ? auditResultPath(auditId, placeId) : '/site-bot/audit');
  }
  redirect('/site-bot');
}
