/**
 * Site Bot ads-first launch, build step 1: the server-side source of truth for the launch cap and the waiting list.
 *
 * One SQLite file (better-sqlite3, WAL), so concurrent requests and processes serialise on BEGIN IMMEDIATE:
 *   - site_bot_launch_events: one row per interview start (ref = placeId, so one business holds one spot however many
 *     times it re-runs the check) and per paid sign-up (ref = checkout sessionId). Rows are never purged: they ARE the cap.
 *   - site_bot_waitlist: the waiting-list entries (name, phone, optional email, plus the audit context the server
 *     derived). Purged after SITE_BOT_WAITLIST_RETENTION_DAYS days (default 90, parseWaitlistRetentionMs). The cap rows
 *     above are never purged.
 *
 *   - site_bot_interview_sessions: step 2a, the pre-payment interview session (interviewSession.ts owns the logic; the
 *     table lives here so one file holds the launch state). A released spot (location exit, 72 h expiry) keeps its
 *     interview_start row for the weekly count: the row's ref is renamed to 'released:<sessionId>' (place_id keeps the
 *     place, released_at the time), so the place no longer holds a spot and a later start claims a fresh one.
 *
 * The cap is full when paid sign-ups >= SITE_BOT_CAP_TOTAL (default 10), or interview starts in the current week >=
 * SITE_BOT_CAP_WEEKLY (default 3). The week is the ISRAELI week: Sunday 00:00 to Saturday 23:59, Asia/Jerusalem time
 * (israelWeekKey; not the Monday-based ISO week).
 *
 * Location: SITE_BOT_LAUNCH_DB_PATH (absolute), else <cwd>/data/site-bot-launch/launch.sqlite. In production the
 * release's data/ is the symlink to /home/wao/wao-runtime-data (deploy.sh), the same place auditStore keeps
 * data/audits, so the file survives deploys. Never under data/clients.
 *
 * Every function fails closed: an unreadable store reports 'unavailable', which callers treat as "no spot".
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';

export interface LaunchCapLimits {
  total: number;
  weekly: number;
}

export interface LaunchStore {
  readonly db: Database.Database;
  readonly now: () => Date;
}

export const DEFAULT_CAP_LIMITS: LaunchCapLimits = { total: 10, weekly: 3 };
export const DEFAULT_WAITLIST_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
export const WAITLIST_RETENTION_MS = DEFAULT_WAITLIST_RETENTION_DAYS * DAY_MS;
const BUSY_TIMEOUT_MS = 5000;

const CREATE_EVENTS = `CREATE TABLE IF NOT EXISTS site_bot_launch_events (
  kind TEXT NOT NULL CHECK (kind IN ('interview_start', 'paid_signup')),
  ref TEXT NOT NULL CHECK (length(ref) BETWEEN 1 AND 256),
  week TEXT NOT NULL,
  at TEXT NOT NULL,
  audit_id TEXT,
  PRIMARY KEY (kind, ref)
)`;
const CREATE_WAITLIST = `CREATE TABLE IF NOT EXISTS site_bot_waitlist (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('preopen', 'full', 'trade', 'location')),
  audit_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  category TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  UNIQUE (place_id, phone)
)`;

const CREATE_SESSIONS = `CREATE TABLE IF NOT EXISTS site_bot_interview_sessions (
  id TEXT PRIMARY KEY CHECK (length(id) = 36),
  token_hash TEXT NOT NULL CHECK (length(token_hash) = 64),
  place_id TEXT NOT NULL CHECK (length(place_id) BETWEEN 1 AND 256),
  audit_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'exited', 'expired', 'paid', 'superseded')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  closed_at TEXT,
  progress_json TEXT,
  collected_json TEXT,
  business_name TEXT,
  owner_email TEXT,
  contact_at TEXT,
  domain_at TEXT,
  location_trade TEXT CHECK (location_trade IS NULL OR location_trade IN ('tutor', 'photographer', 'solar')),
  work_location TEXT CHECK (work_location IS NULL OR work_location IN ('HOME', 'OWN_PLACE', 'ONLINE', 'MIX')),
  research_id TEXT,
  research_started_at TEXT,
  reminder_sent_at TEXT,
  checkout_session_id TEXT,
  research_done_at TEXT,
  interview_json TEXT,
  interview_done_at TEXT,
  answers_version INTEGER NOT NULL DEFAULT 0,
  gates_done_at TEXT,
  facts_extracted_version INTEGER NOT NULL DEFAULT 0,
  facts_claimed_at TEXT,
  facts_returns INTEGER NOT NULL DEFAULT 0,
  facts_confirmed_at TEXT,
  preview_round INTEGER NOT NULL DEFAULT 0,
  preview_attempts INTEGER NOT NULL DEFAULT 0,
  preview_status TEXT CHECK (preview_status IS NULL OR preview_status IN ('generating', 'ready', 'failed')),
  preview_claimed_at TEXT,
  preview_round_started_at TEXT,
  preview_ready_at TEXT,
  preview_failed_at TEXT,
  preview_fix_at TEXT,
  preview_emailed_round INTEGER NOT NULL DEFAULT 0,
  preview_polled_at TEXT,
  site_generation_claimed_at TEXT
)`;

/** Step 2b (2026-11-25): the interview v1 + facts columns, added to a step-2a store by migrate() (name -> column DDL). */
const STEP2B_SESSION_COLUMNS: ReadonlyArray<[string, string]> = [
  ['research_done_at', 'research_done_at TEXT'],
  ['interview_json', 'interview_json TEXT'],
  ['interview_done_at', 'interview_done_at TEXT'],
  ['answers_version', 'answers_version INTEGER NOT NULL DEFAULT 0'],
  ['gates_done_at', 'gates_done_at TEXT'],
  ['facts_extracted_version', 'facts_extracted_version INTEGER NOT NULL DEFAULT 0'],
  ['facts_claimed_at', 'facts_claimed_at TEXT'],
  ['facts_returns', 'facts_returns INTEGER NOT NULL DEFAULT 0'],
  ['facts_confirmed_at', 'facts_confirmed_at TEXT'],
];
/** Step 2c (2026-11-25): the home-page preview + post-pay site generation columns, added by migrate() (name -> DDL). */
const STEP2C_SESSION_COLUMNS: ReadonlyArray<[string, string]> = [
  ['preview_round', 'preview_round INTEGER NOT NULL DEFAULT 0'],
  ['preview_attempts', 'preview_attempts INTEGER NOT NULL DEFAULT 0'],
  ['preview_status', "preview_status TEXT CHECK (preview_status IS NULL OR preview_status IN ('generating', 'ready', 'failed'))"],
  ['preview_claimed_at', 'preview_claimed_at TEXT'],
  ['preview_round_started_at', 'preview_round_started_at TEXT'],
  ['preview_ready_at', 'preview_ready_at TEXT'],
  ['preview_failed_at', 'preview_failed_at TEXT'],
  ['preview_fix_at', 'preview_fix_at TEXT'],
  ['preview_emailed_round', 'preview_emailed_round INTEGER NOT NULL DEFAULT 0'],
  ['preview_polled_at', 'preview_polled_at TEXT'],
  ['site_generation_claimed_at', 'site_generation_claimed_at TEXT'],
];
const CREATE_SESSION_INDEXES = [
  // One open session per business: the spot is per placeId.
  "CREATE UNIQUE INDEX IF NOT EXISTS site_bot_interview_sessions_open_place ON site_bot_interview_sessions (place_id) WHERE status = 'open'",
  'CREATE INDEX IF NOT EXISTS site_bot_interview_sessions_checkout ON site_bot_interview_sessions (checkout_session_id)',
];

