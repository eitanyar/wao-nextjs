// Site Bot visual pack (2026-11-16): hero backdrop, logo slot, picker, and the stars assertion of the rating rules.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew values come from data/sites/test-plumber-tlv.json (read-only)
// and testdata/logo-names.json (supplied through the copy channel; the picker fixtures skip until it exists).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { renderResearchedSitePages } from './researchedSite';
import { renderStaticHtml } from './renderStaticHtml';
import { lookFixtureParams } from './siteLook.testkit';
import { SITE_FONT_PATHS, siteFontFiles } from './siteFonts';
import { HERO_OVERLAY_TEXT_ALPHA, heroBackdropHtml, renderableHero, type SiteLook } from './siteLook';
import { brandLogo, fitsLines, GENERIC_LEADS, GENERIC_LEADS_COPY_PENDING, generatedLogo, isGenericLeadToken, leadClass, LOGO_MARK_LIBRARY, pickLogo, plainStep, splitLead, textUnits, type GeneratedLogoVariant, type LogoStep } from './siteLogo';
import { VERTICAL_THEMES } from './verticalThemes';
import { VERTICAL_ASSETS } from './verticalAssets';
import type { LPCopy } from './lpCopyPrompt';

const ROOT = path.resolve(__dirname, '../../..');

/**
 * sha256 over the sorted file names + bytes of the fixture site, captured before the visual pack (2026-11-16).
 * Re-pinned 2026-11-16 for the removal of the unused <symbol id="i-star"> from the shared sprite: re-inserting that one
 * symbol reproduces the previous hash 058f2f6b...743a byte for byte, so nothing else moved.
 */
const GOLDEN_LOOK_OFF = '9b219769fd4c832d8035f7db6bd5c3cbc5f22058066570534a6c621dea79f548';

function siteHash(files: Record<string, string>): string {
  const hash = createHash('sha256');
  for (const name of Object.keys(files).sort()) { hash.update(name); hash.update('\0'); hash.update(files[name]); hash.update('\0'); }
  return hash.digest('hex');
}

const HERO: SiteLook['hero'] = {
  approved: true,
  images: [480, 768, 1080, 1440, 1920].map(width => ({
    width, height: Math.round((width * 9) / 16), avif: `/img/hero-0123456789ab-${width}.avif`, webp: `/img/hero-0123456789ab-${width}.webp`,
  })),
};

test('golden: no look renders byte-identical to the site before the visual pack; nothing approved is the same', () => {
  const off = renderResearchedSitePages(lookFixtureParams());
  assert.equal(siteHash(off), GOLDEN_LOOK_OFF);
  for (const look of [{}, { hero: { ...HERO!, approved: false } }, { logo: { approved: false, kind: 'generated', variant: 'lockup' } }] as SiteLook[]) {
    assert.equal(siteHash(renderResearchedSitePages({ ...lookFixtureParams(), look })), GOLDEN_LOOK_OFF);
  }
});

const pick = (re: RegExp, html: string) => re.exec(html)?.[1] ?? null;
const SEO_PARTS: Array<[string, RegExp]> = [
  ['title', /<title>([\s\S]*?)<\/title>/],
  ['h1', /<h1>([\s\S]*?)<\/h1>/],
  ['description', /<meta name="description" content="([^"]*)"/],
  ['canonical', /<link rel="canonical" href="([^"]*)"/],
  ['jsonld', /<script type="application\/ld\+json">([\s\S]*?)<\/script>/],
  ['og:image', /<meta property="og:image" content="([^"]*)"/],
];

test('hero photo: title, H1, meta description, canonical, JSON-LD and breadcrumb-before-H1 identical with the photo on', () => {
  const off = renderResearchedSitePages(lookFixtureParams());
  const on = renderResearchedSitePages({ ...lookFixtureParams(), look: { hero: HERO } });
  assert.deepEqual(Object.keys(on).sort(), Object.keys(off).sort());
  for (const file of ['index.html', 'services/alpha-repair.html', 'services/gamma.html']) {
    for (const [name, re] of SEO_PARTS) assert.equal(pick(re, on[file]), pick(re, off[file]), `${file} ${name}`);
    const crumbOff = /<nav[^>]*breadcrumb[\s\S]*?<\/nav><h1>/.exec(off[file])?.[0] ?? null;
    assert.equal(/<nav[^>]*breadcrumb[\s\S]*?<\/nav><h1>/.exec(on[file])?.[0] ?? null, crumbOff, `${file} breadcrumb directly before the H1`);
    if (file !== 'index.html') assert.ok(crumbOff, `${file} has a breadcrumb`);
  }
  // Pages outside the researched hero (contact, legal) are unchanged.
  for (const file of ['contact.html', 'privacy.html', '404.html', 'sitemap.xml']) assert.equal(on[file], off[file], file);
});

