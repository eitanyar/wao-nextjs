// VERTICAL_MAP additions (Yonatan, docs/research/site-bot/licensed-trades-israel-2026-11-10.md line 48) and their
// substring traps. HEBREW-SAFETY: ZERO Hebrew bytes; the tokens are read from the research line at run time, and the trap
// words from the licensed-trades copy file.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { detectVertical, matchedVertical } from './verticalDetect';

const root = path.resolve(__dirname, '../../..');
const line = fs.readFileSync(path.join(root, 'docs/research/site-bot/licensed-trades-israel-2026-11-10.md'), 'utf8')
  .split('\n').find(item => item.startsWith('- **Add to both the licence list and `VERTICAL_MAP`:**')) ?? '';
const tokens = [...line.matchAll(/`([^`]+)`/g)].map(match => match[1]);
const [, gasTech, gas, , contractor, , broker, brokerage, , driving, teacher] = tokens;
const trades = JSON.parse(fs.readFileSync(path.join(root, 'docs/copy/site-bot-licensed-trades-2026-11-10.json'), 'utf8')) as { licenseExclude: string[] };
const HEBREW = /[\u05D0-\u05EA]/u;

test('the research line holds the tokens this test reads', () => {
  assert.equal(tokens.length, 11);
  for (const token of [gasTech, gas, contractor, broker, brokerage, driving, teacher]) assert.ok(HEBREW.test(token));
  assert.ok(driving.startsWith(teacher) && gasTech.includes(gas));
});

test('additions: gas technician / gas -> emergency-trades, contractor -> skilled-trades, broker / brokerage -> legal-financial', () => {
  assert.equal(detectVertical(gasTech), 'emergency-trades');
  assert.equal(detectVertical(gas), 'emergency-trades');
  assert.equal(detectVertical(`${gas} ${contractor}`), 'emergency-trades', 'the gas word on its own still counts');
  assert.equal(detectVertical(contractor), 'skilled-trades');
  assert.equal(matchedVertical(contractor), 'skilled-trades', 'a real match now, not the fallback');
  assert.equal(detectVertical(broker), 'legal-financial');
  assert.equal(detectVertical(brokerage), 'legal-financial');
});

test('trap: the driving teacher is checked before the teacher keyword', () => {
  assert.equal(detectVertical(teacher), 'remote-professional');
  assert.equal(detectVertical(driving), 'skilled-trades');
  assert.notEqual(matchedVertical(driving), matchedVertical(teacher));
});

test('trap: the gas token inside an unrelated longer word never matches', () => {
  const inside = trades.licenseExclude.filter(item => item.split(/\s+/u).some(word => word !== gas && word.startsWith(gas)) && !item.includes(' '));
  assert.ok(inside.length >= 1, 'the exclusion list holds a longer word that starts with the gas token');
  for (const word of inside) assert.equal(matchedVertical(word), null, word);
  // Synthetic letters (escapes) around the token: inside a word -> no match; with one prefix letter -> match.
  assert.equal(matchedVertical(`\u05DE${gas}\u05D9\u05DF`), null);
  assert.equal(matchedVertical(`${gas}\u05E8`), null);
  assert.equal(matchedVertical(`\u05D4${gas}`), 'emergency-trades');
});
