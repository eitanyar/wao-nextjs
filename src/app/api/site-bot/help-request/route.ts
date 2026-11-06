import { readAuditRecord } from '@/lib/site-bot/auditStore';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { HelpRequestError, normalizeHelpRequest, submitHelpRequest } from '@/lib/site-bot/helpRequest';
import { createFileHelpRequestStore, isValidHelpRequestRoot } from '@/lib/site-bot/helpRequestStore';

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
function errorReply(error: string, status: number): Response { return reply({ ok: false, error }, status); }
async function boundedJson(req: Request): Promise<unknown> {
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || !req.body) throw new HelpRequestError('invalid_input');
  const reader = req.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new HelpRequestError('invalid_input'); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch { throw new HelpRequestError('invalid_input'); }
  finally { reader.releaseLock(); }
}
export async function POST(req: Request): Promise<Response> {
  try {
    // No body, audit read, or store initialization before BOTH gates pass.
    if (process.env.SITE_BOT_HELP_INTAKE_ENABLED !== 'true') return errorReply('disabled', 503);
    const root = process.env.SITE_BOT_HELP_REQUEST_DIR;
    if (!isValidHelpRequestRoot(root)) return errorReply('disabled', 503);
    const input = await boundedJson(req);
    normalizeHelpRequest(input);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(`sitebot-help:${ip}`, { maxRequests: 5, windowMs: 10 * 60 * 1000 }).allowed) return errorReply('rate_limited', 429);
    const result = await submitHelpRequest(input, {
      clock: () => new Date(),
      // Explicitly suppress the audit adapter's default expired-record deletion.
      readAuditRecord: id => readAuditRecord(id, undefined, new Date(), false),
      store: createFileHelpRequestStore(root),
    });
    return reply(result, 200);
  } catch (error) {
    const code = error instanceof HelpRequestError ? error.code : 'unavailable';
    const status = { invalid_input: 400, not_found: 404, conflict: 409, unavailable: 503 }[code];
    return errorReply(code, status);
  }
}
