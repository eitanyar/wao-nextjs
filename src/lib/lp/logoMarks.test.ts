// Site Bot logo marks (approved 2026-11-17): library, trade detection, pick, colour, and the no-tile header markup.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. Hebrew inputs are read from logoMarks/trade-terms.generated.json
// (copied by script from repo files) and from the read-only data/sites/test-plumber-tlv.json record.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  APPROVED_MARK_IDS, approvedMarkId, chooseMarkId, contrastRatio, detectLogoTrade, LOGO_MARK_LIBRARY, LOGO_TRADES, logoTradeOf,
  MARK_INK, MARK_MIN_CONTRAST, markColors, markInk, parseHex, stableHash, tradesNamedIn, type LogoTrade,
} from './logoMarks';
import { brandLogo, generatedLogo, isLogoMarkId, MARK_DESKTOP, MARK_PHONE, markBox, pickLogo } from './siteLogo';
import { renderResearchedSitePages } from './researchedSite';
import { lookFixtureParams } from './siteLook.testkit';
import { VERTICAL_THEMES } from './verticalThemes';

const ROOT = path.resolve(__dirname, '../../..');
const readJson = (relative: string) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
const APPROVED = readJson('src/lib/lp/logoMarks/approved-picks-2026-11-17.json') as { trades: Record<string, string[]> };
const TERMS = readJson('src/lib/lp/logoMarks/trade-terms.generated.json') as { excludes: Array<{ term: string; source: string }>; trades: Record<string, Array<{ term: string; source: string }>> };
const term = (trade: LogoTrade, index = 0) => TERMS.trades[trade][index].term;
const WHITE = '#FFFFFF';
const LATIN = 'AquaFix';

// ── Library ──────────────────────────────────────────────────────────────────

test('library: exactly the approved ids, each under its own trade, all three paints, no fallback colours, no scripts', () => {
  const approvedIds = Object.values(APPROVED.trades).flat();
  assert.equal(approvedIds.length, 198);
  assert.deepEqual(Object.keys(LOGO_MARK_LIBRARY).sort(), [...approvedIds].sort());
  assert.deepEqual([...LOGO_TRADES].sort(), Object.keys(APPROVED.trades).sort());
  for (const [trade, ids] of Object.entries(APPROVED.trades)) {
    for (const id of ids) {
      const mark = LOGO_MARK_LIBRARY[id];
      assert.equal(mark.trade, trade, id);
      assert.match(mark.viewBox, /^0 0 \d+ \d+$/, id);
      assert.match(mark.body, /var\(--mark-primary\)/, id);
      assert.doesNotMatch(mark.body, /#[0-9a-f]{3,6}|<script|<image|href=|style=|transform=/i, `${id}: only var() paints and plain paths`);
      assert.match(mark.body, /^(?:<path fill="var\(--mark-(?:primary|accent|paper)\)" d="[Mmlcz0-9 -]+"\/>|<g fill="var\(--mark-(?:primary|accent|paper)\)">(?:<path d="[Mmlcz0-9 -]+"\/>)+<\/g>)+$/, `${id}: optimised shape`);
    }
  }
});

test('library: the generated files are current with the approved SVGs (build script --check)', () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-logo-marks.mjs'), '--check'], { encoding: 'utf8' });
  assert.match(out, /generated files are current/);
});

test('library: approved-only lookup; legacy prefixed ids resolve, unknown / unapproved ids never do', () => {
  assert.equal(approvedMarkId('plumber-3'), 'plumber-3');
  assert.equal(approvedMarkId('emergency-trades:plumber-3'), 'plumber-3');
  assert.equal(approvedMarkId('plumber-2'), null, 'plumber-2 is drawn but not approved');
  assert.equal(approvedMarkId('emergency-trades:plumber-01'), null);
  assert.equal(approvedMarkId(''), null);
  assert.equal(approvedMarkId(42), null);
  assert.equal(isLogoMarkId('plumber-3'), true);
  assert.equal(isLogoMarkId('emergency-trades:plumber-01'), true, 'well-formed legacy ids still load (then are ignored)');
  assert.equal(isLogoMarkId('../x'), false);
});

// ── Trade detection ──────────────────────────────────────────────────────────

