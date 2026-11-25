// Per-service AI atmosphere hero photos (Eitan 2026-11-17): the built plumber library on disk, the fail-closed loader,
// the peer scan over stored site records, and the demo record's resolution. Temp dirs only; never data/clients/.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes (Hebrew values are read from the demo stand-in record).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { approvedPeerSites, heroLibraryFiles, heroLibraryRoot, HeroLibraryError, loadHeroLibrary, peerOf, recordTrade, resolveSiteLibraryHeroes, type HeroSiteRecord } from './heroLibraryStore';
import { libraryServiceId } from '../lp/heroLibrary';

const ROOT = path.resolve(__dirname, '../../..');
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const LIB_ROOT = path.join(ROOT, 'assets', 'photo-library');
const APPROVAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'photo-library', 'plumber', 'approved-2026-11-17.json'), 'utf8'));
const DEMO = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'video', 'demo', 'stand-in', 'site-record.json'), 'utf8')) as HeroSiteRecord;

test('built library: every approved photo is served, dropped ones never, camera split kept, flags fail closed', () => {
  assert.equal(heroLibraryRoot(), path.join(process.cwd(), 'assets', 'photo-library'));
  const loaded = loadHeroLibrary('plumber', LIB_ROOT)!;
  assert.ok(loaded);
  const manifest = JSON.parse(fs.readFileSync(path.join(LIB_ROOT, 'plumber', 'library.json'), 'utf8'));
  const approvedFiles = [
    ...Object.values(APPROVAL.services as Record<string, string[] | { camera: string[]; noCamera: string[] }>).flatMap(v => Array.isArray(v) ? v : [...v.camera, ...v.noCamera]),
    ...APPROVAL.tradeFallback,
  ].sort();
  assert.deepEqual(Object.values(manifest.variants as Record<string, { source: string }>).map(v => v.source).sort(), approvedFiles);
  for (const dropped of Object.keys(APPROVAL.dropped)) assert.ok(!(dropped.replace(/\.png$/, '') in manifest.variants), dropped);
  assert.equal(manifest.approval.sha256, sha(fs.readFileSync(path.join(ROOT, manifest.approval.file))), 'manifest built from this approval');
  // Leak detection: camera list only with a thermal camera; the rest of the services as approved.
  assert.deepEqual(loaded.library.services['leak-detection'], { standard: ['leak-detection-2', 'leak-detection-3'], thermalCamera: ['leak-detection-hand-2', 'leak-detection-1'] });
  assert.deepEqual(Object.keys(loaded.library.services).sort(), ['bathroom-renovation', 'drain-cleaning', 'leak-detection', 'leak-repair', 'pipe-replacement', 'water-heater-installation']);
  assert.deepEqual(loaded.library.fallback, ['plumber-atmo-1', 'plumber-atmo-5', 'plumber-atmo-6']);
  // Content flags: AI atmosphere, no people / faces; hands only on the hand photo.
  for (const [id, v] of Object.entries(manifest.variants as Record<string, { people: boolean; faces: boolean; hands: boolean; aiGenerated: boolean; kind: string }>)) {
    assert.equal(v.aiGenerated, true, id); assert.equal(v.kind, 'atmosphere', id);
    assert.equal(v.people, false, id); assert.equal(v.faces, false, id);
    assert.equal(v.hands, id === 'leak-detection-hand-2', id);
  }
  // Every served file is on disk with its recorded sha256, within the hero budget, nothing stale.
  const files = heroLibraryFiles(loaded, Object.keys(loaded.library.variants));
  assert.deepEqual(Object.keys(files).sort(), fs.readdirSync(path.join(LIB_ROOT, 'plumber', 'img')).map(n => `img/${n}`).sort());
  for (const [name, bytes] of Object.entries(files)) {
    const width = Number(/-(\d+)\.(?:avif|webp)$/.exec(name)![1]);
    assert.ok(bytes.length <= (width <= 828 ? 70_000 : 180_000), `${name} within budget`);
  }
  assert.equal(loadHeroLibrary('electrician', LIB_ROOT), null, 'no library = none');
  assert.equal(loadHeroLibrary('../plumber', LIB_ROOT), null, 'unsafe trade');
});

/** The built manifest, loosely typed for tampering. */
interface Manifest {
  variants: Record<string, Record<string, unknown> & { images: Array<Record<string, string>> }>;
  services: Record<string, { standard: string[] }>;
  fallback: string[];
}

function tamperedCopy(mutate: (manifest: Manifest, dir: string) => void): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hero-lib-'));
  fs.cpSync(path.join(LIB_ROOT, 'plumber'), path.join(root, 'plumber'), { recursive: true });
  const file = path.join(root, 'plumber', 'library.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(manifest, path.join(root, 'plumber'));
  fs.writeFileSync(file, JSON.stringify(manifest));
  return root;
}

