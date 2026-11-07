#!/usr/bin/env node
// Paid-journey v2 M2a.2: copies the Hebrew generation data (Noa / Yonatan, 2026-11-08) out of
// docs/copy/site-bot-generation-data.md into src/lib/lp/generationData.ts, byte-exact.
//
// - Every value is parsed straight out of the fenced ~~~json blocks (dayLetters, claimTokens,
//   serviceLabelPins, typographyRule, contactTitlePrefix) or out of Noa's section 2 prose note
//   (fix_time arrival tokens and the "within" token), with asserted counts.
// - A few gate tokens come from EXISTING repo strings (paraphrase guard); each is copied by
//   byte offset from its source file and asserted, never typed.
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

function section(text, heading) {
  const start = text.indexOf(`\n## ${heading}`);
  assert(start >= 0, `missing section ${heading}`);
  const next = text.indexOf('\n## ', start + 4);
  return text.slice(start, next < 0 ? text.length : next);
}

/** Quoted strings ("...") inside a parenthesis that follows `anchor` in `text`. */
function quotedAfter(text, anchor) {
  const at = text.indexOf(anchor);
  assert(at >= 0, `missing anchor ${anchor}`);
  const open = text.indexOf('(', at);
  const close = text.indexOf(')', open);
  assert(open > at && close > open, `no parenthesis after ${anchor}`);
  return [...text.slice(open + 1, close).matchAll(/"([^"]+)"/g)].map(m => m[1]);
}

/** The first quoted string ("...") after `anchor`. */
function firstQuotedAfter(text, anchor) {
  const at = text.indexOf(anchor);
  assert(at >= 0, `missing anchor ${anchor}`);
  const m = /"([^"]+)"/.exec(text.slice(at));
  assert(m, `no quoted token after ${anchor}`);
  return m[1];
}

/** Copy `length` chars from `file`, `offset` chars after the last of a chain of Latin `markers` (existing repo bytes). */
function repoSlice(file, markers, offset, length) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  let at = -1;
  for (const marker of markers) {
    at = text.indexOf(marker, at + 1);
    assert(at >= 0, `marker not found in ${file}`);
  }
  const lineNo = text.slice(0, at).split('\n').length;
  return { value: text.slice(at + offset, at + offset + length), source: `${file}:${lineNo}` };
}

export function extractGenerationData(text) {
  const blocks = jsonBlocks(text);
  assert(blocks.length === 5, `expected 5 json blocks, got ${blocks.length}`);
  const merged = Object.assign({}, ...blocks);
  const { dayLetters, claimTokens, serviceLabelPins, typographyRule, contactTitlePrefix } = merged;
  assert(Array.isArray(dayLetters) && dayLetters.length === 7, 'dayLetters must have 7 entries');
  const kinds = Object.keys(claimTokens);
  assert(kinds.length === 10, `expected 10 claimTokens kinds, got ${kinds.length}`);
  const tokenCount = kinds.reduce((sum, kind) => sum + claimTokens[kind].length, 0);
  assert(tokenCount === 47, `expected 47 claim tokens, got ${tokenCount}`);
  assert(Object.keys(serviceLabelPins).length === 2, 'expected 2 serviceLabelPins');
  assert(typeof typographyRule === 'string' && !/[\u0590-\u05FF]/.test(typographyRule), 'typographyRule must be escape-only');
  // Noa: the double backslashes are intentional; decode the \uXXXX escape text to real characters.
  const typography = typographyRule.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  assert(!typography.includes('\\'), 'typographyRule has an undecoded escape');
  assert(typeof contactTitlePrefix === 'string' && contactTitlePrefix.length > 0, 'contactTitlePrefix missing');

  const s2 = section(text, '2. claimTokens');
  const fixTimeWithin = firstQuotedAfter(s2, 'also the token');
  const arrivalTokens = quotedAfter(s2, "sentence's verb is arrival");
  assert(arrivalTokens.length === 3, `expected 3 arrival tokens, got ${arrivalTokens.length}`);
  assert(claimTokens.fix_time.some(token => token.includes(fixTimeWithin)), 'fix_time "within" token is not inside the fix_time tokens');

  return {
    dayLetters,
    claimTokens,
    serviceLabelPins: Object.fromEntries(Object.entries(serviceLabelPins).map(([key, pin]) => [key, pin.label])),
    serviceLabelPinStatus: Object.fromEntries(Object.entries(serviceLabelPins).map(([key, pin]) => [key, pin.status])),
    typographyRule: typography,
    contactTitlePrefix,
    fixTimeWithin,
    arrivalTokens,
  };
}

