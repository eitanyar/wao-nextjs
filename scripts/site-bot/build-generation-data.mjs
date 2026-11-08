#!/usr/bin/env node
// Paid-journey v2 M2a.2/M2a.3: copies the Hebrew generation data (Noa / Yonatan, 2026-11-08) out
// of docs/copy/site-bot-generation-data.md into src/lib/lp/generationData.ts, byte-exact.
//
// - Every value is parsed straight out of the fenced ~~~json blocks, with asserted counts:
//   M2a.2 sections 1-5 (dayLetters, claimTokens, serviceLabelPins, typographyRule,
//   contactTitlePrefix) and M2a.3 sections 6-13 (claimTokenWordEnd, fixTimeLeadTokens,
//   fixTimeWithinWords, arrivalTokens, paraphraseGuard, pluralAddressTokens, weTokens,
//   waoServiceTerms, thermalTokens, templateStrings).
// - M2a.4: sections 14-15 (sameDayTokens, sameDayFinishVerbs, priceLockTokens) and the section 10
//   prefix note (Noa M2a.3): each plural-address token's prefix mode ('vav' or 'full') is parsed from
//   the note's bullets, with every token asserted to be in exactly one bullet.
// - M2a.4 round 2: sections 16-18 (serviceArea tail/head/region/nearby tokens, free tokens / callout
//   tokens / scope nouns, weFormVerbs). From the prose notes: the head tokens that take a lamed before
//   the place (section 16) and the words that exclude a free hit when they follow it (section 17).
// - M2a.3: section 8 replaces the section 2 prose arrival list and section 9 replaces the
//   M2a.2 repo-derived paraphrase guard; GUARD_TOKEN_SOURCES records where each list came from.
// - The generated module escapes every non-ASCII character as \uXXXX, so it holds ZERO
//   Hebrew bytes; the runtime values are the real characters.
// This file has no Hebrew literals. Idempotent.
//   node scripts/site-bot/build-generation-data.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
export const DATA_PATH = 'docs/copy/site-bot-generation-data.md';
const OUT = path.join(ROOT, 'src/lib/lp/generationData.ts');

function assert(condition, message) {
  if (!condition) throw new Error(`build-generation-data: ${message}`);
}

/** Every ~~~json block in the file, parsed. */
export function jsonBlocks(text) {
  const blocks = [];
  const re = /\n~~~json\n([\s\S]*?)\n~~~/g;
  let match;
  while ((match = re.exec(text))) blocks.push(JSON.parse(match[1]));
  return blocks;
}

/** Expected entry counts per data list (asserted; a data edit must update these deliberately). */
export const EXPECTED_COUNTS = {
  jsonBlocks: 23,
  claimKinds: 11,
  claimTokens: 59,
  claimTokenWordEnd: 3,
  fixTimeLeadTokens: 2,
  fixTimeWithinWords: 28,
  arrivalTokens: 6,
  customerStems: 4,
  speechVerbs: 14,
  pluralAddressTokens: 22,
  weTokens: 10,
  waoServiceTerms: 9,
  thermalTokens: 2,
  templateStrings: 2,
  sameDayTokens: 10,
  sameDayFinishVerbs: 9,
  priceLockTokens: 23,
  pluralPrefixModes: 31,
  pluralPrefixVav: 13,
  pluralPrefixFull: 18,
  serviceAreaTailTokens: 11,
  serviceAreaHeadTokens: 6,
  serviceAreaRegionTokens: 18,
  serviceAreaNearbyTokens: 16,
  serviceAreaLamedHeads: 2,
  freeTokens: 22,
  freeCalloutTokens: 9,
  freeScopeClasses: 6,
  freeScopeNouns: 29,
  freeExclusionWords: 5,
  weFormVerbs: 64,
};

/** Text of one data-file section (from its "## N." heading to the next heading). */
function sectionText(text, number) {
  const start = text.indexOf(`\n## ${number}.`);
  assert(start >= 0, `section ${number} missing`);
  const end = text.indexOf('\n## ', start + 1);
  return text.slice(start, end < 0 ? text.length : end);
}

