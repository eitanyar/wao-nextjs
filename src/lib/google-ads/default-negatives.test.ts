import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  DEFAULT_GENERIC_NEGATIVES,
  FREE_INTENT_PHRASE_NEGATIVES,
  GENERIC_WORD_NEGATIVES,
  NEVER_BLOCK_NEGATIVES,
  isNeverBlockNegative,
} from './default-negatives';
import { NEGATIVE_MATCH_TYPE, buildCampaignNegatives, negativeCollidesWithPositives, normalizeNegativeKeywords, validateCampaignStrategy } from './keyword-normalize';

// HEBREW-SAFETY: no Hebrew literals here. The expected list is read from Noa's review file.
const repo = process.cwd();
const reviewPath = path.join(repo, 'docs/copy/reviews/noa-round3-final-2026-11-12.md');

function noaFinalList(): string[] {
  const lines = fs.readFileSync(reviewPath, 'utf8').split('\n');
  const start = lines.indexOf('## Final phrase-match negatives (Noa-proofed)');
  assert.ok(start >= 0, 'Noa final-list heading not found');
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) break;
    out.push(line.trim());
  }
  return out;
}

test('default negatives contain all 16 Noa-proofed phrases, byte-exact and in order', () => {
  const expected = noaFinalList();
  assert.equal(expected.length, 16);
  assert.deepEqual([...FREE_INTENT_PHRASE_NEGATIVES], expected);
  for (const phrase of expected) assert.ok(DEFAULT_GENERIC_NEGATIVES.includes(phrase), phrase);
  assert.equal(new Set(DEFAULT_GENERIC_NEGATIVES).size, DEFAULT_GENERIC_NEGATIVES.length, 'no duplicates');
  assert.equal(DEFAULT_GENERIC_NEGATIVES.length, GENERIC_WORD_NEGATIVES.length + 16);
});

test('default negatives contain no bare free word', () => {
  const bareFree = NEVER_BLOCK_NEGATIVES[0];
  // The never-block word is the one Noa names after "Never block: bare".
  const neverLine = fs.readFileSync(reviewPath, 'utf8').split('\n').find((l) => l.startsWith('Never block: bare '));
  assert.ok(neverLine);
  assert.equal(neverLine.slice('Never block: bare '.length).split(',')[0].trim(), bareFree);
  for (const neg of DEFAULT_GENERIC_NEGATIVES) assert.equal(isNeverBlockNegative(neg), false, neg);
  // Every free-intent phrase is multi-word (it needs phrase match to mean anything).
  for (const phrase of FREE_INTENT_PHRASE_NEGATIVES) assert.ok(phrase.split(' ').length >= 2, phrase);
});

test('negatives are sent as PHRASE match, never BROAD', () => {
  assert.equal(NEGATIVE_MATCH_TYPE, 'PHRASE');
  const route = fs.readFileSync(path.join(repo, 'src/app/api/google-ads/create-campaign/route.ts'), 'utf8');
  const block = route.slice(route.indexOf('...normalizedNegatives.map('), route.indexOf('// ── Step 9'));
  assert.ok(block.length > 0);
  assert.match(block, /negative: true,\s*keyword: \{ text: kw, match_type: enums\.KeywordMatchType\[NEGATIVE_MATCH_TYPE\] \}/);
  assert.doesNotMatch(route, /KeywordMatchType\.BROAD/);
});

test('a strategy-provided bare free negative is dropped (also in quote/bracket notation); phrases survive clean', () => {
  const [bare, bareB] = NEVER_BLOCK_NEGATIVES;
  const phrase = FREE_INTENT_PHRASE_NEGATIVES[0];
  assert.deepEqual(normalizeNegativeKeywords([bare, ` "${bare}" `, `[${bareB}]`, `"${phrase}"`, 'jobs']), [phrase, 'jobs']);
  const r = validateCampaignStrategy({ keywords: ['plumber'], suggestedDailyBudget: 50, negativeKeywords: [bare, ...DEFAULT_GENERIC_NEGATIVES] });
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.negativeKeywords, [...DEFAULT_GENERIC_NEGATIVES]);
});

test('bot mock campaign and the strategy prompt both use the shared default list', () => {
  const bot = fs.readFileSync(path.join(repo, 'src/app/api/bot/route.ts'), 'utf8');
  assert.match(bot, /const genericNegatives = \[\.\.\.DEFAULT_GENERIC_NEGATIVES\];/);
  assert.match(bot, /drorData\.negativeKeywords = normalizeNegativeKeywords\(drorData\.negativeKeywords\)/);
  const prompts = fs.readFileSync(path.join(repo, 'src/lib/bot/prompts.ts'), 'utf8');
  assert.match(prompts, /6\. Generic negatives \(phrase match\): \$\{DEFAULT_GENERIC_NEGATIVES\.join\(", "\)\}/);
});

