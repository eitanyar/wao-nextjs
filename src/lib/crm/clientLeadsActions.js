import { leadMatchesClientIndex } from './ownership.js';
import { planUploadsForTrigger, runLeadConversionUploads, summarizeConversionUpload } from './leadConversionUploads.js';

/**
 * Applies a client-submitted lead-feedback action ({ quality } or { closed })
 * against a lead the client owns. Pure orchestration function, all I/O is
 * injected (`writeLeads`, `uploadLeadConversion`) so it's testable with real
 * behavior (no mocked fs/module internals) — see
 * docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §1.2/§2.3.
 *
 * Hard rule (§1.2): the CRM write is truth, the Ads push is best-effort. This
 * function always performs the write first and never lets a rejected
 * `uploadLeadConversion` call fail or revert it — the caller (the route)
 * always gets `{ status: 200, body: { success: true, conversionUpload } }`
 * for an owned lead, with `conversionUpload` reporting 'ok' | 'failed' | 'skipped'.
 *
 * ads-bot-phase2 spec §3 0c/0d (2026-11-12): the returned `UploadResult` is inspected (the
 * upload is non-throwing by contract, so "no throw" meant nothing) and persisted on the lead
 * as `verifiedUpload` / `closedUpload`. A close without a successful verified-lead upload
 * sends verified-lead first, then closed-deal. Persisting goes through `patchLead` when given
 * (locked re-read, so a concurrent write isn't clobbered); otherwise a second `writeLeads`.
 *
 * @param {object} params
 * @param {number} params.leadId
 * @param {'GOOD'|'JUNK'|undefined} params.quality
 * @param {{ revenue: number } | undefined} params.closed
 * @param {Array<any>} params.leads
 * @param {{ campaigns?: Array<{slug?:string, customerId?:string}> } | null} params.clientIndex
 * @param {(leads: Array<any>) => Promise<void>} params.writeLeads
 * @param {(args: { leadId: number, type: 'verified-lead'|'closed-deal' }) => Promise<any>} params.uploadLeadConversion
 * @param {(leadId: number, patch: object) => Promise<void>} [params.patchLead]
 * @param {() => Date} [params.now]
 * @returns {Promise<{ status: number, body: any }>}
 */
const QUALITY_MARKS = new Set(['GOOD', 'JUNK']);

/**
 * Sets `quality` and records when the owner marked it (post-launch week 1 spec, task A1). The
 * graduation evaluator's delay `D` is the p75 of lead-to-mark lag, so the first mark time must
 * survive repeat clicks: a repeat mark with the same quality keeps the existing
 * `qualityMarkedAt`; a changed mark (GOOD <-> JUNK) or a first mark sets it to `nowIso`; going
 * back to an unmarked quality (e.g. PENDING) drops it, since an unmarked lead has no mark time.
 * Pure; also used by the admin route (`src/app/api/leads/route.ts`).
 *
 * @template {{ quality?: string, qualityMarkedAt?: string }} L
 * @param {L} lead
 * @param {string} quality
 * @param {string} nowIso
 * @returns {L}
 */
export function withQualityMark(lead, quality, nowIso) {
  if (!QUALITY_MARKS.has(quality)) {
    const unmarked = { ...lead, quality };
    delete unmarked.qualityMarkedAt;
    return unmarked;
  }
  const keep = lead.quality === quality && typeof lead.qualityMarkedAt === 'string' && lead.qualityMarkedAt;
  return { ...lead, quality, qualityMarkedAt: keep ? lead.qualityMarkedAt : nowIso };
}

export async function applyClientLeadFeedback({
  leadId,
  quality,
  closed,
  leads,
  clientIndex,
  writeLeads,
  uploadLeadConversion,
  patchLead,
  now = () => new Date(),
}) {
  const lead = leads.find((l) => l.id === leadId);
  if (!lead || !leadMatchesClientIndex(lead, clientIndex)) {
    return { status: 403, body: { success: false, error: 'This lead does not belong to your account' } };
  }

  let updatedLead;
  /** @type {Array<'verified-lead'|'closed-deal'>} */
  let conversionTypes = [];

  if (quality === 'GOOD' || quality === 'JUNK') {
    updatedLead = withQualityMark(lead, quality, now().toISOString());
    if (quality === 'GOOD') conversionTypes = planUploadsForTrigger(lead, 'good');
  } else if (closed && typeof closed.revenue === 'number') {
    const closedAt = now().toISOString();
    updatedLead = { ...withQualityMark(lead, 'GOOD', closedAt), closed: true, closedAt, revenue: closed.revenue };
    conversionTypes = planUploadsForTrigger(lead, 'closed');
  } else {
    return { status: 400, body: { success: false, error: 'Invalid feedback body — expected { quality } or { closed: { revenue } }' } };
  }

  const updatedLeads = leads.map((l) => (l.id === leadId ? updatedLead : l));
  await writeLeads(updatedLeads);

  let conversionUpload = 'not_applicable';
  if (conversionTypes.length) {
    // Never throws (failures are logged loudly inside and mapped to outcomes), and never allowed
    // to affect the 200 below.
    const { patch, results } = await runLeadConversionUploads({ lead: updatedLead, types: conversionTypes, uploadLeadConversion, now });
    conversionUpload = summarizeConversionUpload(results);
    updatedLead = { ...updatedLead, ...patch };
    try {
      if (patchLead) await patchLead(leadId, patch);
      else await writeLeads(updatedLeads.map((l) => (l.id === leadId ? updatedLead : l)));
    } catch (err) {
      console.error(`[client/leads] persisting upload outcome failed for lead ${leadId}:`, err);
    }
  }

  return { status: 200, body: { success: true, lead: updatedLead, conversionUpload } };
}
