#!/usr/bin/env node
// Generates src/components/home/heroMotion.module.css: the homepage hero animation
// (docs/specs/hero-motion-spec-maya-2026-11-15.md). The timeline is data below, in ms; every layer runs 9600 ms with
// fill-mode both, so keyframe % = ms / 96. Transform and opacity only. Re-run after editing: node scripts/build-hero-motion-css.mjs
//
// Coordinates are the 960x605 virtual window (origin top-left, tab bar 26). Measured 2026-11-15 on the e3a9a3e crop
// (rendered window scale 0.395 at 1440 px, 0.266 at 390 px): chip font 42 virtual = 16.6 / 11.2 px rendered, so no
// phone raise is needed (spec: raise only if the phone scale < 0.24). Pointer heights re-scaled to keep the spec's
// rendered sizes: 38 virtual desktop (15 px), 49 virtual phone (13 px).
// Text rects (window coords) the pointer and highlights are fitted to, measured from the rendered window:
//   ad headline x 246-921, y 82-107; ad description x 393-921, y 113-129;
//   LP h1 line 1 x 265-928, y 345-396; line 2 x 746-928, y 396-447; LP subline x 572-928, y 459-486;
//   results-page ad (scale 2, card-local px): headline lines top 42 / 67, 25 tall, 366 / 304 wide, right 17;
//   card 170-479 window y, so the pointer parks under it at PARK (empty fade, and empty green once the LP is in);
//   call button x 744.5-928, y 511-563 (its --cta #D4842A, radius 8 = the glow ring) (icon 884-904, label 769-876); LP text below it from y 575.
// HEBREW-SAFETY: zero Hebrew bytes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/components/home/heroMotion.module.css');
export const DURATION_MS = 9600;
const E = 'cubic-bezier(.22,1,.36,1)'; // entrances
const P = 'cubic-bezier(.65,0,.35,1)'; // pointer X, collapse
const Y = 'cubic-bezier(.5,0,.25,1)';  // pointer Y (differs from X, so hops arc)

/** Where the pointer waits from the results page until the call-button hop (window coords). */
export const PARK = [300, 512];

/** Click times (ms): the three chips, then the call button. */
export const CLICKS = [900, 2100, 3300, 8200];

const ty = (v) => `translateY(${v}px)`;
const tx = (v) => `translateX(${v}px)`;
const sc = (v) => `scale(${v})`;
const sx = (v) => `scaleX(${v})`;

