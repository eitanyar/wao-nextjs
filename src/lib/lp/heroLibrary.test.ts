// Per-service AI atmosphere hero photos (Eitan 2026-11-17, Fable 5.2 "process yes, outcomes never"): the resolver order,
// the thermal-camera rule, the deterministic city-aware pick, and the hero-background-only rule in the rendered site.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes (Hebrew stems are read from generationData.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { assignHeroVariants, cityKey, heroPool, libraryServiceId, ownerHasThermalCamera, siteLibraryHeroes, type HeroLibrary, type HeroPeerSite } from './heroLibrary';
import { USP_TOOL_GROUPS } from './generationData';
import { renderResearchedSitePages } from './researchedSite';
import { lookFixtureParams } from './siteLook.testkit';
import type { SiteLook, SiteLookHero } from './siteLook';

const images = (tag: string) => [480, 768, 1080, 1440].map(width => ({
  width, height: Math.round((width * 928) / 1664), avif: `/img/hero-${tag}-${width}.avif`, webp: `/img/hero-${tag}-${width}.webp`,
}));
const variant = (id: string, tag: string) => ({ id, images: images(tag) });

/** A library shaped like the approved plumber one (ids only; tags stand in for the content hashes). */
const LIB: HeroLibrary = {
  trade: 'plumber',
  services: {
    'leak-detection': { standard: ['ld-2', 'ld-3'], thermalCamera: ['ld-hand-2', 'ld-1'] },
    'drain-cleaning': { standard: ['dc-1', 'dc-2', 'dc-3'] },
    'pipe-replacement': { standard: ['pr-2', 'pr-3'] },
  },
  fallback: ['atmo-1', 'atmo-5', 'atmo-6'],
  variants: Object.fromEntries([
    ['ld-1', 'aaaaaaaaaaa1'], ['ld-2', 'aaaaaaaaaaa2'], ['ld-3', 'aaaaaaaaaaa3'], ['ld-hand-2', 'aaaaaaaaaaa4'],
    ['dc-1', 'bbbbbbbbbbb1'], ['dc-2', 'bbbbbbbbbbb2'], ['dc-3', 'bbbbbbbbbbb3'], ['pr-2', 'ccccccccccc2'], ['pr-3', 'ccccccccccc3'],
    ['atmo-1', 'ddddddddddd1'], ['atmo-5', 'ddddddddddd5'], ['atmo-6', 'ddddddddddd6'],
  ].map(([id, tag]) => [id, variant(id, tag)])),
};

test('service id: svc-<id> when the library has it, a planner dedupe suffix stripped, anything else null (fallback)', () => {
  assert.equal(libraryServiceId('svc-leak-detection', LIB), 'leak-detection');
  assert.equal(libraryServiceId('svc-drain-cleaning', LIB), 'drain-cleaning');
  assert.equal(libraryServiceId('svc-leak-detection-2', LIB), 'leak-detection');
  assert.equal(libraryServiceId('svc-water-heater-installation', LIB), null, 'not in this test library');
  assert.equal(libraryServiceId('svc-3f2a9c1b0d', LIB), null, 'hashed id');
  assert.equal(libraryServiceId('home', LIB), null);
  assert.equal(libraryServiceId('leak-detection', LIB), null, 'no svc- prefix');
});

test('thermal camera: only an owner-stated thermal camera (usp or confirmed service attribute); a generic camera is not one', () => {
  const thermalStem = USP_TOOL_GROUPS.thermal.he[0];
  const cameraStem = USP_TOOL_GROUPS.camera.he[0];
  assert.equal(ownerHasThermalCamera({ usp: 'Thermal camera, no tile breaking' }), true);
  assert.equal(ownerHasThermalCamera({ usp: 'Infrared leak finding' }), true);
  assert.equal(ownerHasThermalCamera({ usp: `x ${cameraStem} ${thermalStem} y` }), true);
  assert.equal(ownerHasThermalCamera({ usp: 'Camera leak detection' }), false);
  assert.equal(ownerHasThermalCamera({ usp: `x ${cameraStem} y` }), false, 'a pipe camera is not a thermal camera');
  assert.equal(ownerHasThermalCamera({ usp: 'Same day', serviceAttributes: { 'leak detection': 'Owner answer: thermal camera' } }), true);
  assert.equal(ownerHasThermalCamera({ usp: 'Same day', serviceAttributes: { 'leak detection': 'acoustic listening' } }), false);
  assert.equal(ownerHasThermalCamera({}), false);
  assert.equal(ownerHasThermalCamera(null), false);
});

