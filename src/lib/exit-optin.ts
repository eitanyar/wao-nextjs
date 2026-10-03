import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import copy from '../content/exit-optin-copy.json';
import { sendResendTransactionalEmail, type ResendTransactionalEmailInput } from './notifications/resend-transactional';

export const COOKIE_NAME = 'wao_exit_optin_session';
export const SENDER = 'WAO Leads <leads@wao.co.il>';
const NICHES = ['clinic', 'lawyer', 'ecommerce', 'other'] as const;
type Niche = typeof NICHES[number];
type Mailer = (input: ResendTransactionalEmailInput) => Promise<{ messageId: string }>;
export type OptinStore = { db: Database.Database; now: () => Date };

export function enabled(flags: { feature?: string; send?: string; dbPath?: string }): boolean {
  return flags.feature === 'true' && flags.send === 'true' && Boolean(flags.dbPath);
}

export function openOptinStore(dbPath: string, now: () => Date = () => new Date()): OptinStore {
  if (!path.isAbsolute(dbPath) || dbPath === ':memory:') throw new Error('explicit_external_db_required');
  const repo = fs.realpathSync(process.cwd());
  const parent = fs.realpathSync(path.dirname(dbPath));
  const resolved = path.join(parent, path.basename(dbPath));
  const actual = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
  if ([resolved, actual].some(p => p === repo || p.startsWith(repo + path.sep) || p.includes(`${path.sep}data${path.sep}clients${path.sep}`))) throw new Error('external_db_required');
  const db = new Database(resolved);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.exec(`CREATE TABLE IF NOT EXISTS exit_optins (
      email TEXT PRIMARY KEY, niche TEXT NOT NULL, consent_at TEXT NOT NULL,
      source_path TEXT NOT NULL, variant_id TEXT NOT NULL,
      session_hash TEXT NOT NULL UNIQUE, unsubscribe_hash TEXT NOT NULL UNIQUE,
      unsubscribed_at TEXT, delivery_state TEXT NOT NULL CHECK(delivery_state IN ('pending','delivered','failed')),
      delivered_at TEXT
    ); CREATE INDEX IF NOT EXISTS exit_optins_session ON exit_optins(session_hash);
    CREATE INDEX IF NOT EXISTS exit_optins_unsubscribe ON exit_optins(unsubscribe_hash);`);
    return { db, now };
  } catch (error) { db.close(); throw error; }
}

const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');
const tokenValid = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

export function validateSubmission(body: unknown): { email: string; niche: Niche; source: string } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const data = body as Record<string, unknown>;
  if (Object.keys(data).sort().join(',') !== 'consent,email,niche,source') return null;
  if (data.consent !== true || typeof data.email !== 'string' || data.email.length > 254 ||
      typeof data.niche !== 'string' || !NICHES.includes(data.niche as Niche) ||
      typeof data.source !== 'string' || data.source.length > 160) return null;
  const email = data.email.trim().toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email.length > 254) return null;
  const source = data.source;
  if (!/^\/(seo|google-ads|site-bot|consulting|google-business)(\/[^?#]*)?$/.test(source) || source.includes('//')) return null;
  return { email, niche: data.niche as Niche, source };
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  return !!origin && origin === new URL(request.url).origin && (!fetchSite || fetchSite === 'same-origin');
}

export function composeCheckup(niche: Niche, unsubscribeUrl: string): ResendTransactionalEmailInput & { from: string } {
  const findings = copy[`optin.email.findings.${niche}`];
  const next = copy[`optin.email.nextStep.${niche}`];
  return {
    to: '', from: SENDER, subject: copy['optin.email.subject'],
    text: [copy['optin.email.greeting'], findings, next, copy['optin.email.softCta'], copy['optin.email.senderNote'], unsubscribeUrl].join('\n\n'),
  };
}

/** Reserve once under SQLite's immediate write lock. No retry can send twice or bypass suppression. */
export async function submitOptin(store: OptinStore, body: unknown, origin: string, send: Mailer): Promise<{ delivered: boolean; session?: string }> {
  const input = validateSubmission(body);
  if (!input || !/^https?:\/\/[^/]+$/.test(origin)) return { delivered: false };
  const session = token();
  const unsubscribe = token();
  const reserved = store.db.transaction(() => {
    const result = store.db.prepare(`INSERT OR IGNORE INTO exit_optins
      (email,niche,consent_at,source_path,variant_id,session_hash,unsubscribe_hash,delivery_state)
      VALUES (?,?,?,?,?,?,?,'pending')`).run(input.email, input.niche, store.now().toISOString(), input.source, 'optin', hash(session), hash(unsubscribe));
    return result.changes === 1;
  }).immediate();
  if (!reserved) return { delivered: false };
  try {
    const email = { ...composeCheckup(input.niche, `${origin}/api/exit-optin/unsubscribe?token=${unsubscribe}`), to: input.email };
    const result = await send(email);
    if (!result.messageId) throw new Error('delivery_unconfirmed');
    // An unsubscribe racing with transport confirmation wins: status remains suppressed.
    const updated = store.db.prepare(`UPDATE exit_optins SET delivery_state='delivered', delivered_at=?
      WHERE email=? AND unsubscribe_hash=? AND unsubscribed_at IS NULL AND delivery_state='pending'`)
      .run(store.now().toISOString(), input.email, hash(unsubscribe));
    return updated.changes === 1 ? { delivered: true, session } : { delivered: false };
  } catch {
    store.db.prepare(`UPDATE exit_optins SET delivery_state='failed' WHERE email=? AND delivery_state='pending'`).run(input.email);
    return { delivered: false };
  }
}

export function optedIn(store: OptinStore, session: unknown): boolean {
  if (!tokenValid(session)) return false;
  const row = store.db.prepare(`SELECT 1 AS ok FROM exit_optins WHERE session_hash=? AND delivery_state='delivered' AND unsubscribed_at IS NULL`).get(hash(session));
  return !!row;
}

export function unsubscribe(store: OptinStore, raw: unknown): void {
  if (!tokenValid(raw)) return;
  store.db.transaction(() => {
    store.db.prepare(`UPDATE exit_optins SET unsubscribed_at=COALESCE(unsubscribed_at, ?) WHERE unsubscribe_hash=?`)
      .run(store.now().toISOString(), hash(raw));
  }).immediate();
}

/** Only an explicitly activated route may use the real transport. Tests inject their own mock. */
export const resendMailer: Mailer = input => sendResendTransactionalEmail(input);
