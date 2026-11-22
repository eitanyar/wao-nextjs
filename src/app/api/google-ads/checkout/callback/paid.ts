import { NextResponse } from 'next/server';
import { completeAdsBotCheckout } from '@/lib/google-ads/billing/adsBotBilling';

const STATUS: Record<string, number> = {
  not_ads_bot: 404,
  subscription_not_found: 404,
  subscription_not_pending: 409,
  callback_invalid: 400,
  charge_failed: 402,
};

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { subscriptionId?: unknown; payload?: unknown } | null;
    const result = await completeAdsBotCheckout({ subscriptionId: body?.subscriptionId, payload: body?.payload ?? {} });
    if (!result.ok) return reply({ error: result.error, ...(result.retryable !== undefined ? { retryable: result.retryable } : {}) }, STATUS[result.error] ?? 400);
    return reply({ success: true, subscriptionId: result.subscriptionId, alreadyActive: result.alreadyActive });
  } catch (error: unknown) {
    console.error('Ads Bot checkout callback error:', error);
    return reply({ error: 'checkout_callback_failed' }, 500);
  }
}
