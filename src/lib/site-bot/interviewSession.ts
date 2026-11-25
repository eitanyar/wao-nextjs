/**
 * Site Bot step 2a: the pre-payment interview session (docs/missions/site-bot-step2-interview-preview-2026-11-25.md).
 *
 * One row of site_bot_interview_sessions (launchStore.ts) per interview, created by POST /api/site-bot/interview-start
 * once the business holds a launch-cap spot. The session is bound to placeId + spot + auditId and is the key of
 * everything the owner does before payment: his saved progress, the research (research id = session id), the owner
 * research gates, the work-location answer and the checkout it later binds to.
 *
 * Capability = an httpOnly cookie `<sessionId>.<secret>` (SameSite=Lax, Secure in production, Path=/api/site-bot).
 * The store keeps only sha256(secret); a cookie is accepted only when its id exists and its secret hashes to the stored
 * value (constant-time compare). Anything malformed, unknown or tampered is "no session".
 *
 * Resume link (the 24-hour reminder): `/api/site-bot/interview-resume?t=v1.<sessionId>.<expiresMs>.<hmac>`, HMAC-SHA256
 * over the domain-separated payload with CLIENT_PORTAL_SECRET (dev fallback outside production, like gbpOauthState.ts).
 * The link expires with the spot. Redeeming it rotates the cookie secret (the session moves to that browser).
 *
 * Lifecycle: open -> exited (work-location exit: spot released, waiting list 'location') | expired (72 h without
 * payment: spot released) | paid (checkout callback) | superseded (a second browser started over before the owner gave
 * his contact; the spot passes to the new session). A released spot keeps its weekly-count row (releaseInterviewSpot).
 *
 * Every write runs in one IMMEDIATE transaction, so a replayed exit / expiry / reminder claim is a no-op.
 * Server-only. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import crypto from 'crypto';
import type { CollectedData } from '../bot/prompts';
import { addWaitlistEntry, releaseInterviewSpot, WAITLIST_RETENTION_MS, type LaunchStore, type WaitlistAdd } from './launchStore';
import { isWorkLocationTrade, type WorkLocation, type WorkLocationTrade } from './workLocation';

export const INTERVIEW_COOKIE_NAME = 'wao_sb_interview';
export const INTERVIEW_COOKIE_PATH = '/api/site-bot';
const HOUR_MS = 60 * 60 * 1000;
export const DEFAULT_SPOT_TTL_HOURS = 72;
export const REMINDER_AFTER_MS = 24 * HOUR_MS;
/** Saved progress is the browser's own step snapshot (resume only); bounded and never trusted for a decision. */
export const MAX_PROGRESS_BYTES = 48 * 1024;
export const MAX_COLLECTED_BYTES = 48 * 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SECRET = /^[A-Za-z0-9_-]{43}$/;

/** SITE_BOT_SPOT_TTL_HOURS -> ms. Unset / malformed -> 72 h; otherwise whole hours 1..720. */
export function parseSpotTtlMs(env: Record<string, string | undefined> = process.env): number {
  const value = env.SITE_BOT_SPOT_TTL_HOURS?.trim();
  if (!value || !/^[1-9][0-9]{0,2}$/.test(value) || Number(value) > 720) return DEFAULT_SPOT_TTL_HOURS * HOUR_MS;
  return Number(value) * HOUR_MS;
}

export type InterviewStatus = 'open' | 'exited' | 'expired' | 'paid' | 'superseded';

export interface InterviewSession {
  id: string;
  placeId: string;
  auditId: string;
  status: InterviewStatus;
  createdAt: string;
  expiresAt: string;
  closedAt: string | null;
  progress: unknown;
  collectedData: CollectedData | null;
  businessName: string | null;
  ownerEmail: string | null;
  contactAt: string | null;
  domainAt: string | null;
  locationTrade: WorkLocationTrade | null;
  workLocation: WorkLocation | null;
  researchId: string | null;
  researchStartedAt: string | null;
  reminderSentAt: string | null;
  checkoutSessionId: string | null;
}

/** Where the owner stands, derived on the server (the browser restores its own step snapshot inside 'intake'). */
export type InterviewPhase = 'intake' | 'domain' | 'location' | 'holding' | 'exited' | 'expired' | 'paid' | 'superseded';

