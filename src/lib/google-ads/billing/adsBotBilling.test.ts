// Ads Bot billing (mission 2026-11-22 item 3): plan + VAT, copy source, pay link, checkout (consent -> readiness
// termsConsent, sign-up charge -> feePaid), manual Takbull record, cancel staff alert. Temp billing DB and temp
// WAO_CLIENTS_DIR only. Mock provider only. HEBREW-SAFETY: zero Hebrew bytes in this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const tmpDbPath = path.join(os.tmpdir(), `wao-billing-test-adsbot-${crypto.randomUUID()}.db`);
const clientsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-adsbot-clients-'));
process.env.BILLING_DB_PATH = tmpDbPath;
process.env.WAO_CLIENTS_DIR = clientsRoot;
process.env.TOKEN_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
process.env.ADS_BOT_PAY_LINK_SECRET = 'test-secret-test-secret-test-secret-0123';
delete process.env.RESEND_API_KEY;
delete process.env.PAYMENT_PROVIDER;
process.env.NEXT_PUBLIC_BASE_URL = 'https://wao.co.il';

import { getDb, closeDb } from '../../payments/db';
import { _resetPaymentProviderForTests } from '../../payments/get-provider';
import { ADS_BOT_MONTHLY_NET_ILS, ADS_BOT_PLAN, SITE_BOT_PLAN, formatShekels, getBillingPlan, planChargeAmount, planSummary, planVatAmount } from '../../payments/plans';
import { cancelSubscriptionByToken, createPendingPlanSubscription, getSubscriptionById, planChargeDate } from '../../payments/subscriptions';
import { runChargeCron } from '../../payments/cron-charge';
import { generateMagicLinkToken } from '../../payments/magic-link';
import { loadLiveReadinessRecord } from '../live-readiness-store';
import { isTermsConsentComplete, missingReadinessKeys } from '../live-readiness.js';
import { adsBotCheckoutEnabled } from './adsBotCheckoutFlag';
import { ADS_BOT_CHECKOUT_COPY, ADS_BOT_PAY_LINK_EMAIL_COPY, ADS_BOT_TERMS_PATH, adsBotConsentParts, buildAdsBotPayLinkEmail } from './adsBotCheckoutCopy';
import { ADS_BOT_TERMS_SHA256, ADS_BOT_TERMS_VERSION } from './adsBotTerms';
import { ADS_BOT_PAY_PATH, buildPayLinkUrl, createPayLinkToken, verifyPayLinkToken } from './adsBotPayLink';
import {
  MANUAL_TAKBULL_PROVIDER,
  adsBotClientForSubscription,
  buildAdsBotPayLinkMessage,
  completeAdsBotCheckout,
  notifyAdsBotCancellation,
  recordManualAdsBotCharge,
  startAdsBotCheckout,
} from './adsBotBilling';

const root = process.cwd();
const ORIGIN = 'https://wao.co.il';
const NOW = new Date('2026-11-29T08:00:00.000Z');

test.beforeEach(() => _resetPaymentProviderForTests());
test.after(() => {
  closeDb();
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(`${tmpDbPath}${suffix}`, { force: true });
  fs.rmSync(clientsRoot, { recursive: true, force: true });
});

const token = (clientId: string, email = `${clientId}@example.com`, now = NOW) => createPayLinkToken({ clientId, email }, { now });
const auditLines = (clientId: string) => {
  const file = path.join(clientsRoot, clientId, 'live-readiness.audit.jsonl');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [];
};
const charges = (id: string) => getDb().prepare(`SELECT amount, status, provider_transaction_id FROM charges WHERE subscription_id = ? ORDER BY created_at`).all(id) as Array<{ amount: number; status: string; provider_transaction_id: string | null }>;

// ── plan + VAT ──────────────────────────────────────────────────────────────────────────────────────────────────────

