import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { hasPlacesKey, searchPlacesByName } from '@/lib/places/client';
import type { NormalizedPlace } from '@/lib/places/client';
import { purgeExpiredAuditRecords, writeAuditRecord } from '@/lib/site-bot/auditStore';
import type { AuditCandidateSnapshot } from '@/lib/site-bot/auditStore';
import {
  closeSiteBotAuditLookupBudget, openSiteBotAuditLookupBudget,
  parseSiteBotAuditDailyCeiling, reserveSiteBotAuditLookup,
} from '@/lib/site-bot/auditLookupBudget';

function lookupReply(body: object, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

async function readBoundedAuditLookupBody(req: Request): Promise<
  { ok: true; body: unknown } | { ok: false; status: 400 | 413; error: 'invalid_input' | 'payload_too_large' }
> {
  const invalid = { ok: false, status: 400, error: 'invalid_input' } as const;
  const oversized = { ok: false, status: 413, error: 'payload_too_large' } as const;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const stream = req.body;
    if (!stream) return invalid;
    reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.byteLength > 4096) {
        await reader.cancel().catch(() => undefined);
        return oversized;
      }
      chunks.push(value);
      size += value.byteLength;
    }
    if (size === 0) return invalid;
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, body: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
  } catch {
    return invalid;
  } finally {
    reader?.releaseLock();
  }
}

// C0/C1 controls and bidi embedding / override / isolate controls (written as escapes: this file stays ASCII).
const DISPLAY_NAME_CONTROLS = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/;

function displayNameOf(value: unknown): string | undefined {
  if (typeof value !== 'string' || DISPLAY_NAME_CONTROLS.test(value)) return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= 80 ? trimmed : undefined;
}

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
    // Launch step 1 (eligibility block): the primary category and operating status, both already in the search field mask.
    ...(typeof place.primaryType === 'string' && /^[a-z][a-z0-9_]{1,80}$/.test(place.primaryType) ? { primaryType: place.primaryType } : {}),
    // Trade-scope fallback (profileEligibility.ts): Google's own display name of the primary type, bounded, no controls.
    ...(displayNameOf(place.primaryTypeDisplayName) ? { primaryTypeDisplayName: displayNameOf(place.primaryTypeDisplayName) } : {}),
    ...(typeof place.businessStatus === 'string' && /^[A-Z_]{1,40}$/.test(place.businessStatus) ? { businessStatus: place.businessStatus } : {}),
  };
}

export async function POST(req: Request) {
  try {
    const parsed = await readBoundedAuditLookupBody(req);
    if (!parsed.ok) return lookupReply({ error: parsed.error }, parsed.status);
    const body = parsed.body as { businessName?: unknown; phone?: unknown } | null;
    const businessName = typeof body?.businessName === 'string' ? body.businessName.trim() : '';
    if (businessName.length < 2 || businessName.length > 80) {
      return lookupReply({ error: 'invalid_input' }, 400);
    }
    if (body?.phone !== undefined && body?.phone !== null) {
      return lookupReply({ error: 'invalid_input' }, 400);
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(`audit-lookup:${ip}`, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return lookupReply({ error: 'rate_limited' }, 429);
    if (!hasPlacesKey()) return lookupReply({ error: 'places_not_configured' }, 503);

    const ceiling = parseSiteBotAuditDailyCeiling(process.env.SITE_BOT_AUDIT_DAILY_CALL_CEILING);
    const dbPath = process.env.SITE_BOT_AUDIT_BUDGET_DB_PATH;
    if (ceiling === null || !dbPath) return lookupReply({ error: 'audit_budget_unavailable' }, 503);
    let reservation: 'reserved' | 'exhausted' | 'unavailable' = 'unavailable';
    try {
      const store = openSiteBotAuditLookupBudget(dbPath);
      try {
        reservation = reserveSiteBotAuditLookup(store, ceiling).status;
      } finally {
        closeSiteBotAuditLookupBudget(store);
      }
    } catch {
      return lookupReply({ error: 'audit_budget_unavailable' }, 503);
    }
    if (reservation === 'unavailable') return lookupReply({ error: 'audit_budget_unavailable' }, 503);
    if (reservation === 'exhausted') return lookupReply({ error: 'audit_budget_exhausted' }, 429);

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
      return lookupReply({ error: 'lookup_failed' }, 500);
    }
    return lookupReply({ auditId, candidateCount: candidates.length }, 200);
  } catch {
    console.error('AUDIT_LOOKUP_FAILED');
    return lookupReply({ error: 'lookup_failed' }, 500);
  }
}
