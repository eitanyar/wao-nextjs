import { parseLeadDateUtc } from './leadDate.js';

/**
 * Offline-conversion upload orchestration per lead (ads-bot-phase2 spec §3 0c/0d/0e).
 *
 * - 0c: every upload's `UploadResult` is turned into a persisted `LeadUploadOutcome`
 *   (`lead.verifiedUpload` / `lead.closedUpload`). `uploadLeadConversion` is non-throwing by
 *   contract, so "it didn't throw" says nothing; the result has to be inspected.
 * - 0d: a close without a successful verified-lead upload sends verified-lead first (timestamped
 *   at lead creation, see `uploadLeadConversion`), then closed-deal. Google dedupes per
 *   conversion action by transactionId, so a repeat send is safe.
 * - 0e: `selectLeadsForUploadRetry` picks failed / pending_retry uploads, at most once a day per
 *   lead, until the click (≈ lead creation) is 85 days old.
 *
 * The CRM write is still the truth and happens before any of this. Nothing here may fail or
 * revert it. Plain `.js` (JSDoc types) so `clientLeadsActions.js` and its plain-node tests can
 * import it.
 */

export const UPLOAD_RETRY_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const UPLOAD_RETRY_MAX_CLICK_AGE_DAYS = 85;
const RETRYABLE = new Set(['failed', 'pending_retry']);
const MAX_ERROR_CHARS = 500;

/** @typedef {'verified-lead' | 'closed-deal'} ConversionType */
/**
 * @typedef {{ status: 'ok'|'failed'|'skipped_no_click_id'|'pending_retry', at: string, requestId?: string, error?: string, attempts: number }} LeadUploadOutcome
 */

/** @param {ConversionType} type */
export function outcomeField(type) {
  return type === 'verified-lead' ? 'verifiedUpload' : 'closedUpload';
}

/** @param {unknown} value */
function clip(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text && text.length > MAX_ERROR_CHARS ? `${text.slice(0, MAX_ERROR_CHARS - 1)}…` : text;
}

/**
 * Maps one `UploadResult` to a persisted outcome. Transient failures (5xx, 429) become
 * `pending_retry`; everything else that isn't a success or a no-click-id skip is `failed`.
 * Both are retried by the cycle.
 *
 * @param {any} result
 * @param {LeadUploadOutcome | undefined} previous
 * @param {Date} now
 * @returns {LeadUploadOutcome}
 */
export function outcomeFromUploadResult(result, previous, now) {
  const at = now.toISOString();
  const attempts = (previous?.attempts ?? 0) + 1;
  if (result && result.success === true) {
    return { status: 'ok', at, attempts, ...(result.requestId ? { requestId: String(result.requestId) } : {}) };
  }
  if (result && result.skipped === true) {
    return { status: 'skipped_no_click_id', at, attempts };
  }
  const status = Number(result?.status);
  const transient = status === 429 || status >= 500;
  const error = clip(result?.error ?? result?.partialError ?? 'upload returned no result');
  return { status: transient ? 'pending_retry' : 'failed', at, attempts, error };
}

/**
 * @param {unknown} err
 * @param {LeadUploadOutcome | undefined} previous
 * @param {Date} now
 * @returns {LeadUploadOutcome}
 */
export function outcomeFromThrow(err, previous, now) {
  return {
    status: 'pending_retry',
    at: now.toISOString(),
    attempts: (previous?.attempts ?? 0) + 1,
    error: clip(err instanceof Error ? err.message : String(err)),
  };
}

/**
 * Which uploads a CRM mark triggers, in order.
 *
 * @param {{ verifiedUpload?: LeadUploadOutcome }} lead the lead as stored before this mark
 * @param {'good' | 'closed'} trigger
 * @returns {ConversionType[]}
 */
export function planUploadsForTrigger(lead, trigger) {
  if (trigger === 'good') return ['verified-lead'];
  return lead?.verifiedUpload?.status === 'ok' ? ['closed-deal'] : ['verified-lead', 'closed-deal'];
}

/**
 * Runs the uploads in order and returns the outcome patch. Never throws.
 *
 * @param {{ lead: any, types: ConversionType[], uploadLeadConversion: (args: { leadId: number, type: ConversionType }) => Promise<any>, now?: () => Date }} params
 * @returns {Promise<{ patch: { verifiedUpload?: LeadUploadOutcome, closedUpload?: LeadUploadOutcome }, results: Array<{ type: ConversionType, outcome: LeadUploadOutcome }> }>}
 */
export async function runLeadConversionUploads({ lead, types, uploadLeadConversion, now = () => new Date() }) {
  /** @type {{ verifiedUpload?: LeadUploadOutcome, closedUpload?: LeadUploadOutcome }} */
  const patch = {};
  const results = [];
  for (const type of types) {
    const field = outcomeField(type);
    const previous = lead?.[field];
    let outcome;
    try {
      const result = await uploadLeadConversion({ leadId: lead.id, type });
      outcome = outcomeFromUploadResult(result, previous, now());
      if (outcome.status !== 'ok' && outcome.status !== 'skipped_no_click_id') {
        console.error(`[leadConversionUploads] ${type} upload ${outcome.status} for lead ${lead.id}:`, outcome.error);
      }
    } catch (err) {
      console.error(`[leadConversionUploads] ${type} upload threw for lead ${lead.id}:`, err);
      outcome = outcomeFromThrow(err, previous, now());
    }
    patch[field] = outcome;
    results.push({ type, outcome });
  }
  return { patch, results };
}

