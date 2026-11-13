/**
 * Site-Bot client message box: store and rules (docs/specs/site-bot-support-message-box-fable52-2026-11-13.md).
 *
 * A paying client writes one free-text message from the account page; staff work it by hand in
 * /admin/site-bot-help and answer by email. Cancel requests add a system "cancel notice due" item.
 * Storage is the receipt: a 200 from the endpoint means the row below is committed.
 *
 * The table lives on the billing SQLite DB (`getDb()`), next to `subscriptions`, created with the
 * idempotent `CREATE TABLE IF NOT EXISTS` pattern of magic-link.ts. Zero Hebrew in this module.
 * Never log message content: ids and codes only.
 */
import crypto from 'crypto';
import type Database from 'better-sqlite3';
import { getDb, insertSubscriptionEvent } from '../payments/db';
import { UUID } from './helpRequest';

export const CLIENT_MESSAGE_KINDS = ['client_message', 'cancel_notice_due'] as const;
export const CLIENT_MESSAGE_STATUSES = ['received', 'handling', 'done'] as const;
export const STAFF_CATEGORIES = ['change', 'support', 'billing', 'cancel', 'reviews', 'other'] as const;
export type ClientMessageKind = (typeof CLIENT_MESSAGE_KINDS)[number];
export type ClientMessageStatus = (typeof CLIENT_MESSAGE_STATUSES)[number];
export type StaffCategory = (typeof STAFF_CATEGORIES)[number];

export const MESSAGE_MAX_CHARS = 2000;
export const STAFF_NOTE_MAX_CHARS = 1000;
/** Terms §8: the site stays up 30 days after a cancellation takes effect. */
export const SITE_OFFLINE_AFTER_DAYS = 30;
export const SESSION_LINK_EVENT = 'site_bot_session_linked';

const DAY_MS = 86_400_000;
const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // same as subscriptions.ts

export type ClientMessageErrorCode = 'invalid_input' | 'too_long' | 'conflict';
export class ClientMessageError extends Error {
  constructor(readonly code: ClientMessageErrorCode) {
    super(code);
  }
}

export interface ClientMessageRow {
  id: string;
  subscription_id: string;
  kind: ClientMessageKind;
  body: string;
  meta_json: string | null;
  business_name: string | null;
  contact_email: string | null;
  contact_mobile: string | null;
  status: ClientMessageStatus;
  staff_category: StaffCategory | null;
  staff_note: string | null;
  triage_json: string | null;
  received_at: string;
  updated_at: string;
  staff_alerted_at: string | null;
  client_confirmed_at: string | null;
  reminded_at: string | null;
}

/** `SITE_BOT_CLIENT_MESSAGES_ENABLED === 'true'` turns on the box, endpoints, cancel hook and reminder. */
export function clientMessagesEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.SITE_BOT_CLIENT_MESSAGES_ENABLED === 'true';
}

const ensured = new WeakSet<Database.Database>();
function db(): Database.Database {
  const conn = getDb();
  if (!ensured.has(conn)) {
    conn.exec(`
      CREATE TABLE IF NOT EXISTS site_bot_client_messages (
        id               TEXT PRIMARY KEY,
        subscription_id  TEXT NOT NULL REFERENCES subscriptions(id),
        kind             TEXT NOT NULL,
        body             TEXT NOT NULL,
        meta_json        TEXT,
        business_name    TEXT,
        contact_email    TEXT,
        contact_mobile   TEXT,
        status           TEXT NOT NULL DEFAULT 'received',
        staff_category   TEXT,
        staff_note       TEXT,
        triage_json      TEXT,
        received_at      TEXT NOT NULL,
        updated_at       TEXT NOT NULL,
        staff_alerted_at TEXT,
        client_confirmed_at TEXT,
        reminded_at      TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sbcm_subscription ON site_bot_client_messages(subscription_id);
      CREATE INDEX IF NOT EXISTS idx_sbcm_status ON site_bot_client_messages(status, received_at);
    `);
    ensured.add(conn);
  }
  return conn;
}

