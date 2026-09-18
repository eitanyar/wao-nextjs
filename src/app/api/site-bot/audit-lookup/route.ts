import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { hasPlacesKey, searchPlacesByName } from '@/lib/places/client';
import type { NormalizedPlace } from '@/lib/places/client';
import { purgeExpiredAuditRecords, writeAuditRecord } from '@/lib/site-bot/auditStore';
import type { AuditCandidateSnapshot } from '@/lib/site-bot/auditStore';

function minimizeCandidate(place: NormalizedPlace): AuditCandidateSnapshot {
  return {
    placeId: place.placeId,
    displayName: place.displayName,
    formattedAddress: place.formattedAddress,
    types: Array.isArray(place.types) ? place.types : [],
    hasRegularOpeningHours: (place.regularOpeningHours?.periods.length ?? 0) > 0,
    hasSpecialOpeningHours: (place.specialOpeningHours?.length ?? 0) > 0,
    hasPhone: Boolean(place.nationalPhoneNumber || place.internationalPhoneNumber),
    hasWebsite: Boolean(place.websiteUri),
    photosFetched: place.photos?.fetched === true,
    photoCount: place.photos?.count ?? 0,
    hasRating: place.rating !== undefined,
    ...(place.userRatingCount !== undefined ? { userRatingCount: place.userRatingCount } : {}),
    hasEditorialSummary: Boolean(place.editorialSummary?.trim()),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const businessName = typeof body?.businessName === 'string' ? body.businessName.trim() : '';
    if (businessName.length < 2 || businessName.length > 80) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }
    if (body?.phone !== undefined && body?.phone !== null) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(`audit-lookup:${ip}`, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    if (!hasPlacesKey()) return NextResponse.json({ error: 'places_not_configured' }, { status: 503 });

    await purgeExpiredAuditRecords();
    const candidates = await searchPlacesByName({ name: businessName });
    const auditId = crypto.randomUUID();
    const stored = await writeAuditRecord(auditId, {
      query: { businessName },
      fetchedAt: new Date().toISOString(),
      candidates: candidates.map(minimizeCandidate),
    });
    if (!stored) {
      console.error('AUDIT_LOOKUP_STORE_FAILED');
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
    }
    return NextResponse.json({ auditId, candidateCount: candidates.length });
  } catch {
    console.error('AUDIT_LOOKUP_FAILED');
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
}
