// Site Bot header logo: the trade descriptor line, the weak-name flags and the staff display overrides (Eitan 2026-11-17;
// Yonatan's SEO conditions). HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Names come from testdata/logo-names.json,
// labels from docs/copy/logo-trade-descriptor-FINAL-2026-11-17.json, niches from the trade-term file, cities from
// data/sites/test-plumber-tlv.json (all read-only); composed names are slices of those strings.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { renderResearchedSitePages } from './researchedSite';
import { lookFixtureParams } from './siteLook.testkit';
import type { SiteLook } from './siteLook';
import {
  brandLogo, cleanDisplayOverrides, DESCRIPTOR_MIN_CONTRAST, descriptorInk, descriptorPhoneFit, generatedLogo, logoDescriptor,
  logoNameFlags, pickLogo, PHONE_NAME_PX, TRADE_DESCRIPTORS, type GeneratedLogoVariant,
} from './siteLogo';
import { contrastRatio, LOGO_TRADES, tradeTermsOf, type LogoTrade } from './logoMarks';
import { VERTICAL_THEMES } from './verticalThemes';

const ROOT = path.resolve(__dirname, '../../..');
const FINAL = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/copy/logo-trade-descriptor-FINAL-2026-11-17.json'), 'utf8')) as { descriptors: Record<string, string> };
const NAMES = JSON.parse(fs.readFileSync(path.join(ROOT, 'testdata/logo-names.json'), 'utf8')) as Array<{ name: string; fable: number }>;
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sites/test-plumber-tlv.json'), 'utf8')).collectedData as { targetLocation: string; specificCities: string };
const fable = (n: number) => NAMES.find(item => item.fable === n)!.name;
const words = (text: string) => text.split(' ');
const niche = (trade: LogoTrade) => tradeTermsOf(trade)[0];
const TLV = SITE.targetLocation;
const OTHER_CITIES = SITE.specificCities.split(',').map(city => city.trim()).filter(city => city && city !== TLV);
/** The city inside fable 1's last word (one prefix letter + the city). */
const CITY_IN_NAME_1 = words(fable(1))[2].slice(1);

test('labels: byte-exact copy of the FINAL file, one per approved trade', () => {
  assert.deepEqual({ ...TRADE_DESCRIPTORS }, FINAL.descriptors);
  assert.deepEqual(Object.keys(TRADE_DESCRIPTORS).sort(), [...LOGO_TRADES].sort());
});

test('descriptor: no confident trade = none; trade in the name = none; name without trade word = label + city', () => {
  assert.equal(pickLogo(fable(5), { city: TLV })!.descriptor, null, 'no niche: no trade');
  assert.equal(pickLogo(fable(1), { businessNiche: niche('plumber'), city: CITY_IN_NAME_1 })!.descriptor, null, 'trade + city in the name');
  assert.equal(pickLogo(fable(4), { businessNiche: niche('electrician'), city: TLV })!.descriptor, null, 'trade stem in the name');
  assert.equal(pickLogo(fable(13), { businessNiche: niche('locksmith'), city: TLV })!.descriptor, null);
  assert.deepEqual(pickLogo(fable(5), { businessNiche: niche('plumber'), city: TLV })!.descriptor, { label: TRADE_DESCRIPTORS.plumber, city: TLV });
  assert.deepEqual(pickLogo(fable(6), { businessNiche: niche('plumber'), city: TLV })!.descriptor, { label: TRADE_DESCRIPTORS.plumber, city: TLV });
  // Multi-word labels (painter, flooring) and no city.
  assert.deepEqual(logoDescriptor(fable(5), 'painter', undefined), { label: TRADE_DESCRIPTORS.painter, city: null });
  assert.deepEqual(logoDescriptor(fable(5), 'flooring-tiler', ' '), { label: TRADE_DESCRIPTORS['flooring-tiler'], city: null });
});

