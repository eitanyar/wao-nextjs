import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const BUNDLE_PATH = path.join(REPO_ROOT, 'docs', 'research', 'site-bot', 'scorecard-copy-bundle.md');
const OUTPUT_PATH = path.join(REPO_ROOT, 'src', 'lib', 'site-bot', 'scorecardCopy.ts');

const EXPECTED_TOKENS = [
  // dimension titles (6)
  'DIM_CATEGORIES_TITLE',
  'DIM_HOURS_TITLE',
  'DIM_PHONE_WEBSITE_TITLE',
  'DIM_PHOTOS_TITLE',
  'DIM_REVIEWS_TITLE',
  'DIM_DESCRIPTION_TITLE',

  // status lines (18)
  'DIM_CATEGORIES_PASS',
  'DIM_CATEGORIES_FAIL',
  'DIM_CATEGORIES_UNKNOWN',
  'DIM_HOURS_PASS',
  'DIM_HOURS_FAIL',
  'DIM_HOURS_UNKNOWN',
  'DIM_PHONE_WEBSITE_PASS',
  'DIM_PHONE_WEBSITE_FAIL',
  'DIM_PHONE_WEBSITE_UNKNOWN',
  'DIM_PHOTOS_PASS',
  'DIM_PHOTOS_FAIL',
  'DIM_PHOTOS_UNKNOWN',
  'DIM_REVIEWS_PASS',
  'DIM_REVIEWS_FAIL',
  'DIM_REVIEWS_UNKNOWN',
  'DIM_DESCRIPTION_PASS',
  'DIM_DESCRIPTION_FAIL',
  'DIM_DESCRIPTION_UNKNOWN',

  // page chrome (13)
  'SCORELINE',
  'STATUS_PASS',
  'STATUS_FAIL',
  'STATUS_UNKNOWN',
  'SEC_FOUND',
  'SEC_MISSING',
  'SEC_UNKNOWN',
  'CTA_TRIAL',
  'CTA_SHARE',
  'NOTFOUND_TITLE',
  'NOTFOUND_BODY',
  'PAGE_TITLE',
  'PAGE_SUBTITLE',

  // DIY fixes (4)
  'DIY_HOWTO_LABEL',
  'DIY_CATEGORIES_STEPS',
  'DIY_HOURS_STEPS',
  'DIY_PHOTOS_STEPS',

  // entry form (9)
  'FORM_TITLE',
  'FORM_NAME_LABEL',
  'FORM_NAME_PLACEHOLDER',
  'FORM_PHONE_LABEL',
  'FORM_PHONE_PLACEHOLDER',
  'FORM_SUBMIT',
  'FORM_LOADING',
  'FORM_ERROR_GENERIC',
  'FORM_ERROR_RATE',

  // onboarding handoff (2)
  'PREFILL_HINT',
  'PREFILL_KEEP_WORD',

  // fix approval page (12)
  'FIX_PAGE_SUBTITLE',
  'FIX_APPROVED_NOTE',
  'FIX_APPROVE_BUTTON',
  'FIX_TYPE_LOCATION',
  'FIX_TYPE_CATEGORIES',
  'FIX_APPROVE_CATEGORIES',
  'FIX_APPROVE_HOURS',
  'FIX_APPROVE_PHONE_WEBSITE',
  'FIX_APPROVE_DESCRIPTION',
  'FIX_MANUAL_PHOTOS',
  'FIX_MANUAL_REVIEWS',
  'FIX_MANUAL_HEADER',
];

function countOccurrences(str, substr) {
  return str.split(substr).length - 1;
}

function parseBundle(bundleContent) {
  // Matches `## __TOKEN__` followed by code fence ```\n...\n```
  const tokenRegex = /^## __([A-Z0-9_]+)__\r?\n```[^\r\n]*\r?\n([\s\S]*?)\r?\n```/gm;
  const parsedTokens = new Map();
  const duplicateTokens = [];
  const seenHeadings = [];

  let match;
  while ((match = tokenRegex.exec(bundleContent)) !== null) {
    const tokenName = match[1];
    let content = match[2];

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

  // Assertion b: SCORELINE and PREFILL_HINT placeholders
  const scoreline = parsedTokens.get('SCORELINE');
  if (countOccurrences(scoreline, '__PASSED__') !== 1 || countOccurrences(scoreline, '__TOTAL__') !== 1) {
    throw new Error('SCORELINE must contain __PASSED__ and __TOTAL__ exactly once each');
  }

  const prefillHint = parsedTokens.get('PREFILL_HINT');
  if (countOccurrences(prefillHint, '__VALUE__') !== 1) {
    throw new Error('PREFILL_HINT must contain __VALUE__ exactly once');
  }

  // Assertion c: Corruption scan
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
    for (const ph of placeholders) {
      if (token === 'SCORELINE' && (ph === '__PASSED__' || ph === '__TOTAL__')) {
        continue;
      }
      if (token === 'PREFILL_HINT' && ph === '__VALUE__') {
        continue;
      }
      throw new Error(`Corruption scan failed for ${token}: contains unpermitted placeholder ${ph}`);
    }
  }
}

function generateCode(parsedTokens) {
  const sortedTokens = [...parsedTokens.keys()].sort();

  const lines = [
    '// AUTO-GENERATED from docs/research/site-bot/scorecard-copy-bundle.md',
    '// Task ID: 2026-08-25_005',
    '// DO NOT EDIT DIRECTLY. Run scripts/build-scorecard-copy.mjs to regenerate.',
    '',
    'export const SCORECARD_COPY: Record<string, string> = {',
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
