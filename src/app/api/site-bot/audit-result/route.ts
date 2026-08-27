import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { scoreAudit } from '@/lib/gbp/auditScore';
import type { NormalizedPlace } from '@/lib/places/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDITS_DIR = path.join(process.cwd(), 'data', 'audits');

interface AuditPayload {
  auditId: string;
  query: { businessName: string; phone?: string };
  fetchedAt: string;
  candidates: NormalizedPlace[];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const auditId = searchParams.get('auditId');
    const placeId = searchParams.get('placeId');
    const withPlace = searchParams.get('withPlace') === '1';

    if (!auditId || !UUID_REGEX.test(auditId)) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(`audit-result:${ip}`, { maxRequests: 20, windowMs: 10 * 60 * 1000 });
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

    if (!payload || !Array.isArray(payload.candidates)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    if (placeId) {
      const candidate = payload.candidates.find((c) => c.placeId === placeId);
      if (!candidate) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      const score = scoreAudit(candidate);
      return NextResponse.json({
        status: 'ready',
        businessName: candidate.displayName,
        score,
        googleMapsUri: candidate.googleMapsUri ?? null,
        location: candidate.location ?? null,
        primaryCategory: candidate.primaryTypeDisplayName || candidate.primaryType || null,
        placeId: candidate.placeId,
        phone: candidate.nationalPhoneNumber || candidate.internationalPhoneNumber || null,
        ...(withPlace ? { place: candidate } : {}),
      });
    }

    if (payload.candidates.length === 0) {
      return NextResponse.json({ status: 'not_found' });
    }

    if (payload.candidates.length === 1) {
      const candidate = payload.candidates[0];
      const score = scoreAudit(candidate);
      return NextResponse.json({
        status: 'ready',
        businessName: candidate.displayName,
        score,
        googleMapsUri: candidate.googleMapsUri ?? null,
        location: candidate.location ?? null,
        primaryCategory: candidate.primaryTypeDisplayName || candidate.primaryType || null,
        placeId: candidate.placeId,
        phone: candidate.nationalPhoneNumber || candidate.internationalPhoneNumber || null,
        ...(withPlace ? { place: candidate } : {}),
      });
    }

    return NextResponse.json({
      status: 'pick',
      candidates: payload.candidates.map((c) => ({
        placeId: c.placeId,
        displayName: c.displayName,
        formattedAddress: c.formattedAddress,
      })),
      ...(withPlace ? { place: payload.candidates[0] } : {}),
    });
  } catch (error) {
    console.error('audit-result error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
