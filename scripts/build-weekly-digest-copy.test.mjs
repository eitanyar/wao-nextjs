// HEBREW-SAFETY: zero Hebrew bytes. The generated weekly-digest template module is exactly what the generator emits.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SOURCE, OUTPUT, EXPECTED_LINES, generate, pick } from './build-weekly-digest-copy.mjs';

const source = fs.readFileSync(SOURCE, 'utf8');

test('committed weekly-digest template module is exactly the generated one (re-run scripts/build-weekly-digest-copy.mjs)', () => {
  assert.equal(fs.readFileSync(OUTPUT, 'utf8'), generate(source));
  assert.ok([...fs.readFileSync(new URL('./build-weekly-digest-copy.mjs', import.meta.url), 'utf8')].every(c => c.codePointAt(0) < 128));
});

test('every template line is carried byte-exact, in order', () => {
  const src = JSON.parse(source);
  const out = pick(src);
  assert.deepEqual(out.map(l => l.id), EXPECTED_LINES.map(([id]) => id));
  out.forEach((l, i) => {
    assert.equal(l.text, src.template_lines[i].text);
    assert.equal(l.when, src.template_lines[i].when);
  });
});

test('the generator fails closed', () => {
  const src = JSON.parse(source);
  const lines = src.template_lines;
  assert.throws(() => pick({ template_lines: lines.slice(1) }), /Expected 12/);
  assert.throws(() => pick({ template_lines: [lines[1], lines[0], ...lines.slice(2)] }), /expected id greeting/);
  assert.throws(() => pick({ template_lines: [{ ...lines[0], text: lines[0].text + ' {extra}' }, ...lines.slice(1)] }), /Placeholders for greeting/);
  assert.throws(() => pick({ template_lines: [lines[0], { ...lines[1], text: `"${lines[1].text}"` }, ...lines.slice(2)] }), /ASCII quote/);
  assert.throws(() => pick({ template_lines: [{ ...lines[0], text: lines[0].text + '  x' }, ...lines.slice(1)] }), /Double space/);
});