export function interviewPhase(session: InterviewSession): InterviewPhase {
  if (session.status !== 'open') return session.status;
  if (!session.contactAt) return 'intake';
  if (!session.domainAt) return 'domain';
  if (session.locationTrade && !session.workLocation) return 'location';
  return 'holding';
}

/** Contact given, and the work-location question passed when it was asked: research may start, checkout may bind. */
export function interviewReadyForResearch(session: InterviewSession): boolean {
  return session.status === 'open' && Boolean(session.contactAt) && (!session.locationTrade || Boolean(session.workLocation));
}

function parseJson(text: unknown): unknown {
  if (typeof text !== 'string') return null;
  try { return JSON.parse(text); } catch { return null; }
}

function rowToSession(row: Record<string, unknown>): InterviewSession {
  const str = (key: string) => (typeof row[key] === 'string' ? row[key] as string : null);
  const trade = str('location_trade');
  return {
    id: String(row.id), placeId: String(row.place_id), auditId: String(row.audit_id), status: row.status as InterviewStatus,
    createdAt: String(row.created_at), expiresAt: String(row.expires_at), closedAt: str('closed_at'),
    progress: parseJson(row.progress_json), collectedData: parseJson(row.collected_json) as CollectedData | null,
    businessName: str('business_name'), ownerEmail: str('owner_email'), contactAt: str('contact_at'), domainAt: str('domain_at'),
    locationTrade: isWorkLocationTrade(trade) ? trade : null, workLocation: str('work_location') as WorkLocation | null,
    researchId: str('research_id'), researchStartedAt: str('research_started_at'), reminderSentAt: str('reminder_sent_at'),
    checkoutSessionId: str('checkout_session_id'),
  };
}

