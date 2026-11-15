// Homepage hero window (resting state): markup contract, data provenance and the trimmed landing page.
// HEBREW-SAFETY: zero Hebrew bytes. Every Hebrew expectation is read from the demo record or the product component.
// Needs the compiled product modules (npx tsc -p tsconfig.test.json, the first step of npm run test).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
const local = (relative) => path.join(repository, relative);
const requireDist = createRequire(local('dist/lib/lp/researchedSite.js'));
const json = (relative) => JSON.parse(fs.readFileSync(local(relative), 'utf8'));

function load(relative, imports) {
  const file = local(relative);
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, URL, Buffer, structuredClone, require(name) {
    assert.ok(Object.hasOwn(imports, name), `unexpected import in ${relative}: ${name}`);
    return imports[name];
  } }, { filename: file });
  return exports;
}

const demo = json('data/video/demo/demo-business.json');
const record = json('data/video/demo/stand-in/site-record.json');
const heroScene = load('src/data/heroScene.ts', {});
const homography = requireDist(local('dist/lib/home/homography.js'));
const heroWindow = load('src/lib/home/heroWindow.ts', {
  '../../../data/video/demo/demo-business.json': demo,
  '../../../data/video/demo/stand-in/site-record.json': record,
  '@/data/heroScene': heroScene,
  './homography': homography,
});
const adPreview = load('src/components/google-ads/GoogleAdPreview.tsx', { 'react/jsx-runtime': jsx });
const HeroScene = load('src/components/home/HeroScene.tsx', {
  'react/jsx-runtime': jsx,
  '@/components/google-ads/GoogleAdPreview': adPreview,
  '@/data/heroScene': heroScene,
  '@/lib/home/heroWindow': heroWindow,
}).default;
const landing = load('src/lib/home/heroLandingPage.ts', {
  '../../../data/video/demo/demo-business.json': demo,
  '../../../data/video/demo/stand-in/site-record.json': record,
  '@/lib/lp/researchedSite': requireDist(local('dist/lib/lp/researchedSite.js')),
  '@/lib/site-bot/researchToSite': requireDist(local('dist/lib/site-bot/researchToSite.js')),
  '@/lib/lp/siteFonts': requireDist(local('dist/lib/lp/siteFonts.js')),
  '@/data/heroScene': heroScene,
  './heroWindow': heroWindow,
});

