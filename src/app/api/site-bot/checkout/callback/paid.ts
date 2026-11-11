import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import { activatePlanSubscription, issueAccountPath } from '@/lib/payments/subscriptions';
import { deriveOpenResearchGates } from '@/lib/site-bot/research/gates';
import { readResearchDossier } from '@/lib/site-bot/research/researchStore';
import { runSiteResearch, type SiteResearchInput } from '@/lib/site-bot/research/runResearch';
import { completePaidCheckoutResearch } from '@/lib/site-bot/checkout/researchCompletion';
import { buildSiteResearchInput } from '@/lib/site-bot/research/researchInput';

// Site-Bot checkout callback: takes the sign-up charge of the monthly + VAT plan (SITE_BOT_PLAN) through the recurring engine
// (activatePlanSubscription: first charge, billing anchor, next charge date, invoice), then starts the research.
// Error replies are codes only; the detail goes to the server log, never to the customer.
// On a fresh activation the reply carries `manageUrl`: a same-origin magic-link path to /account/subscription, so the
// pay-success state can link straight to self-serve cancel (single-use token, 30 minutes; the account page offers a new
// link by email after that). Replays (dossier exists / already active) get no new token.

interface PendingRecord {
  collectedData: CollectedData;
  subscriptionId?: string;
  createdAt: string;
}

function researchInput(sessionId: string, collectedData: CollectedData): SiteResearchInput {
  return buildSiteResearchInput(`checkout:${sessionId}`, collectedData, () => new Date(), sessionId);
}

function errorReply(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId: string = body?.sessionId;
    if (!sessionId) return errorReply('invalid_input', 400);

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
      return errorReply('session_not_found', 404);
    }
    if (!pending.subscriptionId) {
      console.error(`[site-bot checkout] session=${sessionId} has no subscriptionId (pre-plan pending record)`);
      return errorReply('session_not_found', 404);
    }

    const activation = await activatePlanSubscription(pending.subscriptionId, { sessionId });
    if (!activation.ok) {
      console.error(`[site-bot checkout] activation failed session=${sessionId} subscription=${pending.subscriptionId}:`, activation);
      if (activation.reason === 'charge_failed') return errorReply('charge_failed', 402, { retryable: activation.retryable === true });
      if (activation.reason === 'callback_invalid') return errorReply('payment_verification_failed', 402);
      return errorReply('checkout_failed', 409);
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
    return NextResponse.json(manageUrl ? { ...response, manageUrl } : response, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: unknown) {
    console.error('Site Bot checkout callback error:', error);
    return errorReply('checkout_failed', 500);
  }
}
