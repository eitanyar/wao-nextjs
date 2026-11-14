// Render HTML overlay jobs to PNG with headless Chrome (repo's puppeteer + local Rubik fonts).
// Input: jobs.json [{ name, html (body+css with /*FONTS*/), width, height, transparent }]
// Also: { captions: [{ line, text }] } -> splits with the pipeline's splitCards and renders captionPage per card.
// Output: <out>/<name>.png and <out>/measure.json (rects + textContent of [data-m] elements).
// No Hebrew literals: every string comes in through jobs.json.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const lib = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const { launchBrowser } = await lib("scripts/video/lib/render.mjs");
const { fontFaceCss, captionPage } = await lib("scripts/video/lib/pages.mjs");
const { splitCards, cardHtml } = await lib("scripts/video/lib/captions.mjs");
const { loadLexicon, DEFAULT_LEXICON_PATH } = await lib("scripts/voice/lexicon.mjs");

const [jobsFile, outDir] = process.argv.slice(2);
const spec = JSON.parse(readFileSync(jobsFile, "utf8"));
const config = JSON.parse(readFileSync(path.join(ROOT, "data/video/config.json"), "utf8"));
const brand = config.brand;
const fonts = fontFaceCss(brand, ROOT);
const aspect = config.aspects["9x16"];
mkdirSync(outDir, { recursive: true });

const browser = await launchBrowser();
const page = await browser.newPage();
const measure = {};

async function shoot(name, html, width, height, transparent) {
  const file = path.join(outDir, `${name}.html`);
  writeFileSync(file, html);
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
  measure[name] = await page.evaluate(async () => {
    await document.fonts.ready;
    if (window.__fit) window.__fit();
    const out = { fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family.replace(/["']/g, "")} ${f.weight}`), els: {} };
    for (const el of document.querySelectorAll("[data-m]")) {
      const b = el.getBoundingClientRect();
      out.els[el.dataset.m] = { left: b.left, right: b.right, top: b.top, bottom: b.bottom, text: el.textContent, dir: getComputedStyle(el).direction, font: getComputedStyle(el).fontFamily.split(",")[0] };
    }
    return out;
  });
  await page.screenshot({ path: path.join(outDir, `${name}.png`), omitBackground: transparent, clip: { x: 0, y: 0, width, height } });
}

for (const j of spec.jobs ?? []) {
  const html = `<!doctype html><html lang="he"><head><meta charset="utf-8"><style>${fonts}
html,body{margin:0;width:${j.width}px;height:${j.height}px;overflow:hidden;background:${j.transparent ? "transparent" : brand.bg}}
body{font-family:Rubik, Assistant, sans-serif;-webkit-font-smoothing:antialiased}
.u{white-space:nowrap;unicode-bidi:isolate}
${j.css ?? ""}</style></head><body>${j.body}${j.script ? `<script>${j.script}</script>` : ""}</body></html>`;
  await shoot(j.name, html, j.width, j.height, j.transparent);
}

const cards = [];
const lexicon = loadLexicon(DEFAULT_LEXICON_PATH);
for (const c of spec.captions ?? []) {
  // Optional c.groups: word counts per card (presentation only, e.g. to keep an idiom on one card). Each group goes
  // through the pipeline's splitCards on its own and must come back as one card; the groups must rejoin to the text.
  let cs;
  if (c.groups) {
    const words = c.text.split(" ");
    if (c.groups.reduce((a, b) => a + b, 0) !== words.length) throw new Error(`caption ${c.line}: groups do not cover the words`);
    cs = [];
    let w = 0, off = 0;
    for (const n of c.groups) {
      const piece = words.slice(w, w + n).join(" ");
      const one = splitCards(piece, { lexicon, min: 1, max: n });
      if (one.length !== 1 || one[0].text !== piece) throw new Error(`caption ${c.line}: group "${piece}" did not stay one card`);
      cs.push({ ...one[0], start: one[0].start + off, end: one[0].end + off });
      off += piece.length + 1; w += n;
    }
    if (cs.map((x) => x.text).join(" ") !== c.text) throw new Error(`caption ${c.line}: groups do not rejoin to the text`);
  } else cs = splitCards(c.text, { lexicon, min: config.captions.minWords, max: config.captions.maxWords });
  cs.forEach((card, k) => {
    const name = `cap_${c.line}_${k}`;
    cards.push({ name, line: c.line, index: k, text: card.text, start: card.start, end: card.end, html: cardHtml(card), _card: card });
  });
}
for (const card of cards) {
  const html = captionPage({ aspect, brand, fonts, card: card._card })
    .replace('id="cap"', 'id="cap" data-m="cap"')
    .replace("</style>", `${spec.captionCss ?? ""}\n</style>`);
  await shoot(card.name, html, aspect.width, aspect.height, true);
}
writeFileSync(path.join(outDir, "cards.json"), JSON.stringify(cards.map(({ _card, ...r }) => r), null, 1));
writeFileSync(path.join(outDir, "measure.json"), JSON.stringify(measure, null, 1));
await browser.close();
console.log(`rendered ${(spec.jobs ?? []).length} jobs + ${cards.length} caption cards -> ${outDir}`);