// C0 (except \n) and C1 controls, DEL, and the bidi embedding/override/isolate controls.
const FORBIDDEN = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;

/**
 * Validates and normalizes a client message body: string only; `\r\n` → `\n`; rejects any control
 * other than `\n` and any bidi override; trims; collapses 3+ newlines to 2; 1–2000 characters.
 * Throws `invalid_input` (or `too_long` when the only problem is length).
 */
export function normalizeMessageBody(raw: unknown): string {
  if (typeof raw !== 'string') throw new ClientMessageError('invalid_input');
  const unified = raw.replace(/\r\n/g, '\n');
  if (FORBIDDEN.test(unified)) throw new ClientMessageError('invalid_input');
  const body = unified.trim().replace(/\n{3,}/g, '\n\n');
  if (!body) throw new ClientMessageError('invalid_input');
  if (body.length > MESSAGE_MAX_CHARS) throw new ClientMessageError('too_long');
  return body;
}

export interface ClientIdentity {
  sessionId: string | null;
  businessName: string | null;
  contactEmail: string | null;
  contactMobile: string | null;
}

function shortText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max && !FORBIDDEN.test(trimmed) ? trimmed : null;
}

/** Business name and mobile from the latest `site_bot_session_linked` event; email from `subscriptions.user_id`. */
export function resolveClientIdentity(subscriptionId: string): ClientIdentity {
  const conn = db();
  const sub = conn.prepare(`SELECT user_id FROM subscriptions WHERE id = ?`).get(subscriptionId) as { user_id: string } | undefined;
  const event = conn
    .prepare(`SELECT metadata FROM subscription_events WHERE subscription_id = ? AND event_type = ? ORDER BY created_at DESC LIMIT 1`)
    .get(subscriptionId, SESSION_LINK_EVENT) as { metadata: string | null } | undefined;
  let meta: Record<string, unknown> = {};
  try {
    const parsed = event?.metadata ? JSON.parse(event.metadata) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) meta = parsed as Record<string, unknown>;
  } catch {
    meta = {};
  }
  return {
    sessionId: shortText(meta.sessionId, 128),
    businessName: shortText(meta.businessName, 200),
    contactMobile: shortText(meta.ownerMobile, 40),
    contactEmail: sub && EMAIL_ADDRESS.test(sub.user_id) ? sub.user_id : null,
  };
}

/**
 * Checkout hook: records which business a subscription was bought for, once. Returns 'exists' when a
 * link event is already there (replayed or already-active callbacks write nothing).
 */
export function linkSiteBotSession(params: {
  subscriptionId: string;
  sessionId: string;
  businessName?: string | null;
  ownerMobile?: string | null;
  now: Date;
}): 'linked' | 'exists' {
  const conn = db();
  return conn.transaction((): 'linked' | 'exists' => {
    const existing = conn
      .prepare(`SELECT 1 AS hit FROM subscription_events WHERE subscription_id = ? AND event_type = ? LIMIT 1`)
      .get(params.subscriptionId, SESSION_LINK_EVENT);
    if (existing) return 'exists';
    insertSubscriptionEvent(conn, {
      id: crypto.randomUUID(),
      subscription_id: params.subscriptionId,
      event_type: SESSION_LINK_EVENT,
      metadata: JSON.stringify({
        sessionId: params.sessionId,
        businessName: params.businessName ?? null,
        ownerMobile: params.ownerMobile ?? null,
      }),
      created_at: params.now.toISOString(),
    });
    return 'linked';
  }).immediate();
}

function getRow(id: string): ClientMessageRow | null {
  return (db().prepare(`SELECT * FROM site_bot_client_messages WHERE id = ?`).get(id) as ClientMessageRow | undefined) ?? null;
}

export function getClientMessage(id: string): ClientMessageRow | null {
  return typeof id === 'string' && UUID.test(id) ? getRow(id.toLowerCase()) : null;
}

