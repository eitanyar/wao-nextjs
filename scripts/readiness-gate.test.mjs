import assert from 'node:assert/strict';
import test   from 'node:test';
import { crawlSite } from './lib/site-crawl.mjs';
import {
  routeDecision,
  GEO_DIRECT_ROUTE_MIN_PAGES,
  GEO_UPSELL_UNLOCK_MIN_PAGES,
} from './lib/routing-tree.mjs';
import { classifyVertical } from './lib/vertical-classifier.mjs';
import { scoreAdsFit, ADMISSION_PILOT_MIN_SCORE, ADMISSION_CONDITIONAL_MIN_SCORE } from './lib/ads-fit-scorecard.mjs';
import { prospectSlug, selectRoutingLineMarker, buildPresentableReportText } from './readiness-gate.mjs';

// ── helpers ──────────────────────────────────────────────────────────────
function xmlResponse(body) {
  return { ok: true, text: async () => body };
}
function notFound() {
  return { ok: false, status: 404, text: async () => 'not found' };
}
function htmlResponse(body) {
  return { ok: true, text: async () => body };
}

function sitemapXml(count) {
  const urls = Array.from({ length: count }, (_, i) => `<url><loc>https://example.co.il/page-${i}</loc></url>`).join('');
  return `<?xml version="1.0"?><urlset>${urls}</urlset>`;
}

// ── Test #2 — sitemap with 8 <url> entries ──────────────────────────────
test('site crawl: sitemap with 8 <url> entries -> pageCount 8, method sitemap', async () => {
  const fetchImpl = async (url) => {
    if (url === 'https://example.co.il/sitemap.xml') return xmlResponse(sitemapXml(8));
    return notFound();
  };
  const result = await crawlSite('https://example.co.il', { fetchImpl });
  assert.equal(result.siteFound, true);
  assert.equal(result.pageCount, 8);
  assert.equal(result.method, 'sitemap');
  assert.equal(result.sitemapUrl, 'https://example.co.il/sitemap.xml');
});

test('site crawl: sitemap index resolves one level of child sitemaps', async () => {
  const indexXml = `<?xml version="1.0"?><sitemapindex>
    <sitemap><loc>https://example.co.il/sitemap-a.xml</loc></sitemap>
    <sitemap><loc>https://example.co.il/sitemap-b.xml</loc></sitemap>
  </sitemapindex>`;
  const fetchImpl = async (url) => {
    if (url === 'https://example.co.il/sitemap.xml') return xmlResponse(indexXml);
    if (url === 'https://example.co.il/sitemap-a.xml') return xmlResponse(sitemapXml(5));
    if (url === 'https://example.co.il/sitemap-b.xml') return xmlResponse(sitemapXml(3));
    return notFound();
  };
  const result = await crawlSite('https://example.co.il', { fetchImpl });
  assert.equal(result.method, 'sitemap');
  assert.equal(result.pageCount, 8);
});

// ── Test #3 — no sitemap, shallow crawl finds 22 links within depth 2 ───
test('site crawl: no sitemap, shallow crawl finds 22 same-domain links -> pageCount 22, method shallow-crawl', async () => {
  const homepageLinks = Array.from({ length: 22 }, (_, i) => `<a href="/page-${i}">p${i}</a>`).join('');
  const fetchImpl = async (url) => {
    if (url === 'https://example.co.il/sitemap.xml') return notFound();
    if (url === 'https://example.co.il/robots.txt') return notFound();
    if (url === 'https://example.co.il') return htmlResponse(`<html><body>${homepageLinks}</body></html>`);
    return notFound(); // any child page fetch fails harmlessly (depth cap already covers this)
  };
  const result = await crawlSite('https://example.co.il', { fetchImpl });
  assert.equal(result.siteFound, true);
  assert.equal(result.pageCount, 22);
  assert.equal(result.method, 'shallow-crawl');
});

