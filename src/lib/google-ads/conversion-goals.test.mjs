import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  BIDDING_CATEGORY,
  CATEGORY,
  WAO_ACTION_CATEGORIES,
  applyVerifiedLeadOnlyGoals,
  goalBackfillRefusals,
  isPrimaryConversionCategory,
  planConversionActionPrimaryUpdates,
  planGoalBiddabilityUpdates,
  planVerifiedLeadOnlyGoals,
} from './conversion-goals.js';
import { biddingPhasePath, readBiddingPhaseState, recordGoalChange } from './bidding-phase-state.js';

// ads-bot-phase2 spec §11 "Step 0" — 0a (verified-lead is the only primary / biddable goal).

const here = path.dirname(fileURLToPath(import.meta.url));
const routeSource = fs.readFileSync(path.join(here, '..', '..', 'app', 'api', 'google-ads', 'create-campaign', 'route.ts'), 'utf8');
const VERIFIED = 'customers/1725891566/conversionActions/7705676785';

test('0a: of the five WAO categories, exactly one (QUALIFIED_LEAD) is primary_for_goal', () => {
  const primaries = WAO_ACTION_CATEGORIES.filter((c) => isPrimaryConversionCategory(c));
  assert.deepEqual(primaries, [CATEGORY.QUALIFIED_LEAD]);
  assert.equal(BIDDING_CATEGORY, 22);
  assert.equal(isPrimaryConversionCategory('QUALIFIED_LEAD'), true);
  assert.equal(isPrimaryConversionCategory('CONVERTED_LEAD'), false);
});