test("hero photo: Yonatan's markup conditions", () => {
  const on = renderResearchedSitePages({ ...lookFixtureParams(), look: { hero: HERO } });
  for (const file of ['index.html', 'services/alpha-repair.html']) {
    const html = on[file];
    const body = html.slice(html.indexOf('<body>'));
    // The first image in the DOM is the hero <img>, inside <picture>, inside section.hero.
    const firstImg = /<img\b[^>]*>/.exec(body)![0];
    assert.match(firstImg, /class="hero-bg"/);
    const hero = /<section class="hero on-dark has-photo" data-section="hero">([\s\S]*?)<\/section>/.exec(body)![1];
    assert.ok(hero.startsWith('<picture><source type="image/avif" srcset="'), 'picture is the first child of .hero');
    const picture = /<picture>([\s\S]*?)<\/picture>/.exec(hero)![1];
    const sources = [...picture.matchAll(/<source type="([^"]+)" srcset="([^"]+)" sizes="100vw" \/>/g)];
    assert.deepEqual(sources.map(s => s[1]), ['image/avif', 'image/webp'], 'AVIF, then WebP');
    assert.equal(sources[0][2], HERO!.images.map(i => `${i.avif} ${i.width}w`).join(', '));
    assert.match(sources[1][2], /480w, .*768w, .*1080w, .*1440w, .*1920w$/);
    assert.match(firstImg, /src="\/img\/hero-0123456789ab-1080\.webp"/, 'WebP <img> fallback');
    assert.match(firstImg, /sizes="100vw"/);
    assert.match(firstImg, /fetchpriority="high"/);
    assert.match(firstImg, /width="1920" height="1080"/);
    assert.match(firstImg, /alt=""/);
    assert.doesNotMatch(firstImg, /loading=|decoding=|style=|opacity/);
    assert.equal((html.match(/fetchpriority="high"/g) ?? []).length, 1, 'no other fetchpriority=high');
    assert.doesNotMatch(html, /<link rel="preload"[^>]*as="image"/, 'no image preload link');
    // CSS: absolute inset:0 + object-fit:cover, solid --primary underneath, dark overlay, no viewport-height hero.
    assert.match(html, /\.hero\.has-photo \.hero-bg\{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;\}/);
    assert.match(html, /\.hero\{background:var\(--primary\)/);
    assert.match(html, new RegExp(`\\.hero\\.has-photo::before\\{content:"";position:absolute;inset:0;z-index:-1;background:rgba\\(13,27,42,${HERO_OVERLAY_TEXT_ALPHA}\\);\\}`));
    // The breadcrumb over a photo carries the same text shadow as the H1 (its links inherit it).
    assert.match(html, /\.hero\.has-photo \.wao-breadcrumb\{text-shadow/);
    // The desktop gradient keeps the text alpha across 80% of the width, then fades to the edge alpha.
    assert.ok(html.includes(`rgba(13,27,42,${HERO_OVERLAY_TEXT_ALPHA}) 80%, rgba(13,27,42,0.3) 100%`), 'text span 80%');
    assert.doesNotMatch(html, /100vh|100svh|100dvh/);
    assert.doesNotMatch(html, /transition|@keyframes|animation/);
  }
});

test('hero photo: an unapproved, empty or malformed hero renders the solid hero', () => {
  assert.equal(renderableHero(undefined), null);
  assert.equal(renderableHero({ hero: { ...HERO!, approved: false } }), null);
  assert.equal(renderableHero({ hero: { approved: true, images: [] } }), null);
  assert.equal(renderableHero({ hero: { approved: true, images: [{ ...HERO!.images[0], webp: 'https://evil.example/x.webp' }] } }), null);
  assert.equal(renderableHero({ hero: { approved: true, images: [{ ...HERO!.images[0], avif: '/img/x.webp' }] } }), null);
  const single = renderableHero({ hero: { approved: true, images: [HERO!.images[0]] } })!;
  assert.match(heroBackdropHtml(single), /src="\/img\/hero-0123456789ab-480\.webp"/);
});

// ── Logo ─────────────────────────────────────────────────────────────────────

const header = (html: string) => /<header class="site-hdr">[\s\S]*?<\/header>/.exec(html)![0];

test('logo: renders only when approved; owner file is an <svg><image>, never an <img>; logo CSS only with a logo', () => {
  const off = renderResearchedSitePages(lookFixtureParams());
  const name = lookFixtureParams().data.businessName!;
  const lockup = renderResearchedSitePages({ ...lookFixtureParams(), look: { logo: { approved: true, kind: 'generated', variant: 'lockup' } } });
  for (const file of ['index.html', 'services/alpha-repair.html', 'contact.html']) {
    assert.match(header(lockup[file]), /<a class="brand has-logo" href="\/"><span data-logo="lockup">/, file);
    assert.match(lockup[file], /<style>\.brand\.has-logo\{/, file);
    assert.doesNotMatch(off[file], /has-logo|logo-name/, file);
  }
  // The header text is the full business name (lead + rest), byte-identical.
  const text = header(lockup['index.html']).replace(/^[\s\S]*?<span data-logo="lockup">/, '').replace(/<[^>]+>/g, '').split('<nav')[0];
  assert.ok(text.startsWith(name), 'full business name');
  const file = renderResearchedSitePages({ ...lookFixtureParams(), look: { logo: { approved: true, kind: 'file', src: '/img/logo-0123456789ab.webp', width: 120, height: 40 } } });
  const brand = header(file['index.html']);
  assert.match(brand, /<svg data-logo="file" role="img" aria-label="[^"]+" width="120" height="40"/);
  assert.doesNotMatch(brand, /<img\b/);
  assert.doesNotMatch(brand, /\.svg"/);
  // Oversized / foreign files are refused.
  for (const logo of [{ src: '/img/logo.svg', width: 120, height: 40 }, { src: 'https://x.example/l.webp', width: 120, height: 40 }, { src: '/img/logo-a.webp', width: 400, height: 40 }]) {
    assert.equal(brandLogo({ logo: { approved: true, kind: 'file', ...logo } }, name), undefined);
  }
  assert.equal(brandLogo({ logo: { approved: false, kind: 'file', src: '/img/logo-a.webp', width: 120, height: 40 } }, name), undefined);
  assert.equal(brandLogo({ logo: { approved: true, kind: 'generated', variant: 'name' } }, '   '), undefined);
});

test('logo: no single-line ellipsis anywhere in the logo CSS; the small line uses --accent-text', () => {
  for (const variant of ['lockup', 'icon', 'monogram', 'name'] as GeneratedLogoVariant[]) {
    const logo = brandLogo({ logo: { approved: true, kind: 'generated', variant } }, 'Alpha Beta Gamma Delta', { businessNiche: 'plumber' });
    if (!logo) continue;
    assert.doesNotMatch(logo.css, /text-overflow:ellipsis/, variant);
    assert.match(logo.css, /text-overflow:clip/, `${variant}: overrides the .brand ellipsis`);
  }
  const lockup = brandLogo({ logo: { approved: true, kind: 'generated', variant: 'lockup' } }, 'Alpha Beta Gamma Delta')!;
  assert.match(lockup.css, /\.logo-rest\{font-weight:500;color:var\(--accent-text\);\}/);
  assert.match(lockup.html, /<bdi class="logo-lead">Alpha<\/bdi> <bdi class="logo-rest">Beta Gamma Delta<\/bdi>/, 'stacked: one bdi per line, a real space');
});

test('logo picker: lead split, classes, layout steps, defaults (ASCII cases)', () => {
  assert.deepEqual(splitLead('Cohen & Cohen Plumbing'), { lead: 'Cohen & Cohen', rest: 'Plumbing' });
  assert.deepEqual(splitLead('AquaFix'), { lead: 'AquaFix', rest: '' });
  assert.equal(leadClass('24/7'), 'generic');
  assert.equal(leadClass('Plumbing', { businessNiche: 'plumbing' }), 'generic');
  assert.equal(leadClass('Haifa', { targetLocation: 'Haifa' }), 'generic');
  assert.equal(leadClass('AquaFix', { businessNiche: 'plumbing' }), 'name');
  // Heebo's measured advances (heeboWidths.generated.json); an unknown character errs wide.
  const units = (JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'lp', 'heeboWidths.generated.json'), 'utf8')) as { units: Record<string, number> }).units;
  assert.ok(Math.abs(textUnits('Ab 1') - (0.66 + 0.55 + 0.25 + 0.55)) < 1e-9, 'Latin / digits / space: Fable units');
  assert.ok(Math.abs(textUnits('\u05F4') - Math.max(units[0x5f4], 0.35)) < 1e-9, 'other: the wider of measured and 0.35');
  assert.ok(Math.abs(textUnits('\u05D0\u05D5') - (units[0x5d0] + units[0x5d5])) < 1e-9, 'Hebrew letters: the measured advance');
  assert.ok(textUnits('\u00C9') >= 0.9, 'unknown letter: wide');
  // The widths were measured from the fonts the sites ship (re-run scripts/build-heebo-widths.mjs when they change).
  const widthsFile = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'lp', 'heeboWidths.generated.json'), 'utf8')) as { fonts: { hebrew: string; latin: string } };
  const fonts = siteFontFiles();
  const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
  assert.equal(widthsFile.fonts.hebrew, sha(fonts[SITE_FONT_PATHS.hebrew.slice(1)]));
  assert.equal(widthsFile.fonts.latin, sha(fonts[SITE_FONT_PATHS.latin.slice(1)]));
  assert.equal(fitsLines('aaaa aaaa', 10, 30, 2), true);
  assert.equal(fitsLines('aaaa aaaa aaaa', 10, 30, 2), false);
  assert.equal(plainStep('Ab', 128), '18-1');
  assert.equal(plainStep('a'.repeat(60), 128), 'clamp');
  assert.equal(pickLogo('', {}), null);
  // Single token: no lockup; no confident trade (unknown niche) -> no icon -> plain; monogram offered, never the default.
  const solo = pickLogo('AquaFix', { businessNiche: 'zzz' })!;
  assert.equal(solo.vertical, null);
  assert.equal(solo.defaultVariant, 'name');
  assert.deepEqual(solo.options, ['name', 'monogram']);
  const lockup = pickLogo('Cohen Pipes', { businessNiche: 'zzz' })!;
  assert.equal(lockup.defaultVariant, 'lockup');
  assert.deepEqual(lockup.layouts.lockup, { kind: 'inline' });
  // A joined lead with punctuation is never a monogram.
  assert.equal(pickLogo('Cohen & Cohen Pipes', {})!.options.includes('monogram'), false);
  // The mark library holds exactly the approved marks (2026-11-17); logoMarks.test.ts covers the marks themselves.
  const approved = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'lp', 'logoMarks', 'approved-picks-2026-11-17.json'), 'utf8')) as { trades: Record<string, string[]> };
  assert.deepEqual(Object.keys(LOGO_MARK_LIBRARY).sort(), Object.values(approved.trades).flat().sort());
});

