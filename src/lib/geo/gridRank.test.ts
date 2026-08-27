import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistance,
  calculateBearing,
  generateGridCoordinates,
  isTargetMatch,
  scanGridPoint,
  computeGridRankSummary,
  executeGridScan,
  type GridPointResult,
} from './gridRank';

// ── 1. Geodesic distance & bearing math ──────────────────────────────────────

test('haversineDistance: identical points return 0', () => {
  const p = { lat: 32.0853, lng: 34.7818 };
  assert.equal(haversineDistance(p, p), 0);
});

test('haversineDistance: known distance between Tel Aviv and Jerusalem (~54 km)', () => {
  const telAviv = { lat: 32.0853, lng: 34.7818 };
  const jerusalem = { lat: 31.7683, lng: 35.2137 };
  const dist = haversineDistance(telAviv, jerusalem);
  assert.ok(dist >= 50 && dist <= 60, `Expected ~54 km, got ${dist}`);
});

test('calculateBearing: cardinal directions from center', () => {
  const center = { lat: 32.0, lng: 34.0 };
  const north = { lat: 32.1, lng: 34.0 };
  const south = { lat: 31.9, lng: 34.0 };
  const east = { lat: 32.0, lng: 34.1 };
  const west = { lat: 32.0, lng: 33.9 };

  assert.equal(Math.round(calculateBearing(center, north)), 0);
  assert.equal(Math.round(calculateBearing(center, east)), 90);
  assert.equal(Math.round(calculateBearing(center, south)), 180);
  assert.equal(Math.round(calculateBearing(center, west)), 270);
  assert.equal(calculateBearing(center, center), 0);
});

// ── 2. Grid matrix generation ────────────────────────────────────────────────

test('generateGridCoordinates: 3x3 generates 9 points with center at (1,1)', () => {
  const center = { lat: 32.0853, lng: 34.7818 };
  const coords = generateGridCoordinates(center, { gridSize: 3, radiusKm: 5 });

  assert.equal(coords.length, 9);

  // Center node check
  const centerNode = coords.find((c) => c.row === 1 && c.col === 1);
  assert.ok(centerNode);
  assert.equal(centerNode!.lat, center.lat);
  assert.equal(centerNode!.lng, center.lng);
  assert.equal(centerNode!.distanceKm, 0);
  assert.equal(centerNode!.bearingDeg, 0);

  // Check rows and cols range 0..2
  for (const c of coords) {
    assert.ok(c.row >= 0 && c.row <= 2);
    assert.ok(c.col >= 0 && c.col <= 2);
    // Max distance on a 5km radius 3x3 square grid is the diagonal: ~sqrt(5^2 + 5^2) = 7.07km
    assert.ok(c.distanceKm <= 7.2, `Distance ${c.distanceKm} exceeded bounds`);
  }

  // Cardinal node distances should be ~5 km
  const northNode = coords.find((c) => c.row === 0 && c.col === 1);
  const southNode = coords.find((c) => c.row === 2 && c.col === 1);
  const eastNode = coords.find((c) => c.row === 1 && c.col === 2);
  const westNode = coords.find((c) => c.row === 1 && c.col === 0);

  assert.ok(Math.abs(northNode!.distanceKm - 5.0) < 0.1);
  assert.ok(Math.abs(southNode!.distanceKm - 5.0) < 0.1);
  assert.ok(Math.abs(eastNode!.distanceKm - 5.0) < 0.1);
  assert.ok(Math.abs(westNode!.distanceKm - 5.0) < 0.1);
});

test('generateGridCoordinates: 5x5 generates 25 points with center at (2,2)', () => {
  const center = { lat: 32.0853, lng: 34.7818 };
  const coords = generateGridCoordinates(center, { gridSize: 5, radiusKm: 10 });

  assert.equal(coords.length, 25);

  const centerNode = coords.find((c) => c.row === 2 && c.col === 2);
  assert.ok(centerNode);
  assert.equal(centerNode!.distanceKm, 0);

  // Outer corner node (row 0, col 0)
  const nwNode = coords.find((c) => c.row === 0 && c.col === 0);
  assert.ok(nwNode);
  // Diagonal distance for 10km radius: ~sqrt(10^2 + 10^2) = 14.14 km
  assert.ok(Math.abs(nwNode!.distanceKm - 14.14) < 0.3);
});

// ── 3. Target business matching ──────────────────────────────────────────────

test('isTargetMatch: matches by placeId', () => {
  const place = { id: 'ChIJ_12345', displayName: { text: 'Other Name' } };
  assert.equal(isTargetMatch(place, { name: 'Target Business', placeId: 'ChIJ_12345' }), true);
  assert.equal(isTargetMatch(place, { name: 'Target Business', placeId: 'ChIJ_99999' }), false);
});