/** name -> [property, [[ms, value, easing to the next stop?], ...]] */
export const TIMELINE = {
  chatO: ['opacity', [[0, 0, E], [150, 1], [4365, 1, P], [4500, 0]]],
  chatT: ['transform', [[0, sc(1)], [4050, sc(1), P], [4500, sc(0.09)]]],
  s1O: ['opacity', [[0, 1], [1150, 1], [1300, 0]]],
  s2O: ['opacity', [[0, 0], [1300, 0, E], [1550, 1], [2350, 1], [2500, 0]]],
  s2T: ['transform', [[0, ty(12)], [1300, ty(12), E], [1550, ty(0)]]],
  s3O: ['opacity', [[0, 0], [2500, 0, E], [2750, 1], [3450, 1], [3600, 0]]],
  s3T: ['transform', [[0, ty(12)], [2500, ty(12), E], [2750, ty(0)]]],
  pick1: ['opacity', [[0, 0], [900, 0, E], [1100, 1]]],
  pick2: ['opacity', [[0, 0], [2100, 0, E], [2300, 1]]],
  pick3: ['opacity', [[0, 0], [3300, 0, E], [3500, 1]]],
  dim1: ['opacity', [[0, 1], [900, 1, E], [1050, 0.3]]],
  dim2: ['opacity', [[0, 1], [2100, 1, E], [2250, 0.3]]],
  dim3: ['opacity', [[0, 1], [3300, 1, E], [3450, 0.3]]],
  readyO: ['opacity', [[0, 0], [3700, 0, E], [3950, 1]]],
  readyT: ['transform', [[0, sc(0.9)], [3700, sc(0.9), E], [3950, sc(1)]]],
  // The resting layers hide once the panel is opaque (150 ms), so the collapse reveals an empty window.
  cornerO: ['opacity', [[0, 1], [150, 1], [160, 0], [4300, 0, E], [4500, 1]]],
  // Google results beat (Eitan 2026-11-15): the results page is under the chat as it collapses (search box with the
  // query already in it), his ad rises in as the first result, then the page fades off the resting ad + LP.
  serpO: ['opacity', [[0, 0], [4040, 0], [4050, 1], [6700, 1, E], [7000, 0]]],
  adO: ['opacity', [[0, 0], [4500, 0, E], [5000, 1]]],
  adT: ['transform', [[0, ty(24)], [4500, ty(24), E], [5000, ty(0)]]],
  restAdO: ['opacity', [[0, 1], [150, 1], [160, 0], [6690, 0], [6700, 1]]],
  hlAdO: ['opacity', [[0, 1], [6500, 1, E], [6700, 0]]],
  hlAdT: ['transform', [[0, sx(0)], [4900, sx(0), E], [5500, sx(1)]]],
  lpO: ['opacity', [[0, 1], [150, 1], [160, 0], [6700, 0, E], [7300, 1]]],
  lpT: ['transform', [[0, ty(0)], [150, ty(0)], [160, ty(60)], [6700, ty(60), E], [7300, ty(0)]]],
  hlLpO: ['opacity', [[0, 1], [8900, 1, E], [9100, 0]]],
  hlLpT: ['transform', [[0, sx(0)], [7400, sx(0), E], [7900, sx(1)]]],
  ringO: ['opacity', [[0, 0], [8195, 0], [8200, 0.6, E], [8700, 0]]],
  ringT: ['transform', [[0, sc(1)], [8200, sc(1), E], [8700, sc(1.35)]]],
  // Pointer: enters from below the window's bottom-left, three hops to mid-chip empty fill (text is right-aligned).
  // During the collapse (before the ad shows) it drifts to the empty area under the results-page ad, stays there while
  // the LP slides in (that spot is empty green under the LP subline), then glides right along the gap under the
  // subline to the call button's left padding, so the arrow never covers text.
  ptrX: ['transform', [[0, tx(140)], [400, tx(140), P], [900, tx(430)], [1650, tx(430), P], [2100, tx(470)], [2850, tx(470), P],
    [3300, tx(410)], [4100, tx(410), P], [4600, tx(PARK[0])], [7500, tx(PARK[0]), P], [8200, tx(747)]]],
  ptrY: ['transform', [[0, ty(660)], [400, ty(660), Y], [900, ty(242)], [1650, ty(242), Y], [2100, ty(344)], [2850, ty(344), Y],
    [3300, ty(446)], [4100, ty(446), Y], [4600, ty(PARK[1])], [7500, ty(PARK[1]), Y], [8200, ty(514)]]],
  ptrO: ['opacity', [[0, 1], [9000, 1, E], [9300, 0]]],
  press: ['transform', [[0, sc(1)], ...CLICKS.flatMap((c) => [[c, sc(1)], [c + 45, sc(0.92)], [c + 90, sc(1)]])]],
  clickO: ['opacity', [[0, 0], ...CLICKS.flatMap((c) => [[c - 5, 0], [c, 0.5, E], [c + 350, 0]])]],
  clickT: ['transform', [[0, sc(0.4)], ...CLICKS.flatMap((c) => [[c, sc(0.4), E], [c + 350, sc(1.6)], [c + 355, sc(0.4)]])]],
  icoOut: ['opacity', [[0, 1], [9000, 1, E], [9300, 0]]],
  icoIn: ['opacity', [[0, 0], [9000, 0, E], [9300, 1]]],
};

