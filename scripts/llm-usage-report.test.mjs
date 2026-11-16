// LLM usage report math + the .mjs recorder mirror (parity with src/lib/ai/llmUsage.ts via the test build).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { CLIENT_MONTHLY_FLAG_ILS, GEMINI_PRICES_USD_PER_MTOK, USD_TO_ILS, buildReport, entryCostUsd, main, parseLedger, priceFor } from './llm-usage-report.mjs';
import * as mirror from './lib/llm-usage.mjs';

const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message ?? ''} ${actual} != ${expected}`);
const flash = (ts, extra = {}) => ({ ts, workload: 'geo', provider: 'gemini', model: 'gemini-3.8-flash', inputTokens: 1_000_000, outputTokens: 1_000_000, ...extra });

test('price table: the intro tier until 2026-12-31, then the list price', () => {
  assert.deepEqual(priceFor(flash('2026-12-31T23:59:59.999Z')), { until: '2027-01-01T00:00:00.000Z', input: 0.75, output: 3.75, cached: 0.075 });
  assert.deepEqual(priceFor(flash('2027-01-01T00:00:00.000Z')), { until: null, input: 1.5, output: 7.5, cached: 0.15 });
  assert.equal(priceFor({ ...flash('2026-11-16T00:00:00Z'), provider: 'qwen-metered' }), null);
  assert.equal(priceFor({ ...flash('2026-11-16T00:00:00Z'), model: 'gemini-9-ultra' }), null);
  assert.ok(Object.isFrozen(GEMINI_PRICES_USD_PER_MTOK));
});

test('entry cost: cached part of input at the cached rate, thinking at the output rate', () => {
  close(entryCostUsd(flash('2026-11-16T00:00:00Z')), 0.75 + 3.75, '1M in + 1M out, intro');
  close(entryCostUsd(flash('2027-02-01T00:00:00Z')), 1.5 + 7.5, '1M in + 1M out, list');
  // 1M input of which 400k cached; 200k output + 300k thinking.
  close(entryCostUsd(flash('2026-11-16T00:00:00Z', { cachedTokens: 400_000, outputTokens: 200_000, thinkingTokens: 300_000 })),
    (600_000 * 0.75 + 400_000 * 0.075 + 500_000 * 3.75) / 1e6);
  // Cached above input is capped; missing counts are zero.
  close(entryCostUsd(flash('2026-11-16T00:00:00Z', { inputTokens: 100, cachedTokens: 500, outputTokens: null })), (100 * 0.075) / 1e6);
  assert.equal(entryCostUsd({ ...flash('2026-11-16T00:00:00Z'), provider: 'qwen-metered' }), null);
});

test('report: totals per workload and per client, unpriced calls counted, clients over the ILS line flagged', () => {
  assert.equal(USD_TO_ILS, 3.7);
  assert.equal(CLIENT_MONTHLY_FLAG_ILS, 25);
  const entries = [
    // retter: 2 x (1M in + 1M out) intro = 9 USD = 33.3 ILS -> flagged
    flash('2026-11-01T00:00:00Z', { clientId: 'retter' }),
    flash('2026-11-02T00:00:00Z', { clientId: 'retter', workload: 'site_copy' }),
    // merlo: 1M in only = 0.75 USD = 2.775 ILS -> not flagged
    flash('2026-11-03T00:00:00Z', { clientId: 'merlo', outputTokens: 0 }),
    // no client, chat workload
    flash('2026-11-04T00:00:00Z', { workload: 'chat', inputTokens: 1000, outputTokens: 1000 }),
    // unpriced qwen call
    { ts: '2026-11-05T00:00:00Z', workload: 'geo', provider: 'qwen-metered', model: 'qwen3.8-max', inputTokens: 5, outputTokens: 5, clientId: 'merlo' },
  ];
  const report = buildReport(entries);
  assert.equal(report.total.calls, 5);
  assert.equal(report.total.unpricedCalls, 1);
  close(report.total.costUsd, 4.5 + 4.5 + 0.75 + (1000 * 0.75 + 1000 * 3.75) / 1e6);
  close(report.byClient.retter.costUsd, 9);
  close(report.byClient.retter.costIls, 9 * 3.7);
  close(report.byClient.merlo.costUsd, 0.75);
  assert.equal(report.byClient.merlo.unpricedCalls, 1);
  assert.deepEqual(Object.keys(report.byClient), ['retter', 'merlo', '(no client)'], 'sorted by cost');
  close(report.byWorkload.geo.costUsd, 4.5 + 0.75);
  close(report.byWorkload.site_copy.costUsd, 4.5);
  assert.equal(report.byWorkload.geo.calls, 3);
  assert.deepEqual(report.flaggedClients.map(f => f.clientId), ['retter']);
  // A client just under the line is not flagged; the no-client bucket is never flagged.
  const under = buildReport([flash('2026-11-01T00:00:00Z', { clientId: 'x', inputTokens: 0, outputTokens: Math.floor((25 / 3.7 / 3.75) * 1e6) })]);
  assert.deepEqual(under.flaggedClients, []);
  assert.deepEqual(buildReport([flash('2026-11-01T00:00:00Z'), flash('2026-11-01T00:00:00Z'), flash('2026-11-01T00:00:00Z')]).flaggedClients, []);
});

test('ledger parsing skips malformed lines; main reads one month file and prints JSON', () => {
  const { entries, malformed } = parseLedger('{"a":1}\nnot json\n\n[1]\n{"b":2}\n');
  assert.equal(entries.length, 3);
  assert.equal(malformed, 1);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-report-'));
  fs.writeFileSync(path.join(dir, '2026-11.jsonl'), `${JSON.stringify(flash('2026-11-01T00:00:00Z', { clientId: 'retter' }))}\n`);
  const out = [];
  const original = console.log; console.log = line => out.push(line);
  try { assert.equal(main(['--month', '2026-11', '--dir', dir, '--json']), 0); } finally { console.log = original; }
  const json = JSON.parse(out.join('\n'));
  assert.equal(json.month, '2026-11');
  close(json.total.costUsd, 4.5);
  assert.throws(() => main(['--month', '2026-13', '--dir', dir]), /YYYY-MM/);
});

test('mjs recorder mirror: same line shape and Gemini mapping as the TS module, never throws, writes the month file', () => {
  const require = createRequire(import.meta.url);
  const ts = require(path.resolve(process.cwd(), 'dist/lib/ai/llmUsage.js'));
  const now = new Date('2026-11-16T10:00:00.000Z');
  const inputs = [
    { workload: 'geo', provider: 'gemini', model: 'gemini-3.8-flash', inputTokens: 10, outputTokens: 5 },
    { workload: 'site_copy', provider: 'gemini', model: 'm', inputTokens: 10.4, outputTokens: null, cachedTokens: 3, thinkingTokens: 7, clientId: 'retter', slug: 's' },
    { workload: '', provider: '', model: '', inputTokens: -1, outputTokens: Number.NaN, clientId: ' ' },
    { ts: '2027-01-01T00:00:00Z', workload: 'x'.repeat(200), provider: 'p', model: 'm', inputTokens: 0, outputTokens: 0 },
  ];
  for (const input of inputs) assert.deepEqual(mirror.usageLine(input, now), ts.usageLine(input, now));
  const responses = [{ usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2, thoughtsTokenCount: 1 } }, {}, null, { usageMetadata: { cachedContentTokenCount: 4 } }];
  for (const response of responses) assert.deepEqual(mirror.geminiUsageCounts(response), ts.geminiUsageCounts(response));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-usage-mjs-'));
  assert.equal(mirror.recordGeminiUsage({ usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 } }, 'gemini-3.8-flash', { workload: 'geo', clientId: 'retter' }, { WAO_LLM_USAGE_DIR: dir }), true);
  const month = new Date().toISOString().slice(0, 7);
  const line = JSON.parse(fs.readFileSync(path.join(dir, `${month}.jsonl`), 'utf8').trim());
  assert.deepEqual({ ...line, ts: 'x' }, { ts: 'x', workload: 'geo', provider: 'gemini', model: 'gemini-3.8-flash', inputTokens: 5, outputTokens: 2, clientId: 'retter' });
  const blocker = path.join(dir, 'blocker'); fs.writeFileSync(blocker, '');
  const original = console.warn; console.warn = () => {};
  try {
    assert.equal(mirror.recordLlmUsage({ workload: 'geo' }, { WAO_LLM_USAGE_DIR: path.join(blocker, 'x') }), false);
  } finally { console.warn = original; }
  assert.equal(mirror.recordLlmUsage({ workload: 'geo' }, { NODE_TEST_CONTEXT: 'child' }), false, 'off under node --test without a dir');
  assert.equal(mirror.llmUsageDir({}), path.join(process.cwd(), 'data', 'llm-usage'));
});
