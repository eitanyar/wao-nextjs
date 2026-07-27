import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  loadCharter,
  appendLevelModifier,
  pickTrack,
  generateSession,
  getOrGenerateTodaysSession,
  peekTodaysSession,
} from './coach';
import { setGenerateJsonMock } from './llm';

/* ---------------------------- charter loading ---------------------------- */

test('loadCharter reads the tracked charter.json with the expected shape', () => {
  const charter = loadCharter();
  assert.ok(charter.goal.length > 0);
  assert.ok(charter.redLines.length > 0);
  assert.ok(Object.keys(charter.trackWeights).length > 0);
  const total = Object.values(charter.trackWeights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 0.01, `trackWeights should sum to ~1, got ${total}`);
});

/* ---------------------------- level modifier ---------------------------- */

test('appendLevelModifier appends a distinct block per level', () => {
  const base = 'BASE PROMPT';
  const l1 = appendLevelModifier(base, 1);
  const l2 = appendLevelModifier(base, 2);
  const l3 = appendLevelModifier(base, 3);
  assert.ok(l1.startsWith(base));
  assert.ok(l1.includes('LEVEL 1'));
  assert.ok(l2.includes('LEVEL 2'));
  assert.ok(l3.includes('LEVEL 3'));
  assert.notStrictEqual(l1, l2);
  assert.notStrictEqual(l2, l3);
});

/* ---------------------------- track selection ---------------------------- */

test('pickTrack always returns the only nonzero-weighted track', () => {
  for (let i = 0; i < 20; i++) {
    assert.strictEqual(pickTrack({ T1: 1, T2: 0, T3: 0 }), 'T1');
  }
});

/* ---------------------------- QA-fail → regenerate-once ---------------------------- */

function fakeRaw(id: string, closingTone = 'first') {
  return {
    persona: {
      id,
      name: 'טסט',
      archetype: 'skeptic',
      systemPrompt: `שיחת טסט (${closingTone})`,
      firstMessage: 'כן?',
      situation: 'מצב טסט',
      hiddenObjective: 'מטרה נסתרת',
    },
    scenario: {
      id: `${id}-scenario`,
      title: 'תרחיש טסט',
      level: 2,
      personaId: id,
      situation: 'מצב טסט',
      firstMessage: 'כן?',
      goal: 'מטרת התרחיש',
      timeCapMin: 8,
      rubric: [{ skill: 'closing', labelHe: 'סגירה', weight: 1, description: 'desc' }],
    },
  };
}

test('QA fail regenerates once, then uses the retry result when it passes', async () => {
  let calls = 0;
  setGenerateJsonMock(async () => {
    calls += 1;
    if (calls === 1) return fakeRaw('qa-retry-persona', 'first-draft');
    if (calls === 2) return { pass: false, issues: ['calque phrasing'] };
    if (calls === 3) return fakeRaw('qa-retry-persona', 'fixed-draft');
    if (calls === 4) return { pass: true, issues: [] };
    throw new Error('unexpected extra call');
  });

  const result = await generateSession({ track: 'T1', level: 2 });

  assert.strictEqual(calls, 4);
  assert.strictEqual(result.qaFlagged, false);
  assert.ok(result.persona.systemPrompt.includes('fixed-draft'), 'should use the regenerated (2nd) draft, not the 1st');
});

test('QA fail twice returns the result flagged qaFlagged, does not regenerate a 3rd time', async () => {
  let calls = 0;
  setGenerateJsonMock(async () => {
    calls += 1;
    if (calls === 1) return fakeRaw('qa-double-fail-persona', 'first-draft');
    if (calls === 2) return { pass: false, issues: ['calque phrasing'] };
    if (calls === 3) return fakeRaw('qa-double-fail-persona', 'still-bad-draft');
    if (calls === 4) return { pass: false, issues: ['still calque'] };
    throw new Error('unexpected extra call — should not regenerate a 3rd time');
  });

  const result = await generateSession({ track: 'T1', level: 2 });

  assert.strictEqual(calls, 4);
  assert.strictEqual(result.qaFlagged, true);
});

/* ---------------------------- cache reuse vs fresh ---------------------------- */

test('getOrGenerateTodaysSession reuses the cached session same-day, regenerates only on fresh', async () => {
  const testId = `unit-test-cache-${Date.now()}`;
  let calls = 0;
  setGenerateJsonMock(async () => {
    calls += 1;
    if (calls % 2 === 1) return fakeRaw(testId);
    return { pass: true, issues: [] };
  });

  const generatedFiles: string[] = [];
  const GENERATED_DIR = path.join(process.cwd(), 'data', 'trainer', 'generated');

  try {
    const first = await getOrGenerateTodaysSession({ track: 'T1', level: 1 });
    generatedFiles.push(path.join(GENERATED_DIR, `${first.generatedId}.json`));
    assert.strictEqual(calls, 2, 'first call generates: 1 coach + 1 QA call');

    const peeked = peekTodaysSession();
    assert.strictEqual(peeked?.generatedId, first.generatedId);

    const second = await getOrGenerateTodaysSession({});
    assert.strictEqual(calls, 2, 'second call (no fresh) must reuse the cache — no new generation calls');
    assert.strictEqual(second.generatedId, first.generatedId);

    const third = await getOrGenerateTodaysSession({ fresh: true, track: 'T1', level: 1 });
    generatedFiles.push(path.join(GENERATED_DIR, `${third.generatedId}.json`));
    assert.strictEqual(calls, 4, 'fresh:true must force a new generation (2 more calls)');
  } finally {
    for (const f of generatedFiles) {
      try {
        fs.unlinkSync(f);
      } catch {
        // already gone / never created — fine
      }
    }
  }
});