test('trade terms: every term is copied byte-exact from its declared source file', () => {
  const sources = new Map<string, unknown>();
  const load = (file: string) => { if (!sources.has(file)) sources.set(file, readJson(file)); return sources.get(file) as never; };
  const resolve = (source: string): string => {
    const [file, locator] = source.split('#');
    const data = load(file) as unknown;
    if (file.endsWith('gbp-categories-il.json')) {
      const [id, key] = [locator.slice(0, locator.lastIndexOf('.')), locator.slice(locator.lastIndexOf('.') + 1)];
      const category = (data as Array<Record<string, unknown>>).find(item => item.categoryId === id)!;
      const m = /^synonyms\[(\d+)\]$/.exec(key);
      return m ? (category.synonyms as string[])[Number(m[1])] : category[key] as string;
    }
    if (file.endsWith('professions.json')) {
      const [slug, key] = locator.split('.');
      const profession = (data as { professions: Array<Record<string, unknown>> }).professions.find(item => item.slug === slug)!;
      const m = /^terms\[(\d+)\]$/.exec(key);
      return m ? (profession.terms as string[])[Number(m[1])] : profession[key] as string;
    }
    const m = /^(\w+)\[(\d+)\]$/.exec(locator)!;
    return (data as Record<string, string[]>)[m[1]][Number(m[2])];
  };
  let count = 0;
  for (const entries of [...Object.values(TERMS.trades), TERMS.excludes]) {
    for (const entry of entries) { assert.equal(resolve(entry.source).trim(), entry.term, entry.source); count++; }
  }
  assert.ok(count > 300);
});

test('trade detection: every term names its own trade, confidently', () => {
  for (const trade of LOGO_TRADES) {
    for (const { term: text } of TERMS.trades[trade]) assert.equal(detectLogoTrade(text), trade, `${trade}: ${text}`);
  }
  // Prefix letter and surrounding words are fine; inflection after a 4+ letter term is fine.
  const plumber = term('plumber');
  assert.equal(detectLogoTrade(`\u05D4${plumber}`), 'plumber', 'one attached prefix letter');
  assert.equal(detectLogoTrade(`${LATIN} ${plumber} 24/7`), 'plumber');
  assert.equal(detectLogoTrade(`${plumber}\u05D9\u05DD`), 'plumber', 'plural suffix on a long term');
});

test('trade detection: confident-or-nothing (none, two trades, inside another word)', () => {
  assert.equal(detectLogoTrade(''), null);
  assert.equal(detectLogoTrade(undefined), null);
  assert.equal(detectLogoTrade('consulting'), null);
  const two = `${term('plumber')} ${term('electrician')}`;
  assert.deepEqual(tradesNamedIn(two), ['electrician', 'plumber']);
  assert.equal(detectLogoTrade(two), null, 'two trades named: no mark');
  assert.equal(detectLogoTrade(`\u05D0\u05D0${term('plumber')}`), null, 'a term glued inside a longer word does not count');
  // The niche decides; the service is read only when the niche names no trade.
  assert.equal(logoTradeOf({ businessNiche: 'zzz', primaryService: term('locksmith') }), 'locksmith');
  assert.equal(logoTradeOf({ businessNiche: term('gardener'), primaryService: term('locksmith') }), 'gardener');
  assert.equal(logoTradeOf({ businessNiche: two, primaryService: term('locksmith') }), null, 'an ambiguous niche is not rescued by the service');
});

test('trade detection: exclusion spans and longer-match subsumption', () => {
  // licenseExclude[13] is the car-electrician phrase: the electrician term inside it is dropped.
  const carElectric = TERMS.excludes.find(entry => entry.source.endsWith('licenseExclude[13]'))!.term;
  assert.ok(tradesNamedIn(carElectric).every(trade => trade !== 'electrician'), 'car electrician is not the electrician mark');
  // Every unmapped GBP category name is an exclusion: none of them is confidently a trade unless it IS a trade term.
  const tradeTerms = new Set(Object.values(TERMS.trades).flat().map(entry => entry.term));
  for (const entry of TERMS.excludes.filter(item => item.source.startsWith('src/data/gbp-categories-il.json'))) {
    if (tradeTerms.has(entry.term)) continue;
    assert.equal(detectLogoTrade(entry.term), null, `${entry.source}: ${entry.term}`);
  }
  // The real fixture site (a plumber) is detected.
  const record = readJson('data/sites/test-plumber-tlv.json') as { collectedData: { businessNiche: string } };
  assert.equal(logoTradeOf(record.collectedData), 'plumber');
});

// ── Pick ─────────────────────────────────────────────────────────────────────

