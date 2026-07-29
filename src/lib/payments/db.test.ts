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

import { getDb, closeDb, insertSubscription, insertCharge, buildIdempotencyKey } from './db';

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
