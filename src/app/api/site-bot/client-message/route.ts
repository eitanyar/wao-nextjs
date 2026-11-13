// Site-Bot client message box (docs/specs/site-bot-support-message-box-fable52-2026-11-13.md).
// POST { token, messageId, body } from the account page. The magic-link token is only peeked, never consumed, so the
// cancel button keeps working. Storage is the receipt: a 200 means the row is committed. Email failure never fails the
// request (it shows in the staff queue as "Alert email not sent"). Error replies are codes only; no message content is
// ever logged.
import { peekMagicLinkToken } from '@/lib/payments/magic-link';
import { getSubscriptionById } from '@/lib/payments/subscriptions';
import { SITE_BOT_PLAN } from '@/lib/payments/plans';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { boundedJsonObject } from '@/lib/site-bot/adminRequestGuards';
import {
  ClientMessageError,
  clientMessagesEnabled,
  countMessagesSince,
  createClientMessage,
  markClientConfirmed,
  markStaffAlerted,
  normalizeMessageBody,
  triageClientMessage,
} from '@/lib/site-bot/clientMessages';
import { sendClientMessageConfirmation, sendClientMessageStaffAlert } from '@/lib/site-bot/clientMessageEmail';
import { UUID } from '@/lib/site-bot/helpRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16_384;
const TEN_MINUTES = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_CAP = 20;
const ALLOWED_KEYS = new Set(['token', 'messageId', 'body']);

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
function errorReply(error: string, status: number): Response {
  return reply({ ok: false, error }, status);
}

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Flag first: nothing is read while the feature is off.
    if (!clientMessagesEnabled(process.env)) return errorReply('disabled', 503);

    // 2. Bounded JSON with exactly the allowed keys.
    let input: Record<string, unknown>;
    try { input = await boundedJsonObject(request, MAX_BODY_BYTES); } catch { return errorReply('invalid_input', 400); }
    if (Object.keys(input).some((key) => !ALLOWED_KEYS.has(key)) || typeof input.token !== 'string' ||
      typeof input.messageId !== 'string' || !UUID.test(input.messageId) || typeof input.body !== 'string') {
      return errorReply('invalid_input', 400);
    }
    const messageId = input.messageId.toLowerCase();

    // 3. Identity: peek, never consume.
    const peek = input.token ? peekMagicLinkToken(input.token) : { valid: false as const };
    if (!peek.valid) return errorReply('link_expired', 401);

    // 4. Site-Bot plan rows that went past checkout. Cancelled, paused and past-due clients may still write.
    const subscription = getSubscriptionById(peek.subscriptionId);
    if (!subscription || subscription.plan !== SITE_BOT_PLAN.id || subscription.status === 'pending') return errorReply('not_found', 404);

    // 5. Rate limits (in-memory per process) plus a durable 24-hour cap.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = new Date();
    if (!checkRateLimit(`sitebot-msg-ip:${ip}`, { maxRequests: 10, windowMs: TEN_MINUTES }).allowed ||
      !checkRateLimit(`sitebot-msg-sub:${subscription.id}`, { maxRequests: 5, windowMs: TEN_MINUTES }).allowed ||
      countMessagesSince(subscription.id, new Date(now.getTime() - DAY_MS).toISOString()) >= DAILY_CAP) {
      return errorReply('rate_limited', 429);
    }

    // 6. Body rules.
    let body: string;
    try { body = normalizeMessageBody(input.body); } catch (error) {
      return errorReply(error instanceof ClientMessageError && error.code === 'too_long' ? 'too_long' : 'invalid_input', 400);
    }

    // 7. Store (idempotent on messageId).
    const { row, created } = createClientMessage({ id: messageId, subscriptionId: subscription.id, body, now });

    // 8. First insert only: both emails, each isolated; then the AI seam (a stub today).
    let confirmationEmailed = row.client_confirmed_at !== null;
    if (created) {
      try {
        if (await sendClientMessageStaffAlert(row)) markStaffAlerted(row.id, new Date());
      } catch {
        console.error(`[site-bot client-message] staff alert failed id=${row.id}`);
      }
      try {
        if (await sendClientMessageConfirmation(row)) {
          markClientConfirmed(row.id, new Date());
          confirmationEmailed = true;
        }
      } catch {
        console.error(`[site-bot client-message] confirmation failed id=${row.id}`);
      }
      try { await triageClientMessage(row); } catch { /* stub; never fails the request */ }
    }

    // 9. Receipt.
    return reply({ ok: true, messageId: row.id, status: 'received', confirmationEmailed }, 200);
  } catch (error) {
    if (error instanceof ClientMessageError && error.code === 'conflict') return errorReply('conflict', 409);
    console.error('[site-bot client-message] unavailable');
    return errorReply('unavailable', 503);
  }
}
