import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const CALLS_PER_LOOKUP = 4;
const BUSY_TIMEOUT_MS = 5000;
const CREATE_LEDGER = `CREATE TABLE IF NOT EXISTS site_bot_audit_lookup_budget (
  day TEXT PRIMARY KEY,
  used INTEGER NOT NULL CHECK (used >= 0 AND used <= 9007199254740991 AND used % 4 = 0)
)`;

export interface AuditLookupBudgetStore {
  readonly db: Database.Database;
  readonly now: () => Date;
}

export type AuditLookupReservation = { status: 'reserved' | 'exhausted' | 'unavailable' };

/** A path is operator-configured, absolute, and outside this checkout and client data. */
export function openSiteBotAuditLookupBudget(dbPath: string, now: () => Date = () => new Date()): AuditLookupBudgetStore {
  if (typeof dbPath !== 'string' || !path.isAbsolute(dbPath) || typeof now !== 'function' ||
      path.normalize(dbPath) !== dbPath || path.basename(dbPath) === path.sep) throw new Error('Invalid budget path');
  const repo = fs.realpathSync(process.cwd());
  const parentPath = path.dirname(dbPath);
  // Reject symlinks in every existing component, not just the database filename.
  let component = path.parse(dbPath).root;
  for (const part of dbPath.slice(component.length).split(path.sep)) {
    component = path.join(component, part);
    try {
      if (fs.lstatSync(component).isSymbolicLink()) throw new Error('Symlink budget path');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  const parent = fs.realpathSync(parentPath);
  if (parent === repo || parent.startsWith(repo + path.sep) ||
      dbPath.includes(`${path.sep}data${path.sep}clients${path.sep}`) ||
      !fs.statSync(parent).isDirectory()) throw new Error('Unsafe budget path');
  fs.accessSync(parent, fs.constants.W_OK | fs.constants.X_OK);
  let exists = false;
  try { fs.lstatSync(dbPath); exists = true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (exists) {
    const stat = fs.lstatSync(dbPath);
    if (!stat.isFile() || stat.nlink !== 1) throw new Error('Invalid budget file');
    fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
  }
  for (const suffix of ['-wal', '-shm']) {
    try {
      const sidecar = fs.lstatSync(dbPath + suffix);
      if (!sidecar.isFile() || sidecar.nlink !== 1) throw new Error('Unsafe budget sidecar');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  const db = new Database(dbPath, { timeout: BUSY_TIMEOUT_MS });
  try {
    if (!fs.lstatSync(dbPath).isFile()) throw new Error('Invalid budget file');
    db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
    db.pragma('journal_mode = WAL');
    db.exec(CREATE_LEDGER);
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'site_bot_audit_lookup_budget'")
      .get() as { sql: string } | undefined;
    if (schema?.sql !== CREATE_LEDGER.replace('IF NOT EXISTS ', '')) throw new Error('Incompatible budget ledger');
    if (db.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('Corrupt budget ledger');
    return { db, now };
  } catch (error) { db.close(); throw error; }
}

export function closeSiteBotAuditLookupBudget(store: AuditLookupBudgetStore): void {
  store.db.close();
}

/** Each successful transaction irreversibly claims four attempts before any provider call. */
export function reserveSiteBotAuditLookup(store: AuditLookupBudgetStore, dailyCeiling: number): AuditLookupReservation {
  if (!Number.isSafeInteger(dailyCeiling) || dailyCeiling <= 0) return { status: 'unavailable' };
  try {
    const date = store.now();
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return { status: 'unavailable' };
    const day = date.toISOString().slice(0, 10);
    return store.db.transaction((): AuditLookupReservation => {
      const row = store.db.prepare('SELECT used FROM site_bot_audit_lookup_budget WHERE day = ?').get(day) as { used: number } | undefined;
      const used = row?.used ?? 0;
      if (!Number.isSafeInteger(used) || used < 0 || used % CALLS_PER_LOOKUP !== 0) return { status: 'unavailable' };
      if (used > dailyCeiling - CALLS_PER_LOOKUP) return { status: 'exhausted' };
      if (row) {
        const changed = store.db.prepare('UPDATE site_bot_audit_lookup_budget SET used = ? WHERE day = ? AND used = ?')
          .run(used + CALLS_PER_LOOKUP, day, used).changes;
        if (changed !== 1) throw new Error('Budget conflict');
      } else {
        store.db.prepare('INSERT INTO site_bot_audit_lookup_budget(day, used) VALUES (?, ?)')
          .run(day, CALLS_PER_LOOKUP);
      }
      return { status: 'reserved' };
    }).immediate();
  } catch { return { status: 'unavailable' }; }
}

/** Strict operator input; never accepts an anonymous request value or a default. */
export function parseSiteBotAuditDailyCeiling(value: string | undefined): number | null {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/u.test(value)) return null;
  const ceiling = Number(value);
  return Number.isSafeInteger(ceiling) ? ceiling : null;
}
