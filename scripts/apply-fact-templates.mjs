#!/usr/bin/env node
// Copy v2 (docs/missions/site-bot-code-owns-facts-2026-11-10.md, slice 1): copy the Tamar -> Noa fact templates byte-exact
// from docs/copy/site-bot-fact-templates-2026-11-10.json into OWNER_FACT_TEMPLATES in src/lib/lp/ownerFactCopy.ts.
// The engineer never types the Hebrew: this script moves it, then re-reads the written block and asserts it equals the file.
//
//   node scripts/apply-fact-templates.mjs [--check] [path/to/templates.json]
//
// --check: validate only (exit 1 when the file is missing or incomplete); writes nothing.
// Refuses to write unless every key is present, non-empty, carries exactly its slots and holds no __HE_TODO_ placeholder.
// Keys in the JSON that the loader does not read (e.g. "_rules", later-slice keys such as qaAnswerLead) are ignored.
// No Hebrew literals in this script.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const check = args.includes('--check');
const source = path.resolve(root, args.find(arg => !arg.startsWith('--')) ?? 'docs/copy/site-bot-fact-templates-2026-11-10.json');
const target = path.join(root, 'src/lib/lp/ownerFactCopy.ts');
const BEGIN = '// BEGIN OWNER_FACT_TEMPLATES';
const END = '// END OWNER_FACT_TEMPLATES';
const HE_TODO = '__HE_TODO_';

function die(message) {
  console.error(`apply-fact-templates: ${message}`);
  process.exit(1);
}

const ts = fs.readFileSync(target, 'utf8');
// The key list and slots are read from the module source itself (one source of truth).
const slotsBlock = /export const FACT_TEMPLATE_SLOTS = \{([\s\S]*?)\n\} as const/.exec(ts);
const parseBlock = /export const FACT_PARSE_TOKEN_KEYS = \[([\s\S]*?)\n\] as const/.exec(ts);
if (!slotsBlock || !parseBlock) die('could not read FACT_TEMPLATE_SLOTS / FACT_PARSE_TOKEN_KEYS from ownerFactCopy.ts');
const slots = Object.fromEntries([...slotsBlock[1].matchAll(/^\s+([A-Za-z]+): \[([^\]]*)\],/gm)].map(m => [m[1], [...m[2].matchAll(/'(\{[a-z]+\})'/g)].map(s => s[1])]));
const parseKeys = [...parseBlock[1].matchAll(/^\s+'([A-Za-z]+)',/gm)].map(m => m[1]);
if (Object.keys(slots).length < 20 || parseKeys.length < 5) die('key list parse looks wrong');

if (!fs.existsSync(source)) die(`missing ${path.relative(root, source)} (templates stay pending)`);
let json;
try { json = JSON.parse(fs.readFileSync(source, 'utf8')); } catch (error) { die(`not JSON: ${error.message}`); }

const problems = [];
const out = {};
for (const [key, want] of Object.entries(slots)) {
  const value = json[key];
  if (typeof value !== 'string' || !value.trim()) { problems.push(`${key}:missing`); continue; }
  if (value.includes(HE_TODO)) { problems.push(`${key}:pending`); continue; }
  const found = value.match(/\{[a-z]+\}/g) ?? [];
  if (found.length !== want.length || want.some(slot => !found.includes(slot))) problems.push(`${key}:slots(want ${want.join('') || 'none'})`);
  out[key] = value;
}
for (const key of parseKeys) {
  const value = json[key];
  if (!Array.isArray(value) || !value.length) { problems.push(`${key}:missing`); continue; }
  if (value.some(item => typeof item !== 'string' || !item.trim() || item.includes(HE_TODO))) { problems.push(`${key}:pending`); continue; }
  out[key] = value;
}
if (problems.length) die(`incomplete (${problems.length}): ${problems.join(', ')}`);
if (check) { console.log(`apply-fact-templates: ${path.relative(root, source)} complete (${Object.keys(out).length} keys)`); process.exit(0); }

const begin = ts.indexOf(BEGIN);
const end = ts.indexOf(END);
if (begin < 0 || end < 0 || ts.indexOf(BEGIN, begin + 1) >= 0 || ts.indexOf(END, end + 1) >= 0 || end < begin) die('markers missing or duplicated');
const headerEnd = ts.indexOf('\n', begin) + 1;
const body = `export const OWNER_FACT_TEMPLATES: OwnerFactTemplates = ${JSON.stringify(out, null, 2)};\n`;
const next = `${ts.slice(0, headerEnd)}${body}${ts.slice(end)}`;
fs.writeFileSync(target, next);

// Re-read and assert byte-exact: the written object equals the source values.
const written = fs.readFileSync(target, 'utf8');
const block = written.slice(written.indexOf(BEGIN), written.indexOf(END));
const literal = /= (\{[\s\S]*\});\n$/.exec(block);
if (!literal) die('written block unreadable');
const reread = JSON.parse(literal[1]);
for (const key of Object.keys(out)) {
  if (JSON.stringify(reread[key]) !== JSON.stringify(out[key])) die(`byte mismatch on ${key}`);
}
console.log(`apply-fact-templates: wrote ${Object.keys(out).length} keys into src/lib/lp/ownerFactCopy.ts (byte-exact). Run npm run test.`);
