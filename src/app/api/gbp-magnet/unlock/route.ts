import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { textSearch, placeDetails, buildEntrySignals } from '../../../../../scripts/lib/places-client.mjs';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { reserveDailyPlacesCalls } from '@/lib/gbp-magnet/daily-ceiling';
import { verifyPreviewToken } from '@/lib/gbp-magnet/preview-token';
import { consumePreviewTokenJti } from '@/lib/gbp-magnet/token-consumption';
import { captureLead } from '@/lib/crm/lead-capture';
import { createLeadsStore, type LeadsStore } from '@/lib/crm/leadsStore';
import { sendLeadNotificationEmail } from '@/lib/mail';
import type { LeadRecord } from '@/lib/crm/intelligence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Dependencies = {
  store?: LeadsStore;
  sendMail?: (lead: LeadRecord) => Promise<unknown>;
};

function field(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

function optionalField(value: unknown, max: number): string | undefined | null {
  if (value === undefined) return undefined;
  return field(value, max);
}

function placeId(value: unknown): string {
  if (!value || typeof value !== 'object' || typeof (value as { id?: unknown }).id !== 'string' ||
    !(value as { id: string }).id) throw new Error('Invalid Places id');
  return (value as { id: string }).id;
}

function entry(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Places details');
  const name = (value as { displayName?: { text?: unknown } }).displayName?.text;
  if (typeof name !== 'string' || !name.trim()) throw new Error('Invalid Places name');
  const signals = buildEntrySignals(value);
  if ((signals.rating !== null && (typeof signals.rating !== 'number' || !Number.isFinite(signals.rating))) ||
    typeof signals.reviewCount !== 'number' || !Number.isSafeInteger(signals.reviewCount) || signals.reviewCount < 0 ||
    !Number.isSafeInteger(signals.sampleSize) || signals.sampleSize < 0 ||
    !Object.values(signals.recentPace).every(n => Number.isSafeInteger(n) && n >= 0)) {
    throw new Error('Invalid Places signals');
  }
  return { name, rating: signals.rating, reviewCount: signals.reviewCount,
    recentPace: signals.recentPace, sampleSize: signals.sampleSize };
}

// Match readiness-gate.mjs prospectSlug without importing its CLI entrypoint.
function prospectSlug(businessName: string, city: string): string {
  const raw = `${businessName || ''}-${city || ''}`;
  const ascii = raw.normalize('NFKD').replace(/[^\x00-\x7F]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const hash = createHash('sha1').update(raw).digest('hex').slice(0, 8);
  return ascii ? `${ascii}-${hash}` : hash;
}

function unavailable() {
  return NextResponse.json({ error: 'unavailable' }, { status: 503 });
}

export async function handleUnlock(request: Request, fetchImpl: typeof fetch = fetch, deps: Dependencies = {}) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const previewToken = field(input.previewToken, 4096);
  const name = field(input.name, 120);
  const phone = typeof input.phone === 'string' ? input.phone.replace(/[\s-]/g, '') : '';
  const email = field(input.email, 320);
  const gclid = optionalField(input.gclid, 1024);
  const wbraid = optionalField(input.wbraid, 1024);
  const gbraid = optionalField(input.gbraid, 1024);
  if (!previewToken || !name || !/^0\d{8,9}$/.test(phone) || !email?.includes('@') ||
    input.consentGiven !== true || gclid === null || wbraid === null || gbraid === null) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const limit = checkRateLimit(`gbp-magnet-unlock:${ip}`, { maxRequests: 3, windowMs: 600_000 });
    if (!limit.allowed) return NextResponse.json({ error: 'rate_limited' }, {
      status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) },
    });

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const secret = process.env.GBP_MAGNET_TOKEN_SECRET;
    if (!apiKey?.trim() || !secret?.trim()) return unavailable();
    const payload = verifyPreviewToken(previewToken, secret);
    if (!payload || !consumePreviewTokenJti(payload.jti)) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 403 });
    }

    if (!reserveDailyPlacesCalls(1)) return unavailable();
    const targets = await textSearch(apiKey, `${payload.businessName} ${payload.city}`, { maxResults: 1, fetchImpl });
    if (!Array.isArray(targets)) return unavailable();
    if (!targets.length) return NextResponse.json({ success: false, reason: 'no_match' }, { status: 200 });
    const targetId = placeId(targets[0]);
    if (!reserveDailyPlacesCalls(1)) return unavailable();
    const target = entry(await placeDetails(apiKey, targetId, { fetchImpl }));

    if (!reserveDailyPlacesCalls(1)) return unavailable();
    const candidates = await textSearch(apiKey, `${payload.category} ${payload.city}`, { maxResults: 8, fetchImpl });
    if (!Array.isArray(candidates)) return unavailable();
    const competitorIds = candidates.map(placeId).filter(id => id !== targetId).slice(0, 3);
    const competitors = [];
    for (const id of competitorIds) {
      if (!reserveDailyPlacesCalls(1)) return unavailable();
      competitors.push(entry(await placeDetails(apiKey, id, { fetchImpl })));
    }

    const store = deps.store ?? createLeadsStore();
    const newLead = await store.updateLeads(leads => {
      const captured = captureLead({ leads, body: {
        name, phone, email, type: 'gbp-magnet-unlock', source: 'gbp-magnet',
        businessNiche: payload.category, slug: prospectSlug(payload.businessName, payload.city),
        customerId: '', gclid, wbraid, gbraid, contactConsentAt: new Date().toISOString(),
      } });
      return { leads: [...leads, captured.lead], result: captured.lead };
    });
    void Promise.resolve().then(() => (deps.sendMail ?? sendLeadNotificationEmail)(newLead)).catch(console.error);
    return NextResponse.json({ success: true, targetName: target.name, targetRating: target.rating,
      targetReviewCount: target.reviewCount, targetRecentPace: target.recentPace,
      targetSampleSize: target.sampleSize, competitors, leadId: newLead.id }, { status: 200 });
  } catch {
    return unavailable();
  }
}

export async function POST(request: Request) {
  return handleUnlock(request);
}
