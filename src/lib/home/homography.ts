// Projective (perspective) maps for the homepage hero window: a flat box onto the photo's laptop screen.
// Pure, dependency-free (unit-tested in homography.test.ts). HEBREW-SAFETY: ZERO Hebrew bytes.

export type Point = readonly [number, number];

/** Pushes each corner `d` px away from the quad's centre. */
export function growQuad(quad: readonly Point[], d: number): Point[] {
  const cx = quad.reduce((a, p) => a + p[0], 0) / quad.length;
  const cy = quad.reduce((a, p) => a + p[1], 0) / quad.length;
  return quad.map(([x, y]) => [x + Math.sign(x - cx) * d, y + Math.sign(y - cy) * d] as const);
}

/** Solves A x = b (Gaussian elimination with partial pivoting). */
function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    if (Math.abs(m[c][c]) < 1e-12) throw new Error("degenerate quad");
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/**
 * The projective map of the w x h box (origin top-left) onto `quad` (TL, TR, BR, BL), as a CSS matrix3d()
 * for an element with transform-origin 0 0. Returns the 3x3 homography too (for tests).
 */
export function rectToQuad(w: number, h: number, quad: readonly Point[]) {
  const src: Point[] = [[0, 0], [w, 0], [w, h], [0, h]];
  const A: number[][] = [];
  const B: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [X, Y] = quad[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    B.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    B.push(Y);
  }
  const [a, b, c, d, e, f, g, hh] = solve(A, B);
  const H = [[a, b, c], [d, e, f], [g, hh, 1]];
  const n = (v: number) => +v.toPrecision(10);
  const css = `matrix3d(${[a, d, 0, g, b, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1].map(n).join(", ")})`;
  return { H, css };
}
