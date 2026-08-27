import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const BUNDLE_PATH = path.join(REPO_ROOT, 'docs', 'research', 'site-bot', 'acquisition-copy-bundle.md');
const OUTPUT_PATH = path.join(REPO_ROOT, 'src', 'lib', 'site-bot', 'acquisitionCopy.ts');

const EXPECTED_TOKENS = [
  // WhatsApp share (2)
  'WA_SHARE_PEER_TEXT',
  'WA_SHARE_MARKETER_TEXT',

  // Cold outbound hooks (5)
  'OUTBOUND_HOOK_CATEGORIES',
  'OUTBOUND_HOOK_HOURS',
  'OUTBOUND_HOOK_PHOTOS',
  'OUTBOUND_HOOK_GENERAL',
  'OUTBOUND_FOLLOWUP',

  // Community posts (2)
  'COMMUNITY_POST_HEADLINE',
  'COMMUNITY_POST_BODY',

  // Entry hero & value props (7)
  'ENTRY_HERO_HEADLINE',
  'ENTRY_HERO_SUBTITLE',
  'ENTRY_VALUE_PROP_1',
  'ENTRY_VALUE_PROP_2',
  'ENTRY_VALUE_PROP_3',
  'ENTRY_CTA_BUTTON',
  'ENTRY_TRUST_BADGE',
];

function parseBundle(bundleContent) {
  // Matches `## __TOKEN__` followed by code fence ```\n...\n```
  const tokenRegex = /^## __([A-Z0-9_]+)__\r?\n```[^\r\n]*\r?\n([\s\S]*?)\r?\n```/gm;
  const parsedTokens = new Map();
  const duplicateTokens = [];
  const seenHeadings = [];

  let match;
  while ((match = tokenRegex.exec(bundleContent)) !== null) {
    const tokenName = match[1];
    const content = match[2].trim();

    seenHeadings.push(tokenName);

    if (parsedTokens.has(tokenName)) {
      duplicateTokens.push(tokenName);
    }

    parsedTokens.set(tokenName, content);
  }

  // Also check for any heading of format `## __...__` that might not have matched the code block
  const headingRegex = /^## __([A-Z0-9_]+)__/gm;
  const allHeadings = [];
  let headingMatch;
  while ((headingMatch = headingRegex.exec(bundleContent)) !== null) {
    allHeadings.push(headingMatch[1]);
  }

  if (allHeadings.length !== seenHeadings.length) {
    throw new Error(
      `Heading parse mismatch: found ${allHeadings.length} headings but matched ${seenHeadings.length} blocks`
    );
  }

  if (duplicateTokens.length > 0) {
    throw new Error(`Duplicate tokens found in bundle: ${duplicateTokens.join(', ')}`);
  }

  return parsedTokens;
}

function validateTokens(parsedTokens) {
  const expectedSet = new Set(EXPECTED_TOKENS);
  const actualSet = new Set(parsedTokens.keys());

  if (expectedSet.size !== EXPECTED_TOKENS.length) {
    throw new Error('Duplicate token in EXPECTED_TOKENS definition list');
  }

  const missing = [...expectedSet].filter((t) => !actualSet.has(t));
  const extra = [...actualSet].filter((t) => !expectedSet.has(t));

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `Token set symmetric difference:\nMissing: ${missing.join(', ') || 'none'}\nExtra: ${extra.join(', ') || 'none'}`
    );
  }

  // Corruption scan
  // CJK: U+4E00-U+9FFF, U+3040-U+30FF
  // Arabic: U+0600-U+06FF
  // Cyrillic: U+0400-U+04FF
  const forbiddenCharsRegex = /[\u4E00-\u9FFF\u3040-\u30FF\u0600-\u06FF\u0400-\u04FF]/;
  const placeholderRegex = /__[A-Z0-9_]+__/g;

  for (const [token, value] of parsedTokens.entries()) {
    if (forbiddenCharsRegex.test(value)) {
      throw new Error(`Corruption scan failed for ${token}: contains forbidden CJK/Arabic/Cyrillic character`);
    }

    const placeholders = value.match(placeholderRegex) || [];
    if (placeholders.length > 0) {
      throw new Error(`Corruption scan failed for ${token}: contains unpermitted placeholder ${placeholders.join(', ')}`);
    }
  }
}

function generateCode(parsedTokens) {
  const sortedTokens = [...parsedTokens.keys()].sort();

  const lines = [
    '// AUTO-GENERATED from docs/research/site-bot/acquisition-copy-bundle.md',
    '// Task ID: 2026-08-26_005',
    '// DO NOT EDIT DIRECTLY. Run node scripts/build-acquisition-copy.mjs to regenerate.',
    '',
    'export const ACQUISITION_COPY: Record<string, string> = {',
  ];

  for (const token of sortedTokens) {
    const value = parsedTokens.get(token);
    lines.push(`  ${JSON.stringify(token)}: ${JSON.stringify(value)},`);
  }

  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(BUNDLE_PATH)) {
    throw new Error(`Bundle file not found at ${BUNDLE_PATH}`);
  }

  const bundleContent = fs.readFileSync(BUNDLE_PATH, 'utf8');
  const parsedTokens = parseBundle(bundleContent);
  validateTokens(parsedTokens);

  const code = generateCode(parsedTokens);

  const outDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, code, 'utf8');
  console.log(`Successfully generated ${OUTPUT_PATH} with ${parsedTokens.size} tokens.`);
}

main();