/** Quoted single Hebrew words in a piece of prose. */
function quotedWords(prose) {
  return [...prose.matchAll(/"([\u0590-\u05FF]+)"/g)].map(match => match[1]);
}

/** Section 16 note: the head tokens after which the place takes a lamed. */
export function lamedHeads(text) {
  const line = sectionText(text, 16).split('\n').find(item => item.startsWith('- `serviceAreaHeadTokens`'));
  assert(line, 'section 16 head-token note missing');
  const at = line.indexOf('the place takes a lamed');
  assert(at >= 0, 'section 16 lamed note missing');
  const words = quotedWords(line.slice(line.lastIndexOf('After', at), at));
  assert(words.length === EXPECTED_COUNTS.serviceAreaLamedHeads, `expected ${EXPECTED_COUNTS.serviceAreaLamedHeads} lamed heads, got ${words.length}`);
  return words;
}

/** Section 17 note: words that, following a free token, make it not a free hit. */
export function freeExclusionWords(text) {
  const line = sectionText(text, 17).split('\n').find(item => item.startsWith('- `freeTokens`'));
  assert(line, 'section 17 freeTokens note missing');
  const from = line.indexOf('Exclusion:');
  const to = line.indexOf('it is not a free hit', from);
  assert(from >= 0 && to > from, 'section 17 exclusion note missing');
  const words = quotedWords(line.slice(from, to));
  assert(words.length === EXPECTED_COUNTS.freeExclusionWords, `expected ${EXPECTED_COUNTS.freeExclusionWords} free exclusion words, got ${words.length}`);
  return words;
}

/** M2a.3 tokens of the plural-address list in copyGates.config.ts (before the section 10 additions). */
export const M2A1_PLURAL_TOKEN_COUNT = 9;

/**
 * Section 10 prefix note (Noa M2a.3): one bullet per prefix class. A bullet that says "vav prefix only"
 * gives 'vav'; "full prefix set" gives 'full'. The tokens are the quoted single words of the bullet
 * (quoted phrases with a space, like the "customers who called" example, are not tokens).
 */
export function pluralPrefixModes(text) {
  const start = text.indexOf('\n## 10.');
  assert(start >= 0, 'section 10 missing');
  const section = text.slice(start, text.indexOf('\n## ', start + 1));
  const noteAt = section.indexOf('Prefix note for pluralAddressTokens');
  assert(noteAt >= 0, 'section 10 prefix note missing');
  const bullets = section.slice(noteAt).split('\n').filter(line => line.startsWith('- '));
  assert(bullets.length === 4, `expected 4 prefix-note bullets, got ${bullets.length}`);
  const modes = {};
  for (const bullet of bullets) {
    const vav = bullet.includes('vav prefix only');
    const full = bullet.includes('full prefix set');
    assert(vav !== full, 'a prefix-note bullet names neither or both prefix classes');
    for (const match of bullet.matchAll(/"([\u0590-\u05FF]+)"/g)) {
      assert(!(match[1] in modes), 'a token is in two prefix-note bullets');
      modes[match[1]] = vav ? 'vav' : 'full';
    }
  }
  const count = Object.keys(modes).length;
  assert(count === EXPECTED_COUNTS.pluralPrefixModes, `expected ${EXPECTED_COUNTS.pluralPrefixModes} prefix-note tokens, got ${count}`);
  const vavCount = Object.values(modes).filter(mode => mode === 'vav').length;
  assert(vavCount === EXPECTED_COUNTS.pluralPrefixVav && count - vavCount === EXPECTED_COUNTS.pluralPrefixFull, `expected ${EXPECTED_COUNTS.pluralPrefixVav} vav / ${EXPECTED_COUNTS.pluralPrefixFull} full prefix-note tokens, got ${vavCount} / ${count - vavCount}`);
  return modes;
}

