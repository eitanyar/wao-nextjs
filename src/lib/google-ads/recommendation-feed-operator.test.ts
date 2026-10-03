import assert from 'node:assert/strict';
import test from 'node:test';
import type { WeeklyDigest } from '../crm/intelligence';
import { buildGoogleAdsOperatorTasks } from './operator';

type Input = Parameters<typeof buildGoogleAdsOperatorTasks>[0];
type Candidate = NonNullable<Input['recommendations']>[number];
const tag = (resourceName: string, evidence: Partial<Candidate> = {}): Candidate => ({
  type: 'IMPROVE_GOOGLE_TAG_COVERAGE', resourceName, ...evidence,
});

function fixture(): WeeklyDigest {
  return {
    slug: 'synthetic-campaign',
    campaignName: 'Digest display name is not the Ads campaign name',
    windowDays: 7,
    totals: { cpl: undefined, verifiedLeads: 0 },
    pacing: { status: 'on-track', mode: 'live' },
    alerts: [],
    nextActions: [],
  } as unknown as WeeklyDigest;
}

function build(recommendations?: Candidate[], overrides: Partial<Input> = {}) {
  return buildGoogleAdsOperatorTasks({
    clientId: 'synthetic-client',
    digest: fixture(),
    campaignId: 'campaign-one',
    campaignName: 'Actual prospecting campaign',
    campaignAge: { phase: 'growth', ageDays: 30 },
    recommendations,
    ...overrides,
  });
}

const recommendationTasks = (tasks: ReturnType<typeof build>) =>
  tasks.filter((task) => task.taskId.startsWith('recommendation-'));

test('tag coverage becomes exactly one inert medium-risk audit with real campaign and lifecycle context', () => {
  const [task] = recommendationTasks(build([tag('customers/1/recommendations/tag-one')]));
  assert.ok(task);
  assert.equal(recommendationTasks(build([tag('customers/1/recommendations/tag-one')])).length, 1);
  assert.equal(task.clientId, 'synthetic-client');
  assert.equal(task.campaignId, 'campaign-one');
  assert.equal(task.campaignPhase, 'growth');
  assert.equal(task.campaignAgeDays, 30);
  assert.equal(task.kind, 'tracking_audit');
  assert.equal(task.risk, 'medium');
  assert.equal(task.source, 'alert');
  assert.match(task.title, /Google tag coverage/);
  assert.match(task.whyNeeded, /Actual prospecting campaign/);
  assert.doesNotMatch(task.whyNeeded, /Digest display name/);
  assert.match(task.recommendedAction, /engineer inspect Google tag and conversion coverage/);
  assert.match(task.taskId, /tag-one/);
  assert.equal(task.taskId, recommendationTasks(build([tag('customers/1/recommendations/tag-one')]))[0].taskId);
});

test('resource identity is collision-free across resources and campaigns, and duplicate resource is suppressed per campaign', () => {
  const one = recommendationTasks(build([tag('customers/1/recommendations/a'), tag('customers/1/recommendations/a'), tag('customers/1/recommendations/b')]));
  const two = recommendationTasks(build([tag('customers/1/recommendations/a')], { campaignId: 'campaign-two' }));
  const noId = recommendationTasks(build([tag('customers/1/recommendations/a')], { campaignId: undefined, campaignName: 'Another campaign' }));
  assert.equal(one.length, 2);
  assert.equal(two.length, 1);
  assert.equal(noId.length, 1);
  assert.equal(new Set([...one, ...two, ...noId].map((task) => task.taskId)).size, 4);
});

test('unknown, Reject, Conditional and other Allow types yield no recommendation tasks', () => {
  const candidates = [
    'FUTURE_UNKNOWN_TYPE', 'CAMPAIGN_BUDGET', 'KEYWORD', 'OPTIMIZE_AD_ROTATION', 'LEAD_FORM_ASSET',
  ].map((type, index) => ({ type, resourceName: `customers/1/recommendations/${index}` }));
  assert.deepEqual(recommendationTasks(build(candidates)), []);
});

test('blank or absent resource name fails closed', () => {
  assert.deepEqual(recommendationTasks(build([tag(''), tag('   '), tag(undefined as unknown as string)])), []);
});

test('a projected non-brand CPL above the accepted client ceiling is suppressed', () => {
  const candidate = tag('customers/1/recommendations/expensive', { projectedCostIls: 810, projectedConversions: 10 });
  const over = build([candidate], { clientId: 'aasada' });
  assert.deepEqual(recommendationTasks(over), []);
  const under = build([tag(candidate.resourceName, { projectedCostIls: 790, projectedConversions: 10 })], { clientId: 'aasada' });
  assert.equal(recommendationTasks(under).length, 1);
});

test('omitted and empty recommendations preserve digest-derived tasks and order', () => {
  const digest = fixture();
  digest.alerts = [{ type: 'no_leads', title: 'No leads', message: 'Inspect tracking', severity: 'warning' }] as WeeklyDigest['alerts'];
  digest.nextActions = ['Review search terms'];
  const overrides = { digest };
  assert.deepEqual(build(undefined, overrides), build([], overrides));
  assert.deepEqual(build(undefined, overrides).map(({ kind, order }) => [kind, order]),
    build([], overrides).map(({ kind, order }) => [kind, order]));
});

test('unknown and launch phases retain tag coverage audit tasks', () => {
  for (const campaignAge of [undefined, { phase: 'launch' as const, ageDays: 3 }]) {
    const tasks = recommendationTasks(build([tag('customers/1/recommendations/tag')], { campaignAge }));
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].campaignPhase, campaignAge?.phase ?? 'unknown');
    assert.equal(tasks[0].campaignAgeDays, campaignAge?.ageDays ?? null);
  }
});