const LOGO_RATING_FINAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'copy', 'site-bot-logo-rating-review-strings-FINAL-2026-11-16.json'), 'utf8')) as Record<string, unknown>;
// Letters by code point (this file stays free of Hebrew bytes): he, bet, and the name "Hadar" (he-dalet-resh).
const HE = '\u05D4';
const BET = '\u05D1';
const HADAR = '\u05D4\u05D3\u05E8';

test('logo picker: the generic-lead list is the FINAL copy, byte-exact, and applied', () => {
  assert.equal(GENERIC_LEADS_COPY_PENDING, false);
  assert.deepEqual([...GENERIC_LEADS], LOGO_RATING_FINAL.genericLeads);
  for (const word of GENERIC_LEADS) assert.equal(leadClass(word), 'generic', `${word} as written`);
});

test("logo picker: Noa's he rule: strip a leading he only when the rest is on the list; no other prefix is stripped", () => {
  for (const word of GENERIC_LEADS) {
    assert.equal(isGenericLeadToken(word), true);
    assert.equal(isGenericLeadToken(HE + word), true, `he + ${word}`);
    assert.equal(isGenericLeadToken(BET + word), false, `bet + ${word}: only he is stripped`);
  }
  // A name starting with Hadar stays NAME: the rest after he is not on the list, and the word as written is not either.
  assert.equal(isGenericLeadToken(HADAR), false);
  assert.equal(leadClass(HADAR), 'name');
  assert.equal(pickLogo(`${HADAR} AquaFix`)?.leadClass, 'name');
  assert.equal(pickLogo(`${HE}${GENERIC_LEADS[0]} AquaFix`)?.leadClass, 'generic');
  assert.equal(isGenericLeadToken(HE), false, 'a bare he is not generic');
});

