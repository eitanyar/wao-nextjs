import { NextResponse } from 'next/server';
import { applyCardUpdateCallback } from '@/lib/payments/card-update';
import { buildAccountUrl } from '@/lib/payments/subscriptions';

/**
 * Hosted-tokenization return callback for the card-update flow. Same
 * GET-primary/POST-accepted shape as `src/app/api/subscriptions/callback/route.ts`
 * (the original signup callback) — `subscriptionId` and `mlt` (the original
 * magic-link token) are expected as query params, embedded in the
 * `returnUrl` handed to the provider at session-creation time
 * (`buildCardUpdateReturnUrl`).
 */

async function handleCallback(
  subscriptionId: string | null,
  magicLinkToken: string | null,
  payload: unknown
): Promise<NextResponse> {
  if (!subscriptionId || !magicLinkToken) {
    console.error('[subscriptions/card-update/callback] Missing subscriptionId or mlt on callback.');
    return NextResponse.redirect(buildAccountUrl({ cardUpdate: 'error' }));
  }

  const outcome = await applyCardUpdateCallback(subscriptionId, magicLinkToken, payload);

  if (!outcome.ok) {
    // Never leak the specific reason — generic failure redirect either way.
    return NextResponse.redirect(buildAccountUrl({ cardUpdate: 'error' }));
  }

  return NextResponse.redirect(
    buildAccountUrl({
      token: outcome.freshToken,
      cardUpdate: outcome.recharged ? 'success-recharged' : 'success',
    })
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const subscriptionId = url.searchParams.get('subscriptionId');
  const magicLinkToken = url.searchParams.get('mlt');
  const payload = Object.fromEntries(url.searchParams.entries());
  return handleCallback(subscriptionId, magicLinkToken, payload);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const subscriptionId = url.searchParams.get('subscriptionId');
  const magicLinkToken = url.searchParams.get('mlt');
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // no/invalid JSON body — payload stays {} and verifyTokenizationCallback will treat it as invalid.
  }
  return handleCallback(subscriptionId, magicLinkToken, body);
}
