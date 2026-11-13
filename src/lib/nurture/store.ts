/**
 * WhatsApp nurture store (post-launch week 1 spec, task B1). A SQLite file OUTSIDE the repo at
 * `NURTURE_DB_PATH`, opened with the same guards as `openOptinStore` (`src/lib/exit-optin.ts`):
 * absolute path only, never `:memory:`, never inside the repo or any `data/clients` directory.
 * Nothing is opened or created at import time; only `openNurtureStore` touches the disk.
 *
 * Tables:
 *   contacts       consent proof (E.164 phone, time, version, sha256 of the exact text shown,
 *                  source path), state, bsuid, last message / reply times
 *   sends          message 1–5 per contact: due time, status, Meta message id, error code, holds
 *   suppressions   phone and/or bsuid opt-outs; kept after the contact row is deleted
 *   inbound_events Meta event ids, unique, for webhook de-duplication (W-4: retries for 7 days)
 *
 * Sending (B5), the webhook (B3) and the consent endpoint (B4) are later tasks; this module
 * only stores. No Hebrew lives here.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { scheduleAll, stateAfterInbound, type MessageNumber, type NurtureContactState, type NurtureSendStatus } from './schedule';

export type NurtureStore = { db: Database.Database; now: () => Date };

export interface NurtureContact {
  id: number;
  phone: string;
  consentAt: string;
  consentVersion: string;
  consentTextSha256: string;
  sourcePath: string;
  state: NurtureContactState;
  bsuid: string | null;
  lastMessageAt: string | null;
  lastReplyAt: string | null;
}

export interface NurtureSend {
  id: number;
  contactId: number;
  n: MessageNumber;
  dueAt: string | null;
  status: NurtureSendStatus;
  metaMessageId: string | null;
  errorCode: number | null;
  holdCount: number;
}

const E164 = /^\+[1-9]\d{7,14}$/;
const SOURCE_PATH = /^\/[^\s?#]{0,199}$/;
const BSUID = /^[A-Za-z0-9._:-]{1,128}$/;

/** `NURTURE_DB_PATH` or null. Reading the env never opens anything. */
export function nurtureDbPathFromEnv(env: Record<string, string | undefined> = process.env): string | null {
  const value = env.NURTURE_DB_PATH?.trim();
  return value ? value : null;
}

/** Same refusal rules as `openOptinStore`, exposed for tests and callers that want to pre-check. */
export function assertExternalNurtureDbPath(dbPath: string): string {
  if (typeof dbPath !== 'string' || !path.isAbsolute(dbPath) || dbPath === ':memory:') throw new Error('explicit_external_db_required');
  const repo = fs.realpathSync(process.cwd());
  const parent = fs.realpathSync(path.dirname(dbPath));
  const resolved = path.join(parent, path.basename(dbPath));
  const actual = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
  const clientsSegment = `${path.sep}data${path.sep}clients${path.sep}`;
  if ([resolved, actual].some((p) => p === repo || p.startsWith(repo + path.sep) || `${p}${path.sep}`.includes(clientsSegment))) {
    throw new Error('external_db_required');
  }
  return resolved;
}

export function openNurtureStore(dbPath: string, now: () => Date = () => new Date()): NurtureStore {
  const resolved = assertExternalNurtureDbPath(dbPath);
  const db = new Database(resolved);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');
    db.exec(`CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      consent_at TEXT NOT NULL,
      consent_version TEXT NOT NULL,
      consent_text_sha256 TEXT NOT NULL,
      source_path TEXT NOT NULL,
      state TEXT NOT NULL CHECK(state IN ('active','paused','stopped','converted','completed')),
      bsuid TEXT,
      last_message_at TEXT,
      last_reply_at TEXT
    );
    CREATE INDEX IF NOT EXISTS contacts_bsuid ON contacts(bsuid);
    CREATE TABLE IF NOT EXISTS sends (
      id INTEGER PRIMARY KEY,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      message_number INTEGER NOT NULL CHECK(message_number BETWEEN 1 AND 5),
      due_at TEXT,
      status TEXT NOT NULL CHECK(status IN ('pending','claimed','sent','delivered','read','failed','cancelled','skipped')),
      meta_message_id TEXT UNIQUE,
      error_code INTEGER,
      hold_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(contact_id, message_number)
    );
    CREATE INDEX IF NOT EXISTS sends_due ON sends(status, due_at);
    CREATE TABLE IF NOT EXISTS suppressions (
      id INTEGER PRIMARY KEY,
      phone TEXT,
      bsuid TEXT,
      reason TEXT NOT NULL,
      at TEXT NOT NULL,
      CHECK(phone IS NOT NULL OR bsuid IS NOT NULL)
    );
    CREATE INDEX IF NOT EXISTS suppressions_phone ON suppressions(phone);
    CREATE INDEX IF NOT EXISTS suppressions_bsuid ON suppressions(bsuid);
    CREATE TABLE IF NOT EXISTS inbound_events (
      event_id TEXT PRIMARY KEY,
      received_at TEXT NOT NULL
    );`);
    return { db, now };
  } catch (error) {
    db.close();
    throw error;
  }
}

