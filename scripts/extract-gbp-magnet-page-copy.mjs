import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const source = 'docs/copy/gbp-magnet-page-copy-2026-10-03.md';
const output = 'src/lib/gbp-magnet-page-copy.json';
const keys = [
  'page.headline', 'page.formIntro', 'page.previewTease', 'page.unlockCta',
  'page.consentLine', 'page.privacyNote',
  'form.businessNameLabel', 'form.cityLabel', 'form.categoryLabel', 'form.previewCta',
  'form.nameLabel', 'form.phoneLabel', 'form.emailLabel',
  'report.previewHeading', 'report.fullHeading', 'report.yourBusiness',
  'report.competitorsHeading', 'report.ratingLabel', 'report.reviewCountLabel',
  'report.paceLabel', 'report.smallSampleDisclaimer', 'page.nextStepGeneric',
  'state.noMatch', 'state.rateLimited', 'state.unavailable', 'state.validationError',
];
const check = process.argv.length === 3 && process.argv[2] === '--check';
if (process.argv.length > (check ? 3 : 2)) throw new Error('Usage: node scripts/extract-gbp-magnet-page-copy.mjs [--check]');

const expected = new Set(keys);
const copy = {};
for (const line of readFileSync(source, 'utf8').split(/\r?\n/u)) {
  const match = /^([a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z][a-zA-Z0-9]*): (.*)$/u.exec(line);
  if (!match) continue;
  const [, key, value] = match;
  if (!expected.has(key)) throw new Error(`Unexpected copy key ${key} in ${source}`);
  if (Object.hasOwn(copy, key)) throw new Error(`Duplicate copy key ${key} in ${source}`);
  if (!value.trim()) throw new Error(`Empty copy key ${key} in ${source}`);
  copy[key] = value;
}
for (const key of keys) if (!Object.hasOwn(copy, key)) throw new Error(`Missing copy key ${key} in ${source}`);
if (Object.keys(copy).length !== 26) throw new Error('Expected 26 copy keys');
const generated = Buffer.from(`${JSON.stringify(copy, null, 2)}\n`, 'utf8');
if (check) {
  const directory = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'gbp-magnet-copy-'));
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
