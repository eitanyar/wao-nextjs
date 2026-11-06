import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SOURCE_SHA256 = '09dc8b0c100c2459658ad0bfbb595c5bcc4e7efbe22bd31d266a887650b5a3b6';
export const SOURCE_URL = new URL('../docs/copy/assisted-sitebot-pilot-microcopy-draft-2026-10-11.md', import.meta.url);
export const OUTPUT_URL = new URL('../src/lib/site-bot/auditJourneyCopy.ts', import.meta.url);
export const IDS = Object.freeze([
  'SB_PICK_PROMPT', 'SB_PICK_OPTION_BUTTON', 'SB_CONFIRM_SOLEMATCH', 'SB_CONFIRM_YES',
  'SB_CONFIRM_NO', 'SB_SELECTED_ACK', 'SB_NOMATCH_TITLE', 'SB_NOMATCH_BODY',
  'SB_CHECKLIST_INTRO', 'SB_STATUS_CONFIRMED', 'SB_STATUS_MISSING', 'SB_STATUS_UNKNOWN',
  'SB_MISSING_ACTION', 'SB_UNKNOWN_VERIFY', 'SB_CHECKLIST_CANDOR', 'SB_SELFFIX_ACCESS_NOTE',
  'SB_FIX_CATEGORIES', 'SB_FIX_HOURS', 'SB_FIX_PHOTOS',
]);

export function parseCopy(source) {
  const sections = source.split(/^### /m).slice(1);
  const result = {};
  for (const id of IDS) {
    const matches = sections.filter(section => section.match(/^([A-Z_]+)(?:\s|$)/)?.[1] === id);
    if (matches.length !== 1) throw new Error(`Missing or duplicate heading: ${id}`);
    const lines = matches[0].split('\n').filter(line => /^>(?: |$)/.test(line));
    const text = lines.map(line => line.replace(/^> ?/, '')).join('\n');
    if (!text.trim()) throw new Error(`Empty quote: ${id}`);
    result[id] = text;
  }
  return result;
}

export function generateCopy(source) {
  if (createHash('sha256').update(source).digest('hex') !== SOURCE_SHA256) throw new Error('Copy source digest changed');
  const copy = parseCopy(source);
  return [
    '// AUTO-GENERATED from docs/copy/assisted-sitebot-pilot-microcopy-draft-2026-10-11.md',
    `// Source SHA256: ${SOURCE_SHA256}`,
    '// Named section IDs below are provenance. Do not edit; run scripts/build-audit-journey-copy.mjs.',
    'export const AUDIT_JOURNEY_COPY = {',
    ...IDS.map(id => `  ${JSON.stringify(id)}: ${JSON.stringify(copy[id])},`),
    '} as const;', '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = generateCopy(fs.readFileSync(SOURCE_URL, 'utf8'));
  fs.writeFileSync(OUTPUT_URL, output, 'utf8');
  console.log(`Generated auditJourneyCopy.ts from ${IDS.length} pinned sections`);
}
