// Site Bot visual pack: the deploy-time loader of data/site-proof/{slug}/ (WAO_SITE_PROOF_DIR, a temp dir here).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { emptyLookRecord, loadSiteLook, readLookRecord, siteProofDir, SiteLookError, writeLookRecord, type LookRecord } from './siteLookStore';

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

function withProofDir(fn: (root: string) => void): void {
  const saved = process.env.WAO_SITE_PROOF_DIR;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'site-proof-'));
  process.env.WAO_SITE_PROOF_DIR = root;
  try { fn(root); } finally {
    if (saved === undefined) delete process.env.WAO_SITE_PROOF_DIR; else process.env.WAO_SITE_PROOF_DIR = saved;
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const approval = { by: 'staff', at: '2026-11-16T10:00:00.000Z' };

function seed(slug: string): { record: LookRecord; avif: Buffer; webp: Buffer; logo: Buffer } {
  const dir = siteProofDir(slug);
  fs.mkdirSync(path.join(dir, 'img'), { recursive: true });
  const avif = Buffer.from('avif-bytes');
  const webp = Buffer.from('webp-bytes');
  const logo = Buffer.from('logo-bytes');
  fs.writeFileSync(path.join(dir, 'img', 'hero-0123456789ab-480.avif'), avif);
  fs.writeFileSync(path.join(dir, 'img', 'hero-0123456789ab-480.webp'), webp);
  fs.writeFileSync(path.join(dir, 'img', 'logo-0123456789ab.webp'), logo);
  const record: LookRecord = {
    ...emptyLookRecord(slug),
    hero: { approved: true, source: 'photos/0123456789ab.jpg', sourceSha256: 'x', approval, images: [{
      width: 480, height: 270, avif: 'img/hero-0123456789ab-480.avif', webp: 'img/hero-0123456789ab-480.webp',
      avifBytes: avif.length, webpBytes: webp.length, avifSha256: sha(avif), webpSha256: sha(webp) }] },
    logo: { approved: true, kind: 'file', source: 'logo/0123456789ab.svg', sourceSha256: 'x', src: 'img/logo-0123456789ab.webp', width: 80, height: 40, bytes: logo.length, sha256: sha(logo), approval },
  };
  writeLookRecord(record);
  return { record, avif, webp, logo };
}

test('no record or nothing approved -> null (the site renders as today)', () => {
  withProofDir(root => {
    assert.equal(loadSiteLook('plumber'), null);
    assert.equal(siteProofDir('plumber'), path.join(root, 'plumber'));
    const { record } = seed('plumber');
    writeLookRecord({ ...record, hero: { ...record.hero!, approved: false }, logo: { ...record.logo!, approved: false } });
    assert.equal(loadSiteLook('plumber'), null);
  });
});

test('approved hero + logo file -> served paths in the look, verified bytes in the upload set', () => {
  withProofDir(() => {
    const { avif, webp, logo } = seed('plumber');
    const loaded = loadSiteLook('plumber')!;
    assert.deepEqual(loaded.look, {
      hero: { approved: true, images: [{ width: 480, height: 270, avif: '/img/hero-0123456789ab-480.avif', webp: '/img/hero-0123456789ab-480.webp' }] },
      logo: { approved: true, kind: 'file', src: '/img/logo-0123456789ab.webp', width: 80, height: 40 },
    });
    assert.deepEqual(Object.keys(loaded.files).sort(), ['img/hero-0123456789ab-480.avif', 'img/hero-0123456789ab-480.webp', 'img/logo-0123456789ab.webp']);
    assert.ok(loaded.files['img/hero-0123456789ab-480.avif'].equals(avif));
    assert.ok(loaded.files['img/hero-0123456789ab-480.webp'].equals(webp));
    assert.ok(loaded.files['img/logo-0123456789ab.webp'].equals(logo));
  });
});

test('a generated logo carries its variant, icon and mark id; nothing is uploaded for it', () => {
  withProofDir(() => {
    writeLookRecord({ ...emptyLookRecord('plumber'), logo: { approved: true, kind: 'generated', variant: 'icon', icon: 'drop', markId: 'emergency-trades:plumber-01', approval } });
    assert.deepEqual(loadSiteLook('plumber'), { look: { logo: { approved: true, kind: 'generated', variant: 'icon', icon: 'drop', markId: 'emergency-trades:plumber-01' } }, files: {} });
  });
});

test('a changed, missing or symlinked file, a bad path or an approval without who/when stops the deploy', () => {
  const cases: Array<[string, (dir: string, record: LookRecord) => void]> = [
    ['changed', dir => fs.writeFileSync(path.join(dir, 'img', 'hero-0123456789ab-480.avif'), 'tampered')],
    ['missing', dir => fs.rmSync(path.join(dir, 'img', 'logo-0123456789ab.webp'))],
    ['symlink', dir => { fs.rmSync(path.join(dir, 'img', 'hero-0123456789ab-480.webp')); fs.symlinkSync('/etc/hostname', path.join(dir, 'img', 'hero-0123456789ab-480.webp')); }],
    ['path', (_dir, record) => writeLookRecord({ ...record, hero: { ...record.hero!, images: [{ ...record.hero!.images[0], avif: 'img/../../x.avif' }] } })],
    ['approval', (_dir, record) => writeLookRecord({ ...record, hero: { ...record.hero!, approval: { by: '', at: 'never' } } })],
    ['variant', (_dir, record) => writeLookRecord({ ...record, logo: { approved: true, kind: 'generated', variant: 'banner' as never, approval } })],
  ];
  for (const [name, mutate] of cases) {
    withProofDir(() => {
      const { record } = seed('plumber');
      mutate(siteProofDir('plumber'), record);
      assert.throws(() => loadSiteLook('plumber'), SiteLookError, name);
    });
  }
});

test('slug and record shape are validated', () => {
  withProofDir(root => {
    assert.throws(() => siteProofDir('../clients'), SiteLookError);
    fs.mkdirSync(path.join(root, 'plumber'));
    fs.writeFileSync(path.join(root, 'plumber', 'look.json'), JSON.stringify({ version: 1, slug: 'other', photos: [], logoFiles: [], history: [] }));
    assert.throws(() => readLookRecord('plumber'), SiteLookError);
  });
});

test('logo display overrides ride along only with an approved logo; unknown keys and the name never pass', () => {
  withProofDir(() => {
    const logo = { approved: true, kind: 'generated' as const, variant: 'lockup' as const, approval };
    const logoDisplay = { descriptor: false, leadWords: 2, by: 'staff', at: approval.at, businessName: 'Other' } as LookRecord['logoDisplay'];
    writeLookRecord({ ...emptyLookRecord('plumber'), logo, logoDisplay });
    assert.deepEqual(loadSiteLook('plumber'), { look: { logo: { approved: true, kind: 'generated', variant: 'lockup' }, logoDisplay: { descriptor: false, leadWords: 2 } }, files: {} });
    writeLookRecord({ ...emptyLookRecord('plumber'), logo: { ...logo, approved: false }, logoDisplay });
    assert.equal(loadSiteLook('plumber'), null);
  });
});