test('pool: thermal owner -> camera list, otherwise the standard list; unknown service -> trade fallback; empty -> none', () => {
  assert.deepEqual(heroPool(LIB, 'leak-detection', true), { key: 'leak-detection:thermal-camera', ids: ['ld-hand-2', 'ld-1'] });
  assert.deepEqual(heroPool(LIB, 'leak-detection', false), { key: 'leak-detection:standard', ids: ['ld-2', 'ld-3'] });
  assert.deepEqual(heroPool(LIB, 'drain-cleaning', true), { key: 'drain-cleaning:standard', ids: ['dc-1', 'dc-2', 'dc-3'] }, 'no camera list = standard');
  assert.deepEqual(heroPool(LIB, null, false), { key: 'fallback', ids: ['atmo-1', 'atmo-5', 'atmo-6'] });
  assert.deepEqual(heroPool(LIB, 'unknown', false), { key: 'fallback', ids: ['atmo-1', 'atmo-5', 'atmo-6'] });
  assert.equal(heroPool({ ...LIB, fallback: [] }, null, false), null);
  assert.equal(heroPool({ ...LIB, services: {}, fallback: [] }, 'leak-detection', false), null);
});

const site = (slug: string, createdAt: string, city: string, thermal = false, ids = ['home', 'svc-leak-detection', 'svc-drain-cleaning']): HeroPeerSite =>
  ({ slug, createdAt, thermal, pages: ids.map(id => ({ id, city })) });

test('pick: never the same variant for two sites in the same city and service while the pool has an unused one', () => {
  const sites = [site('a', '2026-11-01T00:00:00Z', 'Holon'), site('b', '2026-11-02T00:00:00Z', 'Holon'), site('c', '2026-11-03T00:00:00Z', 'Holon')];
  const picks = assignHeroVariants(LIB, sites);
  const of = (slug: string, id: string) => picks.get(slug)![id];
  assert.notEqual(of('a', 'svc-leak-detection'), of('b', 'svc-leak-detection'));
  // drain cleaning has 3 variants: all three differ; homepages (fallback, 3 variants) all differ too.
  assert.equal(new Set(['a', 'b', 'c'].map(s => of(s, 'svc-drain-cleaning'))).size, 3);
  assert.equal(new Set(['a', 'b', 'c'].map(s => of(s, 'home'))).size, 3);
  // leak detection (standard) has 2: the third site collides with the least-used one (each used once -> its own hash order).
  assert.ok(['ld-2', 'ld-3'].includes(of('c', 'svc-leak-detection')));
  // Variants come from the right pools.
  for (const s of ['a', 'b', 'c']) {
    assert.ok(LIB.services['leak-detection'].standard.includes(of(s, 'svc-leak-detection')), 'no thermal fact = never a camera variant');
    assert.ok(LIB.fallback.includes(of(s, 'home')));
  }
});

test('pick: least-used variant wins when a collision is unavoidable', () => {
  const sites = ['a', 'b', 'c', 'd', 'e'].map((slug, i) => site(slug, `2026-11-0${i + 1}T00:00:00Z`, 'Holon', false, ['svc-leak-detection']));
  const picks = assignHeroVariants(LIB, sites);
  const counts = new Map<string, number>();
  for (const s of sites) { const id = picks.get(s.slug)!['svc-leak-detection']; counts.set(id, (counts.get(id) ?? 0) + 1); }
  assert.deepEqual([...counts.values()].sort(), [2, 3], '5 sites over 2 variants: 3 / 2, never 4 / 1');
});

test('pick: other cities and other pools do not collide; city match is normalised', () => {
  const picks = assignHeroVariants(LIB, [site('a', '2026-11-01T00:00:00Z', 'Holon'), site('b', '2026-11-02T00:00:00Z', '  holon ')]);
  assert.notEqual(picks.get('a')!['svc-leak-detection'], picks.get('b')!['svc-leak-detection'], 'same city after normalising');
  assert.equal(cityKey('  Bat   Yam '), 'bat yam');
  // A thermal site and a standard site in the same city draw from different pools: no shared ids at all.
  const mixed = assignHeroVariants(LIB, [site('a', '2026-11-01T00:00:00Z', 'Holon', true), site('b', '2026-11-02T00:00:00Z', 'Holon', false)]);
  assert.ok(LIB.services['leak-detection'].thermalCamera!.includes(mixed.get('a')!['svc-leak-detection']));
  assert.ok(LIB.services['leak-detection'].standard.includes(mixed.get('b')!['svc-leak-detection']));
});

test('pick: deterministic per site, independent of input order, stable when a later site is added', () => {
  const base = [site('a', '2026-11-01T00:00:00Z', 'Holon'), site('b', '2026-11-02T00:00:00Z', 'Holon'), site('x', '2026-11-02T00:00:00Z', 'Eilat')];
  const one = assignHeroVariants(LIB, base);
  const two = assignHeroVariants(LIB, [...base].reverse());
  for (const s of base) assert.deepEqual(one.get(s.slug), two.get(s.slug));
  const later = assignHeroVariants(LIB, [...base, site('z', '2026-11-09T00:00:00Z', 'Holon')]);
  for (const s of base) assert.deepEqual(later.get(s.slug), one.get(s.slug), `${s.slug} keeps its photos`);
  assert.throws(() => assignHeroVariants(LIB, [base[0], base[0]]), /duplicate site/);
});