const markup = renderToStaticMarkup(React.createElement(HeroScene));
const textOf = (html) => html.replace(/<style\b[\s\S]*?<\/style>/g, ' ').replace(/<svg\b[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ');

test('new hero files carry no Hebrew literal (all Hebrew comes from data or the moved product component)', () => {
  for (const f of ['src/components/home/HeroScene.tsx', 'src/lib/home/heroWindow.ts', 'src/lib/home/heroLandingPage.ts', 'src/lib/home/homography.ts',
    'src/app/hero-window/lp/route.ts', 'src/app/hero-window/fonts/[file]/route.ts', 'src/data/heroScene.ts', 'scripts/build-hero-scene.mjs']) {
    assert.doesNotMatch(fs.readFileSync(local(f), 'utf8'), /[\u0590-\u05FF]/, f);
  }
});

test('the scene is decorative: aria-hidden + inert, the iframe out of the tab order, images sized and low priority', () => {
  assert.match(markup, /^<div class="hero-scene" aria-hidden="true" inert="">/);
  assert.match(markup, /<iframe class="hero-window-lp" src="\/hero-window\/lp"[^>]* loading="lazy" tabindex="-1"/);
  const imgs = markup.match(/<img [^>]+>/g) ?? [];
  assert.equal(imgs.length, heroScene.HERO_SCENE.tiles.length);
  assert.ok(imgs.length >= 6, 'the photo is split into bands smaller than a headline line');
  for (const img of imgs) {
    assert.match(img, / width="\d+" height="\d+"/);
    assert.match(img, /fetchpriority="low"/i);
    assert.match(img, / alt=""/);
  }
  assert.equal((markup.match(/<source type="image\/avif"/g) ?? []).length, imgs.length);
  assert.doesNotMatch(markup, /<h1\b/);
});

test('every Hebrew run in the window is verbatim demo-record data or the ad preview component', () => {
  const recordText = JSON.stringify(record.collectedData);
  const adSource = fs.readFileSync(local('src/components/google-ads/GoogleAdPreview.tsx'), 'utf8');
  const nodes = [...markup.matchAll(/>([^<]+)</g)].map((m) => m[1].trim()).filter((t) => /[\u0590-\u05FF]/.test(t));
  assert.ok(nodes.length >= 4, `Hebrew text nodes: ${nodes.length}`);
  for (const node of nodes) {
    for (const part of node.split(' | ')) assert.ok(recordText.includes(part) || adSource.includes(`>${part}<`), `unsourced Hebrew: ${part}`);
  }
});

test('the ad keeps Google limits and shows no rating, review count or result', () => {
  for (const h of heroWindow.HERO_AD.headlines) assert.ok([...h].length <= 30, `headline over 30: ${h.length}`);
  for (const d of heroWindow.HERO_AD.descriptions) assert.ok([...d].length <= 90, `description over 90: ${d.length}`);
  const visible = textOf(markup);
  assert.doesNotMatch(visible, /\u2605|\d\.\d|\d+\s*%/);
  assert.doesNotMatch(visible.toLowerCase(), /demo|example|fictional|\.invalid/);
});

test('the window transform maps the virtual screen onto the photo screen with the bezel bleed', () => {
  const css = heroWindow.heroWindowTransform();
  const m = css.replace(/^matrix3d\(|\)$/g, '').split(',').map(Number);
  const [W, H] = [heroWindow.HERO_WINDOW_SIZE.width, heroWindow.HERO_WINDOW_SIZE.height];
  const map = (x, y) => { const w = m[3] * x + m[7] * y + m[15]; return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w]; };
  const corners = [map(0, 0), map(W, 0), map(W, H), map(0, H)];
  heroScene.HERO_SCENE.screen.forEach(([x, y], i) => {
    const [cx, cy] = corners[i];
    assert.ok(Math.abs(Math.abs(cx - x) - heroWindow.HERO_WINDOW_BLEED) < 1e-6 && Math.abs(Math.abs(cy - y) - heroWindow.HERO_WINDOW_BLEED) < 1e-6, `corner ${i}`);
  });
  assert.equal(heroWindow.HERO_WINDOW_LP_HEIGHT + heroWindow.HERO_WINDOW_TAB_BAR + heroWindow.HERO_WINDOW_SERP, H);
});

test('the landing page is the product render of the demo service page, cut above the trust strip, noindex', () => {
  const html = landing.heroLandingPageHtml();
  const page = record.researchedPages.find((p) => p.targetPath === demo.servicePath);
  assert.ok(page);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html, /name="robots" content="index/);
  assert.doesNotMatch(html, /<script\b|rel="canonical"|og:url|\.invalid|demo-plumber/);
  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.ok(html.includes(`<h1>${page.copy.heroHeadline}</h1>`));
  assert.ok(html.includes('data-hero-call'));
  assert.match(html, /<div class="hw-owner"><picture><source type="image\/avif" srcset="\/images\/home\/hero-owner\.avif"><img [^>]*width="360" height="480"/);
  assert.doesNotMatch(html, /data-section="trust"|class="trust"/);
  assert.doesNotMatch(textOf(html.slice(html.indexOf('<body'))), /\u2605|\d\.\d/);
  assert.ok(html.includes('/hero-window/fonts/heebo-hebrew.woff2') && !html.includes('/assets/fonts/'));
  assert.ok(html.trimEnd().endsWith('</main></body></html>'));
});
