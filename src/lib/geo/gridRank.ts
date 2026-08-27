import { normalizePhone } from '../places/client';
import { levenshtein } from '../gbp/editDistance';

export interface GridCoordinate {
  row: number;
  col: number;
  lat: number;
  lng: number;
  distanceKm: number;
  bearingDeg: number;
}

export interface GridPointResult {
  row: number;
  col: number;
  lat: number;
  lng: number;
  distanceKm: number;
  bearingDeg?: number;
  rank: number | null; // 1-based rank in local results (null if not in top 20)
  isTop3: boolean; // rank !== null && rank <= 3
  top3Places: Array<{
    placeId: string;
    name: string;
    rating?: number;
    userRatingCount?: number;
  }>;
}

export interface GridRankSummary {
  top3Percentage: number; // 0-100%
  top3Count: number; // number of nodes in top 3
  totalNodes: number; // 9 or 25
  averageRank: number | null;
  marketLeader: {
    name: string;
    top3Percentage: number;
  } | null;
}

export interface GridRankReport {
  scannedAt: string; // ISO 8601
  keyword: string;
  businessName: string;
  center: { lat: number; lng: number };
  radiusKm: number;
  gridSize: 3 | 5;
  summary: GridRankSummary;
  nodes: GridPointResult[];
}

export interface TargetBusiness {
  name: string;
  placeId?: string;
  phone?: string;
}

export interface ScanGridPointOptions {
  apiKey?: string;
  fetchFn?: typeof fetch;
}

export interface GridScanParams {
  businessName: string;
  keyword: string;
  center: { lat: number; lng: number };
  radiusKm?: number;
  gridSize?: 3 | 5;
  placeId?: string;
  phone?: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
  concurrency?: number;
}

const SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.userRatingCount';
const EARTH_RADIUS_KM = 6371;

/**
 * Standard Haversine distance formula between two geographic coordinates in kilometers.
 */
export function haversineDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return EARTH_RADIUS_KM * c;
}

/**
 * Initial compass bearing (0-360 degrees) from point p1 to point p2.
 */
export function calculateBearing(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Generates an equidistant coordinate grid matrix (3x3 or 5x5) centered on the given coordinates.
 */
export function generateGridCoordinates(
  center: { lat: number; lng: number },
  options: { gridSize: 3 | 5; radiusKm: number }
): GridCoordinate[] {
  const gridSize = options.gridSize;
  const radiusKm = options.radiusKm;
  const centerIndex = (gridSize - 1) / 2;
  const stepKm = (radiusKm * 2) / (gridSize - 1);

  const coords: GridCoordinate[] = [];

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (r === centerIndex && c === centerIndex) {
        coords.push({
          row: r,
          col: c,
          lat: Number(center.lat.toFixed(6)),
          lng: Number(center.lng.toFixed(6)),
          distanceKm: 0,
          bearingDeg: 0,
        });
        continue;
      }

      // dy > 0 is North (towards row 0), dy < 0 is South
      const dy = (centerIndex - r) * stepKm;
      // dx > 0 is East (towards col gridSize-1), dx < 0 is West
      const dx = (c - centerIndex) * stepKm;

      const dLat = (dy / EARTH_RADIUS_KM) * (180 / Math.PI);
      const lat = center.lat + dLat;

      const latRad = (center.lat * Math.PI) / 180;
      const dLng = (dx / (EARTH_RADIUS_KM * Math.cos(latRad))) * (180 / Math.PI);
      const lng = center.lng + dLng;

      const pt = { lat, lng };
      const distanceKm = Number(haversineDistance(center, pt).toFixed(2));
      const bearingDeg = Number(calculateBearing(center, pt).toFixed(1));

      coords.push({
        row: r,
        col: c,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        distanceKm,
        bearingDeg,
      });
    }
  }

  return coords;
}

/**
 * Checks whether a candidate place from Google Places API matches the target business
 * by Place ID, normalized phone, or fuzzy name similarity.
 */
export function isTargetMatch(
  place: {
    id?: string;
    displayName?: { text?: string } | string;
    name?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
  },
  target: TargetBusiness
): boolean {
  // 1. Exact Place ID match
  if (target.placeId && place.id && target.placeId === place.id) {
    return true;
  }

  // 2. Normalized Phone match
  if (target.phone) {
    const targetNormPhone = normalizePhone(target.phone);
    if (targetNormPhone.length >= 7) {
      if (
        place.nationalPhoneNumber &&
        normalizePhone(place.nationalPhoneNumber) === targetNormPhone
      ) {
        return true;
      }
      if (
        place.internationalPhoneNumber &&
        normalizePhone(place.internationalPhoneNumber) === targetNormPhone
      ) {
        return true;
      }
    }
  }

  // 3. Name similarity match
  const rawPlaceName =
    typeof place.displayName === 'object' && place.displayName !== null
      ? place.displayName.text ?? ''
      : typeof place.displayName === 'string'
      ? place.displayName
      : place.name ?? '';

  if (!rawPlaceName || !target.name) return false;

  const normTarget = target.name.trim().toLowerCase().replace(/\s+/g, ' ');
  const normPlace = rawPlaceName.trim().toLowerCase().replace(/\s+/g, ' ');

  if (normTarget === normPlace) return true;

  if (normTarget.length >= 3 && normPlace.length >= 3) {
    if (normPlace.includes(normTarget) || normTarget.includes(normPlace)) {
      return true;
    }
  }

  const dist = levenshtein(normTarget, normPlace);
  const targetLen = Array.from(normTarget).length;
  const placeLen = Array.from(normPlace).length;
  const minLen = Math.min(targetLen, placeLen);
  const maxLen = Math.max(targetLen, placeLen);

  if (minLen >= 6 && dist <= Math.max(2, Math.floor(maxLen * 0.2))) {
    return true;
  }
  if (minLen >= 4 && dist <= 1) {
    return true;
  }

  return false;
}

