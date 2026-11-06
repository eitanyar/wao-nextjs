import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { scoreAudit } from '@/lib/gbp/auditScore';
import { readAuditRecord, UUID_REGEX } from '@/lib/site-bot/auditStore';
import type { AuditCandidateSnapshot } from '@/lib/site-bot/auditStore';

function getReply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function readyResponse(candidate: AuditCandidateSnapshot) {
  return {
    status: 'ready',
    businessName: candidate.displayName,
    formattedAddress: candidate.formattedAddress,
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
      return getReply({ error: 'invalid_input' }, 400);
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(`audit-result:${ip}`, { maxRequests: 20, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return getReply({ error: 'rate_limited' }, 429);

    const record = await readAuditRecord(auditId);
    if (!record) return getReply({ error: 'not_found' }, 404);

    if (placeId) {
      const candidate = record.candidates.find((value) => value.placeId === placeId);
      return candidate
        ? getReply(readyResponse(candidate), 200)
        : getReply({ error: 'not_found' }, 404);
    }

    if (record.candidates.length === 0) return getReply({ status: 'not_found' }, 200);
    if (record.candidates.length === 1) return getReply(readyResponse(record.candidates[0]), 200);
    return getReply({
      status: 'pick',
      candidates: record.candidates.map(({ placeId, displayName, formattedAddress }) => ({
        placeId,
        displayName,
        formattedAddress,
      })),
    }, 200);
  } catch {
    console.error('AUDIT_RESULT_FAILED');
    return getReply({ error: 'server_error' }, 500);
  }
}
