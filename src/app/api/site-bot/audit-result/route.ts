import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { scoreAudit } from '@/lib/gbp/auditScore';
import { readAuditRecord, UUID_REGEX } from '@/lib/site-bot/auditStore';
import type { AuditCandidateSnapshot } from '@/lib/site-bot/auditStore';

function readyResponse(candidate: AuditCandidateSnapshot) {
  return {
    status: 'ready',
    businessName: candidate.displayName,
    score: scoreAudit(candidate),
    placeId: candidate.placeId,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const auditId = searchParams.get('auditId');
    const placeId = searchParams.get('placeId');
    if (!auditId || !UUID_REGEX.test(auditId)) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(`audit-result:${ip}`, { maxRequests: 20, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

    const record = await readAuditRecord(auditId);
    if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (placeId) {
      const candidate = record.candidates.find((value) => value.placeId === placeId);
      return candidate
        ? NextResponse.json(readyResponse(candidate))
        : NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    if (record.candidates.length === 0) return NextResponse.json({ status: 'not_found' });
    if (record.candidates.length === 1) return NextResponse.json(readyResponse(record.candidates[0]));
    return NextResponse.json({
      status: 'pick',
      candidates: record.candidates.map(({ placeId, displayName, formattedAddress }) => ({
        placeId,
        displayName,
        formattedAddress,
      })),
    });
  } catch {
    console.error('AUDIT_RESULT_FAILED');
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