/**
 * Scans a single grid coordinate point via Google Places API (New) places:searchText.
 */
export async function scanGridPoint(
  point: { row?: number; col?: number; lat: number; lng: number; distanceKm?: number },
  keyword: string,
  target: TargetBusiness,
  options?: ScanGridPointOptions
): Promise<GridPointResult> {
  const fetcher = options?.fetchFn ?? fetch;
  const apiKey = options?.apiKey ?? process.env.PLACES_API_KEY;

  if (!apiKey && !options?.fetchFn) {
    throw new Error('Places API key not configured (PLACES_API_KEY)');
  }

  const res = await fetcher(SEARCH_TEXT_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-Goog-Api-Key': apiKey } : {}),
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: keyword,
      languageCode: 'he',
      regionCode: 'IL',
      pageSize: 20,
      locationBias: {
        circle: {
          center: {
            latitude: point.lat,
            longitude: point.lng,
          },
          radius: 1000,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Places searchText failed: ${res.status} ${await res.text()}`);
  }

  interface RawPlaceItem {
    id?: string;
    displayName?: { text?: string } | string;
    name?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    rating?: number;
    userRatingCount?: number;
  }

  const json: { places?: RawPlaceItem[] } = await res.json();
  const places: RawPlaceItem[] = Array.isArray(json?.places) ? json.places : [];

  let rank: number | null = null;
  for (let i = 0; i < places.length; i++) {
    if (isTargetMatch(places[i], target)) {
      rank = i + 1;
      break;
    }
  }

  const isTop3 = rank !== null && rank <= 3;

  const top3Places = places.slice(0, 3).map((p) => ({
    placeId: p.id ?? '',
    name:
      typeof p.displayName === 'object' && p.displayName !== null
        ? p.displayName.text ?? ''
        : typeof p.displayName === 'string'
        ? p.displayName
        : p.name ?? '',
    rating: typeof p.rating === 'number' ? p.rating : undefined,
    userRatingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : undefined,
  }));

  return {
    row: point.row ?? 0,
    col: point.col ?? 0,
    lat: point.lat,
    lng: point.lng,
    distanceKm: point.distanceKm ?? 0,
    bearingDeg: 'bearingDeg' in point && typeof point.bearingDeg === 'number' ? point.bearingDeg : 0,
    rank,
    isTop3,
    top3Places,
  };
}

/**
 * Computes grid rank summary: top3 percentage, average rank, and market leader competitor.
 */
export function computeGridRankSummary(
  nodes: GridPointResult[],
  target: TargetBusiness
): GridRankSummary {
  const totalNodes = nodes.length;
  const top3Nodes = nodes.filter((n) => n.isTop3);
  const top3Count = top3Nodes.length;
  const top3Percentage = totalNodes > 0 ? Math.round((top3Count / totalNodes) * 100) : 0;

  const rankedNodes = nodes.filter(
    (n): n is GridPointResult & { rank: number } => typeof n.rank === 'number' && n.rank !== null
  );
  const averageRank =
    rankedNodes.length > 0
      ? Number((rankedNodes.reduce((sum, n) => sum + n.rank, 0) / rankedNodes.length).toFixed(1))
      : null;

  // Market leader competitor calculation
  const competitorTop3Counts = new Map<string, { name: string; count: number }>();

  for (const node of nodes) {
    const seenInNode = new Set<string>();
    for (const place of node.top3Places) {
      if (isTargetMatch({ id: place.placeId, name: place.name }, target)) {
        continue;
      }
      const key = place.placeId || place.name.trim().toLowerCase();
      if (!key || seenInNode.has(key)) continue;
      seenInNode.add(key);

      const existing = competitorTop3Counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        competitorTop3Counts.set(key, { name: place.name, count: 1 });
      }
    }
  }

  let marketLeader: { name: string; top3Percentage: number } | null = null;
  let maxCount = 0;
  for (const entry of competitorTop3Counts.values()) {
    if (entry.count > maxCount) {
      maxCount = entry.count;
      marketLeader = {
        name: entry.name,
        top3Percentage: totalNodes > 0 ? Math.round((entry.count / totalNodes) * 100) : 0,
      };
    }
  }

  return {
    top3Percentage,
    top3Count,
    totalNodes,
    averageRank,
    marketLeader,
  };
}

/**
 * Concurrency worker helper.
 */
async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Executes a full geo-grid visibility scan across an equidistant coordinate matrix.
 */
export async function executeGridScan(params: GridScanParams): Promise<GridRankReport> {
  const radiusKm = params.radiusKm ?? 5;
  const gridSize = params.gridSize ?? 3;
  const coords = generateGridCoordinates(params.center, { gridSize, radiusKm });

  const target: TargetBusiness = {
    name: params.businessName,
    placeId: params.placeId,
    phone: params.phone,
  };

  const concurrency = params.concurrency ?? 3;

  const nodes = await mapConcurrent(coords, concurrency, async (coord) => {
    return scanGridPoint(coord, params.keyword, target, {
      apiKey: params.apiKey,
      fetchFn: params.fetchFn,
    });
  });

  const summary = computeGridRankSummary(nodes, target);

  return {
    scannedAt: new Date().toISOString(),
    keyword: params.keyword,
    businessName: params.businessName,
    center: params.center,
    radiusKm,
    gridSize,
    summary,
    nodes,
  };
}