test('pick: pages of one site prefer different fallback photos', () => {
  const picks = assignHeroVariants(LIB, [site('a', '2026-11-01T00:00:00Z', 'Holon', false, ['home', 'svc-unknown-1', 'svc-unknown-2'])]).get('a')!;
  assert.equal(new Set(Object.values(picks)).size, 3);
});

test('owner photo wins on every page: an approved real photo leaves no library hero', () => {
  const picks = { home: 'atmo-1', 'svc-leak-detection': 'ld-2' };
  assert.deepEqual(siteLibraryHeroes(LIB, picks, true), {});
  const heroes = siteLibraryHeroes(LIB, picks, false);
  assert.deepEqual(Object.keys(heroes).sort(), ['home', 'svc-leak-detection']);
  assert.deepEqual(heroes.home.images, LIB.variants['atmo-1'].images);
  assert.deepEqual(siteLibraryHeroes(LIB, { home: 'gone' }, false), {});
});

// ── Rendered site: hero background only, flagged; owner photo first; absent = byte-identical ─────────────────────────

const libraryHeroes = (): Record<string, SiteLookHero> => ({
  home: { approved: true, images: images('ddddddddddd1') },
  'svc-alpha': { approved: true, images: images('bbbbbbbbbbb1') },
});
const FLAG = 'data-ai-generated="atmosphere"';
const LIB_PATH = /\/img\/hero-(?:ddddddddddd1|bbbbbbbbbbb1)-/;

test('render: each library page has one hero backdrop, flagged as an AI atmosphere photo; a page without one stays solid', () => {
  const files = renderResearchedSitePages({ ...lookFixtureParams(), libraryHeroes: libraryHeroes() });
  const html = (file: string) => files[file];
  for (const file of ['index.html', 'services/alpha-repair.html']) {
    const page = html(file);
    assert.equal(page.split('<img ').length - 1, 1, `${file}: exactly one <img>`);
    assert.equal(page.split(FLAG).length - 1, 1, `${file}: exactly one AI flag`);
    assert.ok(page.includes(`<img class="hero-bg" ${FLAG} src="`), `${file}: the flag sits on the hero backdrop`);
    assert.ok(page.includes('<section class="hero on-dark has-photo" data-section="hero"><picture>'), `${file}: backdrop is the hero's first child`);
  }
  const gamma = html('services/gamma.html');
  assert.ok(!gamma.includes(FLAG) && !gamma.includes('has-photo') && !/<img /.test(gamma), 'no library entry = solid hero');
});

test('render: never og:image, schema image, About, gallery or any other image slot', () => {
  const params = lookFixtureParams();
  const off = renderResearchedSitePages(params);
  const on = renderResearchedSitePages({ ...params, libraryHeroes: libraryHeroes() });
  for (const [file, page] of Object.entries(on)) {
    if (!file.endsWith('.html')) { assert.equal(page, off[file], `${file} unchanged`); continue; }
    const og = /<meta property="og:image" content="([^"]*)"/.exec(page)?.[1] ?? '';
    assert.ok(!LIB_PATH.test(og), `${file}: og:image`);
    assert.equal(og, /<meta property="og:image" content="([^"]*)"/.exec(off[file])?.[1] ?? '', `${file}: og:image unchanged`);
    for (const [, json] of page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) assert.ok(!LIB_PATH.test(json), `${file}: JSON-LD`);
    const outsideHero = page.replace(/<section class="hero[\s\S]*?<\/section>/, '');
    assert.ok(!LIB_PATH.test(outsideHero), `${file}: a library path outside the hero`);
    assert.ok(!/data-section="about"[\s\S]*?<img /.test(page.replace(/<section class="hero[\s\S]*?<\/section>/, '')), `${file}: no image in About`);
  }
});

test('render: the owner photo wins on every page (no flag); no library heroes = byte-identical output', () => {
  const params = lookFixtureParams();
  const owner: SiteLook = { hero: { approved: true, images: images('eeeeeeeeeee1') } };
  const files = renderResearchedSitePages({ ...params, look: owner, libraryHeroes: libraryHeroes() });
  for (const file of ['index.html', 'services/alpha-repair.html', 'services/gamma.html']) {
    assert.ok(files[file].includes('/img/hero-eeeeeeeeeee1-'), file);
    assert.ok(!files[file].includes(FLAG) && !LIB_PATH.test(files[file]), `${file}: owner photo, no library`);
  }
  const off = renderResearchedSitePages(params);
  assert.deepEqual(renderResearchedSitePages({ ...params, libraryHeroes: {} }), off);
  assert.deepEqual(renderResearchedSitePages({ ...params, libraryHeroes: { home: { approved: false, images: images('ddddddddddd1') } } }), off);
});
