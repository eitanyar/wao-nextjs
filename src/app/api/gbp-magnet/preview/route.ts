import { NextResponse } from 'next/server';
import { textSearch, placeDetails, buildEntrySignals } from '../../../../../scripts/lib/places-client.mjs';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { reserveDailyPlacesCalls } from '@/lib/gbp-magnet/daily-ceiling';
import { mintPreviewToken } from '@/lib/gbp-magnet/preview-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function field(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

function name(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Places details');
  const displayName = (value as { displayName?: { text?: unknown } }).displayName?.text;
  if (typeof displayName !== 'string' || !displayName.trim()) throw new Error('Invalid Places name');
  return displayName;
}

function placeId(value: unknown): string {
  if (!value || typeof value !== 'object' || typeof (value as { id?: unknown }).id !== 'string' ||
    !(value as { id: string }).id) throw new Error('Invalid Places id');
  return (value as { id: string }).id;
}

function signals(value: unknown): { rating: number | null; reviewCount: number } {
  const entry = buildEntrySignals(value);
  if ((entry.rating !== null && (typeof entry.rating !== 'number' || !Number.isFinite(entry.rating))) ||
    typeof entry.reviewCount !== 'number' || !Number.isSafeInteger(entry.reviewCount) || entry.reviewCount < 0) {
    throw new Error('Invalid Places signals');
  }
  return entry;
}

function unavailable() {
  return NextResponse.json({ error: 'unavailable' }, { status: 503 });
}

// The sole network seam is injected by offline tests; production uses global fetch.
export async function handlePreview(request: Request, fetchImpl: typeof fetch = fetch) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const businessName = field(input.businessName, 120);
  const city = field(input.city, 60);
  const category = field(input.category, 60);
  if (!businessName || !city || !category) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const limit = checkRateLimit(`gbp-magnet-preview:${ip}`, { maxRequests: 5, windowMs: 600_000 });
    if (!limit.allowed) return NextResponse.json({ error: 'rate_limited' }, {
      status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) },
    });

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const secret = process.env.GBP_MAGNET_TOKEN_SECRET;
    if (!apiKey?.trim() || !secret?.trim()) return unavailable();
    if (!reserveDailyPlacesCalls(1)) return unavailable();
    const targets = await textSearch(apiKey, `${businessName} ${city}`, { maxResults: 1, fetchImpl });
    if (!Array.isArray(targets)) return unavailable();
    if (!targets.length) return NextResponse.json({ success: false, reason: 'no_match' }, { status: 200 });
    const targetId = placeId(targets[0]);
    if (!reserveDailyPlacesCalls(1)) return unavailable();
    const targetDetails = await placeDetails(apiKey, targetId, { fetchImpl });
    const targetName = name(targetDetails);
    const targetSignals = signals(targetDetails);

    if (!reserveDailyPlacesCalls(1)) return unavailable();
    const candidates = await textSearch(apiKey, `${category} ${city}`, { maxResults: 8, fetchImpl });
    if (!Array.isArray(candidates)) return unavailable();
    const competitor = candidates.find(candidate => placeId(candidate) !== targetId);
    let competitorName: string | null = null;
    let competitorRating: number | null = null;
    let competitorReviewCount: number | null = null;
    if (competitor) {
      if (!reserveDailyPlacesCalls(1)) return unavailable();
      const details = await placeDetails(apiKey, placeId(competitor), { fetchImpl });
      competitorName = name(details);
      const competitorSignals = signals(details);
      competitorRating = competitorSignals.rating;
      competitorReviewCount = competitorSignals.reviewCount;
    }
    const previewToken = mintPreviewToken({ businessName, city, category }, secret);
    return NextResponse.json({ success: true, targetName, targetRating: targetSignals.rating,
      targetReviewCount: targetSignals.reviewCount, competitorName, competitorRating,
      competitorReviewCount, previewToken }, { status: 200 });
  } catch {
    return unavailable();
  }
}

export async function POST(request: Request) {
  return handlePreview(request);
}
