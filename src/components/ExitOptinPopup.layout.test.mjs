import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(dir, 'ExitOptinPopup.tsx'), 'utf8');
const contentDir = path.join(dir, '..', 'content');

test('exit opt-in copy inputs retain their approved bytes', () => {
  for (const [name, expected] of [
    ['exit-optin-copy.json', '1cf898763cb54a671faa44e84175909e27475189856ce078f9e53f359c7d420d'],
    ['exit-optin-niches.json', '200f9e196121a7235ab48175e5a506cba5690dd7713127ef404a6d74bae1c929'],
  ]) {
    const actual = createHash('sha256').update(fs.readFileSync(path.join(contentDir, name))).digest('hex');
    assert.equal(actual, expected, `${name} must stay byte-identical`);
  }
});

test('exit opt-in header separates preview from close control in normal flow', () => {
  const closeLine = src.split('\n').find(line => line.includes('ref={closeButton}'));
  assert.ok(closeLine);
  assert.match(closeLine, /focus-visible:outline-2/);
  assert.doesNotMatch(closeLine, /absolute/);
  assert.match(src, /flex items-start justify-between gap-3/);
  assert.match(src, /<p dir="ltr" className="[^"]*text-xs">Local mock preview/);
});

test('exit opt-in retains privacy and secondary links', () => {
  assert.match(src, /<p className="text-xs">\{privacy\.slice\(0, privacyBreak \+ 1\)\} <Link href="\/privacy" className="underline">/);
  assert.match(src, /href="\/google-ads\/onboarding"/);
  assert.match(src, /href="\/site-bot"/);
  assert.doesNotMatch(src, /site-bot\/start/);
});

test('exit opt-in retains focus trap, escape, and launcher gutter', () => {
  assert.match(src, /closeButton\.current\?\.focus\(\)/);
  assert.match(src, /event\.key === 'Escape'/);
  assert.match(src, /narrow \? 104 : 0/);
  assert.match(src, /calc\(100dvh - 184px\)/);
});
