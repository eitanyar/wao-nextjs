import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import { renderStaticHtml, type RenderStaticHtmlParams } from './renderStaticHtml';
import { VERTICAL_THEMES, type VerticalKey } from './verticalThemes';
import { VERTICAL_ASSETS } from './verticalAssets';
import type { LPCopy } from './lpCopyPrompt';
import { adsLpBrandLogo, adsLpGalleryFromPhotos, renderableGallery, type AdsLpGallery } from './adsLpUploads';
import { prepareLogo, prepareWorkPhoto, prepareWorkPhotos, uploadFilePath, WORK_PHOTO_MAX_PX } from './adsLpImages';
import { resolveUploadStrings, UPLOAD_STRING_KEYS } from '../google-ads/intakeUploads';

const FIXTURES = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../src/lib/lp/testdata/ads-lp-baseline-fixtures.json'), 'utf8')) as {
  copy: LPCopy;
  cases: Array<{ name: string; expectedSha256: string; vertical: VerticalKey; params: Omit<RenderStaticHtmlParams, 'theme' | 'assets' | 'copy'> }>;
};

function render(c: (typeof FIXTURES.cases)[number], extra: Partial<RenderStaticHtmlParams> = {}): string {
  return renderStaticHtml({ theme: VERTICAL_THEMES[c.vertical], assets: VERTICAL_ASSETS[c.vertical], copy: FIXTURES.copy, ...c.params, ...extra });
}
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

const A = '\u05D0'; // test-only Hebrew letter by escape (the strings guard needs one); not copy
const LOGO = { src: '/img/logo-0123456789abcdef.webp', width: 120, height: 40 };
const photo = (n: number) => ({ src: `/img/work-${String(n).padStart(16, '0')}.webp`, width: 960, height: 720, alt: `alt ${n}` });
const GALLERY: AdsLpGallery = { heading: 'Gallery heading', photos: [photo(1), photo(2), photo(3)] };

test('no logo + no gallery: the ads LP is byte-identical to the page before the change', () => {
  for (const c of FIXTURES.cases) {
    assert.equal(sha(render(c)), c.expectedSha256, `${c.name}: bytes changed`);
    assert.equal(sha(render(c, { logo: undefined, gallery: undefined })), c.expectedSha256, `${c.name}: explicit undefined`);
    // A gallery below 3 photos or an invalid logo renders nothing, so the bytes stay identical too.
    assert.equal(sha(render(c, { gallery: { ...GALLERY, photos: GALLERY.photos.slice(0, 2) }, logo: { ...LOGO, src: '/uploads/s/x.png' } })), c.expectedSha256);
  }
});

test('logo: shown in the header instead of the text name, with its CSS; nothing else moves', () => {
  const c = FIXTURES.cases[0];
  const html = render(c, { logo: LOGO });
  assert.match(html, /<div class="brand has-logo"><svg data-logo="file" role="img" aria-label="Fixture Business" width="120" height="40"/);
  assert.ok(html.includes(`<image href="${LOGO.src}" width="120" height="40"/>`));
  assert.ok(html.includes('.brand.has-logo{'));
  assert.equal(html.includes('<div class="brand">'), false);
  assert.equal(html.includes('data-section="gallery"'), false);
  assert.equal((html.match(/<img /g) ?? []).length, 0, 'the logo is not an <img> anywhere else (never the hero)');
});

