// Paid-journey v2 M2a (B4): limits derived from the validator, bounded repair pass,
// safe deterministic fixes. HEBREW-SAFETY: this file contains ZERO Hebrew bytes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySafeDeterministicFixes,
  assertBoundedGeneratedSiteCopy,
  buildCopyRepairPrompt,
  buildNoaQaMessage,
  buildResearchPageGenerationPrompt,
  buildSiteCopyHardLimitsBlock,
  explainGeneratedSiteCopyViolations,
  generateResearchPageCopy,
  GeneratedCopyValidationError,
  MAX_COPY_REPAIRS,
  SITE_COPY_KEY_LIST,
  SITE_COPY_MAX_BYTES,
  SITE_COPY_OPTIONAL_STRING_LIMITS,
  SITE_COPY_PAIR_LIST_LIMITS,
  SITE_COPY_STRING_LIMITS,
  SITE_COPY_STRING_LIST_LIMITS,
  type CopyRepairEvent,
} from './researchPageCopy';
import type { SiteCopy } from './lpCopyPrompt';
import type { PageBrief } from '../site-bot/research/pageBrief';

const brief: PageBrief = {
  page: { id: 'home', targetPath: '/', pageClass: 'homepage' },
  persona: { id: 'persona', value: 'Local buyer' },
  waoOffer: { id: 'offer', value: 'Managed service' },
  targetQueries: [{ id: 'query', value: 'alpha service' }],
  approvedEntityAnchors: [{ id: 'entity', value: 'Alpha service' }],
  firstPartyProof: [], assertableLocalFacts: [], customerDecisions: [], constraints: [],
  links: [], informationGainGaps: [], prohibitedClaims: ['No invented prices'],
  faqPolicy: 'none', faqCandidates: [],
};

const valid: SiteCopy = {
  heroHeadline: 'Headline', heroSubheadline: 'Subheadline', heroCta: 'Call',
  trustBarItems: ['Proof one', 'Proof two'], aboutBlurb: 'About', servicesHeadline: 'Services',
  serviceItems: ['Alpha'], faqHeadline: 'FAQ', faqItems: [],
  guaranteeBlock: 'Guarantee', reviewFeatured: null, reviewContext: null,
  responseTimeBadge: null, scarcityLine: null, formHeadline: 'Form', stickyBarLine: 'Sticky',
  aboutPageHeadline: 'About page', aboutPageBody: 'About page body',
  serviceDetails: [{ name: 'Alpha', description: 'Description' }],
};

const x = (n: number) => 'x'.repeat(n);