test('descriptor: the repeated part is dropped (city in the name), the label in the name skips it', () => {
  const withCity = `${fable(5)} ${words(fable(1))[2]}`;
  assert.deepEqual(logoDescriptor(withCity, 'plumber', CITY_IN_NAME_1), { label: TRADE_DESCRIPTORS.plumber, city: null });
  const multiWordCity = OTHER_CITIES.find(city => city.includes(' '));
  if (multiWordCity) assert.deepEqual(logoDescriptor(`${fable(5)} ${multiWordCity}`, 'plumber', multiWordCity), { label: TRADE_DESCRIPTORS.plumber, city: null });
  for (const trade of LOGO_TRADES) assert.equal(logoDescriptor(`${words(fable(5))[0]} ${TRADE_DESCRIPTORS[trade]}`, trade, TLV), null, trade);
});

test('overrides: descriptor off / on, lead words; the business name never changes', () => {
  const name = fable(5);
  const context = { businessNiche: niche('plumber'), city: TLV };
  assert.equal(pickLogo(name, { ...context, display: { descriptor: false } })!.descriptor, null);
  // on: shown even when the name names the trade (the city rule still applies).
  assert.deepEqual(pickLogo(fable(1), { businessNiche: niche('plumber'), city: CITY_IN_NAME_1, display: { descriptor: true } })!.descriptor, { label: TRADE_DESCRIPTORS.plumber, city: null });
  const long = fable(8);
  const two = pickLogo(long, { ...context, display: { leadWords: 2 } })!;
  assert.equal(two.lead, words(long).slice(0, 2).join(' '));
  assert.equal(two.text, long);
  assert.equal(pickLogo(long, { ...context, display: { leadWords: 99 } })!.lead, words(long)[0], 'out of range = default split');
  assert.deepEqual(cleanDisplayOverrides({ descriptor: true, leadWords: 2, businessName: 'x', by: 'y' }), { descriptor: true, leadWords: 2 });
  assert.equal(cleanDisplayOverrides({ leadWords: 0, descriptor: 'yes' }), null);
  // The lockup override renders the full name, byte-identical, with the staff lead in bold.
  const pick = pickLogo(fable(12), { display: { leadWords: 1 } })!;
  const html = generatedLogo('lockup', fable(12), { display: { leadWords: 1 } })!.html;
  assert.ok(html.includes(`>${pick.lead}</bdi>`));
  assert.equal(html.replace(/<span class="logo-desc">[\s\S]*$/, '').replace(/<[^>]+>/g, ''), fable(12).replace(/&/g, '&amp;'));
});

test('flags: single short token, English-only, vague, very long, no trade shown', () => {
  assert.deepEqual(logoNameFlags(fable(9), { businessNiche: niche('plumber') }), ['single-short-token']);
  assert.deepEqual(logoNameFlags(fable(6), { businessNiche: niche('plumber') }), ['single-short-token', 'english-only']);
  assert.deepEqual(logoNameFlags(fable(8), { businessNiche: niche('plumber') }), ['very-long']);
  assert.deepEqual(logoNameFlags(fable(15), { businessNiche: niche('plumber') }), ['english-only', 'very-long']);
  assert.deepEqual(logoNameFlags(fable(1), { businessNiche: niche('plumber') }), []);
  assert.deepEqual(logoNameFlags(fable(5), {}), ['no-trade-shown']);
  // A generic lead word (the second-listed GENERIC_LEADS word, read from fable 3) + a coined word: vague.
  const vague = `${words(fable(3))[0]} ${words(fable(5))[1]}`;
  assert.ok(logoNameFlags(vague, { businessNiche: niche('plumber') }).includes('vague'));
  assert.ok(!logoNameFlags(fable(3), { businessNiche: niche('plumber') }).includes('vague'), 'generic lead + a trade word is not vague');
});

