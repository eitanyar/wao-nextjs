import { leadMatchesClientIndex } from './ownership.js';

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
 * for an owned lead, with `conversionUpload` reporting 'ok' | 'failed'.
 *
 * @param {object} params
 * @param {number} params.leadId
 * @param {'GOOD'|'JUNK'|undefined} params.quality
 * @param {{ revenue: number } | undefined} params.closed
 * @param {Array<any>} params.leads
 * @param {{ campaigns?: Array<{slug?:string, customerId?:string}> } | null} params.clientIndex
 * @param {(leads: Array<any>) => Promise<void>} params.writeLeads
 * @param {(args: { leadId: number, type: 'verified-lead'|'closed-deal' }) => Promise<any>} params.uploadLeadConversion
 * @returns {Promise<{ status: number, body: any }>}
 */
export async function applyClientLeadFeedback({
  leadId,
  quality,
  closed,
  leads,
  clientIndex,
  writeLeads,
  uploadLeadConversion,
}) {
  const lead = leads.find((l) => l.id === leadId);
  if (!lead || !leadMatchesClientIndex(lead, clientIndex)) {
    return { status: 403, body: { success: false, error: 'This lead does not belong to your account' } };
  }

  let updatedLead;
  let conversionType = null;

  if (quality === 'GOOD' || quality === 'JUNK') {
    updatedLead = { ...lead, quality };
    if (quality === 'GOOD') conversionType = 'verified-lead';
  } else if (closed && typeof closed.revenue === 'number') {
    const closedAt = new Date().toISOString();
    updatedLead = { ...lead, closed: true, closedAt, revenue: closed.revenue, quality: 'GOOD' };
    conversionType = 'closed-deal';
  } else {
    return { status: 400, body: { success: false, error: 'Invalid feedback body — expected { quality } or { closed: { revenue } }' } };
  }

  const updatedLeads = leads.map((l) => (l.id === leadId ? updatedLead : l));
  await writeLeads(updatedLeads);

  let conversionUpload = 'not_applicable';
  if (conversionType) {
    try {
      await uploadLeadConversion({ leadId, type: conversionType });
      conversionUpload = 'ok';
    } catch (err) {
      // Logged loudly per §1.2 — discoverable in PM2 logs, never swallowed,
      // and never allowed to affect the response below.
      console.error(`[client/leads] uploadLeadConversion(${conversionType}) failed for lead ${leadId}:`, err);
      conversionUpload = 'failed';
    }
  }

  return { status: 200, body: { success: true, lead: updatedLead, conversionUpload } };
}
