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

type ApprovedPatch = { key: string; old: string | null; new: string };
const APPROVED_2026_11_20 = JSON.parse(read('docs/copy/product-pages-approved-2026-11-20.json')) as {
  approval: string; source: string;
  pages: Record<'/site-bot' | '/google-ads', { file: string; patches: ApprovedPatch[]; renames: Record<string, string> }>;
};

// Approved 2026-11-24 (Eitan): supersedes single 2026-11-20 lines; each superseded key is skipped by the 11-20 test and
// pinned by the 11-24 test below (old = the 11-20 line, new = live).
const APPROVED_2026_11_24 = JSON.parse(read('docs/copy/product-pages-approved-2026-11-24.json')) as {
  approval: string; source: string; brief: string; supersedes: string;
  pages: Partial<Record<'/site-bot' | '/google-ads', { file: string; patches: ApprovedPatch[] }>>;
};
const SUPERSEDED_2026_11_24 = new Set(
  Object.entries(APPROVED_2026_11_24.pages).flatMap(([page, entry]) => entry!.patches.map((p) => `${page} ${p.key}`)),
);

// Approved 2026-11-27 (Eitan): the nav-pivot heads (/google-ads «ניהול קמפיין בגוגל», /site-bot «קידום עסק בגוגל»).
// Supersedes earlier lines on the keys it lists; those keys are skipped by the older tests and pinned by its own test.
const APPROVED_2026_11_27 = JSON.parse(read('docs/copy/product-pages-approved-2026-11-27.json')) as {
  approval: string; source: string; brief: string; supersedes: string;
  pages: Partial<Record<'/site-bot' | '/google-ads', { file: string; patches: ApprovedPatch[] }>>;
};
const SUPERSEDED_2026_11_27 = new Set(
  Object.entries(APPROVED_2026_11_27.pages).flatMap(([page, entry]) => entry!.patches.map((p) => `${page} ${p.key}`)),
);