test('0a: create-campaign sets primary_for_goal explicitly on all six actions (incl. AD_CALL calls from ads), true only for verified-lead', () => {
  const start = routeSource.indexOf('newCustomer.conversionActions.create([');
  const end = routeSource.indexOf(']);', start);
  assert.ok(start > 0 && end > start);
  const block = routeSource.slice(start, end);
  const objects = block.split(/\n {6}\{/).slice(1);
  assert.equal(objects.length, 6, 'six conversion actions (fix 2 adds the AD_CALL calls-from-ads action)');
  let primaryCount = 0;
  for (const obj of objects) {
    const category = obj.match(/category: enums\.ConversionActionCategory\.([A-Z_]+),/)?.[1];
    const primary = obj.match(/primary_for_goal: isPrimaryConversionCategory\(enums\.ConversionActionCategory\.([A-Z_]+)\),/)?.[1];
    assert.ok(category, 'each action has a category');
    assert.equal(primary, category, 'primary_for_goal is derived from the action\'s own category');
    if (isPrimaryConversionCategory(category)) primaryCount += 1;
  }
  assert.equal(primaryCount, 1);
  assert.equal((block.match(/primary_for_goal:/g) || []).length, 6);
  assert.match(routeSource, /configureVerifiedLeadOnlyGoals\(newCustomer, campaignResourceName, verifiedLeadConversionResourceName\)/);
});

test('0a: goal plan makes only QUALIFIED_LEAD biddable and skips rows already right', () => {
  const ops = planGoalBiddabilityUpdates([
    { resource_name: 'g/PHONE', category: 11, origin: 2, biddable: true },
    { resource_name: 'g/FORM', category: 13, origin: 2, biddable: true },
    { resource_name: 'g/CONTACT', category: 18, origin: 2, biddable: false },
    { resource_name: 'g/QL', category: 22, origin: 2, biddable: false },
    { resource_name: 'g/CL', category: 'CONVERTED_LEAD', origin: 2, biddable: true },
  ]);
  assert.deepEqual(ops.map((o) => [o.resource_name, o.biddable]), [['g/PHONE', false], ['g/FORM', false], ['g/QL', true], ['g/CL', false]]);
});

test('0a: action plan — verified-lead primary, every other enabled action secondary, removed ones ignored', () => {
  const ops = planConversionActionPrimaryUpdates([
    { resource_name: 'a/form', category: 13, status: 2, primary_for_goal: true },
    { resource_name: VERIFIED, category: 22, status: 2, primary_for_goal: true },
    { resource_name: 'a/closed', category: 23, status: 2 },
    { resource_name: 'a/removed', category: 13, status: 3, primary_for_goal: true },
  ], VERIFIED);
  assert.deepEqual(ops.map((o) => [o.resource_name, o.primary_for_goal]), [['a/form', false], ['a/closed', false]]);
});

test('0a: backfill refuses founder-managed accounts and accounts without a verified-lead action', () => {
  assert.equal(goalBackfillRefusals([], null).length, 1);
  const founder = [
    { resource_name: VERIFIED, category: 22, status: 2 },
    { resource_name: 'a/purchase', category: 4, status: 2 },
  ];
  assert.match(goalBackfillRefusals(founder, VERIFIED).join(' '), /outside the WAO set/);
  const wao = WAO_ACTION_CATEGORIES.map((c, i) => ({ resource_name: c === 22 ? VERIFIED : `a/${i}`, category: c, status: 2 }));
  assert.deepEqual(goalBackfillRefusals(wao, VERIFIED), []);
  assert.match(goalBackfillRefusals(wao, 'customers/1/conversionActions/404').join(' '), /not found/);
});

test('0a: applier passes validate_only through and sends only the planned fields', async () => {
  const sent = [];
  const svc = (name) => ({ update: async (ops, opts) => { sent.push({ name, ops, opts }); } });
  const customer = { conversionActions: svc('actions'), customerConversionGoals: svc('customer'), campaignConversionGoals: svc('campaign') };
  const plan = {
    actions: [{ resource_name: 'a/form', primary_for_goal: false, from: true, category: 13 }],
    customerGoals: [{ resource_name: 'g/FORM', biddable: false, from: true, category: 13, origin: 2 }],
    campaignGoals: [],
  };
  const applied = await applyVerifiedLeadOnlyGoals(customer, plan, { validateOnly: true });
  assert.deepEqual(applied, { actions: 1, customerGoals: 1, campaignGoals: 0 });
  assert.deepEqual(sent, [
    { name: 'actions', ops: [{ resource_name: 'a/form', primary_for_goal: false }], opts: { validate_only: true } },
    { name: 'customer', ops: [{ resource_name: 'g/FORM', biddable: false }], opts: { validate_only: true } },
  ]);
});

test('bidding-phase.json: goal change recorded atomically in a temp baseDir; signalIntegritySince kept', () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bidding-phase-'));
  assert.equal(biddingPhasePath('../escape', baseDir), null);
  assert.equal(biddingPhasePath('client-a', ''), null);
  const first = recordGoalChange({ clientId: 'client-a', baseDir, at: '2026-11-12T08:00:00.000Z', customerId: '1', source: 'test' });
  assert.equal(first.signalIntegritySince, '2026-11-12T08:00:00.000Z');
  assert.equal(first.phase, 'phase1_clicks');
  const second = recordGoalChange({ clientId: 'client-a', baseDir, at: '2026-11-20T08:00:00.000Z', customerId: '1', source: 'test' });
  assert.equal(second.signalIntegritySince, '2026-11-12T08:00:00.000Z');
  assert.equal(second.lastGoalChangeAt, '2026-11-20T08:00:00.000Z');
  assert.equal(readBiddingPhaseState('client-a', baseDir).goalChanges.length, 2);
  const dir = path.dirname(biddingPhasePath('client-a', baseDir));
  assert.deepEqual(fs.readdirSync(dir), ['bidding-phase.json'], 'no temp files left behind');
  assert.ok(biddingPhasePath('client-a', baseDir).startsWith(baseDir));
});

test('fix 2: the AD_CALL calls-from-ads action stays secondary and its goal is never biddable (read-back stays clean)', () => {
  // Google creates a PHONE_CALL_LEAD~CALL_FROM_ADS (origin 5) goal for the new action.
  const ops = planGoalBiddabilityUpdates([
    { resource_name: 'g/CALLS', category: 11, origin: 5, biddable: true },
    { resource_name: 'g/QL', category: 22, origin: 2, biddable: true },
  ]);
  assert.deepEqual(ops.map((o) => [o.resource_name, o.biddable]), [['g/CALLS', false]]);
  const clean = planVerifiedLeadOnlyGoals({
    actions: [
      { resource_name: 'a/QL', category: 22, status: 2, primary_for_goal: true },
      { resource_name: 'a/CALLS', category: 11, status: 2, type: 2, primary_for_goal: false },
    ],
    customerGoals: [{ resource_name: 'g/CALLS', category: 11, origin: 5, biddable: false }, { resource_name: 'g/QL', category: 22, origin: 2, biddable: true }],
    campaignGoals: [{ resource_name: 'cg/CALLS', category: 11, origin: 5, biddable: false }],
  }, 'a/QL');
  assert.equal(clean.actions.length + clean.customerGoals.length + clean.campaignGoals.length, 0);
  assert.deepEqual(goalBackfillRefusals([
    { resource_name: 'a/QL', category: 22, status: 2 },
    { resource_name: 'a/CALLS', category: 11, status: 2, type: 2 },
  ], 'a/QL'), []);
});