test('limit derivation: the prompt block states every validator limit, and the validator enforces exactly those', () => {
  const block = buildSiteCopyHardLimitsBlock();
  for (const [key, max] of Object.entries(SITE_COPY_STRING_LIMITS)) {
    assert.ok(block.includes(`  - ${key}: max ${max} characters`), key);
    assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy({ ...valid, [key]: x(max) }), `${key} at limit`);
    assert.throws(() => assertBoundedGeneratedSiteCopy({ ...valid, [key]: x(max + 1) }), `${key} over limit`);
  }
  for (const [key, max] of Object.entries(SITE_COPY_OPTIONAL_STRING_LIMITS)) {
    assert.ok(block.includes(`  - ${key}: max ${max} characters when set`), key);
  }
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy({ ...valid, responseTimeBadge: x(SITE_COPY_OPTIONAL_STRING_LIMITS.responseTimeBadge) }));
  assert.throws(() => assertBoundedGeneratedSiteCopy({ ...valid, responseTimeBadge: x(SITE_COPY_OPTIONAL_STRING_LIMITS.responseTimeBadge + 1) }));
  assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy({
    ...valid, reviewFeatured: x(SITE_COPY_OPTIONAL_STRING_LIMITS.reviewFeatured), reviewContext: x(SITE_COPY_OPTIONAL_STRING_LIMITS.reviewContext),
  }));
  assert.throws(() => assertBoundedGeneratedSiteCopy({
    ...valid, reviewFeatured: x(SITE_COPY_OPTIONAL_STRING_LIMITS.reviewFeatured + 1), reviewContext: 'c',
  }));
  for (const [key, limit] of Object.entries(SITE_COPY_STRING_LIST_LIMITS)) {
    assert.ok(block.includes(`  - ${key}: at most ${limit.maxItems} strings; each string max ${limit.itemMaxChars} characters`), key);
    assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy({ ...valid, [key]: Array(limit.maxItems).fill(x(limit.itemMaxChars)) }), key);
    assert.throws(() => assertBoundedGeneratedSiteCopy({ ...valid, [key]: Array(limit.maxItems + 1).fill('ok') }), `${key} count`);
    assert.throws(() => assertBoundedGeneratedSiteCopy({ ...valid, [key]: [x(limit.itemMaxChars + 1)] }), `${key} item`);
  }
  for (const [key, limit] of Object.entries(SITE_COPY_PAIR_LIST_LIMITS)) {
    assert.ok(block.includes(`  - ${key}: at most ${limit.maxItems} objects`), key);
    limit.keys.forEach((name, index) => assert.ok(block.includes(`"${name}" max ${limit.maxChars[index]} characters`), `${key}.${name}`));
    const atLimit = Object.fromEntries(limit.keys.map((name, index) => [name, x(limit.maxChars[index])]));
    assert.doesNotThrow(() => assertBoundedGeneratedSiteCopy({ ...valid, [key]: Array(limit.maxItems).fill(atLimit) }), key);
    assert.throws(() => assertBoundedGeneratedSiteCopy({ ...valid, [key]: Array(limit.maxItems + 1).fill(atLimit) }), `${key} count`);
    limit.keys.forEach((name, index) => {
      assert.throws(() => assertBoundedGeneratedSiteCopy({ ...valid, [key]: [{ ...atLimit, [name]: x(limit.maxChars[index] + 1) }] }), `${key}.${name}`);
    });
  }
  assert.ok(block.includes('reviewFeatured and reviewContext: both strings or both null'));
  assert.ok(block.includes('scarcityLine: always null'));
  assert.ok(block.includes(`at most ${SITE_COPY_MAX_BYTES} bytes`));
  assert.ok(block.includes(`Output exactly these keys and no others: ${SITE_COPY_KEY_LIST.join(', ')}.`));
  // The block contains no Hebrew: the engineer never authors Hebrew; the model writes it.
  assert.doesNotMatch(block, /[\u0590-\u05FF]/);
});

test('generation prompt ends with the hard-limits block (after the schema) and Noa gets it too', () => {
  const prompt = buildResearchPageGenerationPrompt(brief, { businessNiche: 'plumber' });
  assert.ok(prompt.endsWith(buildSiteCopyHardLimitsBlock()));
  assert.ok(prompt.indexOf('OUTPUT (JSON only') < prompt.indexOf('HARD LIMITS'));
  const noa = buildNoaQaMessage(valid);
  assert.ok(noa.startsWith(JSON.stringify(valid)));
  assert.match(noa, /never lengthen a field past its limit/);
});

test('repair loop: violating Tamar output is repaired field-by-field, then validated, then sent to Noa', async () => {
  const broken = { ...valid, stickyBarLine: x(33), trustBarItems: ['ok', x(23), 'b', 'c', 'd'], reviewFeatured: 'quote', reviewContext: 'ctx' };
  const prompts: Array<{ system: string; user: string }> = [];
  const events: CopyRepairEvent[] = [];
  const result = await generateResearchPageCopy(brief, {}, {
    onEvent: event => events.push(event),
    callJson: async (system, user) => {
      prompts.push({ system, user });
      if (prompts.length === 1) return JSON.stringify(broken);
      if (prompts.length === 2) return JSON.stringify({ stickyBarLine: x(20), trustBarItems: ['ok', 'short', 'b', 'c'], heroHeadline: 'IGNORED unrequested key' });
      return user.slice(0, user.indexOf('\n\nHARD LIMITS')); // Noa echoes valid copy
    },
  });
  assert.equal(prompts.length, 3);
  const repair = prompts[1];
  assert.match(repair.system, /repairing specific fields/);
  assert.match(repair.user, /- stickyBarLine: non-empty string, max 25 characters\.\n {2}Problems: stickyBarLine is 33 characters \(max 25\)\./);
  assert.match(repair.user, /trustBarItems has 5 items \(max 4\)/);
  assert.match(repair.user, /trustBarItems\[1\] is 23 characters \(max 20\)/);
  assert.match(repair.user, /exactly these keys: stickyBarLine, trustBarItems\./);
  // Only the violating fields are sent; untouched fields are not in the request.
  assert.doesNotMatch(repair.user, /About page body|Subheadline/);
  assert.equal(result.stickyBarLine, x(20));
  assert.deepEqual(result.trustBarItems, ['ok', 'short', 'b', 'c']);
  assert.equal(result.heroHeadline, 'Headline', 'unrequested keys in a repair reply are ignored');
  assert.deepEqual(events.filter(event => event.kind === 'repair').map(event => event.fields), [['stickyBarLine', 'trustBarItems']]);
  assert.doesNotMatch(JSON.stringify(events), /xxxxxxxxxx|quote/, 'events carry no copy text');
});

