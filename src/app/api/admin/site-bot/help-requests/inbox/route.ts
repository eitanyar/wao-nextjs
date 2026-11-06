// Operator inbox view: valid v1 requests plus follow-up status. Unreadable or
// unexpected files are skipped and counted; the full-record endpoint is unchanged.
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { createHelpInboxStoreFromEnv } from '@/lib/site-bot/helpFollowUp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export async function GET(): Promise<Response> {
  try {
    const jar = await cookies();
    if (!await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '')) return reply({ ok: false, error: 'unauthorized' }, 401);
    const { entries, skipped } = await createHelpInboxStoreFromEnv(process.env).list();
    const requests = entries.map(({ record: r, followUp }) => ({ requestId: r.requestId, displayName: r.displayName, name: r.name,
      ...(r.email !== undefined ? { email: r.email } : {}), ...(r.phone !== undefined ? { phone: r.phone } : {}),
      receivedAt: r.receivedAt,
      followUp: followUp ? { status: followUp.status, updatedAt: followUp.updatedAt, updatedBy: followUp.updatedBy } : { status: 'received' } }));
    return reply({ ok: true, requests, skipped }, 200);
  } catch { return reply({ ok: false, error: 'unavailable' }, 503); }
}
