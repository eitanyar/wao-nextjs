import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { cookies } from 'next/headers';
import { getPaymentProvider } from '@/lib/payments/get-provider';
import { getInvoiceProvider } from '@/lib/payments/get-invoice-provider';
import { getClientRecord, writeClientRecord, checkGeoUpgradeEligibility, type GeoClientRecord } from '@/lib/geo/client';
import { getGscTokenRecord } from '@/lib/geo/gsc-token';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';

/**
 * Self-serve month-4 GEO Bot upgrade — step 2 of 2, mirrors
 * `src/app/api/geo/signup/callback/route.ts`'s structure closely. See
 * `src/app/api/geo/upgrade/init/route.ts`'s doc comment for the overall
 * shape/rationale.
 *
 * `clientId` is re-derived from the session cookie, never trusted from the
 * request body — a stolen/leaked `sessionId` alone must not be chargeable
 * against a different logged-in client.
 */
const GEO_UPGRADE_PRICE = 299;

interface PendingUpgradeRecord {
  clientId: string;
  createdAt: string;
}

/**
 * Fires the background content pipeline for a freshly-upgraded client:
 * gsc-pareto.mjs, then (only on a clean exit) geo-generate-content.mjs
 * --top=10. Both children are spawned detached + unref'd so the HTTP
 * response above this call is never blocked on either script.
 */
function kickOffGeoUpgradePipeline(clientId: string, site: string): void {
  const clientDir = path.join(process.cwd(), 'data', 'clients', clientId);
  fs.mkdirSync(clientDir, { recursive: true });
  const logPath = path.join(clientDir, 'geo-upgrade-kickoff.log');
  const logFd = fs.openSync(logPath, 'a');

  const paretoOut = path.join('data', 'clients', clientId, 'pareto.json');
  const paretoChild = spawn(
    'node',
    [
      'scripts/gsc-pareto.mjs',
      `--client=${clientId}`,
      `--site=${site}`,
      '--days=90',
      `--out=${paretoOut}`,
    ],
    { cwd: process.cwd(), detached: true, stdio: ['ignore', logFd, logFd] }
  );
  paretoChild.unref();

  paretoChild.on('close', (code) => {
    if (code !== 0) return;
    const generateChild = spawn(
      'node',
      ['scripts/geo-generate-content.mjs', `--client=${clientId}`, '--top=10'],
      { cwd: process.cwd(), detached: true, stdio: ['ignore', logFd, logFd] }
    );
    generateChild.unref();
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId: string = body.sessionId;
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value ?? '';
    const sessionClientId = await verifySessionToken(token);
    if (!sessionClientId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 403 });
    }

    const pendingPath = path.join(process.cwd(), 'data', 'geo-upgrades-pending', `${sessionId}.json`);
    let pending: PendingUpgradeRecord;
    try {
      pending = JSON.parse(fs.readFileSync(pendingPath, 'utf-8'));
    } catch {
      return NextResponse.json({ error: 'Upgrade session not found or already used' }, { status: 404 });
    }

    if (sessionClientId !== pending.clientId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 403 });
    }

    const clientId = sessionClientId;
    const record = getClientRecord(clientId);
    if (!record) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const eligibility = checkGeoUpgradeEligibility(record);
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: 'Already upgraded or no longer eligible', reason: eligibility.reason },
        { status: 409 }
      );
    }

    const provider = getPaymentProvider();

    const verify = await provider.verifyTokenizationCallback({ sessionId });
    if (!verify.valid || !verify.token) {
      return NextResponse.json({ error: 'אימות התשלום נכשל' }, { status: 402 });
    }

    const charge = await provider.chargeToken({
      token: verify.token,
      amount: GEO_UPGRADE_PRICE,
      description: 'WAO GEO Bot — שדרוג חודשי',
      idempotencyKey: sessionId,
    });
    if (!charge.success) {
      return NextResponse.json(
        { error: charge.errorMessage || 'החיוב נכשל', retryable: charge.isRetryable },
        { status: 402 }
      );
    }

    const entitlements = record.entitlements ? [...record.entitlements] : [];
    if (!entitlements.includes('geo')) entitlements.push('geo');
    const updatedRecord: GeoClientRecord = { ...record, entitlements };
    writeClientRecord(updatedRecord);

    // Invoice issuance must never block or fail the already-succeeded charge
    // (same invariant as the GEO signup callback / site-bot's checkout callback).
    try {
      const invoiceProvider = getInvoiceProvider();
      // Site Bot's client record has no stored email field (unlike GEO's own
      // cold-signup input, which captures one at intake) — approvalContact is
      // a name/phone, not an email. Pass an empty string; invoice issuance is
      // non-fatal per the try/catch below regardless.
      await invoiceProvider.createInvoice({
        customerName: record.approvalContact || clientId,
        customerEmail: '',
        amount: GEO_UPGRADE_PRICE,
        description: 'WAO GEO Bot — שדרוג חודשי',
        externalId: charge.providerTransactionId || sessionId,
      });
    } catch (err) {
      console.error(`[geo upgrade callback] Failed to issue invoice for session=${sessionId}:`, err);
    }

    const gscToken = getGscTokenRecord(clientId);
    const site = gscToken && gscToken.sites.length > 0 ? gscToken.sites[0] : record.siteUrl;
    kickOffGeoUpgradePipeline(clientId, site);

    fs.rmSync(pendingPath, { force: true });

    return NextResponse.json({ success: true, clientId, entitlements: updatedRecord.entitlements });
  } catch (error: any) {
    console.error('GEO Bot upgrade callback error:', error);
    return NextResponse.json({ error: error.message || 'Upgrade failed' }, { status: 500 });
  }
}
