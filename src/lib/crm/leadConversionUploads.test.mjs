import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { toEventTimestamp } from '../google-ads/data-manager-events.js';
import { parseLeadDateUtc } from './leadDate.js';
import {
  outcomeFromUploadResult,
  outcomeFromThrow,
  planUploadsForTrigger,
  retryLeadConversionUploads,
  runLeadConversionUploads,
  selectLeadsForUploadRetry,
  summarizeConversionUpload,
} from './leadConversionUploads.js';

// ads-bot-phase2 spec §11 "Step 0": 0b timestamps, 0c outcomes, 0d close backfill, 0e retry.

// ── 0b: toEventTimestamp ─────────────────────────────────────────────────────
test('0b: a known UTC instant round-trips exactly (winter and summer)', () => {
  for (const iso of ['2026-01-15T10:00:00.000Z', '2026-07-15T10:00:00.000Z']) {
    const out = toEventTimestamp(iso);
    assert.equal(out, iso);
    assert.equal(new Date(out).getTime(), new Date(iso).getTime());
  }
});

test('0b: zoned inputs keep their instant (+02:00 winter, +03:00 summer)', () => {
  assert.equal(toEventTimestamp('2026-01-15T12:00:00+02:00'), '2026-01-15T10:00:00.000Z');
  assert.equal(toEventTimestamp('2026-07-15T13:00:00+03:00'), '2026-07-15T10:00:00.000Z');
});

test('0b: a zoneless lead.date (captureLead format) is treated as UTC', () => {
  assert.equal(toEventTimestamp('2026-07-15 10:00'), '2026-07-15T10:00:00.000Z');
  assert.equal(toEventTimestamp('2026-01-15 10:00'), '2026-01-15T10:00:00.000Z');
  assert.equal(toEventTimestamp('2026-07-15T10:00:30'), '2026-07-15T10:00:30.000Z');
  assert.equal(parseLeadDateUtc('2026-07-15 10:00')?.toISOString(), '2026-07-15T10:00:00.000Z');
});

test('0b: output is never earlier than the input instant, and never the old fake +03:00 suffix', () => {
  // captureLead's own format: UTC wall clock, minutes precision.
  const instants = ['2026-01-01T00:00:00.000Z', '2026-03-27T00:30:00.000Z', '2026-10-25T23:59:00.000Z', '2026-07-15T10:00:00.000Z'];
  for (const iso of instants) {
    const stored = iso.replace('T', ' ').substring(0, 16);
    const out = toEventTimestamp(stored);
    assert.ok(new Date(out).getTime() >= new Date(iso).getTime(), `${stored} -> ${out}`);
    assert.ok(out.endsWith('Z'));
    assert.ok(!out.endsWith('+03:00'));
  }
});

// Israel DST 2026: clocks go 02:00 -> 03:00 on Fri 27 Mar (00:00Z) and 02:00 -> 01:00 on
// Sun 25 Oct (23:00Z on the 24th).
test('0b: DST boundaries — instants on both sides of each Israeli switch keep their exact instant', () => {
  const cases = [
    ['2026-03-27T01:59:00+02:00', '2026-03-26T23:59:00.000Z'], // last winter minute
    ['2026-03-27T03:00:00+03:00', '2026-03-27T00:00:00.000Z'], // first summer minute
    ['2026-10-25T01:59:00+03:00', '2026-10-24T22:59:00.000Z'], // last summer minute
    ['2026-10-25T01:00:00+02:00', '2026-10-24T23:00:00.000Z'], // first winter minute (01:00 again)
  ];
  for (const [input, expected] of cases) assert.equal(toEventTimestamp(input), expected, input);
  // Every zoneless captureLead value in the 4 hours around each switch maps to the same UTC
  // instant, minute by minute: no hour is skipped or doubled.
  for (const startIso of ['2026-03-26T22:00:00.000Z', '2026-10-24T21:00:00.000Z']) {
    const start = new Date(startIso).getTime();
    for (let m = 0; m <= 240; m += 1) {
      const instant = new Date(start + m * 60_000);
      const stored = instant.toISOString().replace('T', ' ').substring(0, 16);
      assert.equal(toEventTimestamp(stored), instant.toISOString(), stored);
    }
  }
});

