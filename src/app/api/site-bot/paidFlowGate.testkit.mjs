// Shared fixtures for the SITE_BOT_PAID_FLOW gate (paid-journey v2 M0 dress rehearsal).
// Not a test file itself: imported by the audit-only guard and the per-route stub tests.
//
// The gate contract: a re-enabled paid route may read exactly two env keys
// (SITE_BOT_PAID_FLOW, NODE_ENV) before deciding. Unless SITE_BOT_PAID_FLOW is the
// literal '1' AND NODE_ENV is not 'production', it must return the audit-only stub
// response without touching the request, imports, network, clock or anything else.

export const GATE_KEYS = ['SITE_BOT_PAID_FLOW', 'NODE_ENV'];

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

/** Every env that must keep the stub closed: unset, non-'1' values, and '1' in production. */
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
];

/** The only env shape that opens the gate. */
export const OPEN_GATE_ENVS = [
  { SITE_BOT_PAID_FLOW: '1', NODE_ENV: 'development' },
  { SITE_BOT_PAID_FLOW: '1', NODE_ENV: 'test' },
];

/** Exact source of a flag-gated API stub. */
export function gatedRouteSource(method, error) {
  return `import { NextResponse } from 'next/server';

// Paid-journey v2 M0 dress rehearsal: the full handler lives in ./paid and is
// reachable ONLY when SITE_BOT_PAID_FLOW=1 on a non-production server. With the
// flag unset (prod default) this returns the audit-only 503 below, unchanged.
export async function ${method}(req: Request) {
  if (process.env.SITE_BOT_PAID_FLOW === '1' && process.env.NODE_ENV !== 'production') {
    const { ${method}: paid${method} } = await import('./paid');
    return paid${method}(req);
  }
  return NextResponse.json(
    { error: '${error}' },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
  );
}`;
}