test('phone: the descriptor never changes the name layout; city dropped first, then the whole line', () => {
  const context = { businessNiche: niche('plumber'), city: TLV, siteId: 's' };
  for (const variant of ['lockup', 'icon', 'monogram', 'name'] as GeneratedLogoVariant[]) {
    const on = generatedLogo(variant, fable(5), context);
    const off = generatedLogo(variant, fable(5), { ...context, display: { descriptor: false } });
    if (!on || !off) continue;
    assert.ok(on.css.startsWith(off.css), `${variant}: the name / mark CSS is the same with the descriptor`);
    assert.ok(on.html.includes('class="logo-desc"'), variant);
  }
  const d = { label: TRADE_DESCRIPTORS.plumber, city: TLV };
  assert.equal(descriptorPhoneFit(d, '18-1', PHONE_NAME_PX), 'full');
  assert.equal(descriptorPhoneFit(d, '13-2', PHONE_NAME_PX), 'none');
  assert.equal(descriptorPhoneFit(d, 'clamp', PHONE_NAME_PX), 'none');
  assert.equal(descriptorPhoneFit(d, '15-2', 80), 'label');
  assert.equal(descriptorPhoneFit(d, '15-2', 40), 'none');
  const clamped = generatedLogo('icon', fable(8), { ...context, display: { descriptor: true } })!;
  assert.match(clamped.css, /@media \(max-width:\d+px\)\{\.logo-desc\{display:none;\}\}/);
});