function stringList(value, name) {
  assert(Array.isArray(value) && value.every(item => typeof item === 'string' && item.length > 0), `${name} must be a list of non-empty strings`);
  assert(value.length === EXPECTED_COUNTS[name], `expected ${EXPECTED_COUNTS[name]} ${name}, got ${value.length}`);
  assert(new Set(value).size === value.length, `${name} has duplicates`);
  return value;
}

/** Data-file section heading that holds `key` (for GUARD_TOKEN_SOURCES). */
function sectionOf(text, key) {
  const at = text.indexOf(`"${key}"`);
  assert(at >= 0, `missing key ${key}`);
  const heading = text.lastIndexOf('\n## ', at);
  assert(heading >= 0, `no section heading before ${key}`);
  return `${DATA_PATH} section ${text.slice(heading + 4, text.indexOf('\n', heading + 1)).replace(/ \(.*$/, '').trim()}`;
}

export function extractGenerationData(text) {
  const blocks = jsonBlocks(text);
  assert(blocks.length === EXPECTED_COUNTS.jsonBlocks, `expected ${EXPECTED_COUNTS.jsonBlocks} json blocks, got ${blocks.length}`);
  const merged = Object.assign({}, ...blocks);
  const { dayLetters, claimTokens, serviceLabelPins, typographyRule, contactTitlePrefix } = merged;
  assert(Array.isArray(dayLetters) && dayLetters.length === 7, 'dayLetters must have 7 entries');
  const kinds = Object.keys(claimTokens);
  assert(kinds.length === EXPECTED_COUNTS.claimKinds, `expected ${EXPECTED_COUNTS.claimKinds} claimTokens kinds, got ${kinds.length}`);
  assert(kinds.includes('solo_operator'), 'claimTokens has no solo_operator kind');
  const tokenCount = kinds.reduce((sum, kind) => sum + claimTokens[kind].length, 0);
  assert(tokenCount === EXPECTED_COUNTS.claimTokens, `expected ${EXPECTED_COUNTS.claimTokens} claim tokens, got ${tokenCount}`);
  assert(Object.keys(serviceLabelPins).length === 2, 'expected 2 serviceLabelPins');
  assert(typeof typographyRule === 'string' && !/[\u0590-\u05FF]/.test(typographyRule), 'typographyRule must be escape-only');
  // Noa: the double backslashes are intentional; decode the \uXXXX escape text to real characters.
  const typography = typographyRule.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  assert(!typography.includes('\\'), 'typographyRule has an undecoded escape');
  assert(typeof contactTitlePrefix === 'string' && contactTitlePrefix.length > 0, 'contactTitlePrefix missing');

  // M2a.3 sections 6-13.
  const claimTokenWordEnd = stringList(merged.claimTokenWordEnd, 'claimTokenWordEnd');
  const allClaimTokens = Object.values(claimTokens).flat();
  for (const token of claimTokenWordEnd) assert(allClaimTokens.includes(token), 'a claimTokenWordEnd entry is not a claim token');
  const fixTimeLeadTokens = stringList(merged.fixTimeLeadTokens, 'fixTimeLeadTokens');
  const fixTimeWithinWords = stringList(merged.fixTimeWithinWords, 'fixTimeWithinWords');
  // Every fix_time token is "<verb> <lead token>": the verb is the fix verb of the sentence check.
  for (const token of claimTokens.fix_time) {
    const words = token.split(' ');
    assert(words.length === 2 && fixTimeLeadTokens.includes(words[1]), 'a fix_time token is not "<verb> <lead token>"');
  }
  const arrivalTokens = stringList(merged.arrivalTokens, 'arrivalTokens');
  const guard = merged.paraphraseGuard;
  assert(guard && typeof guard === 'object', 'paraphraseGuard missing');
  const customerStems = stringList(guard.customerStems, 'customerStems');
  const speechVerbs = stringList(guard.speechVerbs, 'speechVerbs');
  const pluralAddressTokens = stringList(merged.pluralAddressTokens, 'pluralAddressTokens');
  const weTokens = stringList(merged.weTokens, 'weTokens');
  const waoServiceTerms = stringList(merged.waoServiceTerms, 'waoServiceTerms');
  const thermalTokens = stringList(merged.thermalTokens, 'thermalTokens');
  const templateStrings = merged.templateStrings;
  assert(templateStrings && Object.keys(templateStrings).length === EXPECTED_COUNTS.templateStrings &&
    typeof templateStrings.formSubmitLabel === 'string' && templateStrings.formSubmitLabel.length > 0 &&
    typeof templateStrings.formThanks === 'string' && templateStrings.formThanks.length > 0, 'templateStrings must hold formSubmitLabel and formThanks');

  // M2a.4: sections 14-15 and the section 10 prefix note.
  const sameDayTokens = stringList(merged.sameDayTokens, 'sameDayTokens');
  const sameDayFinishVerbs = stringList(merged.sameDayFinishVerbs, 'sameDayFinishVerbs');
  const priceLockTokens = stringList(merged.priceLockTokens, 'priceLockTokens');
  const prefixModes = pluralPrefixModes(text);
  for (const token of pluralAddressTokens) assert(token in prefixModes, 'a section 10 plural token has no prefix-note class');
  assert(Object.keys(prefixModes).length - pluralAddressTokens.length === M2A1_PLURAL_TOKEN_COUNT, 'prefix note does not cover exactly the M2a.1 + section 10 plural tokens');

  // M2a.4 round 2: sections 16-18.
  const serviceAreaTailTokens = stringList(merged.serviceAreaTailTokens, 'serviceAreaTailTokens');
  const serviceAreaHeadTokens = stringList(merged.serviceAreaHeadTokens, 'serviceAreaHeadTokens');
  const serviceAreaRegionTokens = stringList(merged.serviceAreaRegionTokens, 'serviceAreaRegionTokens');
  const serviceAreaNearbyTokens = stringList(merged.serviceAreaNearbyTokens, 'serviceAreaNearbyTokens');
  const serviceAreaLamedHeads = lamedHeads(text);
  for (const head of serviceAreaLamedHeads) assert(serviceAreaHeadTokens.includes(head), 'a lamed head is not a head token');
  const freeTokens = stringList(merged.freeTokens, 'freeTokens');
  const freeCalloutTokens = stringList(merged.freeCalloutTokens, 'freeCalloutTokens');
  const scope = merged.freeScopeNouns;
  assert(scope && typeof scope === 'object' && Object.keys(scope).length === EXPECTED_COUNTS.freeScopeClasses, `expected ${EXPECTED_COUNTS.freeScopeClasses} free scope classes`);
  assert(Object.values(scope).every(list => Array.isArray(list) && list.every(item => typeof item === 'string' && item.length > 0)), 'freeScopeNouns must be lists of strings');
  const nounCount = Object.values(scope).reduce((sum, list) => sum + list.length, 0);
  assert(nounCount === EXPECTED_COUNTS.freeScopeNouns, `expected ${EXPECTED_COUNTS.freeScopeNouns} free scope nouns, got ${nounCount}`);
  assert(scope.callout, 'freeScopeNouns has no callout class');
  const freeExclusion = freeExclusionWords(text);
  const weFormVerbs = stringList(merged.weFormVerbs, 'weFormVerbs');
  for (const verb of weFormVerbs) assert(!weTokens.includes(verb), 'a weFormVerbs entry is already a weTokens entry');

  const sources = {
    claimTokens: sectionOf(text, 'claimTokens'),
    claimTokenWordEnd: sectionOf(text, 'claimTokenWordEnd'),
    fixTimeLeadTokens: sectionOf(text, 'fixTimeLeadTokens'),
    fixTimeWithinWords: sectionOf(text, 'fixTimeWithinWords'),
    arrivalTokens: sectionOf(text, 'arrivalTokens'),
    customerStems: `${sectionOf(text, 'paraphraseGuard')} customerStems`,
    speechVerbs: `${sectionOf(text, 'paraphraseGuard')} speechVerbs`,
    pluralAddressTokens: `${sectionOf(text, 'pluralAddressTokens')} (appended to the M2a.1 list in copyGates.config.ts)`,
    weTokens: `${sectionOf(text, 'weTokens')} (appended to the M2a.1 list in copyGates.config.ts, allowPrefix: true)`,
    waoServiceTerms: `${sectionOf(text, 'waoServiceTerms')} (appended to the M2a.1 list in copyGates.config.ts)`,
    thermalTokens: `${sectionOf(text, 'thermalTokens')} (replaces the M2a.1 single thermal token)`,
    templateStrings: sectionOf(text, 'templateStrings'),
    sameDayTokens: sectionOf(text, 'sameDayTokens'),
    sameDayFinishVerbs: sectionOf(text, 'sameDayFinishVerbs'),
    priceLockTokens: sectionOf(text, 'priceLockTokens'),
    pluralPrefixModes: `${sectionOf(text, 'pluralAddressTokens')} prefix note (M2a.3; applies to the M2a.1 config tokens and the additions)`,
    serviceAreaTailTokens: sectionOf(text, 'serviceAreaTailTokens'),
    serviceAreaHeadTokens: sectionOf(text, 'serviceAreaHeadTokens'),
    serviceAreaRegionTokens: sectionOf(text, 'serviceAreaRegionTokens'),
    serviceAreaNearbyTokens: sectionOf(text, 'serviceAreaNearbyTokens'),
    serviceAreaLamedHeads: `${sectionOf(text, 'serviceAreaHeadTokens')} head-token note (place takes a lamed)`,
    freeTokens: sectionOf(text, 'freeTokens'),
    freeCalloutTokens: sectionOf(text, 'freeCalloutTokens'),
    freeScopeNouns: sectionOf(text, 'freeScopeNouns'),
    freeExclusionWords: `${sectionOf(text, 'freeTokens')} freeTokens note (exclusion)`,
    weFormVerbs: `${sectionOf(text, 'weFormVerbs')} (appended to the we-form list, allowPrefix: true)`,
  };
  for (const value of Object.values(sources)) assert(!/[\u0590-\u05FF]/.test(value), 'a source heading has Hebrew');

  return {
    dayLetters,
    claimTokens,
    serviceLabelPins: Object.fromEntries(Object.entries(serviceLabelPins).map(([key, pin]) => [key, pin.label])),
    serviceLabelPinStatus: Object.fromEntries(Object.entries(serviceLabelPins).map(([key, pin]) => [key, pin.status])),
    typographyRule: typography,
    contactTitlePrefix,
    claimTokenWordEnd,
    fixTimeLeadTokens,
    fixTimeWithinWords,
    arrivalTokens,
    customerStems,
    speechVerbs,
    pluralAddressTokens,
    weTokens,
    waoServiceTerms,
    thermalTokens,
    templateStrings,
    sameDayTokens,
    sameDayFinishVerbs,
    priceLockTokens,
    pluralPrefixModes: prefixModes,
    serviceAreaTailTokens,
    serviceAreaHeadTokens,
    serviceAreaRegionTokens,
    serviceAreaNearbyTokens,
    serviceAreaLamedHeads,
    freeTokens,
    freeCalloutTokens,
    freeScopeNouns: scope,
    freeExclusionWords: freeExclusion,
    weFormVerbs,
    sources,
  };
}

