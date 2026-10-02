import { createHmac } from 'node:crypto';
import type { PublicSeoBudgetStore } from './seo-advisor-public-budget';
import { runPublicSeoDiagnosis } from './seo-advisor-public-orchestrator';
import type { PublicSeoExecutor } from './seo-advisor-public-orchestrator';
import { advancePublicSeoSession } from './seo-advisor-public-session';
import type { PublicSeoSession, SessionEvent } from './seo-advisor-public-session';
import { checkRateLimit } from './payments/rate-limit';
import type { RateLimitResult } from './payments/rate-limit';

const SESSION_TTL_MS = 30 * 60_000;
const MAX_FUTURE_SKEW_MS = 60_000;
export const PUBLIC_SEO_RATE_LIMIT = { maxRequests: 12, windowMs: 60_000 } as const;

export type PublicSeoSessionWithMarket = PublicSeoSession & { market?: 'IL' | 'US' };
export type PublicSeoServiceResult =
  | { status: 'rate_limited'; retryAfterMs: number }
  | { status: 'invalid_token' }
  | { status: 'unavailable' }
  // For server-side logging only. The future HTTP route must not serialize session.
  | { status: 'ok'; token: string; utterances: string[]; session: PublicSeoSessionWithMarket };

interface ServiceOptions {
  token: unknown;
  event: unknown;
  clientKey: string;
  secret: string;
  store: PublicSeoBudgetStore;
  dailyCeiling: number;
  projectId: string;
  executor: PublicSeoExecutor;
  checkLimit?: (key: string, opts: { maxRequests: number; windowMs: number }) => RateLimitResult;
  now?: () => number;
}

function validSession(input: unknown): input is PublicSeoSessionWithMarket {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  const keys = Object.keys(value).sort().join(',');
  if (keys !== 'consented,domain,introBeat,realFinding,runCount,state' &&
    keys !== 'consented,domain,introBeat,market,realFinding,runCount,state') return false;
  return ['S1', 'S2', 'S3', 'S4', 'S5'].includes(value.state as string) &&
    (value.domain === null || typeof value.domain === 'string') &&
    typeof value.consented === 'boolean' &&
    (value.runCount === 0 || value.runCount === 1) &&
    (value.introBeat === 0 || value.introBeat === 1 || value.introBeat === 2) &&
    typeof value.realFinding === 'boolean' &&
    (value.market === undefined && !Object.hasOwn(value, 'market') || value.market === 'IL' || value.market === 'US');
}

function validEvent(input: unknown): input is SessionEvent {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  if (value.type === 'submit_domain') return typeof value.domain === 'string' && typeof value.market === 'string';
  return ['next_intro', 'hesitation', 'approve', 'decline', 'guarantee_question', 'close', 'no_contact', 'run'].includes(value.type as string);
}