/** Paraphrase-guard tokens from existing repo strings (not in the data file; logged for Noa). */
export function repoGuardTokens() {
  // "<customers> <say>" from the existing sitelink copy; the bare customer stem is its first 4 characters.
  const customersSay = repoSlice('src/app/api/google-ads/create-campaign/route.ts', ["anchor: 'reviews'", "description1: '"], 19, 13);
  const told = repoSlice('src/lib/bot/prompts.ts', ['Human-connection (trainer', 'Pace: "'], 34, 4);
  const customerStem = { value: customersSay.value.slice(0, 4), source: `${customersSay.source} (first 4 chars)` };
  const say = { value: customersSay.value.slice(7), source: `${customersSay.source} (chars 7-13)` };
  for (const item of [customersSay, told, customerStem, say]) assert(/^[\u05D0-\u05EA ]+$/.test(item.value), `repo token is not Hebrew: ${item.source}`);
  assert(customersSay.value.split(' ').length === 2 && customerStem.value.length === 4 && say.value.length === 6, 'repo token shape changed');
  return { customerStems: [customerStem], speechVerbs: [told, say] };
}

function esc(value) {
  return JSON.stringify(value).replace(/[\u007F-\uFFFF]/g, ch => `\\u${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
}

function emit(name, value, type) {
  return `export const ${name}${type ? `: ${type}` : ''} = ${esc(value)}${type ? '' : ' as const'};\n`;
}

export function renderModule(text) {
  const data = extractGenerationData(text);
  const guard = repoGuardTokens();
  const sha = crypto.createHash('sha256').update(text).digest('hex');
  return `/**
 * GENERATED by scripts/site-bot/build-generation-data.mjs from ${DATA_PATH}
 * (sha256 ${sha}). Do not edit by hand: re-run the script.
 * Every Hebrew value is copied byte-exact by the script and written as \\u escapes:
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

/** Noa section 1: Hebrew day letters with geresh, index 0 = Sunday. */
${emit('DAY_LETTERS', data.dayLetters, 'readonly string[]')}
/** Noa section 2: claim tokens by kind (plain substring match on final copy). */
${emit('CLAIM_TOKENS', data.claimTokens, 'Readonly<Record<string, readonly string[]>>')}
/** Noa section 2 note: the "within" token of the fix_time sentence check. */
${emit('FIX_TIME_WITHIN', data.fixTimeWithin, 'string')}
/** Noa section 2 note: arrival verbs that exempt a fix_time sentence. */
${emit('ARRIVAL_TOKENS', data.arrivalTokens, 'readonly string[]')}
/** Noa section 3 / Yonatan: pinned service labels, keyed by the owner's (English) service wording. */
${emit('SERVICE_LABEL_PINS', data.serviceLabelPins, 'Readonly<Record<string, string>>')}
${emit('SERVICE_LABEL_PIN_STATUS', data.serviceLabelPinStatus, 'Readonly<Record<string, string>>')}
/** Noa section 4: full typography rule (decoded from its escape text). */
${emit('TYPOGRAPHY_RULE_TEXT', data.typographyRule, 'string')}
/** Yonatan section 5: contact page title prefix. */
${emit('CONTACT_TITLE_PREFIX', data.contactTitlePrefix, 'string')}
/**
 * Paraphrase guard (NOT in the data file; existing repo strings, logged for Noa to confirm):
 * a sentence with a customer stem and a speech verb attributes a statement to a customer.
 */
${emit('GUARD_CUSTOMER_STEMS', guard.customerStems.map(item => item.value), 'readonly string[]')}
${emit('GUARD_SPEECH_VERBS', guard.speechVerbs.map(item => item.value), 'readonly string[]')}
export const GUARD_TOKEN_SOURCES: readonly string[] = ${esc([...guard.customerStems, ...guard.speechVerbs].map(item => item.source))};
`;
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
  process.stdout.write(`${JSON.stringify({ dayLetters: data.dayLetters.length, claimKinds: Object.keys(data.claimTokens).length, claimTokens: Object.values(data.claimTokens).flat().length, pins: Object.keys(data.serviceLabelPins).length, arrival: data.arrivalTokens.length, typographyChars: data.typographyRule.length })}\n`);
}