function esc(value) {
  return JSON.stringify(value).replace(/[\u007F-\uFFFF]/g, ch => `\\u${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
}

function emit(name, value, type) {
  return `export const ${name}${type ? `: ${type}` : ''} = ${esc(value)}${type ? '' : ' as const'};\n`;
}

export function renderModule(text) {
  const data = extractGenerationData(text);
  const sha = crypto.createHash('sha256').update(text).digest('hex');
  return `/**
 * GENERATED by scripts/site-bot/build-generation-data.mjs from ${DATA_PATH}
 * (sha256 ${sha}). Do not edit by hand: re-run the script.
 * Every Hebrew value is copied byte-exact by the script and written as \\u escapes:
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

/** Noa section 1: Hebrew day letters with geresh, index 0 = Sunday. */
${emit('DAY_LETTERS', data.dayLetters, 'readonly string[]')}
/** Noa section 2: claim tokens by kind (substring match on final copy; see CLAIM_TOKEN_WORD_END). */
${emit('CLAIM_TOKENS', data.claimTokens, 'Readonly<Record<string, readonly string[]>>')}
/** Noa section 6: claim tokens that match only with a right word boundary (no Hebrew letter follows). */
${emit('CLAIM_TOKEN_WORD_END', data.claimTokenWordEnd, 'readonly string[]')}
/** Noa section 7: lead tokens of a fix_time time promise. */
${emit('FIX_TIME_LEAD_TOKENS', data.fixTimeLeadTokens, 'readonly string[]')}
/** Noa section 7: a word starting with one of these after a lead token is a time promise. */
${emit('FIX_TIME_WITHIN_WORDS', data.fixTimeWithinWords, 'readonly string[]')}
/** Noa section 8: arrival tokens that exempt a fix_time sentence (replaces the section 2 note). */
${emit('ARRIVAL_TOKENS', data.arrivalTokens, 'readonly string[]')}
/** Noa section 3 / Yonatan: pinned service labels, keyed by the owner's (English) service wording. */
${emit('SERVICE_LABEL_PINS', data.serviceLabelPins, 'Readonly<Record<string, string>>')}
${emit('SERVICE_LABEL_PIN_STATUS', data.serviceLabelPinStatus, 'Readonly<Record<string, string>>')}
/** Noa section 4: full typography rule (decoded from its escape text). */
${emit('TYPOGRAPHY_RULE_TEXT', data.typographyRule, 'string')}
/** Yonatan section 5: contact page title prefix. */
${emit('CONTACT_TITLE_PREFIX', data.contactTitlePrefix, 'string')}
/** Noa section 9: paraphrase guard (customer stem + speech verb in one sentence). */
${emit('GUARD_CUSTOMER_STEMS', data.customerStems, 'readonly string[]')}
${emit('GUARD_SPEECH_VERBS', data.speechVerbs, 'readonly string[]')}
/** Noa section 10: plural / feminine address forms (appended to the M2a.1 config list). */
${emit('PLURAL_ADDRESS_TOKENS_DATA', data.pluralAddressTokens, 'readonly string[]')}
/** Noa section 10: first-person plural forms (appended to the M2a.1 config list; allowPrefix: true). */
${emit('WE_TOKENS_DATA', data.weTokens, 'readonly string[]')}
/** Noa section 11: WAO-service terms (appended to the M2a.1 config list; substring match). */
${emit('WAO_SERVICE_TERMS_DATA', data.waoServiceTerms, 'readonly string[]')}
/** Noa section 12: thermal-camera claim tokens (replace the M2a.1 single token). */
${emit('THERMAL_TOKENS', data.thermalTokens, 'readonly string[]')}
/** Noa section 13: system HTML strings on researched client sites. */
${emit('TEMPLATE_STRINGS', data.templateStrings, 'Readonly<{ formSubmitLabel: string; formThanks: string }>')}
/** Noa section 14: same-day tokens (substring match; a same-day promise). */
${emit('SAME_DAY_TOKENS', data.sameDayTokens, 'readonly string[]')}
/** Noa section 14: with one of these, a same-day sentence promises to finish the job that day. */
${emit('SAME_DAY_FINISH_VERBS', data.sameDayFinishVerbs, 'readonly string[]')}
/** Noa section 15: price-lock tokens (substring match; owner-stated only, never from a review). */
${emit('PRICE_LOCK_TOKENS', data.priceLockTokens, 'readonly string[]')}
/** Noa section 10 prefix note: prefix class of every plural-address token ('vav' = vav prefix only; 'full' = the full prefix set). */
${emit('PLURAL_PREFIX_MODES', data.pluralPrefixModes, "Readonly<Record<string, 'vav' | 'full'>>")}
/** Noa section 16: service-area widening tokens (tail after a place, head before a place, region, nearby). */
${emit('SERVICE_AREA_TAIL_TOKENS', data.serviceAreaTailTokens, 'readonly string[]')}
${emit('SERVICE_AREA_HEAD_TOKENS', data.serviceAreaHeadTokens, 'readonly string[]')}
${emit('SERVICE_AREA_REGION_TOKENS', data.serviceAreaRegionTokens, 'readonly string[]')}
${emit('SERVICE_AREA_NEARBY_TOKENS', data.serviceAreaNearbyTokens, 'readonly string[]')}
/** Noa section 16 note: head tokens after which the place takes a lamed. */
${emit('SERVICE_AREA_LAMED_HEADS', data.serviceAreaLamedHeads, 'readonly string[]')}
/** Noa section 17: free tokens (scoped by FREE_SCOPE_NOUNS), callout free tokens (scope built in), scope nouns by class. */
${emit('FREE_TOKENS', data.freeTokens, 'readonly string[]')}
${emit('FREE_CALLOUT_TOKENS', data.freeCalloutTokens, 'readonly string[]')}
${emit('FREE_SCOPE_NOUNS', data.freeScopeNouns, 'Readonly<Record<string, readonly string[]>>')}
/** Noa section 17 note: a free token followed by one of these words is not a free hit. */
${emit('FREE_EXCLUSION_WORDS', data.freeExclusionWords, 'readonly string[]')}
/** Noa section 18: first-person-plural verbs and forms (appended to the we-form list; allowPrefix: true). */
${emit('WE_FORM_VERBS', data.weFormVerbs, 'readonly string[]')}
/** Where each data list came from (data-file section; how it combines with the config lists). */
${emit('GUARD_TOKEN_SOURCES', data.sources, 'Readonly<Record<string, string>>')}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const text = fs.readFileSync(path.join(ROOT, DATA_PATH), 'utf8');
  const out = renderModule(text);
  assert(!/[\u0590-\u05FF]/.test(out), 'generated module contains Hebrew bytes');
  if (process.argv.includes('--check')) {
    const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === out;
    process.stdout.write(same ? 'generationData.ts up to date\n' : 'generationData.ts differs\n');
    process.exit(same ? 0 : 1);
  }
  fs.writeFileSync(OUT, out);
  const data = extractGenerationData(text);
  process.stdout.write(`${JSON.stringify({ dayLetters: data.dayLetters.length, claimKinds: Object.keys(data.claimTokens).length, claimTokens: Object.values(data.claimTokens).flat().length, pins: Object.keys(data.serviceLabelPins).length, wordEnd: data.claimTokenWordEnd.length, lead: data.fixTimeLeadTokens.length, within: data.fixTimeWithinWords.length, arrival: data.arrivalTokens.length, stems: data.customerStems.length, verbs: data.speechVerbs.length, plural: data.pluralAddressTokens.length, we: data.weTokens.length, wao: data.waoServiceTerms.length, thermal: data.thermalTokens.length, templates: Object.keys(data.templateStrings).length, sameDay: data.sameDayTokens.length, sameDayFinish: data.sameDayFinishVerbs.length, priceLock: data.priceLockTokens.length, prefixModes: Object.keys(data.pluralPrefixModes).length, tail: data.serviceAreaTailTokens.length, head: data.serviceAreaHeadTokens.length, region: data.serviceAreaRegionTokens.length, nearby: data.serviceAreaNearbyTokens.length, lamedHeads: data.serviceAreaLamedHeads.length, free: data.freeTokens.length, freeCallout: data.freeCalloutTokens.length, scopeNouns: Object.values(data.freeScopeNouns).flat().length, freeExclusion: data.freeExclusionWords.length, weFormVerbs: data.weFormVerbs.length, typographyChars: data.typographyRule.length })}\n`);
}