/**
 * Additive migrations of a store created by step 1 (idempotent; every open runs them):
 *   - site_bot_launch_events gains place_id / released_at (the released-spot rows).
 *   - site_bot_waitlist's reason CHECK gains 'location' (SQLite cannot alter a CHECK: the table is rebuilt, rows kept).
 *   - step 2b: site_bot_interview_sessions gains the interview v1 + facts columns (STEP2B_SESSION_COLUMNS).
 *   - step 2c: and the home-page preview + post-pay generation columns (STEP2C_SESSION_COLUMNS).
 */
function migrate(db: Database.Database): void {
  const sessionColumns = new Set((db.prepare('PRAGMA table_info(site_bot_interview_sessions)').all() as Array<{ name: string }>).map(column => column.name));
  if (sessionColumns.size > 0) {
    for (const [name, ddl] of [...STEP2B_SESSION_COLUMNS, ...STEP2C_SESSION_COLUMNS]) if (!sessionColumns.has(name)) db.exec(`ALTER TABLE site_bot_interview_sessions ADD COLUMN ${ddl}`);
  }
  const eventColumns = new Set((db.prepare('PRAGMA table_info(site_bot_launch_events)').all() as Array<{ name: string }>).map(column => column.name));
  if (!eventColumns.has('place_id')) db.exec('ALTER TABLE site_bot_launch_events ADD COLUMN place_id TEXT');
  if (!eventColumns.has('released_at')) db.exec('ALTER TABLE site_bot_launch_events ADD COLUMN released_at TEXT');
  const waitlist = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'site_bot_waitlist'").get() as { sql: string } | undefined;
  if (waitlist && !waitlist.sql.includes("'location'")) {
    db.transaction(() => {
      db.exec('ALTER TABLE site_bot_waitlist RENAME TO site_bot_waitlist_step1');
      db.exec(CREATE_WAITLIST);
      db.exec(`INSERT INTO site_bot_waitlist (id, created_at, reason, audit_id, place_id, business_name, category, name, phone, email)
        SELECT id, created_at, reason, audit_id, place_id, business_name, category, name, phone, email FROM site_bot_waitlist_step1`);
      db.exec('DROP TABLE site_bot_waitlist_step1');
    }).immediate();
  }
}

