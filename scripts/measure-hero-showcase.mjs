#!/usr/bin/env node
// Measures a hero showcase entry's geometry (src/content/hero-showcases.json -> entries[].geometry) from a running
// server: the results-page ad headline lines, the LP headline lines, the call button, suggested pointer park /
// call-target points, and the cut page's height (lpDocHeight: the iframe height and the scroll beat's distance). Prints JSON to paste into the entry (numbers only; no copy). Verify with Roni's recording.
//
//   node scripts/measure-hero-showcase.mjs http://127.0.0.1:3312 <entry-id>
// HEBREW-SAFETY: zero Hebrew bytes.
import puppeteer from 'puppeteer';

const [base, id] = process.argv.slice(2);
if (!base || !id) { console.error('usage: measure-hero-showcase.mjs <base-url> <entry-id>'); process.exit(2); }
const TAB_BAR = 26, SERP = 132, SCALE_RIGHT = 910, SCALE = 2;
const LP_TOP = TAB_BAR + SERP;

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  // 1. The LP alone, at the window's virtual width: headline lines and call button in LP px.
  await page.setViewport({ width: 960, height: 605 - LP_TOP });
  await page.goto(`${base}/hero-window/lp/${id}`, { waitUntil: 'networkidle0' });
  const lp = await page.evaluate(() => {
    const r = document.createRange();
    r.selectNodeContents(document.querySelector('h1'));
    const h1 = document.querySelector('h1');
    const lh = parseFloat(getComputedStyle(h1).lineHeight);
    const lines = [...r.getClientRects()].filter((x) => x.width > 2);
    const merged = [];
    for (const x of lines) {
      const prev = merged.find((m) => Math.abs(m.top - x.top) < lh / 2);
      if (prev) { prev.left = Math.min(prev.left, x.left); prev.right = Math.max(prev.right, x.right); } else merged.push({ top: x.top, left: x.left, right: x.right, height: x.height });
    }
    const box = h1.getBoundingClientRect();
    const call = document.querySelector('[data-hero-call]') ?? document.querySelector('a.btn-call');
    const c = call?.getBoundingClientRect();
    return {
      lpDocHeight: Math.ceil(document.documentElement.scrollHeight),
      lpHeadlineLines: merged.map((m, i) => [Math.round(m.left - 3), Math.round(box.top + i * lh), Math.round(m.right - m.left + 6), Math.round(lh)]),
      callButton: c ? [+c.left.toFixed(1), +c.top.toFixed(1), +c.width.toFixed(1), +c.height.toFixed(1), parseFloat(getComputedStyle(call).borderRadius) || 0, getComputedStyle(call).backgroundColor] : null,
    };
  });
  // 2. The results-page ad on the homepage, with the window flattened (no stage scale, no matrix3d).
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${base}/`, { waitUntil: 'networkidle0' });
  const ad = await page.evaluate((id) => {
    document.querySelector('.hero-stage').style.scale = '1';
    const win = document.querySelector('.hero-window');
    win.style.transform = 'none';
    const W = win.getBoundingClientRect();
    // Any ancestor scale left over (the stage fit is set from JS since e38e93a): measure in the window's own px.
    const k = W.width / 960;
    const layer = [...document.querySelectorAll('[data-hm-entry]')].find((e) => e.querySelector(`iframe[src$="/${id}"],iframe[data-src$="/${id}"]`));
    if (!layer) return null;
    const card = layer.querySelector('[class*="serpScale"]').firstElementChild;
    const headline = card.children[1];
    const r = document.createRange();
    r.selectNodeContents(headline);
    const rows = [];
    for (const x of r.getClientRects()) {
      const top = Math.round((x.top - W.top) / k);
      const [left, right] = [(x.left - W.left) / k, (x.right - W.left) / k];
      const row = rows.find((m) => Math.abs(m.top - top) < 10);
      if (row) { row.left = Math.min(row.left, left); row.right = Math.max(row.right, right); } else rows.push({ top, left, right });
    }
    const cardBox = card.getBoundingClientRect();
    return { rows, cardTop: (cardBox.top - W.top) / k, cardBottom: (cardBox.bottom - W.top) / k, headlineTop: headline.offsetTop };
  }, id);
  if (!ad) throw new Error(`entry ${id} not found on the homepage`);
  const lineH = 25;
  const resultsAdLines = ad.rows.map((row, i) => [ad.headlineTop + i * lineH, Math.round((row.right - row.left) / SCALE) + 2]);
  const [bl, bt] = lp.callButton ?? [0, 0];
  const rgb = (lp.callButton?.[5] ?? '').match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
  const hex = `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  const geometry = {
    resultsAdLines,
    lpHeadlineLines: lp.lpHeadlineLines,
    callButton: lp.callButton ? [...lp.callButton.slice(0, 5), hex] : null,
    park: [300, Math.max(512, Math.round(ad.cardBottom) + 30)],
    callTarget: [Math.round(bl + 2.5), Math.round(bt + LP_TOP + 3)],
    lpDocHeight: lp.lpDocHeight,
  };
  console.log(JSON.stringify({ id, geometry, notes: { resultsCardBottom: Math.round(ad.cardBottom), scaleRight: SCALE_RIGHT } }, null, 2));
} finally {
  await browser.close();
}
