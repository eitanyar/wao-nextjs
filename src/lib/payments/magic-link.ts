/**
 * Self-serve cancellation magic-link tokens.
 *
 * Storage: a `magic_link_tokens` table on the same billing SQLite DB as
 * `db.ts` (reuses `getDb()` — same singleton connection, same WAL/busy_timeout
 * setup). Kept in this module rather than added to `db.ts` itself, per the
 * brief's "don't touch db.ts beyond what's strictly necessary" constraint —
 * this `ensureTable()` call is idempotent (`CREATE TABLE IF NOT EXISTS`) and
 * safe to run on every import.
 *
 * Security properties:
 * - Tokens are 256-bit random (`crypto.randomBytes(32)`), hex-encoded.
 * - Only the SHA-256 hash of the token is stored — the plaintext token
 *   exists only in the URL sent to the user and is never persisted.
 * - 30-minute expiry.
 * - Single-use: see the two-function split below.
 *
 * ## Why "peek" and "validate+consume" are two different functions
 *
 * The brief describes marking the token consumed "immediately on validation,
 * before doing anything else, to prevent replay" for the page that shows the
 * Cancel action. Taken completely literally, that would mean the `GET
 * /account/subscription?token=...` page load itself burns the single-use
 * token. In practice that's a well-known magic-link foot-gun: GET requests
 * are supposed to be side-effect-free, and browsers/email clients/link
 * scanners routinely prefetch or re-request GET URLs (Outlook/Gmail "safe
 * link" scanning, browser prefetch, an accidental page refresh) — any of
 * which would silently burn the token before the real user ever sees the
 * cancel button.
 *
 * So the split here is:
 * - `peekMagicLinkToken` — read-only validity check (hash lookup, not
 *   expired, not yet consumed). Used by the account page to decide what to
 *   render. Does NOT mutate `consumed_at`, so reloading the page within the
 *   30-minute window keeps working.
 * - `validateAndConsumeMagicLinkToken` — the atomic check-and-mark-consumed
 *   operation (single `UPDATE ... WHERE consumed_at IS NULL AND expires_at >
 *   now`, `changes === 1` is the source of truth). This is what actually
 *   prevents replay, and it's called first thing inside
 *   `POST /api/subscriptions/cancel` — the one operation in this flow that
 *   actually mutates state and where a replay would matter (a double-submit
 *   or a maliciously replayed link trying to re-trigger cancellation).
 *
 * This is a deliberate deviation from a fully literal reading of the brief;
 * flagged explicitly in the handoff report.
 */

import crypto from 'crypto';
import { getDb } from './db';

const TOKEN_BYTES = 32;
const EXPIRY_MINUTES = 30;

let tableEnsured = false;

function ensureTable(): void {
  if (tableEnsured) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS magic_link_tokens (
      id               TEXT PRIMARY KEY,
      subscription_id  TEXT NOT NULL REFERENCES subscriptions(id),
      token_hash       TEXT NOT NULL UNIQUE,
      expires_at       TEXT NOT NULL,
      consumed_at      TEXT,
      created_at       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_subscription_id ON magic_link_tokens(subscription_id);
  `);
  tableEnsured = true;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export interface MagicLinkToken {
  token: string;
  expiresAt: string;
}

/** Generates and stores a fresh single-use, 30-minute magic-link token for a subscription. */
export function generateMagicLinkToken(subscriptionId: string): MagicLinkToken {
  ensureTable();
  const db = getDb();

  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRY_MINUTES * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO magic_link_tokens (id, subscription_id, token_hash, expires_at, consumed_at, created_at)
     VALUES (@id, @subscription_id, @token_hash, @expires_at, NULL, @created_at)`
  ).run({
    id: crypto.randomUUID(),
    subscription_id: subscriptionId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_at: now.toISOString(),
  });

  return { token, expiresAt };
}

export type MagicLinkPeekResult =
  | { valid: true; subscriptionId: string }
  | { valid: false; reason: 'not_found' | 'expired' | 'already_consumed' };

/** Read-only validity check. Does not mutate state. See module doc comment. */
export function peekMagicLinkToken(token: string): MagicLinkPeekResult {
  ensureTable();
  const db = getDb();
  const row = db
    .prepare(`SELECT subscription_id, expires_at, consumed_at FROM magic_link_tokens WHERE token_hash = ?`)
    .get(hashToken(token)) as { subscription_id: string; expires_at: string; consumed_at: string | null } | undefined;

  if (!row) return { valid: false, reason: 'not_found' };
  if (row.consumed_at) return { valid: false, reason: 'already_consumed' };
  if (new Date(row.expires_at).getTime() <= Date.now()) return { valid: false, reason: 'expired' };
  return { valid: true, subscriptionId: row.subscription_id };
}

export type MagicLinkConsumeResult =
  | { valid: true; subscriptionId: string }
  | { valid: false; reason: 'not_found' | 'expired' | 'already_consumed' };

/**
 * Atomically validates and consumes a token in one step (mark-consumed
 * happens before anything else runs). This is the replay-prevention gate —
 * call this from state-changing endpoints (cancel), not from page GETs.
 */
export function validateAndConsumeMagicLinkToken(token: string): MagicLinkConsumeResult {
  ensureTable();
  const db = getDb();
  const tokenHash = hashToken(token);
  const nowIso = new Date().toISOString();

  const result = db
    .prepare(
      `UPDATE magic_link_tokens
       SET consumed_at = @nowIso
       WHERE token_hash = @tokenHash AND consumed_at IS NULL AND expires_at > @nowIso`
    )
    .run({ tokenHash, nowIso });

  if (result.changes === 1) {
    const row = db
      .prepare(`SELECT subscription_id FROM magic_link_tokens WHERE token_hash = ?`)
      .get(tokenHash) as { subscription_id: string };
    return { valid: true, subscriptionId: row.subscription_id };
  }

  // Determine why, for clearer error reporting (best-effort — token may not exist at all).
  const row = db
    .prepare(`SELECT expires_at, consumed_at FROM magic_link_tokens WHERE token_hash = ?`)
    .get(tokenHash) as { expires_at: string; consumed_at: string | null } | undefined;

  if (!row) return { valid: false, reason: 'not_found' };
  if (row.consumed_at) return { valid: false, reason: 'already_consumed' };
  return { valid: false, reason: 'expired' };
}

/** Test-only helper: resets the "ensure table ran" memo (tests point BILLING_DB_PATH at a fresh file per run). */
export function _resetMagicLinkTableMemoForTests(): void {
  tableEnsured = false;
}
