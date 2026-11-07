/**
 * Response handling for the customer-facing Site Bot checkout screens
 * (paid-journey v2 M0.5, B9/B10).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. Fallback copy is passed
 * in by the caller, which owns the existing Hebrew strings.
 */

import type { CollectedData } from '../../bot/prompts';
import type { ResearchGate } from '../research/gates';

const HEBREW_LETTER = /[\u05D0-\u05EA]/;
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Text to show the customer for a failure. A server/exception message is shown only
 * when it is already Hebrew copy (the routes' own Hebrew errors); raw English codes
 * and runtime messages (`checkout_unavailable`, `Failed to fetch`, JSON parse errors)
 * become the caller's existing generic fallback.
 */
export function customerErrorText(candidate: unknown, fallback: string): string {
  return typeof candidate === 'string' && HEBREW_LETTER.test(candidate) ? candidate : fallback;
}

/** Parses a JSON object body; anything else (HTML error page, empty body, array) is `{}`. */
export async function readJsonBody(res: Pick<Response, 'json'>): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await res.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export interface CheckoutCallbackBody {
  success?: unknown;
  researchId?: unknown;
  collectedData?: unknown;
  openResearchGates?: unknown;
}

export type CheckoutCallbackOutcome =
  | { kind: 'error' }
  | { kind: 'gates'; researchId: string; collectedData: CollectedData; openResearchGates: ResearchGate[] }
  | { kind: 'done' };

/** A non-2xx response, or a 2xx without `success: true`, is an error: never `done`. */
export function checkoutCallbackOutcome(ok: boolean, body: CheckoutCallbackBody): CheckoutCallbackOutcome {
  if (!ok || body.success !== true) return { kind: 'error' };
  if (Array.isArray(body.openResearchGates) && body.openResearchGates.length > 0
    && typeof body.researchId === 'string' && body.researchId
    && body.collectedData && typeof body.collectedData === 'object' && !Array.isArray(body.collectedData)) {
    return {
      kind: 'gates',
      researchId: body.researchId,
      collectedData: body.collectedData as CollectedData,
      openResearchGates: body.openResearchGates as ResearchGate[],
    };
  }
  return { kind: 'done' };
}

/** The pay-page session ID from a checkout init response, or null (never navigate to /pay/undefined). */
export function checkoutInitSessionId(ok: boolean, body: { sessionId?: unknown }): string | null {
  return ok && typeof body.sessionId === 'string' && SESSION_ID.test(body.sessionId) ? body.sessionId : null;
}
