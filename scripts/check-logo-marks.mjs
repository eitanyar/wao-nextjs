#!/usr/bin/env node
// Visual check of the optimised logo marks (scripts/build-logo-marks.mjs): every approved mark is rendered from its source
// SVG and from marks.generated.json at 64 px and 16 px tall (Chromium via puppeteer, over a mid-grey backdrop so a change
// in the paper or the transparent parts shows), and the RGBA pixels are compared.
//
//   node scripts/check-logo-marks.mjs [--jitter 0.1] [--sheet out.png]
//
// The bar is a noise floor, not a fixed number: anti-aliased edges that sit on a pixel boundary flip with any sub-pixel
// move, so a mark FAILS when its optimised render differs from the source render more than the source render differs
// from itself drawn --jitter px (default 0.1 px) off, on either the mean channel delta or the count of pixels moving more
// than 48/255 (up to OVER_SLACK = 2 isolated pixels allowed). --sheet writes a side-by-side contact sheet (source | optimised) at 64 px.
// HEBREW-SAFETY: zero Hebrew bytes.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const puppeteer = require('puppeteer');
const { values } = parseArgs({ options: { jitter: { type: 'string' }, sheet: { type: 'string' } } });
/** The noise floor: the source drawn JITTER px off (both axes). */
const JITTER = Number(values.jitter ?? 0.1);
/** Single stray pixels allowed over 48/255 per render (an isolated edge pixel is not a visible change). */
const OVER_SLACK = 2;

const marks = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/lib/lp/logoMarks/marks.generated.json'), 'utf8')).marks;
const rows = Object.entries(marks).map(([id, mark]) => {
  const source = fs.readFileSync(path.join(ROOT, 'src/lib/lp/logoMarks/svg', `${id}.svg`), 'utf8');
  const colours = Object.fromEntries([...source.matchAll(/var\(--mark-([a-z]+),(#[0-9a-f]{3,6})\)/g)].map(m => [m[1], m[2]]));
  const vars = ['primary', 'accent', 'paper'].map(name => `--mark-${name}:${colours[name] ?? '#ffffff'}`).join(';');
  const optimised = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${mark.viewBox}" style="${vars}">${mark.body}</svg>`;
  return { id, source, optimised };
});

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
let failed = 0;
const report = [];
try {
  const page = await browser.newPage();
  await page.setContent('<body></body>');
  for (const row of rows) {
    const result = await page.evaluate(async (a, b, jitter) => {
      const load = svg => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const out = {};
      for (const h of [64, 16]) {
        const w = Math.max(1, Math.round(h * ia.naturalWidth / ia.naturalHeight));
        const draw = (img, shift = 0) => {
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.drawImage(img, shift, shift, w, h);
          return g.getImageData(0, 0, w, h).data;
        };
        const compare = (da, db) => {
          let max = 0; let sum = 0; let over = 0;
          for (let k = 0; k < da.length; k += 4) {
            let px = 0;
            for (let ch = 0; ch < 3; ch++) { const d = Math.abs(da[k + ch] - db[k + ch]); px = Math.max(px, d); sum += d; }
            max = Math.max(max, px);
            if (px > 48) over++;
          }
          return { max, mean: sum / (w * h * 3), over };
        };
        const base = draw(ia);
        out[h] = { pixels: w * h, opt: compare(base, draw(ib)), jitter: compare(base, draw(ia, jitter)) };
      }
      return out;
    }, row.source, row.optimised, JITTER);
    for (const h of [64, 16]) {
      const r = result[h];
      // Pass: the optimised mark differs from the source no more than the source differs from itself moved by JITTER px.
      const bad = r.opt.mean > r.jitter.mean || r.opt.over > Math.max(r.jitter.over, OVER_SLACK);
      if (bad) failed++;
      report.push({ id: row.id, h, pixels: r.pixels, ...r.opt, jMean: r.jitter.mean, jOver: r.jitter.over, bad });
    }
  }
  if (values.sheet) {
    const cells = rows.map(row => `<div style="display:inline-flex;gap:2px;margin:3px;align-items:center;background:#808080;padding:2px">${row.source.replace('<svg ', '<svg style="height:64px" ')}${row.optimised.replace('<svg ', '<svg height="64" ')}</div>`).join('');
    await page.setViewport({ width: 1600, height: 800 });
    await page.setContent(`<body style="margin:0">${cells}</body>`);
    await page.screenshot({ path: values.sheet, fullPage: true });
  }
} finally {
  await browser.close();
}

const worst = (h, key) => report.filter(r => r.h === h).sort((a, b) => b[key] - a[key])[0];
for (const h of [64, 16]) {
  const of = report.filter(r => r.h === h);
  const mean = of.reduce((s, r) => s + r.mean, 0) / of.length;
  const w = worst(h, 'over'); const m = worst(h, 'mean');
  const jMean = of.reduce((s, r) => s + r.jMean, 0) / of.length;
  console.log(`${h}px: mean channel delta ${mean.toFixed(3)} (a ${JITTER} px move of the source: ${jMean.toFixed(3)}); worst pixel delta ${Math.max(...of.map(r => r.max))}; pixels over 48: worst ${w.id} ${w.over}/${w.pixels} (move ${w.jOver}); worst mean ${m.id} ${m.mean.toFixed(3)} (move ${m.jMean.toFixed(3)})`);
}
for (const r of report.filter(item => item.bad)) console.log(`  FAIL ${r.id} @${r.h}px: over48 ${r.over} (move ${r.jOver}) / ${r.pixels}, mean ${r.mean.toFixed(3)} (move ${r.jMean.toFixed(3)}), max ${r.max}`);
if (failed) { console.error(`logo marks visual check: ${failed} failures`); process.exit(1); }
console.log(`logo marks visual check: PASS (${rows.length} marks x 64 px / 16 px)`);