test('site crawl: shallow crawl respects robots.txt Disallow rules', async () => {
  const homepageLinks = '<a href="/allowed">a</a><a href="/private/secret">b</a>';
  const robots = 'User-agent: *\nDisallow: /private/\n';
  const fetchImpl = async (url) => {
    if (url === 'https://example.co.il/sitemap.xml') return notFound();
    if (url === 'https://example.co.il/robots.txt') return htmlResponse(robots);
    if (url === 'https://example.co.il') return htmlResponse(`<html><body>${homepageLinks}</body></html>`);
    return notFound();
  };
  const result = await crawlSite('https://example.co.il', { fetchImpl });
  assert.equal(result.pageCount, 1); // only /allowed, /private/secret excluded
});

test('site crawl: shallow crawl caps at maxPages', async () => {
  const homepageLinks = Array.from({ length: 80 }, (_, i) => `<a href="/page-${i}">p${i}</a>`).join('');
  const fetchImpl = async (url) => {
    if (url === 'https://example.co.il/sitemap.xml') return notFound();
    if (url === 'https://example.co.il/robots.txt') return notFound();
    if (url === 'https://example.co.il') return htmlResponse(`<html><body>${homepageLinks}</body></html>`);
    return notFound();
  };
  const result = await crawlSite('https://example.co.il', { fetchImpl, maxPages: 50 });
  assert.ok(result.pageCount <= 50);
});

// ── Test #4 — fetch fails entirely ──────────────────────────────────────
test('site crawl: fetch fails entirely -> siteFound false, pageCount null, method none', async () => {
  const fetchImpl = async () => { throw new Error('network unreachable'); };
  const result = await crawlSite('https://example.co.il', { fetchImpl });
  assert.deepEqual(result, { siteFound: false, pageCount: null, method: 'none' });
});

test('site crawl: no siteUrl supplied -> siteFound false, pageCount null, method none', async () => {
  const result = await crawlSite(undefined);
  assert.deepEqual(result, { siteFound: false, pageCount: null, method: 'none' });
});

// ── Test #5 — routing rule 1 ─────────────────────────────────────────────
test('routing rule 1: siteFound false -> primaryBotRoute site-bot', () => {
  const routing = routeDecision({
    siteCrawl: { siteFound: false, pageCount: null },
    vertical: { archetype: 'micro-smb' },
  });
  assert.equal(routing.primaryBotRoute, 'site-bot');
  assert.equal(routing.ruleFired, 'rule-1-no-site');
});

// ── Test #6 — routing rule 2 ─────────────────────────────────────────────
test('routing rule 2: pageCount 5 -> primaryBotRoute site-bot, no secondaryUpsell', () => {
  const routing = routeDecision({
    siteCrawl: { siteFound: true, pageCount: 5 },
    vertical: { archetype: 'micro-smb' },
  });
  assert.equal(routing.primaryBotRoute, 'site-bot');
  assert.equal(routing.secondaryUpsell, undefined);
  assert.equal(routing.ruleFired, 'rule-2-thin-site');
});

// ── Test #7 — routing rule 3 ─────────────────────────────────────────────
test('routing rule 3: pageCount 18, micro-SMB -> site-bot + gmb-bot upsell + nearGeoThreshold', () => {
  const routing = routeDecision({
    siteCrawl: { siteFound: true, pageCount: 18 },
    vertical: { archetype: 'micro-smb' },
  });
  assert.equal(routing.primaryBotRoute, 'site-bot');
  assert.equal(routing.secondaryUpsell, 'gmb-bot');
  assert.equal(routing.nearGeoThreshold, true);
  assert.equal(routing.ruleFired, 'rule-3-micro-smb-near-geo-threshold');
});

// ── Test #8 — routing rule 4 ─────────────────────────────────────────────
test('routing rule 4: pageCount 12, content-ready-SMB -> geo-bot + thinContentWarning', () => {
  const routing = routeDecision({
    siteCrawl: { siteFound: true, pageCount: 12 },
    vertical: { archetype: 'content-ready-smb' },
  });
  assert.equal(routing.primaryBotRoute, 'geo-bot');
  assert.equal(routing.thinContentWarning, true);
  assert.equal(routing.ruleFired, 'rule-4-thin-content-ready-smb');
});

