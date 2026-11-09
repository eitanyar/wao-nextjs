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
// - M2a.5: section 19 voiceRules (Tamar, Noa-proofed): generic-adjective words / phrases / exempt phrases,
//   bad idioms, signature-word groups, service stages + CTA label sets, sticky action tokens, bare-verb
//   sentence openers. From the prose notes: the owner-voice and bare-verb field scopes, the prefix letters
//   of the generic words and of the subject-carry tokens, the two bad-idiom replacement notes, and the
//   English prompt rules P1-P7 (plus the example-of-the-move bullet), all byte-exact.
// - M2a.6: section 20 voiceRules (Tamar, Noa-proofed): signature additions + tile breaking forms, invented
//   customer story, moral ending, the "before" cap, sticky naming, service-detail openers, trade terms, the
//   heroCta override and the English prompt rules R1-R7. From the prose notes: every prefix-letter set, field
//   scope, whole-word subset, slug keyword and cap number the gates need, all byte-exact slices of the file.
// - M2a.3: section 8 replaces the section 2 prose arrival list and section 9 replaces the
//   M2a.2 repo-derived paraphrase guard; GUARD_TOKEN_SOURCES records where each list came from.
// - The generated module escapes every non-ASCII character as \uXXXX, so it holds ZERO
//   Hebrew bytes; the runtime values are the real characters.
// - M2b.1d: section 22 voiceRules M2b (Tamar, Noa-proofed): the idealClientFear differentiator source and its English
//   keywords, the aboutHeadlineNoPromise list names, the servicesHeadlineOptions closed set, the trust-bar filler phrases
//   and size caps, and the English prompt rules B1-B6 (with their indented sub-lines), all byte-exact; plus asserted
//   English sentences for every section 22 rule the gate code implements without data.
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
  jsonBlocks: 52, // M2a.7: + heroCapConceptAdditions, differentiatorUspKeywords, prepositionSkipAdverbs, wrongPrepositionTokens, section 21. M2b.1d: + 4 section 22 blocks.
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
  // M2a.5, section 19 (recounted from the file; see the M2a.5 report for differences from the brief).
  genericAdjectiveWords: 22,
  genericAdjectivePhrases: 18,
  genericAdjectiveExemptPhrases: 5,
  genericAdjectivePrefixLetters: 6,
  badIdiomEntries: 6,
  badIdiomTokens: 15,
  badIdiomGate: 4,
  badIdiomSpellingFix: 1,
  badIdiomPromptOnly: 1,
  badIdiomNotes: 2,
  signatureGroups: 8,
  signatureVariants: 20,
  emergencyServiceKinds: 15,
  plannedServiceKinds: 8,
  ctaStageStrings: 16, // M2a.6: Tamar's section 19.4 edit removed one planned heroCta label (was 17).
  stickyActionTokens: 7,
  bareVerbSentenceOpeners: 23,
  subjectCarryTokens: 2,
  subjectCarryPrefixes: 3,
  bareVerbExclusions: 4,
  ownerVoiceFields: 12,
  bareVerbFields: 2,
  voicePromptRules: 8,
  // M2a.6, section 20 (recounted from the file).
  signatureAdditionGroups: 3,
  signatureAdditionVariants: 11,
  tilesBreakForms: 10,
  tilesBreakPrefixLetters: 6,
  tilesBreakExclusionsPrecedingWord: 12,
  tilesBreakStripPrefixes: 6,
  storyFields: 4,
  storyCustomerNouns: 2,
  storyNounPrefixes: 2,
  storyPastVerbs: 28,
  storyVerbPrefixes: 1,
  storyQuantifierExclusions: 3,
  storyQuantifierPrefixes: 6,
  storyTimeAnchors: 5,
  moralFields: 2,
  moralEndingTokens: 12,
  moralEndingFollowingExclusions: 2,
  beforeTokens: 3,
  beforeTimeWordExclusions: 21,
  timeWordTokens: 2,
  stickyBareForms: 12,
  stickyProblemClasses: 4,
  stickyProblemWords: 24,
  stickyWholeWords: 3,
  stickyWholeWordPrefixes: 7,
  electricSlugKeywords: 3,
  acVerticalSlugKeywords: 5,
  tradeTermEntries: 7,
  tradeTermGate: 5, // M2a.7: services_headline_preposition and water_flows_again promoted (were promptOnly).
  tradeTermSpellingFix: 1,
  tradeTermPromptOnly: 1,
  arriveLocateNextWordExclusions: 4,
  arriveLocateLeadPrefixes: 3,
  m2a6PromptRules: 8, // M2a.7: R8 (hero hook shape) added; R2, R3, R5 reworded.
  // M2a.7, section 20 edits (Tamar + Noa) and section 21 (recounted from the file).
  r8SubBullets: 5,
  heroCapConceptGroups: 5,
  heroCapConceptAdditions: 17,
  heroCapAcOnly: 5,
  differentiatorUspGroups: 8,
  differentiatorUspKeywords: 62,
  prepositionSkipAdverbs: 3,
  prepositionPairNextLetter: 1,
  wrongPrepositionTokens: 3,
  nameIntroLeadIns: 5,
  // M2b.1d, section 22 (recounted from the file).
  differentiatorFearGroups: 5,
  differentiatorFearKeywords: 24,
  aboutHeadlineForbidLists: 5,
  servicesHeadlineOptions: 2,
  trustBarFillerPhrases: 11,
  m2bPromptRules: 6,
  m2bRuleSubLines: 30,
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

