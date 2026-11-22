import { NextResponse } from 'next/server';
import { adsBotCheckoutEnabled } from '@/lib/google-ads/billing/adsBotCheckoutFlag';

// Ads Bot checkout callback (mission item 3). Behind ADS_BOT_CHECKOUT_ENABLED (default off): off returns the same
// 503 as the other unbuilt checkout routes. No cookie by design (a provider callback carries none): ./paid acts only
// on a pending Ads Bot subscription, and the provider check inside the shared engine authenticates the payment.
export async function POST(req: Request) {
  if (adsBotCheckoutEnabled()) {
    const { POST: paidPOST } = await import('./paid');
    return paidPOST(req);
  }
  return NextResponse.json(
    { error: 'checkout_unavailable' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
