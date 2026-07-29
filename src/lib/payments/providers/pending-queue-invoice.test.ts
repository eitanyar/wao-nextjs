import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const tmpDbPath = path.join(os.tmpdir(), `wao-billing-test-pending-invoice-${crypto.randomUUID()}.db`);
process.env.BILLING_DB_PATH = tmpDbPath;

import { getDb, closeDb, getPendingInvoiceById, insertSubscription, insertCharge, type SubscriptionRow } from '../db';
import { PendingQueueInvoiceProvider } from './pending-queue-invoice';

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

test('PendingQueueInvoiceProvider.createInvoice inserts a pending_invoices row lookup-able by its returned invoiceId', async () => {
  // pending_invoices.charge_id has a FK to charges(id) — seed a subscription
  // + charge row first, matching real call-site ordering (invoice creation
  // always happens after a charge row already exists).
  const timestamp = new Date().toISOString();
  const subscription: SubscriptionRow = {
    id: 'sub_pending_invoice_test',
    user_id: 'test@example.com',
    status: 'active',
    provider: 'mock',
    provider_token: null,
    card_last4: '4242',
    card_expiry: '12/30',
    trial_amount: 1,
    recurring_amount: 250,
    currency: 'ILS',
    next_charge_at: timestamp,
    canceled_at: null,
    cancel_reason: null,
    failed_attempts: 0,
    created_at: timestamp,
    updated_at: timestamp,
  };
  insertSubscription(getDb(), subscription);
  insertCharge(getDb(), {
    id: 'charge_abc',
    subscription_id: subscription.id,
    idempotency_key: 'sub_pending_invoice_test:period:1',
    amount: 250,
    status: 'succeeded',
    attempt_number: 1,
    provider_transaction_id: 'mock_txn_abc',
    error_code: null,
    error_message: null,
    invoice_id: null,
    charged_at: timestamp,
    created_at: timestamp,
  });

  const provider = new PendingQueueInvoiceProvider();
  const result = await provider.createInvoice({
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    amount: 250,
    description: 'WAO subscription charge',
    externalId: 'charge_abc',
  });

  const row = getPendingInvoiceById(getDb(), result.invoiceId);
  assert.ok(row);
  assert.strictEqual(row?.charge_id, 'charge_abc');
  assert.strictEqual(row?.customer_email, 'test@example.com');
  assert.strictEqual(row?.amount, 250);
  assert.strictEqual(row?.status, 'pending');
});
