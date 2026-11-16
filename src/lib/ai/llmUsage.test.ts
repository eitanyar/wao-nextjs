// LLM usage ledger recorder: never throws, correct line shape, monthly file under the llm-usage root.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { geminiUsageCounts, openAiUsageCounts, recordGeminiUsage, recordLlmUsage, resetLlmUsageWarning, usageFileFor, usageLine } from './llmUsage';
import { callGeminiJSON } from './gemini-fast';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'llm-usage-'));
}

const GEMINI_RESPONSE = {
  candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
  usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 300, cachedContentTokenCount: 200, thoughtsTokenCount: 450, totalTokenCount: 1950 },
};

test('usageLine: exact shape; optional fields only when known; counts normalised', () => {
  const now = new Date('2026-11-16T10:00:00.000Z');
  assert.deepEqual(usageLine({ workload: 'geo', provider: 'gemini', model: 'gemini-3.8-flash', inputTokens: 10, outputTokens: 5 }, now),
    { ts: '2026-11-16T10:00:00.000Z', workload: 'geo', provider: 'gemini', model: 'gemini-3.8-flash', inputTokens: 10, outputTokens: 5 });
  assert.deepEqual(usageLine({ workload: 'site_copy', provider: 'gemini', model: 'm', inputTokens: 10.4, outputTokens: null, cachedTokens: 3, thinkingTokens: 7, clientId: 'retter', slug: 'plumber-tlv' }, now),
    { ts: '2026-11-16T10:00:00.000Z', workload: 'site_copy', provider: 'gemini', model: 'm', inputTokens: 10, outputTokens: null, cachedTokens: 3, thinkingTokens: 7, clientId: 'retter', slug: 'plumber-tlv' });
  const junk = usageLine({ workload: '', provider: '', model: '', inputTokens: -1, outputTokens: Number.NaN, cachedTokens: -2, clientId: '  ' } as never, now);
  assert.deepEqual(junk, { ts: '2026-11-16T10:00:00.000Z', workload: 'unspecified', provider: 'unknown', model: 'unknown', inputTokens: null, outputTokens: null });
});

test('Gemini usageMetadata and OpenAI usage map to the ledger counts', () => {
  assert.deepEqual(geminiUsageCounts(GEMINI_RESPONSE), { inputTokens: 1200, outputTokens: 300, cachedTokens: 200, thinkingTokens: 450 });
  assert.deepEqual(geminiUsageCounts({}), { inputTokens: null, outputTokens: null });
  assert.deepEqual(geminiUsageCounts(null), { inputTokens: null, outputTokens: null });
  assert.deepEqual(openAiUsageCounts({ usage: { prompt_tokens: 9, completion_tokens: 4, completion_tokens_details: { reasoning_tokens: 2 }, prompt_tokens_details: { cached_tokens: 1 } } }),
    { inputTokens: 9, outputTokens: 4, cachedTokens: 1, thinkingTokens: 2 });
});

