import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  computeDelayDays,
  evaluateChangeCaps,
  evaluateGraduation,
  evaluateRollback,
  graduationWindows,
  isInPhase2Freeze,
  n4BudgetIls,
  rollbackWindows,
  type GraduationInput,
  type GraduationLead,
  type RollbackInput,
} from './bidding-graduation';
import { campaignPhaseState, readPhase, recordGoalChange, recordTransition, biddingPhasePath, evaluateSignalIntegritySoak } from './bidding-phase-state.js';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const CAMPAIGN = '111';
// Sunday 10.1.2027 07:00 Israel (winter, +02:00).
const SUNDAY_0700 = new Date('2027-01-10T05:00:00Z');

const leadDate = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ');
const iso = (d: Date) => d.toISOString();

type TransitionResult = ReturnType<typeof recordTransition>;
/** Narrows a recordTransition result to its ok branch (fails the test otherwise). */
function ok(r: TransitionResult): Extract<TransitionResult, { ok: true }> {
  assert.equal(r.ok, true, JSON.stringify(r));
  return r as Extract<TransitionResult, { ok: true }>;
}

/** 16 GOOD paid leads in the G2 window, marked 2 days after arrival (D = 3), 2 closed. */
function passingLeads(now: Date): GraduationLead[] {
  const leads: GraduationLead[] = [];
  for (let i = 0; i < 16; i++) {
    const created = new Date(now.getTime() - (5 + i * 3) * DAY);
    const marked = new Date(created.getTime() + 2 * DAY);
    leads.push({
      id: i + 1,
      date: leadDate(created),
      quality: 'GOOD',
      qualityMarkedAt: iso(marked),
      gclid: `g-${i}`,
      acquisitionChannel: 'google_ads',
      verifiedUpload: { status: 'ok', at: iso(marked), attempts: 1 },
      ...(i < 2 ? { closed: true, closedAt: iso(new Date(created.getTime() + 3 * DAY)) } : {}),
    });
  }
  return leads;
}

function passingInput(now: Date = SUNDAY_0700, overrides: Partial<GraduationInput> = {}): GraduationInput {
  const w = graduationWindows(now, 3);
  return {
    now,
    campaignId: CAMPAIGN,
    state: { signalIntegritySince: iso(new Date(now.getTime() - 100 * DAY)) },
    firstImpressionAt: iso(new Date(now.getTime() - 60 * DAY)),
    leads: passingLeads(now),
    stats: {
      g2: { range: w.g2, verified: 16, costIls: 1600 },
      last30: { range: w.last30, verified: 8 },
      last14: { range: w.last14, verified: 3 },
      cpc30: { range: w.cpc30, verified: 0, costIls: 900, clicks: 300 },
    },
    ceilingIls: 150,
    recentChanges: [],
    openTrackingAuditTask: false,
    policyAllowsKind: true,
    ...overrides,
  };
}

function withStats(input: GraduationInput, patch: Partial<Record<keyof GraduationInput['stats'], Record<string, number>>>): GraduationInput {
  const stats = { ...input.stats };
  for (const [k, v] of Object.entries(patch) as Array<[keyof GraduationInput['stats'], Record<string, number>]>) stats[k] = { ...stats[k], ...v };
  return { ...input, stats };
}

function assertBlockedOnly(result: ReturnType<typeof evaluateGraduation>, gate: string) {
  assert.equal(result.decision, 'blocked', `expected blocked on ${gate}`);
  assert.deepEqual(result.blockedBy, [gate], `expected only ${gate} to fail, got ${result.blockedBy.join(',')}`);
  assert.equal(result.reason, `graduation_gate:${gate}`);
}

// ---------------------------------------------------------------------------------------------
// A3
// ---------------------------------------------------------------------------------------------

