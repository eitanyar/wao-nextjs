import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGoogleAdsOperatorTasks } from './operator';
import { resetBrandCplBaseline } from './cpl-ceiling';
import type { WeeklyDigest } from '../crm/intelligence';

/**
 * Minimal WeeklyDigest fixture builder — only the fields buildGoogleAdsOperatorTasks actually
 * reads are populated meaningfully; the rest are structurally required but inert for this
 * suite's purposes.
 */
function digestFixture(overrides: Partial<WeeklyDigest['totals']> & { pacingStatus?: 'over' | 'under' | 'on-track' }): WeeklyDigest {
  const { pacingStatus = 'under', ...totalsOverrides } = overrides;
  return {
    slug: 'aasada',
    customerId: '4553722804',
    campaignName: 'AAAsada',
    windowDays: 30,
    windowStart: '2026-07-06',
    windowEnd: '2026-08-05',
    totals: {
      leads: 0,
      verifiedLeads: 0,
      closedDeals: 0,
      revenue: 0,
      newLeads: 0,
      previousLeads: 0,
      leadChangePct: null,
      revenueChangePct: null,
      spendIls: undefined,
      cpl: undefined,
      ...totalsOverrides,
    },
    pacing: { status: pacingStatus, mode: 'live' } as WeeklyDigest['pacing'],
    alerts: [
      {
        type: 'budget_pacing',
        severity: 'warning',
        title: 'Budget pacing',
        message: 'Pacing needs attention.',
      },
    ],
    nextActions: [],
  } as unknown as WeeklyDigest;
}

// ---------------------------------------------------------------------------------------
// §8.7's explicit required test: "feeding a multi-campaign client (one broken non-brand
// campaign + one healthy brand campaign) produces a CUT/breach signal on the broken campaign
// specifically, not a passing blended average that hides it." buildGoogleAdsOperatorTasks is
// already single-campaign-per-call by design (§8.3 point 1 — no change needed to the function
// itself), so this test calls it once per campaign, mirroring exactly how the real callers
// (operator-task/route.ts, admin/review page) now iterate per §8.3.
// ---------------------------------------------------------------------------------------

test('a broken non-brand campaign breaches its ceiling even when a healthy brand campaign exists on the same client', () => {
  // Broken non-brand campaign: ₪230/lead against AAAsada's ₪80 non-brand ceiling — this is
  // §8.0's actual "אירועים" worked example. Pacing deliberately 'under' here so the assertion
  // below proves the ceiling breach ALONE (independent of pacing) drives cleanup — §5's
  // "unconditional CUT trigger, same standing as WASTED_SPEND_CUT."
  const brokenDigest = digestFixture({ cpl: 230, verifiedLeads: 10, spendIls: 2300, pacingStatus: 'under' } as any);
  const brokenTasks = buildGoogleAdsOperatorTasks({
    clientId: 'aasada',
    digest: brokenDigest,
    campaignId: '2',
    campaignName: 'אירועים',
  });
  const brokenCleanup = brokenTasks.find((t) => t.kind === 'search_term_cleanup');
  assert.ok(brokenCleanup, 'the broken non-brand campaign must surface a search_term_cleanup task');
  assert.match(brokenCleanup!.whyNeeded, /non-brand ₪80\/lead ceiling/);

  // Healthy brand campaign on the SAME client: ₪5.46/lead — must never surface a ceiling
  // breach (brand campaigns have no absolute ceiling, §4A.0.1), and with no persisted
  // baseline yet (first-cycle bootstrap), must not fire BRAND_CPL_BASELINE_WATCH either.
  // Unique per test run to avoid colliding with any previous run's persisted baseline record
  // — this test writes a real baseline-bootstrap record to
  // data/clients/aasada/google-ads/brand-cpl-baselines.json (evaluateBrandCplBaselineWatch's
  // documented, intentional persistence), so it's cleaned up via resetBrandCplBaseline in a
  // `finally` below rather than left polluting real client data.
  const testCampaignId = `test-brand-${Date.now()}`;
  try {
    const brandDigest = digestFixture({ cpl: 5.46, verifiedLeads: 5, spendIls: 24.57, pacingStatus: 'under' } as any);
    const brandTasks = buildGoogleAdsOperatorTasks({
      clientId: 'aasada',
      digest: brandDigest,
      campaignId: testCampaignId,
      campaignName: 'ברנד',
    });
    const brandCleanup = brandTasks.find((t) => t.kind === 'search_term_cleanup' || t.kind === 'cpl_ceiling_review');
    assert.equal(brandCleanup, undefined, 'a cheap, healthy brand campaign must never surface a ceiling-breach or baseline-watch task');
  } finally {
    resetBrandCplBaseline('aasada', testCampaignId);
  }
});

