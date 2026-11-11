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

// Site-Bot checkout init: the monthly + VAT plan (SITE_BOT_PLAN, the one config source for its price), routed through the
// recurring engine (subscriptions.ts createPendingPlanSubscription). Nothing is charged here: the row is 'pending'
// until the pay page's callback takes the sign-up charge. Reachable only behind SITE_BOT_PAID_FLOW (./route.ts).

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
    const submitted: CollectedData = body?.collectedData;
    if (!submitted?.businessNiche) return errorReply('invalid_input', 400);
    // M1: served-area localities are derived here from travelBoundary, never trusted from the client.
    const collectedData = withServedAreaNames(submitted, ISRAELI_LOCALITIES);

    const sessionId = crypto.randomUUID();
    const origin = new URL(req.url).origin;
    const email = typeof collectedData.email === 'string' && EMAIL.test(collectedData.email.trim()) ? collectedData.email.trim() : null;
    const { subscriptionId } = await createPendingPlanSubscription({
      plan: SITE_BOT_PLAN,
      userId: email ?? `site-bot:${sessionId}`,
      returnUrl: `${origin}/site-bot/pay/${sessionId}`,
    });

    const pendingDir = path.join(process.cwd(), 'data', 'sites-pending');
    fs.mkdirSync(pendingDir, { recursive: true });
    fs.writeFileSync(
      path.join(pendingDir, `${sessionId}.json`),
      JSON.stringify({ collectedData, subscriptionId, plan: SITE_BOT_PLAN.id, createdAt: new Date().toISOString() }, null, 2)
    );

    return NextResponse.json({ sessionId, ...planSummary(SITE_BOT_PLAN) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error: unknown) {
    // The detail stays in the server log; the customer only ever gets a code.
    console.error('Site Bot checkout init error:', error);
    return errorReply('checkout_init_failed', 500);
  }
}
