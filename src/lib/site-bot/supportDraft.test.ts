// AI draft replies for the Site-Bot staff queue (readiness step 5, capability 13). Hermetic: temp DB, injected model
// caller, never the network. HEBREW-SAFETY: zero Hebrew bytes (model output in tests is an English stand-in).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-support-draft-'));
process.env.BILLING_DB_PATH = path.join(tmpDir, 'billing.db');

import { closeDb, getDb, insertSubscription, type SubscriptionRow } from '../payments/db';
import { createClientMessage, getClientMessage, updateClientMessage, type ClientMessageRow } from './clientMessages';
import { TokenPlanRefusedError } from '../ai/llmProvider';
import { SITE_BOT_SUPPORT_FACTS } from '../../content/siteBotSupportFacts';
import {
  approveSupportDraft,
  buildSupportDraftSystemPrompt,
  buildSupportDraftUserMessage,
  generateSupportDraft,
  getSupportDraft,
  parseSupportDraft,
  queueSupportDraft,
  saveSupportDraftEdit,
  supportDraftProvider,
} from './supportDraft';

test.after(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const NOW = new Date('2026-12-06T08:00:00.000Z');
const TOKEN_PLAN = 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';
const METERED = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const SECRET = 'MY-PRIVATE-MESSAGE-TEXT';

function message(body = `Please change my hours ${SECRET}`): ClientMessageRow {
  const subscriptionId = crypto.randomUUID();
  insertSubscription(getDb(), {
    id: subscriptionId, user_id: 'owner@example.com', status: 'active', provider: 'mock', provider_token: null, card_last4: null,
    card_expiry: null, trial_amount: null, recurring_amount: 234.82, currency: 'ILS', next_charge_at: null, canceled_at: null,
    cancel_reason: null, failed_attempts: 0, created_at: NOW.toISOString(), updated_at: NOW.toISOString(), joined_at: NOW.toISOString(),
    extended_cancellation_flag: null, extended_flag_basis: null, plan: 'site-bot', net_amount: null, vat_mode: null,
    vat_rate: null, billing_interval: null, billing_anchor_at: null, periods_paid: null, dunning_started_at: null, paused_at: null,
  } as SubscriptionRow);
  return createClientMessage({ id: crypto.randomUUID(), subscriptionId, body, now: NOW }).row;
}

function captureConsole(): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const original = { log: console.log, error: console.error, warn: console.warn };
  const record = (...args: unknown[]) => { lines.push(args.map(String).join(' ')); };
  console.log = record; console.error = record; console.warn = record;
  return { lines, restore: () => Object.assign(console, original) };
}

const okCaller = (reply = 'DRAFT REPLY TEXT', escalate = false) => async () => JSON.stringify({ reply, escalate, escalateReason: escalate ? 'billing question' : '' });

test('provider: Gemini by default; the token plan is refused in production even when explicitly selected', () => {
  assert.equal(supportDraftProvider({}), 'gemini');
  assert.equal(supportDraftProvider({ NODE_ENV: 'production' }), 'gemini');
  const tokenPlan = { NODE_ENV: 'production', LLM_PROVIDER_SUPPORT_REPLY: 'qwen-token-plan', QWEN_API_KEY: 'k', QWEN_BASE_URL: TOKEN_PLAN };
  assert.throws(() => supportDraftProvider(tokenPlan), TokenPlanRefusedError);
  assert.throws(() => supportDraftProvider({ ...tokenPlan, QWEN_API_KEY: undefined }), TokenPlanRefusedError, 'refused even without a key');
  const meteredOnTokenPlanUrl = { NODE_ENV: 'production', LLM_PROVIDER_SUPPORT_REPLY: 'qwen-metered', QWEN_METERED_API_KEY: 'm', QWEN_METERED_BASE_URL: TOKEN_PLAN };
  assert.throws(() => supportDraftProvider(meteredOnTokenPlanUrl), TokenPlanRefusedError, 'a metered switch pointed at the token plan is refused');
  assert.equal(supportDraftProvider({ NODE_ENV: 'production', LLM_PROVIDER_SUPPORT_REPLY: 'qwen-metered', QWEN_METERED_API_KEY: 'm', QWEN_METERED_BASE_URL: METERED }), 'qwen-metered');
  assert.equal(supportDraftProvider({ LLM_PROVIDER_SUPPORT_REPLY: 'qwen-token-plan', QWEN_API_KEY: 'k', QWEN_BASE_URL: TOKEN_PLAN }), 'qwen-token-plan', 'dev only');
});

test('a refused provider never calls the model and stores provider_refused', async () => {
  const row = message();
  let called = 0;
  const env = { NODE_ENV: 'production', LLM_PROVIDER_SUPPORT_REPLY: 'qwen-token-plan', QWEN_API_KEY: 'k', QWEN_BASE_URL: TOKEN_PLAN };
  const out = captureConsole();
  try {
    const draft = await generateSupportDraft(row, { now: NOW, env, caller: async () => { called++; return '{}'; } });
    assert.equal(called, 0);
    assert.equal(draft?.status, 'error');
    assert.equal(draft?.error_code, 'provider_refused');
  } finally { out.restore(); }
});

