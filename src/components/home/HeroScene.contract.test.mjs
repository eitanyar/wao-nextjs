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
const motionStrings = json('src/content/hero-motion-strings-2026-11-15.json');
const showcasesData = json('src/content/hero-showcases.json');
const showcases = load('src/lib/home/heroShowcases.ts', {
  '@/content/hero-showcases.json': showcasesData,
  '@/content/hero-motion-strings-2026-11-15.json': motionStrings,
});
const heroWindow = load('src/lib/home/heroWindow.ts', {
  '../../../data/video/demo/demo-business.json': demo,
  '../../../data/video/demo/stand-in/site-record.json': record,
  '@/data/heroScene': heroScene,
  './homography': homography,
  './heroShowcases': showcases,
});
const adPreview = load('src/components/google-ads/GoogleAdPreview.tsx', { 'react/jsx-runtime': jsx });
// CSS module stub: class name = key. The button is a client component; render a marker in its place.
const cssModule = new Proxy({}, { get: (_, key) => String(key) });
const HeroMotionButton = ({ labels }) => React.createElement('button', { 'data-hm-button': '', 'data-skip': labels.skip, 'aria-label': labels.replay, hidden: true });
const HeroScene = load('src/components/home/HeroScene.tsx', {
  'react/jsx-runtime': jsx,
  '@/content/hero-motion-strings-2026-11-15.json': motionStrings,
  './HeroMotionButton': { __esModule: true, default: HeroMotionButton },
  './heroMotion.module.css': { __esModule: true, default: cssModule },
  '@/components/google-ads/GoogleAdPreview': adPreview,
  '@/data/heroScene': heroScene,
  '@/lib/home/heroWindow': heroWindow,
  '@/lib/home/heroShowcases': showcases,
}).default;
const landing = load('src/lib/home/heroLandingPage.ts', {
  '../../../data/video/demo/demo-business.json': demo,
  '../../../data/video/demo/stand-in/site-record.json': record,
  '@/lib/lp/researchedSite': requireDist(local('dist/lib/lp/researchedSite.js')),
  '@/lib/site-bot/researchToSite': requireDist(local('dist/lib/site-bot/researchToSite.js')),
  '@/lib/lp/siteFonts': requireDist(local('dist/lib/lp/siteFonts.js')),
  '@/data/heroScene': heroScene,
  './heroWindow': heroWindow,
  './heroShowcases': showcases,
});