/** Layer selector -> animations it runs while playing. */
const LAYERS = [
  ['.chat', ['chatO', 'chatT'], 'transform,opacity'],
  ['.s1', ['s1O']],
  ['.s2', ['s2O', 's2T']],
  ['.s3', ['s3O', 's3T']],
  ['.s1 .pick::before,.s1 .pick::after', ['pick1']],
  ['.s2 .pick::before,.s2 .pick::after', ['pick2']],
  ['.s3 .pick::before,.s3 .pick::after', ['pick3']],
  ['.s1 .dim', ['dim1']],
  ['.s2 .dim', ['dim2']],
  ['.s3 .dim', ['dim3']],
  ['.ready', ['readyO', 'readyT']],
  ['.corner', ['cornerO']],
  ['.serp', ['serpO'], 'opacity'],
  ['.serpAd', ['adO', 'adT'], 'transform,opacity'],
  ['.ad', ['restAdO']],
  ['.hlAd', ['hlAdO', 'hlAdT']],
  ['.lp', ['lpO', 'lpT'], 'transform,opacity'],
  ['.hlLp', ['hlLpO', 'hlLpT']],
  ['.ring', ['ringO', 'ringT']],
  ['.ptr', ['ptrX', 'ptrO'], 'transform,opacity'],
  ['.ptrY', ['ptrY'], 'transform'],
  ['.press', ['press']],
  ['.click', ['clickO', 'clickT']],
  ['.icoSkip', ['icoOut']],
  ['.icoReplay', ['icoIn']],
];

/** 2 decimals = 0.96 ms steps: keeps the CSS under 3 kB gz. */
const pct = (ms) => `${+((ms / DURATION_MS) * 100).toFixed(2)}%`;

function keyframes(name, [prop, stops]) {
  let last = -1;
  // Hold the last value to 100%: an implicit 100% keyframe would interpolate back to the layer's base (rest) value.
  const tail = stops.at(-1);
  if (tail[0] < DURATION_MS) stops = [...stops, [DURATION_MS, tail[1]]];
  const body = stops.map(([ms, value, ease]) => {
    if (!(ms > last) || ms > DURATION_MS) throw new Error(`${name}: stops must increase within ${DURATION_MS} ms (${ms})`);
    last = ms;
    return `${pct(ms)}{${prop}:${value}${ease ? `;animation-timing-function:${ease}` : ''}}`;
  }).join('');
  return `@keyframes ${name}{${body}}`;
}