test('A3: the passing fixture graduates with baseline, ceiling, phase-1 CPC and D', () => {
  const r = evaluateGraduation(passingInput());
  assert.deepEqual(r.blockedBy, []);
  assert.equal(r.decision, 'graduate');
  assert.equal(r.delayDays, 3);
  assert.equal(r.baselineCpl, 100);
  assert.equal(r.baselineVerifiedCount, 16);
  assert.equal(r.ceiling, 150);
  assert.equal(r.phase1AvgCpcIls, 3);
  assert.equal(r.n4BudgetIls, undefined);
  assert.deepEqual(r.gates.map((g) => g.id), ['INPUT', 'G1', 'G2', 'G2b', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10']);
  for (const g of r.gates) assert.ok('value' in g && 'threshold' in g && typeof g.pass === 'boolean');
});

test('A3 G1: 44 days blocks, 45 passes; an unsoaked state blocks', () => {
  const now = SUNDAY_0700;
  assertBlockedOnly(evaluateGraduation(passingInput(now, { firstImpressionAt: iso(new Date(now.getTime() - 44 * DAY)) })), 'G1');
  assert.equal(evaluateGraduation(passingInput(now, { firstImpressionAt: iso(new Date(now.getTime() - 45 * DAY)) })).decision, 'graduate');
  assertBlockedOnly(evaluateGraduation(passingInput(now, { firstImpressionAt: null })), 'G1');
  assertBlockedOnly(evaluateGraduation(passingInput(now, { state: { signalIntegritySince: iso(new Date(now.getTime() - 10 * DAY)) } })), 'G1');
  assertBlockedOnly(evaluateGraduation(passingInput(now, { state: null })), 'G1');
});

test('A3 G2: 14 in 60 days blocks, 15 passes', () => {
  assertBlockedOnly(evaluateGraduation(withStats(passingInput(), { g2: { verified: 14, costIls: 1400 } })), 'G2');
  assert.equal(evaluateGraduation(withStats(passingInput(), { g2: { verified: 15, costIls: 1500 } })).decision, 'graduate');
});

test('A3 G2b: 4/5 in 30 days and 1/2 in 14 days', () => {
  assertBlockedOnly(evaluateGraduation(withStats(passingInput(), { last30: { verified: 4 } })), 'G2b');
  assert.equal(evaluateGraduation(withStats(passingInput(), { last30: { verified: 5 } })).decision, 'graduate');
  assertBlockedOnly(evaluateGraduation(withStats(passingInput(), { last14: { verified: 1 } })), 'G2b');
  assert.equal(evaluateGraduation(withStats(passingInput(), { last14: { verified: 2 } })).decision, 'graduate');
});

test('A3 G3: 1 closed job in 90 days blocks, 2 pass; a close older than 90 days does not count', () => {
  const input = passingInput();
  const oneClosed = input.leads.map((l, i) => (i === 1 ? { ...l, closed: false, closedAt: null } : l));
  assertBlockedOnly(evaluateGraduation({ ...input, leads: oneClosed }), 'G3');
  const oldClose = input.leads.map((l, i) => (i === 1 ? { ...l, closedAt: iso(new Date(SUNDAY_0700.getTime() - 91 * DAY)) } : l));
  assertBlockedOnly(evaluateGraduation({ ...input, leads: oldClose }), 'G3');
});

test('A3 G4: 69% of paid leads older than 3 days marked blocks, 70% passes', () => {
  const now = SUNDAY_0700;
  const base = passingLeads(now);
  const extra = (junk: number, unmarked: number): GraduationLead[] => {
    const out: GraduationLead[] = [];
    for (let i = 0; i < junk + unmarked; i++) {
      const created = new Date(now.getTime() - (4 + (i % 50)) * DAY);
      out.push({
        id: 1000 + i,
        date: leadDate(created),
        gclid: `x-${i}`,
        ...(i < junk ? { quality: 'JUNK', qualityMarkedAt: iso(new Date(created.getTime() + 2 * DAY)) } : { quality: 'PENDING' }),
      });
    }
    return out;
  };
  // 16 GOOD + 53 JUNK + 31 unmarked = 69/100; 16 + 54 + 30 = 70/100.
  assertBlockedOnly(evaluateGraduation(passingInput(now, { leads: [...base, ...extra(53, 31)] })), 'G4');
  assert.equal(evaluateGraduation(passingInput(now, { leads: [...base, ...extra(54, 30)] })).decision, 'graduate');
  // Leads younger than 3 days are not counted.
  const young: GraduationLead = { id: 5000, date: leadDate(new Date(now.getTime() - 2 * DAY)), gclid: 'y', quality: 'PENDING' };
  assert.equal(evaluateGraduation(passingInput(now, { leads: [...base, ...extra(54, 30), young] })).decision, 'graduate');
});

test('A3 G5: 89% upload success blocks, 90% passes; a failure in 72h blocks; reconciliation ±20%', () => {
  const now = SUNDAY_0700;
  const base = passingLeads(now).map((lead) => ({ ...lead, verifiedUpload: undefined }));
  const uploads = (ok: number, failed: number, failedAgoHours = 5 * 24): GraduationLead[] =>
    Array.from({ length: ok + failed }, (_, i) => ({
      id: 2000 + i,
      verifiedUpload: { status: i < ok ? 'ok' : 'failed', at: iso(new Date(now.getTime() - (i < ok ? 2 * DAY : failedAgoHours * HOUR))), attempts: 1 },
    }));
  assertBlockedOnly(evaluateGraduation(passingInput(now, { leads: [...base, ...uploads(89, 11)] })), 'G5');
  assert.equal(evaluateGraduation(passingInput(now, { leads: [...base, ...uploads(90, 10)] })).decision, 'graduate');
  assertBlockedOnly(evaluateGraduation(passingInput(now, { leads: [...base, ...uploads(99, 1, 71)] })), 'G5');
  assert.equal(evaluateGraduation(passingInput(now, { leads: [...base, ...uploads(99, 1, 73)] })).decision, 'graduate');
  // Google 20 vs CRM 16 = +25% → blocked; 19 = +18.75% → passes.
  assertBlockedOnly(evaluateGraduation(withStats(passingInput(now), { g2: { verified: 20, costIls: 1600 } })), 'G5');
  assert.equal(evaluateGraduation(withStats(passingInput(now), { g2: { verified: 19, costIls: 1600 } })).decision, 'graduate');
});

test('A3 G6: cost equal to the ceiling passes, ₪1 above fails, an unknown ceiling blocks', () => {
  assert.equal(evaluateGraduation(passingInput(SUNDAY_0700, { ceilingIls: 100 })).decision, 'graduate');
  assertBlockedOnly(evaluateGraduation(withStats(passingInput(SUNDAY_0700, { ceilingIls: 100 }), { g2: { verified: 16, costIls: 1616 } })), 'G6');
  assertBlockedOnly(evaluateGraduation(passingInput(SUNDAY_0700, { ceilingIls: undefined })), 'G6');
});

test('A3 G7: a change 6 days ago blocks, 8 days ago passes; an open tracking_audit task blocks', () => {
  const now = SUNDAY_0700;
  assertBlockedOnly(evaluateGraduation(passingInput(now, { recentChanges: [{ at: iso(new Date(now.getTime() - 6 * DAY)), kind: 'budget' }] })), 'G7');
  assert.equal(evaluateGraduation(passingInput(now, { recentChanges: [{ at: iso(new Date(now.getTime() - 8 * DAY)), kind: 'keyword' }] })).decision, 'graduate');
  assertBlockedOnly(evaluateGraduation(passingInput(now, { openTrackingAuditTask: true })), 'G7');
});

test('A3 G8: Wednesday blocked; Sunday 07:00 passes; 05:59 and 12:00 blocked; blackout within 3 days blocked', () => {
  const wednesday = new Date('2027-01-13T05:00:00Z');
  assertBlockedOnly(evaluateGraduation(passingInput(wednesday)), 'G8');
  assert.equal(evaluateGraduation(passingInput(SUNDAY_0700)).decision, 'graduate');
  assert.equal(evaluateGraduation(passingInput(new Date('2027-01-10T04:00:00Z'))).decision, 'graduate', 'Sunday 06:00');
  assertBlockedOnly(evaluateGraduation(passingInput(new Date('2027-01-10T03:59:00Z'))), 'G8');
  assertBlockedOnly(evaluateGraduation(passingInput(new Date('2027-01-10T10:00:00Z'))), 'G8');
  // Sunday 18.4.2027 07:00 (+03:00): Erev Pesach is Wednesday 21.4 → within 3 days.
  const r = evaluateGraduation(passingInput(new Date('2027-04-18T04:00:00Z')));
  assertBlockedOnly(r, 'G8');
  assert.match(String(r.gates.find((g) => g.id === 'G8')!.value), /^blackout:2027-04-21/);
  // Summer time: Tuesday 30.3.2027 11:59 (+03:00) passes, 12:00 blocks.
  assert.equal(evaluateGraduation(passingInput(new Date('2027-03-30T08:59:00Z'))).decision, 'graduate');
  assertBlockedOnly(evaluateGraduation(passingInput(new Date('2027-03-30T09:00:00Z'))), 'G8');
  // Outside the calendar's coverage → fail closed.
  assert.equal(evaluateGraduation(passingInput(new Date('2028-01-09T05:00:00Z'))).gates.find((g) => g.id === 'G8')!.value, 'calendar_not_covered');
});

test('A3 G9 and G10: policy false blocks; cooldown and two rollbacks block', () => {
  assertBlockedOnly(evaluateGraduation(passingInput(SUNDAY_0700, { policyAllowsKind: false })), 'G9');
  const soaked = { signalIntegritySince: iso(new Date(SUNDAY_0700.getTime() - 100 * DAY)) };
  const cooldown = { ...soaked, campaigns: { [CAMPAIGN]: { phase: 'rolled_back', rollbackCount: 1, cooldownUntil: iso(new Date(SUNDAY_0700.getTime() + DAY)), transitions: [] } } };
  assertBlockedOnly(evaluateGraduation(passingInput(SUNDAY_0700, { state: cooldown })), 'G10');
  const twice = { ...soaked, campaigns: { [CAMPAIGN]: { phase: 'rolled_back', rollbackCount: 2, transitions: [] } } };
  assertBlockedOnly(evaluateGraduation(passingInput(SUNDAY_0700, { state: twice })), 'G10');
});

test('A3 INPUT: stats read for a different window block', () => {
  const input = passingInput();
  const shifted = { ...input, stats: { ...input.stats, g2: { ...input.stats.g2, range: graduationWindows(SUNDAY_0700, 10).g2 } } };
  assertBlockedOnly(evaluateGraduation(shifted), 'INPUT');
});

test('A3 D: floor 3, cap 10, p75 nearest-rank, and 10 with fewer than 5 samples', () => {
  const now = SUNDAY_0700;
  const marked = (lags: number[]) => lags.map((lag, i) => {
    const created = new Date(now.getTime() - (30 + i) * DAY);
    return { id: i, date: leadDate(created), quality: i % 2 ? 'JUNK' : 'GOOD', qualityMarkedAt: iso(new Date(created.getTime() + lag * DAY)) };
  });
  assert.equal(computeDelayDays(marked([1, 1, 1, 1, 1]), now).delayDays, 3);
  assert.equal(computeDelayDays(marked([20, 20, 20, 20, 25]), now).delayDays, 10);
  assert.equal(computeDelayDays(marked([1, 1, 1, 1]), now).delayDays, 10);
  assert.equal(computeDelayDays(marked([1, 2, 5, 6, 7]), now).delayDays, 6);
  assert.equal(computeDelayDays([], now).delayDays, 10);
  // Unmarked leads and marks older than 60 days are not samples.
  const old = marked([1, 1, 1, 1, 1]).map((l) => ({ ...l, qualityMarkedAt: iso(new Date(now.getTime() - 61 * DAY)) }));
  assert.equal(computeDelayDays(old, now).samples, 0);
  // The evaluator's windows follow D.
  const w3 = graduationWindows(now, 3);
  assert.deepEqual(w3.g2, { startDate: '2026-11-09', endDate: '2027-01-07' });
  assert.deepEqual(graduationWindows(now, 10).last14, { startDate: '2026-12-18', endDate: '2026-12-31' });
});

test('A3 N4: G1 passed, 90+ days, G2 short → ceil(15 × CPL / 2) rounded up to ₪100', () => {
  assert.equal(n4BudgetIls(100), 800);
  assert.equal(n4BudgetIls(80), 600);
  assert.equal(n4BudgetIls(133.4), 1100);
  const now = SUNDAY_0700;
  const old = passingInput(now, { firstImpressionAt: iso(new Date(now.getTime() - 95 * DAY)) });
  const short = evaluateGraduation(withStats(old, { g2: { verified: 10, costIls: 1000 } }));
  assert.equal(short.decision, 'blocked');
  assert.equal(short.n4BudgetIls, 800);
  const young = passingInput(now, { firstImpressionAt: iso(new Date(now.getTime() - 89 * DAY)) });
  assert.equal(evaluateGraduation(withStats(young, { g2: { verified: 10, costIls: 1000 } })).n4BudgetIls, undefined);
  assert.equal(evaluateGraduation(old).n4BudgetIls, undefined, 'G2 passing → no N4');
});

test('A3: the graduation module sets no target and imports nothing that applies recommendations', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/google-ads/bidding-graduation.ts'), 'utf8');
  assert.doesNotMatch(source, /target_cpa|targetCpa/i);
  assert.doesNotMatch(source, /^import .*recommendation/im);
  assert.doesNotMatch(source, /from ['"].*(mutations|google-ads-api|executor|autonomy)['"]/);
});

// ---------------------------------------------------------------------------------------------
// A4
// ---------------------------------------------------------------------------------------------

const SWITCH_AT = new Date('2027-01-10T05:00:00Z');

function phase2State(extra: Record<string, unknown> = {}) {
  return {
    signalIntegritySince: '2026-09-01T00:00:00.000Z',
    campaigns: {
      [CAMPAIGN]: {
        phase: 'phase2_learning',
        rollbackCount: 0,
        lastGraduationAt: iso(SWITCH_AT),
        transitions: [{
          at: iso(SWITCH_AT), from: 'phase1_clicks', to: 'phase2_learning', actionId: 'grad-1', strategyChange: true,
          baseline: { cplIls: 100, verifiedCount: 30, windowDays: 60 }, ceiling: 150, phase1AvgCpcIls: 3,
          before: { biddingStrategyType: 'TARGET_SPEND', cpcBidCeilingMicros: 15_000_000 },
        }],
        ...extra,
      },
    },
  };
}

/** Five JUNK marks with a 1-day lag → D = 3, and nothing in the reconciliation count. */
function delayLeads(now: Date): GraduationLead[] {
  return Array.from({ length: 5 }, (_, i) => {
    const created = new Date(now.getTime() - (8 + i) * DAY);
    return { id: 300 + i, date: leadDate(created), quality: 'JUNK', qualityMarkedAt: iso(new Date(created.getTime() + DAY)) };
  });
}

function rollbackInput(day: number, s: Partial<Record<'r1' | 'r2' | 'sinceSwitch' | 'cpc14' | 'recon30', Record<string, number>>> = {}, overrides: Partial<RollbackInput> = {}): RollbackInput {
  const now = new Date(SWITCH_AT.getTime() + day * DAY);
  const w = rollbackWindows(now, iso(SWITCH_AT), 3);
  const stat = (k: 'r1' | 'r2' | 'sinceSwitch' | 'cpc14' | 'recon30', defaults: Record<string, number>) => ({ range: { startDate: w[k].startDate, endDate: w[k].endDate }, verified: 0, ...defaults, ...(s[k] ?? {}) });
  return {
    now,
    campaignId: CAMPAIGN,
    state: phase2State(),
    policy: { mode: 'autonomous', killSwitch: false },
    leads: delayLeads(now),
    dailyBudgetIls: 50,
    stats: {
      r1: stat('r1', { verified: 6, costIls: 600 }),
      r2: stat('r2', { verified: 3, costIls: 300 }),
      sinceSwitch: stat('sinceSwitch', { verified: 4, costIls: 500 }),
      cpc14: stat('cpc14', { verified: 0, costIls: 300, clicks: 100 }),
      recon30: stat('recon30', { verified: 0 }),
    },
    ...overrides,
  };
}

test('A4: a healthy phase-2 campaign does nothing; learning becomes active after day 14', () => {
  const r = evaluateRollback(rollbackInput(10));
  assert.equal(r.action, 'none');
  assert.equal(r.delayDays, 3);
  assert.equal(r.nextPhase, null);
  assert.equal(evaluateRollback(rollbackInput(15)).nextPhase, 'phase2_active');
});

test('A4 R1: needs both conditions; +40% but under the ceiling → no rollback', () => {
  // Day 16: r1 window = days 1..13. 2 verified at ₪140 = +40% vs baseline 100, under ceiling 150.
  const under = evaluateRollback(rollbackInput(16, { r1: { verified: 2, costIls: 280 } }));
  assert.equal(under.action, 'none');
  assert.equal(under.rules.find((x) => x.id === 'R1')!.evaluable, true);
  const over = evaluateRollback(rollbackInput(16, { r1: { verified: 2, costIls: 320 } }));
  assert.equal(over.action, 'rollback');
  assert.equal(over.firedRule, 'R1');
  assert.equal(over.nextPhase, 'rolled_back');
  // Above a low ceiling (120) but under 1.3 × baseline (130) → no rollback.
  assert.equal(evaluateRollback(rollbackInput(16, { r1: { verified: 2, costIls: 250 } }, { ceilingIls: 120 })).action, 'none');
  // Day 14: not yet.
  assert.equal(evaluateRollback(rollbackInput(14, { r1: { verified: 2, costIls: 320 } })).rules.find((x) => x.id === 'R1')!.evaluable, false);
});

test('A4 R2: day 9 does not evaluate, day 10 rolls back on collapse with real spend', () => {
  const collapse = { r2: { verified: 1, costIls: 300 } };
  const d9 = evaluateRollback(rollbackInput(9, collapse));
  assert.equal(d9.action, 'none');
  assert.equal(d9.rules.find((x) => x.id === 'R2')!.evaluable, false);
  const d10 = evaluateRollback(rollbackInput(10, collapse));
  assert.equal(d10.action, 'rollback');
  assert.equal(d10.firedRule, 'R2');
  // Spend under 50% of budget → no rollback.
  assert.equal(evaluateRollback(rollbackInput(10, { r2: { verified: 1, costIls: 170 } })).action, 'none');
});

test('A4 R4: days 1–9, 3 × ceiling spent with zero verified while the baseline predicted ≥ 2', () => {
  const emergency = { sinceSwitch: { verified: 0, costIls: 450 } };
  const d5 = evaluateRollback(rollbackInput(5, emergency));
  assert.equal(d5.action, 'rollback');
  assert.equal(d5.firedRule, 'R4');
  assert.equal(evaluateRollback(rollbackInput(3, emergency)).action, 'none', 'baseline predicted 1.5 < 2');
  assert.equal(evaluateRollback(rollbackInput(5, { sinceSwitch: { verified: 0, costIls: 449 } })).action, 'none');
  assert.equal(evaluateRollback(rollbackInput(5, { sinceSwitch: { verified: 1, costIls: 900 } })).action, 'none');
});

test('A4 R6: needs both click price above 2× phase 1 and verified below the baseline rate', () => {
  const dear = { cpc14: { costIls: 700, clicks: 100 } };
  const both = evaluateRollback(rollbackInput(10, { ...dear, r1: { verified: 3, costIls: 300 } }));
  assert.equal(both.action, 'rollback');
  assert.equal(both.firedRule, 'R6');
  assert.equal(evaluateRollback(rollbackInput(10, { ...dear, r1: { verified: 4, costIls: 300 } })).action, 'none', 'verified at the baseline rate');
  assert.equal(evaluateRollback(rollbackInput(10, { cpc14: { costIls: 500, clicks: 100 }, r1: { verified: 3, costIls: 300 } })).action, 'none', 'click price under 2×');
});

test('A4 R0: never rolls back on missing or broken data, even when R4 would fire', () => {
  const emergency = { sinceSwitch: { verified: 0, costIls: 900 } };
  const now = new Date(SWITCH_AT.getTime() + 5 * DAY);
  const failing: GraduationLead = { id: 900, gclid: 'g', verifiedUpload: { status: 'failed', at: iso(new Date(now.getTime() - HOUR)), attempts: 4 } };
  const r = evaluateRollback(rollbackInput(5, emergency, { leads: [...delayLeads(now), failing] }));
  assert.equal(r.action, 'freeze');
  assert.equal(r.firedRule, 'R0');
  assert.equal(r.alert, true);
  assert.equal(evaluateRollback(rollbackInput(5, { ...emergency, recon30: { verified: 5 } })).action, 'freeze', 'reconciliation off');
  assert.equal(evaluateRollback(rollbackInput(5, emergency, { stats: null })).action, 'freeze', 'no stats');
  const noBaseline = phase2State();
  (noBaseline.campaigns[CAMPAIGN].transitions[0] as { baseline: unknown }).baseline = null;
  assert.equal(evaluateRollback(rollbackInput(5, emergency, { state: noBaseline })).action, 'freeze', 'no baseline');
});

test('A4 R5: kill switch or non-autonomous mode holds and alerts, never rolls back', () => {
  const emergency = { sinceSwitch: { verified: 0, costIls: 900 } };
  for (const policy of [{ mode: 'autonomous', killSwitch: true }, { mode: 'shadow', killSwitch: false }, null]) {
    const r = evaluateRollback(rollbackInput(5, emergency, { policy }));
    assert.equal(r.action, 'hold');
    assert.equal(r.firedRule, 'R5');
    assert.equal(r.alert, true);
  }
});

test('A4 caps: second graduation within 30 days blocked; rollback allowed on day 3; third change in 60 days blocked', () => {
  const now = SUNDAY_0700;
  const recent = campaignPhaseState({ campaigns: { [CAMPAIGN]: { phase: 'graduation_proposed', lastGraduationAt: iso(new Date(now.getTime() - 20 * DAY)), transitions: [] } } }, CAMPAIGN);
  assert.deepEqual(evaluateChangeCaps(recent, now, 'graduation').reason, 'graduation_within_30_days');

  const day3 = campaignPhaseState(phase2State(), CAMPAIGN);
  assert.equal(evaluateChangeCaps(day3, new Date(SWITCH_AT.getTime() + 3 * DAY), 'rollback').allowed, true);
  assert.equal(evaluateChangeCaps(day3, new Date(SWITCH_AT.getTime() + 3 * DAY), 'graduation').reason, 'already_in_phase2');

  const twoChanges = campaignPhaseState({ campaigns: { [CAMPAIGN]: {
    phase: 'rolled_back', rollbackCount: 1, cooldownUntil: iso(new Date(now.getTime() - DAY)), lastGraduationAt: iso(new Date(now.getTime() - 40 * DAY)),
    transitions: [
      { at: iso(new Date(now.getTime() - 40 * DAY)), to: 'phase2_learning', strategyChange: true },
      { at: iso(new Date(now.getTime() - 35 * DAY)), to: 'rolled_back', strategyChange: true },
    ],
  } } }, CAMPAIGN);
  assert.equal(evaluateChangeCaps(twoChanges, now, 'graduation').reason, 'max_changes_60_days');
  assert.equal(evaluateChangeCaps(twoChanges, new Date(now.getTime() + 21 * DAY), 'graduation').allowed, true, 'the first change left the 60-day window');
});

test('A4 state machine: transitions recorded atomically with full evidence; two rollbacks → manual_hold', () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bidding-graduation-'));
  try {
    recordGoalChange({ clientId: 'client-g', baseDir, at: '2026-11-01T00:00:00.000Z', customerId: '1', source: 'test' });
    const before = { biddingStrategyType: 'TARGET_SPEND', cpcBidCeilingMicros: 15_000_000, budgetMicros: 50_000_000 };
    const evidence = { baseline: { cplIls: 100, verifiedCount: 16, windowDays: 60 }, ceiling: 150, phase1AvgCpcIls: 3, before };
    assert.equal(readPhase('client-g', baseDir, CAMPAIGN)!.phase, 'phase1_clicks');

    const shadow = recordTransition({ clientId: 'client-g', baseDir, campaignId: CAMPAIGN, at: '2027-01-10T05:00:00.000Z', from: 'phase1_clicks', to: 'graduation_proposed', actionId: 'a-shadow', ...evidence });
    assert.equal(shadow.ok, true);
    assert.equal(ok(shadow).campaign.transitions[0].strategyChange, false);
    const dup = recordTransition({ clientId: 'client-g', baseDir, campaignId: CAMPAIGN, at: '2027-01-10T05:00:00.000Z', from: 'phase1_clicks', to: 'graduation_proposed', actionId: 'a-shadow', ...evidence });
    assert.equal(ok(dup).duplicate, true, 'same action id is idempotent');
    assert.equal(readPhase('client-g', baseDir, CAMPAIGN)!.transitions.length, 1);

    assert.deepEqual(recordTransition({ clientId: 'client-g', baseDir, campaignId: CAMPAIGN, at: '2027-01-10T06:00:00.000Z', from: 'phase1_clicks', to: 'phase2_learning', actionId: 'stale' }), { ok: false, error: 'phase_mismatch' });
    assert.deepEqual(recordTransition({ clientId: 'client-g', baseDir, campaignId: CAMPAIGN, at: '2027-01-10T06:00:00.000Z', from: 'graduation_proposed', to: 'phase2_active', actionId: 'skip' }), { ok: false, error: 'transition_not_allowed' });

    const live = recordTransition({ clientId: 'client-g', baseDir, campaignId: CAMPAIGN, at: '2027-01-11T05:00:00.000Z', from: 'graduation_proposed', to: 'phase2_learning', actionId: 'a-grad-1', ...evidence });
    assert.equal(live.ok, true);
    const t = ok(live).campaign.transitions[1];
    assert.deepEqual(
      { at: t.at, from: t.from, to: t.to, actionId: t.actionId, baseline: t.baseline, ceiling: t.ceiling, phase1AvgCpcIls: t.phase1AvgCpcIls, before: t.before, strategyChange: t.strategyChange },
      { at: '2027-01-11T05:00:00.000Z', from: 'graduation_proposed', to: 'phase2_learning', actionId: 'a-grad-1', ...evidence, strategyChange: true },
    );
    assert.equal(isInPhase2Freeze(ok(live).state, CAMPAIGN, new Date('2027-01-25T05:00:00.000Z')), true, 'day 14 frozen');
    assert.equal(isInPhase2Freeze(ok(live).state, CAMPAIGN, new Date('2027-01-26T05:00:00.000Z')), false, 'day 15 not frozen');

    const rb1 = recordTransition({ clientId: 'client-g', baseDir, campaignId: CAMPAIGN, at: '2027-01-14T05:00:00.000Z', from: 'phase2_learning', to: 'rolled_back', actionId: 'a-rb-1', rule: 'R4', ...evidence });
    assert.equal(ok(rb1).campaign.phase, 'rolled_back');
    assert.equal(ok(rb1).campaign.rollbackCount, 1);
    assert.equal(ok(rb1).campaign.cooldownUntil, '2027-02-13T05:00:00.000Z', '30-day cooldown');
    assert.equal(evaluateChangeCaps(ok(rb1).campaign, new Date('2027-02-01T05:00:00Z'), 'graduation').reason, 'cooldown');

    recordTransition({ clientId: 'client-g', baseDir, campaignId: CAMPAIGN, at: '2027-03-21T05:00:00.000Z', from: 'rolled_back', to: 'phase2_learning', actionId: 'a-grad-2', ...evidence });
    // The monitor already says the next rollback is the last one.
    const state = JSON.parse(fs.readFileSync(biddingPhasePath('client-g', baseDir)!, 'utf8'));
    assert.equal(campaignPhaseState(state, CAMPAIGN).rollbackCount, 1);
    const rb2 = recordTransition({ clientId: 'client-g', baseDir, campaignId: CAMPAIGN, at: '2027-03-25T05:00:00.000Z', from: 'phase2_learning', to: 'rolled_back', actionId: 'a-rb-2', rule: 'R4', ...evidence });
    assert.equal(ok(rb2).campaign.phase, 'manual_hold');
    assert.equal(ok(rb2).campaign.rollbackCount, 2);
    assert.equal(ok(rb2).campaign.transitions.at(-1)!.requestedTo, 'rolled_back');
    assert.equal(evaluateChangeCaps(ok(rb2).campaign, new Date('2027-06-01T05:00:00Z'), 'graduation').reason, 'manual_hold');
    assert.deepEqual(recordTransition({ clientId: 'client-g', baseDir, campaignId: CAMPAIGN, at: '2027-06-01T05:00:00.000Z', from: 'manual_hold', to: 'phase2_learning', actionId: 'a-x' }), { ok: false, error: 'transition_not_allowed' });

    // Existing step-0 fields survive; the soak check still reads them; no temp files remain.
    const final = JSON.parse(fs.readFileSync(biddingPhasePath('client-g', baseDir)!, 'utf8'));
    assert.equal(final.signalIntegritySince, '2026-11-01T00:00:00.000Z');
    assert.equal(final.phase, 'phase1_clicks', 'legacy account-level phase untouched');
    assert.equal(evaluateSignalIntegritySoak(final, new Date('2027-01-10T00:00:00Z')).ok, true);
    assert.deepEqual(fs.readdirSync(path.dirname(biddingPhasePath('client-g', baseDir)!)), ['bidding-phase.json']);
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
});

test('A4 state machine: bad input and an unwritable directory fail without leaving files', () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bidding-graduation-bad-'));
  try {
    assert.deepEqual(recordTransition({ clientId: '../x', baseDir, campaignId: CAMPAIGN, at: '2027-01-10T05:00:00.000Z', from: 'phase1_clicks', to: 'graduation_proposed', actionId: 'a' }), { ok: false, error: 'bad_input' });
    assert.deepEqual(recordTransition({ clientId: 'c', baseDir, campaignId: '../1', at: '2027-01-10T05:00:00.000Z', from: 'phase1_clicks', to: 'graduation_proposed', actionId: 'a' }), { ok: false, error: 'bad_input' });
    assert.equal(readPhase('c', baseDir, '../1'), null);
    // A file where the client directory should be → the write fails cleanly.
    fs.writeFileSync(path.join(baseDir, 'c'), 'not a dir');
    assert.deepEqual(recordTransition({ clientId: 'c', baseDir, campaignId: CAMPAIGN, at: '2027-01-10T05:00:00.000Z', from: 'phase1_clicks', to: 'graduation_proposed', actionId: 'a' }), { ok: false, error: 'write_failed' });
    assert.deepEqual(fs.readdirSync(baseDir), ['c']);
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
});