/**
 * Collapses a run into the route's legacy `conversionUpload` field: 'ok' only when every
 * attempted upload succeeded, 'skipped' when none had a click ID, else 'failed'.
 *
 * @param {Array<{ outcome: LeadUploadOutcome }>} results
 * @returns {'ok' | 'failed' | 'skipped' | 'not_applicable'}
 */
export function summarizeConversionUpload(results) {
  if (!results.length) return 'not_applicable';
  if (results.every((r) => r.outcome.status === 'skipped_no_click_id')) return 'skipped';
  return results.every((r) => r.outcome.status === 'ok') ? 'ok' : 'failed';
}

/** @param {LeadUploadOutcome | undefined} outcome */
function needsRetry(outcome) {
  return Boolean(outcome && RETRYABLE.has(outcome.status));
}

/**
 * Picks the uploads to retry this cycle (0e). A lead is retried at most once per 24h (measured
 * from its latest attempt of either type) and never once its click — approximated by
 * `lead.date`, the creation time — is 85+ days old (Google accepts 90). Leads with an
 * unparseable date are skipped rather than guessed.
 *
 * @param {any[]} leads
 * @param {Date} now
 * @param {{ maxClickAgeDays?: number, minIntervalMs?: number }} [options]
 * @returns {Array<{ leadId: number, types: ConversionType[] }>}
 */
export function selectLeadsForUploadRetry(leads, now, options = {}) {
  const maxClickAgeDays = options.maxClickAgeDays ?? UPLOAD_RETRY_MAX_CLICK_AGE_DAYS;
  const minIntervalMs = options.minIntervalMs ?? UPLOAD_RETRY_MIN_INTERVAL_MS;
  const selected = [];
  for (const lead of leads || []) {
    const verifiedRetry = needsRetry(lead.verifiedUpload);
    const closedRetry = Boolean(lead.closed) && needsRetry(lead.closedUpload);
    if (!verifiedRetry && !closedRetry) continue;

    const created = parseLeadDateUtc(lead.date);
    if (!created) continue;
    const clickAgeDays = (now.getTime() - created.getTime()) / 86_400_000;
    if (clickAgeDays >= maxClickAgeDays) continue;

    const lastAttempts = [lead.verifiedUpload?.at, lead.closedUpload?.at]
      .map((at) => (at ? new Date(at).getTime() : NaN))
      .filter((t) => Number.isFinite(t));
    const lastAttempt = lastAttempts.length ? Math.max(...lastAttempts) : 0;
    if (now.getTime() - lastAttempt < minIntervalMs) continue;

    /** @type {ConversionType[]} */
    const types = [];
    // A failed closed-deal on a lead whose verified-lead never landed re-sends verified first (0d).
    if (verifiedRetry || (closedRetry && lead.verifiedUpload?.status !== 'ok')) types.push('verified-lead');
    if (closedRetry) types.push('closed-deal');
    selected.push({ leadId: lead.id, types });
  }
  return selected;
}

/**
 * One retry pass over the given (already client-scoped) leads. `patchLead` persists each
 * lead's outcome patch; a persistence failure is logged and counted, never thrown.
 *
 * @param {{ leads: any[], now: Date, uploadLeadConversion: (args: { leadId: number, type: ConversionType }) => Promise<any>, patchLead: (leadId: number, patch: object) => Promise<void>, options?: { maxClickAgeDays?: number, minIntervalMs?: number } }} params
 * @returns {Promise<{ attempted: number, ok: number, failed: number, persistErrors: number, leads: Array<{ leadId: number, types: ConversionType[], statuses: string[] }> }>}
 */
export async function retryLeadConversionUploads({ leads, now, uploadLeadConversion, patchLead, options }) {
  const plan = selectLeadsForUploadRetry(leads, now, options);
  const summary = { attempted: 0, ok: 0, failed: 0, persistErrors: 0, leads: /** @type {any[]} */ ([]) };
  for (const item of plan) {
    const lead = leads.find((l) => l.id === item.leadId);
    const { patch, results } = await runLeadConversionUploads({ lead, types: item.types, uploadLeadConversion, now: () => now });
    summary.attempted += results.length;
    summary.ok += results.filter((r) => r.outcome.status === 'ok').length;
    summary.failed += results.filter((r) => r.outcome.status !== 'ok').length;
    try {
      await patchLead(item.leadId, patch);
    } catch (err) {
      summary.persistErrors += 1;
      console.error(`[leadConversionUploads] persisting retry outcome failed for lead ${item.leadId}:`, err);
    }
    summary.leads.push({ leadId: item.leadId, types: item.types, statuses: results.map((r) => r.outcome.status) });
  }
  return summary;
}