/** Section 19 prose: the backticked field names of the bullet that starts with `lead` (one line). */
function backtickedFields(section, lead, name) {
  const line = section.split('\n').find(item => item.startsWith(lead));
  assert(line, `section 19 ${name} note missing`);
  const fields = [...line.matchAll(/`([^`]+)`/g)].map(match => match[1]);
  assert(fields.length === EXPECTED_COUNTS[name], `expected ${EXPECTED_COUNTS[name]} ${name}, got ${fields.length}`);
  return fields;
}

/** Hebrew runs of the prose between two markers on the line that starts with `lead`. */
function hebrewRunsBetween(section, lead, from, to, name) {
  const line = section.split('\n').find(item => item.startsWith(lead));
  assert(line, `section 19 ${name} note missing`);
  const start = line.indexOf(from);
  const end = line.indexOf(to, start + from.length);
  assert(start >= 0 && end > start, `section 19 ${name} markers missing`);
  const runs = line.slice(start + from.length, end).match(/[\u05D0-\u05EA]+/g) ?? [];
  assert(runs.length === EXPECTED_COUNTS[name], `expected ${EXPECTED_COUNTS[name]} ${name}, got ${runs.length}`);
  return runs;
}

/**
 * Section 19 prose (M2a.5): field scopes, prefix letters, bad-idiom notes and the English prompt rules.
 * Every value is a byte-exact slice of the data file.
 */
export function voiceProse(text) {
  const section = sectionText(text, 19);
  const ownerVoiceFields = backtickedFields(section, '- **Owner-voice fields**:', 'ownerVoiceFields');
  const bareVerbFields = backtickedFields(section, '- **Fields**:', 'bareVerbFields');
  const genericPrefixLetters = hebrewRunsBetween(section, '- `genericAdjectiveWords`:', 'only the prefix letters', 'may appear', 'genericAdjectivePrefixLetters');
  assert(genericPrefixLetters.every(item => item.length === 1), 'a generic-adjective prefix is not one letter');
  const subjectCarryPrefixes = hebrewRunsBetween(section, '- **Hit**:', 'may take the prefixes', '(', 'subjectCarryPrefixes');
  const idiomStart = section.indexOf('### 19.2');
  const idiomEnd = section.indexOf('### 19.3');
  assert(idiomStart >= 0 && idiomEnd > idiomStart, 'section 19.2 missing');
  const idiomNotes = section.slice(idiomStart, idiomEnd).split('\n').filter(line => /^The `[a-z_]+` replacement /.test(line));
  assert(idiomNotes.length === EXPECTED_COUNTS.badIdiomNotes, `expected ${EXPECTED_COUNTS.badIdiomNotes} bad-idiom notes, got ${idiomNotes.length}`);
  const rulesAt = section.indexOf('### 19.6');
  assert(rulesAt >= 0, 'section 19.6 missing');
  const promptRules = section.slice(rulesAt).split('\n').filter(line => /^- \*\*(?:P\d \u2014 |Example of the move)/.test(line))
    .map(line => {
      const id = /^- \*\*(P\d)/.exec(line)?.[1] ?? 'example';
      return { id, text: line.slice(2).replace(/\*\*/g, '') };
    });
  assert(promptRules.length === EXPECTED_COUNTS.voicePromptRules, `expected ${EXPECTED_COUNTS.voicePromptRules} prompt rules, got ${promptRules.length}`);
  assert(promptRules.map(rule => rule.id).join(',') === 'P1,P2,example,P3,P4,P5,P6,P7', 'prompt rules out of order');
  return { ownerVoiceFields, bareVerbFields, genericPrefixLetters, subjectCarryPrefixes, idiomNotes, promptRules };
}

/** The line of a section that starts with `lead` (asserted unique). */
function lineStarting(section, lead, name) {
  const lines = section.split('\n').filter(item => item.startsWith(lead));
  assert(lines.length === 1, `section 20 ${name} note: expected 1 line, got ${lines.length}`);
  return lines[0];
}

/** Hebrew runs between two markers of one line (byte-exact prefix letters / short tokens). */
function runsBetween(line, from, to, name) {
  const start = line.indexOf(from);
  const end = line.indexOf(to, start + from.length);
  assert(start >= 0 && end > start, `section 20 ${name} markers missing`);
  const runs = line.slice(start + from.length, end).match(/[\u05D0-\u05EA]+/g) ?? [];
  assert(runs.length === EXPECTED_COUNTS[name], `expected ${EXPECTED_COUNTS[name]} ${name}, got ${runs.length}`);
  return runs;
}

/** Quoted strings (any script) between two markers of one line. */
function quotedBetween(line, from, to, name) {
  const start = line.indexOf(from);
  const end = line.indexOf(to, start + from.length);
  assert(start >= 0 && end > start, `section 20 ${name} markers missing`);
  const words = [...line.slice(start + from.length, end).matchAll(/"([^"]+)"/g)].map(match => match[1]);
  assert(words.length === EXPECTED_COUNTS[name], `expected ${EXPECTED_COUNTS[name]} ${name}, got ${words.length}`);
  return words;
}

/**
 * Section 20 prose (M2a.6): prefix-letter sets, field scopes, whole-word subsets, slug keywords, cap numbers
 * and the English prompt rules R1-R7. Every value is a byte-exact slice of the data file.
 */
export function voiceProseM2a6(text) {
  const section = sectionText(text, 20);
  const tilesBreakPrefixLetters = runsBetween(lineStarting(section, '- Whole word. The prefixes', 'tilesBreakPrefixLetters'), 'The prefixes', 'may appear', 'tilesBreakPrefixLetters');
  const tilesBreakStripPrefixes = runsBetween(lineStarting(section, '- Noa (QA): compare the preceding word', 'tilesBreakStripPrefixes'), 'stripping the prefix letters', ', so', 'tilesBreakStripPrefixes');
  const storyFieldLine = lineStarting(section, 'Fields: `', 'storyFields');
  const storyFields = [...storyFieldLine.matchAll(/`([^`]+)`/g)].map(match => match[1]);
  assert(storyFields.length === EXPECTED_COUNTS.storyFields, `expected ${EXPECTED_COUNTS.storyFields} storyFields, got ${storyFields.length}`);
  const nounLine = lineStarting(section, '  - A `storyCustomerNouns` entry must appear', 'storyNounPrefixes');
  const storyNounPrefixes = runsBetween(nounLine, 'with no prefix or with only', '. A `storyPastVerbs`', 'storyNounPrefixes');
  const storyVerbPrefixes = runsBetween(nounLine, 'later in the same clause, with no prefix or with only', '.', 'storyVerbPrefixes');
  const storyQuantifierPrefixes = runsBetween(lineStarting(section, '  - Not a hit when the word right before the noun', 'storyQuantifierPrefixes'), 'the quantifier may carry the prefixes', '(', 'storyQuantifierPrefixes');
  assert(lineStarting(section, '- **Pattern B: past-time anchor.**', 'storyTimeAnchors').includes('a single vav prefix is allowed'), 'section 20 Pattern B vav note changed');
  const moralLine = lineStarting(section, '**Moral ending (hard gate).** Fields:', 'moralFields');
  const moralFields = [...moralLine.slice(0, moralLine.indexOf('Plain substring')).matchAll(/`([^`]+)`/g)].map(match => match[1]);
  assert(moralFields.length === EXPECTED_COUNTS.moralFields, `expected ${EXPECTED_COUNTS.moralFields} moralFields, got ${moralFields.length}`);
  // The tokens whose shin is checked against beforeTimeWordExclusions (section 20.2 note and 20.3 bullet).
  const timeWordTokens = section.split('\n').filter(line => line.includes('the whole word that starts at its')).map(line => /"([^"]+)"/.exec(line)?.[1]);
  assert(timeWordTokens.length === EXPECTED_COUNTS.timeWordTokens && timeWordTokens.every(Boolean), `expected ${EXPECTED_COUNTS.timeWordTokens} time-word tokens`);
  const beforeCap = Number(/### 20\.3 [^\n]*at most (\d+) per page/.exec(section)?.[1]);
  const heroCap = Number(/If the count is above (\d+), every page after/.exec(section)?.[1]);
  assert(beforeCap > 0 && heroCap > 0, 'section 20 cap numbers missing');
  const namingLine = lineStarting(section, '- **Naming pass**:', 'stickyWholeWords');
  const stickyWholeWords = quotedBetween(namingLine, 'except', '. Those three', 'stickyWholeWords');
  const stickyWholeWordPrefixes = runsBetween(namingLine, 'whole words (prefixes', 'allowed)', 'stickyWholeWordPrefixes');
  const electricSlugKeywords = quotedBetween(lineStarting(section, '  - `electric`:', 'electricSlugKeywords'), 'the slug contains', '.', 'electricSlugKeywords');
  const acSegment = /any hyphen-separated segment equals "([a-z]+)"/.exec(section)?.[1];
  assert(acSegment, 'section 20.6 AC segment keyword missing');
  const arriveLocateLeadPrefixes = runsBetween(lineStarting(section, '- Noa (QA): the lead verb may carry', 'arriveLocateLeadPrefixes'), 'the lead verb may carry the prefixes', '(', 'arriveLocateLeadPrefixes');
  const rulesAt = section.indexOf('### 20.8');
  assert(rulesAt >= 0, 'section 20.8 missing');
  // M2a.7: a rule may carry indented sub-bullets (R8); they stay part of the rule, byte-exact, one per line.
  const ruleLines = section.slice(rulesAt).split('\n');
  const promptRules = [];
  ruleLines.forEach((line, index) => {
    if (!/^- \*\*R\d \u2014 /.test(line)) return;
    const subs = [];
    for (let next = index + 1; next < ruleLines.length && ruleLines[next].startsWith('  - '); next++) subs.push(ruleLines[next]);
    promptRules.push({ id: /^- \*\*(R\d)/.exec(line)[1], text: [line.slice(2).replace(/\*\*/g, ''), ...subs].join('\n') });
  });
  assert(promptRules.length === EXPECTED_COUNTS.m2a6PromptRules, `expected ${EXPECTED_COUNTS.m2a6PromptRules} section 20 prompt rules, got ${promptRules.length}`);
  assert(promptRules.map(rule => rule.id).join(',') === 'R1,R2,R3,R4,R5,R6,R7,R8', 'section 20 prompt rules out of order');
  const r8Subs = promptRules.find(rule => rule.id === 'R8').text.split('\n').length - 1;
  assert(r8Subs === EXPECTED_COUNTS.r8SubBullets, `expected ${EXPECTED_COUNTS.r8SubBullets} R8 sub-bullets, got ${r8Subs}`);
  assert(promptRules.filter(rule => rule.id !== 'R8').every(rule => !rule.text.includes('\n')), 'only R8 may carry sub-bullets');
  return {
    tilesBreakPrefixLetters, tilesBreakStripPrefixes, storyFields, storyNounPrefixes, storyVerbPrefixes, storyQuantifierPrefixes,
    moralFields, timeWordTokens, beforeCap, heroCap, stickyWholeWords, stickyWholeWordPrefixes, electricSlugKeywords, acSegment,
    arriveLocateLeadPrefixes, promptRules,
  };
}

/** M2a.7: trade terms whose match rule is a section 20.6 prose note (implemented per id in copyGates.ts). */
export const NOTE_MATCH_IDS = ['services_headline_preposition', 'water_flows_again'];

/** One section-20 prose fact that the gate code relies on: the exact English sentence must still be in the file. */
function assertProse(section, phrase, name) {
  assert(section.includes(phrase), `${name}: the data file no longer says ${JSON.stringify(phrase)}`);
}

/**
 * M2a.7 prose (Tamar's section 20 edits, Noa's notes, section 21): the AC-only hero-cap entries, the differentiator cap,
 * the excluded group, the typo-gate field scope, the preposition gate's next letter, Noa's prompt line, and asserted
 * English sentences for every rule the gate code implements without data. Every Hebrew value is a byte-exact slice.
 */
