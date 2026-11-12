// HTML pages screenshotted by headless Chrome: caption cards (transparent),
// placeholder visuals and the end screen. All Hebrew is rendered by the browser
// with dir="rtl"; ffmpeg never draws text. No Hebrew literals here.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { baseDir, cardHtml, escapeHtml, isolateLtr } from "./captions.mjs";
import { PENDING_RE } from "./spec.mjs";

/** @font-face rules for the site fonts, pointed at the local files. Empty string when unavailable. */
export function fontFaceCss(brand, root) {
  const css = path.resolve(root, brand.fontCss ?? "");
  const dir = path.resolve(root, brand.fontDir ?? "");
  if (!brand.fontCss || !existsSync(css) || !existsSync(dir)) return "";
  return readFileSync(css, "utf8").replaceAll('url("/offline-fonts/', `url("${pathToFileURL(dir).href}/`);
}

function shell({ aspect, brand, fonts, transparent, css, body }) {
  const { width: w, height: h, safe: s } = aspect;
  return `<!doctype html>
<html lang="he">
<head>
<meta charset="utf-8">
<style>
${fonts}
html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: ${transparent ? "transparent" : brand.bg}; }
body { font-family: ${brand.fontFamily}, ${brand.fontFallback}; color: ${brand.text}; -webkit-font-smoothing: antialiased; }
.safe { position: absolute; top: ${s.top}px; right: ${s.right}px; bottom: ${s.bottom}px; left: ${s.left}px; display: flex; }
.u { white-space: nowrap; unicode-bidi: isolate; }
${css}
</style>
</head>
<body>
${body}
</body>
</html>
`;
}

/** One caption card, full frame, transparent, anchored to the bottom of the safe zone. */
export function captionPage({ aspect, brand, fonts, card }) {
  const css = `.safe { align-items: flex-end; justify-content: center; }
.cap { box-sizing: border-box; max-width: 100%; padding: 0.3em 0.6em 0.36em; border-radius: 0.32em; background: rgba(13, 17, 23, 0.88);
  font-size: ${aspect.captionFontPx}px; font-weight: 700; line-height: 1.28; text-align: center; text-wrap: balance; }`;
  return shell({ aspect, brand, fonts, transparent: true, css, body: `<div class="safe"><div class="cap" id="cap" dir="${baseDir(card.text)}">${cardHtml(card)}</div></div>` });
}

/** Stand-in for art that does not exist yet: brand colour + a small debug label. */
export function placeholderPage({ aspect, brand, fonts, beat }) {
  const css = `.safe { align-items: flex-start; justify-content: center; }
.dbg { max-width: 92%; padding: 18px 22px; border: 2px dashed ${brand.muted}; border-radius: 12px; color: ${brand.muted};
  font: 400 26px/1.4 'DejaVu Sans Mono', monospace; text-align: left; }
.dbg b { color: ${brand.accent}; font-weight: 700; }`;
  const label = beat.screen ? escapeHtml(beat.screen) : "(no visual description)";
  return shell({
    aspect,
    brand,
    fonts,
    transparent: false,
    css,
    body: `<div class="safe"><div class="dbg" dir="ltr"><b>PLACEHOLDER VISUAL</b> &middot; beat ${beat.index + 1} &middot; ${escapeHtml(beat.visual.type)}<br><bdi>${label}</bdi></div></div>`,
  });
}

/** End screen: wordmark, product, price (from the constant), stamp, CTA, URL. */
export function endScreenPage({ aspect, brand, fonts, endScreen }) {
  const { width: w, height: h, safe: s } = aspect;
  const u = Math.min(w - s.left - s.right, h - s.top - s.bottom) / 100;
  const px = (k) => `${Math.round(k * u)}px`;
  const pend = (t) => (PENDING_RE.test(t) ? " pending" : "");
  const css = `.safe { flex-direction: column; align-items: center; justify-content: center; gap: ${px(3.4)}; text-align: center; }
.fit { max-width: 100%; white-space: nowrap; }
.mark { font-size: ${px(7)}; font-weight: 700; letter-spacing: 0.08em; color: ${brand.accent}; }
.product { font-size: ${px(11)}; font-weight: 700; line-height: 1.15; }
.price { font-size: ${px(10)}; font-weight: 700; line-height: 1.15; color: ${brand.accent}; }
.stamp { font-size: ${px(4.6)}; font-weight: 700; padding: 0.35em 0.9em; border: ${px(0.5)} solid ${brand.accent}; border-radius: 0.5em; transform: rotate(-4deg); }
.cta { font-size: ${px(6)}; font-weight: 700; padding: 0.4em 1.2em; border-radius: 999px; background: ${brand.accent}; color: ${brand.bg}; }
.url { font-size: ${px(4.6)}; color: ${brand.muted}; }
.pending { font-family: 'DejaVu Sans Mono', monospace; color: #FF4FD8; background: transparent; border: ${px(0.5)} dashed #FF4FD8; border-radius: 0; transform: none; }`;
  const row = (cls, text) => `<div class="fit ${cls}${pend(text)}" dir="${baseDir(text)}">${isolateLtr(text)}</div>`;
  const body = `<div class="safe" id="end">
<div class="fit mark" dir="ltr">${escapeHtml(brand.wordmark)}</div>
${row("product", endScreen.productName)}
<div class="fit price" id="price" dir="${baseDir(endScreen.priceLine)}"><span class="u">${isolateLtr(endScreen.priceLine)}</span></div>
${row("stamp", endScreen.stampText)}
${row("cta", endScreen.ctaText)}
<div class="fit url" dir="ltr">${escapeHtml(endScreen.url)}</div>
</div>
<script>
for (const el of document.querySelectorAll('.fit')) {
  const max = el.parentElement.clientWidth;
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.getBoundingClientRect().width > max && size > 12) { size *= 0.95; el.style.fontSize = size + 'px'; }
}
</script>`;
  return shell({ aspect, brand, fonts, transparent: false, css, body });
}

/** Review sheet: caption cards that are not burned in (e.g. the end beat), stacked on the brand colour. */
export function proofPage({ aspect, brand, fonts, cards }) {
  const css = `.safe { flex-direction: column; align-items: center; justify-content: center; gap: 40px; }
.cap { box-sizing: border-box; max-width: 100%; padding: 0.3em 0.6em 0.36em; border-radius: 0.32em; background: rgba(255, 255, 255, 0.08);
  font-size: ${aspect.captionFontPx}px; font-weight: 700; line-height: 1.28; text-align: center; text-wrap: balance; }`;
  const body = `<div class="safe">${cards.map((c) => `<div class="cap" dir="${baseDir(c.text)}">${cardHtml(c)}</div>`).join("\n")}</div>`;
  return shell({ aspect, brand, fonts, transparent: false, css, body });
}