const markup = renderToStaticMarkup(React.createElement(HeroScene));
/** The window alone (the laptop screen), without the button and the captions outside the scene. */
const windowMarkup = markup.slice(markup.indexOf('<div class="hero-window"'), markup.lastIndexOf('<button'));
const textOf = (html) => html.replace(/<style\b[\s\S]*?<\/style>/g, ' ').replace(/<svg\b[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ');

test('new hero files carry no Hebrew literal (all Hebrew comes from data or the moved product component)', () => {
  for (const f of ['src/components/home/HeroScene.tsx', 'src/lib/home/heroWindow.ts', 'src/lib/home/heroLandingPage.ts', 'src/lib/home/homography.ts',
    'src/app/hero-window/lp/[id]/route.ts', 'src/lib/home/heroShowcases.ts', 'src/app/hero-window/fonts/[file]/route.ts', 'src/data/heroScene.ts', 'scripts/build-hero-scene.mjs',
    'src/components/home/HeroMotionButton.tsx', 'src/lib/home/heroMotion.ts', 'scripts/build-hero-motion-css.mjs', 'src/components/home/heroMotion.module.css']) {
    assert.doesNotMatch(fs.readFileSync(local(f), 'utf8'), /[\u0590-\u05FF]/, f);
  }
});

test('the scene is decorative: aria-hidden + inert, the iframe out of the tab order, images sized and low priority', () => {
  assert.match(markup, /^<div class="hero-scene-wrap wrap" data-motion="rest"><div class="hero-scene" data-hm-scene="" aria-hidden="true" inert="" style="aspect-ratio:\d+ \/ \d+;--scene-w:\d+px">/);
  assert.match(markup, /<iframe class="hero-window-lp" src="\/hero-window\/lp\/yossi-plumber"[^>]* loading="lazy" tabindex="-1"/);
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
  const recordText = JSON.stringify(record.collectedData) + fs.readFileSync(local('src/content/hero-product-strings-2026-11-15.json'), 'utf8')
    + fs.readFileSync(local('src/content/hero-motion-strings-2026-11-15.json'), 'utf8')
    // The results-page query: two approved chips joined by a space (built in code, never typed).
    + JSON.stringify([2, 1].map((i) => motionStrings.steps[i].chips[motionStrings.steps[i].answer]).join(' '));
  const adSource = fs.readFileSync(local('src/components/google-ads/GoogleAdPreview.tsx'), 'utf8');
  const nodes = [...markup.matchAll(/>([^<]+)</g)].map((m) => m[1].trim()).filter((t) => /[\u0590-\u05FF]/.test(t));
  assert.ok(nodes.length >= 4, `Hebrew text nodes: ${nodes.length}`);
  for (const node of nodes) {
    for (const part of node.split(' | ')) assert.ok(recordText.includes(part) || adSource.includes(`>${part}<`), `unsourced Hebrew: ${part}`);
  }
});

test('the ad keeps Google limits and shows no rating, review count or result', () => {
  assert.equal(heroWindow.HERO_AD.displayUrl, 'yossi-plumber.wao.co.il');
  assert.doesNotMatch(markup, /my-business|0500000000|050-0000000/);
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
  // No phone digits anywhere in the window (Adam 2026-11-15); the call button keeps its label.
  assert.doesNotMatch(html.replace(/[\s-]/g, ''), /0500000000|500000000/);
  assert.doesNotMatch(html, /href="tel:/);
  assert.match(html, /data-hero-call><svg[^]*?<\/svg><span>[^<]+<\/span><\/a>/);
  assert.match(html, /<div class="hw-owner"><picture><source type="image\/avif" srcset="\/images\/home\/hero-owner\.avif"><img [^>]*width="360" height="480"/);
  assert.doesNotMatch(html, /data-section="trust"|class="trust"/);
  assert.doesNotMatch(textOf(html.slice(html.indexOf('<body'))), /\u2605|\d\.\d/);
  assert.ok(html.includes('/hero-window/fonts/heebo-hebrew.woff2') && !html.includes('/assets/fonts/'));
  assert.ok(html.trimEnd().endsWith('</main></body></html>'));
});

test('motion strings are the waocopy strings byte-exact, chips in the spec display order, wired into the markup', () => {
  const src = (f) => { const raw = fs.readFileSync(local(f), 'utf8'); return JSON.parse(raw.slice(raw.indexOf('{'))); };
  const a = src('docs/copy/hero-motion-strings-2026-11-15.waocopy.json');
  const b = src('docs/copy/hero-motion-skip-label-2026-11-15.waocopy.json');
  const m = motionStrings;
  assert.deepEqual(m.steps.map((s) => s.question), [a.q1, a.q2, a.q3]);
  assert.deepEqual(m.steps[0].chips, a.q1_chips);
  assert.deepEqual(m.steps[1].chips, [a.q2_chips[1], a.q2_chips[0], a.q2_chips[2]]);
  assert.deepEqual(m.steps[2].chips, [a.q3_chips[1], a.q3_chips[2], a.q3_chips[0]]);
  // The tapped chips are the resting frame's trade, area and service, landing top / middle / bottom.
  assert.deepEqual(m.steps.map((s) => s.answer), [0, 1, 2]);
  assert.deepEqual(m.steps.map((s) => s.chips[s.answer]), [a.q1_chips[0], a.q2_chips[0], a.q3_chips[0]]);
  for (const k of ['ready', 'static_cue', 'replay_label', 'sr_description']) assert.equal(m[k], a[k], k);
  assert.equal(m.skip_label, b.skip_label);
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  for (const step of m.steps) {
    assert.ok(markup.includes(`>${step.question}<`));
    for (const chip of step.chips) assert.ok(markup.includes(`>${chip}<`), chip);
    assert.ok(markup.includes(`data-label="${esc(step.chips[step.answer])}"`));
  }
  assert.ok(markup.includes(`>${m.ready}<`));
  assert.ok(markup.includes(`<p class="sr-only">${m.sr_description}</p>`));
  assert.ok(markup.includes(`<p class="cue" aria-hidden="true">${m.static_cue}</p>`));
  assert.ok(markup.includes(`aria-label="${m.replay_label}"`) && markup.includes(`data-skip="${m.skip_label}"`));
});

test('results-page beat: query = tapped service chip + space + tapped area chip; his ad is the only result', () => {
  const m = motionStrings;
  const pick = (i) => m.steps[i].chips[m.steps[i].answer];
  const serp = windowMarkup.slice(windowMarkup.indexOf('<div class="serp">'), windowMarkup.indexOf('<div class="chat">'));
  assert.ok(serp.length > 0);
  assert.ok(serp.includes(`<span>${pick(2)} ${pick(1)}</span>`), 'query is the concatenation of two approved strings');
  // Exactly one result card (the ad), no organic results, no logo image.
  assert.equal((serp.match(/border:1px solid #DFE1E5/g) ?? []).length, 1);
  assert.doesNotMatch(serp, /<img\b/);
  for (const h of heroWindow.HERO_AD.headlines) assert.ok(serp.includes(h));
});

test('motion layers sit inside the window, the button and captions outside the aria-hidden scene', () => {
  const scene = markup.slice(0, markup.lastIndexOf('<button'));
  for (const cls of ['chat', 'hlAd', 'hlLp', 'ring', 'ptr', 'serp']) assert.match(windowMarkup, new RegExp(`class="[^"]*\\b${cls}\\b`), cls);
  assert.match(windowMarkup, /<div class="hero-window-lpwrap lp"[^>]*><iframe class="hero-window-lp"/);
  assert.ok(scene.includes('data-hm-pointer=""'));
  assert.doesNotMatch(markup.slice(markup.lastIndexOf('<button')), /aria-hidden="true" inert/);
});

test('no phone digits, tel: links, ratings or demo labels in the window', () => {
  const visible = textOf(windowMarkup);
  assert.doesNotMatch(visible, /\d/, 'no digits at all in the window text');
  assert.doesNotMatch(windowMarkup, /href="tel:|0500000000|050-0000000/);
  assert.doesNotMatch(visible, /\u2605/);
  assert.doesNotMatch(visible.toLowerCase(), /demo|example|placeholder|lorem/);
});

test('motion CSS: generated file in sync, transform/opacity only, every layer 9600 ms fill both, reduced motion gated', async () => {
  const { buildCss, TIMELINE, DURATION_MS, POINTER_START, pointerTimeline } = await import(local('scripts/build-hero-motion-css.mjs'));
  const css = fs.readFileSync(local('src/components/home/heroMotion.module.css'), 'utf8');
  assert.equal(css, buildCss(), 'run node scripts/build-hero-motion-css.mjs');
  assert.equal(DURATION_MS, 9600);
  for (const [name, [prop]] of Object.entries(TIMELINE)) assert.ok(prop === 'transform' || prop === 'opacity', name);
  for (const kf of css.match(/@keyframes [^{]+\{(?:[^{}]*\{[^}]*\})*\}/g)) {
    const props = [...kf.matchAll(/[{;]([a-z-]+):/g)].map((x) => x[1]).filter((p) => p !== 'animation-timing-function');
    for (const p of props) assert.ok(p === 'transform' || p === 'opacity', `${kf.slice(0, 40)}: ${p}`);
    assert.match(kf, /\{0%\{/);
    assert.match(kf, /100%\{[^}]*\}\}$/, 'explicit 100% stop (no drift back to the rest value)');
  }
  const gated = css.slice(css.indexOf('@media (prefers-reduced-motion:no-preference){'));
  const animations = [...css.matchAll(/animation:([^;}]+)/g)].map((x) => x[1]);
  assert.ok(animations.length >= 20);
  for (const a of animations) for (const part of a.split(',')) assert.match(part.trim(), /^\w+ 9600ms linear both$/);
  assert.ok(css.indexOf('animation:') > css.indexOf('@media (prefers-reduced-motion:no-preference){') && gated.length > 0);
  assert.match(css, new RegExp(`\\.ptr\\{[^}]*transform:translateX\\(${POINTER_START}px\\)`), 'pointer rests at its first stop (CLS 0)');
  for (const e of showcasesData.entries) {
    const t = pointerTimeline(e.geometry);
    assert.equal(t.X[1][0][1], `translateX(${POINTER_START}px)`);
    assert.equal(t.X[1].at(-1)[1], `translateX(${e.geometry.callTarget[0]}px)`);
  }
  assert.doesNotMatch(css, /box-shadow[^;}]*;?[^}]*\}[^@]*@keyframes/, 'no box-shadow animated');
});

// --- showcase entries (Task C): schema, Worker-only live pages, per-entry guards -------------------------------

const chipsOf = () => motionStrings.steps.map((s) => s.chips);
const validEntry = () => structuredClone(showcasesData.entries[0]);
const validate = (entries, labels = {}) => showcases.validateShowcases({ entries }, chipsOf(), labels, showcases.SITE_RECORD_SLUGS);

test('showcase schema: today exactly one valid entry = the current window (fictional, site-record)', () => {
  assert.equal(showcases.SHOWCASES.length, 1);
  const [e] = showcases.SHOWCASES;
  assert.equal(e.consent.type, 'fictional');
  assert.equal(e.landingPage.source, 'site-record');
  assert.equal(showcases.SHOWCASE_LOOP, false);
  // Answers are the approved tapped chips, the query their concatenation; the ad is the approved hero ad.
  assert.deepEqual([e.answers.trade, e.answers.area, e.answers.service], motionStrings.steps.map((s) => s.chips[s.answer]));
  assert.equal(showcases.showcaseQuery(e), `${e.answers.service} ${e.answers.area}`);
  const product = json('src/content/hero-product-strings-2026-11-15.json').hero_ad;
  assert.deepEqual([...e.ad.headlines, e.ad.description], [...product.headlines, product.description]);
  assert.deepEqual(showcases.showcaseSteps(e).map((s) => s.answer), [0, 1, 2]);
});

test('showcase schema rejects bad entries', () => {
  const bad = (mutate, re) => { const e = validEntry(); mutate(e); assert.throws(() => validate([e]), re); };
  assert.doesNotThrow(() => validate([validEntry()]));
  bad((e) => { e.id = 'Bad Id'; }, /id must be a lowercase slug/);
  bad((e) => { e.consent = { type: 'client' }; }, /client consent needs a recorded reference/);
  bad((e) => { e.consent = { type: 'maybe' }; }, /consent.type/);
  bad((e) => { e.answers.area = e.answers.trade; }, /answers.area is not one of its chips/);
  bad((e) => { e.ad.headlines[0] = 'x'.repeat(31); }, /headlines\[0\]/);
  bad((e) => { e.ad.headlines = e.ad.headlines.slice(0, 2); }, /exactly 3 headlines/);
  bad((e) => { e.ad.description = 'x'.repeat(91); }, /description/);
  bad((e) => { e.ad.description = 'rated 4.9 by everyone'; }, /rating or a result/);
  bad((e) => { e.ad.displayHost = 'demo-site.wao.co.il'; }, /displayHost/);
  bad((e) => { e.landingPage = { source: 'site-record', slug: 'nobody', path: '/' }; }, /no stored site record/);
  bad((e) => { e.landingPage = { source: 'live-url', url: 'https://evil.example.org/' }; e.tabTitle = 'x'; }, /wao-sites tenant host/);
  bad((e) => { e.landingPage = { source: 'live-url', url: 'https://client-a.wao.co.il/' }; }, /tabTitle/);
  bad((e) => { e.geometry.callTarget = [2000, 10]; }, /park \/ callTarget/);
  bad((e) => { e.chips = { trade: ['a', 'b'], area: ['a', 'b', 'c'], service: ['a', 'b', 'c'] }; }, /chips.trade/);
  const second = { ...validEntry(), id: 'second-entry' };
  assert.throws(() => validate([validEntry(), second]), /NEEDED string pause_label/);
  assert.throws(() => validate([validEntry(), validEntry()], { pause_label: 'p', play_label: 'q' }), /duplicate id/);
  assert.doesNotThrow(() => validate([validEntry(), second], { pause_label: 'p', play_label: 'q' }));
});

test('live pages: only https://<tenant>.wao.co.il on our Worker, never a third-party or infra host', () => {
  for (const ok of ['https://client-a.wao.co.il/', 'https://a.wao.co.il/services/x']) assert.doesNotThrow(() => showcases.assertWorkerUrl(ok));
  for (const no of ['http://client-a.wao.co.il/', 'https://www.wao.co.il/', 'https://wao.co.il/', 'https://mail.wao.co.il/', 'https://sites.wao.co.il/',
    'https://a.b.wao.co.il/', 'https://client-a.wao.co.il.evil.com/', 'https://client-a.wao.co.il:8443/', 'https://u:p@client-a.wao.co.il/', 'https://evil.com/']) {
    assert.throws(() => showcases.assertWorkerUrl(no), /tenant host|not a URL/, no);
  }
});

const FIXTURE = (hero, rest = '') => `<!doctype html><html><head><meta charset="utf-8"><link rel="canonical" href="https://client-a.wao.co.il/"><meta property="og:url" content="x"><meta name="robots" content="index, follow"><script>track()</script></head><body><main><section class="hero"><h1>Leak detection</h1>${hero}</section>${rest}</main><script src="/a.js"></script></body></html>`;

test('window guards (every entry): scripts, canonical, OG and index tags go, noindex added, cut below the hero', () => {
  const out = landing.guardWindowHtml(FIXTURE('<a class="btn" href="tel:0501234567"><bdi dir="ltr" class="num">050-123-4567</bdi></a>', '<section data-section="trust"><span>4.9</span></section>'));
  assert.doesNotMatch(out, /<script|rel="canonical"|og:url|content="index/);
  assert.match(out, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(out, /data-section="trust"|tel:|050-123-4567/);
  assert.ok(out.endsWith('</section></main></body></html>'));
});

test('window guards fail closed on ratings, review markup, phone digits and test domains', () => {
  assert.throws(() => landing.guardWindowHtml(FIXTURE('<p>★★★★★</p>')), /rating or review/);
  assert.throws(() => landing.guardWindowHtml(FIXTURE('<p>4.9 stars</p>')), /rating or review/);
  assert.throws(() => landing.guardWindowHtml(FIXTURE('<div itemprop="review">x</div>')), /rating or review/);
  assert.throws(() => landing.guardWindowHtml(FIXTURE('<p>call 0501234567 now</p>')), /phone-like digits/);
  assert.throws(() => landing.guardWindowHtml(FIXTURE('<a href="https://demo-plumber.invalid/">x</a>')), /test\/demo domain/);
  assert.throws(() => landing.guardWindowHtml(FIXTURE('<img src="http://localhost:3000/x.png">')), /test\/demo domain/);
});

test('live-url pages are fetched from the Worker host only and pass the same guards', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => { calls.push([url, init]); return new Response(FIXTURE('<p>ok</p>'), { headers: { 'content-type': 'text/html; charset=utf-8' } }); };
  await assert.rejects(landing.liveUrlHtml('https://evil.example.org/', fakeFetch), /tenant host/);
  assert.equal(calls.length, 0, 'a third-party URL is never fetched');
  const html = await landing.liveUrlHtml('https://client-a.wao.co.il/services/x', fakeFetch);
  assert.equal(calls[0][0], 'https://client-a.wao.co.il/services/x');
  assert.equal(calls[0][1].redirect, 'error', 'no redirect off the Worker host');
  assert.match(html, /<base href="https:\/\/client-a\.wao\.co\.il\/">/);
  assert.doesNotMatch(html, /<script/);
  const notHtml = async () => new Response('{}', { headers: { 'content-type': 'application/json' } });
  await assert.rejects(landing.liveUrlHtml('https://client-a.wao.co.il/', notHtml), /not HTML/);
  const rated = async () => new Response(FIXTURE('<p>★ 4.9</p>'), { headers: { 'content-type': 'text/html' } });
  await assert.rejects(landing.liveUrlHtml('https://client-a.wao.co.il/', rated), /rating or review/);
});

test('every showcase entry builds its window page through the guards; the scene renders one layer per entry', async () => {
  for (const e of showcases.SHOWCASES) {
    const html = await landing.showcaseLandingHtml(e);
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
    assert.doesNotMatch(html, /href="tel:|<script/);
    assert.ok(markup.includes(`/hero-window/lp/${e.id}`));
  }
  assert.equal((markup.match(/data-hm-entry=""/g) ?? []).length, showcases.SHOWCASES.length);
  assert.equal((markup.match(/data-active=""/g) ?? []).length, 1, 'only the first entry is active in the SSR frame');
  assert.doesNotMatch(markup, /data-loop/, 'one entry: loop mode dormant');
  assert.match(fs.readFileSync(local('src/app/hero-window/lp/[id]/route.ts'), 'utf8'), /dynamicParams = false/);
});
