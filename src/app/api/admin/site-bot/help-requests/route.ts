import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { createHelpOperatorStore } from '@/lib/site-bot/helpOperatorStore';

export const runtime = 'nodejs';
function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export async function GET(): Promise<Response> {
  try {
    const jar = await cookies();
    if (!await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '')) return reply({ ok: false, error: 'unauthorized' }, 401);
    const root = process.env.SITE_BOT_HELP_REQUEST_DIR;
    if (process.env.SITE_BOT_HELP_INTAKE_ENABLED !== 'true' || !root) throw new Error('disabled');
    return reply({ ok: true, requests: await createHelpOperatorStore(root).list() }, 200);
  } catch { return reply({ ok: false, error: 'unavailable' }, 503); }
}