/**
 * Stores a client message. `INSERT OR IGNORE`, then read back: the same id with the same
 * subscription and body returns the existing row (`created: false`); the same id with different
 * content throws `conflict`. `body` must already be normalized.
 */
export function createClientMessage(params: { id: string; subscriptionId: string; body: string; now: Date }): { row: ClientMessageRow; created: boolean } {
  if (typeof params.id !== 'string' || !UUID.test(params.id)) throw new ClientMessageError('invalid_input');
  const id = params.id.toLowerCase();
  const body = normalizeMessageBody(params.body);
  if (body !== params.body) throw new ClientMessageError('invalid_input');
  const identity = resolveClientIdentity(params.subscriptionId);
  const at = params.now.toISOString();
  const info = db()
    .prepare(
      `INSERT OR IGNORE INTO site_bot_client_messages
        (id, subscription_id, kind, body, meta_json, business_name, contact_email, contact_mobile, status, received_at, updated_at)
       VALUES (?, ?, 'client_message', ?, NULL, ?, ?, ?, 'received', ?, ?)`
    )
    .run(id, params.subscriptionId, body, identity.businessName, identity.contactEmail, identity.contactMobile, at, at);
  const row = getRow(id);
  if (!row || row.kind !== 'client_message' || row.subscription_id !== params.subscriptionId || row.body !== body) {
    throw new ClientMessageError('conflict');
  }
  return { row, created: info.changes === 1 };
}

/**
 * Cancel hook: one "cancel notice due" item per subscription (a second call writes nothing).
 * `siteOfflineAt` = effective date + 30 days (terms §8).
 */
export function createCancelNoticeItem(params: {
  subscriptionId: string;
  effectiveAt: string | null;
  cancelAtPeriodEnd: boolean;
  now: Date;
}): { row: ClientMessageRow; created: boolean } {
  const conn = db();
  return conn.transaction(() => {
    const existing = conn
      .prepare(`SELECT * FROM site_bot_client_messages WHERE subscription_id = ? AND kind = 'cancel_notice_due' LIMIT 1`)
      .get(params.subscriptionId) as ClientMessageRow | undefined;
    if (existing) return { row: existing, created: false };
    const effectiveMs = params.effectiveAt && Number.isFinite(Date.parse(params.effectiveAt)) ? Date.parse(params.effectiveAt) : params.now.getTime();
    const meta = {
      effectiveAt: new Date(effectiveMs).toISOString(),
      siteOfflineAt: new Date(effectiveMs + SITE_OFFLINE_AFTER_DAYS * DAY_MS).toISOString(),
      cancelAtPeriodEnd: params.cancelAtPeriodEnd,
    };
    const identity = resolveClientIdentity(params.subscriptionId);
    const id = crypto.randomUUID();
    const at = params.now.toISOString();
    conn
      .prepare(
        `INSERT INTO site_bot_client_messages
          (id, subscription_id, kind, body, meta_json, business_name, contact_email, contact_mobile, status, staff_category, received_at, updated_at)
         VALUES (?, ?, 'cancel_notice_due', '', ?, ?, ?, ?, 'received', 'cancel', ?, ?)`
      )
      .run(id, params.subscriptionId, JSON.stringify(meta), identity.businessName, identity.contactEmail, identity.contactMobile, at, at);
    return { row: getRow(id) as ClientMessageRow, created: true };
  }).immediate();
}

/** Newest first, open items (status != 'done') before done ones. */
export function listClientMessages({ limit = 500 }: { limit?: number } = {}): ClientMessageRow[] {
  const bounded = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 2000) : 500;
  return db()
    .prepare(`SELECT * FROM site_bot_client_messages ORDER BY (status = 'done') ASC, received_at DESC, id ASC LIMIT ?`)
    .all(bounded) as ClientMessageRow[];
}