test('repair loop is bounded: at most MAX_COPY_REPAIRS repair calls, then a validation error, never a Noa call', async () => {
  assert.equal(MAX_COPY_REPAIRS, 2);
  let calls = 0;
  const systems: string[] = [];
  let caught: unknown;
  await generateResearchPageCopy(brief, {}, {
    maxRepairs: 99, // clamped to MAX_COPY_REPAIRS
    callJson: async system => {
      calls++;
      systems.push(system);
      return calls === 1 ? JSON.stringify({ ...valid, heroHeadline: x(80) }) : JSON.stringify({ heroHeadline: x(75) });
    },
  }).catch(error => { caught = error; });
  assert.equal(calls, 1 + MAX_COPY_REPAIRS);
  assert.ok(systems.every(system => !/Noa/.test(system)));
  assert.ok(caught instanceof GeneratedCopyValidationError);
  assert.equal(caught.stage, 'tamar');
  assert.deepEqual(caught.violations, [{ field: 'heroHeadline', rule: 'max_length', limit: 68, actual: 75 }]);
});

test('repair budget is shared across Tamar and Noa', async () => {
  let calls = 0;
  const kinds: string[] = [];
  const copy = await generateResearchPageCopy(brief, {}, {
    onEvent: event => { if (event.kind !== 'violations') kinds.push(`${event.stage}:${event.kind}`); },
    callJson: async () => {
      calls++;
      if (calls === 1) return JSON.stringify({ ...valid, formHeadline: x(40) }); // Tamar
      if (calls === 2) return JSON.stringify({ formHeadline: 'Form ok' }); // repair 1
      if (calls === 3) return JSON.stringify({ ...valid, aboutBlurb: x(330) }); // Noa lengthened
      if (calls === 4) return JSON.stringify({ aboutBlurb: 'About ok' }); // repair 2
      throw new Error('unexpected call');
    },
  });
  assert.equal(calls, 4);
  assert.deepEqual(kinds, ['tamar:repair', 'noa:repair']);
  assert.equal(copy.aboutBlurb, 'About ok');

  calls = 0;
  let caught: unknown;
  await generateResearchPageCopy(brief, {}, {
    callJson: async () => {
      calls++;
      if (calls <= 2) return JSON.stringify({ ...valid, formHeadline: x(40) });
      if (calls === 3) return JSON.stringify({ formHeadline: 'Form ok' });
      if (calls === 4) return JSON.stringify({ ...valid, aboutBlurb: x(330) }); // Noa, no budget left
      throw new Error('unexpected call');
    },
  }).catch(error => { caught = error; });
  assert.equal(calls, 4);
  assert.ok(caught instanceof GeneratedCopyValidationError);
  assert.equal(caught.stage, 'noa');
});

test('invalid JSON from a stage is retried once per budget unit, with the same prompt', async () => {
  const users: string[] = [];
  const copy = await generateResearchPageCopy(brief, {}, {
    callJson: async (_system, user) => {
      users.push(user);
      if (users.length === 1) return '{not json';
      return users.length === 2 ? JSON.stringify(valid) : JSON.stringify(valid);
    },
  });
  assert.equal(users.length, 3);
  assert.equal(users[0], users[1]);
  assert.deepEqual(copy, valid);
});