// ── Fallback merge + conflict guard (2026-11-12). Fixture Hebrew is read from the repo, never typed:
// the driving-teacher and plumber niche strings come from src/lib/lp/verticalDetect.ts.
function verticalDetectSource(): string {
  return fs.readFileSync(path.join(repo, 'src/lib/lp/verticalDetect.ts'), 'utf8');
}
function drivingTeacherNiche(): string {
  const m = verticalDetectSource().match(/Driving teacher[\s\S]*?keywords: \['([^']+)'\]/);
  assert.ok(m, 'driving-teacher keyword not found in verticalDetect.ts');
  return m[1];
}
function plumberNiche(): string {
  const m = verticalDetectSource().match(/Emergency Trades[\s\S]*?keywords: \['([^']+)'/);
  assert.ok(m, 'plumber keyword not found in verticalDetect.ts');
  return m[1];
}
const INSTRUCTOR_WORD = GENERIC_WORD_NEGATIVES[4]; // the "guide / instructor" word
const COURSE_WORD = GENERIC_WORD_NEGATIVES[1]; // the "course" word

test('fallback merge: no strategy negatives -> the full default list is sent, deduped and in order', () => {
  const r = buildCampaignNegatives({ strategyNegatives: [], positiveKeywords: [plumberNiche()], niche: plumberNiche() });
  assert.deepEqual(r.negatives, [...DEFAULT_GENERIC_NEGATIVES]);
  assert.deepEqual(r.droppedDefaults, []);
});

test('merge: strategy negatives first, defaults appended, duplicates and bare free dropped', () => {
  const [bare, inFree] = NEVER_BLOCK_NEGATIVES;
  const own = `"${GENERIC_WORD_NEGATIVES[0]}"`; // a default, in phrase notation -> deduped
  const r = buildCampaignNegatives({ strategyNegatives: [bare, inFree, own, 'extra-trade-negative'], positiveKeywords: ['plumber'] });
  assert.equal(r.negatives[0], GENERIC_WORD_NEGATIVES[0]);
  assert.equal(r.negatives[1], 'extra-trade-negative');
  assert.equal(r.negatives.length, DEFAULT_GENERIC_NEGATIVES.length + 1);
  assert.equal(new Set(r.negatives).size, r.negatives.length);
  for (const neg of r.negatives) assert.equal(isNeverBlockNegative(neg), false, neg);
});

test('conflict guard: a plumber fixture gets the full list', () => {
  const niche = plumberNiche();
  const r = buildCampaignNegatives({ strategyNegatives: [], positiveKeywords: [niche, `${niche} 24/7`], niche, primaryService: niche });
  assert.deepEqual(r.droppedDefaults, []);
  assert.deepEqual(r.negatives, [...DEFAULT_GENERIC_NEGATIVES]);
});

test('conflict guard: a driving-instructor fixture keeps its core keywords unblocked', () => {
  const niche = drivingTeacherNiche();
  const drivingWord = niche.split(' ')[1];
  assert.ok(drivingWord, 'driving word');
  const positives = [niche, `${INSTRUCTOR_WORD} ${drivingWord}`, `${COURSE_WORD} ${drivingWord}`];
  const r = buildCampaignNegatives({ strategyNegatives: [], positiveKeywords: positives, niche, primaryService: positives[1] });
  // The instructor and course words, and every free-phrase built on them, are dropped.
  assert.ok(r.droppedDefaults.includes(INSTRUCTOR_WORD));
  assert.ok(r.droppedDefaults.includes(COURSE_WORD));
  const freeOnThem = FREE_INTENT_PHRASE_NEGATIVES.filter((p) => p.startsWith(`${INSTRUCTOR_WORD} `) || p.startsWith(`${COURSE_WORD} `));
  assert.equal(freeOnThem.length, 4);
  for (const p of freeOnThem) assert.ok(r.droppedDefaults.includes(p), p);
  assert.equal(r.droppedDefaults.length, 6);
  // Nothing sent blocks a core keyword word.
  for (const neg of r.negatives) assert.equal(negativeCollidesWithPositives(neg, positives), false, neg);
  // Everything else is still sent.
  assert.equal(r.negatives.length, DEFAULT_GENERIC_NEGATIVES.length - 6);
});

