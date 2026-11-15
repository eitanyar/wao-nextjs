// Homepage hero scene build: screen detection on a synthetic master, the switched-off screen, and the built files
// (size budget, IPTC trainedAlgorithmicMedia XMP, dimensions) the generated module points at.
// HEBREW-SAFETY: zero Hebrew bytes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { findScreen, switchOffScreen, grow, WIDTHS, DATA_OUTPUT, TILE_COUNT } from './build-hero-scene.mjs';
import { DIGITAL_SOURCE_TYPE } from './build-knowledge-illustrations.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));

function inside(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** A brown 400x240 image with a slightly rotated / keystoned pure-green screen. */
function synthetic(quad) {
  const w = 400, h = 240;
  const data = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3;
    const g = inside(x + 0.5, y + 0.5, quad);
    data[i] = g ? 0 : 110; data[i + 1] = g ? 255 : 80; data[i + 2] = g ? 0 : 60;
  }
  return { data, w, h };
}

test('findScreen recovers the corners of a non-rectangular green screen within a pixel', () => {
  const quad = [[100, 42], [300, 38], [298, 170], [104, 166]];
  const { data, w, h } = synthetic(quad);
  const found = findScreen(data, w, h);
  found.forEach(([x, y], i) => {
    assert.ok(Math.abs(x - quad[i][0]) <= 1 && Math.abs(y - quad[i][1]) <= 1, `corner ${i}: ${x},${y} vs ${quad[i]}`);
  });
});

test('switchOffScreen leaves no green pixel and keeps the photo outside the screen', () => {
  const quad = [[100, 42], [300, 38], [298, 170], [104, 166]];
  const { data, w, h } = synthetic(quad);
  switchOffScreen(data, w, h, findScreen(data, w, h));
  const outer = grow(quad, 10);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3;
    assert.ok(!(data[i + 1] > 150 && data[i] < 120 && data[i + 2] < 120), `green left at ${x},${y}`);
    if (!inside(x + 0.5, y + 0.5, outer)) assert.deepEqual([...data.subarray(i, i + 3)], [110, 80, 60], `photo changed at ${x},${y}`);
  }
});

test('every scene file the generated module lists exists, fits the budget and carries the AI-media XMP', async () => {
  const mod = fs.readFileSync(DATA_OUTPUT, 'utf8');
  const files = [...mod.matchAll(/\/images\/home\/[a-z0-9.-]+\.(?:avif|webp)/g)].map((m) => m[0]);
  assert.equal(new Set(files.filter((f) => f.includes('workbench'))).size, TILE_COUNT * 2 * WIDTHS.length);
  assert.ok(files.includes('/images/home/hero-owner.avif') && files.includes('/images/home/hero-owner.webp'));
  for (const f of new Set(files)) {
    const buf = fs.readFileSync(path.join(repository, 'public', f));
    assert.ok(buf.length <= 100_000, `${f} is ${buf.length} bytes`);
    assert.ok(buf.includes(Buffer.from(DIGITAL_SOURCE_TYPE)), `${f} lost the IPTC XMP`);
    const meta = await sharp(buf).metadata();
    const w = Number(f.match(/-(\d+)\.\w+$/)?.[1] ?? 360);
    assert.equal(meta.width, w, `${f} width`);
  }
});
