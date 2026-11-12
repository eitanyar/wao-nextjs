// Builds the /google-ads/how-it-works copy module from the Noa-approved round-3 waocopy file in docs/copy.
// HEBREW-SAFETY: this script is ASCII-only and never contains Hebrew. Every value is read, byte-exact, from the
// fenced ```json block of the source file and serialized with JSON.stringify.
//
// Only the fields the page renders are emitted. The source's negative_free_intent_phrases, article_elements,
// glossary_fixes, flags, handoffs and changes are deliberately NOT read (Adam's round-3 rulings).
//
// The Ads Bot monthly price is replaced by the `{net}` token (asserted count) and filled back at runtime from
// src/lib/payments/plans.ts, the same way as the /google-ads hub copy (scripts/build-landing-copy.mjs).
//
// To change the copy: change the docs/copy source (Tamar -> Noa), then run `node scripts/build-how-it-works-copy.mjs`.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NET_TOKEN, priceRegex } from './build-landing-copy.mjs';

export const SOURCE = new URL('../docs/copy/google-ads-how-it-works-page-r3-2026-11-12.waocopy.json', import.meta.url);
export const OUTPUT = new URL('../src/lib/google-ads/howItWorksCopy.generated.ts', import.meta.url);
export const EXPORT_NAME = 'HOW_IT_WORKS_COPY_SOURCE';
export const PAGE_PATH = '/google-ads/how-it-works';
export const PRICE = '249';
// closing.body only
export const PRICE_COUNT = 1;

const MD_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

/** The fenced ```json block -> object. Fails closed if there is not exactly one. */
export function parseSource(text) {
  const blocks = [...text.matchAll(/```json\n([\s\S]*?)\n```/g)];
  if (blocks.length !== 1) throw new Error(`Expected 1 fenced json block, found ${blocks.length}`);
  return JSON.parse(blocks[0][1]);
}

function str(v, at) {
  if (typeof v !== 'string' || !v || v !== v.trim()) throw new Error(`Empty, padded or non-string value: ${at}`);
  if (v.includes('{') || v.includes('}')) throw new Error(`Brace in source value: ${at}`);
  return v;
}

function only(list, at) {
  if (!Array.isArray(list) || list.length !== 1) throw new Error(`Expected exactly one ruled entry: ${at}`);
  return str(list[0], `${at}[0]`);
}

