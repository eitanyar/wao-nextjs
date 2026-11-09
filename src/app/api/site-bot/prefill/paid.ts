import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { readAuditRecord } from '@/lib/site-bot/auditStore';
import { getPlaceDetailsRaw, hasPlacesKey } from '@/lib/places/client';
import { mapPlaceDetailsToSnapshot, PREFILL_DETAILS_FIELD_MASK, type PrefillSnapshot } from '@/lib/site-bot/placePrefill';
import { handlePrefillRequest, resolvePrefillProviderMode } from '@/lib/site-bot/prefillHandler';

// Paid-journey v2 M1 (B11): GET /api/site-bot/prefill, reachable only through the
// SITE_BOT_PAID_FLOW gate in ./route. All checks live in handlePrefillRequest (candidate
// check, rate limits, fixture mode); this file only wires the real dependencies.

// In-flight de-duplication only (a double effect in dev must not cost two Places reads).
// The entry is dropped as soon as the read settles: no Places content is cached.
const inFlight = new Map<string, Promise<PrefillSnapshot>>();

function fetchSnapshotOnce(placeId: string): Promise<PrefillSnapshot> {
  const pending = inFlight.get(placeId);
  if (pending) return pending;
  const request = getPlaceDetailsRaw(placeId, PREFILL_DETAILS_FIELD_MASK)
    .then(raw => mapPlaceDetailsToSnapshot(raw, placeId))
    .finally(() => inFlight.delete(placeId));
  inFlight.set(placeId, request);
  return request;
}

function reply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const result = await handlePrefillRequest({
      auditId: searchParams.get('auditId'),
      placeId: searchParams.get('placeId'),
      ip,
    }, {
      mode: resolvePrefillProviderMode(process.env),
      rateLimit: checkRateLimit,
      readAudit: auditId => readAuditRecord(auditId),
      hasLiveKey: hasPlacesKey,
      fetchSnapshot: fetchSnapshotOnce,
      logFailure: code => console.error(`[site-bot prefill] ${code}`),
    });
    return reply(result.body, result.status);
  } catch {
    console.error('[site-bot prefill] PREFILL_FAILED');
    return reply({ error: 'server_error' }, 500);
  }
}
