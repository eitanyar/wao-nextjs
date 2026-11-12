// HEBREW-SAFETY: zero Hebrew bytes. The generated landing-copy modules are exactly what the generator emits today.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { PAGES, generate, parseFields, tokenize, nest, NET_TOKEN } from './build-landing-copy.mjs';

test('committed landing-copy modules are exactly the generated ones (re-run scripts/build-landing-copy.mjs)', () => {
  for (const page of PAGES) {
    assert.equal(fs.readFileSync(page.output, 'utf8'), generate(page, fs.readFileSync(page.source, 'utf8')), page.id);
  }
  assert.ok([...fs.readFileSync(new URL('./build-landing-copy.mjs', import.meta.url), 'utf8')].every(c => c.codePointAt(0) < 128));
});

test('the generator fails closed', () => {
  assert.throws(() => parseFields('a :: x\na :: y'), /Duplicate/);
  assert.throws(() => parseFields('no separator'), /Not a/);
  assert.throws(() => parseFields('a ::  x'), /padded/);
  assert.throws(() => tokenize([['a', 'x 199 y']], '199', 2), /Expected 2/);
  assert.throws(() => tokenize([['a', '{x}']], '199', 0), /Brace/);
  assert.throws(() => nest([['a[1]', 'x']]), /Gap/);
  assert.deepEqual(tokenize([['a', '199 1990 2,199 19.9 199.']], '199', 1), [['a', `${NET_TOKEN} 1990 2,199 19.9 199.`]]);
});