export const consentTextSha256 = (text: string) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

type ContactRow = {
  id: number; phone: string; consent_at: string; consent_version: string; consent_text_sha256: string; source_path: string;
  state: NurtureContactState; bsuid: string | null; last_message_at: string | null; last_reply_at: string | null;
};
type SendRow = { id: number; contact_id: number; message_number: number; due_at: string | null; status: NurtureSendStatus; meta_message_id: string | null; error_code: number | null; hold_count: number };

const toContact = (r: ContactRow | undefined): NurtureContact | null => r ? {
  id: r.id, phone: r.phone, consentAt: r.consent_at, consentVersion: r.consent_version, consentTextSha256: r.consent_text_sha256,
  sourcePath: r.source_path, state: r.state, bsuid: r.bsuid, lastMessageAt: r.last_message_at, lastReplyAt: r.last_reply_at,
} : null;
const toSend = (r: SendRow): NurtureSend => ({
  id: r.id, contactId: r.contact_id, n: r.message_number as MessageNumber, dueAt: r.due_at, status: r.status,
  metaMessageId: r.meta_message_id, errorCode: r.error_code, holdCount: r.hold_count,
});

export function isSuppressed(store: NurtureStore, who: { phone?: string | null; bsuid?: string | null }): boolean {
  const phone = who.phone ?? null;
  const bsuid = who.bsuid ?? null;
  if (!phone && !bsuid) return false;
  const row = store.db.prepare(`SELECT 1 AS hit FROM suppressions WHERE (? IS NOT NULL AND phone = ?) OR (? IS NOT NULL AND bsuid = ?) LIMIT 1`).get(phone, phone, bsuid, bsuid);
  return Boolean(row);
}

export type ConsentResult =
  | { ok: true; contactId: number; created: boolean }
  | { ok: false; reason: 'invalid_input' | 'suppressed' };

/**
 * Stores the consent proof and schedules messages 1–5. A suppressed number is refused (the
 * endpoint answers neutrally either way). A repeat consent for an existing contact changes
 * nothing (the original proof row stands).
 */
export function recordConsent(store: NurtureStore, input: { phone: string; consentVersion: string; consentText: string; sourcePath: string }): ConsentResult {
  if (!E164.test(input.phone) || typeof input.consentVersion !== 'string' || !input.consentVersion || input.consentVersion.length > 128
    || typeof input.consentText !== 'string' || !input.consentText || !SOURCE_PATH.test(input.sourcePath)) {
    return { ok: false, reason: 'invalid_input' };
  }
  const consentAt = store.now();
  return store.db.transaction((): ConsentResult => {
    if (isSuppressed(store, { phone: input.phone })) return { ok: false, reason: 'suppressed' };
    const existing = store.db.prepare(`SELECT id FROM contacts WHERE phone = ?`).get(input.phone) as { id: number } | undefined;
    if (existing) return { ok: true, contactId: existing.id, created: false };
    const info = store.db.prepare(`INSERT INTO contacts (phone, consent_at, consent_version, consent_text_sha256, source_path, state)
      VALUES (?, ?, ?, ?, ?, 'active')`).run(input.phone, consentAt.toISOString(), input.consentVersion, consentTextSha256(input.consentText), input.sourcePath);
    const contactId = Number(info.lastInsertRowid);
    const insert = store.db.prepare(`INSERT INTO sends (contact_id, message_number, due_at, status) VALUES (?, ?, ?, 'pending')`);
    for (const { n, dueAt } of scheduleAll(consentAt)) insert.run(contactId, n, dueAt ? dueAt.toISOString() : null);
    return { ok: true, contactId, created: true };
  }).immediate();
}

export function getContactByPhone(store: NurtureStore, phone: string): NurtureContact | null {
  return toContact(store.db.prepare(`SELECT * FROM contacts WHERE phone = ?`).get(phone) as ContactRow | undefined);
}

export function getContactByBsuid(store: NurtureStore, bsuid: string): NurtureContact | null {
  return toContact(store.db.prepare(`SELECT * FROM contacts WHERE bsuid = ?`).get(bsuid) as ContactRow | undefined);
}

