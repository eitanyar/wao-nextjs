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
import { NEGATIVE_MATCH_TYPE, normalizeNegativeKeywords, validateCampaignStrategy } from './keyword-normalize';

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