test('loader fails closed: people / faces / unflagged, a camera photo in a standard list, a changed or missing file', () => {
  const cases: Array<[(m: Manifest, dir: string) => void, RegExp]> = [
    [m => { m.variants['plumber-atmo-1'].people = true; }, /variant_flags:plumber-atmo-1/],
    [m => { delete m.variants['plumber-atmo-1'].faces; }, /variant_flags:plumber-atmo-1/],
    [m => { m.variants['leak-detection-hand-2'].faces = true; }, /variant_flags/],
    [m => { m.variants['plumber-atmo-1'].aiGenerated = false; }, /variant_flags/],
    [m => { m.variants['plumber-atmo-1'].kind = 'owner'; }, /variant_flags/],
    [m => { m.services['leak-detection'].standard.push('leak-detection-1'); }, /equipment:leak-detection-1/],
    [m => { m.fallback.push('leak-detection-hand-2'); }, /fallback_ref/],
    [m => { m.services['drain-cleaning'].standard.push('gone'); }, /service_ref/],
    [m => { m.variants['plumber-atmo-1'].images[0].avif = '../../etc/passwd'; }, /variant_image/],
  ];
  for (const [mutate, re] of cases) {
    const root = tamperedCopy(mutate);
    try { assert.throws(() => loadHeroLibrary('plumber', root), (e: unknown) => e instanceof HeroLibraryError && re.test((e as Error).message)); }
    finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
  const root = tamperedCopy((m, dir) => {
    fs.appendFileSync(path.join(dir, m.variants['plumber-atmo-5'].images[0].webp), 'x');
    fs.rmSync(path.join(dir, m.variants['plumber-atmo-6'].images[0].avif));
  });
  try {
    const loaded = loadHeroLibrary('plumber', root)!;
    assert.throws(() => heroLibraryFiles(loaded, ['plumber-atmo-5']), /changed:img\//);
    assert.throws(() => heroLibraryFiles(loaded, ['plumber-atmo-6']), /missing:img\//);
    assert.ok(Object.keys(heroLibraryFiles(loaded, ['plumber-atmo-1'])).length === 8);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

// ── Peer scan + demo record ──────────────────────────────────────────────────────────────────────────────────────────

function dossier(researchId: string, approved: boolean) {
  return {
    researchId, status: 'copy_ready', createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
    businessTruth: { assertions: [] }, evidenceEdges: [], pageOpportunities: [], internalLinkEdges: [], humanGates: [],
    evidence: [], keywordEvidence: [], serpObservations: [], providerUsage: [],
    ...(approved ? { approvedCopyReviewPacket: { approvedAt: '2026-11-01T00:00:00Z' } } : {}),
  };
}

function withStores(fn: (dirs: { sites: string; research: string }) => Promise<void>): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hero-peers-'));
  const dirs = { sites: path.join(root, 'sites'), research: path.join(root, 'research') };
  fs.mkdirSync(dirs.sites); fs.mkdirSync(dirs.research);
  return fn(dirs).finally(() => fs.rmSync(root, { recursive: true, force: true }));
}

function storeSite(dirs: { sites: string; research: string }, slug: string, createdAt: string, opts: { approved?: boolean; simulation?: boolean; niche?: string; usp?: string } = {}): HeroSiteRecord {
  const researchId = `r_${slug.replace(/-/g, '_')}`;
  const record: HeroSiteRecord = {
    ...structuredClone(DEMO), slug, createdAt, researchId,
    ...(opts.simulation ? { simulation: true } : {}),
    collectedData: { ...structuredClone(DEMO.collectedData), ...(opts.niche ? { businessNiche: opts.niche } : {}), ...(opts.usp !== undefined ? { usp: opts.usp } : {}) },
  };
  fs.writeFileSync(path.join(dirs.sites, `${slug}.json`), JSON.stringify(record));
  fs.mkdirSync(path.join(dirs.research, researchId), { recursive: true });
  fs.writeFileSync(path.join(dirs.research, researchId, 'dossier.json'), JSON.stringify(dossier(researchId, opts.approved !== false)));
  return record;
}

test('peer scan: approved researched records of the trade only; simulations, unapproved, other trades and owner-photo sites skipped', async () => {
  await withStores(async dirs => {
    storeSite(dirs, 'peer-ok', '2026-11-01T00:00:00Z');
    storeSite(dirs, 'peer-unapproved', '2026-11-02T00:00:00Z', { approved: false });
    storeSite(dirs, 'peer-sim', '2026-11-03T00:00:00Z', { simulation: true });
    storeSite(dirs, 'peer-electric', '2026-11-04T00:00:00Z', { niche: 'electrician' });
    storeSite(dirs, 'peer-owner-photo', '2026-11-05T00:00:00Z');
    storeSite(dirs, 'self', '2026-11-06T00:00:00Z');
    fs.writeFileSync(path.join(dirs.sites, 'broken.json'), '{');
    const peers = await approvedPeerSites('plumber', 'self', { sitesRoot: dirs.sites, researchBaseDir: dirs.research, ownerHero: slug => slug === 'peer-owner-photo' });
    assert.deepEqual(peers.map(p => p.slug), ['peer-ok']);
    assert.equal(recordTrade({ businessNiche: 'electrician' }), 'electrician');
    assert.equal(recordTrade({ businessNiche: ' Plumber ' }), 'plumber');
    assert.equal(recordTrade({ businessNiche: 'air conditioning' }), 'air-conditioning');
    assert.equal(recordTrade({ businessNiche: 'unknown trade' }), null);
  });
});

test('demo record: services map to the library; the fallback covers the homepage; no thermal fact = never the camera photos', async () => {
  const loaded = loadHeroLibrary('plumber', LIB_ROOT)!;
  assert.equal(recordTrade(DEMO.collectedData), 'plumber');
  const ids = DEMO.researchedPages!.map(p => p.opportunityId);
  assert.deepEqual(ids.map(id => libraryServiceId(id, loaded.library)), [null, 'leak-detection', 'drain-cleaning', 'water-heater-installation']);
  // The demo owner's usp names a camera check (the generic camera group), not a thermal camera.
  assert.equal(peerOf(DEMO).thermal, false);
  await withStores(async dirs => {
    const resolution = await resolveSiteLibraryHeroes(DEMO, false, { sitesRoot: dirs.sites, researchBaseDir: dirs.research, libraryRoot: LIB_ROOT, ownerHero: () => false });
    assert.equal(resolution.trade, 'plumber');
    assert.ok(loaded.library.fallback.includes(resolution.picks.home));
    assert.ok(loaded.library.services['leak-detection'].standard.includes(resolution.picks['svc-leak-detection']));
    assert.ok(loaded.library.services['drain-cleaning'].standard.includes(resolution.picks['svc-drain-cleaning']));
    assert.ok(loaded.library.services['water-heater-installation'].standard.includes(resolution.picks['svc-water-heater-installation']));
    assert.equal(Object.keys(resolution.files).length, 4 * 8, 'four photos x four widths x two formats');
    for (const hero of Object.values(resolution.libraryHeroes)) for (const image of hero.images) assert.ok(`${image.avif.slice(1)}` in resolution.files);
    // A thermal owner gets the camera photos for leak detection.
    const thermal = await resolveSiteLibraryHeroes({ ...DEMO, collectedData: { ...DEMO.collectedData, usp: 'thermal camera, no tile breaking' } }, false, { sitesRoot: dirs.sites, researchBaseDir: dirs.research, libraryRoot: LIB_ROOT, ownerHero: () => false });
    assert.ok(loaded.library.services['leak-detection'].thermalCamera!.includes(thermal.picks['svc-leak-detection']));
    // Owner photo approved = no library at all.
    const owner = await resolveSiteLibraryHeroes(DEMO, true, { sitesRoot: dirs.sites, researchBaseDir: dirs.research, libraryRoot: LIB_ROOT });
    assert.deepEqual([owner.picks, owner.libraryHeroes, owner.files], [{}, {}, {}]);
  });
});

test('demo record: a second approved plumber in the same city gets different photos; the first keeps its own', async () => {
  await withStores(async dirs => {
    const first = storeSite(dirs, 'first-plumber', '2026-11-01T00:00:00Z');
    const options = { sitesRoot: dirs.sites, researchBaseDir: dirs.research, libraryRoot: LIB_ROOT, ownerHero: () => false };
    const before = await resolveSiteLibraryHeroes(first, false, options);
    const second = storeSite(dirs, 'second-plumber', '2026-11-02T00:00:00Z');
    const after = await resolveSiteLibraryHeroes(first, false, options);
    assert.deepEqual(after.picks, before.picks, 'adding a later site never changes an earlier one');
    const other = await resolveSiteLibraryHeroes(second, false, options);
    for (const id of Object.keys(other.picks)) assert.notEqual(other.picks[id], before.picks[id], `${id}: same city, same service`);
  });
});

test('GBP and non-hero code never touch the library', () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx|mjs|js)$/.test(entry.name) || /\.test\./.test(entry.name)) continue;
      const rel = path.relative(ROOT, full);
      const text = fs.readFileSync(full, 'utf8');
      if (/heroLibrary|photo-library/.test(text)) offenders.push(rel);
    }
  };
  walk(path.join(ROOT, 'src'));
  assert.deepEqual(offenders.sort(), [
    'src/app/api/site-bot/deploy/route.ts',
    'src/lib/lp/heroLibrary.ts',
    'src/lib/lp/researchedSite.ts',
    'src/lib/lp/siteLook.ts',
    'src/lib/site-bot/heroLibraryStore.ts',
    // Site Bot step 2c (2026-11-25): the owner's pre-payment preview shows the same library hero the deploy would pick
    // (resolveSiteLibraryHeroes, read-only, inlined into the sandboxed frame).
    'src/lib/site-bot/previewFrame.ts',
  ].sort(), 'only the resolver, the renderer hook, the backdrop flag, the loader, the deploy route and the preview frame');
});
