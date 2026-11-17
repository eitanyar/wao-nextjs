// Site Bot header logo: the rendered-layout harness (real Chromium layout with the self-hosted Heebo, not the width
// estimate). Used by scripts/site-bot-logo-layout.test.mjs; not a test file.
// Every fixture name x every generated variant x descriptor auto / forced on / off x two trades (the plumber and the
// longest label), rendered as the real homepage, measured at 320, 360, 390 and 1280 px:
//   - the header height equals the no-look page's header at that width (the logo never grows the header);
//   - the name box never overflows (scrollWidth <= clientWidth), nor does the logo link, the descriptor or the page;
//   - the descriptor gives way city first, then the whole line, as the viewport narrows (never the other order).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Names come from testdata/logo-names.json and the read-only
// data/sites/test-plumber-tlv.json record; composed names are joins of slices of those strings.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { createTsRequire } from './ts-require.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const req = createTsRequire();
const { renderResearchedSitePages } = req('src/lib/lp/researchedSite.ts');
const { lookFixtureParams } = req('src/lib/lp/siteLook.testkit.ts');
const { tradeTermsOf } = req('src/lib/lp/logoMarks.ts');
const { siteFontFiles } = req('src/lib/lp/siteFonts.ts');
const { TRADE_DESCRIPTORS, logoNameFlags } = req('src/lib/lp/siteLogo.ts');
export { logoNameFlags };

export const WIDTHS = [320, 360, 390, 1280];
export const VARIANTS = ['lockup', 'icon', 'monogram', 'name'];
/** Owner file logos at the display cap: a wide one and a square-ish one (both 40px tall). */
const FILES = [{ width: 200, height: 40 }, { width: 48, height: 40 }];
const MODES = { auto: undefined, on: { descriptor: true }, off: { descriptor: false } };

const NAMES = JSON.parse(fs.readFileSync(path.join(ROOT, 'testdata/logo-names.json'), 'utf8')).map(item => item.name).filter(Boolean);
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sites/test-plumber-tlv.json'), 'utf8')).collectedData;
const AREAS = [SITE.targetLocation, ...SITE.specificCities.split(',').map(city => city.trim()).filter(city => city && city !== SITE.targetLocation)];
const fable = n => JSON.parse(fs.readFileSync(path.join(ROOT, 'testdata/logo-names.json'), 'utf8')).find(item => item.fable === n).name;
const words = text => text.split(' ');
/** Composed names (slices / joins of the fixtures): a short name + a prefixed city, + a bare city, long many-word names. */
const prefixLetter = words(fable(1))[2][0];
const COMPOSED = [
  `${fable(5)} ${prefixLetter}${AREAS[1]}`,
  `${fable(5)} ${AREAS[1]}`,
  `${fable(5)} ${words(fable(8)).slice(2).join(' ')}`,
  `${fable(5)} ${words(fable(10))[0]} ${words(fable(2))[1]}`,
  // Whole at 360px in two 13px lines, but more than three lines in the plain variant's 74px at 320px (the 12px tier).
  `${fable(5)} ${fable(1)}`,
];
export const LAYOUT_NAMES = [...NAMES, ...COMPOSED];

/** The plumber, and the trade with the longest descriptor label. */
const LONGEST = Object.entries(TRADE_DESCRIPTORS).sort((a, b) => b[1].length - a[1].length)[0][0];
export const TRADES = ['plumber', LONGEST];

export function render(name, trade, look) {
  const params = lookFixtureParams();
  params.data = { ...params.data, businessName: name, businessNiche: tradeTermsOf(trade)[0] };
  params.pages = params.pages.map(page => (page.classification === 'homepage' ? { ...page, seo: { ...page.seo, serviceArea: AREAS } } : page));
  return renderResearchedSitePages({ ...params, ...(look ? { look } : {}) })['index.html'];
}

/** Every case: { key, name, trade, variant, mode, html } (+ the no-look baselines per trade). */
export function layoutCases() {
  const cases = [];
  for (const trade of TRADES) {
    LAYOUT_NAMES.forEach((name, n) => {
      for (const variant of VARIANTS) {
        for (const [mode, logoDisplay] of Object.entries(MODES)) {
          const look = { logo: { approved: true, kind: 'generated', variant }, ...(logoDisplay ? { logoDisplay } : {}) };
          const html = render(name, trade, look);
          if (!/class="brand has-logo"/.test(html)) continue; // variant not eligible: today's text name
          cases.push({ key: `${trade}/n${n}/${variant}/${mode}`, name, trade, variant, mode, html });
        }
      }
      for (const [f, file] of FILES.entries()) {
        for (const [mode, logoDisplay] of Object.entries(MODES)) {
          const look = { logo: { approved: true, kind: 'file', src: '/img/logo-0123456789ab.webp', ...file }, ...(logoDisplay ? { logoDisplay } : {}) };
          cases.push({ key: `${trade}/n${n}/file${f}/${mode}`, name, trade, variant: 'file', mode, html: render(name, trade, look) });
        }
      }
    });
  }
  return cases;
}

const FONTS = siteFontFiles();
const ORIGIN = 'http://logo-layout.test';