// Approved 2026-11-27, second layer (Eitan): the /site-bot H1 + badge by Fable 5.2 and the site-section H2 anchor.
// Supersedes the first 2026-11-27 layer and older records on the keys it lists.
const APPROVED_2026_11_27B = JSON.parse(read('docs/copy/product-pages-approved-2026-11-27b.json')) as {
  approval: string; supersedes: string;
  pages: Partial<Record<'/site-bot' | '/google-ads', { file: string; patches: (ApprovedPatch & { from: string })[] }>>;
};
const SUPERSEDED_2026_11_27B = new Set(
  Object.entries(APPROVED_2026_11_27B.pages).flatMap(([page, entry]) => entry!.patches.map((p) => `${page} ${p.key}`)),
);
// Approved 2026-11-27, third layer (Eitan): Fable 5.2 coverage pass (Maps, organic vs ads, no-site, timing FAQs).
const APPROVED_2026_11_27C = JSON.parse(read('docs/copy/product-pages-approved-2026-11-27c.json')) as {
  approval: string; supersedes: string;
  pages: Partial<Record<'/site-bot' | '/google-ads', { file: string; patches: { key: string; old: string | null; new: string; from: string }[] }>>;
};
const SUPERSEDED_2026_11_27C = new Set(
  Object.entries(APPROVED_2026_11_27C.pages).flatMap(([page, entry]) => entry!.patches.map((p) => `${page} ${p.key}`)),
);
const SITE_BOT_H1_27B = APPROVED_2026_11_27B.pages['/site-bot']!.patches.find((p) => p.key === 'hero.h1')!;

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
  assert.equal(data(siteBot).split('{net}').length - 1, 5);
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
  // 2026-11-20 (approved product-page copy, Open items): Service.description is the page's SEO description.
  assert.match(siteBot, /"@type": "Service",[\s\S]*?\n {4}description: COPY\.seo\.description,\n/);
  assert.doesNotMatch(siteBot, /description: COPY\.hero\.h1,/);
  assert.match(siteBot, /description: COPY\.hero\.badge,/);
  const ads = read('src/app/(app)/google-ads/page.tsx');
  assert.match(ads, /const NET_PRICE = String\(ADS_BOT_MONTHLY_NET_ILS\);/);
  assert.match(ads, /description: COPY\.seo\.jsonld\.webpage_description,/);
  assert.match(ads, /description: COPY\.seo\.jsonld\.service_description,/);
  // 2026-11-20 approved product-page copy (docs/copy/product-pages-fable52-r2-APPROVED-2026-11-20.md, section 6):
  // /google-ads renders scene, yours and start again (phases stays on /google-ads/how-it-works); /site-bot renders
  // scene (replacing the parts_intro line), claim, monthly and alternatives. Section order is pinned below.
  assert.ok(!ads.includes('COPY.phases'), '/google-ads renders COPY.phases');
  assert.ok(!siteBot.includes('STRINGS.site_bot.parts_intro'), '/site-bot still renders the retired parts_intro line');
  const inOrder = (src: string, keys: string[], name: string) => {
    const at = keys.map((key) => { const i = src.indexOf(key); assert.ok(i > 0, `${name}: ${key} not rendered`); return i; });
    for (let i = 1; i < at.length; i++) assert.ok(at[i - 1] < at[i], `${name}: ${keys[i - 1]} before ${keys[i]}`);
  };
  inOrder(ads, ['COPY.hero.h1', 'COPY.scene.h2', 'COPY.proof.h2', '<FounderBlock', 'COPY.mechanism.h2', 'COPY.does.h2', 'COPY.offer.h2', 'COPY.yours.h2', 'COPY.start.h2', 'COPY.faq.map((faq) => (\n', 'COPY.close.h2'], 'google-ads');
  inOrder(siteBot, ['COPY.hero.h1', 'COPY.scene.h2', 'COPY.claim.h2', 'PARTS.map', 'COPY.monthly.h2', 'COPY.alternatives.h2', 'COPY.price.h2', 'COPY.proof.h2', '<FounderBlock', 'COPY.faq_h2', 'COPY.close.h2'], 'site-bot');
  // One H1 per page; the FAQ heading comes from the copy, with no duplicate eyebrow.
  for (const [name, src] of [['google-ads', ads], ['site-bot', siteBot]]) assert.equal((src.match(/<h1\b/g) ?? []).length, 1, name);
  assert.ok(!siteBot.includes('className="eyebrow"'), '/site-bot FAQ eyebrow dropped');
});

