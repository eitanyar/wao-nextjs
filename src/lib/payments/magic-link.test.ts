import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const tmpDbPath = path.join(os.tmpdir(), `wao-billing-test-magic-link-${crypto.randomUUID()}.db`);
process.env.BILLING_DB_PATH = tmpDbPath;

import { getDb, closeDb, insertSubscription } from './db';
import {
  generateMagicLinkToken,
  peekMagicLinkToken,
  validateAndConsumeMagicLinkToken,
} from './magic-link';

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

test.before(() => {
  const db = getDb();
  insertSubscription(db, makeSubscription('sub-a'));
  insertSubscription(db, makeSubscription('sub-b'));
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

test('generateMagicLinkToken produces a token that peeks as valid for its subscription', () => {
  const { token } = generateMagicLinkToken('sub-a');
  const peek = peekMagicLinkToken(token);
  assert.strictEqual(peek.valid, true);
  if (peek.valid) assert.strictEqual(peek.subscriptionId, 'sub-a');
});

test('peekMagicLinkToken does not consume the token — a second peek still succeeds', () => {
  const { token } = generateMagicLinkToken('sub-a');
  const first = peekMagicLinkToken(token);
  const second = peekMagicLinkToken(token);
  assert.strictEqual(first.valid, true);
  assert.strictEqual(second.valid, true);
});

test('validateAndConsumeMagicLinkToken succeeds once, then rejects the same token as already used', () => {
  const { token } = generateMagicLinkToken('sub-a');

  const firstUse = validateAndConsumeMagicLinkToken(token);
  assert.strictEqual(firstUse.valid, true);
  if (firstUse.valid) assert.strictEqual(firstUse.subscriptionId, 'sub-a');

  const secondUse = validateAndConsumeMagicLinkToken(token);
  assert.strictEqual(secondUse.valid, false);
  if (!secondUse.valid) assert.strictEqual(secondUse.reason, 'already_consumed');
});

test('peekMagicLinkToken reflects consumption after validateAndConsumeMagicLinkToken runs', () => {
  const { token } = generateMagicLinkToken('sub-a');
  validateAndConsumeMagicLinkToken(token);
  const peek = peekMagicLinkToken(token);
  assert.strictEqual(peek.valid, false);
  if (!peek.valid) assert.strictEqual(peek.reason, 'already_consumed');
});

test('an expired token is rejected by both peek and validate+consume', () => {
  const { token } = generateMagicLinkToken('sub-a');

  // Force-expire it directly in the DB (avoids a real 30-minute sleep in tests).
  const db = getDb();
  const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
  db.prepare(`UPDATE magic_link_tokens SET expires_at = ? WHERE token_hash = ?`).run(
    new Date(Date.now() - 1000).toISOString(),
    tokenHash
  );

  const peek = peekMagicLinkToken(token);
  assert.strictEqual(peek.valid, false);
  if (!peek.valid) assert.strictEqual(peek.reason, 'expired');

  const consume = validateAndConsumeMagicLinkToken(token);
  assert.strictEqual(consume.valid, false);
  if (!consume.valid) assert.strictEqual(consume.reason, 'expired');
});

test('a token minted for subscription A cannot be used to act on subscription B', () => {
  const { token } = generateMagicLinkToken('sub-a');
  const result = validateAndConsumeMagicLinkToken(token);
  assert.strictEqual(result.valid, true);
  if (result.valid) {
    assert.strictEqual(result.subscriptionId, 'sub-a');
    assert.notStrictEqual(result.subscriptionId, 'sub-b');
  }
});

test('an unknown/forged token is rejected', () => {
  const result = validateAndConsumeMagicLinkToken('not-a-real-token');
  assert.strictEqual(result.valid, false);
  if (!result.valid) assert.strictEqual(result.reason, 'not_found');
});
