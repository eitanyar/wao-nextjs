import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { hasPlacesKey, searchPlacesByName, type NormalizedPlace } from '@/lib/places/client';
import { scoreAudit, type AuditResult } from '@/lib/gbp/auditScore';
import { calculateAuditDrift, saveDriftReport } from '@/lib/site-bot/driftMonitor';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDITS_DIR = path.join(process.cwd(), 'data', 'audits');

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token === expected;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const auditId = typeof body?.auditId === 'string' ? body.auditId.trim() : '';
    const isMock = process.env.NODE_ENV === 'test' || body?.mock === true;

    if (!auditId || !UUID_REGEX.test(auditId)) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const filePath = path.join(AUDITS_DIR, `${auditId}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    let baselineAudit: Record<string, any>;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      baselineAudit = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    let currentAudit: Record<string, any>;

    if (body?.currentAudit && typeof body.currentAudit === 'object') {
      currentAudit = { ...body.currentAudit, auditId };
    } else if (body?.currentPlace && typeof body.currentPlace === 'object') {
      const scorecard: AuditResult = scoreAudit(body.currentPlace as NormalizedPlace);
      currentAudit = {
        auditId,
        scorecard,
        place: body.currentPlace,
        candidates: [body.currentPlace],
        fetchedAt: new Date().toISOString(),
      };
    } else if (hasPlacesKey()) {
      const businessName =
        baselineAudit.query?.businessName ||
        baselineAudit.candidates?.[0]?.displayName ||
        baselineAudit.place?.displayName ||
        '';
      const phone =
        baselineAudit.query?.phone ||
        baselineAudit.candidates?.[0]?.nationalPhoneNumber ||
        baselineAudit.candidates?.[0]?.internationalPhoneNumber ||
        undefined;

      if (!businessName) {
        return NextResponse.json({ error: 'cannot_determine_business_name' }, { status: 400 });
      }

      const candidates = await searchPlacesByName({ name: businessName, phone });
      if (!candidates || candidates.length === 0) {
        return NextResponse.json({ error: 'place_not_found' }, { status: 404 });
      }

      const currentPlace = candidates[0];
      const scorecard = scoreAudit(currentPlace);
      currentAudit = {
        auditId,
        scorecard,
        place: currentPlace,
        candidates,
        fetchedAt: new Date().toISOString(),
      };
    } else if (isMock) {
      // Offline / Test mock simulation
      const basePlace = baselineAudit.place || baselineAudit.candidates?.[0] || {};
      const simulatedPlace: NormalizedPlace = {
        placeId: basePlace.placeId || 'mock-place-id',
        displayName: basePlace.displayName || 'Mock Business',
        formattedAddress: basePlace.formattedAddress || 'Mock Address',
        types: Array.isArray(basePlace.types) ? basePlace.types : ['plumber'],
        userRatingCount: (basePlace.userRatingCount || 0) + 1,
        rating: basePlace.rating || 4.5,
        websiteUri: basePlace.websiteUri || 'https://example.com',
        regularOpeningHours: basePlace.regularOpeningHours || { periods: [] },
      };
      const scorecard = scoreAudit(simulatedPlace);
      currentAudit = {
        auditId,
        scorecard,
        place: simulatedPlace,
        candidates: [simulatedPlace],
        fetchedAt: new Date().toISOString(),
      };
    } else {
      return NextResponse.json({ error: 'places_not_configured' }, { status: 503 });
    }

    const driftReport = calculateAuditDrift(baselineAudit, currentAudit);
    saveDriftReport(auditId, driftReport);

    return NextResponse.json({
      success: true,
      driftReport,
    });
  } catch (error) {
    console.error('re-audit error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
