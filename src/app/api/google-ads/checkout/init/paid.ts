import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { startAdsBotCheckout } from '@/lib/google-ads/billing/adsBotBilling';

/** Per-IP fixed window, same limits as the Site Bot checkout init. */
export const ADS_BOT_CHECKOUT_INIT_RATE_LIMIT = { maxRequests: 5, windowMs: 10 * 60 * 1000 } as const;

const STATUS: Record<string, number> = { invalid_link: 401, consent_required: 400, already_subscribed: 409, consent_not_recorded: 500 };

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`adsbot-checkout-init:${ip}`, ADS_BOT_CHECKOUT_INIT_RATE_LIMIT).allowed) return reply({ error: 'rate_limited' }, 429);
    const body = (await req.json().catch(() => null)) as { token?: unknown; consent?: unknown } | null;
    const result = await startAdsBotCheckout({ token: body?.token, consent: body?.consent, origin: new URL(req.url).origin });
    if (!result.ok) return reply({ error: result.error }, STATUS[result.error] ?? 400);
    return reply({
      subscriptionId: result.subscriptionId,
      providerSessionId: result.providerSessionId,
      mockProvider: result.mockProvider,
      // Only a real (hosted-page) provider gets the redirect; the mock completes on the pay page itself.
      ...(result.mockProvider ? {} : { redirectUrl: result.redirectUrl }),
      ...result.summary,
    });
  } catch (error: unknown) {
    console.error('Ads Bot checkout init error:', error);
    return reply({ error: 'checkout_init_failed' }, 500);
  }
}