export function voiceProseM2a7(text, trade, heroConcepts) {
  const section = sectionText(text, 20);
  const acLine = lineStarting(section, '- **AC only**: the `', 'heroCapAcOnly');
  const acGroup = /^- \*\*AC only\*\*: the `(\w+)` entries/.exec(acLine)?.[1];
  assert(acGroup && acGroup in heroConcepts, 'section 20.1 AC-only group is not a heroCapConceptAdditions group');
  const heroCapAcOnly = quotedBetween(acLine, '` entries', ' count only on pages of the AC vertical', 'heroCapAcOnly');
  for (const entry of heroCapAcOnly) assert(heroConcepts[acGroup].includes(entry), 'an AC-only hero-cap entry is not in its group');
  assertProse(section, "**Service-label exclusion**: before matching, mask the page's own pinned service label (`siteIdentity.services[].label`; on the homepage, every label in `serviceItems`) inside the hero.", 'service-label mask');
  assertProse(section, 'The entries match as plain substrings on `heroHeadline` only. They never count toward the per-page cap', 'hero-cap concepts scope');
  const cap = /- The group or groups that hold the owner's differentiator get a per-page cap of (\d+)\. Every other group stays at (\d+)\./.exec(section);
  assert(cap, 'section 20.1 differentiator cap sentence missing');
  const differentiatorCap = Number(cap[1]);
  const otherGroupCap = Number(cap[2]);
  assert(differentiatorCap === 2 && otherGroupCap === 1, 'differentiator / other-group caps changed: update the gate code');
  const excluded = [...section.matchAll(/`(\w+)` \("[^"]+"\) is never a differentiator group/g)].map(match => match[1]);
  assert(excluded.length === 1, 'section 20.1 never-a-differentiator group missing');
  assertProse(section, "Detecting the owner's group from `usp` (the `guarantee` field too, if it states a work method):", 'differentiator guarantee field');
  assertProse(section, 'Match case-insensitive substrings, after lower-casing the usp and turning every hyphen into a space', 'English usp normalisation');
  assertProse(section, 'A usp may match more than one group, and each group it matches gets the cap of 2.', 'differentiator multi-group');
  // Section 20.6: services_headline_preposition / water_flows_again notes and the typo gates.
  const scopeLine = lineStarting(section, '- **Fields**: every owner-voice field, plus `', 'prepositionFields');
  const prepositionFields = [...scopeLine.slice(0, scopeLine.indexOf('. This gate')).matchAll(/`([^`]+)`/g)].map(match => match[1]);
  const typoLine = lineStarting(section, '**Typo gates (Noa, M2a.7).** These cover owner-voice fields plus `', 'typoFields');
  const typoFields = [...typoLine.slice(0, typoLine.indexOf('. Both')).matchAll(/`([^`]+)`/g)].map(match => match[1]);
  assert(prepositionFields.length === 1 && typoFields.join(',') === prepositionFields.join(','), 'the preposition and typo gates must add the same one field to the owner-voice scope');
  const prep = trade.find(entry => entry.id === 'services_headline_preposition');
  const water = trade.find(entry => entry.id === 'water_flows_again');
  assert(prep && water && prep.match === 'note' && water.match === 'note' && prep.replacementPair, 'section 20.6 note-matched trade terms missing');
  const single = lineStarting(section, `- **"${prep.tokens[0]}"**: plain substring, but only when no Hebrew letter comes right before "`, 'prepositionSingle');
  assert(single.includes(`right before "${prep.tokens[0].split(' ')[0]}"`), 'services_headline_preposition: the left-edge word is not the first word of the single-verb token');
  const pairLine = lineStarting(section, `- **"${prep.tokens[1]}"**: plain substring, but only when it is not followed by a space and a word that starts with `, 'prepositionPairNextLetter');
  const [pairNextLetter] = runsBetween(pairLine, 'a word that starts with', '.', 'prepositionPairNextLetter');
  assert(pairNextLetter.length === 1, 'the preposition next-letter is not one letter');
  assertProse(section, `- Noa (QA): before the ${pairNextLetter} check, skip one \`prepositionSkipAdverbs\` word.`, 'preposition skip adverb');
  lineStarting(section, `- **"${water.tokens[0]}"**: whole word, with no other prefix and no Hebrew letter after it.`, 'waterWholeWord');
  const waterSub = lineStarting(section, `- **"${water.tokens[1]}"**: plain substring. The only letter allowed right before "`, 'waterSubstring');
  assert(water.tokens[0].endsWith(water.tokens[1].split(' ')[0]) && waterSub.includes('is a vav, which is already covered by'), 'water_flows_again: the vav note changed');
  assertProse(section, '**`tripled_letter`** (no Hebrew data): a hit is any Hebrew letter (U+05D0\u2013U+05EA) three or more times in a row, except vav. For vav, a hit is four or more in a row.', 'tripled_letter');
  assertProse(section, '**`wrongPrepositionTokens`**: a token must have no Hebrew letter before it or after it', 'wrongPrepositionTokens');
  assertProse(section, 'Both are reject-and-regenerate, never auto-replace.', 'typo gates reject');
  const promptLine = /^- \*\*Prompt line\*\*: "(.+)"$/.exec(lineStarting(section, '- **Prompt line**: "', 'prompt line'))?.[1];
  assert(promptLine && !/[\u0590-\u05FF]/.test(promptLine), 'Noa prompt line missing or not English');
  assertProse(section, '- **Warning only (run log), formerly gates**: the same-opening check (20.2) and the `serviceDetailsOpenerToken` half cap (20.5).', 'warning-only gates');
  assertProse(section, "a gate hit in a field that isn't rendered is logged as a warning and doesn't fail the page", 'M2b warn-only note');
  // Section 21: the name-intro position rule (also for the subject-carry word).
  const s21 = sectionText(text, 21);
  assertProse(s21, 'So the gate fires only when the opener starts a sentence: the start of the field, or the first word after ". ", "? " or "! ". It also fires when the opener comes right after a `nameIntroLeadIns` entry followed by a comma and a space', 'name-intro position');
  assertProse(s21, 'Anywhere else it is not a name intro and is never checked. Whole word, no prefix letters', 'name-intro whole word');
  assertProse(s21, 'The same position rule applies to', 'name-intro subject carry');
  return { heroCapAcGroup: acGroup, heroCapAcOnly, differentiatorCap, differentiatorExcludedGroups: excluded, extraGateFields: prepositionFields, pairNextLetter, promptLine };
}

/**
 * M2b.1d, section 22 prose (Tamar M2b): the English prompt rules B1-B6 (each with its indented sub-lines, byte-exact), the
 * rules that apply on every page (the rest apply on pages that render the about section and the service cards), and
 * asserted English sentences for every rule the gate code implements. Every value is a byte-exact slice of the file.
 */
export function voiceProseM2b(text, numbers) {
  const section = sectionText(text, 22);
  const rulesAt = section.indexOf('### 22.3');
  const rulesEnd = section.indexOf('### 22.4');
  assert(rulesAt >= 0 && rulesEnd > rulesAt, 'section 22.3 missing');
  const lines = section.slice(rulesAt, rulesEnd).split('\n');
  const promptRules = [];
  lines.forEach((line, index) => {
    if (!/^- \*\*B\d \u2014 /.test(line)) return;
    const subs = [];
    for (let next = index + 1; next < lines.length && lines[next].startsWith('  '); next++) subs.push(lines[next]);
    promptRules.push({ id: /^- \*\*(B\d)/.exec(line)[1], text: [line.slice(2).replace(/\*\*/g, ''), ...subs].join('\n') });
  });
  assert(promptRules.length === EXPECTED_COUNTS.m2bPromptRules, `expected ${EXPECTED_COUNTS.m2bPromptRules} section 22 prompt rules, got ${promptRules.length}`);
  assert(promptRules.map(rule => rule.id).join(',') === 'B1,B2,B3,B4,B5,B6', 'section 22 prompt rules out of order');
  const subLines = promptRules.reduce((sum, rule) => sum + rule.text.split('\n').length - 1, 0);
  assert(subLines === EXPECTED_COUNTS.m2bRuleSubLines, `expected ${EXPECTED_COUNTS.m2bRuleSubLines} section 22 rule sub-lines, got ${subLines}`);
  const scope = /These apply on pages that render the about section and the service cards \(the homepage and the services hub\)\. (B\d) applies on every page\. Sections 19 and 20 still apply\./.exec(section);
  assert(scope, 'section 22.3 page-scope sentence changed');
  const everyPageRuleIds = [scope[1]];
  assert(promptRules.some(rule => rule.id === everyPageRuleIds[0]), 'the every-page rule is not a section 22 rule');
  // 22.2: the gate rulings the code implements (an edit to any of these sentences must be reviewed against copyGates.ts).
  assertProse(section, '- **Hebrew fear**: as for a Hebrew usp (the section 19.3 and 20.1 variants).', 'Hebrew fear source');
  assertProse(section, '- **English fear**: lower-case it and turn every hyphen into a space. Then match plain substrings against `differentiatorUspKeywords` and the `differentiatorFearKeywords` below.', 'English fear source');
  assertProse(section, 'It applies only on pages that render the about section.', 'aboutHeadlineNoPromise scope');
  assertProse(section, "- a `heroCapConceptAdditions` entry, with the section 20.1 service-label mask and the AC-only rule", 'aboutHeadlineNoPromise hero concepts');
  assertProse(section, '- a `beforeTokens` hit, with the section 20.3 left-edge rule and time exclusions', 'aboutHeadlineNoPromise before');
  assertProse(section, '- **Gate**: the trimmed value must be byte-identical to one entry of `servicesHeadlineOptions`.', 'services headline closed set');
  assertProse(section, '- **Who sets it**: the model may pick an entry, or the engineer may system-set the first one. Either is fine.', 'services headline system set');
  assertProse(section, '- **`trustBarFillerPhrases`** (new): plain substring, `trustBarItems` only. A hit fails the page.', 'trust-bar filler');
  assertProse(section, `- **\`trustBarMaxItems\`** (no Hebrew): more than ${numbers.trustBarMaxItems} items fails.`, 'trust-bar max items');
  assertProse(section, `- **\`trustBarMaxChars\`** (no Hebrew): any item over ${numbers.trustBarMaxChars} characters fails. Count Unicode code points, including spaces and punctuation.`, 'trust-bar max chars');
  assertProse(section, '**`duplicate_about_headline`: keep it, but compare only pages that render the about section.**', 'duplicate about headline scope');
  assertProse(section, '- **`service_details_opener` (106)**: R5 makes', 'service_details_opener deleted');
  assertProse(section, '- **`duplicate_about_opening` (25)**: at most two about bodies render per site, so keep the check only for the homepage against the hub.', 'duplicate_about_opening scope');
  return { promptRules, everyPageRuleIds };
}

/** Section 20.6: trade-term entries; the match rule is parsed ('substring', whole word with prefix letters, lead verb + word, none). */
function tradeTerms(entries) {
  assert(Array.isArray(entries) && entries.length === EXPECTED_COUNTS.tradeTermEntries, `expected ${EXPECTED_COUNTS.tradeTermEntries} trade-term entries`);
  const out = entries.map(entry => {
    assert(typeof entry.id === 'string' && Array.isArray(entry.tokens) && entry.tokens.every(token => typeof token === 'string' && token.length > 0), 'a trade-term entry is malformed');
    assert(['gate', 'spellingFix', 'promptOnly'].includes(entry.type), `trade term ${entry.id} has an unknown type`);
    assert(typeof entry.replacement === 'string' && entry.replacement.length > 0 && typeof entry.meant === 'string' && typeof entry.acOnly === 'boolean', `trade term ${entry.id} is incomplete`);
    let match;
    let prefixLetters = [];
    if (entry.type === 'promptOnly') {
      assert(entry.match === 'none (prompt-only)' && entry.tokens.length === 0, `trade term ${entry.id}: promptOnly must have no tokens`);
      match = 'none';
    } else if (entry.match === 'substring') {
      match = 'substring';
    } else if (entry.match.startsWith('whole word; prefixes ') && entry.match.includes(' in any combination')) {
      match = 'wholeWord';
      prefixLetters = entry.match.slice(0, entry.match.indexOf(' in any combination')).match(/[\u05D0-\u05EA]/g) ?? [];
      assert(prefixLetters.length > 0, `trade term ${entry.id} has no prefix letters`);
    } else if (entry.match === `see ${entry.id} note`) {
      // M2a.7: the match rule is a section 20.6 prose note (checked in voiceProseM2a7); the gate code implements it per id.
      assert(NOTE_MATCH_IDS.includes(entry.id) && entry.tokens.length === 2, `trade term ${entry.id}: note match is only for ${NOTE_MATCH_IDS.join(', ')} with 2 tokens`);
      match = 'note';
    } else if (entry.match.startsWith('a leadVerbs word, one space, then the whole word ')) {
      assert(Array.isArray(entry.leadVerbs) && entry.leadVerbs.length > 0 && entry.tokens.length === 1 && entry.match.endsWith(entry.tokens[0]), `trade term ${entry.id}: lead-verb rule is malformed`);
      match = 'leadVerb';
    } else {
      assert(false, `trade term ${entry.id} has an unknown match rule`);
    }
    assert(match === 'none' || entry.tokens.length > 0, `trade term ${entry.id} has no tokens`);
    if (entry.replacementPair !== undefined) assert(typeof entry.replacementPair === 'string' && entry.replacementPair.length > 0, `trade term ${entry.id}: replacementPair is empty`);
    return { id: entry.id, tokens: entry.tokens, ...(entry.leadVerbs ? { leadVerbs: entry.leadVerbs } : {}), match, prefixLetters, type: entry.type, acOnly: entry.acOnly, meant: entry.meant, replacement: entry.replacement, ...(entry.replacementPair ? { replacementPair: entry.replacementPair } : {}) };
  });
  for (const [type, key] of [['gate', 'tradeTermGate'], ['spellingFix', 'tradeTermSpellingFix'], ['promptOnly', 'tradeTermPromptOnly']]) {
    const count = out.filter(entry => entry.type === type).length;
    assert(count === EXPECTED_COUNTS[key], `expected ${EXPECTED_COUNTS[key]} ${type} trade terms, got ${count}`);
  }
  return out;
}

/** Section 19.2: bad-idiom entries; the match rule is parsed ('substring' or whole word with prefix letters). */
function badIdioms(entries) {
  assert(Array.isArray(entries) && entries.length === EXPECTED_COUNTS.badIdiomEntries, `expected ${EXPECTED_COUNTS.badIdiomEntries} bad-idiom entries`);
  const out = entries.map(entry => {
    assert(typeof entry.id === 'string' && Array.isArray(entry.tokens) && entry.tokens.length > 0 && entry.tokens.every(token => typeof token === 'string' && token.length > 0), 'a bad-idiom entry is malformed');
    assert(['gate', 'spellingFix', 'promptOnly'].includes(entry.type), `bad-idiom ${entry.id} has an unknown type`);
    assert(typeof entry.replacement === 'string' && entry.replacement.length > 0 && typeof entry.meant === 'string', `bad-idiom ${entry.id} has no replacement`);
    let wholeWord = false;
    let prefixLetters = [];
    if (entry.match !== 'substring') {
      assert(entry.match.startsWith('whole word; prefixes ') && entry.match.endsWith(' in any combination'), `bad-idiom ${entry.id} has an unknown match rule`);
      wholeWord = true;
      prefixLetters = entry.match.match(/[\u05D0-\u05EA]/g) ?? [];
      assert(prefixLetters.length > 0, `bad-idiom ${entry.id} has no prefix letters`);
    }
    return {
      id: entry.id, tokens: entry.tokens, wholeWord, prefixLetters, type: entry.type, meant: entry.meant,
      replacement: entry.replacement, ...(entry.replacementFeminine ? { replacementFeminine: entry.replacementFeminine } : {}),
    };
  });
  const tokenCount = out.reduce((sum, entry) => sum + entry.tokens.length, 0);
  assert(tokenCount === EXPECTED_COUNTS.badIdiomTokens, `expected ${EXPECTED_COUNTS.badIdiomTokens} bad-idiom tokens, got ${tokenCount}`);
  for (const [type, key] of [['gate', 'badIdiomGate'], ['spellingFix', 'badIdiomSpellingFix'], ['promptOnly', 'badIdiomPromptOnly']]) {
    const count = out.filter(entry => entry.type === type).length;
    assert(count === EXPECTED_COUNTS[key], `expected ${EXPECTED_COUNTS[key]} ${type} bad idioms, got ${count}`);
  }
  return out;
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

  // M2a.5: section 19 voiceRules.
  const genericAdjectiveWords = stringList(merged.genericAdjectiveWords, 'genericAdjectiveWords');
  const genericAdjectivePhrases = stringList(merged.genericAdjectivePhrases, 'genericAdjectivePhrases');
  const genericAdjectiveExemptPhrases = stringList(merged.genericAdjectiveExemptPhrases, 'genericAdjectiveExemptPhrases');
  const idioms = badIdioms(merged.badIdiomTokens);
  const signature = merged.signatureWordTokens;
  assert(signature && typeof signature === 'object' && Object.keys(signature).length === EXPECTED_COUNTS.signatureGroups, `expected ${EXPECTED_COUNTS.signatureGroups} signature groups`);
  assert(Object.values(signature).every(list => Array.isArray(list) && list.length > 0 && list.every(item => typeof item === 'string' && item.length > 0)), 'signatureWordTokens must be lists of strings');
  const variantCount = Object.values(signature).reduce((sum, list) => sum + list.length, 0);
  assert(variantCount === EXPECTED_COUNTS.signatureVariants, `expected ${EXPECTED_COUNTS.signatureVariants} signature variants, got ${variantCount}`);
  const emergencyServiceKinds = stringList(merged.emergencyServiceKinds, 'emergencyServiceKinds');
  const plannedServiceKinds = stringList(merged.plannedServiceKinds, 'plannedServiceKinds');
  for (const kind of [...emergencyServiceKinds, ...plannedServiceKinds]) assert(/^[a-z-]+$/.test(kind), 'a service kind is not a lower-case slug part');
  const cta = merged.ctaLabelSets;
  assert(cta && typeof cta.formHeadlineFallback === 'string' && cta.formHeadlineFallback.length > 0, 'ctaLabelSets has no formHeadlineFallback');
  let ctaCount = 0;
  for (const stage of ['emergency', 'planned', 'neutral']) {
    const set = cta[stage];
    assert(set && Array.isArray(set.heroCta) && set.formHeadline && Array.isArray(set.formHeadline.labels) && Array.isArray(set.formHeadline.examples), `ctaLabelSets.${stage} is malformed`);
    for (const item of [...set.heroCta, ...set.formHeadline.labels, ...set.formHeadline.examples]) assert(typeof item === 'string' && item.length > 0, `ctaLabelSets.${stage} has an empty label`);
    ctaCount += set.heroCta.length + set.formHeadline.labels.length + set.formHeadline.examples.length;
  }
  assert(Object.keys(cta).length === 4, 'ctaLabelSets must hold exactly 3 stages and the fallback');
  assert(ctaCount === EXPECTED_COUNTS.ctaStageStrings, `expected ${EXPECTED_COUNTS.ctaStageStrings} stage CTA strings, got ${ctaCount}`);
  const stickyActionTokens = stringList(merged.stickyActionTokens, 'stickyActionTokens');
  const bareVerbSentenceOpeners = stringList(merged.bareVerbSentenceOpeners, 'bareVerbSentenceOpeners');
  const subjectCarryTokens = stringList(merged.subjectCarryTokens, 'subjectCarryTokens');
  const bareVerbExclusions = stringList(merged.bareVerbExclusions, 'bareVerbExclusions');
  const voice = voiceProse(text);

  // M2a.6: section 20 voiceRules.
  const additions = merged.signatureWordTokenAdditions;
  assert(additions && typeof additions === 'object' && Object.keys(additions).length === EXPECTED_COUNTS.signatureAdditionGroups, `expected ${EXPECTED_COUNTS.signatureAdditionGroups} signature addition groups`);
  assert(Object.values(additions).every(list => Array.isArray(list) && list.length > 0 && list.every(item => typeof item === 'string' && item.length > 0)), 'signatureWordTokenAdditions must be lists of strings');
  const additionCount = Object.values(additions).reduce((sum, list) => sum + list.length, 0);
  assert(additionCount === EXPECTED_COUNTS.signatureAdditionVariants, `expected ${EXPECTED_COUNTS.signatureAdditionVariants} signature addition variants, got ${additionCount}`);
  for (const [group, list] of Object.entries(additions)) for (const item of list) assert(!(signature[group] ?? []).includes(item), `signature addition ${group} repeats a section 19.3 variant`);
  assert(Object.keys(additions).filter(group => !(group in signature)).join(',') === 'pointByPoint', 'the only new signature group must be pointByPoint');
  const tilesBreakForms = stringList(merged.tilesBreakForms, 'tilesBreakForms');
  const tilesBreakExclusionsPrecedingWord = stringList(merged.tilesBreakExclusionsPrecedingWord, 'tilesBreakExclusionsPrecedingWord');
  assert('tiles' in signature, 'signatureWordTokens has no tiles group');
  const storyCustomerNouns = stringList(merged.storyCustomerNouns, 'storyCustomerNouns');
  const storyPastVerbs = stringList(merged.storyPastVerbs, 'storyPastVerbs');
  const storyQuantifierExclusions = stringList(merged.storyQuantifierExclusions, 'storyQuantifierExclusions');
  const storyTimeAnchors = stringList(merged.storyTimeAnchors, 'storyTimeAnchors');
  const moralEndingTokens = stringList(merged.moralEndingTokens, 'moralEndingTokens');
  const moralEndingFollowingExclusions = stringList(merged.moralEndingFollowingExclusions, 'moralEndingFollowingExclusions');
  const beforeTokens = stringList(merged.beforeTokens, 'beforeTokens');
  const beforeTimeWordExclusions = stringList(merged.beforeTimeWordExclusions, 'beforeTimeWordExclusions');
  const stickyBareForms = stringList(merged.stickyBareForms, 'stickyBareForms');
  const problem = merged.stickyProblemWords;
  assert(problem && typeof problem === 'object' && Object.keys(problem).join(',') === 'plumbing,electric,ac,general', 'stickyProblemWords must hold plumbing, electric, ac and general');
  assert(Object.keys(problem).length === EXPECTED_COUNTS.stickyProblemClasses, 'stickyProblemWords class count');
  assert(Object.values(problem).every(list => Array.isArray(list) && list.length > 0 && list.every(item => typeof item === 'string' && item.length > 0)), 'stickyProblemWords must be lists of strings');
  const problemCount = Object.values(problem).reduce((sum, list) => sum + list.length, 0);
  assert(problemCount === EXPECTED_COUNTS.stickyProblemWords, `expected ${EXPECTED_COUNTS.stickyProblemWords} sticky problem words, got ${problemCount}`);
  const opener = merged.serviceDetailsOpenerToken;
  assert(typeof opener === 'string' && /^[\u05D0-\u05EA]+$/.test(opener), 'serviceDetailsOpenerToken must be one Hebrew word');
  const acVerticalSlugKeywords = stringList(merged.acVerticalSlugKeywords, 'acVerticalSlugKeywords');
  const trade = tradeTerms(merged.tradeTermTokens);
  const arriveLocateNextWordExclusions = stringList(merged.arriveLocateNextWordExclusions, 'arriveLocateNextWordExclusions');
  const override = merged.heroCtaOverride;
  assert(override && Object.keys(override).join(',') === 'planned' && Object.keys(override.planned).join(',') === 'phone' &&
    typeof override.planned.phone === 'string' && override.planned.phone.length > 0, 'heroCtaOverride must be { planned: { phone } }');
  const prose20 = voiceProseM2a6(text);
  assert(prose20.timeWordTokens[0] === moralEndingTokens[0] || moralEndingTokens.includes(prose20.timeWordTokens[0]), 'section 20.2 time-word token is not a moral-ending token');
  assert(prose20.timeWordTokens.some(token => moralEndingTokens.includes(token)) && prose20.timeWordTokens.some(token => beforeTokens.includes(token)), 'section 20 time-word tokens must be one moral-ending and one before token');
  for (const word of prose20.stickyWholeWords) assert(Object.values(problem).flat().includes(word), 'a sticky whole-word entry is not a problem word');
  assert(acVerticalSlugKeywords.includes(prose20.acSegment), 'the AC segment keyword is not an acVerticalSlugKeyword');
  const sewage = trade.find(entry => entry.id === 'ac_sewage');
  assert(sewage && sewage.acOnly && /^[\u05D0-\u05EA]+$/.test(sewage.replacement), 'ac_sewage entry missing (its replacement word excludes a hit earlier in the clause)');
  assert(sectionText(text, 20).includes(`a hit is ignored when "${sewage.replacement}" appears earlier in the same clause`), 'section 20.6 ac_sewage clause note no longer names the replacement word');
  const ownerVoiceFieldSet = new Set(voice.ownerVoiceFields);
  for (const field of [...prose20.storyFields, ...prose20.moralFields]) assert(ownerVoiceFieldSet.has(field), `section 20 field ${field} is not an owner-voice field`);
  const voice20 = { ...prose20 };

  // M2a.7: Tamar's section 20 edits (hero-cap concepts, English differentiator keywords), Noa's notes and section 21.
  const groupLists = (value, name, groupsKey, entriesKey) => {
    assert(value && typeof value === 'object' && Object.keys(value).length === EXPECTED_COUNTS[groupsKey], `expected ${EXPECTED_COUNTS[groupsKey]} ${name} groups`);
    assert(Object.values(value).every(list => Array.isArray(list) && list.length > 0 && list.every(item => typeof item === 'string' && item.length > 0)), `${name} must be lists of strings`);
    const count = Object.values(value).reduce((sum, list) => sum + list.length, 0);
    assert(count === EXPECTED_COUNTS[entriesKey], `expected ${EXPECTED_COUNTS[entriesKey]} ${name} entries, got ${count}`);
    for (const group of Object.keys(value)) assert(group in signature || group in additions, `${name} group ${group} is not a signature group`);
    for (const list of Object.values(value)) assert(new Set(list).size === list.length, `${name} has duplicates`);
    return value;
  };
  const heroCapConceptAdditions = groupLists(merged.heroCapConceptAdditions, 'heroCapConceptAdditions', 'heroCapConceptGroups', 'heroCapConceptAdditions');
  const differentiatorUspKeywords = groupLists(merged.differentiatorUspKeywords, 'differentiatorUspKeywords', 'differentiatorUspGroups', 'differentiatorUspKeywords');
  for (const list of Object.values(differentiatorUspKeywords)) for (const keyword of list) assert(/^[a-z' ]+$/.test(keyword), 'a differentiatorUspKeywords entry is not lower-case English without hyphens');
  const prepositionSkipAdverbs = stringList(merged.prepositionSkipAdverbs, 'prepositionSkipAdverbs');
  const wrongPrepositionTokens = stringList(merged.wrongPrepositionTokens, 'wrongPrepositionTokens');
  const nameIntroToken = merged.nameIntroToken;
  assert(typeof nameIntroToken === 'string' && /^[\u05D0-\u05EA]+$/.test(nameIntroToken), 'nameIntroToken must be one Hebrew word');
  assert(subjectCarryTokens.includes(nameIntroToken), 'nameIntroToken is not a section 19.5 subjectCarryTokens word');
  const nameIntroLeadIns = stringList(merged.nameIntroLeadIns, 'nameIntroLeadIns');
  const prose21 = voiceProseM2a7(text, trade, heroCapConceptAdditions);
  for (const group of prose21.differentiatorExcludedGroups) assert(group in signature && !(group in differentiatorUspKeywords), 'the never-a-differentiator group must be a signature group with no English keywords');

  // M2b.1d: section 22 voiceRules M2b.
  const sourceAdd = merged.differentiatorSourceFieldsAdd;
  assert(Array.isArray(sourceAdd) && sourceAdd.join(',') === 'idealClientFear', 'differentiatorSourceFieldsAdd must be ["idealClientFear"]');
  const differentiatorFearKeywords = groupLists(merged.differentiatorFearKeywords, 'differentiatorFearKeywords', 'differentiatorFearGroups', 'differentiatorFearKeywords');
  for (const list of Object.values(differentiatorFearKeywords)) for (const keyword of list) assert(/^[a-z' ]+$/.test(keyword), 'a differentiatorFearKeywords entry is not lower-case English without hyphens');
  for (const group of prose21.differentiatorExcludedGroups) assert(!(group in differentiatorFearKeywords), 'the never-a-differentiator group has fear keywords');
  const noPromise = merged.aboutHeadlineNoPromise;
  assert(noPromise && noPromise.field === 'aboutPageHeadline' && Array.isArray(noPromise.forbidLists) && noPromise.forbidLists.length === EXPECTED_COUNTS.aboutHeadlineForbidLists, 'aboutHeadlineNoPromise must name aboutPageHeadline and its lists');
  assert(noPromise.forbidLists.join(',') === 'signatureWordTokens,signatureWordTokenAdditions,tilesBreakForms,heroCapConceptAdditions,beforeTokens', 'aboutHeadlineNoPromise lists changed: update the gate code');
  for (const name of noPromise.forbidLists) assert(name in merged, `aboutHeadlineNoPromise names an unknown list ${name}`);
  const servicesHeadlineOptions = stringList(merged.servicesHeadlineOptions, 'servicesHeadlineOptions');
  for (const option of servicesHeadlineOptions) assert(option === option.trim() && /[\u05D0-\u05EA]/.test(option), 'a servicesHeadlineOptions entry is not trimmed Hebrew');
  const trustBarFillerPhrases = stringList(merged.trustBarFillerPhrases, 'trustBarFillerPhrases');
  const { trustBarMaxItems, trustBarMaxChars } = merged;
  assert(Number.isInteger(trustBarMaxItems) && trustBarMaxItems > 0 && Number.isInteger(trustBarMaxChars) && trustBarMaxChars > 0, 'trustBarMaxItems / trustBarMaxChars must be positive integers');
  const prose22 = voiceProseM2b(text, { trustBarMaxItems, trustBarMaxChars });

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
    genericAdjectiveWords: `${sectionOf(text, 'genericAdjectiveWords')} 19.1 (whole word, prefix letters from the note)`,
    genericAdjectivePhrases: `${sectionOf(text, 'genericAdjectivePhrases')} 19.1 (substring)`,
    genericAdjectiveExemptPhrases: `${sectionOf(text, 'genericAdjectiveExemptPhrases')} 19.1 (masked before matching, like businessName)`,
    badIdiomTokens: `${sectionOf(text, 'badIdiomTokens')} 19.2 (gate and spellingFix reject; promptOnly in the prompt)`,
    signatureWordTokens: `${sectionOf(text, 'signatureWordTokens')} 19.3 (max 1 hit per group per page)`,
    serviceKinds: `${sectionOf(text, 'emergencyServiceKinds')} 19.4 (slug substring; stage chooses the CTA set)`,
    ctaLabelSets: `${sectionOf(text, 'ctaLabelSets')} 19.4 (prompt only)`,
    stickyActionTokens: `${sectionOf(text, 'stickyActionTokens')} 19.4 (stickyBarLine; not equal to heroCta)`,
    bareVerbSentenceOpeners: `${sectionOf(text, 'bareVerbSentenceOpeners')} 19.5 (aboutBlurb / aboutPageBody only)`,
    voicePromptRules: `${DATA_PATH} section 19.6 (P1-P7, English, byte-exact)`,
    signatureWordTokenAdditions: `${sectionOf(text, 'signatureWordTokenAdditions')} 20.1 (appended to the section 19.3 groups; pointByPoint is new)`,
    tilesBreakForms: `${sectionOf(text, 'tilesBreakForms')} 20.1 (tiles group, whole word; preceding-word exclusions)`,
    heroSignatureCap: `${DATA_PATH} section 20.1 site-wide hero cap (route order, home first)`,
    storyTokens: `${sectionOf(text, 'storyCustomerNouns')} 20.2 (invented customer story, patterns A and B)`,
    moralEndingTokens: `${sectionOf(text, 'moralEndingTokens')} 20.2 (moral ending; following-word and time-word exclusions)`,
    beforeTokens: `${sectionOf(text, 'beforeTokens')} 20.3 (before cap per page)`,
    stickyNaming: `${sectionOf(text, 'stickyBareForms')} 20.4 (bare line fails; must name the problem or the service)`,
    serviceDetailsOpenerToken: `${sectionOf(text, 'serviceDetailsOpenerToken')} 20.5 (at most half the descriptions)`,
    tradeTermTokens: `${sectionOf(text, 'tradeTermTokens')} 20.6 (gate and spellingFix reject; promptOnly in the prompt)`,
    heroCtaOverride: `${sectionOf(text, 'heroCtaOverride')} 20.7 (planned stage, phone sites; system mapping)`,
    m2a6PromptRules: `${DATA_PATH} section 20.8 (R1-R8, English, byte-exact; R8 keeps its sub-bullets)`,
    heroCapConceptAdditions: `${sectionOf(text, 'heroCapConceptAdditions')} 20.1 (site-wide hero cap only; substring on heroHeadline; own service label masked; AC-only entries)`,
    differentiatorUspKeywords: `${sectionOf(text, 'differentiatorUspKeywords')} 20.1 (owner differentiator from an English usp / guarantee; lower-case, hyphens to spaces, substring)`,
    prepositionSkipAdverbs: `${sectionOf(text, 'prepositionSkipAdverbs')} 20.6 (services_headline_preposition: one adverb skipped before the next-letter check)`,
    wrongPrepositionTokens: `${sectionOf(text, 'wrongPrepositionTokens')} 20.6 (typo gate; no Hebrew letter before or after)`,
    nameIntro: `${sectionOf(text, 'nameIntroToken')} (name opener and subject carry only at sentence start or after a lead-in plus comma)`,
    differentiatorFearKeywords: `${sectionOf(text, 'differentiatorFearKeywords')} 22.2 (owner differentiator from an English idealClientFear; lower-case, hyphens to spaces; Adam M2b.1d: word boundaries, plural / -y forms allowed)`,
    aboutHeadlineNoPromise: `${sectionOf(text, 'aboutHeadlineNoPromise')} 22.2 (aboutPageHeadline on pages that render the about section)`,
    servicesHeadlineOptions: `${sectionOf(text, 'servicesHeadlineOptions')} 22.2 (closed set; byte-identical after trimming; the system sets the first entry otherwise)`,
    trustBarFillerPhrases: `${sectionOf(text, 'trustBarFillerPhrases')} 22.2 (substring, trustBarItems only; exempt when verbatim in the owner facts)`,
    m2bPromptRules: `${DATA_PATH} section 22.3 (B1-B6, English, byte-exact; sub-lines kept; B2 on every page, the rest on homepage / services hub)`,
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
    genericAdjectiveWords,
    genericAdjectivePhrases,
    genericAdjectiveExemptPhrases,
    badIdioms: idioms,
    signatureWordTokens: signature,
    emergencyServiceKinds,
    plannedServiceKinds,
    ctaLabelSets: cta,
    stickyActionTokens,
    bareVerbSentenceOpeners,
    subjectCarryTokens,
    bareVerbExclusions,
    voice,
    signatureWordTokenAdditions: additions,
    tilesBreakForms,
    tilesBreakExclusionsPrecedingWord,
    storyCustomerNouns,
    storyPastVerbs,
    storyQuantifierExclusions,
    storyTimeAnchors,
    moralEndingTokens,
    moralEndingFollowingExclusions,
    beforeTokens,
    beforeTimeWordExclusions,
    stickyBareForms,
    stickyProblemWords: problem,
    serviceDetailsOpenerToken: opener,
    acVerticalSlugKeywords,
    tradeTerms: trade,
    arriveLocateNextWordExclusions,
    heroCtaOverride: override,
    voice20,
    heroCapConceptAdditions,
    differentiatorUspKeywords,
    prepositionSkipAdverbs,
    wrongPrepositionTokens,
    nameIntroToken,
    nameIntroLeadIns,
    voice21: prose21,
    differentiatorSourceFieldsAdd: sourceAdd,
    differentiatorFearKeywords,
    aboutHeadlineNoPromise: { field: noPromise.field, forbidLists: noPromise.forbidLists },
    servicesHeadlineOptions,
    trustBarFillerPhrases,
    trustBarMaxItems,
    trustBarMaxChars,
    voice22: prose22,
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

/** One stage of CTA_LABEL_SETS (Tamar section 19.4). */
export interface CtaStageSet { heroCta: readonly string[]; formHeadline: { labels: readonly string[]; examples: readonly string[] } }

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
/** Tamar section 19 (M2a.5): owner-voice fields (the section 19 gates check only these) and the bare-verb fields. */
${emit('OWNER_VOICE_FIELDS', data.voice.ownerVoiceFields, 'readonly string[]')}
${emit('BARE_VERB_FIELDS', data.voice.bareVerbFields, 'readonly string[]')}
/** Tamar section 19.1: empty quality words (whole word; GENERIC_ADJECTIVE_PREFIX_LETTERS before), phrases (substring), exempt phrases (masked). */
${emit('GENERIC_ADJECTIVE_WORDS', data.genericAdjectiveWords, 'readonly string[]')}
${emit('GENERIC_ADJECTIVE_PHRASES', data.genericAdjectivePhrases, 'readonly string[]')}
${emit('GENERIC_ADJECTIVE_EXEMPT_PHRASES', data.genericAdjectiveExemptPhrases, 'readonly string[]')}
${emit('GENERIC_ADJECTIVE_PREFIX_LETTERS', data.voice.genericPrefixLetters, 'readonly string[]')}
/** Tamar section 19.2: bad idioms ('gate' and 'spellingFix' reject and regenerate; 'promptOnly' is a prompt rule). Never auto-replaced. */
${emit('BAD_IDIOMS', data.badIdioms, "ReadonlyArray<{ id: string; tokens: readonly string[]; wholeWord: boolean; prefixLetters: readonly string[]; type: 'gate' | 'spellingFix' | 'promptOnly'; meant: string; replacement: string; replacementFeminine?: string }>")}
${emit('BAD_IDIOM_NOTES', data.voice.idiomNotes, 'readonly string[]')}
/** Tamar section 19.3: signature-phrase groups (all variants count; at most 1 hit per group per page). */
${emit('SIGNATURE_WORD_TOKENS', data.signatureWordTokens, 'Readonly<Record<string, readonly string[]>>')}
/** Tamar section 19.4: service stage kinds (lower-case slug substring) and the CTA label sets per stage. */
${emit('EMERGENCY_SERVICE_KINDS', data.emergencyServiceKinds, 'readonly string[]')}
${emit('PLANNED_SERVICE_KINDS', data.plannedServiceKinds, 'readonly string[]')}
${emit('CTA_LABEL_SETS', data.ctaLabelSets, 'Readonly<{ emergency: CtaStageSet; planned: CtaStageSet; neutral: CtaStageSet; formHeadlineFallback: string }>')}
/** Tamar section 19.4: stickyBarLine must contain one of these (substring) and must not equal heroCta. */
${emit('STICKY_ACTION_TOKENS', data.stickyActionTokens, 'readonly string[]')}
/** Tamar section 19.5: bare first-person verb sentence openers (aboutBlurb / aboutPageBody), subject carry tokens + prefixes, exclusions. */
${emit('BARE_VERB_SENTENCE_OPENERS', data.bareVerbSentenceOpeners, 'readonly string[]')}
${emit('SUBJECT_CARRY_TOKENS', data.subjectCarryTokens, 'readonly string[]')}
${emit('SUBJECT_CARRY_PREFIXES', data.voice.subjectCarryPrefixes, 'readonly string[]')}
${emit('BARE_VERB_EXCLUSIONS', data.bareVerbExclusions, 'readonly string[]')}
/** Tamar section 19.6: English prompt rules P1-P7 and the example-of-the-move bullet, byte-exact (Hebrew lists are inserted by name). */
${emit('VOICE_PROMPT_RULES', data.voice.promptRules, 'ReadonlyArray<{ id: string; text: string }>')}
/** Tamar section 20.1 (M2a.6): signature variants appended to the section 19.3 groups (pointByPoint is a new group). */
${emit('SIGNATURE_WORD_TOKEN_ADDITIONS', data.signatureWordTokenAdditions, 'Readonly<Record<string, readonly string[]>>')}
/** Tamar section 20.1: tile-breaking forms (tiles group; whole word, TILES_BREAK_PREFIX_LETTERS before) and the preceding words that exclude a hit (after stripping TILES_BREAK_STRIP_PREFIXES). */
${emit('TILES_BREAK_FORMS', data.tilesBreakForms, 'readonly string[]')}
${emit('TILES_BREAK_PREFIX_LETTERS', data.voice20.tilesBreakPrefixLetters, 'readonly string[]')}
${emit('TILES_BREAK_EXCLUSIONS_PRECEDING_WORD', data.tilesBreakExclusionsPrecedingWord, 'readonly string[]')}
${emit('TILES_BREAK_STRIP_PREFIXES', data.voice20.tilesBreakStripPrefixes, 'readonly string[]')}
/** Tamar section 20.1: the site-wide hero cap (a signature group may appear in at most this many of a run's hero headlines). */
${emit('HERO_SIGNATURE_CAP', data.voice20.heroCap, 'number')}
/** Tamar section 20.2: invented customer story (fields; pattern A noun + past verb with their prefixes and quantifier exclusions; pattern B clause-start anchors). */
${emit('STORY_FIELDS', data.voice20.storyFields, 'readonly string[]')}
${emit('STORY_CUSTOMER_NOUNS', data.storyCustomerNouns, 'readonly string[]')}
${emit('STORY_NOUN_PREFIXES', data.voice20.storyNounPrefixes, 'readonly string[]')}
${emit('STORY_PAST_VERBS', data.storyPastVerbs, 'readonly string[]')}
${emit('STORY_VERB_PREFIXES', data.voice20.storyVerbPrefixes, 'readonly string[]')}
${emit('STORY_QUANTIFIER_EXCLUSIONS', data.storyQuantifierExclusions, 'readonly string[]')}
${emit('STORY_QUANTIFIER_PREFIXES', data.voice20.storyQuantifierPrefixes, 'readonly string[]')}
${emit('STORY_TIME_ANCHORS', data.storyTimeAnchors, 'readonly string[]')}
/** Tamar section 20.2: moral ending (fields; substring tokens; following-word exclusions). */
${emit('MORAL_FIELDS', data.voice20.moralFields, 'readonly string[]')}
${emit('MORAL_ENDING_TOKENS', data.moralEndingTokens, 'readonly string[]')}
${emit('MORAL_ENDING_FOLLOWING_EXCLUSIONS', data.moralEndingFollowingExclusions, 'readonly string[]')}
/** Tamar section 20.3: "before" tokens, the per-page cap, and the time words that exclude a hit at the tokens of TIME_WORD_TOKENS. */
${emit('BEFORE_TOKENS', data.beforeTokens, 'readonly string[]')}
${emit('BEFORE_CAP', data.voice20.beforeCap, 'number')}
${emit('BEFORE_TIME_WORD_EXCLUSIONS', data.beforeTimeWordExclusions, 'readonly string[]')}
${emit('TIME_WORD_TOKENS', data.voice20.timeWordTokens, 'readonly string[]')}
/** Tamar section 20.4: bare sticky lines, problem words per vertical (+ general), the whole-word subset and its prefixes, the electric slug keywords. */
${emit('STICKY_BARE_FORMS', data.stickyBareForms, 'readonly string[]')}
${emit('STICKY_PROBLEM_WORDS', data.stickyProblemWords, 'Readonly<{ plumbing: readonly string[]; electric: readonly string[]; ac: readonly string[]; general: readonly string[] }>')}
${emit('STICKY_WHOLE_WORDS', data.voice20.stickyWholeWords, 'readonly string[]')}
${emit('STICKY_WHOLE_WORD_PREFIXES', data.voice20.stickyWholeWordPrefixes, 'readonly string[]')}
${emit('ELECTRIC_SLUG_KEYWORDS', data.voice20.electricSlugKeywords, 'readonly string[]')}
/** Tamar section 20.5: at most floor(half) of a page's serviceDetails descriptions may start with this whole word. */
${emit('SERVICE_DETAILS_OPENER_TOKEN', data.serviceDetailsOpenerToken, 'string')}
/** Tamar section 20.6: AC slug keywords (AC_SEGMENT_KEYWORD matches a whole hyphen segment, the rest as substrings), trade terms, arrive-locate exclusions and lead prefixes. */
${emit('AC_VERTICAL_SLUG_KEYWORDS', data.acVerticalSlugKeywords, 'readonly string[]')}
${emit('AC_SEGMENT_KEYWORD', data.voice20.acSegment, 'string')}
${emit('TRADE_TERMS', data.tradeTerms, "ReadonlyArray<{ id: string; tokens: readonly string[]; leadVerbs?: readonly string[]; match: 'substring' | 'wholeWord' | 'leadVerb' | 'note' | 'none'; prefixLetters: readonly string[]; type: 'gate' | 'spellingFix' | 'promptOnly'; acOnly: boolean; meant: string; replacement: string; replacementPair?: string }>")}
${emit('ARRIVE_LOCATE_NEXT_WORD_EXCLUSIONS', data.arriveLocateNextWordExclusions, 'readonly string[]')}
${emit('ARRIVE_LOCATE_LEAD_PREFIXES', data.voice20.arriveLocateLeadPrefixes, 'readonly string[]')}
/** Tamar section 20.7: heroCta on a planned-stage page of a phone site (system mapping, not a gate). */
${emit('HERO_CTA_OVERRIDE', data.heroCtaOverride, 'Readonly<{ planned: Readonly<{ phone: string }> }>')}
/** Tamar section 20.8: English prompt rules R1-R8, byte-exact (M2a.7: R8 keeps its indented sub-bullets, one per line). */
${emit('M2A6_PROMPT_RULES', data.voice20.promptRules, 'ReadonlyArray<{ id: string; text: string }>')}
/** M2a.7 (section 20.1): extra hero-cap concepts per signature group (site-wide hero cap only; plain substring on heroHeadline, own service label masked), and the entries that count only on AC pages. */
${emit('HERO_CAP_CONCEPT_ADDITIONS', data.heroCapConceptAdditions, 'Readonly<Record<string, readonly string[]>>')}
${emit('HERO_CAP_AC_ONLY', data.voice21.heroCapAcOnly, 'readonly string[]')}
/** M2a.7 (section 20.1): English usp / guarantee keywords that mark a signature group as the owner's differentiator; the per-page cap for those groups; the group that never is one. */
${emit('DIFFERENTIATOR_USP_KEYWORDS', data.differentiatorUspKeywords, 'Readonly<Record<string, readonly string[]>>')}
${emit('DIFFERENTIATOR_CAP', data.voice21.differentiatorCap, 'number')}
${emit('DIFFERENTIATOR_EXCLUDED_GROUPS', data.voice21.differentiatorExcludedGroups, 'readonly string[]')}
/** M2a.7 (section 20.6): the field the preposition and typo gates add to the owner-voice scope; the preposition gate's next letter and skip adverbs; the wrong-preposition tokens. */
${emit('EXTRA_GATE_FIELDS', data.voice21.extraGateFields, 'readonly string[]')}
${emit('PREPOSITION_PAIR_NEXT_LETTER', data.voice21.pairNextLetter, 'string')}
${emit('PREPOSITION_SKIP_ADVERBS', data.prepositionSkipAdverbs, 'readonly string[]')}
${emit('WRONG_PREPOSITION_TOKENS', data.wrongPrepositionTokens, 'readonly string[]')}
/** M2a.7 (Noa, section 20.6): the English prompt line on verbs and prepositions, byte-exact. */
${emit('PREPOSITION_PROMPT_LINE', data.voice21.promptLine, 'string')}
/** M2a.7 (Noa, section 21): the name opener and its lead-ins (a name intro only at sentence start or after a lead-in plus ", "). */
${emit('NAME_INTRO_TOKEN', data.nameIntroToken, 'string')}
${emit('NAME_INTRO_LEAD_INS', data.nameIntroLeadIns, 'readonly string[]')}
/** M2b.1d (Tamar section 22.2): owner fields added to the differentiator sources, and the English fear keywords per signature group. */
${emit('DIFFERENTIATOR_SOURCE_FIELDS_ADD', data.differentiatorSourceFieldsAdd, 'readonly string[]')}
${emit('DIFFERENTIATOR_FEAR_KEYWORDS', data.differentiatorFearKeywords, 'Readonly<Record<string, readonly string[]>>')}
/** M2b.1d (section 22.2): the about headline may hold none of these lists (by data-file name). */
${emit('ABOUT_HEADLINE_NO_PROMISE', data.aboutHeadlineNoPromise, 'Readonly<{ field: string; forbidLists: readonly string[] }>')}
/** M2b.1d (section 22.2): the services headline closed set (byte-identical after trimming). */
${emit('SERVICES_HEADLINE_OPTIONS', data.servicesHeadlineOptions, 'readonly string[]')}
/** M2b.1d (section 22.2): trust-bar filler phrases (substring, trustBarItems only) and the trust-bar size caps (items; code points per item). */
${emit('TRUST_BAR_FILLER_PHRASES', data.trustBarFillerPhrases, 'readonly string[]')}
${emit('TRUST_BAR_MAX_ITEMS', data.trustBarMaxItems, 'number')}
${emit('TRUST_BAR_MAX_CHARS', data.trustBarMaxChars, 'number')}
/** M2b.1d (section 22.3): English prompt rules B1-B6, byte-exact with their indented sub-lines; the ids that apply on every page. */
${emit('M2B_PROMPT_RULES', data.voice22.promptRules, 'ReadonlyArray<{ id: string; text: string }>')}
${emit('M2B_EVERY_PAGE_RULE_IDS', data.voice22.everyPageRuleIds, 'readonly string[]')}
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
  process.stdout.write(`${JSON.stringify({ dayLetters: data.dayLetters.length, claimKinds: Object.keys(data.claimTokens).length, claimTokens: Object.values(data.claimTokens).flat().length, pins: Object.keys(data.serviceLabelPins).length, wordEnd: data.claimTokenWordEnd.length, lead: data.fixTimeLeadTokens.length, within: data.fixTimeWithinWords.length, arrival: data.arrivalTokens.length, stems: data.customerStems.length, verbs: data.speechVerbs.length, plural: data.pluralAddressTokens.length, we: data.weTokens.length, wao: data.waoServiceTerms.length, thermal: data.thermalTokens.length, templates: Object.keys(data.templateStrings).length, sameDay: data.sameDayTokens.length, sameDayFinish: data.sameDayFinishVerbs.length, priceLock: data.priceLockTokens.length, prefixModes: Object.keys(data.pluralPrefixModes).length, tail: data.serviceAreaTailTokens.length, head: data.serviceAreaHeadTokens.length, region: data.serviceAreaRegionTokens.length, nearby: data.serviceAreaNearbyTokens.length, lamedHeads: data.serviceAreaLamedHeads.length, free: data.freeTokens.length, freeCallout: data.freeCalloutTokens.length, scopeNouns: Object.values(data.freeScopeNouns).flat().length, freeExclusion: data.freeExclusionWords.length, weFormVerbs: data.weFormVerbs.length, genericWords: data.genericAdjectiveWords.length, genericPhrases: data.genericAdjectivePhrases.length, genericExempt: data.genericAdjectiveExemptPhrases.length, genericPrefixes: data.voice.genericPrefixLetters.length, badIdioms: data.badIdioms.length, badIdiomTokens: data.badIdioms.flatMap(entry => entry.tokens).length, signatureGroups: Object.keys(data.signatureWordTokens).length, signatureVariants: Object.values(data.signatureWordTokens).flat().length, emergencyKinds: data.emergencyServiceKinds.length, plannedKinds: data.plannedServiceKinds.length, sticky: data.stickyActionTokens.length, openers: data.bareVerbSentenceOpeners.length, carry: data.subjectCarryTokens.length, carryPrefixes: data.voice.subjectCarryPrefixes.length, exclusions: data.bareVerbExclusions.length, ownerVoiceFields: data.voice.ownerVoiceFields.length, promptRules: data.voice.promptRules.length, signatureAdditions: Object.values(data.signatureWordTokenAdditions).flat().length, tilesBreakForms: data.tilesBreakForms.length, tilesBreakExclusions: data.tilesBreakExclusionsPrecedingWord.length, storyNouns: data.storyCustomerNouns.length, storyVerbs: data.storyPastVerbs.length, storyQuantifiers: data.storyQuantifierExclusions.length, storyAnchors: data.storyTimeAnchors.length, moralTokens: data.moralEndingTokens.length, moralFollowing: data.moralEndingFollowingExclusions.length, beforeTokens: data.beforeTokens.length, beforeTimeWords: data.beforeTimeWordExclusions.length, stickyBare: data.stickyBareForms.length, stickyProblem: Object.values(data.stickyProblemWords).flat().length, acSlugKeywords: data.acVerticalSlugKeywords.length, tradeTerms: data.tradeTerms.length, arriveLocateExclusions: data.arriveLocateNextWordExclusions.length, m2a6Rules: data.voice20.promptRules.length, heroCapConcepts: Object.values(data.heroCapConceptAdditions).flat().length, heroCapAcOnly: data.voice21.heroCapAcOnly.length, uspKeywords: Object.values(data.differentiatorUspKeywords).flat().length, uspGroups: Object.keys(data.differentiatorUspKeywords).length, skipAdverbs: data.prepositionSkipAdverbs.length, wrongPreposition: data.wrongPrepositionTokens.length, leadIns: data.nameIntroLeadIns.length, fearKeywords: Object.values(data.differentiatorFearKeywords).flat().length, servicesHeadlineOptions: data.servicesHeadlineOptions.length, trustBarFiller: data.trustBarFillerPhrases.length, trustBarMaxItems: data.trustBarMaxItems, trustBarMaxChars: data.trustBarMaxChars, m2bRules: data.voice22.promptRules.length, differentiatorCap: data.voice21.differentiatorCap, beforeCap: data.voice20.beforeCap, heroCap: data.voice20.heroCap, typographyChars: data.typographyRule.length })}\n`);
}