test('pick: deterministic per site over the approved list; stored approved id wins; stored unapproved id is ignored', () => {
  assert.equal(stableHash('abc'), 440920331, 'FNV-1a 32');
  for (const trade of LOGO_TRADES) {
    const ids = APPROVED_MARK_IDS[trade];
    for (const site of ['a', 'b', 'yossi-plumber', 'x'.repeat(40)]) {
      const id = chooseMarkId(trade, site);
      assert.equal(id, ids[stableHash(site) % ids.length]);
      assert.equal(chooseMarkId(trade, site), id, 'same site, same mark');
      assert.ok(ids.includes(id!), `${trade}: approved only`);
    }
  }
  const spread = new Set(Array.from({ length: 60 }, (_, k) => chooseMarkId('locksmith', `site-${k}`)));
  assert.ok(spread.size >= 4, 'different sites get different marks');
  assert.equal(chooseMarkId('plumber', 'any', 'gardener-1'), 'gardener-1', 'a stored approved choice wins');
  assert.equal(chooseMarkId('plumber', 'any', 'plumber-2'), chooseMarkId('plumber', 'any'), 'an unapproved stored id is ignored');
  assert.equal(chooseMarkId(null, 'any'), null);
  assert.equal(chooseMarkId(null, 'any', 'upholstery-2'), 'upholstery-2', 'staff may store a mark for an undetected trade');
});

// ── Colour ───────────────────────────────────────────────────────────────────

test('contrast: theme colours that pass stay as-is; a pale colour is darkened in the same hue to >= 3:1', () => {
  assert.equal(contrastRatio('#000000', WHITE).toFixed(1), '21.0');
  const navy = markInk('#1B3A5C', WHITE);
  assert.deepEqual([navy.color, navy.method], ['#1B3A5C', 'as-is']);
  for (const pale of ['#9FD3F5', '#FFE066', '#F7C6D9', '#2ECC71', '#FF6B35']) {
    const ink = markInk(pale, WHITE);
    assert.equal(ink.method, 'darkened', pale);
    assert.ok(contrastRatio(ink.color, WHITE) >= MARK_MIN_CONTRAST, `${pale} -> ${ink.color}`);
    assert.ok(contrastRatio(ink.color, WHITE) < MARK_MIN_CONTRAST + 0.15, `${pale}: darkened no further than needed`);
    const hue = (hex: string) => { const [r, g, b] = parseHex(hex)!.map(v => v / 255); const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
      const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; return h * 60; };
    assert.ok(Math.abs(hue(ink.color) - hue(pale)) < 4, `${pale}: same hue (${hue(pale).toFixed(1)} -> ${hue(ink.color).toFixed(1)})`);
    assert.deepEqual(markInk(pale, WHITE), ink, 'deterministic');
  }
  // Grey has no hue: darkened grey. An impossible case (a mid-grey bar) ends at the near-black ink.
  assert.equal(markInk('#EEEEEE', WHITE).method, 'darkened');
  assert.equal(markInk('#777777', '#555555').color, MARK_INK);
  assert.equal(markInk('not-a-colour', WHITE).color, MARK_INK);
  const colors = markColors({ primary: '#A8D8EA', accent: '#FFD166', surface: WHITE });
  assert.ok(colors.primary.contrast >= 3 && colors.accent.contrast >= 3);
});

// ── Markup ───────────────────────────────────────────────────────────────────

const NICHE = { businessNiche: '', siteId: 'mark-site' };
const pale = { primary: '#9FD3F5', accent: '#FFE066', surface: WHITE };

test('markup: the mark sits on the bar with NO tile; the inks are set, the paper is the surface; one mark inlined', () => {
  const context = { ...NICHE, businessNiche: term('plumber'), colors: pale };
  const pick = pickLogo(LATIN, context)!;
  assert.equal(pick.trade, 'plumber');
  assert.ok(APPROVED_MARK_IDS.plumber.includes(pick.markId!));
  assert.equal(pick.defaultVariant, 'icon');
  const logo = generatedLogo('icon', LATIN, context)!;
  assert.doesNotMatch(logo.html, /logo-tile/);
  assert.doesNotMatch(logo.css, /logo-tile/);
  const markRule = /\.logo-mark\{[^}]*\}/.exec(logo.css)![0];
  assert.doesNotMatch(markRule, /background|border|border-radius|padding|box-shadow/, 'nothing painted behind the mark');
  assert.match(markRule, /--mark-paper:var\(--surface\)/);
  const inks = markColors(pale);
  assert.ok(markRule.includes(`--mark-primary:${inks.primary.color}`) && markRule.includes(`--mark-accent:${inks.accent.color}`));
  assert.equal((logo.html.match(/<svg/g) ?? []).length, 1, 'only the one chosen mark');
  assert.match(logo.html, new RegExp(`<svg class="logo-mark" data-mark="${pick.markId}" viewBox="[^"]+" aria-hidden="true" focusable="false">`));
  assert.ok(logo.html.includes(LOGO_MARK_LIBRARY[pick.markId!].body));
  // Desktop box ~40px tall (wide marks capped), phone box smaller.
  const desktop = markBox(LOGO_MARK_LIBRARY[pick.markId!], MARK_DESKTOP);
  const phone = markBox(LOGO_MARK_LIBRARY[pick.markId!], MARK_PHONE);
  assert.ok(desktop.height <= 40 && desktop.height >= 20 && phone.height < desktop.height);
  assert.ok(logo.css.includes(`width:${desktop.width}px;height:${desktop.height}px`));
});