/** Measures every case at every width in headless Chromium. */
export async function measure(cases, widths = WIDTHS) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];
  try {
    const page = await browser.newPage();
    let current = '';
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      const font = FONTS[url.pathname.slice(1)];
      if (url.origin === ORIGIN && url.pathname === '/index.html') request.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: current });
      else if (url.origin === ORIGIN && font) request.respond({ status: 200, contentType: 'font/woff2', body: font, headers: { 'Access-Control-Allow-Origin': '*' } });
      else request.respond({ status: 204, body: '' }); // images, scripts: not needed for the header
    });
    const baselines = {};
    for (const width of widths) {
      await page.setViewport({ width, height: 800 });
      for (const trade of TRADES) {
        current = render(LAYOUT_NAMES[0], trade, undefined);
        await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        baselines[`${trade}/${width}`] = await page.evaluate(() => document.querySelector('.site-hdr').getBoundingClientRect().height);
      }
      for (const item of cases) {
        current = item.html;
        await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const m = await page.evaluate(() => {
          const header = document.querySelector('.site-hdr');
          const brand = header.querySelector('a.brand');
          // The name box (generated logos), or the owner file's svg (its box is fixed by its attributes).
          const name = header.querySelector('.logo-name') ?? header.querySelector('[data-logo="file"]');
          const isFile = name.tagName.toLowerCase() === 'svg';
          const desc = header.querySelector('.logo-desc');
          const city = header.querySelector('.logo-desc-city');
          const shown = el => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
          const heebo = [...document.fonts].some(face => face.family.replace(/"/g, '') === 'Heebo' && face.status === 'loaded');
          return {
            header: header.getBoundingClientRect().height,
            brandW: brand.clientWidth,
            brandOverflow: brand.scrollWidth - brand.clientWidth,
            nameW: isFile ? name.getBoundingClientRect().width : name.clientWidth,
            nameOverflow: isFile ? Math.max(0, name.getBoundingClientRect().right - brand.getBoundingClientRect().right, brand.getBoundingClientRect().left - name.getBoundingClientRect().left) : name.scrollWidth - name.clientWidth,
            // Lines hidden by the clamp (Fable's last step for very long names): rows of text below the box.
            nameCut: isFile ? 0 : name.scrollHeight - name.clientHeight,
            clamped: !isFile && getComputedStyle(name).webkitLineClamp !== 'none',
            nameFont: parseFloat(getComputedStyle(name).fontSize),
            nameLines: Math.round(name.getBoundingClientRect().height / (parseFloat(getComputedStyle(name).fontSize) * 1.15)),
            desc: !desc ? 'absent' : !shown(desc) ? 'none' : city && !shown(city) ? 'label' : city ? 'full' : 'label-only',
            descOverflow: desc && shown(desc) ? desc.scrollWidth - desc.clientWidth : 0,
            pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            heebo,
          };
        });
        results.push({ key: item.key, name: item.name, trade: item.trade, variant: item.variant, mode: item.mode, width, baseline: baselines[`${item.trade}/${width}`], ...m });
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}

/** The failures of a measurement set (empty = pass). */
export function failures(results) {
  const out = [];
  const RANK = { full: 3, 'label-only': 2, label: 2, none: 1, absent: 0 };
  for (const r of results) {
    const where = `${r.key} @${r.width}`;
    if (!r.heebo) out.push(`${where}: Heebo not loaded`);
    if (Math.abs(r.header - r.baseline) > 0.5) out.push(`${where}: header ${r.header} != ${r.baseline}`);
    if (r.nameOverflow > 0) out.push(`${where}: name overflows by ${r.nameOverflow}px`);
    if (r.brandOverflow > 0) out.push(`${where}: logo link overflows by ${r.brandOverflow}px`);
    if (r.descOverflow > 0) out.push(`${where}: descriptor clipped by ${r.descOverflow}px`);
    if (r.pageOverflow > 0) out.push(`${where}: page scrolls sideways by ${r.pageOverflow}px`);
    if (r.mode === 'off' && r.desc !== 'absent') out.push(`${where}: descriptor off but rendered`);
  }
  // A name is cut only by the clamp the CSS chose (the last step, for a name that has no whole step in its budget): text
  // hidden any other way is a failure. (A hidden line is at least 12px; a few px of glyph overhang is not a cut.)
  const CUT_PX = 8;
  for (const r of results) if (r.nameCut > CUT_PX && !r.clamped) out.push(`${r.key} @${r.width}: name cut (${r.nameCut}px hidden) without the clamp`);
  // Drop order: on phones, a narrower viewport never shows more of the descriptor than a wider one.
  const byKey = new Map();
  for (const r of results) if (r.width < 900) byKey.set(r.key, [...(byKey.get(r.key) ?? []), r]);
  for (const [key, rows] of byKey) {
    const sorted = rows.sort((a, b) => a.width - b.width);
    for (let i = 1; i < sorted.length; i++) {
      if (RANK[sorted[i - 1].desc] > RANK[sorted[i].desc]) out.push(`${key}: descriptor ${sorted[i - 1].desc} @${sorted[i - 1].width} but ${sorted[i].desc} @${sorted[i].width}`);
    }
  }
  return out;
}

