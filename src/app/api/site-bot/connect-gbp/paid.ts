import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import {
  readAuditRecord,
  UUID_REGEX,
  type AuditLocationBinding,
} from '@/lib/site-bot/auditStore';
import { connectAuditGbpLocation } from '@/lib/site-bot/gbpConnect';

const LOCATION_ID_REGEX = /^(locations\/[0-9a-zA-Z_-]+|[0-9]+)$/;
const VALID_CONNECTION_METHODS = ['oauth_direct', 'manager_invite', 'manual_override'] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const auditId = typeof body.auditId === 'string' ? body.auditId.trim() : '';
    const gbpLocationId = typeof body.gbpLocationId === 'string' ? body.gbpLocationId.trim() : '';
    const gbpAccountId = typeof body.gbpAccountId === 'string' ? body.gbpAccountId.trim() : '';
    const connectedByEmail = typeof body.connectedByEmail === 'string' ? body.connectedByEmail.trim() : undefined;
    const connectionMethodRaw = typeof body.connectionMethod === 'string' ? body.connectionMethod.trim() : 'oauth_direct';

    if (!auditId || !UUID_REGEX.test(auditId)) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    if (!gbpLocationId || !LOCATION_ID_REGEX.test(gbpLocationId)) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    if (!VALID_CONNECTION_METHODS.includes(connectionMethodRaw as (typeof VALID_CONNECTION_METHODS)[number])) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(`connect-gbp:${ip}`, { maxRequests: 10, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const existingAudit = await readAuditRecord(auditId);
    if (!existingAudit) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const binding: AuditLocationBinding = {
      gbpAccountId: gbpAccountId || 'accounts/unknown',
      gbpLocationId,
      connectedAt: new Date().toISOString(),
      ...(connectedByEmail ? { connectedByEmail } : {}),
      connectionMethod: connectionMethodRaw as AuditLocationBinding['connectionMethod'],
    };

    const result = await connectAuditGbpLocation(auditId, binding);
    if (!result.success) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      auditId,
      gbpLocationId,
      queuedItemsCount: result.queuedItemsCount,
    });
  } catch (error) {
    console.error('connect-gbp error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
