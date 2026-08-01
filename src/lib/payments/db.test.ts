import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

// Point at a fresh throwaway DB file per test-process run, before importing
// db.ts (which reads BILLING_DB_PATH at getDb()-call time, not at import
// time, but we set it up-front for clarity).
const tmpDbPath = path.join(os.tmpdir(), `wao-billing-test-${crypto.randomUUID()}.db`);
process.env.BILLING_DB_PATH = tmpDbPath;

import {
  getDb,
  closeDb,
  insertSubscription,
  insertCharge,
  buildIdempotencyKey,
  setSubscriptionExtendedCancellation,
  recordChargeRefund,
} from './db';

function nowIso() {
  return new Date().toISOString();
}

function makeSubscription(id: string) {
  return {
    id,
    user_id: 'test@example.com',
    status: 'trialing' as const,
    provider: 'mock',
    provider_token: 'encrypted-token-placeholder',
    card_last4: '4242',
    card_expiry: '12/30',
    trial_amount: 1,
    recurring_amount: 99,
    currency: 'ILS',
    next_charge_at: nowIso(),
    canceled_at: null,
    cancel_reason: null,
    failed_attempts: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
    joined_at: nowIso(),
    extended_cancellation_flag: null,
    extended_flag_basis: null,
  };
}

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

test('getDb creates the schema and enables WAL mode', () => {
  const db = getDb();
  const journalMode = db.pragma('journal_mode', { simple: true });
  assert.strictEqual(journalMode, 'wal');

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((r: any) => r.name);
  assert.ok(tables.includes('subscriptions'));
  assert.ok(tables.includes('charges'));
  assert.ok(tables.includes('subscription_events'));
});

test('inserting a subscription and a charge succeeds', () => {
  const db = getDb();
  const subId = crypto.randomUUID();
  insertSubscription(db, makeSubscription(subId));

  const idemKey = buildIdempotencyKey(subId, '2026-08-01', 1);
  insertCharge(db, {
    id: crypto.randomUUID(),
    subscription_id: subId,
    idempotency_key: idemKey,
    amount: 99,
    status: 'succeeded',
    attempt_number: 1,
    provider_transaction_id: 'mock_txn_1',
    error_code: null,
    error_message: null,
    invoice_id: null,
    charged_at: nowIso(),
    created_at: nowIso(),
    refunded_at: null,
    refund_amount: null,
    refund_provider_ref: null,
  });

  const row: any = db.prepare('SELECT * FROM charges WHERE id = (SELECT id FROM charges WHERE subscription_id = ?)').get(subId);
  assert.strictEqual(row.idempotency_key, idemKey);
});

test('idempotency_key uniqueness is enforced at the DB level', () => {
  const db = getDb();
  const subId = crypto.randomUUID();
  insertSubscription(db, makeSubscription(subId));

  const idemKey = buildIdempotencyKey(subId, '2026-09-01', 1);
  const chargeBase = {
    subscription_id: subId,
    idempotency_key: idemKey,
    amount: 99,
    status: 'succeeded' as const,
    attempt_number: 1,
    provider_transaction_id: 'mock_txn_dup',
    error_code: null,
    error_message: null,
    invoice_id: null,
    charged_at: nowIso(),
    created_at: nowIso(),
    refunded_at: null,
    refund_amount: null,
    refund_provider_ref: null,
  };

  insertCharge(db, { id: crypto.randomUUID(), ...chargeBase });

  assert.throws(
    () => insertCharge(db, { id: crypto.randomUUID(), ...chargeBase }),
    /UNIQUE constraint failed/
  );

  const count = db
    .prepare('SELECT COUNT(*) as c FROM charges WHERE idempotency_key = ?')
    .get(idemKey) as { c: number };
  assert.strictEqual(count.c, 1, 'the duplicate insert must not have silently succeeded');
});

test('buildIdempotencyKey matches the documented convention', () => {
  const key = buildIdempotencyKey('sub-1', '2026-08-01', 2);
  assert.strictEqual(key, 'sub-1:2026-08-01:2');
});

// ---------------------------------------------------------------------------
// Refund-model schema additions (task #15)
// ---------------------------------------------------------------------------

test('subscriptions/charges tables have the refund-model columns after migration', () => {
  const db = getDb();
  const subCols = (db.prepare('PRAGMA table_info(subscriptions)').all() as Array<{ name: string }>).map(
    (c) => c.name
  );
  assert.ok(subCols.includes('joined_at'));
  assert.ok(subCols.includes('extended_cancellation_flag'));
  assert.ok(subCols.includes('extended_flag_basis'));

  const chargeCols = (db.prepare('PRAGMA table_info(charges)').all() as Array<{ name: string }>).map(
    (c) => c.name
  );
  assert.ok(chargeCols.includes('refunded_at'));
  assert.ok(chargeCols.includes('refund_amount'));
  assert.ok(chargeCols.includes('refund_provider_ref'));
});

test('insertSubscription persists joined_at and defaults the extended-cancellation fields to null', () => {
  const db = getDb();
  const subId = crypto.randomUUID();
  const joinedAt = nowIso();
  insertSubscription(db, { ...makeSubscription(subId), joined_at: joinedAt });

  const row: any = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subId);
  assert.strictEqual(row.joined_at, joinedAt);
  assert.strictEqual(row.extended_cancellation_flag, null);
  assert.strictEqual(row.extended_flag_basis, null);
});

test('setSubscriptionExtendedCancellation sets the admin-verified extended-window fields', () => {
  const db = getDb();
  const subId = crypto.randomUUID();
  insertSubscription(db, makeSubscription(subId));

  setSubscriptionExtendedCancellation(db, subId, {
    extendedCancellationFlag: true,
    extendedFlagBasis: 'disability certificate provided via support email',
  });

  const row: any = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subId);
  assert.strictEqual(row.extended_cancellation_flag, 1);
  assert.strictEqual(row.extended_flag_basis, 'disability certificate provided via support email');
});

test('recordChargeRefund writes refunded_at/refund_amount/refund_provider_ref onto the charge row', () => {
  const db = getDb();
  const subId = crypto.randomUUID();
  insertSubscription(db, makeSubscription(subId));

  const chargeId = crypto.randomUUID();
  insertCharge(db, {
    id: chargeId,
    subscription_id: subId,
    idempotency_key: buildIdempotencyKey(subId, '2026-10-01', 1),
    amount: 100,
    status: 'succeeded',
    attempt_number: 1,
    provider_transaction_id: 'mock_txn_refund_test',
    error_code: null,
    error_message: null,
    invoice_id: null,
    charged_at: nowIso(),
    created_at: nowIso(),
    refunded_at: null,
    refund_amount: null,
    refund_provider_ref: null,
  });

  const refundedAt = nowIso();
  recordChargeRefund(db, chargeId, {
    refundedAt,
    refundAmount: 42.5,
    refundProviderRef: 'mock_refund_ref_1',
  });

  const row: any = db.prepare('SELECT * FROM charges WHERE id = ?').get(chargeId);
  assert.strictEqual(row.refunded_at, refundedAt);
  assert.strictEqual(row.refund_amount, 42.5);
  assert.strictEqual(row.refund_provider_ref, 'mock_refund_ref_1');
});
