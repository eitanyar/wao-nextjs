import { checkRateLimit } from '@/lib/payments/rate-limit';
import { addWaitlistEntry, withLaunchStore } from '@/lib/site-bot/launchStore';
import { findAuditCandidate, resolveOffer } from '@/lib/site-bot/offerState';
import { normalizeWaitlistSubmission, submitWaitlist, WaitlistError } from '@/lib/site-bot/waitlist';
import { sendWaitlistAlert } from '@/lib/site-bot/waitlistAlert';

// Launch step 1: the Site Bot waiting list (pre-open / full / trade) on the confirmed free-check result. A deliberate new
// public surface of the closed (audit-only) release: it never opens the paid flow, it only stores a contact and emails
// staff. Protections, as on the lead and help-request routes: JSON only, 4 KB body cap, strict field validation (Israeli
// phone), per-IP rate limit, codes-only errors; plus it accepts only a real, unexpired audit whose offer shows the form.

const WAITLIST_RATE_LIMIT = { maxRequests: 5, windowMs: 10 * 60 * 1000 } as const;
const MAX_BODY_BYTES = 4096;

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

async function boundedJson(req: Request): Promise<unknown> {
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || !req.body) {
    throw new WaitlistError('invalid_input');
  }
  const reader = req.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new WaitlistError('invalid_input'); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch {
    throw new WaitlistError('invalid_input');
  } finally {
    reader.releaseLock();
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`sitebot-waitlist:${ip}`, WAITLIST_RATE_LIMIT).allowed) return reply({ ok: false, error: 'rate_limited' }, 429);
    const submission = normalizeWaitlistSubmission(await boundedJson(req));
    const result = await submitWaitlist(submission, {
      findCandidate: async (auditId, placeId) => {
        const found = await findAuditCandidate(auditId, placeId);
        return found.kind === 'found' ? found.candidate : null;
      },
      offerFor: candidate => resolveOffer(candidate),
      add: input => withLaunchStore(store => addWaitlistEntry(store, input), { status: 'unavailable' }),
      alert: entry => sendWaitlistAlert(entry),
    });
    return reply(result, 200);
  } catch (error) {
    const code = error instanceof WaitlistError ? error.code : 'unavailable';
    if (!(error instanceof WaitlistError)) console.error('SITE_BOT_WAITLIST_FAILED');
    const status = { invalid_input: 400, not_found: 404, not_eligible: 409, unavailable: 503 }[code];
    return reply({ ok: false, error: code }, status);
  }
}
