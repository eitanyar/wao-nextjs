import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'src/lib/crm/reviewFlywheelCopy.ts');
const testPath = resolve(root, 'src/lib/crm/reviewFlywheel.test.ts');
const mode = process.argv[2] ?? 'all';

if (!['all', '--tests-only', '--source-only'].includes(mode)) {
  throw new Error('Usage: node scripts/remove-review-content-steering.mjs [--tests-only|--source-only]');
}

function replaceOnce(input, pattern, replacement, label) {
  const globalPattern = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`);
  const matches = [...input.matchAll(globalPattern)];
  if (matches.length !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${matches.length}`);
  }
  return input.replace(pattern, replacement);
}

function transformSource(input) {
  let output = replaceOnce(
    input,
    /  service\?:\s+string;[^\n]*\n  city\?:\s+string;[^\n]*\n/,
    '',
    'source option fields',
  );

  output = replaceOnce(
    output,
    /  const \{ customerName, businessName, reviewLink, service, city \} = opts;\n[\s\S]*?    : (?<generic>`[^\n]+`);\n(?=  return \[)/,
    (_match, _generic, offset, whole, groups) =>
      `  const { customerName, businessName, reviewLink } = opts;\n  const thankYouLine = ${groups.generic};\n`,
    'source content steering branch',
  );

  return output;
}

function transformTests(input) {
  let output = replaceOnce(
    input,
    / \*   IM\s+= [^\n]*\n/,
    '',
    'test IM documentation',
  );
  output = replaceOnce(output, /const IM = '[^\n]+';\n/, '', 'test IM constant');
  output = replaceOnce(
    output,
    /retains the base format when no service\/city are supplied/,
    'uses the generic thank-you line',
    'generic template test title',
  );

  for (const title of [
    'weaves service and city into the thank-you line when both are supplied',
    'handles service-only enrichment',
    'handles city-only enrichment',
  ]) {
    output = replaceOnce(
      output,
      new RegExp(`\\n  it\\('${title}',[\\s\\S]*?\\n  \\}\\);`),
      '',
      `test ${title}`,
    );
  }

  output = replaceOnce(
    output,
    /    service: 'SafeServicePhrase',\n    city: 'CityPhrase',\n/,
    '',
    'WhatsApp legacy options',
  );
  output = replaceOnce(
    output,
    /uses the base template when no service\/city are supplied/,
    'uses the generic template',
    'WhatsApp generic test title',
  );
  output = replaceOnce(
    output,
    /(  const base: ReviewFlywheelForwardTemplateOptions = \{\n    customerName: 'Danny',\n    businessName: 'Mozes Locks',\n    reviewLink: 'https:\/\/g\.page\/r\/CXyz123\/review',\n  \};\n)/,
    `$1\n  it('exposes only customer, business, and review-link options', () => {\n    const publicOptionShape: Record<keyof ReviewFlywheelForwardTemplateOptions, true> = {\n      customerName: true,\n      businessName: true,\n      reviewLink: true,\n    };\n    assert.deepEqual(Object.keys(publicOptionShape).sort(), ['businessName', 'customerName', 'reviewLink']);\n  });\n\n  it('does not render legacy content steering fields', () => {\n    const staleOptions = ({ ...base, service: 'SafeServicePhrase', city: 'CityPhrase' }) as unknown as ReviewFlywheelForwardTemplateOptions;\n    const out = buildReviewForwardTemplate(staleOptions);\n    assert.ok(!out.includes('SafeServicePhrase'));\n    assert.ok(!out.includes('CityPhrase'));\n  });\n`,
    'public option shape tests',
  );

  return output;
}

if (mode !== '--source-only') {
  writeFileSync(testPath, transformTests(readFileSync(testPath, 'utf8')));
}
if (mode !== '--tests-only') {
  writeFileSync(sourcePath, transformSource(readFileSync(sourcePath, 'utf8')));
}
