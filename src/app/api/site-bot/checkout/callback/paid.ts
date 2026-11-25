import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import { activatePlanSubscription, issueAccountPath } from '@/lib/payments/subscriptions';
import { readResearchDossier } from '@/lib/site-bot/research/researchStore';
import { runSiteResearch, type SiteResearchInput } from '@/lib/site-bot/research/runResearch';
import { completePaidCheckoutResearch } from '@/lib/site-bot/checkout/researchCompletion';
import { buildSiteResearchInput } from '@/lib/site-bot/research/researchInput';
import { linkSiteBotSession } from '@/lib/site-bot/clientMessages';
import { sendPaidQueueAlert } from '@/lib/site-bot/paidQueueAlert';
import { recordShowcaseConsent } from '@/lib/showcase/consentStore';
import { recordPaidSignup, withLaunchStore } from '@/lib/site-bot/launchStore';
import { markInterviewPaid, sessionForCheckout } from '@/lib/site-bot/interviewSession';
import { inFlightInterviewResearch } from '@/lib/site-bot/interviewResearch';
import { startPaidSiteGeneration } from '@/lib/site-bot/interviewPreview';

// Site-Bot checkout callback: takes the sign-up charge of the monthly + VAT plan (SITE_BOT_PLAN) through the recurring engine
// (activatePlanSubscription: first charge, billing anchor, next charge date, invoice), then starts the research.
// Error replies are codes only; the detail goes to the server log, never to the customer.
// On a fresh activation the reply carries `manageUrl`: a same-origin magic-link path to /account/subscription, so the
// pay-success state can link straight to self-serve cancel (single-use token, 30 minutes; the account page offers a new
// link by email after that). Replays (dossier exists / already active) get no new token.
// Showcase consent (2026-11-17): optional `showcaseConsent: true` from the pay page's unticked-by-default checkbox. It is
// recorded (source 'checkout') only after the charge succeeded and never affects the charge or the reply; anything but
// `true` records nothing (no record = not granted).
// Charge state on every error reply (2026-11-20, post-payment screen): `chargeState` tells the pay page which error text
// it may show. 'not_charged' = this call provably took no money (rejected before the charge, or the provider declined it),
// so a retry is safe; 'charged' = the sign-up charge succeeded and a later step failed (never offer a retry);
// 'unknown' = an exception inside the activation itself (the page shows the unknown-state text, no retry).
// Step 2a (2026-11-25): the research runs BEFORE payment, keyed by the interview session (interviewResearch.ts). A pending
// record from checkout/init names that session and its research id; after the charge the callback REUSES it (awaits this
// process's in-flight run, else reads the dossier) and never starts a second runSiteResearch for it. The post-pay
// research start below stays only as the fallback for a session with no research id. The owner research gates are asked
// inside the interview now (interview-gates), so the reply no longer hands any gate to the pay page. A replay of a
// completed interview checkout (pending file gone) is answered from the interview session the checkout is bound to.
// Step 2c (2026-11-25): after the research is reused, the callback starts the generation of the REMAINING pages in the
// background (interviewPreview.startSiteGeneration: once per session, claimed on the session). The homepage is the preview
// the owner saw and paid on (pending.preview.round), reused byte for byte and never regenerated. The record goes to the
// existing review path (sites dir, no approved review packet): deploy/route.ts refuses it until staff approve the packet.
// The reply never waits for it; paidSignup still fires once (fresh activation only).

interface PendingRecord {
  collectedData: CollectedData;
  subscriptionId?: string;
  createdAt: string;
  /** Step 2a: the interview session this checkout came from, and its research id (null: research never started). */
  interviewSessionId?: string;
  researchId?: string | null;
  /** Step 2c: the home-page preview round the owner paid on. */
  preview?: { round: number; createdAt: string };
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

/** The interview's research, reused: this process's in-flight run settles first, then the dossier is read. */
async function reuseInterviewResearch(researchId: string, collectedData: CollectedData) {
  await inFlightInterviewResearch(researchId);
  const dossier = await readResearchDossier(researchId);
  if (dossier) return { dossier };
  // The pre-payment run left no dossier at all (the process stopped before its first write): the same research id is
  // resumed, never a new one (runSiteResearch is resumable and its usage ledger de-duplicates).
  console.error(`[site-bot checkout] interview research had no dossier; resuming research=${researchId}`);
  return runSiteResearch(researchId, buildSiteResearchInput(`interview:${researchId}`, collectedData, () => new Date(), researchId));
}

function researchInput(sessionId: string, collectedData: CollectedData): SiteResearchInput {
  return buildSiteResearchInput(`checkout:${sessionId}`, collectedData, () => new Date(), sessionId);
}

export type CheckoutChargeState = 'not_charged' | 'charged' | 'unknown';

function errorReply(error: string, status: number, chargeState: CheckoutChargeState, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, chargeState, ...extra }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  let chargeState: CheckoutChargeState = 'not_charged';
  try {
    const body = await req.json();
    const sessionId: string = body?.sessionId;
    // sessionId becomes a file name under data/sites-pending/ — accept only the UUIDs that checkout/init mints.
    if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      return errorReply('invalid_input', 400, 'not_charged');
    }

    const existingDossier = await readResearchDossier(sessionId);
    if (existingDossier) {
      return NextResponse.json({
        success: true,
        charged: true,
        researchId: sessionId,
        status: existingDossier.status,
      });
    }

