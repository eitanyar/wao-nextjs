// /site-bot and /google-ads landing copy (approved r2, 2026-11-12): the rendered copy equals the docs/copy source field
// for field, prices come from plans.ts, and the pages build their metadata / JSON-LD from it.
// HEBREW-SAFETY: zero Hebrew bytes. Every Hebrew expectation is read from the docs/copy source files.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { SITE_BOT_LANDING_COPY } from './landingCopy';
import { GOOGLE_ADS_LANDING_COPY } from '../google-ads/landingCopy';
import { SITE_BOT_PLAN, ADS_BOT_MONTHLY_NET_ILS } from '../payments/plans';

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

function sourceFields(rel: string): Array<[string, string]> {
  return read(rel).split('\n').filter(Boolean).map(line => {
    const at = line.indexOf(' :: ');
    assert.ok(at > 0, line);
    return [line.slice(0, at), line.slice(at + 4)] as [string, string];
  });
}

/** Nested copy -> [["hero.h1", "..."], ["faq[0].q", "..."], ...] */
function flatten(value: unknown, at = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[at, value]];
  if (Array.isArray(value)) return value.flatMap((item, i) => flatten(item, `${at}[${i}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => flatten(v, at ? `${at}.${k}` : k));
}

const PAGES = [
  { name: 'site-bot', copy: SITE_BOT_LANDING_COPY, source: 'docs/copy/site-bot-r2-final-candidate-2026-11-12.txt', page: 'src/app/(app)/site-bot/page.tsx', net: SITE_BOT_PLAN.netAmount },
  { name: 'google-ads', copy: GOOGLE_ADS_LANDING_COPY, source: 'docs/copy/google-ads-r2-final-candidate-2026-11-12.txt', page: 'src/app/(app)/google-ads/page.tsx', net: ADS_BOT_MONTHLY_NET_ILS },
];

test('landing copy: every field equals the approved source byte for byte, in order, nothing added or lost', () => {
  for (const { name, copy, source } of PAGES) {
    assert.deepEqual(flatten(copy), sourceFields(source), name);
    assert.ok(!JSON.stringify(copy).includes('{net}'), `${name}: price token filled`);
  }
  assert.equal(ADS_BOT_MONTHLY_NET_ILS, 249);
  assert.equal(SITE_BOT_PLAN.netAmount, 199);
});

test('landing copy: the generated modules carry no typed price; the page fee is the {net} token', () => {
  const siteBot = read('src/lib/site-bot/landingCopy.generated.ts');
  const ads = read('src/lib/google-ads/landingCopy.generated.ts');
  assert.doesNotMatch(siteBot, /(?<![\d.,])199(?![\d.,])/);
  assert.doesNotMatch(ads, /(?<![\d.,])249(?![\d.,])/);
  const data = (module: string) => module.slice(module.indexOf(' = {'));
  assert.equal(data(siteBot).split('{net}').length - 1, 4);
  assert.equal(data(ads).split('{net}').length - 1, 11);
});

test('landing pages: title / OG / description / JSON-LD come from the copy; the RLM-anchored brand; no old pricing', () => {
  for (const { name, page } of PAGES) {
    const src = read(page);
    assert.match(src, /const TITLE = `\$\{COPY\.seo\.title\}\\u200F \| WAO`;/, name);
    assert.match(src, /title: \{ absolute: TITLE \}/, name);
    assert.match(src, /openGraph: \{\n {4}title: TITLE,\n {4}description: COPY\.seo\.description,/, name);
    assert.match(src, /\n {2}description: COPY\.seo\.description,\n/, name);
    assert.match(src, /mainEntity: COPY\.faq\.map\(/, name);
    assert.match(src, /"@type": "UnitPriceSpecification",\n {8}price: NET_PRICE,/, name);
    assert.match(src, /valueAddedTaxIncluded: false,\n {8}unitCode: "MON",\n {8}billingDuration: "P1M",/, name);
    assert.doesNotMatch(src, /MCC|1,?500|\bq: "|\ba: "/, name);
    assert.match(src, /JSON\.stringify\(s\)\.replace\(\/<\/g, "\\\\u003c"\)/, name);
  }
  const siteBot = read('src/app/(app)/site-bot/page.tsx');
  assert.match(siteBot, /const NET_PRICE = String\(SITE_BOT_PLAN\.netAmount\);/);
  assert.match(siteBot, /description: COPY\.hero\.h1,/);
  assert.match(siteBot, /description: COPY\.hero\.badge,/);
  const ads = read('src/app/(app)/google-ads/page.tsx');
  assert.match(ads, /const NET_PRICE = String\(ADS_BOT_MONTHLY_NET_ILS\);/);
  assert.match(ads, /description: COPY\.seo\.jsonld\.webpage_description,/);
  assert.match(ads, /description: COPY\.seo\.jsonld\.service_description,/);
  // phases sits right after the "does" section.
  assert.ok(ads.indexOf('COPY.does.items') < ads.indexOf('COPY.phases.h2') && ads.indexOf('COPY.phases.h2') < ads.indexOf('COPY.proof.h2'));
});

test('landing copy: the old no-price FAQ is gone from the Site Bot sources (its answer opened with a call with Eitan)', () => {
  // The r2 billing FAQ states the price; the page has no FAQ literals of its own.
  const billing = SITE_BOT_LANDING_COPY.faq[1].a;
  assert.ok(billing.includes(String(SITE_BOT_PLAN.netAmount)));
  assert.equal(SITE_BOT_LANDING_COPY.faq.length, 8);
  assert.equal(GOOGLE_ADS_LANDING_COPY.faq.length, 9);
  assert.equal(GOOGLE_ADS_LANDING_COPY.phases.items.length, 2);
});