test('conflict guard compares word forms, not substrings', () => {
  // Prefix letter attached (he, U+05D4) -> same word form.
  assert.equal(negativeCollidesWithPositives(COURSE_WORD, [`\u05D4${COURSE_WORD}`]), true);
  // Plural inflection (yod + final mem) -> same word form.
  assert.equal(negativeCollidesWithPositives(COURSE_WORD, [`${COURSE_WORD}\u05D9\u05DD`]), true);
  // Inside an unrelated longer word: not a collision (phrase match is word-level).
  assert.equal(negativeCollidesWithPositives('job', ['jobsite cleaning']), false);
  assert.equal(negativeCollidesWithPositives(COURSE_WORD, [`${COURSE_WORD}x`]), false);
  // Ambiguous inflection-looking forms count as a collision on purpose: dropping a default
  // negative is the safe direction (blocking the trade's own searches is not).
  // The free word on its own never counts as a collision.
  assert.equal(negativeCollidesWithPositives(FREE_INTENT_PHRASE_NEGATIVES[0], [`x ${NEVER_BLOCK_NEGATIVES[1]}`]), false);
});

// Roni's 2026-11-13 finding: a positive keyword in construct form (the "studies of" / "work of"
// forms) did not drop the matching default negative (plural / singular form). Fixture Hebrew is
// read from the repo, never typed: the construct keywords come from credentialsCopy.ts (a
// licensed-trade credential name ending in the driving word) and verticalAssets.ts (an image alt).
// Both lookups would fail loudly if the strings ever left the repo.
const STUDIES_WORD = GENERIC_WORD_NEGATIVES[2]; // the "studies" word (plural)
const WORK_WORD = GENERIC_WORD_NEGATIVES[5]; // the "work" word (singular, he ending)

function constructDrivingKeyword(): string {
  const drivingWord = drivingTeacherNiche().split(' ')[1];
  const source = fs.readFileSync(path.join(repo, 'src/lib/site-bot/credentialsCopy.ts'), 'utf8');
  const quoted = [...source.matchAll(/"([^"\n]+)"/g)].map((m) => m[1]);
  // The construct form of the plural default: same letters minus the plural's final mem.
  const construct = STUDIES_WORD.slice(0, -1);
  const hit = quoted.find((q) => {
    const parts = q.split(' ');
    return parts.length === 2 && parts[1] === drivingWord && parts[0] === construct;
  });
  assert.ok(hit, 'construct-form driving keyword not found in credentialsCopy.ts');
  return hit;
}

function constructWorkPhrase(): string {
  const source = fs.readFileSync(path.join(repo, 'src/lib/lp/verticalAssets.ts'), 'utf8');
  // An alt text whose first word is the singular default with a different last letter (tav).
  const stem = WORK_WORD.slice(0, -1);
  const alts = [...source.matchAll(/alt: '([^']+)'/g)].map((m) => m[1]);
  const hit = alts.find((a) => {
    const first = a.split(' ')[0];
    return first.length === WORK_WORD.length && first.startsWith(stem) && first !== WORK_WORD;
  });
  assert.ok(hit, 'construct-form work phrase not found in verticalAssets.ts');
  return hit;
}

test('conflict guard: a construct-state positive drops the plural default negative (studies)', () => {
  const keyword = constructDrivingKeyword();
  // Precondition: the construct form is neither the default itself nor default + an ending.
  assert.notEqual(keyword.split(' ')[0], STUDIES_WORD);
  assert.equal(negativeCollidesWithPositives(STUDIES_WORD, [keyword]), true);
  const niche = drivingTeacherNiche();
  const r = buildCampaignNegatives({ strategyNegatives: [], positiveKeywords: [niche, keyword], niche });
  assert.ok(r.droppedDefaults.includes(STUDIES_WORD));
  assert.ok(!r.negatives.includes(STUDIES_WORD));
  for (const neg of r.negatives) assert.equal(negativeCollidesWithPositives(neg, [niche, keyword]), false, neg);
});

test('conflict guard: a construct-state positive drops the singular default negative (work)', () => {
  const phrase = constructWorkPhrase();
  assert.notEqual(phrase.split(' ')[0], WORK_WORD);
  assert.equal(negativeCollidesWithPositives(WORK_WORD, [phrase]), true);
  const r = buildCampaignNegatives({ strategyNegatives: [], positiveKeywords: [phrase] });
  assert.ok(r.droppedDefaults.includes(WORK_WORD));
});

test('conflict guard: stripping endings on both sides still never matches inside a longer unrelated word', () => {
  assert.equal(negativeCollidesWithPositives(STUDIES_WORD, [`${STUDIES_WORD}x`]), false);
  assert.equal(negativeCollidesWithPositives(WORK_WORD, ['jobsite']), false);
  // The plumber fixture still gets the full default list.
  const niche = plumberNiche();
  assert.deepEqual(buildCampaignNegatives({ strategyNegatives: [], positiveKeywords: [niche], niche }).droppedDefaults, []);
});