/** Results-page ad: GoogleAdPreview at SERP_SCALE (its rem fonts), full results width 860 virtual. */
const SERP_SCALE = 2;
const STATIC_VARS = { SERP_SCALE, SERP_AD_W: +(860 / SERP_SCALE).toFixed(2), SERP_AD_TOP: 144 };
const STATIC = `/* GENERATED by scripts/build-hero-motion-css.mjs. Do not edit by hand; re-run the script. */
/* Homepage hero motion (docs/specs/hero-motion-spec-maya-2026-11-15.md). Virtual px inside the 960x605 window. */
.wrap{position:relative}
.ad,.lp{position:relative}
.lp{flex:none}
.chat{position:absolute;left:0;top:26px;width:960px;height:579px;opacity:0;contain:layout paint;transform-origin:45px 534px;background:rgba(13,15,21,.96);color:#eee9e2;direction:rtl;font-family:var(--font-rubik),sans-serif}
.step{position:absolute;inset:0}
.s2,.s3{opacity:0}
.q{position:absolute;right:160px;left:40px;bottom:417px;display:flex;align-items:flex-end;gap:20px}
.bubble{margin:0;max-width:660px;padding:16px 28px 18px;border:2px solid rgba(74,227,181,.22);border-radius:28px;background:linear-gradient(135deg,rgba(74,227,181,.08),rgba(0,195,255,.08));font-size:50px;font-weight:700;line-height:1.2}
.avatar{flex:none;width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#4AE3B5,#00C3FF)}
.chips{position:absolute;right:160px;top:174px;width:640px;display:grid;gap:18px}
.chip{position:relative;display:flex;align-items:center;height:84px;padding:0 28px;border:2px solid rgba(74,227,181,.22);border-radius:20px;background:rgba(74,227,181,.06);font-size:42px;font-weight:500;line-height:1;white-space:nowrap}
.pick::before,.pick::after{position:absolute;inset:-2px;border-radius:20px;opacity:0}
.pick::before{content:"";background:#36ddb5}
.pick::after{content:attr(data-label);display:flex;align-items:center;padding:0 30px;color:#101416}
.ready{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:24px;opacity:0;color:#fff;font-size:56px;font-weight:700}
.ready svg{width:76px;height:76px}
.hlAd,.hlLp,.ring,.ptr,.click{position:absolute;opacity:0;pointer-events:none}
.hlAd,.hlLp{transform-origin:right;border-radius:4px;background:rgba(54,221,181,.32)}
.serp{position:absolute;left:0;top:26px;width:960px;height:579px;opacity:0;contain:layout paint;background:#fff;direction:rtl}
.search{position:absolute;left:50px;right:50px;top:16px;height:64px;display:flex;align-items:center;gap:18px;padding:0 26px;border:2px solid #dfe1e5;border-radius:32px;box-shadow:0 2px 8px rgba(32,33,36,.16);color:#202124;font:28px/1 Arial,sans-serif;white-space:nowrap}
.search svg{flex:none;width:30px;height:30px;fill:none;stroke:#5f6368;stroke-width:2.4;stroke-linecap:round}
.serpAd{position:absolute;right:50px;top:SERP_AD_TOPpx;width:SERP_AD_Wpx}
.serpScale{position:relative;transform:scale(SERP_SCALE);transform-origin:top right}
.fade{height:56px;background:linear-gradient(#f1f3f4,#fff)}
.hlAd{right:16px;height:25px}
.hlAd1{top:42px;width:368px}
.hlAd2{top:67px;width:306px}
.hlLp{height:51px}
.hlLp1{left:262px;top:187px;width:669px}
.hlLp2{left:743px;top:238px;width:188px}
.ring{left:744.5px;top:353.3px;width:183.5px;height:52px;border:5px solid #D4842A;border-radius:8px}
/* The resting transform = the first ptrX stop: starting the animation from transform:none inside the matrix3d
   parent made Chrome report a ~0.00003 layout shift on the window's static siblings (tab bar, corner chip). */
.ptr{left:0;top:0;z-index:2;transform:translateX(140px)}
.ptrY{display:block}
.press{display:block;transform-origin:0 0}
.press svg{display:block;width:25.33px;height:38px;overflow:visible}
@container (max-width:480px){.press svg{width:32.67px;height:49px}}
.click{left:-18px;top:-18px;width:36px;height:36px;border:4px solid #fff;border-radius:50%}
.btn{position:absolute;bottom:12px;inset-inline-end:12px;z-index:1;display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:rgba(13,15,21,.85);color:#4AE3B5;cursor:pointer}
.btn[hidden]{display:none}
.btn:focus-visible{outline:3px solid #fff;outline-offset:2px;box-shadow:0 0 0 2px #0d0f15}
.btn svg{grid-area:1/1;width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.icoSkip{opacity:0}
.cue{display:none;margin:10px 0 0;color:rgba(238,233,226,.78);font-size:.875rem;text-align:center}
@media (prefers-reduced-motion:reduce){.cue{display:block}}
`;

export function buildCss() {
  const used = new Set();
  const rules = LAYERS.map(([sel, names, willChange]) => {
    names.forEach((n) => { if (!TIMELINE[n]) throw new Error(`unknown animation ${n}`); used.add(n); });
    const scoped = sel.split(',').map((s) => `.wrap[data-motion=playing] ${s}`).join(',');
    return `${scoped}{animation:${names.map((n) => `${n} ${DURATION_MS}ms linear both`).join(',')}${willChange ? `;will-change:${willChange}` : ''}}`;
  });
  for (const n of Object.keys(TIMELINE)) if (!used.has(n)) throw new Error(`unused animation ${n}`);
  const frames = Object.entries(TIMELINE).map(([n, t]) => keyframes(n, t));
  const stat = STATIC.replace(/SERP_SCALE|SERP_AD_W|SERP_AD_TOP/g, (k) => String(STATIC_VARS[k]));
  return `${stat}@media (prefers-reduced-motion:no-preference){\n${rules.join('\n')}\n}\n${frames.join('\n')}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUT, buildCss());
  console.log(`wrote ${path.relative(process.cwd(), OUT)} (${fs.statSync(OUT).size} bytes)`);
}
