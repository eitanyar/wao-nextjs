/**
 * SQLite storage layer for the subscription/recurring-billing engine.
 *
 * DB file location: `process.env.BILLING_DB_PATH`. In production this must
 * point inside the persistent runtime-data dir that `deploy.sh` symlinks
 * (`$WAO_RUNTIME_DATA_DIR`, default `/home/wao/wao-runtime-data`) so the
 * file survives `git pull` / `npm ci` — e.g.
 * `BILLING_DB_PATH=/home/wao/wao-runtime-data/billing.db`. There is no
 * fallback to a path inside the repo/`.next/standalone` on purpose: this
 * module throws if the env var is unset, EXCEPT when `NODE_ENV` is not
 * `production`, where it defaults to `./data/billing.db` for local dev
 * convenience.
 *
 * WAL mode + a busy_timeout are enabled unconditionally on every connection
 * open. pm2 currently runs this app in fork mode (no ecosystem.config.js
 * found => single instance), but this isn't 100% confirmed, and WAL +
 * busy_timeout is cheap insurance regardless — mandatory if it turns out to
 * be cluster mode.
 */

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const BUSY_TIMEOUT_MS = 5000;

function resolveDbPath(): string {
  const configured = process.env.BILLING_DB_PATH;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'BILLING_DB_PATH is not set. It must point at a path inside the persistent runtime-data ' +
        'directory (see deploy.sh / $WAO_RUNTIME_DATA_DIR), e.g. ' +
        '/home/wao/wao-runtime-data/billing.db.'
    );
  }
  return './data/billing.db';
}

let dbInstance: Database.Database | null = null;

/** Runs (idempotent, `IF NOT EXISTS`) schema migrations. */
function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      status            TEXT NOT NULL,
      provider          TEXT NOT NULL,
      provider_token    TEXT,
      card_last4        TEXT,
      card_expiry       TEXT,
      trial_amount      REAL,
      recurring_amount  REAL,
      currency          TEXT,
      next_charge_at    TEXT,
      canceled_at       TEXT,
      cancel_reason     TEXT,
      failed_attempts   INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL,
      updated_at         TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS charges (
      id                       TEXT PRIMARY KEY,
      subscription_id          TEXT NOT NULL REFERENCES subscriptions(id),
      idempotency_key          TEXT NOT NULL UNIQUE,
      amount                   REAL NOT NULL,
      status                   TEXT NOT NULL,
      attempt_number           INTEGER NOT NULL,
      provider_transaction_id  TEXT,
      error_code               TEXT,
      error_message            TEXT,
      invoice_id               TEXT,
      charged_at               TEXT,
      created_at               TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscription_events (
      id               TEXT PRIMARY KEY,
      subscription_id  TEXT NOT NULL REFERENCES subscriptions(id),
      event_type       TEXT NOT NULL,
      metadata         TEXT,
      created_at       TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_charges_subscription_id ON charges(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_next_charge_at ON subscriptions(next_charge_at);
  `);

  // Additive migration (invoicing task): the "manual issuance" fallback queue
  // used by `providers/pending-queue-invoice.ts` when no real invoicing-service
  // API is wired up yet. See `src/lib/payments/invoice-provider.ts` doc comment
  // for the abstraction this backs.
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_invoices (
      id                  TEXT PRIMARY KEY,
      charge_id           TEXT NOT NULL REFERENCES charges(id),
      customer_name       TEXT NOT NULL,
      customer_email      TEXT NOT NULL,
      amount              REAL NOT NULL,
      description         TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'pending',
      provider_invoice_id TEXT,
      pdf_url             TEXT,
      created_at          TEXT NOT NULL,
      issued_at           TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_pending_invoices_charge_id ON pending_invoices(charge_id);
    CREATE INDEX IF NOT EXISTS idx_pending_invoices_status ON pending_invoices(status);
  `);
}

/** Opens (or reuses) the singleton billing DB connection. */
export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
  db.pragma('foreign_keys = ON');

  migrate(db);

  dbInstance = db;
  return db;
}

/** Closes the singleton connection. Mainly for tests / clean shutdown. */
export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Row types (snake_case mirrors the DB columns 1:1; no ORM mapping layer).

