// HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { growQuad, rectToQuad, type Point } from './homography';

const apply = (H: number[][], [x, y]: Point): Point => {
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w];
};

// The fitted laptop screen of the workbench master (src/data/heroScene.ts), a non-affine quad.
const QUAD: Point[] = [[478, 131.94], [1216.85, 126.24], [1212.02, 591.48], [486.45, 576.34]];

test('rectToQuad maps the four box corners onto the quad corners', () => {
  const { H } = rectToQuad(960, 605, QUAD);
  const box: Point[] = [[0, 0], [960, 0], [960, 605], [0, 605]];
  box.forEach((p, i) => {
    const [x, y] = apply(H, p);
    assert.ok(Math.abs(x - QUAD[i][0]) < 1e-6 && Math.abs(y - QUAD[i][1]) < 1e-6, `corner ${i}: ${x},${y}`);
  });
});

test('rectToQuad emits a matrix3d whose terms match the homography (column-major, origin 0 0)', () => {
  const { H, css } = rectToQuad(960, 605, QUAD);
  const m = css.replace(/^matrix3d\(|\)$/g, '').split(',').map(Number);
  assert.equal(m.length, 16);
  const expect = [H[0][0], H[1][0], 0, H[2][0], H[0][1], H[1][1], 0, H[2][1], 0, 0, 1, 0, H[0][2], H[1][2], 0, 1];
  m.forEach((v, i) => assert.ok(Math.abs(v - expect[i]) <= Math.abs(expect[i]) * 1e-8 + 1e-12, `term ${i}`));
  assert.ok(Math.abs(H[2][0]) > 0 || Math.abs(H[2][1]) > 0, 'the quad is a perspective, not an affine, map');
});

test('rectToQuad of the box onto itself is the identity', () => {
  const { H } = rectToQuad(100, 50, [[0, 0], [100, 0], [100, 50], [0, 50]]);
  assert.deepEqual(H.flat().map((v) => Math.round(v * 1e9) / 1e9 + 0), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
});

test('growQuad pushes every corner outward by d on both axes', () => {
  const g = growQuad(QUAD, 1.5);
  assert.deepEqual(g, [[476.5, 130.44], [1218.35, 124.74], [1213.52, 592.98], [484.95, 577.84]]);
});