test('recordLlmUsage appends one JSON line per call to <dir>/YYYY-MM.jsonl', () => {
  const dir = tmpDir();
  const env = { WAO_LLM_USAGE_DIR: dir } as NodeJS.ProcessEnv;
  const prev = process.env.WAO_LLM_USAGE_DIR;
  process.env.WAO_LLM_USAGE_DIR = dir;
  try {
    assert.equal(recordLlmUsage({ ts: '2026-11-16T10:00:00.000Z', workload: 'geo', provider: 'gemini', model: 'gemini-3.8-flash', inputTokens: 1, outputTokens: 2, clientId: 'retter' }, env), true);
    assert.equal(recordGeminiUsage(GEMINI_RESPONSE, 'gemini-3.8-flash', { workload: 'chat' }, env), true);
    const month = new Date().toISOString().slice(0, 7);
    const nov = fs.readFileSync(path.join(dir, '2026-11.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    const current = month === '2026-11' ? nov : fs.readFileSync(path.join(dir, `${month}.jsonl`), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.deepEqual(nov[0], { ts: '2026-11-16T10:00:00.000Z', workload: 'geo', provider: 'gemini', model: 'gemini-3.8-flash', inputTokens: 1, outputTokens: 2, clientId: 'retter' });
    const chat = current.find(entry => entry.workload === 'chat');
    assert.deepEqual({ ...chat, ts: 'x' }, { ts: 'x', workload: 'chat', provider: 'gemini', model: 'gemini-3.8-flash', inputTokens: 1200, outputTokens: 300, cachedTokens: 200, thinkingTokens: 450 });
    assert.equal(usageFileFor('2027-01-02T00:00:00Z', dir), path.join(dir, '2027-01.jsonl'));
    assert.ok(!dir.includes(`${path.sep}clients`), 'never under data/clients');
  } finally {
    if (prev === undefined) delete process.env.WAO_LLM_USAGE_DIR; else process.env.WAO_LLM_USAGE_DIR = prev;
  }
});

test('recording never throws: an unwritable root returns false and warns once', () => {
  const dir = tmpDir();
  const blocker = path.join(dir, 'file');
  fs.writeFileSync(blocker, 'not a directory');
  const prev = process.env.WAO_LLM_USAGE_DIR;
  process.env.WAO_LLM_USAGE_DIR = path.join(blocker, 'sub');
  const warnings: unknown[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  resetLlmUsageWarning();
  try {
    const env = { WAO_LLM_USAGE_DIR: process.env.WAO_LLM_USAGE_DIR } as NodeJS.ProcessEnv;
    for (let i = 0; i < 3; i++) {
      assert.doesNotThrow(() => assert.equal(recordLlmUsage({ workload: 'geo', provider: 'gemini', model: 'm', inputTokens: 1, outputTokens: 1 }, env), false));
      assert.doesNotThrow(() => recordGeminiUsage({ usageMetadata: { get promptTokenCount() { throw new Error('hostile getter'); } } }, 'm', {}, env));
    }
    assert.equal(warnings.length, 1, 'one warning per process');
  } finally {
    console.warn = original;
    if (prev === undefined) delete process.env.WAO_LLM_USAGE_DIR; else process.env.WAO_LLM_USAGE_DIR = prev;
  }
});

test('off under node --test without an explicit dir, and off with WAO_LLM_USAGE_DISABLED=1', () => {
  assert.equal(recordLlmUsage({ workload: 'geo', provider: 'gemini', model: 'm', inputTokens: 1, outputTokens: 1 }, { NODE_TEST_CONTEXT: 'child' } as NodeJS.ProcessEnv), false);
  assert.equal(recordLlmUsage({ workload: 'geo', provider: 'gemini', model: 'm', inputTokens: 1, outputTokens: 1 }, { WAO_LLM_USAGE_DIR: tmpDir(), WAO_LLM_USAGE_DISABLED: '1' } as NodeJS.ProcessEnv), false);
});

test('callGeminiJSON records the call with the caller tag, and a recorder failure never reaches the caller', async () => {
  const dir = tmpDir();
  const saved = { key: process.env.GEMINI_API_KEY, dir: process.env.WAO_LLM_USAGE_DIR, model: process.env.GEMINI_MODEL_NAME };
  process.env.GEMINI_API_KEY = 'k';
  delete process.env.GEMINI_MODEL_NAME;
  process.env.WAO_LLM_USAGE_DIR = dir;
  try {
    const fetch = async () => new Response(JSON.stringify(GEMINI_RESPONSE), { status: 200 });
    assert.equal(await callGeminiJSON('s', 'u', { fetch, usage: { workload: 'site_copy', slug: 'plumber-tlv' } }), '{"ok":true}');
    const month = new Date().toISOString().slice(0, 7);
    const [line] = fs.readFileSync(path.join(dir, `${month}.jsonl`), 'utf8').trim().split('\n').map(l => JSON.parse(l));
    assert.equal(line.workload, 'site_copy');
    assert.equal(line.slug, 'plumber-tlv');
    assert.equal(line.model, 'gemini-3.8-flash');
    assert.equal(line.thinkingTokens, 450);
    // Unwritable ledger: the call still returns its text.
    const blocker = path.join(dir, 'blocker');
    fs.writeFileSync(blocker, '');
    process.env.WAO_LLM_USAGE_DIR = path.join(blocker, 'x');
    const original = console.warn; console.warn = () => {};
    try { assert.equal(await callGeminiJSON('s', 'u', { fetch }), '{"ok":true}'); } finally { console.warn = original; }
  } finally {
    for (const [key, value] of [['GEMINI_API_KEY', saved.key], ['WAO_LLM_USAGE_DIR', saved.dir], ['GEMINI_MODEL_NAME', saved.model]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
