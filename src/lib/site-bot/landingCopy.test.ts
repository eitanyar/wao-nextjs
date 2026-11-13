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
  assert.equal(GOOGLE_ADS_LANDING_COPY.phases.items.length, 4);
});

test('google-ads: the clicks-to-real-leads change set (2026-11-12 FINAL, Noa + Yonatan PASS) is live byte for byte', () => {
  const final = JSON.parse(read('docs/copy/google-ads-clicks-to-leads-FINAL-2026-11-12.json')) as {
    lines: Record<string, string>; 'phases.items': string[]; bot_bidding_label: string;
  };
  const fields = new Map(flatten(GOOGLE_ADS_LANDING_COPY));
  // Later approved patch (round 3, Noa-gated): the how-it-works file's hub_patch.line_27 gender fix.
  const r3 = read('docs/copy/google-ads-how-it-works-page-r3-2026-11-12.waocopy.json');
  const line27 = (JSON.parse(r3.split('```json\n')[1].split('\n```')[0]) as { hub_patch: { line_27: { old: string; new: string } } }).hub_patch.line_27;
  // Later approved patch (Noa-gated, 2026-11-12): mechanism moment 3 reframed as designed, not live.
  const moment3 = (JSON.parse(read('docs/copy/google-ads-hub-moment3-final-2026-11-12.json')) as {
    patches: { file: string; old: string; new: string }[];
  }).patches;
  assert.equal(moment3.length, 2);
  // Later approved patch set (Eitan 2026-11-13, Noa-gated): the anti-slop copy polish, applied
  // on top in recorded order. Keyed patches replace their field's value; the rest are
  // substring patches inside a line. The polish reverses moment 3's "designed" wording on purpose.
  const polishRecord = JSON.parse(read('docs/copy/copy-polish-approved-2026-11-13.json')) as {
    approval: string;
    patches: { file: string; field: string | null; old: string; new: string; oldValue?: string; newValue?: string }[];
  };
  assert.equal(polishRecord.approval, 'Eitan 2026-11-13, Noa-gated');
  const batch2 = JSON.parse(read('docs/copy/copy-polish-approved-2026-11-13-batch2.json')) as {
    approval: string; anchors: Record<string, { value: string }>;
  };
  assert.equal(batch2.approval, 'Eitan 2026-11-13, Noa-gated; anchors Yonatan-approved');
  assert.ok('hero.h1' in final.lines, 'the FINAL set pins hero.h1');
  assert.equal(SITE_BOT_LANDING_COPY.hero.h1, batch2.anchors.site_bot_h1.value, 'site-bot hero h1 anchor');
  const polish = polishRecord.patches.filter((p) => p.file === 'docs/copy/google-ads-r2-final-candidate-2026-11-12.txt');
  const used = new Set<number>();
  const applyPolish = (key: string, value: string) => {
    let out = value;
    polish.forEach((p, i) => {
      if (p.field !== null) {
        if (p.field === key) {
          assert.equal(out, p.oldValue, `${key}: polish patch old matches the earlier approved line`);
          out = p.newValue!;
          used.add(i);
        }
      } else if (out.includes(p.old)) {
        out = out.replace(p.old, p.new);
        used.add(i);
      }
    });
    return out;
  };
  for (const [key, value] of Object.entries(final.lines)) {
    let expected = value.includes(line27.old) ? value.split(line27.old).join(line27.new) : value;
    for (const p of moment3) {
      if (p.file === key) {
        assert.equal(expected, p.old, `${key}: moment-3 patch old matches the FINAL line`);
        expected = p.new;
      }
    }
    expected = applyPolish(key, expected);
    // Batch 2 (Eitan 2026-11-13, Noa-gated; anchors Yonatan-approved): the hero h1 anchor.
    if (key === 'hero.h1') expected = batch2.anchors.google_ads_h1.value;
    assert.equal(fields.get(key), expected, key);
  }
  assert.deepEqual([...GOOGLE_ADS_LANDING_COPY.phases.items], final['phases.items'].map((item, i) => applyPolish(`phases.items[${i}]`, item)));
  // Every polish patch on a FINAL-pinned line was consumed (none silently skipped).
  const pinned = new Set([...Object.keys(final.lines), ...final['phases.items'].map((_, i) => `phases.items[${i}]`)]);
  for (const [i, p] of polish.entries()) if (p.field !== null && pinned.has(p.field)) assert.ok(used.has(i), `polish patch on ${p.field} applied`);
  // The retired "tCPA after 15-30 conversions" claim is gone from the copy, the page and the chat bot.
  assert.ok(!JSON.stringify(GOOGLE_ADS_LANDING_COPY).includes('15\u201330'));
  assert.ok(!read('src/app/(app)/google-ads/page.tsx').includes('15\u201330'));
  assert.ok(!read('src/lib/bot/prompts.ts').includes('15\u201330'));
  const bot = read('src/app/api/bot/route.ts');
  assert.ok(bot.includes(JSON.stringify(final.bot_bidding_label)), 'bot bidding label');
  assert.ok(!bot.includes('tCPA \u2014'), 'old tCPA label gone');
});