/** Picks and validates the rendered fields. */
export function pick(src) {
  if (src.url !== PAGE_PATH || src.seo?.canonical !== PAGE_PATH) throw new Error('url/canonical mismatch');
  const chosen = src.seo?.meta_chosen;
  if (!Number.isInteger(chosen) || chosen < 1) throw new Error('Bad seo.meta_chosen');
  const steps = src.steps.map((s, i) => {
    if (s.n !== i + 1) throw new Error(`Step order: ${i}`);
    // The step number is its position; fillLandingCopy() accepts string leaves only.
    return {
      h2: str(s.h2, `steps[${i}].h2`),
      analogy: str(s.analogy, `steps[${i}].analogy`),
      body: str(s.body, `steps[${i}].body`),
      you_see: str(s.you_see, `steps[${i}].you_see`),
    };
  });
  if (steps.length !== 8) throw new Error(`Expected 8 steps, found ${steps.length}`);

  const hubLinks = src.links.filter(l => l.href === PAGE_PATH);
  if (hubLinks.length !== 1) throw new Error('Expected one hub mechanism link');
  if (src.hub_patch?.mechanism_block_link?.anchor !== hubLinks[0].anchor
    || src.hub_patch?.mechanism_block_link?.href !== PAGE_PATH) throw new Error('hub_patch link mismatch');
  const button = src.links.filter(l => l.href === 'DEMO_HREF');
  if (button.length !== 1 || button[0].anchor !== src.closing.cta) throw new Error('Closing button mismatch');

  const crumbs = src.schema.breadcrumb.items.map((c, i) => {
    if (c.position !== i + 1) throw new Error(`Breadcrumb order: ${i}`);
    return { name: str(c.name, `breadcrumb[${i}]`), path: str(c.item, `breadcrumb[${i}].item`) };
  });

  const out = {
    title: only(src.title_options, 'title_options'),
    h1: only(src.h1_options, 'h1_options'),
    description: str(src.meta_description_options[chosen - 1], `meta_description_options[${chosen - 1}]`),
    answer_block: str(src.answer_block, 'answer_block'),
    intro: str(src.intro, 'intro'),
    steps,
    closing: {
      h2: str(src.closing.h2, 'closing.h2'),
      body: str(src.closing.body, 'closing.body'),
      cta: str(src.closing.cta, 'closing.cta'),
    },
    hub_link: { anchor: str(hubLinks[0].anchor, 'hub link anchor'), href: PAGE_PATH },
    breadcrumb: crumbs,
    webpage_name: str(src.schema.webpage.name, 'schema.webpage.name'),
    silo_nav: {
      label: str(src.silo_nav.label, 'silo_nav.label'),
      items: src.silo_nav.items.map((it, i) => ({
        label: str(it.label, `silo_nav[${i}].label`),
        href: str(it.href, `silo_nav[${i}].href`),
        role: it.role === 'hub' || it.role === 'spoke' ? it.role : (() => { throw new Error(`Bad role ${i}`); })(),
      })),
    },
  };
  if (out.webpage_name !== out.title) throw new Error('schema.webpage.name must equal the ruled title');
  if (src.schema.webpage.about?.['@id'] !== '/google-ads#service') throw new Error('WebPage.about must be /google-ads#service');
  if (out.silo_nav.items.filter(i => i.role === 'hub').length !== 1) throw new Error('Silo needs one hub');

  // Every in-body markdown link must be one of the ruled links, appear exactly once, and respect no_link_to.
  const texts = [out.answer_block, out.intro, ...steps.flatMap(s => [s.h2, s.analogy, s.body, s.you_see]), out.closing.h2, out.closing.body];
  const all = texts.join('\n');
  for (const l of src.links.filter(x => x.href.startsWith('/') && x.href !== PAGE_PATH)) {
    const md = `[${l.anchor}](${l.href})`;
    const n = all.split(md).length - 1;
    if (n !== 1) throw new Error(`Expected link ${l.href} exactly once in the body, found ${n}`);
  }
  for (const m of all.matchAll(MD_LINK)) {
    if (!src.links.some(l => l.href === m[2] && l.anchor === m[1])) throw new Error(`Unruled link: ${m[2]}`);
  }
  if (src.no_link_to && all.includes(src.no_link_to)) throw new Error(`no_link_to present: ${src.no_link_to}`);
  return out;
}

/** Replaces the standalone price with the {net} token in every string leaf, asserting the count. */
export function tokenizePrice(obj, price = PRICE, expected = PRICE_COUNT) {
  let count = 0;
  const walk = v => {
    if (typeof v === 'string') return v.replace(priceRegex(price), () => { count++; return NET_TOKEN; });
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  const out = walk(obj);
  if (count !== expected) throw new Error(`Expected ${expected} price tokens for ${price}, found ${count}`);
  return out;
}

export function generate(sourceText) {
  const copy = tokenizePrice(pick(parseSource(sourceText)));
  const rel = fileURLToPath(SOURCE).split('/docs/copy/')[1];
  return [
    '// GENERATED by scripts/build-how-it-works-copy.mjs -- do not edit by hand.',
    `// Source (byte-exact, Noa-approved round-3 copy): docs/copy/${rel}`,
    `// The Ads Bot price is the ${NET_TOKEN} token, filled from src/lib/payments/plans.ts by fillLandingCopy().`,
    `export const ${EXPORT_NAME} = ${JSON.stringify(copy, null, 2)} as const;`,
    '',
  ].join('\n');
}

function main() {
  const next = generate(fs.readFileSync(SOURCE, 'utf8'));
  const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : null;
  if (process.argv.includes('--check')) {
    if (current !== next) { console.error(`stale: ${fileURLToPath(OUTPUT)}`); process.exit(1); }
    return;
  }
  if (current !== next) { fs.writeFileSync(OUTPUT, next); console.log(`wrote ${fileURLToPath(OUTPUT)}`); }
  else console.log(`unchanged ${fileURLToPath(OUTPUT)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
