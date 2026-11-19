import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import { activatePlanSubscription, issueAccountPath } from '@/lib/payments/subscriptions';
import { deriveOpenResearchGates } from '@/lib/site-bot/research/gates';
import { recordOwnerResearchGates } from '@/lib/site-bot/research/ownerGates';
import { readResearchDossier } from '@/lib/site-bot/research/researchStore';
import { runSiteResearch, type SiteResearchInput } from '@/lib/site-bot/research/runResearch';
import { completePaidCheckoutResearch } from '@/lib/site-bot/checkout/researchCompletion';
import { buildSiteResearchInput } from '@/lib/site-bot/research/researchInput';
import { linkSiteBotSession } from '@/lib/site-bot/clientMessages';
import { sendPaidQueueAlert } from '@/lib/site-bot/paidQueueAlert';
import { recordShowcaseConsent } from '@/lib/showcase/consentStore';

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
// 'unknown' = an exception inside the activation itself (the page treats it as charged).

interface PendingRecord {
  collectedData: CollectedData;
  subscriptionId?: string;
  createdAt: string;
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
    }

    const manageUrl = activation.alreadyActive ? undefined : issueAccountPath(pending.subscriptionId);
    const openResearchGates = deriveOpenResearchGates(sessionId, pending.collectedData);
    const response = await completePaidCheckoutResearch({
      sessionId,
      runResearch: () => runSiteResearch(sessionId, researchInput(sessionId, pending.collectedData)),
      openResearchGateCount: openResearchGates.length,
      collectedData: pending.collectedData,
      openResearchGates,
      removePending: () => fs.rmSync(pendingPath, { force: true }),
    });
    // F2: the pay page shows only the gates recorded as owner-answerable in the dossier (the public gates POST accepts
    // nothing else). A record failure is logged and the owner goes straight to the done state; never fatal.
    if (Array.isArray(response.openResearchGates) && response.openResearchGates.length > 0) {
      let recorded: typeof response.openResearchGates = [];
      try {
        recorded = await recordOwnerResearchGates(sessionId, response.openResearchGates);
      } catch {
        recorded = [];
      }
      if (recorded.length !== response.openResearchGates.length) {
        console.error(`[site-bot checkout] owner gates recorded ${recorded.length}/${response.openResearchGates.length} session=${sessionId}`);
      }
      response.openResearchGates = recorded;
    }
    return NextResponse.json(manageUrl ? { ...response, manageUrl } : response, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: unknown) {
    console.error('Site Bot checkout callback error:', error);
    return errorReply('checkout_failed', 500, chargeState);
  }
}