export interface SubscriptionRow {
  id: string;
  user_id: string;
  // 'pending' added in the trial-signup/self-cancel step (step 8): a
  // subscription row exists before the hosted-tokenization callback comes
  // back, so it needs a pre-chargeable status distinct from 'trialing'.
  status: 'pending' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  provider: string;
  provider_token: string | null;
  card_last4: string | null;
  card_expiry: string | null;
  trial_amount: number | null;
  recurring_amount: number | null;
  currency: string | null;
  next_charge_at: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  failed_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface ChargeRow {
  id: string;
  subscription_id: string;
  idempotency_key: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  attempt_number: number;
  provider_transaction_id: string | null;
  error_code: string | null;
  error_message: string | null;
  invoice_id: string | null;
  charged_at: string | null;
  created_at: string;
}

export interface PendingInvoiceRow {
  id: string;
  charge_id: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  description: string;
  status: 'pending' | 'issued' | 'failed';
  provider_invoice_id: string | null;
  pdf_url: string | null;
  created_at: string;
  issued_at: string | null;
}

export interface SubscriptionEventRow {
  id: string;
  subscription_id: string;
  event_type:
    | 'created'
    | 'trial_charged'
    | 'renewed'
    | 'charge_failed'
    | 'canceled_by_user'
    | 'canceled_by_admin'
    | 'card_updated'
    // Added for the cron recurring-charge engine (task #9): marks that the
    // "your trial is about to convert to a full charge" reminder email has
    // been sent for this subscription, so the reminder cron doesn't re-send
    // it on every run. Additive-only change to this union, per the
    // db.ts-touch constraint.
    | 'reminder_sent'
    // Added for the card-update-flow + card-expiry-notices task: marks that
    // the proactive "your card is expiring soon" email has been sent for a
    // given calendar month (see cron-card-expiry.ts gating, which scopes this
    // check to the current YYYY-MM inside `metadata`). Additive-only change
    // to this union, per the db.ts-touch constraint.
    | 'card_expiry_notice_sent';
  metadata: string | null;
  created_at: string;
}

/** Builds the idempotency key convention used across the billing engine. */
export function buildIdempotencyKey(
  subscriptionId: string,
  billingPeriodStartDate: string,
  attemptNumber: number
): string {
  return `${subscriptionId}:${billingPeriodStartDate}:${attemptNumber}`;
}

export function insertSubscription(db: Database.Database, row: SubscriptionRow): void {
  db.prepare(
    `INSERT INTO subscriptions (
      id, user_id, status, provider, provider_token, card_last4, card_expiry,
      trial_amount, recurring_amount, currency, next_charge_at, canceled_at,
      cancel_reason, failed_attempts, created_at, updated_at
    ) VALUES (
      @id, @user_id, @status, @provider, @provider_token, @card_last4, @card_expiry,
      @trial_amount, @recurring_amount, @currency, @next_charge_at, @canceled_at,
      @cancel_reason, @failed_attempts, @created_at, @updated_at
    )`
  ).run(row);
}

export function insertCharge(db: Database.Database, row: ChargeRow): void {
  db.prepare(
    `INSERT INTO charges (
      id, subscription_id, idempotency_key, amount, status, attempt_number,
      provider_transaction_id, error_code, error_message, invoice_id, charged_at, created_at
    ) VALUES (
      @id, @subscription_id, @idempotency_key, @amount, @status, @attempt_number,
      @provider_transaction_id, @error_code, @error_message, @invoice_id, @charged_at, @created_at
    )`
  ).run(row);
}

export function insertSubscriptionEvent(db: Database.Database, row: SubscriptionEventRow): void {
  db.prepare(
    `INSERT INTO subscription_events (
      id, subscription_id, event_type, metadata, created_at
    ) VALUES (
      @id, @subscription_id, @event_type, @metadata, @created_at
    )`
  ).run(row);
}

export function insertPendingInvoice(db: Database.Database, row: PendingInvoiceRow): void {
  db.prepare(
    `INSERT INTO pending_invoices (
      id, charge_id, customer_name, customer_email, amount, description,
      status, provider_invoice_id, pdf_url, created_at, issued_at
    ) VALUES (
      @id, @charge_id, @customer_name, @customer_email, @amount, @description,
      @status, @provider_invoice_id, @pdf_url, @created_at, @issued_at
    )`
  ).run(row);
}

export function getPendingInvoiceById(db: Database.Database, id: string): PendingInvoiceRow | null {
  const row = db.prepare(`SELECT * FROM pending_invoices WHERE id = ?`).get(id) as
    | PendingInvoiceRow
    | undefined;
  return row ?? null;
}

/** Updates row status to `charge_id`'s corresponding charges row — used to
 * write back the resulting `invoiceId` after invoice creation succeeds. */
export function setChargeInvoiceId(db: Database.Database, chargeId: string, invoiceId: string): void {
  db.prepare(`UPDATE charges SET invoice_id = @invoice_id WHERE id = @id`).run({
    id: chargeId,
    invoice_id: invoiceId,
  });
}
