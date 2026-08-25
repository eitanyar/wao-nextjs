import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { appendEntry, readLog, makeEntryId, type ApprovalEntry } from '@/lib/site-bot/fixLog';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDITS_DIR = path.join(process.cwd(), 'data', 'audits');

export async function POST(req: Request) {
  try {
    let auditId = '';
    let itemId = '';

    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null);
      if (typeof body?.auditId === 'string') auditId = body.auditId.trim();
      if (typeof body?.itemId === 'string') itemId = body.itemId.trim();
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        auditId = formData.get('auditId')?.toString().trim() ?? '';
        itemId = formData.get('itemId')?.toString().trim() ?? '';
      }
    } else {
      const body = await req.json().catch(async () => {
        const fd = await req.formData().catch(() => null);
        return fd
          ? {
              auditId: fd.get('auditId')?.toString(),
              itemId: fd.get('itemId')?.toString(),
            }
          : null;
      });
      if (typeof body?.auditId === 'string') auditId = body.auditId.trim();
      if (typeof body?.itemId === 'string') itemId = body.itemId.trim();
    }

    if (!auditId || !UUID_REGEX.test(auditId) || !itemId) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(`fix-approve:${ip}`, { maxRequests: 10, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const planPath = path.join(AUDITS_DIR, auditId, 'fix-plan.json');
    if (!fs.existsSync(planPath)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    let plan: { items?: Array<{ id: string; type: string }> };
    try {
      const raw = fs.readFileSync(planPath, 'utf8');
      plan = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const items = Array.isArray(plan?.items) ? plan.items : [];
    const item = items.find((i) => i.id === itemId);
    if (!item || !item.type || !item.type.startsWith('write_')) {
      return NextResponse.json({ error: 'invalid_item' }, { status: 400 });
    }

    const logEntries = readLog(auditId);
    const existing = logEntries.find(
      (e) =>
        (e.actionId === itemId || (e as unknown as { itemId?: string }).itemId === itemId) &&
        (e.verificationNote === 'approved_pending_connection' ||
          (e as unknown as { status?: string }).status === 'approved_pending_connection')
    );

    if (existing) {
      return NextResponse.json({
        status: 'approved_pending_connection',
        entry: existing,
      });
    }

    const now = new Date().toISOString();
    const entry: ApprovalEntry & { status: string; itemId: string; action: string } = {
      entryId: makeEntryId(auditId),
      clientId: auditId,
      actionId: itemId,
      actionType: 'mixed',
      targetUrl: `site-bot/fix/${auditId}`,
      contentSnippet: itemId,
      tier: 'managed',
      approvedBy: 'owner-self-serve',
      approvedAt: now,
      verificationResult: 'pending',
      verificationNote: 'approved_pending_connection',
      fixAttempts: 0,
      status: 'approved_pending_connection',
      itemId,
      action: 'fix_item_approval',
    };

    appendEntry(entry as unknown as ApprovalEntry);

    return NextResponse.json({ status: 'approved_pending_connection' });
  } catch (error) {
    console.error('fix-approve error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
