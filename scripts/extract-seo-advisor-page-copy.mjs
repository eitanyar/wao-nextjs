import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sources = [
  ['docs/copy/seo-advisor-page-chrome-2026-10-02.md', [
    'metadata.title', 'metadata.description', 'page.h1', 'page.subheadline',
    'form.domainLabel', 'form.domainPlaceholder', 'form.submitCta',
    'state.thinkingLabel', 'state.unavailableMessage', 'state.rateLimitedMessage',
    'state.restartCta', 'legal.disclaimer', 'cta.consultLink', 'cta.consultNote',
  ]],
  ['docs/copy/seo-advisor-control-labels-2026-10-02.md', [
    'control.nextIntro', 'control.hesitation', 'control.guarantee',
    'control.approve', 'control.decline', 'control.close', 'control.noContact',
    'form.marketLabel', 'form.marketIl', 'form.marketUs',
    'a11y.chatRegionLabel', 'a11y.advisorName',
  ]],
];
const output = 'src/lib/seo-advisor-page-copy.json';
const check = process.argv.length === 3 && process.argv[2] === '--check';
if (process.argv.length > (check ? 3 : 2)) throw new Error('Usage: node scripts/extract-seo-advisor-page-copy.mjs [--check]');

const copy = {};
for (const [file, keys] of sources) {
  const expected = new Set(keys);
  const found = new Set();
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/u)) {
    const match = /^([a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z][a-zA-Z0-9]*): (.*)$/u.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (!expected.has(key)) throw new Error(`Unexpected copy key ${key} in ${file}`);
    if (found.has(key)) throw new Error(`Duplicate copy key ${key} in ${file}`);
    if (!value.trim()) throw new Error(`Empty copy key ${key} in ${file}`);
    found.add(key);
    if (Object.hasOwn(copy, key)) throw new Error(`Duplicate copy key ${key}`);
    copy[key] = value;
  }
  for (const key of keys) if (!found.has(key)) throw new Error(`Missing copy key ${key} in ${file}`);
}
if (Object.keys(copy).length !== 26) throw new Error('Expected 26 copy keys');
const generated = Buffer.from(`${JSON.stringify(copy, null, 2)}\n`, 'utf8');
if (check) {
  const directory = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'seo-advisor-copy-'));
  try {
    const temporary = join(directory, 'copy.json');
    writeFileSync(temporary, generated);
    if (!readFileSync(temporary).equals(readFileSync(output))) throw new Error(`Copy drift in ${output}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
} else {
  writeFileSync(output, generated);
}
console.log(`${check ? 'CHECK' : 'EXTRACT'} PASS: 26/26 keys byte-identical to source bundle lines`);
