import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { readLog } from '@/lib/site-bot/fixLog';
import { readAuditRecord, UUID_REGEX } from '@/lib/site-bot/auditStore';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const auditId = searchParams.get('auditId')?.trim() ?? '';

    if (!auditId || !UUID_REGEX.test(auditId)) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(`connect-status:${ip}`, { maxRequests: 20, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const auditData = await readAuditRecord(auditId);
    if (!auditData) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const gbpLocationId = typeof auditData.gbpLocationId === 'string' ? auditData.gbpLocationId : null;
    const isConnected = Boolean(gbpLocationId);

    const logEntries = readLog(auditId);
    const itemLatestStatus = new Map<string, string>();

    for (const entry of logEntries) {
      const itemId = (entry as unknown as { itemId?: string }).itemId || entry.actionId;
      if (!itemId) continue;
      const status = (entry as unknown as { status?: string }).status || entry.verificationNote || '';
      if (status) {
        itemLatestStatus.set(itemId, status);
      }
    }

    let pendingApprovalsCount = 0;
    let readyToExecuteCount = 0;

    for (const status of itemLatestStatus.values()) {
      if (status === 'approved_pending_connection') {
        pendingApprovalsCount++;
      } else if (status === 'ready_to_execute' || status === 'gbp_connected') {
        readyToExecuteCount++;
      }
    }

    return NextResponse.json({
      auditId,
      isConnected,
      gbpLocationId,
      pendingApprovalsCount,
      readyToExecuteCount,
    });
  } catch (error) {
    console.error('connect-status error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
