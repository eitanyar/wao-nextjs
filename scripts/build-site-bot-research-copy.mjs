import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const BUNDLE_PATH = path.join(REPO_ROOT, 'docs', 'research', 'site-bot', 'research-flow-copy-bundle.json');
const OUTPUT_PATH = path.join(REPO_ROOT, 'src', 'lib', 'site-bot', 'researchCopy.ts');
const EXPECTED_KEYS = [
  'progress_truth', 'progress_keywords', 'progress_serps', 'progress_architecture', 'progress_copy',
  'gate_business_boundary', 'gate_service_attributes', 'gate_geography', 'gate_money_services',
  'gate_ambiguous_intent', 'hold_evidence', 'action_approve', 'action_edit', 'action_continue',
];

function main() {
  const source = JSON.parse(fs.readFileSync(BUNDLE_PATH, 'utf8'));
  const actualKeys = Object.keys(source).sort();
  const expectedKeys = [...EXPECTED_KEYS].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) throw new Error('Research copy bundle keys do not match the approved schema.');
  if (!Object.values(source).every(value => typeof value === 'string' && value.trim())) throw new Error('Research copy bundle contains an invalid value.');
  const code = [
    '// AUTO-GENERATED from docs/research/site-bot/research-flow-copy-bundle.json',
    '// DO NOT EDIT DIRECTLY. Run scripts/build-site-bot-research-copy.mjs to regenerate.',
    '',
    `export const RESEARCH_COPY = ${JSON.stringify(source, null, 2)} as const;`,
    '',
  ].join('\n');
  fs.writeFileSync(OUTPUT_PATH, code, 'utf8');
  console.log(`Generated ${OUTPUT_PATH}.`);
}

main();
