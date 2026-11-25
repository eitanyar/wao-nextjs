import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { SITE_BOT_PLAN, planSummary } from '@/lib/payments/plans';
import { createPendingPlanSubscription } from '@/lib/payments/subscriptions';
import { withServedAreaNames } from '@/lib/site-bot/servedAreas';
import { ISRAELI_LOCALITIES } from '@/lib/site-bot/israeliLocalities';
import { withValidatedOwnerIntake } from '@/lib/site-bot/ownerIntake';
import { interviewSpotHeld } from '@/lib/site-bot/offerState';
import { openSessionFromCookie } from '@/lib/site-bot/interviewFlow';
import { defaultInterviewDeps } from '@/lib/site-bot/interviewDeps';
import { bindInterviewCheckout, cookieFromHeader, interviewReadyForResearch } from '@/lib/site-bot/interviewSession';

// Site-Bot checkout init: the monthly + VAT plan (SITE_BOT_PLAN, the one config source for its price), routed through the
// recurring engine (subscriptions.ts createPendingPlanSubscription). Nothing is charged here: the row is 'pending'
// until the pay page's callback takes the sign-up charge. Reachable only behind SITE_BOT_PAID_FLOW (./route.ts).
// Step 2a (2026-11-25): the caller must hold an open interview session (cookie) for this audit + place that is past the
// contact step (and the work-location question, when asked). The record is the SESSION's server-held collected data, not
// the body's, and the pending file names the session and its research id, so the callback reuses the research that ran
// before payment instead of starting a second one. The session remembers this checkout (bindInterviewCheckout).

/** Per-IP fixed window, same limiter as help-request. */
export const CHECKOUT_INIT_RATE_LIMIT = { maxRequests: 5, windowMs: 10 * 60 * 1000 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorReply(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`sitebot-checkout-init:${ip}`, CHECKOUT_INIT_RATE_LIMIT).allowed) return errorReply('rate_limited', 429);

    const body = await req.json();
    // Launch step 1: the launch cap is enforced here too, so a direct POST cannot skip the interview-start claim.
    if (!(await interviewSpotHeld(body?.auditId, body?.placeId))) return errorReply('no_interview_spot', 409);
    const deps = defaultInterviewDeps();
    const interview = openSessionFromCookie(cookieFromHeader(req.headers.get('cookie')), deps);
    if (!interview || interview.auditId !== String(body?.auditId).toLowerCase() || interview.placeId !== body?.placeId
      || !interviewReadyForResearch(interview) || !interview.domainAt) {
      return errorReply('no_interview_session', 409);
    }
    const submitted: CollectedData | null = interview.collectedData;
    if (!submitted?.businessNiche) return errorReply('invalid_input', 400);
    // M1: served-area localities are derived here from travelBoundary, never trusted from the client.
    // Launch step 1: ownerContact / domainChoice / ownerDomain are re-normalised here; invalid values are dropped.
    const collectedData = withValidatedOwnerIntake(withServedAreaNames(submitted, ISRAELI_LOCALITIES));

    const sessionId = crypto.randomUUID();
    const origin = new URL(req.url).origin;
    // The subscription belongs to the owner: his own email first, the public business email only as a fallback.
    const email = collectedData.ownerContact?.email
      ?? (typeof collectedData.email === 'string' && EMAIL.test(collectedData.email.trim()) ? collectedData.email.trim() : null);
    const { subscriptionId } = await createPendingPlanSubscription({
      plan: SITE_BOT_PLAN,
      userId: email ?? `site-bot:${sessionId}`,
      returnUrl: `${origin}/site-bot/pay/${sessionId}`,
    });

    const pendingDir = path.join(process.cwd(), 'data', 'sites-pending');
    fs.mkdirSync(pendingDir, { recursive: true });
    fs.writeFileSync(
      path.join(pendingDir, `${sessionId}.json`),
      JSON.stringify({
        collectedData, subscriptionId, plan: SITE_BOT_PLAN.id, createdAt: new Date().toISOString(),
        interviewSessionId: interview.id, researchId: interview.researchId,
      }, null, 2)
    );
    if (!deps.withStore(store => bindInterviewCheckout(store, interview.id, sessionId), false)) {
      console.error(`[site-bot checkout] interview bind failed interview=${interview.id}`);
    }

    return NextResponse.json({ sessionId, ...planSummary(SITE_BOT_PLAN) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: unknown) {
    // The detail stays in the server log; the customer only ever gets a code.
    console.error('Site Bot checkout init error:', error);
    return errorReply('checkout_init_failed', 500);
  }
}