test('deterministic fixes: trim list counts, null a half-set review pair, never touch a string', () => {
  const long = x(500);
  const input = {
    ...valid,
    heroHeadline: x(90), // over limit: must stay exactly as-is (no truncation)
    trustBarItems: ['a', 'b', 'c', 'd', 'e', 'f'],
    serviceItems: Array(9).fill('s'),
    serviceDetails: Array(8).fill({ name: 'n', description: 'd' }),
    reviewFeatured: long,
    reviewContext: null,
    scarcityLine: 'limited',
    extra: 'model extra',
  };
  const { value, fixes } = applySafeDeterministicFixes(input);
  assert.equal(value.heroHeadline, x(90));
  assert.deepEqual(value.trustBarItems, ['a', 'b', 'c', 'd']);
  assert.equal((value.serviceItems as string[]).length, 6);
  assert.equal((value.serviceDetails as unknown[]).length, 6);
  assert.equal(value.reviewFeatured, null);
  assert.equal(value.reviewContext, null);
  assert.equal(value.scarcityLine, null);
  assert.equal('extra' in value, false);
  assert.deepEqual(fixes, [
    'drop_unexpected:extra', 'trim_items:trustBarItems:6->4', 'trim_items:serviceItems:9->6',
    'trim_items:serviceDetails:8->6', 'null_pair:reviewFeatured+reviewContext', 'null_field:scarcityLine',
  ]);
  // Every string that survives is byte-identical to an input string.
  const inputStrings = new Set(JSON.stringify(input).match(/"(?:[^"\\]|\\.)*"/g));
  for (const token of JSON.stringify(value).match(/"(?:[^"\\]|\\.)*"/g) ?? []) assert.ok(inputStrings.has(token), token);
  assert.deepEqual(explainGeneratedSiteCopyViolations(value), [{ field: 'heroHeadline', rule: 'max_length', limit: 68, actual: 90 }]);
  // A missing always-null field is added as null (never sent to the model).
  const { scarcityLine: _omit, ...withoutScarcity } = valid;
  void _omit;
  assert.deepEqual(applySafeDeterministicFixes(withoutScarcity).fixes, ['add_null_field:scarcityLine']);
  assert.deepEqual(explainGeneratedSiteCopyViolations(applySafeDeterministicFixes(withoutScarcity).value), []);
  // A complete pair is never nulled.
  assert.deepEqual(applySafeDeterministicFixes({ ...valid, reviewFeatured: 'q', reviewContext: 'c' }).fixes, []);
});

test('the review pair is never sent to the model; with no budget the safe fixes alone settle it', async () => {
  let calls = 0;
  const events: CopyRepairEvent[] = [];
  const copy = await generateResearchPageCopy(brief, {}, {
    maxRepairs: 0,
    onEvent: event => events.push(event),
    callJson: async () => {
      calls++;
      return JSON.stringify({ ...valid, reviewFeatured: 'quote', reviewContext: null, serviceItems: Array(7).fill('s') });
    },
  });
  assert.equal(calls, 2);
  assert.equal(copy.reviewFeatured, null);
  assert.equal(copy.serviceItems.length, 6);
  assert.ok(events.some(event => event.kind === 'deterministic_fix' && event.fixes?.includes('null_pair:reviewFeatured+reviewContext')));

  // With budget, a pair-only violation spends no repair call either.
  calls = 0;
  await generateResearchPageCopy(brief, {}, {
    callJson: async () => { calls++; return JSON.stringify({ ...valid, reviewFeatured: 'quote', reviewContext: null }); },
  });
  assert.equal(calls, 2);

  // Nor does a missing always-null field (eval run electrician-4 spent a repair on it before this rule).
  calls = 0;
  const { scarcityLine: _drop, ...noScarcity } = valid;
  void _drop;
  const settled = await generateResearchPageCopy(brief, {}, {
    callJson: async () => { calls++; return JSON.stringify(calls === 1 ? noScarcity : valid); },
  });
  assert.equal(calls, 2);
  assert.equal(settled.scarcityLine, null);
});

test('an over-limit string is never truncated: without a successful repair the page fails', async () => {
  let caught: unknown;
  await generateResearchPageCopy(brief, {}, {
    maxRepairs: 0,
    callJson: async () => JSON.stringify({ ...valid, stickyBarLine: x(26) }),
  }).catch(error => { caught = error; });
  assert.ok(caught instanceof GeneratedCopyValidationError);
  assert.deepEqual(caught.violations, [{ field: 'stickyBarLine', rule: 'max_length', limit: 25, actual: 26 }]);
});

test('repair prompt carries only the requested fields, their limits and actual lengths', () => {
  const prompt = buildCopyRepairPrompt({ ...valid, servicesHeadline: x(54) }, [
    { field: 'servicesHeadline', rule: 'max_length', limit: 35, actual: 54 },
  ], ['servicesHeadline']);
  assert.match(prompt, /servicesHeadline: non-empty string, max 35 characters/);
  assert.match(prompt, /servicesHeadline is 54 characters \(max 35\)/);
  assert.match(prompt, new RegExp(`Current value: "${x(54)}"`));
  assert.doesNotMatch(prompt, /Headline"|Subheadline|Sticky/);
  assert.doesNotMatch(prompt, /[\u0590-\u05FF]/);
});
