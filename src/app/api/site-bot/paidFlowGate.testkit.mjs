// Shared fixtures for the SITE_BOT_PAID_FLOW runtime gate (src/lib/site-bot/paidFlowGate.ts).
// Not a test file itself: imported by the audit-only guard and the per-route stub tests.
//
// The gate contract (launch rehearsal runbook 2026-11-13, Files row 1):
//   - A gated paid route may read exactly two env keys (SITE_BOT_PAID_FLOW, NODE_ENV) before
//     deciding, at request time.
//   - closed (unset / anything unrecognised / legacy '1' in production): the audit-only stub
//     response, without touching the request, the cookie jar, imports, network, clock or anything else.
//   - rehearsal: open ONLY for a request carrying a valid admin cookie; the cookie jar is the one
//     extra thing it may read. No cookie / a bad cookie behaves exactly like closed.
//   - open (or legacy '1' off-production): open to everyone, still without reading the cookie jar.
// The tests below run the REAL gate module (transpiled) next to the route, with only the admin
// token check stubbed (VALID_ADMIN_TOKEN is the one token it accepts).

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

export const GATE_KEYS = ['SITE_BOT_PAID_FLOW', 'NODE_ENV'];
export const GATE_MODULE = '@/lib/site-bot/paidFlowGate';
export const ADMIN_COOKIE = 'wao-admin';
export const VALID_ADMIN_TOKEN = 'synthetic-valid-admin-token';
export const INVALID_ADMIN_TOKENS = [undefined, '', 'synthetic-forged-token', ` ${VALID_ADMIN_TOKEN}`];

/** A `process` stand-in exposing only the two gate keys; any other access is denied. */
export function gatedProcess(env, deny) {
  return new Proxy({}, {
    get: (_, name) => name === 'env'
      ? new Proxy({}, {
        get: (__, key) => GATE_KEYS.includes(key) ? env[key] : deny(`process.env.${String(key)}`),
        has: (__, key) => GATE_KEYS.includes(key) ? key in env : deny(`process.env has ${String(key)}`),
        ownKeys: () => deny('process.env keys'),
        getOwnPropertyDescriptor: () => deny('process.env descriptor'),
      })
      : deny(`process.${String(name)}`),
  });
}

/** Every env that keeps the gate closed: unset, unrecognised values, and legacy '1' in production. */
export const CLOSED_GATE_ENVS = [
  {},
  { NODE_ENV: 'production' },
  { NODE_ENV: 'development' },
  { NODE_ENV: 'test' },
  { SITE_BOT_PAID_FLOW: '1', NODE_ENV: 'production' },
  { SITE_BOT_PAID_FLOW: 'true', NODE_ENV: 'development' },
  { SITE_BOT_PAID_FLOW: '0', NODE_ENV: 'development' },
  { SITE_BOT_PAID_FLOW: '', NODE_ENV: 'development' },
  { SITE_BOT_PAID_FLOW: ' 1', NODE_ENV: 'development' },
  { SITE_BOT_PAID_FLOW: 'closed', NODE_ENV: 'production' },
  { SITE_BOT_PAID_FLOW: 'OPEN', NODE_ENV: 'production' },
  { SITE_BOT_PAID_FLOW: 'open ', NODE_ENV: 'production' },
  { SITE_BOT_PAID_FLOW: 'Rehearsal', NODE_ENV: 'production' },
  { SITE_BOT_PAID_FLOW: 'true', NODE_ENV: 'production' },
];

/** Envs that open the gate to everyone. */
export const OPEN_GATE_ENVS = [
  { SITE_BOT_PAID_FLOW: 'open', NODE_ENV: 'production' },
  { SITE_BOT_PAID_FLOW: 'open', NODE_ENV: 'development' },
  { SITE_BOT_PAID_FLOW: 'open' },
  // Legacy local-dev value: open off-production only.
  { SITE_BOT_PAID_FLOW: '1', NODE_ENV: 'development' },
  { SITE_BOT_PAID_FLOW: '1', NODE_ENV: 'test' },
];

/** Envs that open the gate only to a request with a valid admin cookie. */
export const REHEARSAL_GATE_ENVS = [
  { SITE_BOT_PAID_FLOW: 'rehearsal', NODE_ENV: 'production' },
  { SITE_BOT_PAID_FLOW: 'rehearsal', NODE_ENV: 'development' },
  { SITE_BOT_PAID_FLOW: 'rehearsal' },
];

const gatePath = path.join(process.cwd(), 'src/lib/site-bot/paidFlowGate.ts');
let gateCode = null;

/**
 * Loads the real gate module in its own sandbox. `cookie` is the wao-admin cookie value of the
 * simulated request (undefined = no cookie). Every cookie-jar read is recorded in `cookieReads`.
 */