test('isTargetMatch: matches by normalized phone', () => {
  const place = {
    displayName: { text: 'Other Name' },
    nationalPhoneNumber: '052-123-4567',
    internationalPhoneNumber: '+972 52-123-4567',
  };
  assert.equal(isTargetMatch(place, { name: 'Target Business', phone: '0521234567' }), true);
  assert.equal(isTargetMatch(place, { name: 'Target Business', phone: '+972-52-123-4567' }), true);
  assert.equal(isTargetMatch(place, { name: 'Target Business', phone: '0540000000' }), false);
});

test('isTargetMatch: matches by exact and substring name', () => {
  const place = { displayName: { text: 'Alpha Plumbing Services' } };
  assert.equal(isTargetMatch(place, { name: 'alpha plumbing services' }), true);
  assert.equal(isTargetMatch(place, { name: 'Alpha Plumbing' }), true);
});

test('isTargetMatch: matches fuzzy typo with Levenshtein', () => {
  const place = { displayName: { text: 'Plumbing Experts TLV' } };
  assert.equal(isTargetMatch(place, { name: 'Plumbng Experts TLV' }), true);
});

test('isTargetMatch: rejects completely different business', () => {
  const place = { displayName: { text: 'Beta Electrician Center' } };
  assert.equal(isTargetMatch(place, { name: 'Alpha Plumbing Services' }), false);
});

// ── 4. Grid point scan & mock fetch ─────────────────────────────────────────

test('scanGridPoint: throws without API key or fetch override', async () => {
  const saved = process.env.PLACES_API_KEY;
  delete process.env.PLACES_API_KEY;
  try {
    await assert.rejects(
      () =>
        scanGridPoint(
          { lat: 32.0853, lng: 34.7818 },
          'plumber',
          { name: 'Target Business' }
        ),
      /Places API key not configured/
    );
  } finally {
    if (saved !== undefined) process.env.PLACES_API_KEY = saved;
  }
});

test('scanGridPoint: finds target rank and extracts top3', async () => {
  const mockPlaces = [
    { id: 'p1', displayName: { text: 'Leader Plumbing' }, rating: 4.8, userRatingCount: 120 },
    { id: 'p2', displayName: { text: 'Target Business' }, rating: 4.5, userRatingCount: 50 },
    { id: 'p3', displayName: { text: 'Gamma Plumbing' }, rating: 4.2, userRatingCount: 30 },
    { id: 'p4', displayName: { text: 'Delta Services' }, rating: 4.0, userRatingCount: 15 },
  ];

  const mockFetch: typeof fetch = async () =>
    ({
      ok: true,
      json: async () => ({ places: mockPlaces }),
    } as any);

  const result = await scanGridPoint(
    { row: 1, col: 1, lat: 32.0853, lng: 34.7818, distanceKm: 0 },
    'plumber',
    { name: 'Target Business', placeId: 'p2' },
    { fetchFn: mockFetch }
  );

  assert.equal(result.rank, 2);
  assert.equal(result.isTop3, true);
  assert.equal(result.top3Places.length, 3);
  assert.equal(result.top3Places[0].name, 'Leader Plumbing');
  assert.equal(result.top3Places[1].name, 'Target Business');
  assert.equal(result.top3Places[2].name, 'Gamma Plumbing');
});

test('scanGridPoint: target outside top 3 and top 20 handling', async () => {
  const mockPlacesRank5 = [
    { id: 'p1', displayName: { text: 'Comp 1' } },
    { id: 'p2', displayName: { text: 'Comp 2' } },
    { id: 'p3', displayName: { text: 'Comp 3' } },
    { id: 'p4', displayName: { text: 'Comp 4' } },
    { id: 'p5', displayName: { text: 'Target Business' } },
  ];

  const mockFetch5: typeof fetch = async () =>
    ({
      ok: true,
      json: async () => ({ places: mockPlacesRank5 }),
    } as any);

  const res5 = await scanGridPoint(
    { lat: 32.0853, lng: 34.7818 },
    'plumber',
    { name: 'Target Business' },
    { fetchFn: mockFetch5 }
  );

  assert.equal(res5.rank, 5);
  assert.equal(res5.isTop3, false);

  // Outside top 20
  const mockFetchNone: typeof fetch = async () =>
    ({
      ok: true,
      json: async () => ({ places: [{ id: 'p1', displayName: { text: 'Other' } }] }),
    } as any);

  const resNone = await scanGridPoint(
    { lat: 32.0853, lng: 34.7818 },
    'plumber',
    { name: 'Target Business' },
    { fetchFn: mockFetchNone }
  );

  assert.equal(resNone.rank, null);
  assert.equal(resNone.isTop3, false);
});

// ── 5. Summary & market leader computation ──────────────────────────────────

