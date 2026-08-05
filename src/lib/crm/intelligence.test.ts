import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyDigest, type CampaignConfig, type LeadRecord } from './intelligence';

/**
 * Real-behavior tests for `buildWeeklyDigest`'s live-conversion accuracy fix (Aug 2026):
 * Retter and AAAsada run on their own domain (retter.co.il / aaasada.com), not a WAO-hosted
 * `/lp/[slug]` page, so `leads.json` (WAO's internal CRM) is correctly always empty for them
 * — their real leads are tracked exclusively by Google Ads' own native conversion tracking.
 * Before this fix, `totals.leads`/`totals.verifiedLeads`/`totals.cpl` were computed
 * exclusively from the (always-empty, for these two) CRM, permanently showing 0 leads /
 * undefined CPL even while real conversions existed in the Ads account.
 *
 * See `docs/specs/priority-3-search-term-cleanup-scoring.md` §4A.4 for the CPL formula this
 * builds on, and `PerformanceSnapshot.conversions`'s doc comment in `intelligence.ts` for the
 * "additive, opt-in, no blending" design rationale.
 */

function makeCampaign(overrides: Partial<CampaignConfig> = {}): CampaignConfig {
  return {
    customerId: '8344335641',
    slug: 'retter',
    businessName: 'רטר',
    avgJobValue: 24500,
    closeRateEstimate: 0.05,
    verifiedLeadConversionResourceName: null,
    closedDealConversionResourceName: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

test('performance.conversions provided (live Google Ads pull) → digest uses it as the source of truth for leads/verifiedLeads/cpl, even though the CRM has zero matching leads', () => {
  const campaign = makeCampaign();
  const leads: LeadRecord[] = []; // leads.json is correctly always empty for Retter/AAAsada

  const digest = buildWeeklyDigest({
    campaign,
    leads,
    performance: { spendMicros: 2_378_199_479, conversions: 10.204173 },
  });

  // Live conversions (rounded) become the lead/verified-lead count, not the CRM's 0.
  assert.equal(digest.totals.leads, 10);
  assert.equal(digest.totals.verifiedLeads, 10);
  // cpl = spendIls / verifiedLeads = 2378.199479 / 10 = 237.8199...
  assert.ok(digest.totals.cpl !== undefined);
  assert.ok(Math.abs((digest.totals.cpl as number) - 2378.199479 / 10) < 1e-6);
});

test('performance.conversions absent → falls back to existing CRM-based behavior, byte-for-byte unchanged (regression guard)', () => {
  const campaign = makeCampaign({ customerId: 'crm-client-1', slug: 'crm-client-1' });
  const leads: LeadRecord[] = [
    { id: 1, slug: 'crm-client-1', date: new Date().toISOString(), quality: 'GOOD' },
    { id: 2, slug: 'crm-client-1', date: new Date().toISOString(), quality: 'GOOD' },
    { id: 3, slug: 'crm-client-1', date: new Date().toISOString(), quality: 'BAD' },
  ];

  // No `performance` at all — the pre-existing CRM-only estimated-pacing path.
  const digestNoPerformance = buildWeeklyDigest({ campaign, leads });
  assert.equal(digestNoPerformance.totals.leads, 3);
  assert.equal(digestNoPerformance.totals.verifiedLeads, 2);
  assert.equal(digestNoPerformance.totals.cpl, undefined); // no spendIls pulled

  // `performance` present but with spendMicros only (today's pre-fix shape, e.g. a client
  // still on the CRM path whose upstream caller only ever populated spendMicros) — must
  // still fall back to the CRM-derived leads/verifiedLeads exactly as before this fix.
  const digestSpendOnly = buildWeeklyDigest({
    campaign,
    leads,
    performance: { spendMicros: 1_000_000_000 }, // ₪1000
  });
  assert.equal(digestSpendOnly.totals.leads, 3);
  assert.equal(digestSpendOnly.totals.verifiedLeads, 2);
  assert.equal(digestSpendOnly.totals.cpl, 500); // 1000 / 2 verified leads
});

test('performance.conversions === 0 (live pull confirms zero conversions) is still treated as the source of truth, not silently ignored', () => {
  const campaign = makeCampaign();
  const leads: LeadRecord[] = [];

  const digest = buildWeeklyDigest({
    campaign,
    leads,
    performance: { spendMicros: 0, conversions: 0 },
  });

  assert.equal(digest.totals.leads, 0);
  assert.equal(digest.totals.verifiedLeads, 0);
  // cpl stays undefined when verifiedLeads === 0, same rule as the CRM path (§4A.4 scope note).
  assert.equal(digest.totals.cpl, undefined);
});
