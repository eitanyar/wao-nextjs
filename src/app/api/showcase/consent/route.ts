// Showcase consent toggle on the account page (terms section 10 showcase sub-clause, approved 2026-11-17).
// POST { token, granted } from /account/subscription. Identity = the account page's magic-link token, peeked and never
// consumed (the client-message route's pattern), so only the owner who holds the link can change it. Switching off
// records the withdrawal at once (source 'account', reason 'owner_toggle'); switching on records a grant (source
// 'account'). A grant is refused once a cancellation was received (the cancel already withdrew it).
// Error replies are codes only. Zero Hebrew in this module.
import { peekMagicLinkToken } from '@/lib/payments/magic-link';
import { getSubscriptionById, isCancellationRequested } from '@/lib/payments/subscriptions';
import { SITE_BOT_PLAN } from '@/lib/payments/plans';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { boundedJsonObject } from '@/lib/site-bot/adminRequestGuards';
import { recordShowcaseConsent, withdrawShowcaseConsent } from '@/lib/showcase/consentStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 2_048;
const TEN_MINUTES = 10 * 60 * 1000;
const ALLOWED_KEYS = new Set(['token', 'granted']);

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
function errorReply(error: string, status: number): Response {
  return reply({ ok: false, error }, status);
}

export async function POST(request: Request): Promise<Response> {
  try {
    let input: Record<string, unknown>;
    try { input = await boundedJsonObject(request, MAX_BODY_BYTES); } catch { return errorReply('invalid_input', 400); }
    if (Object.keys(input).some((key) => !ALLOWED_KEYS.has(key)) || typeof input.token !== 'string' || !input.token ||
      typeof input.granted !== 'boolean') {
      return errorReply('invalid_input', 400);
    }

    const peek = peekMagicLinkToken(input.token);
    if (!peek.valid) return errorReply('link_expired', 401);

    // Site-Bot is the only product with a billing plan today; an Ads Bot plan joins here when its checkout exists.
    const subscription = getSubscriptionById(peek.subscriptionId);
    if (!subscription || subscription.plan !== SITE_BOT_PLAN.id || subscription.status === 'pending') {
      return errorReply('not_found', 404);
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`showcase-consent-ip:${ip}`, { maxRequests: 30, windowMs: TEN_MINUTES }).allowed ||
      !checkRateLimit(`showcase-consent-sub:${subscription.id}`, { maxRequests: 20, windowMs: TEN_MINUTES }).allowed) {
      return errorReply('rate_limited', 429);
    }

    if (input.granted) {
      if (isCancellationRequested(subscription)) return errorReply('cancelled', 409);
      const consent = recordShowcaseConsent({ accountId: subscription.id, product: 'site-bot', source: 'account' });
      return reply({ ok: true, granted: consent.granted }, 200);
    }
    const consent = withdrawShowcaseConsent({ accountId: subscription.id, source: 'account', reason: 'owner_toggle' });
    return reply({ ok: true, granted: consent?.granted === true }, 200);
  } catch (error: unknown) {
    console.error('[showcase/consent] failed:', error instanceof Error ? error.message : 'unknown');
    return errorReply('failed', 500);
  }
}