function signature(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export function signPublicSeoSession(session: PublicSeoSession, options: { secret: string; now?: () => number }): string {
  if (typeof options?.secret !== 'string' || !options.secret || !validSession(session)) throw new Error('Invalid session signing input');
  const issuedAtMs = (options.now ?? Date.now)();
  if (!Number.isSafeInteger(issuedAtMs) || !Number.isSafeInteger(issuedAtMs + SESSION_TTL_MS)) throw new Error('Invalid session clock');
  const body = `v1.${issuedAtMs}.${issuedAtMs + SESSION_TTL_MS}.${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
  return `${body}.${signature(body, options.secret)}`;
}

export function verifyPublicSeoSession(token: unknown, options: { secret: string; now?: () => number }): PublicSeoSessionWithMarket | null {
  try {
    if (typeof token !== 'string' || typeof options?.secret !== 'string' || !options.secret) return null;
    const parts = token.split('.');
    if (parts.length !== 5 || parts[0] !== 'v1' || !/^(?:0|[1-9]\d*)$/u.test(parts[1]) ||
      !/^(?:0|[1-9]\d*)$/u.test(parts[2]) || !/^[A-Za-z0-9_-]+$/u.test(parts[3]) ||
      !/^[0-9a-f]{64}$/u.test(parts[4])) return null;
    const issuedAtMs = Number(parts[1]);
    const expiresAtMs = Number(parts[2]);
    const now = (options.now ?? Date.now)();
    if (!Number.isSafeInteger(now) || !Number.isSafeInteger(issuedAtMs) || !Number.isSafeInteger(expiresAtMs) ||
      expiresAtMs - issuedAtMs !== SESSION_TTL_MS || expiresAtMs <= now || issuedAtMs > now + MAX_FUTURE_SKEW_MS) return null;
    const body = parts.slice(0, 4).join('.');
    if (!constantTimeEqual(parts[4], signature(body, options.secret))) return null;
    const decoded = Buffer.from(parts[3], 'base64url');
    if (decoded.toString('base64url') !== parts[3]) return null;
    const session: unknown = JSON.parse(decoded.toString('utf8'));
    return validSession(session) ? session : null;
  } catch { return null; }
}

export async function handlePublicSeoEvent(options: ServiceOptions): Promise<PublicSeoServiceResult> {
  if (!options || typeof options.secret !== 'string' || !options.secret ||
    typeof options.clientKey !== 'string' || !options.clientKey.trim() ||
    !Number.isSafeInteger(options.dailyCeiling) || options.dailyCeiling < 300 ||
    typeof options.projectId !== 'string' || !options.projectId.trim() ||
    typeof options.executor !== 'function') return { status: 'unavailable' };
  try {
    const limit = (options.checkLimit ?? checkRateLimit)(`public-seo:${options.clientKey}`, PUBLIC_SEO_RATE_LIMIT);
    if (!limit.allowed) return { status: 'rate_limited', retryAfterMs: limit.retryAfterMs };
    const session = verifyPublicSeoSession(options.token, { secret: options.secret, now: options.now });
    if (!session || !validEvent(options.event)) return { status: 'invalid_token' };
    const event = options.event;
    // A consented pre-run token must be resolved before refreshing, including across UTC days.
    const issuedAtMs = Number((options.token as string).split('.')[1]);
    const sameUtcDay = new Date(issuedAtMs).toISOString().slice(0, 10) ===
      new Date((options.now ?? Date.now)()).toISOString().slice(0, 10);
    let safeEvent: SessionEvent;
    if (event.type === 'run' || event.type !== 'submit_domain' && session.state === 'S2' &&
      session.consented && session.runCount === 0 && (!!session.domain && !!session.market || !sameUtcDay)) {
      // Only the trusted orchestrator may produce a diagnosis outcome. Never use client outcome fields.
      // Issuance is HMAC-covered. A pre-run token must not consume another day's budget.
      const eligible = sameUtcDay && session.state === 'S2' && session.consented &&
        session.runCount === 0 && !!session.domain && !!session.market;
      const outcome = eligible
        ? await runPublicSeoDiagnosis({ store: options.store, dailyCeiling: options.dailyCeiling,
          domain: session.domain!, market: session.market!, projectId: options.projectId, executor: options.executor })
        : { reservation: { status: 'invalid_arguments' as const } };
      safeEvent = { type: 'run', outcome };
    } else if (event.type === 'submit_domain') {
      safeEvent = { type: 'submit_domain', domain: event.domain, market: event.market };
    } else {
      safeEvent = { type: event.type };
    }
    const turn = advancePublicSeoSession(session, safeEvent);
    const next: PublicSeoSessionWithMarket = { ...turn.session };
    if (safeEvent.type === 'submit_domain' && session.state === 'S1' && turn.session.state === 'S2' &&
      (safeEvent.market === 'IL' || safeEvent.market === 'US')) next.market = safeEvent.market;
    else if (session.market) next.market = session.market;
    const token = signPublicSeoSession(next, { secret: options.secret, now: options.now });
    return { status: 'ok', token, utterances: turn.utterances, session: next };
  } catch { return { status: 'unavailable' }; }
}
