import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateCampaignAge } from './campaignAge';
import { buildGoogleAdsOperatorTasks } from './operator';
import type { CampaignConfig, WeeklyDigest } from '../crm/intelligence';

const referenceDate = new Date('2026-08-25T12:00:00Z');

const harvestCampaignConfig: CampaignConfig = {
  customerId: '123', slug: 'maturity-test', avgJobValue: 1000, closeRateEstimate: 0.5,
  verifiedLeadConversionResourceName: null, closedDealConversionResourceName: null,
  createdAt: '2026-01-01T00:00:00Z', cplCeilingIls: 100,
};

function digestFixture(): WeeklyDigest {
  return {
    slug: 'maturity-test',
    customerId: '123',
    campaignName: 'Maturity test',
    windowDays: 7,
    windowStart: '2026-08-18',
    windowEnd: '2026-08-25',
    totals: {
      leads: 0,
      verifiedLeads: 0,
      closedDeals: 0,
      revenue: 0,
      newLeads: 0,
      previousLeads: 0,
      leadChangePct: null,
      revenueChangePct: null,
    },
    pacing: { mode: 'estimated', expectedWeeklyLeads: 1, actualWeeklyLeads: 0, deviationPct: 100, status: 'under' },
    alerts: [
      { type: 'no_leads', severity: 'warning', title: 'No leads', message: 'Tracking requires review.' },
      { type: 'budget_pacing', severity: 'warning', title: 'Budget pacing', message: 'Budget requires review.' },
    ],
    nextActions: ['Review search terms and negatives.'],
  };
}

test('campaign age identifies deterministic lifecycle boundaries and fails closed for unusable dates', () => {
  const cases = [
    ['13 days', '2026-08-12T12:00:00Z', 'launch'],
    ['14 days', '2026-08-11T12:00:00Z', 'growth'],
    ['45 days', '2026-07-11T12:00:00Z', 'growth'],
    ['46 days', '2026-07-10T12:00:00Z', 'maturity'],
    ['invalid date', 'not-a-date', 'unknown'],
    ['future date', '2026-08-26T12:00:00Z', 'unknown'],
  ] as const;

  for (const [label, startDate, expectedPhase] of cases) {
    assert.equal(evaluateCampaignAge({ startDate, referenceDate }).phase, expectedPhase, label);
  }
  assert.equal(evaluateCampaignAge({ referenceDate }).phase, 'unknown');
});

test('campaign maturity controls mutations and attaches lifecycle evidence to every task', () => {
  const digest = digestFixture();
  const phases = [
    ['launch', '2026-08-12T12:00:00Z', ['tracking_audit', 'search_term_cleanup']],
    ['growth', '2026-08-11T12:00:00Z', ['tracking_audit', 'search_term_cleanup', 'budget_tune', 'search_term_harvest']],
    ['maturity', '2026-07-10T12:00:00Z', ['tracking_audit', 'search_term_cleanup', 'budget_tune', 'search_term_harvest']],
    ['unknown', undefined, ['tracking_audit']],
  ] as const;

  for (const [expectedPhase, startDate, expectedKinds] of phases) {
    const campaignAge = evaluateCampaignAge({ startDate, referenceDate });
    const tasks = buildGoogleAdsOperatorTasks({ clientId: 'maturity-test', digest, campaignAge, campaignConfig: harvestCampaignConfig });
    assert.deepEqual(tasks.map((task) => task.kind).sort(), [...expectedKinds].sort(), expectedPhase);
    assert.ok(tasks.every((task) => task.campaignPhase === expectedPhase), `${expectedPhase} task phase`);
    assert.ok(tasks.every((task) => task.campaignAgeDays === campaignAge.ageDays), `${expectedPhase} task age`);
  }
});