// ── Test #9 — routing rule 5 ─────────────────────────────────────────────
test('routing rule 5: pageCount 40, content-ready-SMB -> geo-bot, unknown-pre-onboarding, no warnings', () => {
  const routing = routeDecision({
    siteCrawl: { siteFound: true, pageCount: 40 },
    vertical: { archetype: 'content-ready-smb' },
  });
  assert.equal(routing.primaryBotRoute, 'geo-bot');
  assert.equal(routing.gscDataStatus, 'unknown-pre-onboarding');
  assert.equal(routing.thinContentWarning, undefined);
  assert.equal(routing.nearGeoThreshold, undefined);
  assert.equal(routing.flagForHumanReview, undefined);
  assert.equal(routing.ruleFired, 'rule-5-geo-direct');
});

// ── Test #10 — routing rule 6 ────────────────────────────────────────────
test('micro-SMB with 35 pages defers to human review, does not silently reroute to GEO', () => {
  const routing = routeDecision({
    siteCrawl: { siteFound: true, pageCount: 35 },
    vertical: { archetype: 'micro-smb' },
  });
  assert.equal(routing.primaryBotRoute, 'site-bot');
  assert.equal(routing.flagForHumanReview, true);
  assert.equal(routing.ruleFired, 'rule-6-micro-smb-unusually-content-heavy-defer-to-human');
});

// ── Test #11 — two distinct threshold constants ─────────────────────────
test('GEO_DIRECT_ROUTE_MIN_PAGES (30) and GEO_UPSELL_UNLOCK_MIN_PAGES (15) are two distinct exported constants', () => {
  assert.equal(GEO_DIRECT_ROUTE_MIN_PAGES, 30);
  assert.equal(GEO_UPSELL_UNLOCK_MIN_PAGES, 15);
  assert.notEqual(GEO_DIRECT_ROUTE_MIN_PAGES, GEO_UPSELL_UNLOCK_MIN_PAGES);

  // Regression guard: rule 3 (upsell) fires strictly off the 15-page constant,
  // rule 5 (direct-route) strictly off the 30-page constant — collapsing them
  // would break one of these two assertions.
  const rule3 = routeDecision({ siteCrawl: { siteFound: true, pageCount: GEO_UPSELL_UNLOCK_MIN_PAGES }, vertical: { archetype: 'micro-smb' } });
  assert.equal(rule3.ruleFired, 'rule-3-micro-smb-near-geo-threshold');

  const rule5 = routeDecision({ siteCrawl: { siteFound: true, pageCount: GEO_DIRECT_ROUTE_MIN_PAGES }, vertical: { archetype: 'content-ready-smb' } });
  assert.equal(rule5.ruleFired, 'rule-5-geo-direct');
});

// ── Vertical classification (§2.4) ──────────────────────────────────────
test('classifyVertical: plumber (אינסטלטור) -> micro-smb', () => {
  assert.equal(classifyVertical('אינסטלטור').archetype, 'micro-smb');
});
test('classifyVertical: accountant (רואה חשבון) -> content-ready-smb', () => {
  assert.equal(classifyVertical('רואה חשבון').archetype, 'content-ready-smb');
});
test('classifyVertical: unrecognized category -> unclassified', () => {
  assert.equal(classifyVertical('משהו שלא קיים').archetype, 'unclassified');
});

