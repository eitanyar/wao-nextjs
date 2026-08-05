/**
 * Pure client-ownership check for a lead.
 *
 * Same strictness as `buildWeeklyDigest`'s own scoping filter in
 * `intelligence.ts` as of the Aug 2026 data-quality fix (no untagged-lead
 * wildcard on either) — this helper returns `false` for a lead with neither
 * `slug` nor `customerId` set, and additionally checks membership against
 * ALL of a client's bound campaigns (`GoogleAdsClientIndex.campaigns[]`),
 * not just `primarySlug`, so a client with more than one campaign isn't
 * wrongly locked out of leads from a non-primary one.
 *
 * See docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §1.2.
 *
 * Written as plain JS (not the surrounding intelligence.ts) so it can be
 * imported directly by `node --test` for real-behavior assertions, matching
 * the existing convention in this codebase for logic that needs genuine unit
 * tests rather than source-text regex checks (see `access-policy.js`,
 * `live-readiness.js`, `delivery-model.js`). `intelligence.ts` re-exports the
 * spec-mandated `isLeadOwnedByClient(lead, clientId)` signature as a thin
 * wrapper that loads the client's index and delegates here.
 *
 * @param {{ slug?: string, customerId?: string }} lead
 * @param {{ campaigns?: Array<{ slug?: string, customerId?: string }> } | null} clientIndex
 * @returns {boolean}
 */
export function leadMatchesClientIndex(lead, clientIndex) {
  if (!clientIndex) return false;
  if (!lead || (!lead.slug && !lead.customerId)) return false;

  const campaigns = Array.isArray(clientIndex.campaigns) ? clientIndex.campaigns : [];
  return campaigns.some((campaign) =>
    (lead.slug && campaign.slug === lead.slug) ||
    (lead.customerId && campaign.customerId === lead.customerId)
  );
}