export function isClientMessageStatus(value: unknown): value is ClientMessageStatus {
  return typeof value === 'string' && (CLIENT_MESSAGE_STATUSES as readonly string[]).includes(value);
}
export function isStaffCategory(value: unknown): value is StaffCategory {
  return typeof value === 'string' && (STAFF_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Staff update. Validates each given field (`staffCategory: null` clears it; `staffNote: ''` clears
 * it); throws `invalid_input` on a bad value; returns null for an unknown id.
 */
export function updateClientMessage(
  id: string,
  patch: { status?: unknown; staffCategory?: unknown; staffNote?: unknown },
  now: Date
): ClientMessageRow | null {
  if (typeof id !== 'string' || !UUID.test(id)) throw new ClientMessageError('invalid_input');
  const sets: string[] = [];
  const values: Array<string | null> = [];
  if (patch.status !== undefined) {
    if (!isClientMessageStatus(patch.status)) throw new ClientMessageError('invalid_input');
    sets.push('status = ?');
    values.push(patch.status);
  }
  if (patch.staffCategory !== undefined) {
    if (patch.staffCategory !== null && !isStaffCategory(patch.staffCategory)) throw new ClientMessageError('invalid_input');
    sets.push('staff_category = ?');
    values.push(patch.staffCategory as string | null);
  }
  if (patch.staffNote !== undefined) {
    if (typeof patch.staffNote !== 'string') throw new ClientMessageError('invalid_input');
    const note = patch.staffNote.replace(/\r\n/g, '\n').trim();
    if (note.length > STAFF_NOTE_MAX_CHARS || FORBIDDEN.test(note)) throw new ClientMessageError('invalid_input');
    sets.push('staff_note = ?');
    values.push(note || null);
  }
  if (!sets.length) throw new ClientMessageError('invalid_input');
  const key = id.toLowerCase();
  const info = db()
    .prepare(`UPDATE site_bot_client_messages SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`)
    .run(...values, now.toISOString(), key);
  return info.changes === 1 ? getRow(key) : null;
}

/** Client messages (not system items) for one subscription since `sinceIso` — the durable daily cap. */
export function countMessagesSince(subscriptionId: string, sinceIso: string): number {
  const row = db()
    .prepare(`SELECT COUNT(*) AS n FROM site_bot_client_messages WHERE subscription_id = ? AND kind = 'client_message' AND received_at >= ?`)
    .get(subscriptionId, sinceIso) as { n: number };
  return row.n;
}

/** Open items received at or before `cutoffIso` that were never reminded, or last reminded at or before it. */
export function listUnhandledOlderThan(cutoffIso: string): ClientMessageRow[] {
  return db()
    .prepare(
      `SELECT * FROM site_bot_client_messages
       WHERE status != 'done' AND received_at <= ? AND (reminded_at IS NULL OR reminded_at <= ?)
       ORDER BY received_at ASC`
    )
    .all(cutoffIso, cutoffIso) as ClientMessageRow[];
}

export function markReminded(ids: readonly string[], now: Date): void {
  const stmt = db().prepare(`UPDATE site_bot_client_messages SET reminded_at = ? WHERE id = ?`);
  const at = now.toISOString();
  db().transaction(() => { for (const id of ids) stmt.run(at, id); })();
}

export function markStaffAlerted(id: string, now: Date): void {
  db().prepare(`UPDATE site_bot_client_messages SET staff_alerted_at = ? WHERE id = ?`).run(now.toISOString(), id);
}

export function markClientConfirmed(id: string, now: Date): void {
  db().prepare(`UPDATE site_bot_client_messages SET client_confirmed_at = ? WHERE id = ?`).run(now.toISOString(), id);
}

/**
 * AI seam (readiness step 11: AI triage and drafts). Ships as a stub that returns null; the model is
 * not chosen here. Staff-set `staff_category` is the labelled data a later model is checked against.
 */
export async function triageClientMessage(row: ClientMessageRow): Promise<null> {
  void row;
  return null;
}
