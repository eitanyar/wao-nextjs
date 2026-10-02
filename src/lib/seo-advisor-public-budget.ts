import crypto from 'node:crypto';
import fs from 'node:fs';
import { isIP } from 'node:net';
import path from 'node:path';
import Database from 'better-sqlite3';

const OVERVIEW_CREDITS = 300;
const BUSY_TIMEOUT_MS = 5000;
const MAX_SAFE_CREDITS = Number.MAX_SAFE_INTEGER;

export interface PublicSeoOverviewFinding {
  retrievedAt: string;
  organicTraffic: number | null;
  organicKeywords: number | null;
}

export interface PublicSeoBudgetStore {
  readonly db: Database.Database;
  readonly now: () => Date;
}

export type PublicSeoReservation =
  | { status: 'reserved'; domain: string; day: string; token: string }
  | { status: 'cached'; domain: string; day: string; finding: PublicSeoOverviewFinding }
  | { status: 'already_reserved' | 'budget_exhausted' | 'invalid_arguments' | 'unavailable' };

export type PublicSeoCacheResult =
  | { status: 'found'; domain: string; day: string; stale: boolean; finding: PublicSeoOverviewFinding }
  | { status: 'not_found' | 'invalid_arguments' | 'unavailable' };

interface ReservationRow {
  domain: string;
  day: string;
  state: string;
  token: string;
  retrieved_at: string | null;
  organic_traffic: number | null;
  organic_keywords: number | null;
}

function normalizeDomain(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const domain = input.trim().toLowerCase();
  // Match the provider adapter's hostname shape after case/whitespace normalization.
  if (domain.length > 253 || isIP(domain) !== 0 ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/u.test(domain)) return null;
  return domain;
}

function utcDay(store: PublicSeoBudgetStore): string {
  const date = store.now();
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error('Invalid clock');
  return date.toISOString().slice(0, 10);
}

function validFinding(input: unknown, day: string, nowMs: number): input is PublicSeoOverviewFinding {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return false;
  const item = input as Record<string, unknown>;
  if (Object.keys(item).sort().join(',') !== 'organicKeywords,organicTraffic,retrievedAt') return false;
  if (typeof item.retrievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(item.retrievedAt)) return false;
  const time = Date.parse(item.retrievedAt);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== item.retrievedAt || time > nowMs || item.retrievedAt.slice(0, 10) !== day) return false;
  return ['organicTraffic', 'organicKeywords'].every(key => item[key] === null || (typeof item[key] === 'number' && Number.isFinite(item[key]) && item[key] >= 0));
}

function sanitized(row: ReservationRow, nowMs: number): PublicSeoOverviewFinding | null {
  const finding = { retrievedAt: row.retrieved_at, organicTraffic: row.organic_traffic, organicKeywords: row.organic_keywords };
  // Corrupt, incompatible, or incomplete rows cannot be returned as cached evidence.
  return row.state === 'complete' && validFinding(finding, row.day, nowMs) ? finding as PublicSeoOverviewFinding : null;
}

/** Opens only an explicitly configured SQLite file outside the repository. No import-time I/O. */
export function openPublicSeoBudgetStore(options: { dbPath: string; now?: () => Date }): PublicSeoBudgetStore {
  if (!options || typeof options.dbPath !== 'string' || !path.isAbsolute(options.dbPath) || options.dbPath === ':memory:' || typeof (options.now ?? (() => new Date())) !== 'function') throw new Error('Explicit absolute public SEO DB path required');
  const repo = fs.realpathSync(process.cwd());
  const parent = fs.realpathSync(path.dirname(options.dbPath));
  const resolved = path.join(parent, path.basename(options.dbPath));
  const existing = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
  if ([resolved, existing].some(file => file === repo || file.startsWith(repo + path.sep)) ||
    [resolved, existing].some(file => file.includes(`${path.sep}data${path.sep}clients${path.sep}`))) throw new Error('Public SEO DB must be outside repository and client data');
  const db = new Database(resolved);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
    db.exec(`CREATE TABLE IF NOT EXISTS public_seo_overviews (
      day TEXT NOT NULL,
      domain TEXT NOT NULL,
      credits INTEGER NOT NULL CHECK (credits = 300),
      token TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL CHECK (state IN ('pending', 'complete')),
      retrieved_at TEXT,
      organic_traffic REAL,
      organic_keywords REAL,
      PRIMARY KEY (day, domain)
    );
    CREATE INDEX IF NOT EXISTS public_seo_overviews_domain_day ON public_seo_overviews(domain, day DESC);`);
    return { db, now: options.now ?? (() => new Date()) };
  } catch (error) { db.close(); throw error; }
}

