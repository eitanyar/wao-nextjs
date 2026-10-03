import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { composeCheckup, enabled, openOptinStore, optedIn, sameOrigin, submitOptin, unsubscribe, validateSubmission, SENDER } from './exit-optin';
import { sendResendTransactionalEmail, type ResendTransactionalEmailInput } from './notifications/resend-transactional';
import { DISMISS_MS, WEEK_MS, intentReady, optinEligible, topExitTrajectory } from './exit-optin-gate';

const input = (niche = 'clinic') => ({ email: ' Person@Example.test ', niche, consent: true, source: '/seo' });
const withStore = async (run: (store: ReturnType<typeof openOptinStore>) => Promise<void>) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-exit-optin-'));
  const store = openOptinStore(path.join(dir, 'optin.sqlite'), () => new Date('2026-10-03T12:00:00Z'));
  try { await run(store); } finally { store.db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
};

test('deterministic dwell, viewport scroll, cookie guard, trajectory and frequency boundaries', () => {
  const now = Date.parse('2026-10-03T12:00:00Z');
  assert.equal(intentReady(now + 29_999, now, 900, 800, false), false);
  assert.equal(intentReady(now + 30_000, now, 799, 800, false), false);
  assert.equal(intentReady(now + 30_000, now, 800, 800, true), false);
  assert.equal(intentReady(now + 30_000, now, 800, 800, false), true);
  assert.equal(topExitTrajectory([{ y: 120, t: 0 }, { y: 0, t: 200 }]), true);
  assert.equal(topExitTrajectory([{ y: 8, t: 0 }, { y: 0, t: 200 }]), false);
  assert.equal(topExitTrajectory([{ y: 120, t: 0 }, { y: 0, t: 1000 }]), false);
  assert.equal(optinEligible(now, null, [], false, false), true);
  assert.equal(optinEligible(now, null, [], true, false), false);
  assert.equal(optinEligible(now, null, [], false, true), false);
  assert.equal(optinEligible(now, { status: 'submitted', ts: now - 100 * WEEK_MS }, [], false, false), false);
  assert.equal(optinEligible(now, { status: 'dismissed', ts: now - DISMISS_MS + 1 }, [], false, false), false);
  assert.equal(optinEligible(now, { status: 'dismissed', ts: now - DISMISS_MS }, [], false, false), true);
  assert.equal(optinEligible(now, null, [now - 1, now - WEEK_MS + 1], false, false), false);
  assert.equal(optinEligible(now, null, [now - WEEK_MS, now - 1], false, false), true);
});

test('flags default disabled and input/CSRF strictly bounded', () => {
  assert.equal(enabled({}), false);
  assert.equal(enabled({ feature: 'true', send: 'true', dbPath: '/outside/db' }), true);
  assert.equal(enabled({ feature: 'true', dbPath: '/outside/db' }), false);
  assert.equal(validateSubmission({ ...input(), consent: false }), null);
  assert.equal(validateSubmission({ ...input(), phone: '123' }), null);
  assert.equal(validateSubmission(input('invalid')), null);
  assert.equal(validateSubmission({ ...input(), source: '/seo-malicious' }), null);
  assert.equal(validateSubmission({ ...input(), email: 'x'.repeat(255) }), null);
  assert.equal(validateSubmission(input())?.email, 'person@example.test');
  assert.equal(sameOrigin(new Request('https://wao.example/api/exit-optin', { headers: { origin: 'https://other.example' } })), false);
  assert.equal(sameOrigin(new Request('https://wao.example/api/exit-optin', { headers: { origin: 'https://wao.example', 'sec-fetch-site': 'cross-site' } })), false);
  assert.equal(sameOrigin(new Request('https://wao.example/api/exit-optin', { headers: { origin: 'https://wao.example' } })), true);
  assert.throws(() => openOptinStore(path.join(process.cwd(), 'data/clients/test.sqlite')));
});