test('landing copy: the old no-price FAQ is gone from the Site Bot sources (its answer opened with a call with Eitan)', () => {
  // The r2 billing FAQ states the price; the page has no FAQ literals of its own.
  const billing = SITE_BOT_LANDING_COPY.faq[1].a;
  assert.ok(billing.includes(String(SITE_BOT_PLAN.netAmount)));
  assert.equal(SITE_BOT_LANDING_COPY.faq.length, 12); // 8 + 4 added 2026-11-27 (third layer)
  assert.equal(GOOGLE_ADS_LANDING_COPY.faq.length, 10);
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
  // The batch-2 site-bot H1 anchor was superseded 2026-11-27 (second layer); its old value is that anchor.
  assert.equal(SITE_BOT_H1_27B.old, batch2.anchors.site_bot_h1.value, 'site-bot hero h1: 2026-11-27b old is the batch-2 anchor');
  assert.equal(SITE_BOT_LANDING_COPY.hero.h1, SITE_BOT_H1_27B.new, 'site-bot hero h1 anchor');
  const approved = APPROVED_2026_11_20.pages['/google-ads'];
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
  // Later approved patch set (Fable 5.2 clarity review, 2026-11-15; waocopy, facts unchanged): whole-line patches
  // "key :: value" on the r2 source, applied last.
  const clarity = (JSON.parse(read('docs/copy/google-ads-money-lines-clarity-2026-11-15.waocopy.json')) as {
    patches: { old: string; new: string }[];
  }).patches.map((p) => ({ key: p.old.split(' :: ')[0], old: p.old.split(' :: ').slice(1).join(' :: '), next: p.new.split(' :: ').slice(1).join(' :: ') }));
  const applyClarity = (key: string, value: string) => {
    const hit = clarity.find((c) => c.key === key);
    if (!hit) return value;
    assert.equal(value.replace(/\{net\}/g, '249'), hit.old.replace(/\{net\}/g, '249'), `${key}: clarity patch old matches the earlier approved line`);
    return hit.next.replace(/249(?= ₪)/g, '{net}');
  };
  const pilot2 = (JSON.parse(read('docs/copy/ads-bot-pilot-patches-2-2026-11-22.waocopy.json')) as {
    patches: { file: string; old: string; new: string }[];
  }).patches.filter((p) => p.file === 'docs/copy/google-ads-r2-final-candidate-2026-11-12.txt');
  assert.equal(pilot2.length, 1);
  const pilotUsed = new Set<string>();
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
    expected = applyClarity(key, expected);
    // Approved 2026-11-20 (Fable 5.2 r2 + Yonatan, Eitan): whole-field patches, applied last; FAQ indices moved by one.
    const liveKey = approved.renames[key] ?? key;
    const hit = approved.patches.find((p) => p.key === liveKey && p.old !== null);
    if (hit) {
      assert.equal(expected.replace(/\{net\}/g, '249'), hit.old, `${key}: 2026-11-20 patch old matches the earlier approved line`);
      expected = hit.new;
    }
    // Ads Bot pilot safety batch (2026-11-22, waocopy, Adam): substring patches on the r2 source, applied last
    // (the flat 15-shekel click cap became a per-trade cap).
    for (const p of pilot2) {
      if (expected.replace(/\{net\}/g, '249').includes(p.old)) {
        expected = expected.replace(/\{net\}/g, '249').replace(p.old, p.new);
        pilotUsed.add(p.old);
      }
    }
    // Approved 2026-11-27 nav-pivot heads: whole-field patches, applied last.
    const nav27 = APPROVED_2026_11_27.pages['/google-ads']?.patches.find((p) => p.key === liveKey);
    if (nav27) {
      assert.equal(expected.replace(/\{net\}/g, '249'), nav27.old, `${key}: 2026-11-27 patch old matches the earlier approved line`);
      expected = nav27.new;
    }
    assert.equal(fields.get(liveKey), expected.replace(/\{net\}/g, '249'), key);
  }
  assert.equal(pilotUsed.size, pilot2.length, 'every 2026-11-22 pilot patch on a pinned line was applied');
  assert.deepEqual([...GOOGLE_ADS_LANDING_COPY.phases.items], final['phases.items'].map((item, i) => applyClarity(`phases.items[${i}]`, applyPolish(`phases.items[${i}]`, item))));
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

test('no-demo layer (Eitan 2026-11-15, waocopy): /google-ads secondary CTAs, onboarding title/eyebrow, intake links', () => {
  const after = (rel: string) => { const raw = read(rel); return JSON.parse(raw.slice(raw.indexOf('{'))); };
  const cta = after('docs/copy/google-ads-cta-secondary-2026-11-15.waocopy.json').patches as { old: string; new: string }[];
  assert.equal(cta.length, 1);
  const [oldKey, oldValue] = cta[0].old.split(' :: ');
  const [newKey, newValue] = cta[0].new.split(' :: ');
  assert.equal(oldKey, 'hero.cta_secondary');
  assert.equal(newKey, oldKey);
  // The same approved value on both secondary buttons; the old line is gone from the source. Superseded 2026-11-20 by
  // the approved product-page copy, whose old value is this no-demo line.
  const approved = APPROVED_2026_11_20.pages['/google-ads'].patches;
  for (const key of ['hero.cta_secondary', 'close.cta_secondary']) {
    const hit = approved.find((p) => p.key === key)!;
    assert.equal(hit.old, newValue, `${key}: 2026-11-20 patch replaces the no-demo line`);
  }
  assert.equal(GOOGLE_ADS_LANDING_COPY.hero.cta_secondary, approved.find((p) => p.key === 'hero.cta_secondary')!.new);
  assert.equal(GOOGLE_ADS_LANDING_COPY.close.cta_secondary, GOOGLE_ADS_LANDING_COPY.hero.cta_secondary);
  assert.ok(!read('docs/copy/google-ads-r2-final-candidate-2026-11-12.txt').includes(oldValue));
  const wording = after('docs/copy/ads-bot-no-demo-wording-2026-11-15.waocopy.json') as Record<string, string>;
  const batch2 = JSON.parse(read('docs/copy/copy-polish-approved-2026-11-13-batch2.json')) as { anchors: Record<string, { value: string }> };
  assert.equal(batch2.anchors.onboarding_title.value, wording.onboarding_title, 'approval record carries the latest title');
  assert.ok(read('src/app/(app)/google-ads/onboarding/layout.tsx').includes(`title: ${JSON.stringify(wording.onboarding_title)},`));
  assert.ok(read('src/app/(app)/google-ads/onboarding/page.tsx').includes(`<div className="eyebrow">${wording.onboarding_eyebrow}</div>`));
  // No marketing page links the example-business mode any more.
  for (const page of ['src/app/(app)/google-ads/page.tsx', 'src/app/(app)/google-ads/how-it-works/page.tsx']) {
    const src = read(page);
    assert.ok(src.includes('href={GOOGLE_ADS_INTAKE_HREF}'), page);
    assert.doesNotMatch(src, /demo=1|DEMO_HREF/, page);
  }
  assert.match(read('src/lib/google-ads/links.ts'), /GOOGLE_ADS_INTAKE_HREF = "\/google-ads\/onboarding";/);
});

test('approved 2026-11-20 product-page copy: every patched or added line is live byte for byte', () => {
  assert.match(APPROVED_2026_11_20.approval, /^Eitan 2026-11-20/);
  const md = read(APPROVED_2026_11_20.source);
  for (const { name, copy, source, net } of PAGES) {
    const page = APPROVED_2026_11_20.pages[`/${name}` as '/site-bot' | '/google-ads'];
    assert.equal(page.file, source);
    const fields = new Map(flatten(copy));
    assert.ok(page.patches.length > 10, name);
    for (const p of page.patches) {
      // Superseded 2026-11-24 by product-pages-approved-2026-11-24.json (pinned in the next test); every other key stays checked.
      if ([SUPERSEDED_2026_11_24, SUPERSEDED_2026_11_27, SUPERSEDED_2026_11_27B, SUPERSEDED_2026_11_27C].some((s) => s.has(`/${name} ${p.key}`))) continue;
      assert.equal(fields.get(p.key), p.new, `${name} ${p.key}`);
      // Every new line is in the approved file, with the price as the {net} token where the file uses it.
      const asApproved = p.new.replace(new RegExp(`(?<![\\d.,])${net}(?![\\d.,])`, 'g'), '{net}');
      assert.ok(md.includes(p.new) || md.includes(asApproved) || p.key === 'scene.body', `${name} ${p.key}: not in the approved file`);
      if (p.old !== null) assert.ok(!read(source).split('\n').includes(`${p.key} :: ${p.old}`), `${name} ${p.key}: old line still in the source`);
    }
  }
  // Yonatan's lines override Fable's where they differ.
  const yonatan = md.split('\n---\n')[0];
  // The site-bot H1 left this list 2026-11-27 (Fable 5.2 + Yonatan re-sign-off; pinned by the 2026-11-27b test).
  // parts.profile.h2 also left 2026-11-27 (third layer, Yonatan re-sign-off; pinned by the 2026-11-27c test).
  for (const value of [GOOGLE_ADS_LANDING_COPY.faq[0].q]) {
    assert.ok(yonatan.includes(`\`${value}\``), 'Yonatan sign-off line');
  }
  assert.equal(SITE_BOT_LANDING_COPY.faq.length, 12); // 8 + 4 added 2026-11-27 (third layer)
  assert.equal(APPROVED_2026_11_20.pages['/google-ads'].renames['faq[8].a'], 'faq[9].a');
});

test('approved 2026-11-24 copy: each superseding line is live byte for byte and replaces the 2026-11-20 line', () => {
  assert.match(APPROVED_2026_11_24.approval, /^Eitan 2026-11-24/);
  assert.equal(APPROVED_2026_11_24.supersedes, 'docs/copy/product-pages-approved-2026-11-20.json');
  const raw = read(APPROVED_2026_11_24.source);
  const waocopy = JSON.parse(raw.slice(raw.indexOf('{'))) as { patches: { file: string; old: string; new: string }[] };
  assert.ok(read(APPROVED_2026_11_24.brief).length > 0, 'brief kept with the record');
  let checked = 0;
  for (const { name, copy, source } of PAGES) {
    const page = APPROVED_2026_11_24.pages[`/${name}` as '/site-bot' | '/google-ads'];
    if (!page) continue;
    assert.equal(page.file, source);
    const fields = new Map(flatten(copy));
    const lines = read(source).split('\n');
    for (const p of page.patches) {
      const older = APPROVED_2026_11_20.pages[`/${name}` as '/site-bot' | '/google-ads'].patches.find((q) => q.key === p.key);
      assert.equal(older?.new, p.old, `${name} ${p.key}: old is the 2026-11-20 line`);
      assert.ok(waocopy.patches.some((w) => w.file === source && w.old === p.old && w.new === p.new), `${name} ${p.key}: byte-exact from the waocopy file`);
      assert.equal(fields.get(p.key), p.new, `${name} ${p.key}`);
      assert.ok(lines.includes(`${p.key} :: ${p.new}`), `${name} ${p.key}: new line in the source`);
      assert.ok(!lines.includes(`${p.key} :: ${p.old}`), `${name} ${p.key}: old line gone from the source`);
      checked++;
    }
  }
  assert.equal(checked, 1);
});

test('approved 2026-11-27 nav-pivot heads: every line is live byte for byte, from the waocopy file, old line gone', () => {
  assert.match(APPROVED_2026_11_27.approval, /^Eitan 2026-11-27/);
  const raw = read(APPROVED_2026_11_27.source);
  const waocopy = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as { patches: { file: string; old: string; new: string }[] };
  assert.ok(read(APPROVED_2026_11_27.brief).length > 0, 'brief kept with the record');
  let checked = 0;
  for (const { name, copy, source } of PAGES) {
    const page = APPROVED_2026_11_27.pages[`/${name}` as '/site-bot' | '/google-ads'];
    if (!page) continue;
    assert.equal(page.file, source);
    const fields = new Map(flatten(copy));
    const lines = read(source).split('\n');
    for (const p of page.patches) {
      assert.ok(waocopy.patches.some((w) => w.file === source && w.old === `${p.key} :: ${p.old}` && w.new === `${p.key} :: ${p.new}`), `${name} ${p.key}: byte-exact from the waocopy file`);
      checked++;
      if (SUPERSEDED_2026_11_27B.has(`/${name} ${p.key}`) || SUPERSEDED_2026_11_27C.has(`/${name} ${p.key}`)) continue; // pinned by a later 2026-11-27 test
      assert.equal(fields.get(p.key), p.new, `${name} ${p.key}`);
      assert.ok(lines.includes(`${p.key} :: ${p.new}`), `${name} ${p.key}: new line in the source`);
      assert.ok(!lines.includes(`${p.key} :: ${p.old}`), `${name} ${p.key}: old line gone from the source`);
    }
  }
  assert.equal(checked, 9);
  // The nav labels that link to these pages.
  const nav = (JSON.parse(read('src/content/astra-homepage-copy.json')) as { navigation: { links: { label: string; href: string }[] } }).navigation.links;
  const label = (href: string) => nav.find((l) => l.href === href)?.label ?? '';
  assert.ok(GOOGLE_ADS_LANDING_COPY.seo.title.startsWith(label('/google-ads')), '/google-ads title leads with its nav label');
  assert.ok(SITE_BOT_LANDING_COPY.seo.title.startsWith(label('/site-bot')), '/site-bot title leads with its nav label');
});

test('approved 2026-11-27b /site-bot H1, badge and site H2: live byte for byte, copied from their decision files, old lines gone', () => {
  assert.match(APPROVED_2026_11_27B.approval, /^Eitan 2026-11-27/);
  assert.equal(APPROVED_2026_11_27B.supersedes, 'docs/copy/product-pages-approved-2026-11-27.json');
  const page = APPROVED_2026_11_27B.pages['/site-bot']!;
  const source = 'docs/copy/site-bot-r2-final-candidate-2026-11-12.txt';
  assert.equal(page.file, source);
  const fields = new Map(flatten(SITE_BOT_LANDING_COPY));
  const lines = read(source).split('\n');
  for (const p of page.patches) {
    // Each new string is byte-exact in the file it came from (Fable decision markdown or waocopy patch JSON).
    assert.ok(read(p.from).includes(p.new), `${p.key}: new string is in ${p.from}`);
    assert.equal(fields.get(p.key), p.new, `site-bot ${p.key}`);
    assert.ok(lines.includes(`${p.key} :: ${p.new}`), `site-bot ${p.key}: new line in the source`);
    assert.ok(!lines.includes(`${p.key} :: ${p.old}`), `site-bot ${p.key}: old line gone from the source`);
  }
  assert.equal(page.patches.length, 3);
  // The H1 leads with the nav label that links here; the H2 carries the site phrase that left the H1.
  const nav = (JSON.parse(read('src/content/astra-homepage-copy.json')) as { navigation: { links: { label: string; href: string }[] } }).navigation.links;
  const navLabel = nav.find((l) => l.href === '/site-bot')!.label;
  assert.ok(SITE_BOT_LANDING_COPY.hero.h1.startsWith(navLabel), '/site-bot H1 leads with its nav label');
  assert.ok(SITE_BOT_LANDING_COPY.seo.description.startsWith(SITE_BOT_LANDING_COPY.parts.site.h2.split(' \u2014 ')[0]), 'site H2 phrase also opens the meta description');
});

test('approved 2026-11-27c coverage pass: every line is live byte for byte, copied from the Fable decision file', () => {
  assert.match(APPROVED_2026_11_27C.approval, /^Eitan 2026-11-27/);
  assert.equal(APPROVED_2026_11_27C.supersedes, 'docs/copy/product-pages-approved-2026-11-27b.json');
  const page = APPROVED_2026_11_27C.pages['/site-bot']!;
  const source = 'docs/copy/site-bot-r2-final-candidate-2026-11-12.txt';
  assert.equal(page.file, source);
  const fields = new Map(flatten(SITE_BOT_LANDING_COPY));
  const lines = read(source).split('\n');
  for (const p of page.patches) {
    assert.ok(read(p.from).includes(p.new), `${p.key}: new string is in ${p.from}`);
    assert.equal(fields.get(p.key), p.new.replace(/\{net\}/g, String(SITE_BOT_PLAN.netAmount)), `site-bot ${p.key}`);
    assert.ok(lines.includes(`${p.key} :: ${p.new}`), `site-bot ${p.key}: new line in the source`);
    if (p.old !== null) assert.ok(!lines.includes(`${p.key} :: ${p.old}`), `site-bot ${p.key}: old line gone from the source`);
  }
  assert.equal(page.patches.length, 16);
  assert.equal(page.patches.filter((p) => p.old === null).length, 8, 'four new FAQ items (q + a)');
});

test('site-bot FAQ links (Yonatan 2026-11-27): each anchor is in its answer once, the question exists, and the page renders them', () => {
  const data = JSON.parse(read('src/content/site-bot-faq-links.json')) as { links: { q: string; anchor: string; href: string }[] };
  assert.equal(data.links.length, 3);
  for (const l of data.links) {
    const faq = SITE_BOT_LANDING_COPY.faq.find((f) => f.q === l.q);
    assert.ok(faq, `question exists: ${l.href}`);
    assert.ok(faq!.a.includes(l.anchor), `anchor in its answer: ${l.href}`);
    assert.ok(['/google-ads', '/google-business'].includes(l.href));
  }
  const page = read('src/app/(app)/site-bot/page.tsx');
  assert.ok(page.includes('{faqAnswer(faq.q, faq.a)}'), 'FAQ answers render through faqAnswer');
  assert.ok(!page.includes('{renderMixed(faq.a)}'), 'no plain-text FAQ answer render left');
});