    const pendingPath = path.join(process.cwd(), 'data', 'sites-pending', `${sessionId}.json`);
    let pending: PendingRecord;
    try {
      pending = JSON.parse(fs.readFileSync(pendingPath, 'utf-8'));
    } catch {
      // Step 2a replay: a completed interview checkout removed its pending file; the interview session remembers it.
      const paidInterview = withLaunchStore(store => sessionForCheckout(store, sessionId), null);
      if (paidInterview?.status === 'paid' && paidInterview.researchId) {
        const dossier = await readResearchDossier(paidInterview.researchId);
        if (dossier) return NextResponse.json({ success: true, charged: true, researchId: paidInterview.researchId, status: dossier.status });
      }
      return errorReply('session_not_found', 404, 'not_charged');
    }
    if (!pending.subscriptionId) {
      console.error(`[site-bot checkout] session=${sessionId} has no subscriptionId (pre-plan pending record)`);
      return errorReply('session_not_found', 404, 'not_charged');
    }

    chargeState = 'unknown';
    const activation = await activatePlanSubscription(pending.subscriptionId, { sessionId });
    // A non-ok activation took no money in this call (callback rejected, no pending subscription, or charge declined).
    chargeState = activation.ok ? 'charged' : 'not_charged';
    if (!activation.ok) {
      console.error(`[site-bot checkout] activation failed session=${sessionId} subscription=${pending.subscriptionId}:`, activation);
      if (activation.reason === 'charge_failed') return errorReply('charge_failed', 402, 'not_charged', { retryable: activation.retryable === true });
      if (activation.reason === 'callback_invalid') return errorReply('payment_verification_failed', 402, 'not_charged');
      return errorReply('checkout_failed', 409, 'not_charged');
    }

    // Support queue (2026-11-13): remember which business this subscription is for, once (fresh and alreadyActive paths).
    // A failure here must never fail the checkout.
    try {
      linkSiteBotSession({
        subscriptionId: pending.subscriptionId,
        sessionId,
        businessName: pending.collectedData?.businessName ?? null,
        ownerMobile: pending.collectedData?.ownerContact?.mobile ?? null,
        now: new Date(),
      });
    } catch {
      console.error(`[site-bot checkout] session link failed session=${sessionId}`);
    }

    if (body?.showcaseConsent === true) {
      try {
        recordShowcaseConsent({ accountId: pending.subscriptionId, product: 'site-bot', source: 'checkout' });
      } catch {
        console.error(`[site-bot checkout] showcase consent record failed session=${sessionId}`);
      }
    }

    // Paid-queue alert (launch item 8): once per fresh activation, before the research, never awaited or fatal.
    if (!activation.alreadyActive) {
      void sendPaidQueueAlert({ sessionId, subscriptionId: pending.subscriptionId, collectedData: pending.collectedData, paidAt: new Date() });
      // Launch step 1: the paid sign-up counts toward the launch cap (SITE_BOT_CAP_TOTAL), once per session. Never fatal.
      const counted = withLaunchStore(store => recordPaidSignup(store, sessionId), { status: 'unavailable' as const });
      if (counted.status === 'unavailable') console.error(`[site-bot checkout] launch cap count failed session=${sessionId}`);
    }

    // Step 2a: the interview is paid (no expiry, no reminder from here on). Never fatal.
    if (typeof pending.interviewSessionId === 'string') {
      const interviewId = pending.interviewSessionId;
      if (!withLaunchStore(store => markInterviewPaid(store, interviewId), false)) {
        console.error(`[site-bot checkout] interview not marked paid interview=${interviewId} session=${sessionId}`);
      }
    }

    const manageUrl = activation.alreadyActive ? undefined : issueAccountPath(pending.subscriptionId);
    const interviewResearchId = typeof pending.researchId === 'string' && OPAQUE_ID.test(pending.researchId) ? pending.researchId : null;
    const response = await completePaidCheckoutResearch({
      sessionId,
      ...(interviewResearchId ? { researchId: interviewResearchId } : {}),
      runResearch: interviewResearchId
        ? () => reuseInterviewResearch(interviewResearchId, pending.collectedData)
        // Fallback: a session with no research (none started before payment), the pre-2a post-pay start.
        : () => runSiteResearch(sessionId, researchInput(sessionId, pending.collectedData)),
      openResearchGateCount: 0,
      collectedData: pending.collectedData,
      removePending: () => fs.rmSync(pendingPath, { force: true }),
    });
    // Step 2c: the remaining pages, in the background (never awaited, never fatal; a failure alerts staff).
    if (typeof pending.interviewSessionId === 'string' && pending.preview && Number.isInteger(pending.preview.round)) {
      try {
        const started = startPaidSiteGeneration(pending.interviewSessionId, pending.preview.round);
        if (started === 'not_ready') console.error(`[site-bot checkout] remaining pages not started session=${sessionId}`);
      } catch {
        console.error(`[site-bot checkout] remaining pages start failed session=${sessionId}`);
      }
    }
    // paidSignup: a fresh activation, so the pay page fires site_bot_paid_signup (once per session; replays carry none).
    return NextResponse.json(manageUrl ? { ...response, manageUrl, paidSignup: true } : response, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: unknown) {
    console.error('Site Bot checkout callback error:', error);
    return errorReply('checkout_failed', 500, chargeState);
  }
}
