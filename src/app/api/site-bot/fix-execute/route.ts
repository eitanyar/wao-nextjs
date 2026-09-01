import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isGbpLive, getAccessToken } from '@/lib/gbp/client';
import { executeGbpLocationPatch } from '@/lib/gbp/executePatch';
import { appendEntry, readLog, makeEntryId, type ApprovalEntry } from '@/lib/site-bot/fixLog';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDITS_DIR = path.join(process.cwd(), 'data', 'audits');

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token === expected;
}

function recordExecutionLog(
  auditId: string,
  itemId: string,
  status: string,
  verificationResult: 'pass' | 'fail' | 'pending' = 'fail'
) {
  try {
    const entry: ApprovalEntry & { status: string; itemId: string; action: string } = {
      entryId: makeEntryId(auditId),
      clientId: auditId,
      actionId: itemId,
      actionType: 'mixed',
      targetUrl: `site-bot/fix/${auditId}`,
      contentSnippet: `fix-execute: ${status}`,
      tier: 'managed',
      approvedBy: 'system',
      approvedAt: new Date().toISOString(),
      verificationResult,
      verificationNote: status,
      fixAttempts: 1,
      status,
      itemId,
      action: 'fix_item_execution',
    };
    appendEntry(entry as unknown as ApprovalEntry);
  } catch {
    // Non-fatal if logging fails during execution reporting
  }
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const auditId = typeof body?.auditId === 'string' ? body.auditId.trim() : '';
    const itemId = typeof body?.itemId === 'string' ? body.itemId.trim() : '';
    const isMock = process.env.NODE_ENV === 'test' || body?.mock === true;

    if (!auditId || !UUID_REGEX.test(auditId) || !itemId) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    // Guard a: item missing/not-write_*
    const planPath = path.join(AUDITS_DIR, auditId, 'fix-plan.json');
    if (!fs.existsSync(planPath)) {
      recordExecutionLog(auditId, itemId, 'invalid_item');
      return NextResponse.json({ error: 'invalid_item' }, { status: 400 });
    }

    let plan: { items?: Array<{ id: string; type: string; payload?: Record<string, any> }> };
    try {
      const raw = fs.readFileSync(planPath, 'utf8');
      plan = JSON.parse(raw);
    } catch {
      recordExecutionLog(auditId, itemId, 'invalid_item');
      return NextResponse.json({ error: 'invalid_item' }, { status: 400 });
    }

    const items = Array.isArray(plan?.items) ? plan.items : [];
    const item = items.find((i) => i.id === itemId);
    if (!item || !item.type || !item.type.startsWith('write_')) {
      recordExecutionLog(auditId, itemId, 'invalid_item');
      return NextResponse.json({ error: 'invalid_item' }, { status: 400 });
    }

    // Guard b: no approved log entry for itemId
    const logEntries = readLog(auditId);
    const isApproved = logEntries.some(
      (e) =>
        (e.actionId === itemId || (e as unknown as { itemId?: string }).itemId === itemId) &&
        (e.verificationNote === 'approved_pending_connection' ||
          (e as unknown as { status?: string }).status === 'approved_pending_connection' ||
          e.verificationNote === 'gbp_connected' ||
          (e as unknown as { status?: string }).status === 'ready_to_execute' ||
          e.approvedBy === 'owner-self-serve')
    );

    if (!isApproved) {
      recordExecutionLog(auditId, itemId, 'not_approved');
      return NextResponse.json({ error: 'not_approved' }, { status: 409 });
    }

    // Guard c: !isGbpLive() check (skipped if mock/test simulation)
    if (!isGbpLive() && !isMock) {
      recordExecutionLog(auditId, itemId, 'gbp_not_live');
      return NextResponse.json({ error: 'gbp_not_live' }, { status: 503 });
    }

    // Guard d: audit file carries no gbpLocationId field
    const auditPath = path.join(AUDITS_DIR, `${auditId}.json`);
    if (!fs.existsSync(auditPath)) {
      recordExecutionLog(auditId, itemId, 'not_connected');
      return NextResponse.json({ error: 'not_connected' }, { status: 503 });
    }

    let auditData: { gbpAccountId?: string; gbpLocationId?: string };
    try {
      const raw = fs.readFileSync(auditPath, 'utf8');
      auditData = JSON.parse(raw);
    } catch {
      recordExecutionLog(auditId, itemId, 'not_connected');
      return NextResponse.json({ error: 'not_connected' }, { status: 503 });
    }

    if (!auditData.gbpLocationId) {
      recordExecutionLog(auditId, itemId, 'not_connected');
      return NextResponse.json({ error: 'not_connected' }, { status: 503 });
    }

    // Live GBP Execution or Mock Simulation
    if (isGbpLive()) {
      let accessToken: string;
      try {
        accessToken = await getAccessToken();
      } catch (tokenErr) {
        const message = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
        recordExecutionLog(auditId, itemId, 'execution_failed', 'fail');
        return NextResponse.json({ error: 'execution_failed', message }, { status: 502 });
      }

      const patchResult = await executeGbpLocationPatch({
        gbpAccountId: auditData.gbpAccountId || '',
        gbpLocationId: auditData.gbpLocationId,
        accessToken,
        fixItem: item,
      });

      if (patchResult.success) {
        recordExecutionLog(auditId, itemId, 'executed', 'pass');
        return NextResponse.json({
          success: true,
          itemId,
          status: 'executed',
          updatedFields: patchResult.updatedFields,
        });
      } else {
        recordExecutionLog(auditId, itemId, 'execution_failed', 'fail');
        return NextResponse.json(
          { error: 'execution_failed', message: patchResult.error },
          { status: 502 }
        );
      }
    } else if (isMock) {
      recordExecutionLog(auditId, itemId, 'executed', 'pass');
      return NextResponse.json({
        success: true,
        itemId,
        status: 'executed',
        simulated: true,
      });
    }

    recordExecutionLog(auditId, itemId, 'gbp_not_live');
    return NextResponse.json({ error: 'gbp_not_live' }, { status: 503 });
  } catch (error) {
    console.error('fix-execute error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
