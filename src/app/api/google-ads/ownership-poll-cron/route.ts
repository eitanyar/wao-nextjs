import { NextResponse } from 'next/server';

/**
 * Ads Bot ownership poll cron (mission item 4). Auth: `Authorization: Bearer <CRON_SECRET>`, same convention as
 * weekly-digest-cron (fails closed when CRON_SECRET is unset). DISABLED by default: unless
 * GOOGLE_ADS_OWNERSHIP_POLL_ENABLED is exactly 'true' it answers `status: 'disabled'` and makes no Google call.
 * When enabled it polls every client with an ownership record (Google reads only, never a mutation).
 */
function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token === expected;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (process.env.GOOGLE_ADS_OWNERSHIP_POLL_ENABLED !== 'true') {
    return NextResponse.json({ success: true, status: 'disabled', reason: 'ownership_poll_disabled' });
  }

  const { listOwnershipClientIds, pollClientOwnership } = await import('@/lib/google-ads/ownership');
  const results: Array<{ clientId: string; ok: boolean; errors?: string[] }> = [];
  for (const clientId of listOwnershipClientIds()) {
    try {
      const result = await pollClientOwnership(clientId);
      results.push(result.ok ? { clientId, ok: true, errors: Object.keys(result.errors) } : { clientId, ok: false, errors: [result.error] });
    } catch {
      results.push({ clientId, ok: false, errors: ['poll_failed'] });
    }
  }
  return NextResponse.json({ success: true, status: 'ran', polled: results.length, results });
}