export function loadGate(env, deny, { cookie } = {}) {
  gateCode ??= ts.transpileModule(fs.readFileSync(gatePath, 'utf8'), {
    fileName: gatePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const cookieReads = [];
  const exports = {};
  vm.runInNewContext(gateCode, {
    exports,
    require: name => {
      if (name === '../admin-auth') {
        return { ADMIN_COOKIE_NAME: ADMIN_COOKIE, verifyAdminToken: async token => token === VALID_ADMIN_TOKEN };
      }
      if (name === 'next/headers') {
        return {
          cookies: async () => {
            // Contract: only rehearsal may look at the cookie jar; closed and open decide on env alone.
            if (env.SITE_BOT_PAID_FLOW !== 'rehearsal') return deny('cookies() outside rehearsal');
            cookieReads.push('cookies()');
            return { get: key => (key === ADMIN_COOKIE && cookie !== undefined ? { name: key, value: cookie } : undefined) };
          },
        };
      }
      if (name === 'next/navigation') return { unstable_rethrow: () => {} };
      return deny(`gate import: ${name}`);
    },
    process: gatedProcess(env, deny),
    fetch: () => deny('gate fetch'),
    console: new Proxy({}, { get: (_, key) => deny(`gate console.${String(key)}`) }),
    Date: class { constructor() { deny('gate clock'); } static now() { deny('gate clock'); } },
    setTimeout: () => deny('gate setTimeout'),
    setInterval: () => deny('gate setInterval'),
  }, { filename: gatePath });
  return { gate: exports, cookieReads };
}

/** Exact source of a gated paid API stub (admin cookie required in rehearsal). */
export function gatedRouteSource(method, error) {
  return `import { NextResponse } from 'next/server';
import { isPaidFlowAllowedForRequest } from '@/lib/site-bot/paidFlowGate';

// Paid-journey v2: the full handler lives in ./paid and is reachable ONLY when the runtime
// SITE_BOT_PAID_FLOW gate (src/lib/site-bot/paidFlowGate.ts) allows this request: 'open' for
// everyone, 'rehearsal' for a valid admin cookie. Closed (the production default) returns the
// audit-only 503 below, unchanged.
export async function ${method}(req: Request) {
  if (await isPaidFlowAllowedForRequest()) {
    const { ${method}: paid${method} } = await import('./paid');
    return paid${method}(req);
  }
  return NextResponse.json(
    { error: '${error}' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}`;
}

/** Exact source of the checkout callback stub: rehearsal does NOT need the admin cookie (provider callback). */
export function gatedCallbackSource(method, error) {
  return `import { NextResponse } from 'next/server';
import { isPaidFlowCallbackAllowed } from '@/lib/site-bot/paidFlowGate';

// Paid-journey v2: the full handler lives in ./paid and is reachable ONLY when the runtime
// SITE_BOT_PAID_FLOW gate (src/lib/site-bot/paidFlowGate.ts) is 'rehearsal' or 'open'. Unlike the
// other paid routes this one does NOT require the admin cookie in rehearsal: the payment provider's
// server callback carries none, so ./paid authenticates it by its own provider check (an invalid
// callback is rejected as payment_verification_failed) and acts only on a pending session that
// the admin-gated checkout/init created. Closed (the production default) returns the audit-only
// 503 below, unchanged.
export async function ${method}(req: Request) {
  if (isPaidFlowCallbackAllowed()) {
    const { ${method}: paid${method} } = await import('./paid');
    return paid${method}(req);
  }
  return NextResponse.json(
    { error: '${error}' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}`;
}

/**
 * Every (env, cookie) request shape that must get the closed stub from a cookie-gated route,
 * with whether the gate may read the cookie jar for it (only in rehearsal).
 */
export function closedRequestCases() {
  const cases = [];
  for (const env of [...CLOSED_GATE_ENVS]) {
    for (const cookie of [undefined, VALID_ADMIN_TOKEN]) cases.push({ env, cookie, readsCookies: false });
  }
  for (const env of REHEARSAL_GATE_ENVS) {
    for (const cookie of INVALID_ADMIN_TOKENS) cases.push({ env, cookie, readsCookies: true });
  }
  return cases;
}

/** Every (env, cookie) request shape that a cookie-gated route must let through to ./paid. */
export function openRequestCases() {
  const cases = [];
  for (const env of OPEN_GATE_ENVS) {
    for (const cookie of [undefined, VALID_ADMIN_TOKEN, 'synthetic-forged-token']) cases.push({ env, cookie, readsCookies: false });
  }
  for (const env of REHEARSAL_GATE_ENVS) cases.push({ env, cookie: VALID_ADMIN_TOKEN, readsCookies: true });
  return cases;
}
