import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { hasPlacesKey, normalizePhone, searchPlacesByName } from '@/lib/places/client';
import type { NormalizedPlace } from '@/lib/places/client';

/**
 * POST /api/site-bot/audit-lookup — GBP-audit lead-magnet intake (spec 2026-08-25_001,
 * Requirement 3): validate, rate-limit, look the business up via Places API (New),
 * persist the result under data/audits/<auditId>.json, answer { auditId, candidateCount }.
 *
 * Requirement 4 (result cache) — TERMS-CHECK OUTCOME, verified 2026-08-25:
 * the 30-day TTL the spec proposed as a ceiling is NOT permitted for Places content.
 *   - Google Maps Platform Terms of Service (https://cloud.google.com/maps-platform/terms/),
 *     §3.2.3(b) "No Caching": Google Maps Content may be cached only as expressly permitted
 *     by the Maps Service Specific Terms. §3.2.3(a)(iii) additionally forbids copying and
 *     saving business names, addresses, or user reviews.
 *   - Maps Service Specific Terms
 *     (https://cloud.google.com/maps-platform/terms/maps-service-terms/), §14 "Places API
 *     (Legacy and New)", §14.3 "Caching": the ONLY expressly permitted Places cache is
 *     latitude/longitude values, for up to 30 consecutive calendar days. There is no
 *     provision permitting caching of place content (name, address, rating, hours, ...).
 *   - Places API documentation, "Policies and attributions"
 *     (https://developers.google.com/maps/documentation/places/web-service/policies):
 *     "You must not pre-fetch, cache, or store Places API content beyond the allowed
 *     exceptions, although the place_id is exempt from caching restrictions."
 * Following the spec's own instruction ("if the terms specify a shorter period or
 * condition, implement the shorter limit and record both the clause and the TTL used"),
 * the implemented TTL is 0 — the full cache machinery below stays in place, gated off by
 * CACHE_TTL_MS, so re-enabling it is a one-constant change IF Google's terms ever grant a
 * content-caching allowance. Every request therefore performs a fresh Google call;
 * persistence under data/audits/ remains (it is the audit record of what was shown, the
 * same as any on-the-fly rendered display, not a cache serving repeat requests).
 */

interface AuditPayload {
  auditId: string;
  query: { businessName: string; phone?: string };
  fetchedAt: string;
  candidates: NormalizedPlace[];
}

interface CacheEntry {
  key: string;
  storedAt: string;
  auditPayload: AuditPayload;
}

/** Implemented TTL — see header comment. 0 disables the content cache entirely. */
const CACHE_TTL_MS = 0;

const AUDITS_DIR = path.join(process.cwd(), 'data', 'audits');
const CACHE_DIR = path.join(AUDITS_DIR, 'cache');

function normalizeBusinessName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

function cacheKeyFor(businessName: string, phone?: string): string {
  return crypto
    .createHash('sha256')
    .update(`${normalizeBusinessName(businessName)}|${normalizePhone(phone ?? '')}`)
    .digest('hex');
}

function persistAudit(payload: AuditPayload): void {
  fs.mkdirSync(AUDITS_DIR, { recursive: true });
  fs.writeFileSync(path.join(AUDITS_DIR, `${payload.auditId}.json`), JSON.stringify(payload, null, 2), 'utf8');
}

function readCacheEntry(key: string): CacheEntry | null {
  if (CACHE_TTL_MS <= 0) return null;
  try {
    const raw = fs.readFileSync(path.join(CACHE_DIR, `${key}.json`), 'utf8');
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry?.storedAt || !Array.isArray(entry.auditPayload?.candidates)) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeCacheEntry(key: string, payload: AuditPayload): void {
  if (CACHE_TTL_MS <= 0) return; // content caching not permitted under Google ToS (see header)
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const entry: CacheEntry = { key, storedAt: new Date().toISOString(), auditPayload: payload };
    fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(entry, null, 2), 'utf8');
  } catch {
    // Cache failures never fail the request — degrade silently to a fresh API call.
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const businessName = typeof body?.businessName === 'string' ? body.businessName.trim() : '';
    let phone: string | undefined;

    if (businessName.length < 2 || businessName.length > 80) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }
    if (body.phone !== undefined && body.phone !== null) {
      if (typeof body.phone !== 'string') {
        return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
      }
      const digits = normalizePhone(body.phone);
      if (digits.length < 7 || digits.length > 15) {
        return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
      }
      phone = body.phone;
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(`audit-lookup:${ip}`, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    if (!hasPlacesKey()) {
      return NextResponse.json({ error: 'places_not_configured' }, { status: 503 });
    }

    // Cache lookup (Requirement 4). With CACHE_TTL_MS = 0 this is always a miss —
    // Places content caching is not permitted (header comment). On a genuine hit the
    // branch below would respond with ZERO Google calls and restore the audit file.
    const key = cacheKeyFor(businessName, phone);
    const cached = readCacheEntry(key);
    if (cached && Date.now() - Date.parse(cached.storedAt) <= CACHE_TTL_MS) {
      try {
        if (!fs.existsSync(path.join(AUDITS_DIR, `${cached.auditPayload.auditId}.json`))) {
          persistAudit(cached.auditPayload); // shared deep links keep working
        }
      } catch {
        // Cache failures never fail the request.
      }
      return NextResponse.json({
        auditId: cached.auditPayload.auditId,
        candidateCount: cached.auditPayload.candidates.length,
        cached: true,
      });
    }

    const candidates = await searchPlacesByName({ name: businessName, phone });
    const payload: AuditPayload = {
      auditId: crypto.randomUUID(),
      query: { businessName },
      fetchedAt: new Date().toISOString(),
      candidates,
    };
    if (phone) payload.query.phone = phone;
    persistAudit(payload);
    writeCacheEntry(key, payload);

    return NextResponse.json({ auditId: payload.auditId, candidateCount: candidates.length });
  } catch (error) {
    console.error('audit-lookup error:', error);
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
}
