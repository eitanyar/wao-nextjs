import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { getPaymentProvider } from '@/lib/payments/get-provider';
import { getClientRecord, checkGeoUpgradeEligibility } from '@/lib/geo/client';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';

/**
 * Self-serve month-4 GEO Bot upgrade — step 1 of 2, for an ALREADY-
 * authenticated Site Bot dashboard client (mirrors
 * `src/app/api/geo/signup/init/route.ts` structurally — see that route's
 * doc comment for why this stays self-contained instead of routing through
 * `src/lib/payments/subscriptions.ts`).
 *
 * `clientId` is never trusted from the request body — this is an upgrade
 * for a known logged-in client, so it always comes from the `wao-client`
 * session cookie.
 */
const GEO_UPGRADE_PRICE = 299;

export async function POST(req: Request) {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value ?? '';
    const clientId = await verifySessionToken(token);
    if (!clientId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const record = getClientRecord(clientId);
    if (!record) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const eligibility = checkGeoUpgradeEligibility(record);
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: 'Not eligible for the GEO Bot upgrade', reason: eligibility.reason },
        { status: 403 }
      );
    }

    const sessionId = crypto.randomUUID();

    const pendingDir = path.join(process.cwd(), 'data', 'geo-upgrades-pending');
    fs.mkdirSync(pendingDir, { recursive: true });
    fs.writeFileSync(
      path.join(pendingDir, `${sessionId}.json`),
      JSON.stringify({ clientId, createdAt: new Date().toISOString() }, null, 2)
    );

    const origin = new URL(req.url).origin;
    const provider = getPaymentProvider();
    await provider.createTokenizationSession({
      customerId: clientId,
      returnUrl: `${origin}/geo/upgrade/pay/${sessionId}`,
      initialAmount: GEO_UPGRADE_PRICE,
      description: 'WAO GEO Bot — שדרוג חודשי',
    });

    return NextResponse.json({ sessionId, amount: GEO_UPGRADE_PRICE });
  } catch (error: any) {
    console.error('GEO Bot upgrade init error:', error);
    return NextResponse.json({ error: error.message || 'Upgrade init failed' }, { status: 500 });
  }
}