test('gallery: a section between Services and the reviews, lazy images with alt, its CSS once', () => {
  const c = FIXTURES.cases[1];
  const html = render(c, { gallery: GALLERY });
  const services = html.indexOf('id="services"');
  const gallery = html.indexOf('id="gallery"');
  const reviews = html.indexOf('id="reviews"');
  assert.ok(services < gallery && gallery < reviews);
  assert.ok(html.includes('<h2 id="gallery-heading"'));
  assert.equal((html.match(/<img src="\/img\/work-/g) ?? []).length, 3);
  assert.ok(html.includes('alt="alt 1" loading="lazy" decoding="async"'));
  assert.equal((html.match(/\.gal\{list-style/g) ?? []).length, 1);
  // Removing the inserted section + CSS gives back the baseline bytes.
  const stripped = html.replace(/\n\n {2}<!-- Work photos -->[\s\S]*?<\/section>(?=\n\n {2}<!-- Guarantee)/, '').replace(/\n {4}\.gal\{[^\n]*/, '');
  assert.equal(sha(stripped), c.expectedSha256);
});

test("'site' mode (Site Bot) ignores logo and gallery entirely", () => {
  const c = FIXTURES.cases[0];
  const site = { mode: 'site' as const, siteUrl: 'https://fixture.example' };
  assert.equal(render(c, { ...site, logo: LOGO, gallery: GALLERY }), render(c, site));
});

test('renderableGallery caps at 6, drops malformed photos, needs a heading', () => {
  const seven = { heading: 'h', photos: [1, 2, 3, 4, 5, 6, 7].map(photo) };
  assert.equal(renderableGallery(seven)?.photos.length, 6);
  assert.equal(renderableGallery({ heading: ' ', photos: GALLERY.photos }), null);
  assert.equal(renderableGallery({ heading: 'h', photos: [photo(1), photo(2), { ...photo(3), src: 'https://x.test/a.webp' }] }), null);
  assert.equal(renderableGallery({ heading: 'h', photos: [photo(1), photo(2), { ...photo(3), alt: '' }] }), null);
  assert.equal(adsLpBrandLogo({ ...LOGO, width: 400 }, 'B'), undefined, 'over the header box');
});

test('adsLpGalleryFromPhotos: off without strings, alt texts numbered from the template', () => {
  const photos = [photo(1), photo(2), photo(3)];
  assert.equal(adsLpGalleryFromPhotos(photos, 'Biz', resolveUploadStrings({})), undefined);
  const strings = resolveUploadStrings({ ...Object.fromEntries(UPLOAD_STRING_KEYS.map(k => [k, `${A} ${k}`])), galleryImageAlt: `${A} {businessName} {index}` });
  const gallery = adsLpGalleryFromPhotos(photos, 'Biz', strings);
  assert.equal(gallery?.heading, `${A} galleryHeading`);
  assert.deepEqual(gallery?.photos.map(p => p.alt), [`${A} Biz 1`, `${A} Biz 2`, `${A} Biz 3`]);
  assert.equal(adsLpGalleryFromPhotos(photos.slice(0, 2), 'Biz', strings), undefined);
});

test('deploy images: uploads resized to WebP under /img/, missing / unsafe paths skipped', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ads-lp-uploads-'));
  try {
    fs.mkdirSync(path.join(root, 's-1'));
    await sharp({ create: { width: 1000, height: 250, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } } }).png().toFile(path.join(root, 's-1', 'logo.png'));
    await sharp({ create: { width: 2000, height: 1500, channels: 3, background: { r: 200, g: 100, b: 50 } } }).jpeg().toFile(path.join(root, 's-1', 'w1.jpg'));
    fs.writeFileSync(path.join(root, 's-1', 'broken.jpg'), 'not an image');

    const logo = await prepareLogo(root, '/uploads/s-1/logo.png');
    assert.ok(logo);
    assert.match(logo.src, /^\/img\/logo-[0-9a-f]{16}\.webp$/);
    assert.deepEqual([logo.width, logo.height], [160, 40]);
    assert.ok(adsLpBrandLogo(logo, 'B'), 'a prepared logo always fits the header box');
    assert.equal((await sharp(logo.bytes).metadata()).format, 'webp');

    const work = await prepareWorkPhoto(root, '/uploads/s-1/w1.jpg');
    assert.ok(work);
    assert.match(work.src, /^\/img\/work-[0-9a-f]{16}\.webp$/);
    assert.deepEqual([work.width, work.height], [WORK_PHOTO_MAX_PX, 720]);

    assert.equal(await prepareWorkPhoto(root, '/uploads/s-1/broken.jpg'), null);
    assert.equal(await prepareWorkPhoto(root, '/uploads/s-1/missing.jpg'), null);
    assert.equal(await prepareLogo(root, undefined), null);
    assert.equal(uploadFilePath(root, '/uploads/../etc/passwd.jpg'), null);
    assert.equal(uploadFilePath(root, '/uploads/s-1/w1.jpg'), path.join(root, 's-1', 'w1.jpg'));
    assert.equal((await prepareWorkPhotos(root, ['/uploads/s-1/w1.jpg', '/uploads/s-1/broken.jpg', '/uploads/s-1/w1.jpg'])).length, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