// ── Ads-fit scorecard (§3.4) ─────────────────────────────────────────────
test('scoreAdsFit: automated-only signals (no manual input) never present as a real admission verdict', () => {
  const result = scoreAdsFit({ gbp: { rating: 4.8, reviewCount: 40 }, category: 'אינסטלטור' });
  assert.equal(result.signalsSource, 'not-yet-scored');
  assert.equal(result.admission, 'decline-or-site-only');
});
test('scoreAdsFit: capacityOk=false is a hard fail regardless of totalScore', () => {
  const result = scoreAdsFit({
    gbp: { rating: 4.8, reviewCount: 40 },
    category: 'אינסטלטור',
    manual: { demandScore: 2, unitEconomicsScore: 2, budgetFloorScore: 2, auctionSanityScore: 2, serviceRadiusScore: 2, capacityOk: false },
  });
  assert.equal(result.hardFail, true);
  assert.equal(result.admission, 'decline-or-site-only');
});
test('scoreAdsFit: full manual signal set clears the pilot threshold', () => {
  const result = scoreAdsFit({
    gbp: { rating: 4.8, reviewCount: 40 }, // reputation = 2
    category: 'אינסטלטור', // ai-resistance tier 1 = 2
    manual: { demandScore: 2, unitEconomicsScore: 2, budgetFloorScore: 2, auctionSanityScore: 2, serviceRadiusScore: 2, capacityOk: true },
  });
  assert.equal(result.totalScore, 16);
  assert.equal(result.admission, 'pilot');
  assert.ok(result.totalScore >= ADMISSION_PILOT_MIN_SCORE);
});
test('scoreAdsFit: mid-range manual score lands conditional', () => {
  const result = scoreAdsFit({
    gbp: { rating: 3.5, reviewCount: 2 }, // reputation = 0
    category: 'רואה חשבון', // tier 2 = 1
    manual: { demandScore: 2, unitEconomicsScore: 1, budgetFloorScore: 2, auctionSanityScore: 1, serviceRadiusScore: 2, capacityOk: true },
  });
  // reputation 0 + tier 1 + demand 2 + unitEcon 1 + budget 2 + capacity 2 + auction 1 + radius 2 = 11
  assert.equal(result.totalScore, 11);
  assert.equal(result.admission, 'conditional');
  assert.ok(result.totalScore >= ADMISSION_CONDITIONAL_MIN_SCORE && result.totalScore < ADMISSION_PILOT_MIN_SCORE);
});

// ── prospectSlug() ───────────────────────────────────────────────────────
test('prospectSlug: stable and filesystem-safe for a Hebrew business name', () => {
  const slug = prospectSlug('גליל אינסטלציה', 'חיפה');
  assert.match(slug, /^[a-z0-9-]+$/);
  const again = prospectSlug('גליל אינסטלציה', 'חיפה');
  assert.equal(slug, again);
});
test('prospectSlug: different inputs produce different slugs', () => {
  assert.notEqual(prospectSlug('א', 'חיפה'), prospectSlug('ב', 'חיפה'));
});

// ── selectRoutingLineMarker() / presentable text — placeholders only ────
test('selectRoutingLineMarker: maps every named rule to its §8 placeholder marker', () => {
  assert.equal(selectRoutingLineMarker({ ruleFired: 'rule-1-no-site' }), '{{ROUTING_LINE_SITE_BOT}}');
  assert.equal(selectRoutingLineMarker({ ruleFired: 'rule-2-thin-site' }), '{{ROUTING_LINE_SITE_BOT}}');
  assert.equal(selectRoutingLineMarker({ ruleFired: 'rule-3-micro-smb-near-geo-threshold' }), '{{ROUTING_LINE_SITE_BOT_GMB_UPSELL}}');
  assert.equal(selectRoutingLineMarker({ ruleFired: 'rule-4-thin-content-ready-smb' }), '{{ROUTING_LINE_GEO_BOT_THIN_CONTENT}}');
  assert.equal(selectRoutingLineMarker({ ruleFired: 'rule-5-geo-direct' }), '{{ROUTING_LINE_GEO_BOT}}');
});

test('buildPresentableReportText never contains Dror/engineer-authored Hebrew routing copy — placeholder markers only', () => {
  const text = buildPresentableReportText({
    businessName: 'גליל אינסטלציה',
    city: 'חיפה',
    gbp: { rating: 4.7, reviewCount: 132, recentPace: { d30: 2, d60: 3, d90: 4 }, sampleSize: 5 },
    targetName: 'גליל אינסטלציה',
    routing: { ruleFired: 'rule-5-geo-direct' },
    adsFit: { hardFail: false },
  });
  assert.match(text, /\{\{ROUTING_LINE_GEO_BOT\}\}/);
});

test('buildPresentableReportText appends the ads-not-ready marker when adsFit hard-failed', () => {
  const text = buildPresentableReportText({
    businessName: 'x', city: 'y',
    gbp: { rating: null, reviewCount: 0, recentPace: { d30: 0, d60: 0, d90: 0 }, sampleSize: 0 },
    targetName: 'x',
    routing: { ruleFired: 'rule-1-no-site' },
    adsFit: { hardFail: true },
  });
  assert.match(text, /\{\{ROUTING_LINE_ADS_NOT_READY\}\}/);
});
