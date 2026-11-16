// Site Bot visual pack: the deterministic hero scorer, the variant budgets, metadata stripping and the owner-logo raster.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Fixtures: synthetic photos generated here, plus the repo's
// demo photos (data/video/demo/photos, read-only).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { buildHeroVariants, buildOwnerLogo, heroBudgetFor, rankHeroScores, scoreHeroPhoto, whiteContrastOver } from './siteLookImages';
import { HERO_BUDGET } from '../lp/siteLook';
import { LOGO_DISPLAY_HEIGHT } from '../lp/siteLogo';

const ROOT = path.resolve(__dirname, '../../..');
const DEMO = path.join(ROOT, 'data', 'video', 'demo', 'photos');

/** Seeded PRNG (mulberry32), so every synthetic fixture is the same bytes on every run. */
function rng(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A synthetic "photo": a dark smooth gradient with a textured object in the end (left) 30% and gentle grain elsewhere.
 * busy = hard high-contrast texture over the whole frame; bright = a near-white frame.
 */
async function photo({ width = 1920, height = 1080, busy = false, bright = false, seed = 7 } = {}): Promise<Buffer> {
  const random = rng(seed);
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const base = bright ? 250 : 70 + 50 * (x / width) + 20 * (y / height);
      const object = x < width * 0.3 && ((Math.floor(x / 24) + Math.floor(y / 24)) % 2 === 0) ? 60 : 0;
      const texture = busy ? (random() < 0.5 ? -60 : 60) : (random() - 0.5) * 6;
      const v = Math.max(0, Math.min(255, base + object + texture));
      const i = (y * width + x) * 3;
      raw[i] = v; raw[i + 1] = Math.max(0, v - 8); raw[i + 2] = Math.min(255, v + 10);
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
}

test('contrast maths: white over pure white under the overlay alpha is under 4.5; over black it is far above', () => {
  assert.ok(whiteContrastOver(255, 255, 255) < 4.5);
  assert.ok(whiteContrastOver(0, 0, 0) > 10);
});

test('scorer: a good synthetic photo passes; portrait, blurry, busy-text-zone and bright photos are rejected', async () => {
  const good = await photo();
  const goodScore = await scoreHeroPhoto(good);
  assert.equal(goodScore.pass, true, JSON.stringify(goodScore));
  const portrait = await scoreHeroPhoto(await photo({ width: 1080, height: 1440 }));
  assert.deepEqual(portrait.reasons.slice(0, 2), ['not_landscape', 'too_narrow']);
  const blurry = await scoreHeroPhoto(await sharp(good).blur(8).jpeg().toBuffer());
  assert.ok(blurry.reasons.includes('blurry'), JSON.stringify(blurry));
  const busy = await scoreHeroPhoto(await photo({ busy: true }));
  assert.ok(busy.reasons.includes('busy_text_zone'), JSON.stringify(busy));
  const bright = await scoreHeroPhoto(await photo({ bright: true }));
  assert.ok(bright.reasons.includes('low_contrast'), JSON.stringify(bright));
  const narrow = await scoreHeroPhoto(await photo({ width: 1000, height: 600 }));
  assert.ok(narrow.reasons.includes('too_narrow'));
  // None passes -> the ranked list has no passing photo (the CLI then keeps the solid hero).
  const ranked = rankHeroScores([{ id: 'busy', score: busy }, { id: 'good', score: goodScore }, { id: 'blurry', score: blurry }]);
  assert.equal(ranked[0].id, 'good');
  assert.equal(rankHeroScores([{ id: 'busy', score: busy }, { id: 'blurry', score: blurry }]).some(row => row.score.pass), false);
});

test('scorer: deterministic, and orientation-aware (an EXIF-rotated landscape file that displays portrait is rejected)', async () => {
  const good = await photo({ seed: 3 });
  assert.deepEqual(await scoreHeroPhoto(good), await scoreHeroPhoto(good));
  const rotated = await sharp(good).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  assert.ok((await scoreHeroPhoto(rotated)).reasons.includes('not_landscape'));
});

test('scorer on the repo demo photos: a quiet landscape passes, the busy street scene and the portrait fail', { skip: fs.existsSync(DEMO) ? false : 'demo photos absent' }, async () => {
  const score = async (file: string) => scoreHeroPhoto(fs.readFileSync(path.join(DEMO, file)));
  assert.equal((await score('camera.jpg')).pass, true);
  assert.deepEqual((await score('van.jpg')).reasons, ['busy_text_zone']);
  assert.ok((await score('owner.jpg')).reasons.includes('not_landscape'));
});

test('variants: every width the source covers, AVIF + WebP, within the weight budget, no EXIF, width/height recorded', async () => {
  const source = await sharp(await photo({ seed: 11 })).withMetadata({ exif: { IFD0: { Copyright: 'owner', Artist: 'owner' } } }).jpeg({ quality: 92 }).toBuffer();
  assert.ok((await sharp(source).metadata()).exif, 'fixture carries EXIF');
  const built = await buildHeroVariants(source);
  assert.deepEqual(built.images.map(image => image.width), [480, 768, 1080, 1440, 1920]);
  assert.equal(Object.keys(built.files).length, 10);
  for (const image of built.images) {
    assert.equal(image.height, Math.round((image.width * 1080) / 1920));
    for (const format of ['avif', 'webp'] as const) {
      const bytes = built.files[image[format]];
      assert.match(image[format], new RegExp(`^img/hero-[0-9a-f]{12}-${image.width}\\.${format}$`));
      assert.ok(bytes.length <= heroBudgetFor(image.width), `${image[format]} ${bytes.length} B over budget`);
      if (image.width <= HERO_BUDGET.smallMaxWidth) assert.ok(bytes.length <= 70_000);
      assert.ok(bytes.length <= 180_000);
      const meta = await sharp(bytes).metadata();
      assert.equal(meta.format, format === 'avif' ? 'heif' : 'webp');
      assert.equal(meta.width, image.width);
      assert.equal(meta.exif, undefined, `${image[format]} has no EXIF`);
      assert.equal(meta.xmp, undefined);
    }
  }
  // Deterministic: the same source gives the same bytes.
  const again = await buildHeroVariants(source);
  assert.deepEqual(again.images, built.images);
  // A 1200px source gets no upscaled widths.
  assert.deepEqual((await buildHeroVariants(await photo({ width: 1200, height: 800 }))).images.map(image => image.width), [480, 768, 1080]);
});

test('variants: a file that cannot meet the budget fails loudly (never ships over budget)', async () => {
  const random = rng(99);
  const width = 1920; const height = 1280;
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i += 1) raw[i] = Math.floor(random() * 256);
  const noise = await sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
  await assert.rejects(buildHeroVariants(noise), /hero_over_budget/);
});

test('owner logo: an SVG is rasterised (never kept), transparent edges trimmed, sized for the header at 2x, WebP', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect x="100" y="50" width="200" height="100" fill="#123456"/></svg>');
  const logo = await buildOwnerLogo(svg);
  assert.equal(logo.height, LOGO_DISPLAY_HEIGHT);
  assert.equal(logo.width, 80, 'trimmed to the 2:1 mark, not the 400x200 canvas');
  assert.match(logo.src, /^img\/logo-[0-9a-f]{12}\.webp$/);
  const meta = await sharp(logo.files[logo.src]).metadata();
  assert.equal(meta.format, 'webp');
  assert.deepEqual([meta.width, meta.height], [160, 80]);
  assert.equal(meta.exif, undefined);
  // A very wide logo is capped at the max display width.
  const wide = await buildOwnerLogo(await sharp({ create: { width: 2000, height: 100, channels: 4, background: '#123456' } }).png().toBuffer());
  assert.equal(wide.width, 200);
  assert.equal(wide.height, 10);
});