test('ADS_BOT_PLAN: 249 net + 18% VAT = 293.82, sign-up anchor, monthly, Site-Bot dunning', () => {
  assert.equal(ADS_BOT_PLAN.id, 'ads-bot');
  assert.equal(ADS_BOT_PLAN.netAmount, 249);
  assert.equal(ADS_BOT_PLAN.netAmount, ADS_BOT_MONTHLY_NET_ILS);
  assert.equal(ADS_BOT_PLAN.vat.rate, 0.18);
  assert.equal(planVatAmount(ADS_BOT_PLAN), 44.82);
  assert.equal(planChargeAmount(ADS_BOT_PLAN), 293.82);
  assert.equal(planSummary(ADS_BOT_PLAN).chargeAmount, 293.82);
  assert.equal(ADS_BOT_PLAN.billingAnchor, 'signup_date');
  assert.equal(ADS_BOT_PLAN.interval, 'month');
  assert.equal(ADS_BOT_PLAN.trialDays, 0);
  assert.equal(ADS_BOT_PLAN.cancellationEffective, 'end_of_period');
  assert.equal(ADS_BOT_PLAN.dunning, SITE_BOT_PLAN.dunning, 'reuses the Site-Bot dunning object');
  assert.equal(getBillingPlan('ads-bot'), ADS_BOT_PLAN);
  assert.equal(getBillingPlan('site-bot'), SITE_BOT_PLAN);
  assert.ok(Object.isFrozen(ADS_BOT_PLAN));
  const plans = fs.readFileSync(path.join(root, 'src/lib/payments/plans.ts'), 'utf8');
  assert.match(plans, /OPEN \(before go-live\)/, 'the VAT OPEN note stays open');
  assert.match(plans, /ASSUMPTION \(still OPEN, Takbull question 8\)/);
});

test('flag: ADS_BOT_CHECKOUT_ENABLED is off unless exactly "true"', () => {
  assert.equal(adsBotCheckoutEnabled({}), false);
  for (const value of ['', '1', 'TRUE', 'yes', 'false']) assert.equal(adsBotCheckoutEnabled({ ADS_BOT_CHECKOUT_ENABLED: value }), false, value);
  assert.equal(adsBotCheckoutEnabled({ ADS_BOT_CHECKOUT_ENABLED: 'true' }), true);
});

// ── copy ────────────────────────────────────────────────────────────────────────────────────────────────────────────

test('copy: byte-exact from docs/copy/ads-bot-new-strings-2026-11-22.json; its quoted prices match the plan', () => {
  const source = JSON.parse(fs.readFileSync(path.join(root, 'docs/copy/ads-bot-new-strings-2026-11-22.json'), 'utf8'));
  assert.deepEqual({ ...ADS_BOT_CHECKOUT_COPY }, source.checkout);
  assert.deepEqual({ ...ADS_BOT_PAY_LINK_EMAIL_COPY }, source.pay_link_email);
  const net = formatShekels(ADS_BOT_PLAN.netAmount);
  const total = formatShekels(planChargeAmount(ADS_BOT_PLAN));
  for (const text of [ADS_BOT_CHECKOUT_COPY.price_line, ADS_BOT_PAY_LINK_EMAIL_COPY.body]) {
    assert.ok(text.includes(net), `quotes ${net}`);
    assert.ok(text.includes(total), `quotes ${total}`);
  }
  const parts = adsBotConsentParts();
  assert.ok(parts.linkLabel.length > 0);
  assert.equal(`${parts.before}[${parts.linkLabel}]${parts.after}`, ADS_BOT_CHECKOUT_COPY.consent);
  assert.equal(ADS_BOT_TERMS_PATH, '/google-ads/terms');
  const email = buildAdsBotPayLinkEmail({ firstName: 'Dana', payLink: 'https://wao.co.il/google-ads/pay?t=x' });
  assert.equal(email.subject, ADS_BOT_PAY_LINK_EMAIL_COPY.subject);
  assert.ok(email.text.includes('Dana') && email.text.includes('https://wao.co.il/google-ads/pay?t=x'));
  assert.doesNotMatch(email.text, /\{first_name\}|\{pay_link\}/);
});

test('terms version is pinned to the exact bytes of the Ads Bot terms (bump both constants when the terms change)', () => {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'docs/legal/ads-bot-terms-of-use.md'))).digest('hex');
  assert.equal(sha, ADS_BOT_TERMS_SHA256);
  assert.ok(ADS_BOT_TERMS_VERSION.endsWith(sha.slice(0, 8)));
});

// ── pay link ────────────────────────────────────────────────────────────────────────────────────────────────────────

