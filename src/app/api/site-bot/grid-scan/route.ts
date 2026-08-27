import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/payments/rate-limit';
import { hasPlacesKey, normalizePhone } from '@/lib/places/client';
import { executeGridScan } from '@/lib/geo/gridRank';

/**
 * POST /api/site-bot/grid-scan — Geo-grid visibility scanner (spec 2026-08-26_002)
 *
 * Scans local 3-pack rankings across an equidistant coordinate matrix centered on the
 * business location, computes the top-3 visibility percentage, and benchmarks against
 * the local market leader.
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(`grid-scan:${ip}`, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : '';
    const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';

    if (businessName.length < 2 || businessName.length > 80 || keyword.length < 2 || keyword.length > 80) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const lat = typeof body.lat === 'number' ? body.lat : parseFloat(body.lat);
    const lng = typeof body.lng === 'number' ? body.lng : parseFloat(body.lng);

    if (isNaN(lat) || isNaN(lng) || lat < 29.0 || lat > 34.0 || lng < 34.0 || lng > 36.0) {
      return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 });
    }

    let radiusKm = 5;
    if (body.radiusKm !== undefined && body.radiusKm !== null) {
      const r = typeof body.radiusKm === 'number' ? body.radiusKm : parseFloat(body.radiusKm);
      if (isNaN(r) || r < 1 || r > 20) {
        return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
      }
      radiusKm = r;
    }

    let gridSize: 3 | 5 = 3;
    if (body.gridSize !== undefined && body.gridSize !== null) {
      if (body.gridSize !== 3 && body.gridSize !== 5) {
        return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
      }
      gridSize = body.gridSize;
    }

    let phone: string | undefined;
    if (body.phone !== undefined && body.phone !== null) {
      if (typeof body.phone !== 'string') {
        return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
      }
      const digits = normalizePhone(body.phone);
      if (digits.length > 0 && (digits.length < 7 || digits.length > 15)) {
        return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
      }
      if (digits.length > 0) {
        phone = body.phone;
      }
    }

    const placeId =
      typeof body.placeId === 'string' && body.placeId.trim() ? body.placeId.trim() : undefined;

    if (!hasPlacesKey()) {
      return NextResponse.json({ error: 'places_not_configured' }, { status: 503 });
    }

    const report = await executeGridScan({
      businessName,
      keyword,
      center: { lat, lng },
      radiusKm,
      gridSize,
      placeId,
      phone,
    });

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error('grid-scan error:', error);
    return NextResponse.json({ error: 'scan_failed' }, { status: 500 });
  }
}
