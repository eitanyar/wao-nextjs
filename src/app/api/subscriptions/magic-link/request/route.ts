import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { requestMagicLinkForEmail } from '@/lib/payments/subscriptions';
import { MAGIC_LINK_REQUEST_COPY as COPY } from '@/lib/payments/accountCopy';

// Rate limit: 3 requests / 10 minutes per (normalized email + IP) pair.
// In-memory, per-process — see `rate-limit.ts` doc comment for scope caveats.
const MAX_REQUESTS = 3;
const WINDOW_MS = 10 * 60 * 1000;

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return 'unknown';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: COPY.invalidEmail }, { status: 400 });
    }

    const ip = getClientIp(req);
    const rateLimitKey = `${email}:${ip}`;
    const rateLimit = checkRateLimit(rateLimitKey, { maxRequests: MAX_REQUESTS, windowMs: WINDOW_MS });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: COPY.rateLimited },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      );
    }

    // Fire-and-forget-ish, but awaited so any send errors are logged server-side.
    // Response is identical whether or not a subscription was found, to avoid email enumeration.
    await requestMagicLinkForEmail(email);

    return NextResponse.json({
      success: true,
      message: COPY.success,
    });
  } catch (error: unknown) {
    console.error('[subscriptions/magic-link/request] Error:', error);
    return NextResponse.json({ success: false, error: COPY.serverError }, { status: 500 });
  }
}