test('pay link: signed, carries client + email, expires, rejects tampering and a missing secret', () => {
  const t = token('pilot-a', 'owner@example.com');
  assert.deepEqual(verifyPayLinkToken(t, { now: NOW }), { clientId: 'pilot-a', email: 'owner@example.com', expiresAt: NOW.getTime() + 14 * 86400000 });
  assert.equal(verifyPayLinkToken(t, { now: new Date(NOW.getTime() + 15 * 86400000) }), null, 'expired');
  const [payload, sig] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ c: 'other', e: 'owner@example.com', x: NOW.getTime() + 1e9 })).toString('base64url');
  assert.equal(verifyPayLinkToken(`${forged}.${sig}`, { now: NOW }), null);
  assert.equal(verifyPayLinkToken(`${payload}.x${sig.slice(1)}`, { now: NOW }), null);
  for (const bad of [undefined, null, 42, '', 'a.b.c', 'nodot']) assert.equal(verifyPayLinkToken(bad, { now: NOW }), null);
  assert.equal(verifyPayLinkToken(t, { now: NOW, env: {} }), null, 'no secret, nothing verifies');
  assert.throws(() => createPayLinkToken({ clientId: 'x', email: 'a@b.co' }, { env: { ADS_BOT_PAY_LINK_SECRET: 'short' } }));
  assert.throws(() => createPayLinkToken({ clientId: '../x', email: 'a@b.co' }));
  assert.equal(buildPayLinkUrl('https://wao.co.il/', 'abc'), `https://wao.co.il${ADS_BOT_PAY_PATH}?t=abc`);
  const message = buildAdsBotPayLinkMessage({ clientId: 'pilot-a', email: 'owner@example.com', firstName: 'Dana', origin: ORIGIN, now: NOW });
  assert.ok(message.text.includes(message.payLink));
  assert.ok(verifyPayLinkToken(new URL(message.payLink).searchParams.get('t'), { now: NOW }));
});

// ── checkout ────────────────────────────────────────────────────────────────────────────────────────────────────────

test('checkout: no consent or a bad link -> nothing recorded, nothing created', async () => {
  const before = (getDb().prepare(`SELECT COUNT(*) AS n FROM subscriptions`).get() as { n: number }).n;
  assert.deepEqual(await startAdsBotCheckout({ token: token('pilot-noconsent'), consent: false, origin: ORIGIN, now: NOW }), { ok: false, error: 'consent_required' });
  assert.deepEqual(await startAdsBotCheckout({ token: token('pilot-noconsent'), consent: 'true', origin: ORIGIN, now: NOW }), { ok: false, error: 'consent_required' });
  assert.deepEqual(await startAdsBotCheckout({ token: 'forged.token', consent: true, origin: ORIGIN, now: NOW }), { ok: false, error: 'invalid_link' });
  assert.equal(loadLiveReadinessRecord('pilot-noconsent'), null);
  assert.equal((getDb().prepare(`SELECT COUNT(*) AS n FROM subscriptions`).get() as { n: number }).n, before);
});