test('computeGridRankSummary: calculates top3Percentage, averageRank, and marketLeader', () => {
  const target = { name: 'Target Business', placeId: 'target_1' };

  const nodes: GridPointResult[] = [
    {
      row: 0,
      col: 0,
      lat: 32.1,
      lng: 34.7,
      distanceKm: 5,
      rank: 1,
      isTop3: true,
      top3Places: [
        { placeId: 'target_1', name: 'Target Business' },
        { placeId: 'comp_a', name: 'Competitor Alpha' },
        { placeId: 'comp_b', name: 'Competitor Beta' },
      ],
    },
    {
      row: 0,
      col: 1,
      lat: 32.1,
      lng: 34.8,
      distanceKm: 5,
      rank: 2,
      isTop3: true,
      top3Places: [
        { placeId: 'comp_a', name: 'Competitor Alpha' },
        { placeId: 'target_1', name: 'Target Business' },
        { placeId: 'comp_c', name: 'Competitor Gamma' },
      ],
    },
    {
      row: 0,
      col: 2,
      lat: 32.1,
      lng: 34.9,
      distanceKm: 7,
      rank: 5,
      isTop3: false,
      top3Places: [
        { placeId: 'comp_a', name: 'Competitor Alpha' },
        { placeId: 'comp_b', name: 'Competitor Beta' },
        { placeId: 'comp_c', name: 'Competitor Gamma' },
      ],
    },
    {
      row: 1,
      col: 0,
      lat: 32.0,
      lng: 34.7,
      distanceKm: 5,
      rank: null,
      isTop3: false,
      top3Places: [
        { placeId: 'comp_b', name: 'Competitor Beta' },
        { placeId: 'comp_a', name: 'Competitor Alpha' },
      ],
    },
  ];

  const summary = computeGridRankSummary(nodes, target);

  // 2 out of 4 nodes are in top 3 = 50%
  assert.equal(summary.totalNodes, 4);
  assert.equal(summary.top3Count, 2);
  assert.equal(summary.top3Percentage, 50);

  // Non-null ranks: 1, 2, 5 -> avg = (1+2+5)/3 = 2.67 -> 2.7
  assert.equal(summary.averageRank, 2.7);

  // Competitor Alpha appears in top 3 in all 4 nodes (4/4 = 100%)
  assert.ok(summary.marketLeader);
  assert.equal(summary.marketLeader!.name, 'Competitor Alpha');
  assert.equal(summary.marketLeader!.top3Percentage, 100);
});

// ── 6. Full executeGridScan integration ─────────────────────────────────────

test('executeGridScan: runs full 3x3 grid with mock fetch and returns report', async () => {
  const mockFetch: typeof fetch = async (url, init) => {
    const body = JSON.parse(init?.body as string);
    const pointLat = body.locationBias?.circle?.center?.latitude;
    const pointLng = body.locationBias?.circle?.center?.longitude;

    // Simulate center point having target at rank 1, outer points at rank 4
    const isCenter =
      Math.abs(pointLat - 32.0853) < 0.001 && Math.abs(pointLng - 34.7818) < 0.001;
    const places = isCenter
      ? [
          { id: 'target_id', displayName: { text: 'My Plumber Co' }, rating: 5.0 },
          { id: 'comp_1', displayName: { text: 'Top Leader' }, rating: 4.8 },
          { id: 'comp_2', displayName: { text: 'Second Competitor' }, rating: 4.5 },
        ]
      : [
          { id: 'comp_1', displayName: { text: 'Top Leader' }, rating: 4.8 },
          { id: 'comp_2', displayName: { text: 'Second Competitor' }, rating: 4.5 },
          { id: 'comp_3', displayName: { text: 'Third Competitor' }, rating: 4.2 },
          { id: 'target_id', displayName: { text: 'My Plumber Co' }, rating: 5.0 },
        ];

    return {
      ok: true,
      json: async () => ({ places }),
    } as any;
  };

  const report = await executeGridScan({
    businessName: 'My Plumber Co',
    placeId: 'target_id',
    keyword: 'plumbing services',
    center: { lat: 32.0853, lng: 34.7818 },
    radiusKm: 5,
    gridSize: 3,
    fetchFn: mockFetch,
    concurrency: 3,
  });

  assert.equal(report.businessName, 'My Plumber Co');
  assert.equal(report.keyword, 'plumbing services');
  assert.equal(report.gridSize, 3);
  assert.equal(report.radiusKm, 5);
  assert.equal(report.nodes.length, 9);

  // 1 center node is top3, 8 outer nodes are rank 4 (not top 3) -> 1/9 = 11%
  assert.equal(report.summary.top3Count, 1);
  assert.equal(report.summary.top3Percentage, 11);
  assert.ok(report.summary.marketLeader);
  assert.equal(report.summary.marketLeader!.name, 'Top Leader');
  assert.equal(report.summary.marketLeader!.top3Percentage, 100);
});
