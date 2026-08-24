import test from 'node:test';
import assert from 'node:assert/strict';

import { levenshtein } from './editDistance';

test('identical strings -> 0', () => {
  assert.equal(levenshtein('hello world', 'hello world'), 0);
});

test('empty vs non-empty -> length of the non-empty string', () => {
  assert.equal(levenshtein('', 'kitten'), 6);
  assert.equal(levenshtein('kitten', ''), 6);
  assert.equal(levenshtein('', ''), 0);
});

test('classic kitten/sitting case -> 3', () => {
  assert.equal(levenshtein('kitten', 'sitting'), 3);
});

test('single substitution -> 1', () => {
  assert.equal(levenshtein('cat', 'cot'), 1);
});

test('single insertion -> 1', () => {
  assert.equal(levenshtein('cat', 'cats'), 1);
});

test('single deletion -> 1', () => {
  assert.equal(levenshtein('cats', 'cat'), 1);
});

// Multibyte (surrogate-pair) code points must count as ONE unit each, not two —
// this is the code-point-iteration requirement (Array.from, not str.length indexing).
// Uses emoji rather than Hebrew so this file stays inside the Hebrew-safety banner.
test('multibyte code points count as single units, not UTF-16 code units', () => {
  const a = '😀😀😀'; // 3 code points, 6 UTF-16 code units
  const b = '😀😀';   // 2 code points, 4 UTF-16 code units
  assert.equal(levenshtein(a, b), 1); // one code-point deletion, not 2
  assert.equal(a.length, 6);           // sanity: str.length would over-count
  assert.equal(Array.from(a).length, 3);
});