test('checkout: consent records termsConsent (server version + timestamp) in the readiness record; the sign-up charge sets feePaid', async () => {
  const started = await startAdsBotCheckout({ token: token('pilot-b'), consent: true, origin: ORIGIN, now: NOW });
  assert.ok(started.ok);
  if (!started.ok) return;
  assert.equal(started.mockProvider, true);
  assert.equal(started.summary.chargeAmount, 293.82);
  const afterConsent = loadLiveReadinessRecord('pilot-b')!;
  assert.deepEqual(afterConsent.termsConsent, { termsVersion: ADS_BOT_TERMS_VERSION, consentedAt: NOW.toISOString() });
  assert.ok(isTermsConsentComplete(afterConsent.termsConsent));
  assert.equal(afterConsent.feePaid, undefined, 'not paid yet');
  const pending = getSubscriptionById(started.subscriptionId)!;
  assert.equal(pending.status, 'pending');
  assert.equal(pending.plan, 'ads-bot');
  assert.equal(pending.recurring_amount, 293.82);
  assert.equal(pending.user_id, 'pilot-b@example.com');
  assert.equal(adsBotClientForSubscription(started.subscriptionId), 'pilot-b');

  const paidAt = new Date(NOW.getTime() + 60000);
  assert.deepEqual(await completeAdsBotCheckout({ subscriptionId: started.subscriptionId, payload: { sessionId: started.providerSessionId }, now: paidAt }),
    { ok: true, subscriptionId: started.subscriptionId, alreadyActive: false });
  const active = getSubscriptionById(started.subscriptionId)!;
  assert.equal(active.status, 'active');
  assert.equal(active.billing_anchor_at, paidAt.toISOString(), 'first charge on the sign-up day');
  assert.equal(active.next_charge_at, planChargeDate(paidAt.toISOString(), 1), 'then monthly on the same day');
  assert.deepEqual(charges(started.subscriptionId).map(c => [c.amount, c.status]), [[293.82, 'succeeded']]);
  const record = loadLiveReadinessRecord('pilot-b')!;
  assert.equal(record.feePaid, true);
  assert.deepEqual(missingReadinessKeys(record, 'pre-account'), ['approvalContactConfirmed'], 'only the admin-ticked key is left before account creation');
  assert.deepEqual(auditLines('pilot-b').map(line => [line.source, line.changes.map((c: { key: string }) => c.key)]),
    [['ads-bot-checkout', ['termsConsent']], ['ads-bot-checkout', ['feePaid']]]);

  const replay = await completeAdsBotCheckout({ subscriptionId: started.subscriptionId, payload: {}, now: paidAt });
  assert.deepEqual(replay, { ok: true, subscriptionId: started.subscriptionId, alreadyActive: true });
  assert.equal(charges(started.subscriptionId).length, 1, 'a replayed callback never charges twice');
  assert.deepEqual(await startAdsBotCheckout({ token: token('pilot-b'), consent: true, origin: ORIGIN, now: NOW }), { ok: false, error: 'already_subscribed' });
});

test('checkout callback: refuses a Site-Bot subscription and unknown ids; a failed callback leaves feePaid unset', async () => {
  const site = await createPendingPlanSubscription({ plan: SITE_BOT_PLAN, userId: 'site@example.com', returnUrl: 'https://wao.co.il/x', now: NOW });
  assert.deepEqual(await completeAdsBotCheckout({ subscriptionId: site.subscriptionId, payload: {} }), { ok: false, error: 'not_ads_bot' });
  assert.deepEqual(await completeAdsBotCheckout({ subscriptionId: 'nope', payload: {} }), { ok: false, error: 'subscription_not_found' });
  const started = await startAdsBotCheckout({ token: token('pilot-c'), consent: true, origin: ORIGIN, now: NOW });
  assert.ok(started.ok);
  if (!started.ok) return;
  assert.deepEqual(await completeAdsBotCheckout({ subscriptionId: started.subscriptionId, payload: { simulateFailure: true }, now: NOW }), { ok: false, error: 'callback_invalid' });
  assert.equal(loadLiveReadinessRecord('pilot-c')!.feePaid, undefined);
});

// ── manual Takbull record ───────────────────────────────────────────────────────────────────────────────────────────

