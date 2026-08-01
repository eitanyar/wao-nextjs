import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { addDays } from 'date-fns';

const tmpDbPath = path.join(os.tmpdir(), `wao-billing-test-invoicing-${crypto.randomUUID()}.db`);
process.env.BILLING_DB_PATH = tmpDbPath;
process.env.TOKEN_ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; // 32 zero bytes, base64, test-only
process.env.NEXT_PUBLIC_BASE_URL = 'https://wao.co.il';
process.env.INVOICE_PROVIDER = 'mock';

import { getDb, closeDb, insertSubscription, type SubscriptionRow, type ChargeRow } from './db';
import { encryptToken } from './crypto';
import { getPaymentProvider, _resetPaymentProviderForTests } from './get-provider';
import { getInvoiceProvider, _resetInvoiceProviderForTests } from './get-invoice-provider';
import { MockInvoiceProvider } from './providers/mock-invoice';
import { runChargeCron } from './cron-charge';
import { createPendingSubscription, applyTokenizationCallback } from './subscriptions';
import { issueInvoiceForCharge } from './invoicing';

test.beforeEach(() => {
  _resetPaymentProviderForTests();
  _resetInvoiceProviderForTests();
});

test.after(() => {
  closeDb();
  try {
    fs.unlinkSync(tmpDbPath);
    fs.unlinkSync(`${tmpDbPath}-wal`);
    fs.unlinkSync(`${tmpDbPath}-shm`);
  } catch {
    // best-effort cleanup
  }
});

function isoNow(): string {
  return new Date().toISOString();
}

function makeSubscription(overrides: Partial<SubscriptionRow> & { token: string }): SubscriptionRow {
  const id = overrides.id ?? crypto.randomUUID();
  const timestamp = isoNow();
  const row: SubscriptionRow = {
    id,
    user_id: overrides.user_id ?? `${id}@example.com`,
    status: overrides.status ?? 'trialing',
    provider: 'mock',
    provider_token: encryptToken(overrides.token),
    card_last4: '4242',
    card_expiry: '12/30',
    trial_amount: 1,
    recurring_amount: overrides.recurring_amount ?? 100,
    currency: 'ILS',
    next_charge_at: overrides.next_charge_at ?? timestamp,
    canceled_at: null,
    cancel_reason: null,
    failed_attempts: overrides.failed_attempts ?? 0,
    created_at: timestamp,
    updated_at: timestamp,
    joined_at: overrides.joined_at ?? timestamp,
    extended_cancellation_flag: overrides.extended_cancellation_flag ?? null,
    extended_flag_basis: overrides.extended_flag_basis ?? null,
  };
  if ('next_charge_at' in overrides) {
    row.next_charge_at = overrides.next_charge_at as string | null;
  }
  insertSubscription(getDb(), row);
  return row;
}

function getCharge(subscriptionId: string): ChargeRow {
  return getDb().prepare(`SELECT * FROM charges WHERE subscription_id = ?`).get(subscriptionId) as ChargeRow;
}

test('a successful renewal charge (mock invoice provider) results in charges.invoice_id being set', async () => {
  const dueDate = new Date(Date.now() - 60_000).toISOString();
  const sub = makeSubscription({ token: 'tok_mock_good_renewal_invoice', status: 'active', next_charge_at: dueDate });

  const summary = await runChargeCron();
  const result = summary.results.find((r) => r.subscriptionId === sub.id);
  assert.strictEqual(result?.outcome, 'succeeded');

  const charge = getCharge(sub.id);
  assert.strictEqual(charge.status, 'succeeded');
  assert.ok(charge.invoice_id);
  assert.ok(charge.invoice_id!.startsWith('mock_inv_'));
});

test('a successful trial charge via applyTokenizationCallback also gets charges.invoice_id set', async () => {
  const { subscriptionId } = await createPendingSubscription({
    email: 'trial-invoice@example.com',
    trialAmount: 1,
    recurringAmount: 100,
  });

  const outcome = await applyTokenizationCallback(subscriptionId, {
    token: 'tok_mock_good_trial_invoice',
  });
  assert.strictEqual(outcome.ok, true);

  const charge = getCharge(subscriptionId);
  assert.strictEqual(charge.status, 'succeeded');
  assert.ok(charge.invoice_id);
  assert.ok(charge.invoice_id!.startsWith('mock_inv_'));
});

test('resilience: an invoice provider that throws never blocks/rolls back the charge itself', async () => {
  const dueDate = new Date(Date.now() - 60_000).toISOString();
  const sub = makeSubscription({ token: 'tok_mock_good_throwing_invoice', status: 'active', next_charge_at: dueDate });

  // Force the singleton invoice provider (already selected as MockInvoiceProvider
  // via INVOICE_PROVIDER=mock) to throw on this call, simulating a real
  // invoicing-service outage/exception.
  const provider = getInvoiceProvider() as MockInvoiceProvider;
  provider.createInvoice = async () => {
    throw new Error('simulated invoice-provider outage');
  };

  const summary = await runChargeCron();
  const result = summary.results.find((r) => r.subscriptionId === sub.id);
  assert.strictEqual(result?.outcome, 'succeeded');

  const charge = getCharge(sub.id);
  assert.strictEqual(charge.status, 'succeeded');
  assert.strictEqual(charge.invoice_id, null);
});

test('issueInvoiceForCharge itself swallows a throwing provider without throwing', async () => {
  const provider = getInvoiceProvider() as MockInvoiceProvider;
  provider.createInvoice = async () => {
    throw new Error('simulated invoice-provider outage');
  };

  const sub = makeSubscription({ token: 'tok_mock_good_direct_call', status: 'active' });
  const fakeCharge: ChargeRow = {
    id: crypto.randomUUID(),
    subscription_id: sub.id,
    idempotency_key: `${sub.id}:direct:1`,
    amount: 100,
    status: 'succeeded',
    attempt_number: 1,
    provider_transaction_id: 'mock_txn_direct',
    error_code: null,
    error_message: null,
    invoice_id: null,
    charged_at: isoNow(),
    created_at: isoNow(),
    refunded_at: null,
    refund_amount: null,
    refund_provider_ref: null,
  };

  await assert.doesNotReject(issueInvoiceForCharge(fakeCharge, sub));
});
