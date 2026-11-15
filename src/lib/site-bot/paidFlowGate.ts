import { ADMIN_COOKIE_NAME, verifyAdminToken } from '../admin-auth';

// Site Bot paid-flow gate (launch rehearsal runbook 2026-11-13, Files row 1; steps E2, S2, S19).
// One runtime switch, SITE_BOT_PAID_FLOW, read at REQUEST time (never at module load or build), so
// opening or closing the paid flow is an env change + process restart, never a rebuild:
//   unset / anything else -> 'closed'    pages redirect to /site-bot, APIs return their 503 stub
//   'rehearsal'           -> 'rehearsal' open only to a browser holding a valid admin cookie
//   'open'                -> 'open'      public
// Back-compat: the legacy value '1' still opens the flow on a NON-production server (local dev
// rehearsal, as before this gate existed). In production '1' means closed.
//
// Callers that render pages must call `await connection()` (next/server) BEFORE asking the gate,
// so the route is rendered per request and never prerendered with a build-time answer baked in.

export type PaidFlowMode = 'closed' | 'rehearsal' | 'open';

type GateEnv = Record<string, string | undefined>;

export function paidFlowMode(env: GateEnv = process.env): PaidFlowMode {
  try {
    const value = env.SITE_BOT_PAID_FLOW;
    if (value === 'open') return 'open';
    if (value === 'rehearsal') return 'rehearsal';
    if (value === '1' && env.NODE_ENV !== 'production') return 'open';
    return 'closed';
  } catch {
    return 'closed';
  }
}

/** open -> true; rehearsal -> only with a valid admin token; closed -> false. Fails closed on any error. */
export async function isPaidFlowAllowed(cookieValue?: string, env: GateEnv = process.env): Promise<boolean> {
  try {
    const mode = paidFlowMode(env);
    if (mode === 'open') return true;
    if (mode !== 'rehearsal') return false;
    if (typeof cookieValue !== 'string' || !cookieValue) return false;
    return (await verifyAdminToken(cookieValue)) === true;
  } catch {
    return false;
  }
}

/** Request-scoped form for pages, layouts and route handlers: reads the admin cookie only in rehearsal mode. */
export async function isPaidFlowAllowedForRequest(): Promise<boolean> {
  const mode = paidFlowMode();
  if (mode === 'closed') return false;
  if (mode === 'open') return true;
  // Rehearsal: read the admin cookie. Any failure fails closed, except Next's own request-time
  // control flow (dynamic-rendering bailouts, redirect/notFound), which unstable_rethrow re-throws.
  try {
    const { cookies } = await import('next/headers');
    const jar = await cookies();
    return await isPaidFlowAllowed(jar.get(ADMIN_COOKIE_NAME)?.value);
  } catch (error) {
    const { unstable_rethrow } = await import('next/navigation');
    unstable_rethrow(error);
    return false;
  }
}

/**
 * Gate for the checkout CALLBACK only. The payment provider's server-to-server callback carries no
 * admin cookie, so in rehearsal mode the callback stays reachable without one: it is authenticated
 * by its own provider check (activatePlanSubscription verifies the provider callback and rejects it
 * as `callback_invalid`) and it only acts on a pending session that the admin-gated checkout/init
 * created. Closed -> false (503 stub), exactly like every other paid route.
 */
export function isPaidFlowCallbackAllowed(env: GateEnv = process.env): boolean {
  const mode = paidFlowMode(env);
  return mode === 'rehearsal' || mode === 'open';
}
