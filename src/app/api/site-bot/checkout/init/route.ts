import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import { getPaymentProvider } from '@/lib/payments/get-provider';

// One-time ₪9.90 Site Bot checkout — separate from the recurring-subscription
// engine in subscriptions.ts (that one's provider decision is still open,
// see docs/specs/subscription-billing-provider-decision.md). This route only
// needs createTokenizationSession + chargeToken from the PaymentProvider seam,
// so it talks to getPaymentProvider() directly rather than pulling in the
// heavier subscription machinery.
const SITE_BOT_PRICE = 9.9;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const collectedData: CollectedData = body.collectedData;

    if (!collectedData?.businessNiche) {
      return NextResponse.json({ error: 'collectedData.businessNiche is required' }, { status: 400 });
    }

    const sessionId = crypto.randomUUID();
    const pendingDir = path.join(process.cwd(), 'data', 'sites-pending');
    fs.mkdirSync(pendingDir, { recursive: true });
    fs.writeFileSync(
      path.join(pendingDir, `${sessionId}.json`),
      JSON.stringify({ collectedData, createdAt: new Date().toISOString() }, null, 2)
    );

    const origin = new URL(req.url).origin;
    const provider = getPaymentProvider();
    await provider.createTokenizationSession({
      customerId: sessionId,
      returnUrl: `${origin}/site-bot/pay/${sessionId}`,
      initialAmount: SITE_BOT_PRICE,
      description: 'WAO Site Bot — בניית אתר',
    });

    return NextResponse.json({ sessionId, amount: SITE_BOT_PRICE });
  } catch (error: any) {
    console.error('Site Bot checkout init error:', error);
    return NextResponse.json({ error: error.message || 'Checkout init failed' }, { status: 500 });
  }
}
