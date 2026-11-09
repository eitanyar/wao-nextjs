/**
 * Site Bot paid-journey v2 M1 (B11): the pure request handler behind the flag-gated
 * GET /api/site-bot/prefill?auditId=&placeId= (the route wires the real dependencies).
 *
 * Not a Places proxy: the placeId must be one of the candidates already stored in that
 * audit record, else 404 (same body as an unknown audit, so it is no oracle). Rate-limited
 * per IP and per audit BEFORE the audit store is read. One fresh Places Details read per
 * request; the snapshot is returned, never persisted (the audit store stays minimal).
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { AuditRecord } from './auditStore';
import { buildFixtureSnapshot, type PrefillSnapshot } from './placePrefill';
import { isPrefillRequest } from './startIntake';

export const PREFILL_IP_LIMIT = { maxRequests: 10, windowMs: 10 * 60 * 1000 };
export const PREFILL_AUDIT_LIMIT = { maxRequests: 4, windowMs: 60 * 60 * 1000 };

export type PrefillProviderMode = 'live' | 'fixture';

/**
 * SITE_BOT_PREFILL_PROVIDER, mirroring SITE_BOT_RESEARCH_PROVIDERS (M0.5):
 * unset / '' / 'live' -> live Places; 'fixture' -> zero-network snapshot, NON-PRODUCTION ONLY.
 * Production always resolves to live; off production an unknown value throws instead of
 * silently spending on live calls.
 */
export function resolvePrefillProviderMode(env: { SITE_BOT_PREFILL_PROVIDER?: string; NODE_ENV?: string }): PrefillProviderMode {
  const requested = env.SITE_BOT_PREFILL_PROVIDER;
  const unset = requested === undefined || requested === '' || requested === 'live';
  if (env.NODE_ENV === 'production' || unset) return 'live';
  if (requested === 'fixture') return 'fixture';
  throw new Error(`SITE_BOT_PREFILL_PROVIDER must be unset, 'live' or 'fixture' (got ${JSON.stringify(requested)})`);
}

export interface PrefillDependencies {
  mode: PrefillProviderMode;
  rateLimit: (key: string, limit: { maxRequests: number; windowMs: number }) => { allowed: boolean };
  readAudit: (auditId: string) => Promise<AuditRecord | null>;
  hasLiveKey: () => boolean;
  fetchSnapshot: (placeId: string) => Promise<PrefillSnapshot>;
  /** Bounded failure code only, never owner data. */
  logFailure?: (code: string) => void;
}

export interface PrefillRequest {
  auditId: string | null;
  placeId: string | null;
  ip: string;
}

export interface PrefillReply {
  status: number;
  body: Record<string, unknown>;
}

export async function handlePrefillRequest(request: PrefillRequest, deps: PrefillDependencies): Promise<PrefillReply> {
  const { auditId, placeId } = request;
  if (!isPrefillRequest(auditId, placeId)) return { status: 400, body: { error: 'invalid_input' } };
  if (!deps.rateLimit(`site-bot-prefill:ip:${request.ip}`, PREFILL_IP_LIMIT).allowed) return { status: 429, body: { error: 'rate_limited' } };
  if (!deps.rateLimit(`site-bot-prefill:audit:${auditId}`, PREFILL_AUDIT_LIMIT).allowed) return { status: 429, body: { error: 'rate_limited' } };

  const record = await deps.readAudit(auditId!);
  const candidate = record?.candidates.find(item => item.placeId === placeId);
  if (!candidate) return { status: 404, body: { error: 'not_found' } };

  if (deps.mode === 'fixture') {
    try {
      return { status: 200, body: { status: 'ready', snapshot: buildFixtureSnapshot(candidate) } };
    } catch {
      deps.logFailure?.('PREFILL_FIXTURE_FAILED');
      return { status: 502, body: { error: 'prefill_failed' } };
    }
  }

  if (!deps.hasLiveKey()) return { status: 503, body: { error: 'prefill_unavailable' } };
  try {
    const snapshot = await deps.fetchSnapshot(candidate.placeId);
    if (snapshot.placeId !== candidate.placeId) throw new Error('mismatch');
    return { status: 200, body: { status: 'ready', snapshot } };
  } catch {
    deps.logFailure?.('PREFILL_PLACES_FAILED');
    return { status: 502, body: { error: 'prefill_failed' } };
  }
}