test('phone tiers (verifier FAIL on ddc6f38): the name bar is in the budget; a 320px tier only hides more of the descriptor', () => {
  // The plain variant's 14px accent bar comes out of the 128px budget: these names wrapped / overflowed at 360px.
  assert.equal(pickLogo(fable(2), {})!.layouts.name.step, '15-2');
  assert.equal(pickLogo(fable(11), {})!.layouts.name.step, '16-1');
  // Three lines at 13px / four at 12px come before the clamp: a long name renders whole instead of being cut.
  assert.equal(pickLogo(fable(15), {})!.layouts.name.step, '13-3');
  assert.equal(pickLogo(fable(8), {})!.layouts.name.step, '13-3');
  const context = { businessNiche: niche('plumber'), city: TLV, siteId: 's' };
  let tiers = 0;
  for (const row of NAMES.filter(item => item.name)) {
    for (const variant of ['lockup', 'icon', 'monogram', 'name'] as GeneratedLogoVariant[]) {
      for (const display of [{}, { descriptor: true }, { descriptor: false }]) {
        const logo = generatedLogo(variant, row.name, { ...context, display });
        if (!logo) continue;
        const where = `${row.fable}/${variant}/${JSON.stringify(display)}`;
        assert.match(logo.css, /@media \(max-width:899px\)\{\.brand\.has-logo\{container-type:inline-size;\}\}/, `${where}: the brand box is the container`);
        assert.doesNotMatch(logo.css, /</, `${where}: no '<' in the CSS (the style block stays parseable)`);
        for (const block of logo.css.match(/@container \(max-width:129\.98px\)\{(?:[^{}]*\{[^{}]*\})*\}/g) ?? []) {
          tiers += 1;
          assert.doesNotMatch(block, /\.logo-desc(?:-city)?\{display:(?:block|inline)/, `${where}: a narrower tier never shows more of the descriptor`);
          if (!logoNameFlags(row.name).includes('very-long')) assert.doesNotMatch(block, /line-clamp:2/, `${where}: the 320px tier clamps only a very-long name (13px / 12px multi-line steps first)`);
        }
      }
    }
  }
  assert.ok(tiers > 20, `tier blocks seen: ${tiers}`);
});

test('desktop: the descriptor ink reaches 4.5:1 on the header surface in every theme', () => {
  for (const [key, theme] of Object.entries(VERTICAL_THEMES)) {
    const ink = descriptorInk({ primary: theme.primary, accent: theme.accent, surface: theme.surface, muted: theme.textMuted });
    assert.ok(contrastRatio(ink, theme.surface) >= DESCRIPTOR_MIN_CONTRAST, key);
  }
});

// ── Rendered site: Yonatan's SEO conditions, city == schema areaServed[0] ──────
function site(look: SiteLook, name = fable(5), serviceArea: string[] = [TLV, ...OTHER_CITIES]) {
  const params = lookFixtureParams();
  params.data = { ...params.data, businessName: name, businessNiche: niche('plumber') };
  params.pages = params.pages.map(page => (page.classification === 'homepage' ? { ...page, seo: { ...page.seo!, serviceArea } } : page));
  return renderResearchedSitePages({ ...params, look });
}
const HEADER = /<header class="site-hdr">[\s\S]*?<\/header>/;
const LOGO_STYLE = /  <style>\.brand\.has-logo\{[^<]*<\/style>\n/;
const outside = (html: string) => html.replace(HEADER, '').replace(LOGO_STYLE, '');
const LOCKUP: SiteLook = { logo: { approved: true, kind: 'generated', variant: 'lockup' } };

test('SEO: the descriptor is header text only: title, meta, og, JSON-LD and every heading are identical without it', () => {
  const on = site(LOCKUP);
  const off = site({ ...LOCKUP, logoDisplay: { descriptor: false } });
  for (const file of Object.keys(on).filter(file => file.endsWith('.html'))) {
    assert.equal(outside(on[file]), outside(off[file]), `${file}: nothing outside the header changes`);
    const header = HEADER.exec(on[file])?.[0];
    if (!header) continue;
    assert.ok(header.includes(`<span class="logo-desc">${TRADE_DESCRIPTORS.plumber}`), `${file}: the descriptor renders`);
    assert.doesNotMatch(header, /<h[1-6]\b/, `${file}: never a heading`);
    assert.doesNotMatch(/<a class="brand[^"]*"[^>]*>/.exec(header)![0], /aria-label/, `${file}: no aria-label on the logo link`);
    const desc = header.slice(header.indexOf('<span class="logo-desc">'), header.indexOf('</a>'));
    assert.equal(desc.match(/aria-hidden/g)?.length, 1, 'only the separator is aria-hidden');
    assert.match(desc, /<span aria-hidden="true"> · <\/span>/);
    assert.ok(!/og:site_name/.test(on[file]) || !/og:site_name" content="[^"]*·/.test(on[file]));
  }
  // JSON-LD: the business name is exactly businessName.
  const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(on['index.html'])![1]);
  const business = (ld['@graph'] ?? [ld]).find((node: Record<string, unknown>) => node['@id'] && String(node['@id']).endsWith('#business'));
  assert.equal(business.name, fable(5));
});

test('city: the header city is the homepage LocalBusiness areaServed[0], on every page', () => {
  for (const areas of [[TLV, ...OTHER_CITIES], [...OTHER_CITIES, TLV]]) {
    const on = site(LOCKUP, fable(5), areas);
    const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(on['index.html'])![1]);
    const business = (ld['@graph'] ?? [ld]).find((node: Record<string, unknown>) => String(node['@id'] ?? '').endsWith('#business'));
    const first = business.areaServed[0].name;
    assert.equal(first, areas[0]);
    for (const file of ['index.html', 'services/alpha-repair.html', 'contact.html']) {
      const city = /<span class="logo-desc-city"><span aria-hidden="true">[^<]*<\/span>([^<]*)<\/span>/.exec(HEADER.exec(on[file])![0])?.[1];
      assert.equal(city, first, file);
    }
  }
});

test('owner file logo: the svg aria-label stays the business name; the descriptor follows as real text', () => {
  const on = site({ logo: { approved: true, kind: 'file', src: '/img/logo-0123456789ab.webp', width: 120, height: 40 } });
  const header = HEADER.exec(on['index.html'])![0];
  assert.match(header, new RegExp(`<svg data-logo="file" role="img" aria-label="${fable(5)}"`));
  assert.match(header, /<\/svg> <span class="logo-desc">/);
});

test('no look / unapproved logo: the header has no descriptor', () => {
  for (const look of [{}, { logo: { approved: false, kind: 'generated', variant: 'lockup' } }, { logoDisplay: { descriptor: true } }] as SiteLook[]) {
    assert.doesNotMatch(site(look)['index.html'], /logo-desc/);
  }
  assert.equal(brandLogo(undefined, fable(5), { businessNiche: niche('plumber'), city: TLV }), undefined);
});

test('GBP: no Business Profile code path reads the logo / descriptor module', () => {
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  const gbpFiles = [...walk(path.join(ROOT, 'src/lib/gbp')), ...walk(path.join(ROOT, 'src/app/api/site-bot')).filter(file => /gbp/i.test(file))];
  for (const file of gbpFiles) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /siteLogo|TRADE_DESCRIPTORS|logoDescriptor/, path.relative(ROOT, file));
});