export function readInterviewSession(store: LaunchStore, id: string): InterviewSession | null {
  if (typeof id !== 'string' || !UUID.test(id)) return null;
  const row = store.db.prepare('SELECT * FROM site_bot_interview_sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToSession(row) : null;
}

export function openSessionForPlace(store: LaunchStore, placeId: string): InterviewSession | null {
  const row = store.db.prepare("SELECT * FROM site_bot_interview_sessions WHERE place_id = ? AND status = 'open'").get(placeId) as Record<string, unknown> | undefined;
  return row ? rowToSession(row) : null;
}

export function sessionForCheckout(store: LaunchStore, checkoutSessionId: string): InterviewSession | null {
  if (typeof checkoutSessionId !== 'string' || !UUID.test(checkoutSessionId.toLowerCase())) return null;
  const row = store.db.prepare('SELECT * FROM site_bot_interview_sessions WHERE checkout_session_id = ?').get(checkoutSessionId) as Record<string, unknown> | undefined;
  return row ? rowToSession(row) : null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Cookie capability

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function newSecret(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function equalHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

/** `<id>.<secret>` -> parts, or null for anything else (no throw). */
export function parseInterviewCookie(value: unknown): { id: string; secret: string } | null {
  if (typeof value !== 'string' || value.length !== 36 + 1 + 43) return null;
  const id = value.slice(0, 36);
  const secret = value.slice(37);
  if (value[36] !== '.' || !UUID.test(id) || !SECRET.test(secret)) return null;
  return { id, secret };
}

/** The session the cookie proves (any status), or null when it is missing, malformed, unknown or tampered. */
export function sessionFromCookie(store: LaunchStore, cookieValue: unknown): InterviewSession | null {
  const parsed = parseInterviewCookie(cookieValue);
  if (!parsed) return null;
  const row = store.db.prepare('SELECT * FROM site_bot_interview_sessions WHERE id = ?').get(parsed.id) as Record<string, unknown> | undefined;
  if (!row || typeof row.token_hash !== 'string' || !equalHex(sha256Hex(parsed.secret), row.token_hash)) return null;
  return rowToSession(row);
}

/** The value of a named cookie in a raw Cookie header (first occurrence), or undefined. */
export function cookieFromHeader(header: string | null | undefined, name: string = INTERVIEW_COOKIE_NAME): string | undefined {
  if (typeof header !== 'string' || header.length > 16 * 1024) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}

/** Set-Cookie for the session capability. maxAgeMs <= 0 clears it. */
export function interviewSetCookie(value: string, maxAgeMs: number, env: Record<string, string | undefined> = process.env): string {
  const maxAge = Math.max(0, Math.floor(maxAgeMs / 1000));
  return [
    `${INTERVIEW_COOKIE_NAME}=${maxAge > 0 ? value : ''}`,
    `Path=${INTERVIEW_COOKIE_PATH}`,
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(env.NODE_ENV === 'production' ? ['Secure'] : []),
  ].join('; ');
}

// ---------------------------------------------------------------------------------------------------------------------
// Resume link

function resumeSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = env.CLIENT_PORTAL_SECRET;
  if (secret) return secret;
  if (env.NODE_ENV === 'production') throw new Error('CLIENT_PORTAL_SECRET must be configured in production');
  return 'wao-dev-secret-change-in-production';
}

function resumeMac(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`site-bot-interview-resume\u0000${payload}`).digest('hex');
}

export function signResumeToken(sessionId: string, expiresAtMs: number, env: Record<string, string | undefined> = process.env): string {
  if (!UUID.test(sessionId) || !Number.isSafeInteger(expiresAtMs) || expiresAtMs <= 0) throw new Error('Invalid resume token input');
  const payload = `v1.${sessionId}.${expiresAtMs}`;
  return `${payload}.${resumeMac(payload, resumeSecret(env))}`;
}

/** The session id of an authentic, unexpired token, or null (forged, malformed, expired). */
export function verifyResumeToken(token: unknown, now: Date, env: Record<string, string | undefined> = process.env): string | null {
  if (typeof token !== 'string' || token.length > 200) return null;
  const match = /^v1\.([0-9a-f-]{36})\.([1-9][0-9]{0,15})\.([0-9a-f]{64})$/.exec(token);
  if (!match || !UUID.test(match[1])) return null;
  let secret: string;
  try { secret = resumeSecret(env); } catch { return null; }
  if (!equalHex(resumeMac(`v1.${match[1]}.${match[2]}`, secret), match[3])) return null;
  if (Number(match[2]) <= now.getTime()) return null;
  return match[1];
}

export function resumePath(token: string): string {
  return `/api/site-bot/interview-resume?${new URLSearchParams({ t: token }).toString()}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Lifecycle

function tx<T>(store: LaunchStore, fn: () => T): T {
  return store.db.transaction(fn).immediate();
}

function closeSession(store: LaunchStore, session: InterviewSession, status: 'exited' | 'expired'): void {
  const now = store.now().toISOString();
  store.db.prepare("UPDATE site_bot_interview_sessions SET status = ?, closed_at = ? WHERE id = ? AND status = 'open'").run(status, now, session.id);
  releaseInterviewSpot(store, session.placeId, session.id);
}

/** Lazy + cron expiry: every open session past its expiry is closed and its spot released. Returns how many. */
export function expireDueSessions(store: LaunchStore): number {
  return tx(store, () => {
    const now = store.now().toISOString();
    const due = (store.db.prepare("SELECT * FROM site_bot_interview_sessions WHERE status = 'open' AND expires_at <= ?").all(now) as Array<Record<string, unknown>>).map(rowToSession);
    for (const session of due) closeSession(store, session, 'expired');
    return due.length;
  });
}

export type BeginResult =
  | { kind: 'created'; session: InterviewSession; cookie: string }
  | { kind: 'resumed'; session: InterviewSession }
  | { kind: 'elsewhere' };

/**
 * Called by interview-start AFTER the spot claim succeeded ('reserved' or 'already'). The caller's own open session for
 * this place resumes; otherwise a new session takes the spot. Another browser's open session is superseded only while
 * its owner has not given his contact (nothing paid for yet, no email to resume from); after that the second browser
 * is refused ('elsewhere') and the owner resumes from his reminder link.
 */
export function beginInterviewSession(
  store: LaunchStore,
  input: { placeId: string; auditId: string; cookieValue: unknown; ttlMs: number },
): BeginResult {
  return tx(store, (): BeginResult => {
    const own = sessionFromCookie(store, input.cookieValue);
    if (own && own.status === 'open' && own.placeId === input.placeId) return { kind: 'resumed', session: own };
    const other = openSessionForPlace(store, input.placeId);
    if (other) {
      if (other.contactAt) return { kind: 'elsewhere' };
      store.db.prepare("UPDATE site_bot_interview_sessions SET status = 'superseded', closed_at = ? WHERE id = ? AND status = 'open'")
        .run(store.now().toISOString(), other.id);
    }
    const id = crypto.randomUUID();
    const secret = newSecret();
    const now = store.now();
    store.db.prepare(`INSERT INTO site_bot_interview_sessions (id, token_hash, place_id, audit_id, status, created_at, expires_at)
      VALUES (?, ?, ?, ?, 'open', ?, ?)`).run(id, sha256Hex(secret), input.placeId, input.auditId, now.toISOString(),
      new Date(now.getTime() + input.ttlMs).toISOString());
    return { kind: 'created', session: readInterviewSession(store, id)!, cookie: `${id}.${secret}` };
  });
}

/** A new secret for the session (resume-link redemption): the old cookie stops working. Null unless open. */
export function rotateInterviewCookie(store: LaunchStore, sessionId: string): string | null {
  return tx(store, () => {
    const secret = newSecret();
    const changed = store.db.prepare("UPDATE site_bot_interview_sessions SET token_hash = ? WHERE id = ? AND status = 'open'").run(sha256Hex(secret), sessionId).changes;
    return changed ? `${sessionId}.${secret}` : null;
  });
}

function boundedJson(value: unknown, max: number): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  let text: string;
  try { text = JSON.stringify(value); } catch { return null; }
  return Buffer.byteLength(text, 'utf8') <= max ? text : null;
}

/** Saves the browser's step snapshot (open sessions in the intake phase only). False when refused. */
export function saveInterviewProgress(store: LaunchStore, sessionId: string, progress: unknown): boolean {
  const text = boundedJson(progress, MAX_PROGRESS_BYTES);
  if (text === null) return false;
  return store.db.prepare("UPDATE site_bot_interview_sessions SET progress_json = ? WHERE id = ? AND status = 'open' AND contact_at IS NULL")
    .run(text, sessionId).changes > 0;
}

/** The contact step: server-validated collected data (with ownerContact), the trade the location question asks. */
export function recordInterviewContact(
  store: LaunchStore,
  sessionId: string,
  input: { collectedData: CollectedData; ownerEmail: string; businessName: string | null; locationTrade: WorkLocationTrade | null },
): InterviewSession | null {
  const text = boundedJson(input.collectedData, MAX_COLLECTED_BYTES);
  if (text === null) return null;
  return tx(store, () => {
    const changed = store.db.prepare(`UPDATE site_bot_interview_sessions SET collected_json = ?, owner_email = ?, business_name = ?,
      location_trade = ?, contact_at = COALESCE(contact_at, ?) WHERE id = ? AND status = 'open' AND domain_at IS NULL`)
      .run(text, input.ownerEmail, input.businessName, input.locationTrade, store.now().toISOString(), sessionId).changes;
    return changed ? readInterviewSession(store, sessionId) : null;
  });
}

/** The domain step: the collected data with the domain answer merged (after the contact step only). */
export function recordInterviewDomain(store: LaunchStore, sessionId: string, collectedData: CollectedData): InterviewSession | null {
  const text = boundedJson(collectedData, MAX_COLLECTED_BYTES);
  if (text === null) return null;
  return tx(store, () => {
    const changed = store.db.prepare(`UPDATE site_bot_interview_sessions SET collected_json = ?, domain_at = COALESCE(domain_at, ?)
      WHERE id = ? AND status = 'open' AND contact_at IS NOT NULL AND work_location IS NULL`).run(text, store.now().toISOString(), sessionId).changes;
    return changed ? readInterviewSession(store, sessionId) : null;
  });
}

/** Replaces the stored collected data (an owner research-gate answer applied on the server). Open sessions only. */
export function updateInterviewCollectedData(store: LaunchStore, sessionId: string, collectedData: CollectedData): boolean {
  const text = boundedJson(collectedData, MAX_COLLECTED_BYTES);
  if (text === null) return false;
  return store.db.prepare("UPDATE site_bot_interview_sessions SET collected_json = ? WHERE id = ? AND status = 'open'").run(text, sessionId).changes > 0;
}

export type LocationRecord =
  | { kind: 'continued'; session: InterviewSession }
  | { kind: 'exited'; session: InterviewSession; waitlist: WaitlistAdd | null; replay: boolean }
  | { kind: 'refused' };

/**
 * The work-location answer (already validated against the session's trade by the caller). A continuing answer is stored;
 * an exiting one stores it, closes the session, releases the spot and adds the owner to the waiting list (reason
 * 'location', his contact from the session) in ONE transaction. A replayed exit returns the exited session, no second
 * entry. The weekly count keeps the start; the total cap counts paid sign-ups only, so it never counted this one.
 */
export function recordInterviewLocation(
  store: LaunchStore,
  sessionId: string,
  answer: WorkLocation,
  exits: boolean,
  waitlist: { category: string | null; name: string; phone: string },
  retentionMs: number = WAITLIST_RETENTION_MS,
): LocationRecord {
  return tx(store, (): LocationRecord => {
    const session = readInterviewSession(store, sessionId);
    if (!session) return { kind: 'refused' };
    if (session.status === 'exited') return { kind: 'exited', session, waitlist: null, replay: true };
    if (session.status !== 'open' || !session.locationTrade || !session.domainAt || session.workLocation) return { kind: 'refused' };
    store.db.prepare("UPDATE site_bot_interview_sessions SET work_location = ? WHERE id = ? AND status = 'open'").run(answer, sessionId);
    if (!exits) return { kind: 'continued', session: readInterviewSession(store, sessionId)! };
    closeSession(store, session, 'exited');
    const added = addWaitlistEntry(store, {
      reason: 'location', auditId: session.auditId, placeId: session.placeId,
      businessName: (session.businessName ?? '').slice(0, 200), category: waitlist.category,
      name: waitlist.name.slice(0, 120), phone: waitlist.phone, email: session.ownerEmail,
    }, retentionMs);
    // A failed waiting-list insert must not leave the owner half-exited: roll the whole exit back.
    if (added.status === 'unavailable') throw new Error('waitlist insert failed');
    return { kind: 'exited', session: readInterviewSession(store, sessionId)!, waitlist: added, replay: false };
  });
}

/** Claims the session's one research run (research id = session id). True for the one caller that claimed it. */
export function claimInterviewResearch(store: LaunchStore, sessionId: string): boolean {
  return store.db.prepare(`UPDATE site_bot_interview_sessions SET research_id = id, research_started_at = ?
    WHERE id = ? AND status = 'open' AND research_id IS NULL`).run(store.now().toISOString(), sessionId).changes > 0;
}

/** checkout/init: the latest checkout session minted for this interview (open sessions only). */
export function bindInterviewCheckout(store: LaunchStore, sessionId: string, checkoutSessionId: string): boolean {
  return store.db.prepare("UPDATE site_bot_interview_sessions SET checkout_session_id = ? WHERE id = ? AND status = 'open'")
    .run(checkoutSessionId, sessionId).changes > 0;
}

/** checkout/callback after the charge: the interview is paid (no expiry, no reminder). Idempotent. */
export function markInterviewPaid(store: LaunchStore, sessionId: string): boolean {
  return store.db.prepare("UPDATE site_bot_interview_sessions SET status = 'paid', closed_at = COALESCE(closed_at, ?) WHERE id = ? AND status IN ('open', 'paid')")
    .run(store.now().toISOString(), sessionId).changes > 0;
}

/** Open sessions 24 h or more after their start, not reminded yet, with an owner email, not expired. */
export function dueInterviewReminders(store: LaunchStore): InterviewSession[] {
  const now = store.now();
  const cutoff = new Date(now.getTime() - REMINDER_AFTER_MS).toISOString();
  return (store.db.prepare(`SELECT * FROM site_bot_interview_sessions WHERE status = 'open' AND reminder_sent_at IS NULL
    AND owner_email IS NOT NULL AND created_at <= ? AND expires_at > ? ORDER BY created_at`).all(cutoff, now.toISOString()) as Array<Record<string, unknown>>)
    .map(rowToSession);
}

/** Claims the one reminder of a session (true once). releaseInterviewReminder undoes a claim whose send failed. */
export function claimInterviewReminder(store: LaunchStore, sessionId: string): boolean {
  return store.db.prepare("UPDATE site_bot_interview_sessions SET reminder_sent_at = ? WHERE id = ? AND status = 'open' AND reminder_sent_at IS NULL")
    .run(store.now().toISOString(), sessionId).changes > 0;
}

export function releaseInterviewReminder(store: LaunchStore, sessionId: string): void {
  store.db.prepare('UPDATE site_bot_interview_sessions SET reminder_sent_at = NULL WHERE id = ?').run(sessionId);
}
