/**
 * Noa r3 (docs/copy/site-bot-fact-templates-2026-11-10.json, item 4): a contractor (credentialTier 'contractor') answers
 * "are you a registered contractor?" rather than typing a licence. The answer is stored in CollectedData.license as a code
 * value, never as the chip label, so ownerFacts can tell it from a typed licence and never routes it through
 * trustLicense / proofLicense:
 *   - yes, no detail      -> CONTRACTOR_REGISTERED_VALUE
 *   - yes, typed detail   -> `${CONTRACTOR_REGISTERED_VALUE}${CONTRACTOR_DETAIL_SEPARATOR}<detail verbatim>`
 *   - no                  -> nothing is stored
 * The detail is guarded at render time (ownerFactCopy: proofContractorRegisteredDetail), never here.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. Pure and browser-safe.
 */

export const CONTRACTOR_REGISTERED_VALUE = 'registered contractor';
export const CONTRACTOR_DETAIL_SEPARATOR = ' | ';

/** The stored licence value of a registered contractor (the detail trimmed; empty = no detail). */
export function contractorLicenseValue(detail?: string): string {
  const text = (detail ?? '').replace(/\s+/g, ' ').trim();
  return text ? `${CONTRACTOR_REGISTERED_VALUE}${CONTRACTOR_DETAIL_SEPARATOR}${text}` : CONTRACTOR_REGISTERED_VALUE;
}

/** A stored contractor value: { detail } (null = none), or null when the licence value is not a contractor answer. */
export function parseContractorLicense(value: unknown): { detail: string | null } | null {
  if (typeof value !== 'string') return null;
  const text = value.normalize('NFC').trim();
  if (text === CONTRACTOR_REGISTERED_VALUE) return { detail: null };
  const head = `${CONTRACTOR_REGISTERED_VALUE}${CONTRACTOR_DETAIL_SEPARATOR}`;
  if (!text.startsWith(head)) return null;
  const detail = text.slice(head.length).trim();
  return { detail: detail || null };
}
