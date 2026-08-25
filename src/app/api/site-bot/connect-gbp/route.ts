import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { appendEntry, readLog, makeEntryId, type ApprovalEntry } from '@/lib/site-bot/fixLog';
import {
  bindAuditLocation,
  readAuditRecord,
  UUID_REGEX,
  type AuditLocationBinding,
} from '@/lib/site-bot/auditStore';

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

    const bound = await bindAuditLocation(auditId, binding);
    if (!bound) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const logEntries = readLog(auditId);
    const itemLatestStatus = new Map<string, { status: string; approvedAt?: string }>();

    for (const entry of logEntries) {
      const itemId = (entry as unknown as { itemId?: string }).itemId || entry.actionId;
      if (!itemId) continue;
      const status = (entry as unknown as { status?: string }).status || entry.verificationNote || '';
      itemLatestStatus.set(itemId, {
        status,
        approvedAt: entry.approvedAt,
      });
    }

    let queuedItemsCount = 0;
    const now = new Date().toISOString();

    for (const [itemId, info] of itemLatestStatus.entries()) {
      if (info.status === 'approved_pending_connection') {
        const updateEntry: ApprovalEntry & { status: string; itemId: string; action: string } = {
          entryId: makeEntryId(auditId),
          clientId: auditId,
          actionId: itemId,
          actionType: 'mixed',
          targetUrl: `site-bot/fix/${auditId}`,
          contentSnippet: itemId,
          tier: 'managed',
          approvedBy: 'owner-self-serve',
          approvedAt: info.approvedAt || now,
          verificationResult: 'pending',
          verificationNote: 'gbp_connected',
          fixAttempts: 0,
          status: 'ready_to_execute',
          itemId,
          action: 'connection_status_update',
        };
        appendEntry(updateEntry as unknown as ApprovalEntry);
        queuedItemsCount++;
      }
    }

    return NextResponse.json({
      success: true,
      auditId,
      gbpLocationId,
      queuedItemsCount,
    });
  } catch (error) {
    console.error('connect-gbp error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