test('0b: the result does not depend on the server time zone (Asia/Jerusalem, UTC, New York)', () => {
  const moduleUrl = new URL('../google-ads/data-manager-events.js', import.meta.url).href;
  const inputs = ['2026-01-15 10:00', '2026-07-15 10:00', '2026-03-27 00:30', '2026-10-24 23:30'];
  const script = `import(${JSON.stringify(moduleUrl)}).then((m) => process.stdout.write(JSON.stringify(${JSON.stringify(inputs)}.map(m.toEventTimestamp))))`;
  const outputs = ['Asia/Jerusalem', 'UTC', 'America/New_York'].map((tz) =>
    execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: tz }, encoding: 'utf8' }));
  assert.deepEqual(JSON.parse(outputs[0]), ['2026-01-15T10:00:00.000Z', '2026-07-15T10:00:00.000Z', '2026-03-27T00:30:00.000Z', '2026-10-24T23:30:00.000Z']);
  assert.equal(outputs[1], outputs[0]);
  assert.equal(outputs[2], outputs[0]);
});

test('0b: unparseable / empty input falls back to now, never throws', () => {
  const before = Date.now();
  const out = toEventTimestamp('not a date');
  assert.ok(new Date(out).getTime() >= before - 1000);
  assert.equal(parseLeadDateUtc(''), null);
  assert.equal(parseLeadDateUtc(undefined), null);
});

// ── 0c: outcomes ─────────────────────────────────────────────────────────────
const NOW = new Date('2026-11-12T08:00:00.000Z');

test('0c: success → ok with requestId; skipped → skipped_no_click_id', () => {
  assert.deepEqual(outcomeFromUploadResult({ success: true, leadId: 1, type: 'verified-lead', conversionValue: 200, requestId: 'req-1' }, undefined, NOW),
    { status: 'ok', at: NOW.toISOString(), attempts: 1, requestId: 'req-1' });
  assert.deepEqual(outcomeFromUploadResult({ skipped: true, reason: 'no_click_id', message: 'x' }, undefined, NOW),
    { status: 'skipped_no_click_id', at: NOW.toISOString(), attempts: 1 });
});

test('0c: {success:false} → failed (4xx) or pending_retry (5xx/429/throw); attempts count up', () => {
  const failed = outcomeFromUploadResult({ success: false, error: 'conversion before click', status: 400 }, { status: 'failed', at: 'x', attempts: 2 }, NOW);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.attempts, 3);
  assert.equal(failed.error, 'conversion before click');
  assert.equal(outcomeFromUploadResult({ success: false, error: 'busy', status: 503 }, undefined, NOW).status, 'pending_retry');
  assert.equal(outcomeFromUploadResult({ success: false, error: 'quota', status: 429 }, undefined, NOW).status, 'pending_retry');
  assert.equal(outcomeFromUploadResult({ success: false, leadId: 1, type: 'closed-deal', partialError: '{"w":1}', status: 207 }, undefined, NOW).status, 'failed');
  assert.equal(outcomeFromThrow(new Error('net'), undefined, NOW).status, 'pending_retry');
});

test('summarizeConversionUpload: ok only when every attempted upload landed', () => {
  const o = (status) => ({ outcome: { status } });
  assert.equal(summarizeConversionUpload([]), 'not_applicable');
  assert.equal(summarizeConversionUpload([o('ok'), o('ok')]), 'ok');
  assert.equal(summarizeConversionUpload([o('ok'), o('failed')]), 'failed');
  assert.equal(summarizeConversionUpload([o('skipped_no_click_id')]), 'skipped');
});

// ── 0d: close backfill ───────────────────────────────────────────────────────
test('0d: closed without a successful verified upload plans verified-lead then closed-deal', () => {
  assert.deepEqual(planUploadsForTrigger({}, 'closed'), ['verified-lead', 'closed-deal']);
  assert.deepEqual(planUploadsForTrigger({ verifiedUpload: { status: 'failed', at: 'x', attempts: 1 } }, 'closed'), ['verified-lead', 'closed-deal']);
  assert.deepEqual(planUploadsForTrigger({ verifiedUpload: { status: 'ok', at: 'x', attempts: 1 } }, 'closed'), ['closed-deal']);
  assert.deepEqual(planUploadsForTrigger({}, 'good'), ['verified-lead']);
});

test('0d: runLeadConversionUploads sends in order and returns both outcomes', async () => {
  const calls = [];
  const upload = async (args) => { calls.push(args); return { success: true, leadId: args.leadId, type: args.type, conversionValue: 1, requestId: `r-${args.type}` }; };
  const { patch } = await runLeadConversionUploads({ lead: { id: 9 }, types: ['verified-lead', 'closed-deal'], uploadLeadConversion: upload, now: () => NOW });
  assert.deepEqual(calls, [{ leadId: 9, type: 'verified-lead' }, { leadId: 9, type: 'closed-deal' }]);
  assert.equal(patch.verifiedUpload.requestId, 'r-verified-lead');
  assert.equal(patch.closedUpload.requestId, 'r-closed-deal');
});

// ── 0e: retry ────────────────────────────────────────────────────────────────
const day = 86_400_000;
function lead(overrides) {
  return { id: 1, date: new Date(NOW.getTime() - 10 * day).toISOString().replace('T', ' ').substring(0, 16), ...overrides };
}