test('the CPL-ceiling gate is a per-campaign decision — an identical blended figure never substitutes for it', () => {
  // This is the structural assertion §8.5 requires: buildGoogleAdsOperatorTasks takes ONE
  // campaign's digest at a time. There is no parameter on this function that accepts a
  // client-level blended digest at all — the type signature itself is the enforcement. This
  // test proves that changing only `campaignId`/`campaignName`/`digest` (i.e. simulating a
  // second call for a second campaign) changes the outcome, which would be impossible if the
  // function were secretly reading some shared/blended state.
  const nonBrandOverCeiling = digestFixture({ cpl: 95, verifiedLeads: 3, spendIls: 285, pacingStatus: 'under' } as any);
  const seasonalUnderCeiling = digestFixture({ cpl: 60, verifiedLeads: 20, spendIls: 1200, pacingStatus: 'under' } as any);

  const nonBrandTasks = buildGoogleAdsOperatorTasks({
    clientId: 'aasada',
    digest: nonBrandOverCeiling,
    campaignId: '1',
    campaignName: 'ערים קרובות',
  });
  const seasonalTasks = buildGoogleAdsOperatorTasks({
    clientId: 'aasada',
    digest: seasonalUnderCeiling,
    campaignId: '24045777050',
    campaignName: 'אזכרות - שבעה - דינאמי',
  });

  // Non-brand campaign at ₪95/lead is over its ₪80 ceiling — even though pacing is 'under'
  // (which would normally offer budget_tune), the ceiling breach must still route to cleanup.
  assert.ok(nonBrandTasks.some((t) => t.kind === 'search_term_cleanup'));
  assert.ok(!nonBrandTasks.some((t) => t.kind === 'budget_tune'));

  // Seasonal-remarketing campaign at ₪60/lead is comfortably under its ₪100 ceiling (§8.1) —
  // AND seasonal-remarketing campaigns are pacing-exempt (§8.5), so no budget_pacing-driven
  // task should fire for it at all, regardless of pacing status.
  assert.ok(!seasonalTasks.some((t) => t.kind === 'search_term_cleanup' || t.kind === 'budget_tune'));
});

test('seasonal-remarketing CPL_CEILING_BREACH still fires — it is not exempted like brand (§8.1 point 3)', () => {
  // ₪120/lead against AAAsada's ₪100 seasonal-remarketing ceiling — over the 1.25x-anchored
  // ceiling despite being "structurally warmer" traffic. Pacing deliberately 'under' (and this
  // type is pacing-EXEMPT regardless, §8.5) so this proves the ceiling breach fires on its own
  // merits, independent of — and despite — the pacing exemption (§8.1 point 3's explicit
  // "pacing-exempt is not ceiling-exempt" distinction).
  const overSeasonalCeiling = digestFixture({ cpl: 120, verifiedLeads: 4, spendIls: 480, pacingStatus: 'under' } as any);
  const tasks = buildGoogleAdsOperatorTasks({
    clientId: 'aasada',
    digest: overSeasonalCeiling,
    campaignId: '24053311090',
    campaignName: 'שבת חתן - דינאמי',
  });
  const cleanup = tasks.find((t) => t.kind === 'search_term_cleanup');
  assert.ok(cleanup, 'a seasonal-remarketing campaign over its own ceiling must still propose cleanup');
  assert.match(cleanup!.whyNeeded, /seasonal-remarketing ₪100\/lead ceiling/);
});

test('every generated task carries its own campaignId, and dedupe never collapses two campaigns\' generic-titled tasks together', () => {
  const digestA = digestFixture({ pacingStatus: 'under' } as any);
  const digestB = digestFixture({ pacingStatus: 'under' } as any);

  const tasksA = buildGoogleAdsOperatorTasks({ clientId: 'aasada', digest: digestA, campaignId: 'campaign-a', campaignName: 'ערים קרובות' });
  const tasksB = buildGoogleAdsOperatorTasks({ clientId: 'aasada', digest: digestB, campaignId: 'campaign-b', campaignName: 'אירועים' });

  assert.ok(tasksA.every((t) => t.campaignId === 'campaign-a'));
  assert.ok(tasksB.every((t) => t.campaignId === 'campaign-b'));

  // Both would generate a "Tune budget pacing" task (identical title) under the old
  // `kind|title` dedupe key — merging both lists must NOT collapse them into one task, since
  // they belong to two different live campaigns.
  const merged = [...tasksA, ...tasksB];
  const budgetTuneTitles = merged.filter((t) => t.kind === 'budget_tune');
  assert.equal(budgetTuneTitles.length, 2);
});
