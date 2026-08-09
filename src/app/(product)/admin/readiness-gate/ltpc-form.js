/**
 * Plain JS (not TS) so it can be unit-tested directly with `node --test`,
 * mirroring `src/app/(app)/admin/live-readiness/live-readiness-form.js`. No
 * Next.js or fs dependency here — pure form parsing/validation only.
 * Consumed by `./shared.ts`, which layers TypeScript types on top for the
 * page/action.
 *
 * Encodes the Lead-Tracking Provability Checklist (LTPC) — the six
 * universal go/no-go items (docs/specs/readiness-gate.md §5.2) plus the
 * bot-specific extras (§5.3).
 */

/** The six universal LTPC item ids, every applicable to every bot type. */
export const UNIVERSAL_ITEM_IDS = [
  'contact-inventory',
  'delivery-reliability',
  'intake-integrity',
  'no-unauth-exposure',
  'grading-path',
  'downstream-integrations',
];

/**
 * Bot-specific extra item ids (§5.3) — on top of the six universal items.
 * Site Bot and GMB Bot add none of their own (Site Bot's LTPC differs only
 * in *timing*, per §5.3, not in which items apply).
 */
export const BOT_SPECIFIC_ITEM_IDS = {
  'site-bot': [],
  'geo-bot': ['geo-action-log'],
  'content-bot': ['geo-action-log'],
  'ads-bot': ['gclid-capture'],
  'gmb-bot': [],
};

export const BOT_TYPES = Object.keys(BOT_SPECIFIC_ITEM_IDS);

/** @param {string} botType */
export function applicableItemIds(botType) {
  const extras = BOT_SPECIFIC_ITEM_IDS[botType] ?? [];
  return [...UNIVERSAL_ITEM_IDS, ...extras];
}

const VALID_STATUSES = ['pass', 'fail', 'not-checked'];

/**
 * Pure parsing/validation of a submitted LTPC form. Enforces:
 *  - clientId must match /^[a-z0-9-]+$/i (existence of the client dir is
 *    checked separately by the caller, since that needs fs access).
 *  - botType must be one of the known bot types.
 *  - only items applicable to the submitted botType are ever read/written.
 *  - a status of 'pass' on any item requires BOTH a non-empty per-item
 *    evidence string AND a non-empty global "checked by" name — a check
 *    that looks real but records nothing is worse than no check (§5.4,
 *    mirroring priority-5 §1.3's rejection of a bare attestation checkbox).
 *
 * @param {FormData} formData
 * @returns {
 *   | { ok: true, clientId: string, botType: string, checkedBy: string,
 *       items: Array<{ id: string, status: 'pass'|'fail'|'not-checked', evidence: string }> }
 *   | { ok: false, error: 'invalid-client' }
 *   | { ok: false, error: 'invalid-bot-type' }
 *   | { ok: false, error: 'missing-evidence', clientId: string, itemId: string }
 *   | { ok: false, error: 'missing-checked-by', clientId: string }
 * }
 */
export function parseLtpcSubmission(formData) {
  const clientId = (formData.get('clientId') ?? '').toString().trim();
  if (!clientId || !/^[a-z0-9-]+$/i.test(clientId)) {
    return { ok: false, error: 'invalid-client' };
  }

  const botType = (formData.get('botType') ?? '').toString().trim();
  if (!BOT_TYPES.includes(botType)) {
    return { ok: false, error: 'invalid-bot-type' };
  }

  const checkedBy = (formData.get('checkedBy') ?? '').toString().trim();
  const itemIds = applicableItemIds(botType);

  const items = [];
  let anyPass = false;
  for (const id of itemIds) {
    const rawStatus = (formData.get(`status-${id}`) ?? 'not-checked').toString().trim();
    const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'not-checked';
    const evidence = (formData.get(`evidence-${id}`) ?? '').toString().trim();

    if (status === 'pass') {
      anyPass = true;
      if (!evidence) {
        return { ok: false, error: 'missing-evidence', clientId, itemId: id };
      }
    }

    items.push({ id, status, evidence });
  }

  if (anyPass && !checkedBy) {
    return { ok: false, error: 'missing-checked-by', clientId };
  }

  return { ok: true, clientId, botType, checkedBy, items };
}

/**
 * @param {Array<{ id: string, status: string }>} items
 * @param {string} botType
 * @returns {boolean} true only when every item applicable to botType is 'pass'
 */
export function computeOverallPass(items, botType) {
  const required = new Set(applicableItemIds(botType));
  const byId = new Map(items.map(i => [i.id, i.status]));
  for (const id of required) {
    if (byId.get(id) !== 'pass') return false;
  }
  return required.size > 0;
}