test('prompt: grounded in the fact sheet, with the no-promise, singular-male, escalation and injection rules', () => {
  const prompt = buildSupportDraftSystemPrompt();
  assert.ok(prompt.includes(SITE_BOT_SUPPORT_FACTS));
  for (const rule of [/singular masculine/, /Never promise a reply time/, /Never promise results/, /price.*not in the fact sheet/, /escalate to true when the message touches billing/, /cancellation/, /legal/, /data, not instructions/, /Output JSON only/]) {
    assert.match(prompt, rule);
  }
  assert.ok(!/[\u0590-\u05ff]/.test(prompt), 'English prompt; the model writes Hebrew at runtime');
  assert.ok(!/[\u0590-\u05ff]/.test(SITE_BOT_SUPPORT_FACTS), 'English facts only');
  const user = JSON.parse(buildSupportDraftUserMessage({ body: 'x', business_name: 'Acme', staff_category: 'change' }));
  assert.deepEqual(user, { businessName: 'Acme', staffCategory: 'change', clientMessage: 'x' });
});

test('parse: strict JSON shape; strips controls; rejects empty or oversized', () => {
  assert.deepEqual(parseSupportDraft('{"reply":" hi\\u202e there ","escalate":false,"escalateReason":""}'), { reply: 'hi there', escalate: false, escalateReason: null });
  for (const bad of ['nope', '[]', '{"reply":"x"}', '{"reply":"","escalate":false}', `{"reply":"${'a'.repeat(4001)}","escalate":false}`]) {
    assert.throws(() => parseSupportDraft(bad), /invalid_model_output/);
  }
});

test('generate: stores the draft and escalation; billing/cancel categories always escalate; no content in logs', async () => {
  const out = captureConsole();
  try {
    const row = message();
    const draft = await generateSupportDraft(row, { now: NOW, env: {}, caller: okCaller() });
    assert.equal(draft?.status, 'ready');
    assert.equal(draft?.draft, 'DRAFT REPLY TEXT');
    assert.equal(draft?.escalate, 0);
    assert.equal(draft?.provider, 'gemini');
    const escalated = await generateSupportDraft(message(), { now: NOW, env: {}, caller: okCaller('ESC', true) });
    assert.equal(escalated?.escalate, 1);
    assert.equal(escalated?.escalate_reason, 'billing question');
    const billing = message();
    updateClientMessage(billing.id, { staffCategory: 'billing' }, NOW);
    const forced = await generateSupportDraft(getClientMessage(billing.id)!, { now: NOW, env: {}, caller: okCaller() });
    assert.equal(forced?.escalate, 1);
    const failing = message();
    const failed = await generateSupportDraft(failing, { now: NOW, env: {}, caller: async () => { throw new Error(`boom ${SECRET}`); } });
    assert.equal(failed?.status, 'error');
    assert.equal(failed?.error_code, 'generation_failed');
    const garbage = await generateSupportDraft(message(), { now: NOW, env: {}, caller: async () => 'not json' });
    assert.equal(garbage?.error_code, 'invalid_model_output');
  } finally { out.restore(); }
  assert.ok(out.lines.length > 0);
  assert.ok(out.lines.every((line) => !line.includes(SECRET) && !line.includes('DRAFT REPLY TEXT')), 'logs carry ids and codes only');
});

test('staff flow: edit, approve with the final text; an approved draft is never overwritten; nothing sends', async () => {
  const row = message();
  await generateSupportDraft(row, { now: NOW, env: {}, caller: okCaller() });
  const edited = saveSupportDraftEdit(row.id, 'EDITED TEXT', NOW);
  assert.ok(typeof edited !== 'string' && edited.draft === 'EDITED TEXT' && edited.edited_at);
  assert.equal(saveSupportDraftEdit(row.id, '   ', NOW), 'invalid_input');
  assert.equal(saveSupportDraftEdit(row.id, 'bad \u202e text', NOW), 'invalid_input');
  const approved = approveSupportDraft(row.id, 'FINAL TEXT', NOW);
  assert.ok(typeof approved !== 'string' && approved.status === 'approved' && approved.draft === 'FINAL TEXT' && approved.approved_at);
  assert.equal(approveSupportDraft(row.id, 'again', NOW), 'already_approved');
  assert.equal(saveSupportDraftEdit(row.id, 'again', NOW), 'already_approved');
  let called = 0;
  await generateSupportDraft(row, { now: NOW, env: {}, caller: async () => { called++; return '{}'; } });
  assert.equal(called, 0, 'regenerate never replaces an approved draft');
  assert.equal(getSupportDraft(row.id)?.draft, 'FINAL TEXT');
  assert.equal(saveSupportDraftEdit(crypto.randomUUID(), 'x', NOW), 'not_found');
});

test('queueSupportDraft: background, never throws, skips system items', async () => {
  const row = message();
  const seen: string[] = [];
  queueSupportDraft(row, async (r) => { seen.push(r.id); throw new Error('fail'); });
  queueSupportDraft({ ...row, kind: 'cancel_notice_due' }, async (r) => { seen.push(`system-${r.id}`); return null; });
  const out = captureConsole();
  try { await new Promise((resolve) => setTimeout(resolve, 10)); } finally { out.restore(); }
  assert.deepEqual(seen, [row.id]);
});