test('four niche emails preserve copy, sender, findings/step and opaque unsubscribe URL', async () => {
  const bundle = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/content/exit-optin-copy.json'), 'utf8'));
  const lines = fs.readFileSync(path.join(process.cwd(), 'docs/copy/exit-prompt-optin-copy-2026-10-03.md'), 'utf8').split('\n');
  const extracted = Object.fromEntries(lines.slice(12, 59).map(line => /^([a-z]+\.[\w.]+): (.+)$/.exec(line)).filter(Boolean).map(match => [match![1], match![2]]));
  assert.equal(Object.keys(bundle).length, 23);
  assert.deepEqual(bundle, extracted);
  const labels = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/content/exit-optin-niches.json'), 'utf8'));
  const source = fs.readFileSync(path.join(process.cwd(), 'src/components/ExitSurveyPopup.tsx'), 'utf8').split('\n');
  const icons = ['\u{1f3e5}', '\u2696', '\u{1f6cd}', '\u{1f4bc}'];
  assert.deepEqual(Object.values(labels), source.map(line => line.trim()).filter(line => icons.some(icon => line.startsWith(icon))));
  assert.equal(SENDER, 'WAO Leads <leads@wao.co.il>');
  for (const niche of ['clinic', 'lawyer', 'ecommerce', 'other'] as const) {
    const message = composeCheckup(niche, 'https://wao.example/api/exit-optin/unsubscribe?token=opaque');
    assert.equal(message.from, SENDER);
    assert.equal(message.subject, bundle['optin.email.subject']);
    assert.ok(message.text.includes(bundle[`optin.email.findings.${niche}`]));
    assert.ok(message.text.includes(bundle[`optin.email.nextStep.${niche}`]));
    assert.ok(message.text.includes(bundle['optin.email.senderNote']));
    assert.ok(message.text.includes('/api/exit-optin/unsubscribe?token=opaque'));
  }
});

test('SQLite consent, mock Resend, duplicate, anonymous status and idempotent suppression', async () => withStore(async store => {
  let calls = 0;
  let unsubscribeToken = '';
  const sender = (mail: ResendTransactionalEmailInput) => sendResendTransactionalEmail(mail, { apiKey: 'local-test-only', client: { emails: { send: async message => {
    calls++;
    unsubscribeToken = message.text.match(/unsubscribe\?token=([\w-]+)/)?.[1] || '';
    return { data: { id: 'mock-delivered' } };
  } } } });
  const result = await submitOptin(store, input(), 'https://wao.example', sender);
  assert.equal(result.delivered, true);
  assert.equal(calls, 1);
  assert.ok(result.session);
  assert.equal(optedIn(store, undefined), false);
  assert.equal(optedIn(store, result.session), true);
  assert.equal((await submitOptin(store, input(), 'https://wao.example', sender)).delivered, false);
  assert.equal(calls, 1);
  const record = store.db.prepare('SELECT * FROM exit_optins').get() as Record<string, unknown>;
  assert.equal(record.email, 'person@example.test');
  assert.equal(record.variant_id, 'optin');
  assert.equal(record.source_path, '/seo');
  assert.equal(record.niche, 'clinic');
  assert.ok(record.consent_at);
  assert.match(record.session_hash as string, /^[a-f0-9]{64}$/);
  assert.notEqual(record.session_hash, result.session);
  assert.notEqual(record.unsubscribe_hash, unsubscribeToken);
  unsubscribe(store, unsubscribeToken);
  unsubscribe(store, unsubscribeToken);
  assert.equal(optedIn(store, result.session), false);
  assert.equal((await submitOptin(store, input(), 'https://wao.example', sender)).delivered, false);
  assert.equal(calls, 1);
  assert.ok((store.db.prepare('SELECT unsubscribed_at FROM exit_optins').get() as { unsubscribed_at: string }).unsubscribed_at);
}));

test('transport failure never claims delivered and leaves consent/suppression audit', async () => withStore(async store => {
  const failed = await submitOptin(store, input('lawyer'), 'https://wao.example', async () => { throw new Error('mock failure'); });
  assert.deepEqual(failed, { delivered: false });
  assert.equal((store.db.prepare('SELECT delivery_state FROM exit_optins').get() as { delivery_state: string }).delivery_state, 'failed');
  assert.equal((await submitOptin(store, input('lawyer'), 'https://wao.example', async () => { throw new Error('unexpected second send'); })).delivered, false);
}));

test('suppression persists across SQLite reopen and blocks later attempts', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-exit-optin-reopen-'));
  const dbPath = path.join(dir, 'optin.sqlite');
  let store = openOptinStore(dbPath);
  let unsubscribeToken = '';
  try {
    const result = await submitOptin(store, input('other'), 'https://wao.example', async mail => {
      unsubscribeToken = mail.text.match(/unsubscribe\?token=([\w-]+)/)?.[1] || '';
      return { messageId: 'mock-delivered' };
    });
    assert.equal(result.delivered, true);
    store.db.close();
    store = openOptinStore(dbPath);
    assert.equal(optedIn(store, result.session), true);
    unsubscribe(store, unsubscribeToken);
    store.db.close();
    store = openOptinStore(dbPath);
    assert.equal(optedIn(store, result.session), false);
    assert.deepEqual(await submitOptin(store, input('other'), 'https://wao.example', async () => { throw new Error('unexpected network'); }), { delivered: false });
  } finally { if (store.db.open) store.db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
