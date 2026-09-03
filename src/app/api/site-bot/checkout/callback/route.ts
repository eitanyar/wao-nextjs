import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import { getPaymentProvider } from '@/lib/payments/get-provider';
import { getInvoiceProvider } from '@/lib/payments/get-invoice-provider';
import { deriveOpenResearchGates } from '@/lib/site-bot/research/gates';
import { readResearchDossier } from '@/lib/site-bot/research/researchStore';
import { runSiteResearch, type SiteResearchInput } from '@/lib/site-bot/research/runResearch';

const SITE_BOT_PRICE = 9.9;

interface PendingRecord {
  collectedData: CollectedData;
  createdAt: string;
}

function researchInput(sessionId: string, collectedData: CollectedData): SiteResearchInput {
  const capturedAt = new Date().toISOString();
  const owner = { sourceId: `checkout:${sessionId}`, capturedAt };
  const serviceModel = collectedData.serviceModel === 'location'
    ? 'fixed'
    : collectedData.serviceModel === 'mixed'
      ? 'hybrid'
      : collectedData.serviceModel === 'event'
        ? 'field'
        : collectedData.serviceModel ?? 'remote';
  const services = [collectedData.primaryService, ...(collectedData.secondaryServices ?? '').split(',')]
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value));
  return {
    businessTruth: {
      businessName: collectedData.businessName ?? collectedData.ownerName ?? sessionId,
      serviceModel,
      confirmedServices: services.map(value => ({ value, owner })),
      moneyPriorities: (collectedData.priorityServices ?? []).map(value => ({ value, owner })),
      ...(collectedData.targetLocation ? { base: { value: collectedData.targetLocation, owner } } : {}),
      ...(collectedData.travelBoundary ? { travelBoundary: { value: collectedData.travelBoundary, owner } } : {}),
      servedAreas: (collectedData.specificCities ?? '').split(',').map(value => value.trim()).filter(Boolean).map(value => ({ value, owner })),
      excludedAreas: (collectedData.geographicExclusions ?? []).map(value => ({ value, owner })),
      ...(serviceModel === 'fixed' ? { customerTravel: { value: true, owner } } : {}),
    },
    seeds: services,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId: string = body.sessionId;
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

    const existingDossier = await readResearchDossier(sessionId);
    if (existingDossier) {
      return NextResponse.json({
        success: true,
        charged: true,
        researchId: sessionId,
        status: existingDossier.status,
        statusUrl: `/api/site-bot/research/status?researchId=${encodeURIComponent(sessionId)}`,
      });
    }

    const pendingPath = path.join(process.cwd(), 'data', 'sites-pending', `${sessionId}.json`);
    let pending: PendingRecord;
    try {
      pending = JSON.parse(fs.readFileSync(pendingPath, 'utf-8'));
    } catch {
      return NextResponse.json({ error: 'Checkout session not found or already used' }, { status: 404 });
    }

    const provider = getPaymentProvider();

    const verify = await provider.verifyTokenizationCallback({ sessionId });
    if (!verify.valid || !verify.token) {
      return NextResponse.json({ error: 'אימות התשלום נכשל' }, { status: 402 });
    }

    const charge = await provider.chargeToken({
      token: verify.token,
      amount: SITE_BOT_PRICE,
      description: 'WAO Site Bot — בניית אתר',
      idempotencyKey: sessionId,
    });
    if (!charge.success) {
      return NextResponse.json({ error: charge.errorMessage || 'החיוב נכשל', retryable: charge.isRetryable }, { status: 402 });
    }

    // Invoice issuance must never block or fail the already-succeeded charge
    // (same invariant as invoicing.ts's issueInvoiceForCharge — this flow
    // can't reuse that helper directly since it writes to the subscription
    // engine's charges/subscriptions DB tables, which this one-time,
    // DB-less checkout doesn't have rows in).
    try {
      const invoiceProvider = getInvoiceProvider();
      await invoiceProvider.createInvoice({
        customerName: pending.collectedData.businessName || pending.collectedData.ownerName || sessionId,
        customerEmail: pending.collectedData.email || '',
        amount: SITE_BOT_PRICE,
        description: 'WAO Site Bot — בניית אתר',
        externalId: charge.providerTransactionId || sessionId,
      });
    } catch (err) {
      console.error(`[site-bot checkout] Failed to issue invoice for session=${sessionId}:`, err);
    }

    const result = await runSiteResearch(sessionId, researchInput(sessionId, pending.collectedData));
    const openResearchGateCount = deriveOpenResearchGates(sessionId, pending.collectedData).length;
    fs.rmSync(pendingPath, { force: true });
    return NextResponse.json({
      success: true,
      charged: true,
      researchId: sessionId,
      status: result.dossier.status,
      statusUrl: `/api/site-bot/research/status?researchId=${encodeURIComponent(sessionId)}`,
      openGateCount: openResearchGateCount + result.dossier.humanGates.filter(gate => gate.status !== 'approved').length,
    });

    // ── Trigger the already-proven generate → deploy pipeline ────────────────
    const origin = new URL(req.url).origin;

    const genRes = await fetch(`${origin}/api/site-bot/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectedData: pending.collectedData, slug: pending.collectedData.preferredSlug }),
    });
    const genJson = await genRes.json();
    if (!genRes.ok || !genJson.slug) {
      return NextResponse.json({ error: genJson.error || 'יצירת האתר נכשלה לאחר החיוב, ניצור קשר', charged: true }, { status: 500 });
    }

    const deployRes = await fetch(`${origin}/api/site-bot/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: genJson.slug }),
    });
    const deployJson = await deployRes.json();
    if (!deployRes.ok || !deployJson.url) {
      return NextResponse.json({ error: deployJson.error || 'העלאת האתר נכשלה לאחר החיוב, ניצור קשר', charged: true }, { status: 500 });
    }

    const openResearchGates = deriveOpenResearchGates(sessionId, pending.collectedData);

    fs.rmSync(pendingPath, { force: true });

    return NextResponse.json({
      success: true,
      url: deployJson.url,
      slug: genJson.slug,
      researchId: sessionId,
      collectedData: pending.collectedData,
      openResearchGates,
    });
  } catch (error: unknown) {
    console.error('Site Bot checkout callback error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Checkout failed' }, { status: 500 });
  }
}