/** Strict operator input: unset -> the default; set but not a positive integer -> null (callers fail closed). */
export function parseLaunchCapLimits(env: Record<string, string | undefined> = process.env): LaunchCapLimits | null {
  const read = (value: string | undefined, fallback: number): number | null => {
    if (value === undefined || value === '') return fallback;
    if (!/^[1-9][0-9]{0,5}$/.test(value)) return null;
    return Number(value);
  };
  const total = read(env.SITE_BOT_CAP_TOTAL, DEFAULT_CAP_LIMITS.total);
  const weekly = read(env.SITE_BOT_CAP_WEEKLY, DEFAULT_CAP_LIMITS.weekly);
  return total === null || weekly === null ? null : { total, weekly };
}

/**
 * SITE_BOT_WAITLIST_RETENTION_DAYS -> ms. Unset, empty or malformed -> the 90-day default (a typo never purges early or
 * keeps contacts forever); otherwise a whole number of days, 1 to 3650.
 */
export function parseWaitlistRetentionMs(env: Record<string, string | undefined> = process.env): number {
  const value = env.SITE_BOT_WAITLIST_RETENTION_DAYS?.trim();
  if (!value || !/^[1-9][0-9]{0,3}$/.test(value) || Number(value) > 3650) return WAITLIST_RETENTION_MS;
  return Number(value) * DAY_MS;
}

export function launchDbPath(env: Record<string, string | undefined> = process.env): string {
  const configured = env.SITE_BOT_LAUNCH_DB_PATH?.trim();
  if (configured) return configured;
  return path.join(process.cwd(), 'data', 'site-bot-launch', 'launch.sqlite');
}

export function openLaunchStore(dbPath: string, now: () => Date = () => new Date()): LaunchStore {
  if (typeof dbPath !== 'string' || !path.isAbsolute(dbPath) || path.normalize(dbPath) !== dbPath ||
      !dbPath.endsWith('.sqlite') || dbPath.split(path.sep).join('/').includes('/data/clients/')) {
    throw new Error('Invalid launch store path');
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath, { timeout: BUSY_TIMEOUT_MS });
  try {
    db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
    db.pragma('journal_mode = WAL');
    db.exec(CREATE_EVENTS);
    db.exec(CREATE_WAITLIST);
    db.exec(CREATE_SESSIONS);
    for (const sql of CREATE_SESSION_INDEXES) db.exec(sql);
    migrate(db);
    return { db, now };
  } catch (error) {
    db.close();
    throw error;
  }
}