test('0e: retries failed and pending_retry, never ok / skipped / never-attempted', () => {
  const old = new Date(NOW.getTime() - 2 * day).toISOString();
  const plan = selectLeadsForUploadRetry([
    lead({ id: 1, verifiedUpload: { status: 'failed', at: old, attempts: 1 } }),
    lead({ id: 2, verifiedUpload: { status: 'pending_retry', at: old, attempts: 1 } }),
    lead({ id: 3, verifiedUpload: { status: 'ok', at: old, attempts: 1 } }),
    lead({ id: 4, verifiedUpload: { status: 'skipped_no_click_id', at: old, attempts: 1 } }),
    lead({ id: 5 }),
  ], NOW);
  assert.deepEqual(plan, [{ leadId: 1, types: ['verified-lead'] }, { leadId: 2, types: ['verified-lead'] }]);
});

test('0e: at most once per day per lead (latest attempt of either type)', () => {
  const recent = new Date(NOW.getTime() - 23 * 3_600_000).toISOString();
  const old = new Date(NOW.getTime() - 25 * 3_600_000).toISOString();
  assert.deepEqual(selectLeadsForUploadRetry([lead({ verifiedUpload: { status: 'failed', at: recent, attempts: 1 } })], NOW), []);
  assert.deepEqual(selectLeadsForUploadRetry([lead({ closed: true, verifiedUpload: { status: 'failed', at: old, attempts: 1 }, closedUpload: { status: 'failed', at: recent, attempts: 1 } })], NOW), []);
  assert.equal(selectLeadsForUploadRetry([lead({ verifiedUpload: { status: 'failed', at: old, attempts: 1 } })], NOW).length, 1);
});

test('0e: stops at click age 85 days', () => {
  const old = new Date(NOW.getTime() - 2 * day).toISOString();
  const at = (days) => new Date(NOW.getTime() - days * day).toISOString();
  const plan = selectLeadsForUploadRetry([
    { id: 84, date: at(84.9), verifiedUpload: { status: 'failed', at: old, attempts: 3 } },
    { id: 85, date: at(85), verifiedUpload: { status: 'failed', at: old, attempts: 3 } },
    { id: 86, date: at(86), verifiedUpload: { status: 'failed', at: old, attempts: 3 } },
    { id: 0, date: 'garbage', verifiedUpload: { status: 'failed', at: old, attempts: 3 } },
  ], NOW);
  assert.deepEqual(plan.map((p) => p.leadId), [84]);
});

test('0e: a failed closed-deal on a lead without an ok verified upload re-sends verified first', () => {
  const old = new Date(NOW.getTime() - 2 * day).toISOString();
  assert.deepEqual(selectLeadsForUploadRetry([lead({ closed: true, closedUpload: { status: 'failed', at: old, attempts: 1 } })], NOW), [{ leadId: 1, types: ['verified-lead', 'closed-deal'] }]);
  assert.deepEqual(selectLeadsForUploadRetry([lead({ closed: true, verifiedUpload: { status: 'ok', at: old, attempts: 1 }, closedUpload: { status: 'failed', at: old, attempts: 1 } })], NOW), [{ leadId: 1, types: ['closed-deal'] }]);
});

test('0e: one retry pass uploads once per selected type and persists the patch', async () => {
  const old = new Date(NOW.getTime() - 2 * day).toISOString();
  const leads = [lead({ id: 1, verifiedUpload: { status: 'failed', at: old, attempts: 1 } }), lead({ id: 2, verifiedUpload: { status: 'ok', at: old, attempts: 1 } })];
  const calls = [];
  const patches = [];
  const summary = await retryLeadConversionUploads({
    leads,
    now: NOW,
    uploadLeadConversion: async (args) => { calls.push(args); return { success: true, leadId: args.leadId, type: args.type, conversionValue: 1, requestId: 'r' }; },
    patchLead: async (id, patch) => { patches.push({ id, patch }); },
  });
  assert.deepEqual(calls, [{ leadId: 1, type: 'verified-lead' }]);
  assert.equal(summary.attempted, 1);
  assert.equal(summary.ok, 1);
  assert.deepEqual(patches, [{ id: 1, patch: { verifiedUpload: { status: 'ok', at: NOW.toISOString(), attempts: 2, requestId: 'r' } } }]);

  // Same day again: the lead was just attempted, so nothing is re-sent.
  const second = selectLeadsForUploadRetry([{ ...leads[0], ...patches[0].patch, verifiedUpload: { status: 'failed', at: NOW.toISOString(), attempts: 2 } }], NOW);
  assert.deepEqual(second, []);
});
