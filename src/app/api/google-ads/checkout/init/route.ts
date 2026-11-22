import { NextResponse } from 'next/server';
import { adsBotCheckoutEnabled } from '@/lib/google-ads/billing/adsBotCheckoutFlag';

// Ads Bot checkout init (mission item 3). Behind ADS_BOT_CHECKOUT_ENABLED (default off): off returns the same
// 503 as the other unbuilt checkout routes. The handler lives in ./paid so the off path loads nothing else.
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
