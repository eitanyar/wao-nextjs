import { NextResponse } from 'next/server';
import { applyTokenizationCallback } from '@/lib/payments/subscriptions';

/**
 * Hosted-tokenization return callback. GET is the primary path (mirrors the
 * house style used by `src/app/api/checkout/callback/route.ts` for the
 * one-time-checkout flow — a browser redirect back from the provider's
 * hosted page carries everything as query params). POST is also accepted
 * for providers that call back server-to-server instead; `subscriptionId`
 * is expected as a query param either way since it's embedded in the
 * `returnUrl` we hand the provider at session-creation time.
 */

function resolveBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

async function handleCallback(subscriptionId: string | null, payload: unknown): Promise<NextResponse> {
  if (!subscriptionId) {
    console.error('[subscriptions/callback] Missing subscriptionId on callback.');
    return NextResponse.redirect(new URL('/account/subscription?signup=error', resolveBaseUrl()));
  }

  const outcome = await applyTokenizationCallback(subscriptionId, payload);

  if (!outcome.ok) {
    // Never leak whether a trial charge actually happened — generic failure redirect either way.
    return NextResponse.redirect(new URL('/account/subscription?signup=error', resolveBaseUrl()));
  }

  return NextResponse.redirect(new URL('/account/subscription?signup=success', resolveBaseUrl()));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const subscriptionId = url.searchParams.get('subscriptionId');
  const payload = Object.fromEntries(url.searchParams.entries());
  return handleCallback(subscriptionId, payload);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const subscriptionId = url.searchParams.get('subscriptionId');
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // no/invalid JSON body — payload stays {} and verifyTokenizationCallback will treat it as invalid.
  }
  return handleCallback(subscriptionId, body);
}