/** W-5: a button tap's `context.id` is the template message's id; find the contact that got it. */
export function getContactByMessageId(store: NurtureStore, metaMessageId: string): NurtureContact | null {
  return toContact(store.db.prepare(`SELECT c.* FROM contacts c JOIN sends s ON s.contact_id = c.id WHERE s.meta_message_id = ?`).get(metaMessageId) as ContactRow | undefined);
}

export function listSends(store: NurtureStore, contactId: number): NurtureSend[] {
  return (store.db.prepare(`SELECT * FROM sends WHERE contact_id = ? ORDER BY message_number`).all(contactId) as SendRow[]).map(toSend);
}

/** Stores `from_user_id` as the contact's bsuid whenever it is seen (W-5). */
export function setBsuid(store: NurtureStore, contactId: number, bsuid: string): boolean {
  if (!BSUID.test(bsuid)) return false;
  return store.db.prepare(`UPDATE contacts SET bsuid = ? WHERE id = ?`).run(bsuid, contactId).changes === 1;
}

/**
 * Opt-out: one transaction writes the suppression, stops the matching contact(s) and cancels
 * their pending / claimed sends. Idempotent in effect (a repeat adds another audit row only).
 */
export function suppress(store: NurtureStore, who: { phone?: string | null; bsuid?: string | null; reason: string }): { contactsStopped: number; sendsCancelled: number } {
  const phone = who.phone && E164.test(who.phone) ? who.phone : null;
  const bsuid = who.bsuid && BSUID.test(who.bsuid) ? who.bsuid : null;
  if (!phone && !bsuid) throw new Error('suppress: phone or bsuid required');
  return store.db.transaction(() => {
    store.db.prepare(`INSERT INTO suppressions (phone, bsuid, reason, at) VALUES (?, ?, ?, ?)`).run(phone, bsuid, String(who.reason).slice(0, 64), store.now().toISOString());
    const ids = (store.db.prepare(`SELECT id FROM contacts WHERE (? IS NOT NULL AND phone = ?) OR (? IS NOT NULL AND bsuid = ?)`).all(phone, phone, bsuid, bsuid) as Array<{ id: number }>).map((r) => r.id);
    let contactsStopped = 0;
    let sendsCancelled = 0;
    for (const id of ids) {
      contactsStopped += store.db.prepare(`UPDATE contacts SET state = 'stopped' WHERE id = ? AND state != 'stopped'`).run(id).changes;
      sendsCancelled += store.db.prepare(`UPDATE sends SET status = 'cancelled' WHERE contact_id = ? AND status IN ('pending','claimed')`).run(id).changes;
    }
    return { contactsStopped, sendsCancelled };
  }).immediate();
}

/** Webhook de-duplication: true the first time an event id is seen, false on a repeat. */
export function recordInboundEvent(store: NurtureStore, eventId: string): boolean {
  if (typeof eventId !== 'string' || !eventId || eventId.length > 256) return false;
  return store.db.prepare(`INSERT OR IGNORE INTO inbound_events (event_id, received_at) VALUES (?, ?)`).run(eventId, store.now().toISOString()).changes === 1;
}

/** A non-opt-out reply: pause the contact (staff notice is the caller's job when `notifyStaff`). */
export function recordReply(store: NurtureStore, contactId: number): { state: NurtureContactState; notifyStaff: boolean } | null {
  return store.db.transaction(() => {
    const row = store.db.prepare(`SELECT state FROM contacts WHERE id = ?`).get(contactId) as { state: NurtureContactState } | undefined;
    if (!row) return null;
    const next = stateAfterInbound(row.state, false);
    store.db.prepare(`UPDATE contacts SET state = ?, last_reply_at = ? WHERE id = ?`).run(next.state, store.now().toISOString(), contactId);
    return next;
  }).immediate();
}

/** Delivery statuses from the webhook (`read` = engagement, `failed` keeps the error code). */
export function recordSendStatus(store: NurtureStore, metaMessageId: string, status: 'delivered' | 'read' | 'failed', errorCode?: number | null): boolean {
  // Never downgrade read → delivered (statuses can arrive out of order).
  const guard = status === 'delivered' ? `AND status IN ('sent')` : status === 'read' ? `AND status IN ('sent','delivered')` : `AND status IN ('sent','delivered')`;
  return store.db.prepare(`UPDATE sends SET status = ?, error_code = COALESCE(?, error_code) WHERE meta_message_id = ? ${guard}`)
    .run(status, Number.isInteger(errorCode) ? errorCode : null, metaMessageId).changes === 1;
}

export function setContactState(store: NurtureStore, contactId: number, state: NurtureContactState): boolean {
  return store.db.prepare(`UPDATE contacts SET state = ? WHERE id = ? AND state != 'stopped'`).run(state, contactId).changes === 1;
}
