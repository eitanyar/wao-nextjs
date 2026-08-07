import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import { getPaymentProvider } from '@/lib/payments/get-provider';

const SITE_BOT_PRICE = 9.9;

interface PendingRecord {
  collectedData: CollectedData;
  createdAt: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId: string = body.sessionId;
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

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

    fs.rmSync(pendingPath, { force: true });

    return NextResponse.json({ success: true, url: deployJson.url, slug: genJson.slug });
  } catch (error: any) {
    console.error('Site Bot checkout callback error:', error);
    return NextResponse.json({ error: error.message || 'Checkout failed' }, { status: 500 });
  }
}