export function closeLaunchStore(store: LaunchStore): void {
  store.db.close();
}

/** Opens the configured store, runs `fn`, closes it. Any failure (open or inside fn) returns `fallback`. */
export function withLaunchStore<T>(fn: (store: LaunchStore) => T, fallback: T, env: Record<string, string | undefined> = process.env): T {
  let store: LaunchStore | null = null;
  try {
    store = openLaunchStore(launchDbPath(env));
    return fn(store);
  } catch {
    return fallback;
  } finally {
    try { store?.db.close(); } catch { /* already closed */ }
  }
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The Sunday (YYYY-MM-DD, Israel calendar) that starts the Israeli week containing `date`. */
export function israelWeekKey(date: Date): string {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error('Invalid date');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date).map(part => [part.type, part.value]));
  const dow = WEEKDAYS.indexOf(parts.weekday);
  if (dow < 0) throw new Error('Invalid weekday');
  const sunday = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) - dow));
  return sunday.toISOString().slice(0, 10);
}

export interface CapSnapshot {
  week: string;
  paidTotal: number;
  weekStarts: number;
  full: boolean;
}

function countRow(store: LaunchStore, sql: string, ...args: unknown[]): number {
  const row = store.db.prepare(sql).get(...args) as { n: number } | undefined;
  const n = row?.n ?? 0;
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Bad count');
  return n;
}

function snapshot(store: LaunchStore, limits: LaunchCapLimits): CapSnapshot {
  const week = israelWeekKey(store.now());
  const paidTotal = countRow(store, "SELECT COUNT(*) AS n FROM site_bot_launch_events WHERE kind = 'paid_signup'");
  const weekStarts = countRow(store, "SELECT COUNT(*) AS n FROM site_bot_launch_events WHERE kind = 'interview_start' AND week = ?", week);
  return { week, paidTotal, weekStarts, full: paidTotal >= limits.total || weekStarts >= limits.weekly };
}

export function capSnapshot(store: LaunchStore, limits: LaunchCapLimits): CapSnapshot {
  return snapshot(store, limits);
}

/** True when this business (placeId) already holds an interview spot. */
export function hasInterviewSpot(store: LaunchStore, placeId: string): boolean {
  return countRow(store, "SELECT COUNT(*) AS n FROM site_bot_launch_events WHERE kind = 'interview_start' AND ref = ?", placeId) > 0;
}

/** Read-only: the business holds a spot, or one is free now. Never claims anything. */
export function interviewSpotAvailable(store: LaunchStore, placeId: string, limits: LaunchCapLimits): boolean {
  return hasInterviewSpot(store, placeId) || !snapshot(store, limits).full;
}

export type InterviewReservation = { status: 'reserved' | 'already' | 'full' | 'unavailable' };

/**
 * Claims an interview spot for this business in one IMMEDIATE transaction (concurrent callers serialise; the count and
 * the insert see the same state). 'already' = the business held one before (never counted twice, kept after the cap fills).
 */
export function reserveInterviewStart(store: LaunchStore, placeId: string, auditId: string, limits: LaunchCapLimits): InterviewReservation {
  if (typeof placeId !== 'string' || !placeId || placeId.length > 256) return { status: 'unavailable' };
  try {
    return store.db.transaction((): InterviewReservation => {
      if (hasInterviewSpot(store, placeId)) return { status: 'already' };
      const cap = snapshot(store, limits);
      if (cap.full) return { status: 'full' };
      store.db.prepare("INSERT INTO site_bot_launch_events (kind, ref, week, at, audit_id) VALUES ('interview_start', ?, ?, ?, ?)")
        .run(placeId, cap.week, store.now().toISOString(), auditId);
      return { status: 'reserved' };
    }).immediate();
  } catch {
    return { status: 'unavailable' };
  }
}

/**
 * Releases the spot a business holds (step 2a: location exit, 72 h expiry), keeping its interview_start row for the
 * weekly count: ref -> 'released:<sessionId>', place_id = the place, released_at = now. Returns true when a held spot
 * was released, false when the place held none (already released: a replay is a no-op). Call inside the caller's
 * transaction when it must be atomic with a session change.
 */