interface LogoNameFixture {
  name: string;
  expectedLead: 'NAME' | 'GENERIC' | null;
  expectedDefault: 'A' | 'B' | 'C' | 'plain' | null;
  businessNiche?: string;
  primaryService?: string;
  targetLocation?: string;
  dependsOnGenericList?: boolean;
  /** The phone size step of the default variant's layout; the name must still render whole (never cut). */
  expectedStep?: LogoStep;
}
const LOGO_NAMES = path.join(ROOT, 'testdata', 'logo-names.json');
const VARIANT_OF: Record<string, GeneratedLogoVariant> = { A: 'icon', B: 'monogram', C: 'lockup', plain: 'name' };

test("logo picker: Fable's fixture table (testdata/logo-names.json)", { skip: fs.existsSync(LOGO_NAMES) ? false : 'testdata/logo-names.json not supplied yet' }, () => {
  const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'sites', 'test-plumber-tlv.json'), 'utf8'));
  const base = { businessNiche: record.collectedData.businessNiche, targetLocation: record.collectedData.targetLocation };
  const rows = JSON.parse(fs.readFileSync(LOGO_NAMES, 'utf8')) as LogoNameFixture[];
  assert.ok(rows.length > 0);
  for (const row of rows) {
    const result = pickLogo(row.name, { ...base, ...row });
    if (row.expectedLead === null) { assert.equal(result, null, row.name); continue; }
    assert.ok(result, row.name);
    assert.equal(result.leadClass.toUpperCase(), row.expectedLead, `${row.name}: lead`);
    assert.equal(result.defaultVariant, VARIANT_OF[row.expectedDefault!], `${row.name}: default`);
    if (row.expectedStep) {
      const layout = result.layouts[result.defaultVariant] as { step?: LogoStep } | undefined;
      assert.equal(layout?.step, row.expectedStep, `${row.name}: step`);
      assert.equal(result.text, row.name, `${row.name}: the name is kept whole`);
      const logo = generatedLogo(result.defaultVariant, row.name, { ...base, ...row });
      assert.ok(logo?.html.includes(`<bdi>${row.name}</bdi>`), `${row.name}: the whole name renders`);
      assert.doesNotMatch(logo!.css, /line-clamp:2/, `${row.name}: no two-line clamp`);
    }
  }
});

