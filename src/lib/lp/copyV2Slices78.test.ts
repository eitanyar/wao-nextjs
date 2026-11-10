// Copy v2 slices 7-8: the warn-only promise-contradiction judge (stubbed, off) and the pitch's ASCII-quote fix.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes; Hebrew letters are escapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPromiseJudgeMessage,
  hebrewQuoteMarks,
  PROMISE_JUDGE_ENABLED,
  promiseContradictionWarnings,
} from './researchPageCopy';

const A = '\u05D0';
const B = '\u05D1';
const C = '\u05D2';
const GERESH = '\u05F3';
const GERSHAYIM = '\u05F4';

test('slice 7: the judge is off by default and never calls the model while off', async () => {
  assert.equal(PROMISE_JUDGE_ENABLED, false);
  let calls = 0;
  const callJson = async () => { calls++; return '{}'; };
  assert.deepEqual(await promiseContradictionWarnings({ heroHeadline: 'x' }, callJson), []);
  assert.equal(calls, 0);
});

test('slice 7: when enabled (tests only) it logs field-level warnings, never text, and ignores a broken answer', async () => {
  const answer = JSON.stringify({ promise: 'p', contradictingSentences: [{ field: 'storyBody', sentence: 's1' }, { field: 'storyBody', sentence: 's2' }, { field: 'serviceDetails[1].description', sentence: 's3' }, { field: 'formHeadline', sentence: 'x' }] });
  const warnings = await promiseContradictionWarnings({ heroHeadline: 'h', storyBody: 'b' }, async (system, message, options) => {
    assert.ok(message.includes('contradictingSentences') && options?.think === false);
    return answer;
  }, true);
  assert.deepEqual(warnings, [
    { field: 'storyBody', rule: 'gate_promise_contradiction', actual: 2 },
    { field: 'serviceDetails', rule: 'gate_promise_contradiction', actual: 1 },
  ]);
  assert.deepEqual(await promiseContradictionWarnings({}, async () => 'not json', true), []);
  assert.deepEqual(await promiseContradictionWarnings({}, async () => { throw new Error('down'); }, true), []);
  assert.ok(!buildPromiseJudgeMessage({ heroHeadline: 'h', formHeadline: 'f' }).includes('formHeadline'));
});

test('slice 8: ASCII quotes in Hebrew become geresh / gershayim; non-Hebrew text is untouched', () => {
  assert.equal(hebrewQuoteMarks(`${A}${B}"${C}`), `${A}${B}${GERSHAYIM}${C}`, 'abbreviation');
  assert.equal(hebrewQuoteMarks(`${C}'${A}${B}`), `${C}${GERESH}${A}${B}`, 'geresh inside a word');
  assert.equal(hebrewQuoteMarks(`${A} '${B}${C}' ${A}`), `${A} ${GERSHAYIM}${B}${C}${GERSHAYIM} ${A}`, 'a single-quoted run becomes a gershayim pair');
  assert.equal(hebrewQuoteMarks(`${A} "${B}${C}" ${A}`), `${A} ${GERSHAYIM}${B}${C}${GERSHAYIM} ${A}`);
  assert.equal(hebrewQuoteMarks(`It's "fine"`), `It's "fine"`);
  assert.ok(!/["']/.test(hebrewQuoteMarks(`${A}'s "${B}" ${C}'`)));
});
