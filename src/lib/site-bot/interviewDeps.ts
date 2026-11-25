/**
 * Site Bot step 2a: the production wiring of interviewFlow.ts (the interview routes' paid handlers import only this and
 * interviewFlow). Also the shared request helpers of those routes: a bounded JSON reader and the reply shape.
 *
 * Work-location trade (which businesses are asked where they work): the business's launch category from its Places
 * profile (profileEligibility.ts tradeScope), else the trade name the owner confirmed on the card (taxonomy exact name or
 * synonym). One mapping beyond the allow-list: a non-blocked primaryType 'educational_institution' counts as a tutor
 * (the recorded tutors come back that way, fixtures/places-trade-scope-2026-11-25.json; schools are on the block list).
 *
 * Server-only. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import { resolveGbpCategory } from '../gbp/categoryTaxonomy';
import type { AuditCandidateSnapshot } from './auditStore';
import { findAuditCandidate, claimInterviewStart } from './offerState';
import { tradeScope } from './profileEligibility';
import { isLaunchTrade } from './launchTrades';
import { withLaunchStore, type LaunchStore } from './launchStore';
import { parseSpotTtlMs } from './interviewSession';
import { startInterviewResearch } from './interviewResearch';
import { withServedAreaNames } from './servedAreas';
import { ISRAELI_LOCALITIES } from './israeliLocalities';
import { sendWaitlistAlert } from './waitlistAlert';
import type { InterviewDeps } from './interviewFlow';

export function interviewCategoryOf(candidate: AuditCandidateSnapshot): string | null {
  const scope = tradeScope(candidate);
  if (scope.scope === 'in_scope') return scope.categoryId;
  if (scope.scope === 'unknown' && candidate.primaryType?.trim().toLowerCase() === 'educational_institution') return 'gcid:tutoring_service';
  return null;
}

export function interviewCategoryOfNiche(niche: string): string | null {
  const id = resolveGbpCategory(niche).matched?.categoryId ?? null;
  return id && isLaunchTrade(id) ? id : null;
}

export function defaultInterviewDeps(): InterviewDeps {
  return {
    withStore: <T>(fn: (store: LaunchStore) => T, fallback: T) => withLaunchStore(fn, fallback),
    claimSpot: (auditId, placeId) => claimInterviewStart(auditId, placeId),
    findCandidate: async (auditId, placeId) => {
      const found = await findAuditCandidate(auditId, placeId);
      return found.kind === 'found' ? found.candidate : null;
    },
    categoryOf: interviewCategoryOf,
    categoryOfNiche: interviewCategoryOfNiche,
    normalizeCollected: data => withServedAreaNames(data, ISRAELI_LOCALITIES),
    startResearch: session => { startInterviewResearch(session); },
    alertWaitlist: entry => { void sendWaitlistAlert(entry); },
    ttlMs: parseSpotTtlMs(),
    now: () => new Date(),
  };
}

export const INTERVIEW_MAX_BODY_BYTES = 64 * 1024;

/** JSON body, content-type application/json, at most maxBytes (streamed count); null for anything else. */
export async function boundedInterviewJson(req: Request, maxBytes: number = INTERVIEW_MAX_BODY_BYTES): Promise<unknown> {
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || !req.body) return null;
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  const reader = req.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return null; }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