test('markup: the phone rule (the mark hides when the name does not fit beside it); every mark box fits the header line', () => {
  const context = { ...NICHE, businessNiche: term('plumber'), colors: pale };
  const short = generatedLogo('icon', 'Ab', context)!;
  assert.doesNotMatch(short.css, /max-width:\d+px\)\{\.logo-mark\{display:none;\}/);
  const long = generatedLogo('icon', 'Alphabetical Engineering Solutions Unlimited International', context)!;
  assert.match(long.css, /\.logo-mark\{display:none;\}/);
  for (const [id, mark] of Object.entries(LOGO_MARK_LIBRARY)) {
    const d = markBox(mark, MARK_DESKTOP); const p = markBox(mark, MARK_PHONE);
    assert.ok(d.height <= 40 && d.width <= 56 && p.height <= 32 && p.width <= 44, id);
    assert.ok(d.height >= 24, `${id}: legible height on desktop (${d.height})`);
  }
});

test('markup: the monogram keeps its tile; no confident trade = no mark (legacy sprite fallback only for trade verticals)', () => {
  const mono = generatedLogo('monogram', LATIN, { ...NICHE, businessNiche: term('plumber') })!;
  assert.match(mono.html, /logo-tile/);
  const none = pickLogo(LATIN, { ...NICHE, businessNiche: 'zzz' })!;
  assert.equal(none.markId, null);
  assert.equal(none.options.includes('icon'), false);
  // A stored approved mark makes the icon variant available even when the trade is not detected.
  const stored = brandLogo({ logo: { approved: true, kind: 'generated', variant: 'icon', markId: 'upholstery-2' } }, LATIN, { ...NICHE, businessNiche: 'zzz', colors: pale })!;
  assert.match(stored.html, /data-mark="upholstery-2"/);
  // A stored but unapproved id falls back to the deterministic pick (never renders the unapproved drawing).
  const fallback = brandLogo({ logo: { approved: true, kind: 'generated', variant: 'icon', markId: 'plumber-2' } }, LATIN, { ...NICHE, businessNiche: term('plumber'), colors: pale })!;
  assert.match(fallback.html, new RegExp(`data-mark="${chooseMarkId('plumber', NICHE.siteId)}"`));
});

test('site: an approved icon look renders one mark per page, the same on every page; no look stays without a mark', () => {
  const params = lookFixtureParams();
  const withMark = renderResearchedSitePages({ ...params, look: { logo: { approved: true, kind: 'generated', variant: 'icon' } } });
  const expected = chooseMarkId('plumber', params.slug);
  // The header pages carry the logo; the legal pages and the 404 have no site header logo (unchanged by the look).
  const pages = Object.entries(withMark).filter(([name, html]) => name.endsWith('.html') && /class="brand has-logo"/.test(html));
  assert.deepEqual(pages.map(([name]) => name).sort(), ['contact.html', 'index.html', 'services/alpha-repair.html', 'services/gamma.html']);
  for (const [name, html] of pages) {
    assert.equal((html.match(/class="logo-mark"/g) ?? []).length, 1, name);
    assert.ok(html.includes(`data-mark="${expected}"`), `${name}: ${expected}`);
    assert.equal((html.match(/var\(--mark-primary\)/g) ?? []).length > 0, true);
  }
  const theme = VERTICAL_THEMES['emergency-trades'];
  assert.ok(pages[0][1].includes(`--mark-primary:${markColors(theme).primary.color}`));
  const without = renderResearchedSitePages(params);
  for (const [name, html] of Object.entries(without)) assert.doesNotMatch(html, /logo-mark|--mark-/, name);
});
