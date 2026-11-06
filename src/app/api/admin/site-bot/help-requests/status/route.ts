// Operator follow-up status write. Admin-only, same-origin JSON POST only.
// The v1 intake record is never modified; status is stored separately.
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { UUID } from '@/lib/site-bot/helpRequest';
import { createHelpInboxStoreFromEnv, isFollowUpStatus } from '@/lib/site-bot/helpFollowUp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_BODY = 1024;
function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
// CSRF guard modelled on Next's own Server Action check: the Origin host must
// match x-forwarded-host (first value) or Host. request.url is not used because
// Next normalizes it (e.g. 127.0.0.1 -> localhost). Unlike Server Actions, a
// missing Origin is rejected.
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!origin || (fetchSite && fetchSite !== 'same-origin')) return false;
  let originHost: string;
  try {
    const parsed = new URL(origin);
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.origin !== origin) return false;
    originHost = parsed.host;
  } catch { return false; }
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = request.headers.get('host');
  return originHost === forwarded || originHost === host;
}
async function boundedJson(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Error('invalid_input');
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY) throw new Error('invalid_input');
  return JSON.parse(text) as unknown;
}
export async function POST(request: Request): Promise<Response> {
  try {
    const jar = await cookies();
    if (!await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '')) return reply({ ok: false, error: 'unauthorized' }, 401);
    if (!sameOrigin(request)) return reply({ ok: false, error: 'forbidden' }, 403);
    const store = createHelpInboxStoreFromEnv(process.env);
    let input: unknown;
    try { input = await boundedJson(request); } catch { return reply({ ok: false, error: 'invalid_input' }, 400); }
    if (input === null || typeof input !== 'object' || Array.isArray(input)) return reply({ ok: false, error: 'invalid_input' }, 400);
    const body = input as Record<string, unknown>;
    if (Object.keys(body).some(key => key !== 'requestId' && key !== 'status') || typeof body.requestId !== 'string' ||
      !UUID.test(body.requestId) || body.requestId !== body.requestId.toLowerCase() || !isFollowUpStatus(body.status)) {
      return reply({ ok: false, error: 'invalid_input' }, 400);
    }
    const saved = await store.setStatus(body.requestId, body.status, new Date());
    if (!saved) return reply({ ok: false, error: 'not_found' }, 404);
    return reply({ ok: true, requestId: saved.requestId, followUp: { status: saved.status, updatedAt: saved.updatedAt, updatedBy: saved.updatedBy } }, 200);
  } catch { return reply({ ok: false, error: 'unavailable' }, 503); }
}