export function releaseInterviewSpot(store: LaunchStore, placeId: string, sessionId: string): boolean {
  return store.db.prepare(`UPDATE site_bot_launch_events SET ref = ?, place_id = ref, released_at = ?
    WHERE kind = 'interview_start' AND ref = ?`).run(`released:${sessionId}`, store.now().toISOString(), placeId).changes > 0;
}

export type PaidSignupRecord = { status: 'recorded' | 'already' | 'unavailable' };

/** One row per checkout session; a replayed callback is 'already' and never counts twice. */
export function recordPaidSignup(store: LaunchStore, sessionId: string): PaidSignupRecord {
  if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 256) return { status: 'unavailable' };
  try {
    return store.db.transaction((): PaidSignupRecord => {
      // Explicit existence check + plain INSERT: INSERT OR IGNORE would also swallow a CHECK violation as "already".
      if (countRow(store, "SELECT COUNT(*) AS n FROM site_bot_launch_events WHERE kind = 'paid_signup' AND ref = ?", sessionId) > 0) {
        return { status: 'already' };
      }
      const now = store.now();
      store.db.prepare("INSERT INTO site_bot_launch_events (kind, ref, week, at) VALUES ('paid_signup', ?, ?, ?)")
        .run(sessionId, israelWeekKey(now), now.toISOString());
      return { status: 'recorded' };
    }).immediate();
  } catch {
    return { status: 'unavailable' };
  }
}

export interface WaitlistEntryInput {
  reason: 'preopen' | 'full' | 'trade' | 'location';
  auditId: string;
  placeId: string;
  businessName: string;
  category: string | null;
  name: string;
  phone: string;
  email: string | null;
}

export interface WaitlistEntry extends WaitlistEntryInput {
  id: string;
  createdAt: string;
}

export type WaitlistAdd = { status: 'added'; entry: WaitlistEntry } | { status: 'duplicate' } | { status: 'unavailable' };

/** Purges expired entries, then adds one. The same phone for the same business is a 'duplicate' (no second alert). */
export function addWaitlistEntry(store: LaunchStore, input: WaitlistEntryInput, retentionMs: number = WAITLIST_RETENTION_MS): WaitlistAdd {
  try {
    return store.db.transaction((): WaitlistAdd => {
      purgeExpiredWaitlist(store, retentionMs);
      // Explicit duplicate check + plain INSERT: INSERT OR IGNORE would also swallow a CHECK violation as "duplicate".
      if (countRow(store, 'SELECT COUNT(*) AS n FROM site_bot_waitlist WHERE place_id = ? AND phone = ?', input.placeId, input.phone) > 0) {
        return { status: 'duplicate' };
      }
      const entry: WaitlistEntry = { ...input, id: crypto.randomUUID(), createdAt: store.now().toISOString() };
      store.db.prepare(`INSERT INTO site_bot_waitlist
        (id, created_at, reason, audit_id, place_id, business_name, category, name, phone, email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(entry.id, entry.createdAt, entry.reason, entry.auditId, entry.placeId,
        entry.businessName, entry.category, entry.name, entry.phone, entry.email);
      return { status: 'added', entry };
    }).immediate();
  } catch {
    return { status: 'unavailable' };
  }
}

/** Deletes entries older than the retention window; returns how many. */
export function purgeExpiredWaitlist(store: LaunchStore, retentionMs: number = WAITLIST_RETENTION_MS): number {
  const cutoff = new Date(store.now().getTime() - retentionMs).toISOString();
  return store.db.prepare('DELETE FROM site_bot_waitlist WHERE created_at <= ?').run(cutoff).changes;
}

export function listWaitlist(store: LaunchStore): WaitlistEntry[] {
  const rows = store.db.prepare('SELECT * FROM site_bot_waitlist ORDER BY created_at, rowid').all() as Array<Record<string, string | null>>;
  return rows.map(row => ({
    id: String(row.id), createdAt: String(row.created_at), reason: row.reason as WaitlistEntry['reason'],
    auditId: String(row.audit_id), placeId: String(row.place_id), businessName: String(row.business_name),
    category: row.category, name: String(row.name), phone: String(row.phone), email: row.email,
  }));
}