test('manual record: creates an active row the cron never charges, sets feePaid, adds periods, refuses a duplicate reference', async () => {
  const first = recordManualAdsBotCharge({ clientId: 'pilot-m', email: 'owner-m@example.com', chargeDate: '2026-11-29', amount: 293.82, takbullReference: 'TB-1001' }, NOW);
  assert.ok(first.ok);
  if (!first.ok) return;
  assert.equal(first.created, true);
  assert.equal(first.periodsPaid, 1);
  assert.equal(first.amountMatchesPlan, true);
  const row = getSubscriptionById(first.subscriptionId)!;
  assert.equal(row.status, 'active');
  assert.equal(row.plan, 'ads-bot');
  assert.equal(row.provider, MANUAL_TAKBULL_PROVIDER);
  assert.equal(row.next_charge_at, null, 'the charge cron never charges a hand-charged row');
  assert.equal(row.billing_anchor_at, '2026-11-29T07:00:00.000Z');
  assert.equal(first.paidThrough, '2026-12-29T07:00:00.000Z');
  assert.deepEqual(charges(first.subscriptionId), [{ amount: 293.82, status: 'succeeded', provider_transaction_id: 'TB-1001' }]);
  assert.equal(loadLiveReadinessRecord('pilot-m')!.feePaid, true);
  assert.equal(auditLines('pilot-m').at(-1).source, 'admin-manual-takbull-charge');

  const cron = await runChargeCron(new Date('2027-06-01T00:00:00.000Z'));
  assert.ok(!JSON.stringify(cron).includes(first.subscriptionId), 'cron skips the manual row');
  assert.equal(charges(first.subscriptionId).length, 1);

  const second = recordManualAdsBotCharge({ clientId: 'pilot-m', email: 'owner-m@example.com', chargeDate: '2026-12-29', amount: 290, takbullReference: 'TB-1002' }, new Date('2026-12-29T09:00:00.000Z'));
  assert.ok(second.ok);
  if (!second.ok) return;
  assert.equal(second.created, false);
  assert.equal(second.subscriptionId, first.subscriptionId);
  assert.equal(second.periodsPaid, 2);
  assert.equal(second.paidThrough, '2027-01-29T07:00:00.000Z');
  assert.equal(second.amountMatchesPlan, false, 'a different amount is recorded but flagged');

  assert.deepEqual(recordManualAdsBotCharge({ clientId: 'pilot-m', email: 'owner-m@example.com', chargeDate: '2026-12-29', amount: 293.82, takbullReference: 'TB-1002' }, new Date('2026-12-30T09:00:00.000Z')),
    { ok: false, error: 'duplicate_reference' });
  for (const [input, error] of [
    [{ clientId: '../etc' }, 'invalid_client'],
    [{ email: 'nope' }, 'invalid_email'],
    [{ chargeDate: 'tomorrow' }, 'invalid_date'],
    [{ chargeDate: '2030-01-01' }, 'invalid_date'],
    [{ amount: 0 }, 'invalid_amount'],
    [{ amount: Number.NaN }, 'invalid_amount'],
    [{ takbullReference: '  ' }, 'invalid_reference'],
  ] as const) {
    const base = { clientId: 'pilot-v', email: 'v@example.com', chargeDate: '2026-11-29', amount: 293.82, takbullReference: 'TB-V' };
    const result = recordManualAdsBotCharge(Object.assign(base, input), NOW);
    assert.deepEqual(result, { ok: false, error }, JSON.stringify(input));
  }
  assert.equal(loadLiveReadinessRecord('pilot-v'), null, 'a rejected record writes nothing');
});

// ── cancel hook ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('cancel hook: an Ads Bot cancel fires one staff alert (pause, landing page +30 days, MCC unlink); Site-Bot does not', async () => {
  const manual = recordManualAdsBotCharge({ clientId: 'pilot-x', email: 'owner-x@example.com', chargeDate: '2026-11-29', amount: 293.82, takbullReference: 'TB-X1' }, NOW);
  assert.ok(manual.ok);
  if (!manual.ok) return;
  const outcome = await cancelSubscriptionByToken(generateMagicLinkToken(manual.subscriptionId).token, new Date('2026-12-10T10:00:00.000Z'));
  assert.ok(outcome.ok);
  if (!outcome.ok) return;
  assert.equal(outcome.cancelAtPeriodEnd, true);
  assert.equal(outcome.effectiveAt, '2026-12-29T07:00:00.000Z', 'end of the paid month');

  const sent: Array<{ subject: string; text: string }> = [];
  const send = async (alert: { subject: string; text: string }) => { sent.push(alert); return true; };
  assert.equal(await notifyAdsBotCancellation(manual.subscriptionId, outcome.effectiveAt, send), true);
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /pilot-x/);
  assert.match(sent[0].text, /Pause every campaign .* by 2026-12-29/);
  assert.match(sent[0].text, /landing page offline on 2027-01-28 \(30 days/);
  assert.match(sent[0].text, /manager \(MCC\) link/);
  assert.match(sent[0].text, /stop the standing charge in Takbull/);

  const site = await createPendingPlanSubscription({ plan: SITE_BOT_PLAN, userId: 's2@example.com', returnUrl: 'https://wao.co.il/x', now: NOW });
  assert.equal(await notifyAdsBotCancellation(site.subscriptionId, NOW.toISOString(), send), false);
  assert.equal(await notifyAdsBotCancellation('missing', NOW.toISOString(), send), false);
  assert.equal(await notifyAdsBotCancellation(manual.subscriptionId, outcome.effectiveAt, async () => { throw new Error('smtp down'); }), false, 'never throws');
  assert.equal(sent.length, 1);
});
