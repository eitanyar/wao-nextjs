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

function reAuditReply(body: object, status: number = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return reAuditReply({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await req.json().catch(() => null);
    const auditId = typeof body?.auditId === 'string' ? body.auditId.trim() : '';
    const isMock = process.env.NODE_ENV === 'test' || body?.mock === true;

    if (!auditId || !UUID_REGEX.test(auditId)) {
      return reAuditReply({ error: 'invalid_input' }, 400);
    }

    const filePath = path.join(AUDITS_DIR, `${auditId}.json`);
    if (!fs.existsSync(filePath)) {
      return reAuditReply({ error: 'not_found' }, 404);
    }

    // Existing audit payload shape is intentionally dynamic in this route.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let baselineAudit: Record<string, any>;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      baselineAudit = JSON.parse(raw);
    } catch {
      return reAuditReply({ error: 'not_found' }, 404);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        return reAuditReply({ error: 'cannot_determine_business_name' }, 400);
      }

      const candidates = await searchPlacesByName({ name: businessName, phone });
      if (!candidates || candidates.length === 0) {
        return reAuditReply({ error: 'place_not_found' }, 404);
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
      return reAuditReply({ error: 'places_not_configured' }, 503);
    }

    const driftReport = calculateAuditDrift(baselineAudit, currentAudit);
    saveDriftReport(auditId, driftReport);

    return reAuditReply({
      success: true,
      driftReport,
    });
  } catch (error) {
    console.error('re-audit error:', error);
    return reAuditReply({ error: 'server_error' }, 500);
  }
}
