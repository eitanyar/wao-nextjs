// Shared test kit for the Site-Bot client-message routes and hooks. Loads TypeScript sources into a vm with an
// explicit import map (the neighbouring help-request tests' style), and builds a REAL store on a temp SQLite file
// (real db.ts + clientMessages.ts), so route tests exercise real storage. Email senders are always mocked here.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import ts from 'typescript';

export const repo = fileURLToPath(new URL('../../../../../', import.meta.url));

export function load(relative, imports, { env = {}, cwd, console: consoleImpl } = {}) {
  const file = path.join(repo, relative);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(imports, name), `unexpected import ${name} in ${relative}`);
      return imports[name];
    },
    process: { env, cwd: () => cwd ?? repo },
    Buffer, Response, Request, TextDecoder, URL, setTimeout, crypto: globalThis.crypto,
    fetch() { throw new Error('unexpected external call'); },
    console: consoleImpl ?? console,
  }, { filename: file });
  return exports;
}

/** A recording console: tests assert no message content ever reaches a log line. */
export function recordingConsole() {
  const lines = [];
  const record = (...args) => { lines.push(args.map(String).join(' ')); };
  return { console: { log: record, warn: record, error: record, info: record }, lines };
}

/** Real billing DB + real client-message store on a fresh temp directory. */
export function makeStore() {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'wao-client-msg-route-'));
  const dbPath = path.join(dir, 'billing.db');
  const dbMod = load('src/lib/payments/db.ts', { path, fs, 'better-sqlite3': Database }, { env: { BILLING_DB_PATH: dbPath } });
  const help = load('src/lib/site-bot/helpRequest.ts', {});
  const store = load('src/lib/site-bot/clientMessages.ts', { crypto, '../payments/db': dbMod, './helpRequest': help });
  const db = dbMod.getDb();
  const now = new Date().toISOString();
  function addSubscription(overrides = {}) {
    const id = crypto.randomUUID();
    dbMod.insertSubscription(db, {
      id, user_id: `owner-${id.slice(0, 6)}@example.com`, status: 'active', provider: 'mock', provider_token: null, card_last4: null,
      card_expiry: null, trial_amount: null, recurring_amount: 234.82, currency: 'ILS', next_charge_at: null, canceled_at: null,
      cancel_reason: null, failed_attempts: 0, created_at: now, updated_at: now, joined_at: now, extended_cancellation_flag: null,
      extended_flag_basis: null, plan: 'site-bot', ...overrides,
    });
    return id;
  }
  const getSubscriptionById = (id) => db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) ?? null;
  const rows = () => {
    const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'site_bot_client_messages'").get();
    return exists ? db.prepare('SELECT * FROM site_bot_client_messages ORDER BY received_at').all() : [];
  };
  const cleanup = () => { dbMod.closeDb(); fs.rmSync(dir, { recursive: true, force: true }); };
  return { dir, dbMod, db, store, help, addSubscription, getSubscriptionById, rows, cleanup };
}

/** Mocked email senders with call counts. `mode`: 'ok' (true), 'false', 'throw'. */
export function mockEmail({ alert = 'ok', confirmation = 'ok' } = {}) {
  const calls = { alert: [], confirmation: [] };
  const run = (mode, list, row) => {
    list.push(row.id);
    if (mode === 'throw') throw new Error('transport down');
    return mode === 'ok';
  };
  return {
    calls,
    module: {
      sendClientMessageStaffAlert: async (row) => run(alert, calls.alert, row),
      sendClientMessageConfirmation: async (row) => run(confirmation, calls.confirmation, row),
    },
  };
}

export function loadGuards({ admin = true } = {}) {
  return load('src/lib/site-bot/adminRequestGuards.ts', {
    'next/headers': { cookies: async () => ({ get: (name) => (admin && name === 'admin' ? { value: 'synthetic' } : undefined) }) },
    '@/lib/admin-auth': { ADMIN_COOKIE_NAME: 'admin', verifyAdminToken: async (value) => admin && value === 'synthetic' },
  });
}

export function jsonRequest(url, body, { headers = {}, raw } = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: raw ?? JSON.stringify(body),
  });
}