export function closePublicSeoBudgetStore(store: PublicSeoBudgetStore): void { store.db.close(); }

/** Caller must supply a trusted, explicitly approved daily credit ceiling, never anonymous input. */
export function reservePublicSeoOverview(store: PublicSeoBudgetStore, domainInput: unknown, dailyCeiling: number): PublicSeoReservation {
  const domain = normalizeDomain(domainInput);
  if (!domain || !Number.isSafeInteger(dailyCeiling) || dailyCeiling <= 0 || dailyCeiling > MAX_SAFE_CREDITS) return { status: 'invalid_arguments' };
  try {
    const now = store.now();
    const day = utcDay({ ...store, now: () => now });
    return store.db.transaction((): PublicSeoReservation => {
      const existing = store.db.prepare('SELECT * FROM public_seo_overviews WHERE day = ? AND domain = ?').get(day, domain) as ReservationRow | undefined;
      if (existing) {
        const finding = sanitized(existing, now.getTime());
        return finding ? { status: 'cached', domain, day, finding } : { status: 'already_reserved' };
      }
      const ledger = store.db.prepare('SELECT COALESCE(SUM(credits), 0) AS spent FROM public_seo_overviews WHERE day = ?').get(day) as { spent: number };
      if (!Number.isSafeInteger(ledger.spent) || dailyCeiling < OVERVIEW_CREDITS || ledger.spent > dailyCeiling - OVERVIEW_CREDITS) return { status: 'budget_exhausted' };
      const token = crypto.randomUUID();
      store.db.prepare('INSERT INTO public_seo_overviews(day, domain, credits, token, state) VALUES (?, ?, ?, ?, ?)').run(day, domain, OVERVIEW_CREDITS, token, 'pending');
      return { status: 'reserved', domain, day, token };
    }).immediate();
  } catch { return { status: 'unavailable' }; }
}

/** Only a pending, same-day reservation can be finalized; failed calls stay charged. */
export function savePublicSeoOverview(store: PublicSeoBudgetStore, domainInput: unknown, token: unknown, finding: unknown): boolean {
  const domain = normalizeDomain(domainInput);
  if (!domain || typeof token !== 'string' || !/^[0-9a-f-]{36}$/u.test(token)) return false;
  try {
    const now = store.now();
    const day = utcDay({ ...store, now: () => now });
    if (!validFinding(finding, day, now.getTime())) return false;
    const value = finding as PublicSeoOverviewFinding;
    const result = store.db.prepare(`UPDATE public_seo_overviews SET state = 'complete', retrieved_at = ?, organic_traffic = ?, organic_keywords = ?
      WHERE domain = ? AND day = ? AND token = ? AND state = 'pending'`).run(value.retrievedAt, value.organicTraffic, value.organicKeywords, domain, day, token);
    return result.changes === 1;
  } catch { return false; }
}

/** Reads current evidence or the newest explicitly dated stale evidence, never the provider. */
export function readPublicSeoOverview(store: PublicSeoBudgetStore, domainInput: unknown): PublicSeoCacheResult {
  const domain = normalizeDomain(domainInput);
  if (!domain) return { status: 'invalid_arguments' };
  try {
    const now = store.now();
    const day = utcDay({ ...store, now: () => now });
    const rows = store.db.prepare(`SELECT * FROM public_seo_overviews WHERE domain = ? AND day <= ? AND state = 'complete' ORDER BY day DESC`).all(domain, day) as ReservationRow[];
    for (const row of rows) {
      const finding = sanitized(row, now.getTime());
      if (finding) return { status: 'found', domain, day: row.day, stale: row.day !== day, finding };
    }
    return { status: 'not_found' };
  } catch { return { status: 'unavailable' }; }
}
