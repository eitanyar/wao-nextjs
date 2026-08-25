import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { scoreAudit } from '@/lib/gbp/auditScore';
import { deriveFixPlan } from '@/lib/gbp/fixPlan';
import type { NormalizedPlace } from '@/lib/places/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDITS_DIR = path.join(process.cwd(), 'data', 'audits');

interface AuditPayload {
  auditId: string;
  query: { businessName: string; phone?: string };
  fetchedAt: string;
  candidates: NormalizedPlace[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const auditId = typeof body?.auditId === 'string' ? body.auditId.trim() : '';

    if (!auditId || !UUID_REGEX.test(auditId)) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(`fix-plan:${ip}`, { maxRequests: 10, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const filePath = path.join(AUDITS_DIR, `${auditId}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    let payload: AuditPayload;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      payload = JSON.parse(raw) as AuditPayload;
    } catch {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    if (!payload || !Array.isArray(payload.candidates) || payload.candidates.length === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const candidate = payload.candidates[0];
    const score = scoreAudit(candidate);
    const derivedItems = deriveFixPlan(score);

    // Optional itemIds filter (query param &itemIds= or body field itemIds)
    const url = new URL(req.url);
    const queryItemIds = url.searchParams.get('itemIds');
    const rawItemIds = queryItemIds !== null ? queryItemIds : body?.itemIds;

    let items = derivedItems;
    if (rawItemIds !== null && rawItemIds !== undefined) {
      const requestedIds: string[] = Array.isArray(rawItemIds)
        ? rawItemIds.map(s => String(s).trim()).filter(Boolean)
        : typeof rawItemIds === 'string'
        ? rawItemIds.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      if (requestedIds.length > 0) {
        const derivedIds = new Set(derivedItems.map(i => i.id));
        for (const reqId of requestedIds) {
          if (!derivedIds.has(reqId)) {
            return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
          }
        }
        items = derivedItems.filter(i => requestedIds.includes(i.id));
      }
    }

    const generatedAt = new Date().toISOString();

    const planDir = path.join(AUDITS_DIR, auditId);
    fs.mkdirSync(planDir, { recursive: true });
    fs.writeFileSync(
      path.join(planDir, 'fix-plan.json'),
      JSON.stringify({ auditId, generatedAt, items }, null, 2),
      'utf8'
    );

    return NextResponse.json({ itemCount: items.length, items });
  } catch (error) {
    console.error('fix-plan error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
