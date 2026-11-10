#!/usr/bin/env node
// Intake credentials step (docs/missions/site-bot-code-owns-facts-2026-11-10.md, "Intake credentials step"): copy the
// Tamar -> Noa strings and Yonatan's licensed-trade keyword lists byte-exact into src/lib/site-bot/credentialsCopy.ts.
// The engineer never types the Hebrew: this script moves it, then re-reads the written block and asserts it equals the
// source files.
//
//   node scripts/apply-credentials-copy.mjs [--check]
//
// Sources:
//   docs/copy/site-bot-credentials-step-2026-11-10.json   (every key except "_rules")
//   docs/copy/site-bot-licensed-trades-2026-11-10.json    (licenseExclude, licensedTrades, contractorKeywords)
//   docs/copy/site-bot-fact-templates-2026-11-10.json     (parseNegationWords: the typed-"none" guard)
// No Hebrew literals in this script.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const check = process.argv.includes('--check');
const target = path.join(root, 'src/lib/site-bot/credentialsCopy.ts');
const BEGIN = '// BEGIN CREDENTIALS_STEP_SOURCE';
const END = '// END CREDENTIALS_STEP_SOURCE';

function die(message) {
  console.error(`apply-credentials-copy: ${message}`);
  process.exit(1);
}
const read = rel => {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) die(`missing ${rel}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const COPY_KEYS = ['stepIntro', 'yearsQuestion', 'yearsPlaceholder', 'licenseQuestion', 'licenseYes', 'licenseNo', 'licenseTypePrompt',
  'licenseTypePlaceholder', 'warrantyQuestion', 'warrantyNone', 'warrantySixMonths', 'warrantyOneYear', 'warrantyTwoYears', 'warrantyOther',
  'warrantyOtherPlaceholder', 'continueButton', 'skipButton'];
const TRADE_KEYS = ['licenseExclude', 'licensedTrades', 'contractorKeywords'];

const copy = read('docs/copy/site-bot-credentials-step-2026-11-10.json');
const trades = read('docs/copy/site-bot-licensed-trades-2026-11-10.json');
const facts = read('docs/copy/site-bot-fact-templates-2026-11-10.json');

const problems = [];
const out = { copy: {}, trades: {}, negationWords: [] };
const extra = Object.keys(copy).filter(key => key !== '_rules' && !COPY_KEYS.includes(key));
if (extra.length) problems.push(`unknown copy keys: ${extra.join(', ')}`);
for (const key of COPY_KEYS) {
  if (typeof copy[key] !== 'string' || !copy[key].trim()) problems.push(`copy.${key}`);
  else out.copy[key] = copy[key];
}
for (const key of TRADE_KEYS) {
  const list = trades[key];
  if (!Array.isArray(list) || !list.length || list.some(item => typeof item !== 'string' || !item.trim())) problems.push(`trades.${key}`);
  else out.trades[key] = list;
}
if (!Array.isArray(facts.parseNegationWords) || !facts.parseNegationWords.length) problems.push('parseNegationWords');
else out.negationWords = facts.parseNegationWords;
if (problems.length) die(`incomplete: ${problems.join(', ')}`);
if (check) { console.log('apply-credentials-copy: sources complete'); process.exit(0); }

const ts = fs.readFileSync(target, 'utf8');
const begin = ts.indexOf(BEGIN);
const end = ts.indexOf(END);
if (begin < 0 || end < 0 || ts.indexOf(BEGIN, begin + 1) >= 0 || ts.indexOf(END, end + 1) >= 0 || end < begin) die('markers missing or duplicated');
const headerEnd = ts.indexOf('\n', begin) + 1;
const body = `export const CREDENTIALS_STEP_SOURCE: CredentialsStepSource = ${JSON.stringify(out, null, 2)};\n`;
fs.writeFileSync(target, `${ts.slice(0, headerEnd)}${body}${ts.slice(end)}`);

const written = fs.readFileSync(target, 'utf8');
const block = written.slice(written.indexOf(BEGIN), written.indexOf(END));
const literal = /= (\{[\s\S]*\});\n$/.exec(block);
if (!literal || JSON.stringify(JSON.parse(literal[1])) !== JSON.stringify(out)) die('byte mismatch after write');
console.log(`apply-credentials-copy: wrote ${COPY_KEYS.length} strings, ${TRADE_KEYS.length} trade lists, ${out.negationWords.length} negation words (byte-exact).`);