// ── Rating-display rules, assertion 21 ───────────────────────────────────────

test('assertion 21: legacy renderStaticHtml output contains no star icons (ads LP and site mode)', () => {
  const copy = {
    heroHeadline: 'H', heroSubheadline: 'S', heroCta: 'Call', trustBarItems: ['A'], aboutBlurb: 'About', servicesHeadline: 'Services',
    serviceItems: ['X'], faqHeadline: 'FAQ', faqItems: [], guaranteeBlock: null, reviewFeatured: 'Great', reviewContext: '4.9 (37)',
    responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: 'Bar',
  } as unknown as LPCopy;
  for (const mode of ['ads-lp', 'site'] as const) {
    const html = renderStaticHtml({ theme: VERTICAL_THEMES['emergency-trades'], assets: VERTICAL_ASSETS['emergency-trades'], copy,
      data: { businessName: 'Biz', phone: '050-0000000' }, heroImageUrl: '', slug: 'x', mode, siteUrl: 'https://x.wao.co.il' });
    assert.doesNotMatch(html, /href="#i-star"/, mode);
    assert.doesNotMatch(html, /<symbol id="i-star"/, `${mode}: the unused star symbol is gone from the shared sprite`);
    assert.doesNotMatch(html, /[★☆⭐]/u, mode);
    assert.match(html, /4\.9 \(37\)/, `${mode}: the review context text still shows`);
  }
});
