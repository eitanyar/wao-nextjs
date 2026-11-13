/**
 * Ads Bot phase 2: pure graduation evaluator, rollback monitor and change caps
 * (docs/specs/post-launch-week1-phase2-nurture-tasks-fable52-2026-11-13.md, tasks A3 + A4;
 * gates per docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md §1.6, founder-approved).
 *
 * Phase 2 = Maximize Conversions with NO target. Nothing here sets, computes or returns a
 * target CPA (phase 3 is out of scope), calls Google, reads files or applies recommendations.
 * `now` is always passed in.
 *
 * How a caller (task A6) uses it:
 *   1. `computeDelayDays(leads, now)` → D.
 *   2. `graduationWindows(now, D)` (or `rollbackWindows(now, switchedAt, D)`) → the Israel-date
 *      ranges to read from Google (task A5 readers).
 *   3. `evaluateGraduation(...)` / `evaluateRollback(...)` with those counts. The evaluator
 *      recomputes D and the windows and blocks (gate `INPUT`) if the stats were read for
 *      different ranges, so a stale or mis-built input can never pass.
 *
 * All windows are Israel calendar dates, inclusive (Google's `segments.date` is account-local
 * and Ads Bot accounts are created in Asia/Jerusalem).
 */
import { addDaysIso, daysBetweenIso, isIsraelBlackoutDate, isIsraelCalendarCovered, israelDate, israelLocalParts } from '../calendar/il-calendar';
import { campaignPhaseState, evaluateSignalIntegritySoak, MAX_ROLLBACKS } from './bidding-phase-state.js';
import { parseLeadDateUtc } from '../crm/leadDate.js';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

// ---- thresholds (volume-reality §1.6 + post-launch spec A3/A4) -------------------------------
export const GRADUATION_MIN_AGE_DAYS = 45;
export const G2_WINDOW_DAYS = 60;
export const G2_MIN_VERIFIED = 15;
export const G2B_30_MIN = 5;
export const G2B_14_MIN = 2;
export const G3_WINDOW_DAYS = 90;
export const G3_MIN_CLOSED = 2;
export const G4_MIN_MARKED_SHARE = 0.7;
export const G4_MIN_LEAD_AGE_DAYS = 3;
export const G5_MIN_UPLOAD_SUCCESS = 0.9;
export const G5_NO_FAILURE_HOURS = 72;
export const G5_RECONCILIATION_TOLERANCE = 0.2;
export const G7_STABILITY_DAYS = 7;
export const G8_WEEKDAYS: ReadonlyArray<number> = [0, 1, 2]; // Sunday–Tuesday
export const G8_START_MINUTE = 6 * 60;
export const G8_END_MINUTE = 12 * 60; // exclusive
export const G8_BLACKOUT_LOOKAHEAD_DAYS = 3;
export const DELAY_MIN_DAYS = 3;
export const DELAY_MAX_DAYS = 10;
export const DELAY_MIN_SAMPLES = 5;
export const DELAY_SAMPLE_WINDOW_DAYS = 60;
export const N4_MIN_AGE_DAYS = 90;
export const GRADUATION_MIN_INTERVAL_DAYS = 30;
export const STRATEGY_CHANGE_WINDOW_DAYS = 60;
export const MAX_STRATEGY_CHANGES_IN_WINDOW = 2;
export const PHASE2_LEARNING_DAYS = 14;

export const R0_UPLOAD_FAILING_HOURS = 72;
export const R0_RECONCILIATION_TOLERANCE = 0.35;
export const R1_FROM_DAY = 15;
export const R1_CPL_MULTIPLIER = 1.3;
export const R2_FROM_DAY = 10;
export const R2_VOLUME_SHARE = 0.4;
export const R2_SPEND_SHARE = 0.5;
export const R4_LAST_DAY = 9;
export const R4_SPEND_CEILINGS = 3;
export const R4_MIN_PREDICTED = 2;
export const R6_FROM_DAY = 10;
export const R6_CPC_MULTIPLIER = 2;
/** R1/R2/R6 need at least this many post-switch days in their (delay-adjusted) window. */
export const ROLLBACK_MIN_WINDOW_DAYS = 7;

// ---- types ------------------------------------------------------------------------------------

export interface DateRange {
  /** Israel date, inclusive. */
  startDate: string;
  /** Israel date, inclusive. */
  endDate: string;
}

export interface WindowStats {
  range: DateRange;
  /** Google-recorded verified-lead conversions (`metrics.conversions` of the verified-lead action). */
  verified: number;
  costIls?: number;
  clicks?: number;
}

export interface UploadOutcomeLike {
  status?: string;
  at?: string;
  attempts?: number;
}

/** The fields of a CRM `LeadRecord` the evaluator reads. Pass this campaign's leads only. */
export interface GraduationLead {
  id?: number;
  date?: string;
  quality?: string;
  qualityMarkedAt?: string;
  closed?: boolean;
  closedAt?: string | null;
  status?: string;
  gclid?: string | null;
  wbraid?: string | null;
  gbraid?: string | null;
  acquisitionChannel?: string;
  verifiedUpload?: UploadOutcomeLike;
}

export interface RecentChange {
  at: string;
  /** e.g. 'budget' | 'keyword' | 'ad' | 'geo' | 'goal' (from change_event + our own log). */
  kind: string;
}

export type GateId = 'INPUT' | 'G1' | 'G2' | 'G2b' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8' | 'G9' | 'G10';

export interface GateResult {
  id: GateId;
  value: number | string | boolean | null;
  threshold: number | string | boolean;
  pass: boolean;
  detail?: Record<string, unknown>;
}

export interface GraduationStats {
  /** G2 / G6 / G5-reconciliation window: 60 days ending D days ago. `costIls` required. */
  g2: WindowStats;
  /** G2b: 30 days ending D days ago. */
  last30: WindowStats;
  /** G2b: 14 days ending D days ago. */
  last14: WindowStats;
  /** Phase-1 average click price: the 30 complete days before today. `costIls` + `clicks` required. */
  cpc30: WindowStats;
}

export interface GraduationInput {
  now: Date;
  campaignId: string;
  /** Parsed `bidding-phase.json` (or null). Supplies the soak (G1) and the history caps (G10). */
  state: Record<string, unknown> | null;
  /** ISO instant of the campaign's first impression; null blocks G1. */
  firstImpressionAt: string | null;
  leads: GraduationLead[];
  stats: GraduationStats;
  /** From `resolveCplCeilingIls` (cpl-ceiling.ts); the caller resolves it. Undefined blocks G6. */
  ceilingIls: number | undefined;
  recentChanges: RecentChange[];
  openTrackingAuditTask: boolean;
  /** G9: `evaluateAutonomousAction` allows `bid_strategy_graduation` (checked in A6). */
  policyAllowsKind: boolean;
}

export interface GraduationResult {
  decision: 'graduate' | 'blocked';
  gates: GateResult[];
  /** Failing gate ids in order; empty when graduating. */
  blockedBy: GateId[];
  /** `graduation_gate:<ids>` when blocked (event reason), else null. */
  reason: string | null;
  delayDays: number;
  delaySamples: number;
  windows: ReturnType<typeof graduationWindows>;
  /** 60-day cost per verified lead (the rollback baseline); null when there were no conversions. */
  baselineCpl: number | null;
  /** Verified conversions in the 60-day baseline window. */
  baselineVerifiedCount: number;
  baselineWindowDays: number;
  ceiling: number | null;
  /** Phase-1 30-day average click price (₪); null without clicks. */
  phase1AvgCpcIls: number | null;
  /** N4: monthly budget (₪, rounded up to 100) that would reach 15 verified leads in 60 days. */
  n4BudgetIls?: number;
}

// ---- small helpers ----------------------------------------------------------------------------

function ms(value: unknown): number {
  if (typeof value !== 'string' || !value) return NaN;
  return new Date(value).getTime();
}

function leadCreatedMs(lead: GraduationLead): number {
  return parseLeadDateUtc(lead.date)?.getTime() ?? NaN;
}

function hasClickId(lead: GraduationLead): boolean {
  return Boolean(lead.gclid || lead.wbraid || lead.gbraid);
}

function isPaid(lead: GraduationLead): boolean {
  return lead.acquisitionChannel === 'google_ads' || hasClickId(lead);
}

function isMarked(lead: GraduationLead): boolean {
  return lead.quality === 'GOOD' || lead.quality === 'JUNK';
}

function isClosed(lead: GraduationLead): boolean {
  return Boolean(lead.closed) || lead.status === 'closed';
}

function inRange(isoDate: string, range: DateRange): boolean {
  return isoDate >= range.startDate && isoDate <= range.endDate;
}

function sameRange(a: DateRange | undefined, b: DateRange): boolean {
  return Boolean(a) && a!.startDate === b.startDate && a!.endDate === b.endDate;
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

// ---- delay D ----------------------------------------------------------------------------------

/**
 * `D = max(3, p75 of lead-to-mark lag over 60 days, capped at 10)`, from `qualityMarkedAt`
 * (task A1). Samples: leads marked GOOD/JUNK in the last 60 days with a parseable creation
 * time. Fewer than 5 samples → 10. The p75 is nearest-rank, in fractional days, rounded up.
 */
export function computeDelayDays(leads: GraduationLead[], now: Date): { delayDays: number; samples: number; p75Days: number | null } {
  const nowMs = now.getTime();
  const lags: number[] = [];
  for (const lead of leads) {
    if (!isMarked(lead)) continue;
    const marked = ms(lead.qualityMarkedAt);
    const created = leadCreatedMs(lead);
    if (!Number.isFinite(marked) || !Number.isFinite(created) || marked > nowMs || nowMs - marked > DELAY_SAMPLE_WINDOW_DAYS * DAY_MS) continue;
    lags.push(Math.max(0, marked - created) / DAY_MS);
  }
  if (lags.length < DELAY_MIN_SAMPLES) return { delayDays: DELAY_MAX_DAYS, samples: lags.length, p75Days: null };
  lags.sort((a, b) => a - b);
  const p75 = lags[Math.ceil(0.75 * lags.length) - 1];
  return { delayDays: Math.min(DELAY_MAX_DAYS, Math.max(DELAY_MIN_DAYS, Math.ceil(p75 - 1e-9))), samples: lags.length, p75Days: p75 };
}

// ---- windows ----------------------------------------------------------------------------------

/** The Israel-date ranges the graduation evaluator expects counts for. */
export function graduationWindows(now: Date, delayDays: number) {
  const today = israelDate(now);
  const end = addDaysIso(today, -delayDays);
  return {
    today,
    g2: { startDate: addDaysIso(end, -(G2_WINDOW_DAYS - 1)), endDate: end },
    last30: { startDate: addDaysIso(end, -29), endDate: end },
    last14: { startDate: addDaysIso(end, -13), endDate: end },
    cpc30: { startDate: addDaysIso(today, -30), endDate: addDaysIso(today, -1) },
  };
}

// ---- upload health (G5, R0) -------------------------------------------------------------------

export interface UploadHealth {
  attempts30d: number;
  ok30d: number;
  successRate: number | null;
  failedLast72h: number;
  /** Hours the verified upload has been failing without any success since; null when not failing. */
  failingForHours: number | null;
}

/**
 * Verified-lead upload health from the per-lead outcomes (step 0c). Each lead keeps only its
 * latest attempt (`at`) and an `attempts` count; retries run at most once a day, so a failing
 * lead's first failure is estimated as `at − (attempts − 1) days`.
 * `failingForHours`: time since the latest successful upload (or, with none, since the
 * earliest estimated first failure), counted only while a failed / pending upload is newer
 * than that success.
 */
export function computeUploadHealth(leads: GraduationLead[], now: Date): UploadHealth {
  const nowMs = now.getTime();
  let attempts30d = 0;
  let ok30d = 0;
  let failedLast72h = 0;
  let lastOk = -Infinity;
  let latestFailure = -Infinity;
  let earliestFailureStart = Infinity;
  for (const lead of leads) {
    const u = lead.verifiedUpload;
    if (!u || typeof u !== 'object') continue;
    const at = ms(u.at);
    if (!Number.isFinite(at) || at > nowMs) continue;
    const failing = u.status === 'failed' || u.status === 'pending_retry';
    if (u.status === 'ok') lastOk = Math.max(lastOk, at);
    if (failing) {
      latestFailure = Math.max(latestFailure, at);
      const attempts = Number.isInteger(u.attempts) && (u.attempts as number) > 0 ? (u.attempts as number) : 1;
      earliestFailureStart = Math.min(earliestFailureStart, at - (attempts - 1) * DAY_MS);
      if (u.status === 'failed' && nowMs - at < G5_NO_FAILURE_HOURS * HOUR_MS) failedLast72h += 1;
    }
    if ((u.status === 'ok' || failing) && nowMs - at <= 30 * DAY_MS) {
      attempts30d += 1;
      if (u.status === 'ok') ok30d += 1;
    }
  }
  let failingForHours: number | null = null;
  if (latestFailure > lastOk) {
    const since = Number.isFinite(lastOk) ? lastOk : earliestFailureStart;
    failingForHours = (nowMs - since) / HOUR_MS;
  }
  return { attempts30d, ok30d, successRate: attempts30d ? ok30d / attempts30d : null, failedLast72h, failingForHours };
}

/**
 * Google's verified count vs CRM leads marked real (GOOD, incl. closed) with a click ID created
 * in the same Israel-date range. Returns the relative difference (google − crm) / crm; 0 when
 * both are 0; Infinity when only Google has conversions.
 */
export function reconciliationDelta(googleVerified: number, leads: GraduationLead[], range: DateRange): { crmMarkedReal: number; delta: number } {
  let crm = 0;
  for (const lead of leads) {
    if (lead.quality !== 'GOOD' || !hasClickId(lead)) continue;
    const created = leadCreatedMs(lead);
    if (!Number.isFinite(created)) continue;
    if (inRange(israelDate(new Date(created)), range)) crm += 1;
  }
  const delta = crm === 0 ? (googleVerified === 0 ? 0 : Infinity) : (googleVerified - crm) / crm;
  return { crmMarkedReal: crm, delta };
}

// ---- caps (G10 and rollback) ------------------------------------------------------------------

export type ChangeCapReason =
  | 'already_in_phase2'
  | 'manual_hold'
  | 'max_rollbacks'
  | 'cooldown'
  | 'graduation_within_30_days'
  | 'max_changes_60_days'
  | 'not_in_phase2';

/**
 * Change caps: one graduation per 30 days; at most 2 strategy changes per rolling 60 days;
 * rollback always allowed while in phase 2; 30-day cooldown after a rollback; 2 rollbacks →
 * `manual_hold` (enforced by `recordTransition`, and blocked here).
 */
export function evaluateChangeCaps(
  campaign: ReturnType<typeof campaignPhaseState>,
  now: Date,
  kind: 'graduation' | 'rollback',
): { allowed: boolean; reason: ChangeCapReason | null; strategyChanges60d: number } {
  const nowMs = now.getTime();
  const strategyChanges60d = campaign.transitions.filter((t) => t && t.strategyChange === true && nowMs - ms(t.at) < STRATEGY_CHANGE_WINDOW_DAYS * DAY_MS).length;
  const result = (reason: ChangeCapReason | null) => ({ allowed: reason === null, reason, strategyChanges60d });
  if (kind === 'rollback') {
    return result(campaign.phase === 'phase2_learning' || campaign.phase === 'phase2_active' ? null : 'not_in_phase2');
  }
  if (campaign.phase === 'phase2_learning' || campaign.phase === 'phase2_active') return result('already_in_phase2');
  if (campaign.phase === 'manual_hold') return result('manual_hold');
  if (campaign.rollbackCount >= MAX_ROLLBACKS) return result('max_rollbacks');
  if (campaign.cooldownUntil && ms(campaign.cooldownUntil) > nowMs) return result('cooldown');
  if (campaign.lastGraduationAt && nowMs - ms(campaign.lastGraduationAt) < GRADUATION_MIN_INTERVAL_DAYS * DAY_MS) return result('graduation_within_30_days');
  if (strategyChanges60d >= MAX_STRATEGY_CHANGES_IN_WINDOW) return result('max_changes_60_days');
  return result(null);
}

// ---- A3: graduation evaluator -----------------------------------------------------------------

/** `ceil(15 × verifiedCpl / 2)`, rounded up to ₪100: the monthly budget for 15 verified in 60 days. */
export function n4BudgetIls(verifiedCpl: number): number {
  return Math.ceil(Math.ceil((G2_MIN_VERIFIED * verifiedCpl) / 2) / 100) * 100;
}

export function evaluateGraduation(input: GraduationInput): GraduationResult {
  const { now, stats } = input;
  const nowMs = now.getTime();
  const delay = computeDelayDays(input.leads, now);
  const windows = graduationWindows(now, delay.delayDays);
  const gates: GateResult[] = [];

  // INPUT: the counts must be for the windows this evaluation derives.
  const mismatched = (['g2', 'last30', 'last14', 'cpc30'] as const).filter((k) => !sameRange(stats?.[k]?.range, windows[k]));
  gates.push({ id: 'INPUT', value: mismatched.length ? `range_mismatch:${mismatched.join(',')}` : 'ok', threshold: 'ok', pass: mismatched.length === 0 });

  // G1: age + soak.
  const firstMs = ms(input.firstImpressionAt);
  const ageDays = Number.isFinite(firstMs) && firstMs <= nowMs ? (nowMs - firstMs) / DAY_MS : null;
  const soak = evaluateSignalIntegritySoak(input.state as Record<string, unknown> | null, now);
  gates.push({
    id: 'G1',
    value: ageDays === null ? null : Math.floor(ageDays),
    threshold: GRADUATION_MIN_AGE_DAYS,
    pass: ageDays !== null && ageDays >= GRADUATION_MIN_AGE_DAYS && soak.ok,
    detail: { soakOk: soak.ok, soakReason: soak.reason ?? null, eligibleAt: soak.eligibleAt },
  });

  // G2 / G2b: volume and recency (delay-adjusted).
  const g2 = finiteOr(stats?.g2?.verified, 0);
  const v30 = finiteOr(stats?.last30?.verified, 0);
  const v14 = finiteOr(stats?.last14?.verified, 0);
  gates.push({ id: 'G2', value: g2, threshold: G2_MIN_VERIFIED, pass: g2 >= G2_MIN_VERIFIED });
  gates.push({ id: 'G2b', value: `${v30}/${v14}`, threshold: `${G2B_30_MIN}/${G2B_14_MIN}`, pass: v30 >= G2B_30_MIN && v14 >= G2B_14_MIN, detail: { last30: v30, last14: v14 } });

  // G3: closed jobs in 90 days.
  const closed90 = input.leads.filter((l) => {
    const at = ms(l.closedAt ?? undefined);
    return isClosed(l) && Number.isFinite(at) && at <= nowMs && nowMs - at <= G3_WINDOW_DAYS * DAY_MS;
  }).length;
  gates.push({ id: 'G3', value: closed90, threshold: G3_MIN_CLOSED, pass: closed90 >= G3_MIN_CLOSED });

  // G4: marking coverage of paid leads older than 3 days (created in the last 60 days).
  const eligible = input.leads.filter((l) => {
    const created = leadCreatedMs(l);
    return isPaid(l) && Number.isFinite(created) && nowMs - created >= G4_MIN_LEAD_AGE_DAYS * DAY_MS && nowMs - created <= G2_WINDOW_DAYS * DAY_MS;
  });
  const markedShare = eligible.length ? eligible.filter(isMarked).length / eligible.length : null;
  gates.push({
    id: 'G4',
    value: markedShare,
    threshold: G4_MIN_MARKED_SHARE,
    pass: markedShare !== null && markedShare >= G4_MIN_MARKED_SHARE - 1e-12,
    detail: { paidLeads: eligible.length },
  });

  // G5: upload health + reconciliation over the G2 window.
  const health = computeUploadHealth(input.leads, now);
  const recon = reconciliationDelta(g2, input.leads, windows.g2);
  const g5Pass = health.successRate !== null && health.successRate >= G5_MIN_UPLOAD_SUCCESS - 1e-12
    && health.failedLast72h === 0
    && Math.abs(recon.delta) <= G5_RECONCILIATION_TOLERANCE + 1e-12;
  gates.push({
    id: 'G5',
    value: health.successRate,
    threshold: G5_MIN_UPLOAD_SUCCESS,
    pass: g5Pass,
    detail: { ...health, crmMarkedReal: recon.crmMarkedReal, reconciliationDelta: Number.isFinite(recon.delta) ? recon.delta : null },
  });

  // G6: 60-day cost per verified lead vs the ceiling.
  const cost60 = finiteOr(stats?.g2?.costIls, NaN);
  const baselineCpl = g2 > 0 && Number.isFinite(cost60) ? cost60 / g2 : null;
  const ceiling = typeof input.ceilingIls === 'number' && Number.isFinite(input.ceilingIls) && input.ceilingIls > 0 ? input.ceilingIls : null;
  gates.push({
    id: 'G6',
    value: baselineCpl,
    threshold: ceiling ?? 'unknown_ceiling',
    pass: baselineCpl !== null && ceiling !== null && baselineCpl <= ceiling,
  });

  // G7: stability.
  const recent = (input.recentChanges ?? []).filter((c) => {
    const at = ms(c?.at);
    return Number.isFinite(at) && nowMs - at < G7_STABILITY_DAYS * DAY_MS;
  });
  gates.push({
    id: 'G7',
    value: recent.length,
    threshold: 0,
    pass: recent.length === 0 && !input.openTrackingAuditTask,
    detail: { kinds: [...new Set(recent.map((c) => c.kind))], openTrackingAuditTask: Boolean(input.openTrackingAuditTask) },
  });

  // G8: timing (Sunday–Tuesday 06:00–12:00 Israel; not on or within 3 days before a blackout).
  const local = israelLocalParts(now);
  const minute = local.hour * 60 + local.minute;
  const lookahead = Array.from({ length: G8_BLACKOUT_LOOKAHEAD_DAYS + 1 }, (_, i) => addDaysIso(local.isoDate, i));
  const uncovered = lookahead.filter((d) => !isIsraelCalendarCovered(d));
  const blackout = lookahead.filter((d) => isIsraelBlackoutDate(d));
  const inWindow = G8_WEEKDAYS.includes(local.weekday) && minute >= G8_START_MINUTE && minute < G8_END_MINUTE;
  gates.push({
    id: 'G8',
    value: uncovered.length ? 'calendar_not_covered' : blackout.length ? `blackout:${blackout[0]}` : inWindow ? 'in_window' : `outside_window:${local.weekday}@${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`,
    threshold: 'Sun-Tue 06:00-12:00 Asia/Jerusalem, no blackout within 3 days',
    pass: inWindow && blackout.length === 0 && uncovered.length === 0,
  });

  // G9: policy (decided by A6).
  gates.push({ id: 'G9', value: Boolean(input.policyAllowsKind), threshold: true, pass: input.policyAllowsKind === true });

  // G10: history caps.
  const campaign = campaignPhaseState(input.state as Record<string, unknown> | null, input.campaignId);
  const caps = evaluateChangeCaps(campaign, now, 'graduation');
  gates.push({ id: 'G10', value: caps.reason ?? 'ok', threshold: 'ok', pass: caps.allowed, detail: { phase: campaign.phase, rollbackCount: campaign.rollbackCount, strategyChanges60d: caps.strategyChanges60d } });

  const blockedBy = gates.filter((g) => !g.pass).map((g) => g.id);
  const cpcCost = finiteOr(stats?.cpc30?.costIls, NaN);
  const cpcClicks = finiteOr(stats?.cpc30?.clicks, 0);
  const result: GraduationResult = {
    decision: blockedBy.length === 0 ? 'graduate' : 'blocked',
    gates,
    blockedBy,
    reason: blockedBy.length ? `graduation_gate:${blockedBy.join(',')}` : null,
    delayDays: delay.delayDays,
    delaySamples: delay.samples,
    windows,
    baselineCpl,
    baselineVerifiedCount: g2,
    baselineWindowDays: G2_WINDOW_DAYS,
    ceiling,
    phase1AvgCpcIls: cpcClicks > 0 && Number.isFinite(cpcCost) ? cpcCost / cpcClicks : null,
  };

  // N4: old enough, campaign 90+ days, short on volume → the budget that would unlock it.
  const g1 = gates.find((g) => g.id === 'G1')!;
  const g2Gate = gates.find((g) => g.id === 'G2')!;
  if (g1.pass && ageDays !== null && ageDays >= N4_MIN_AGE_DAYS && !g2Gate.pass && baselineCpl !== null) {
    result.n4BudgetIls = n4BudgetIls(baselineCpl);
  }
  return result;
}

// ---- A4: rollback monitor ---------------------------------------------------------------------

/**
 * Israel-date ranges for the rollback rules. Delay-adjusted windows (R1/R2 verified counts and
 * cost, R6 verified count) end D days ago and are clipped to start the day after the switch,
 * so pre-switch conversions never count for the new strategy. `days` can be 0 (not evaluable).
 */
export function rollbackWindows(now: Date, switchedAt: string, delayDays: number) {
  const today = israelDate(now);
  const switchDate = israelDate(new Date(switchedAt));
  const firstFull = addDaysIso(switchDate, 1);
  const end = addDaysIso(today, -delayDays);
  const clip = (start: string, endDate: string) => {
    const startDate = start < firstFull ? firstFull : start;
    return { startDate, endDate, days: Math.max(0, daysBetweenIso(startDate, endDate) + 1) };
  };
  return {
    today,
    switchDate,
    dayIndex: daysBetweenIso(switchDate, today),
    r1: clip(addDaysIso(end, -13), end),
    r2: clip(addDaysIso(end, -6), end),
    sinceSwitch: { startDate: switchDate, endDate: today, days: daysBetweenIso(switchDate, today) + 1 },
    cpc14: clip(addDaysIso(today, -14), addDaysIso(today, -1)),
    recon30: { startDate: addDaysIso(end, -29), endDate: end, days: 30 },
  };
}

export type RollbackRuleId = 'INPUT' | 'R0' | 'R1' | 'R2' | 'R4' | 'R5' | 'R6';

export interface RollbackRuleResult {
  id: RollbackRuleId;
  evaluable: boolean;
  fired: boolean;
  value: number | string | boolean | null;
  threshold: number | string | boolean | null;
  detail?: Record<string, unknown>;
}

export interface RollbackStats {
  /** R1 (and R6 verified): 14 days ending D ago, clipped to post-switch. `costIls` required. */
  r1: WindowStats;
  /** R2: 7 days ending D ago, clipped to post-switch. `costIls` required. */
  r2: WindowStats;
  /** R4: switch date through today. `costIls` required. */
  sinceSwitch: WindowStats;
  /** R6 click price: last 14 complete days, clipped to post-switch. `costIls` + `clicks`. */
  cpc14: WindowStats;
  /** R0 reconciliation: 30 days ending D ago. */
  recon30: WindowStats;
}

export interface RollbackInput {
  now: Date;
  campaignId: string;
  /** Parsed `bidding-phase.json`; the latest switch transition supplies baseline + ceiling. */
  state: Record<string, unknown> | null;
  /** Autonomy policy (null = none, which holds). */
  policy: { mode: string; killSwitch: boolean } | null;
  leads: GraduationLead[];
  stats: RollbackStats | null;
  /** Current daily budget (₪). Missing blocks R2 (never fires on it). */
  dailyBudgetIls: number | undefined;
  /** Current ceiling; falls back to the ceiling stored at the switch. */
  ceilingIls?: number | undefined;
}

export interface RollbackResult {
  /** `hold` = R5 (no change, alert); `freeze` = R0 (no change, alert); `rollback`; `none`. */
  action: 'none' | 'rollback' | 'freeze' | 'hold';
  firedRule: RollbackRuleId | null;
  rules: RollbackRuleResult[];
  dayIndex: number | null;
  delayDays: number;
  alert: boolean;
  /** Phase the caller should record next, if any. */
  nextPhase: 'phase2_active' | 'rolled_back' | 'manual_hold' | null;
  windows: ReturnType<typeof rollbackWindows> | null;
}

/** The latest transition into `phase2_learning` (the live switch) for this campaign. */
interface SwitchTransition {
  at: string;
  to: string;
  baseline?: { cplIls?: number; verifiedCount?: number; windowDays?: number } | null;
  ceiling?: number | null;
  phase1AvgCpcIls?: number | null;
}

function latestSwitch(campaign: ReturnType<typeof campaignPhaseState>): SwitchTransition | null {
  for (let i = campaign.transitions.length - 1; i >= 0; i--) {
    const t = campaign.transitions[i];
    if (t && t.to === 'phase2_learning') return t as SwitchTransition;
  }
  return null;
}

/**
 * Rollback monitor for a campaign in `phase2_learning` / `phase2_active`. Precedence:
 * R5 (hold) → R0 (freeze; never roll back on missing or broken data) → R4 → R2 → R1 → R6.
 * R3 is dropped (no target to loosen).
 */
export function evaluateRollback(input: RollbackInput): RollbackResult {
  const { now } = input;
  const campaign = campaignPhaseState(input.state, input.campaignId);
  const delay = computeDelayDays(input.leads, now);
  const sw = latestSwitch(campaign);
  const rules: RollbackRuleResult[] = [];
  const base = { delayDays: delay.delayDays };

  // R5: kill switch / mode.
  const policy = input.policy;
  const r5 = !policy || policy.killSwitch === true || policy.mode !== 'autonomous';
  rules.push({ id: 'R5', evaluable: true, fired: r5, value: policy ? `${policy.mode}${policy.killSwitch ? '+kill_switch' : ''}` : 'no_policy', threshold: 'autonomous, kill switch off' });

  const inPhase2 = campaign.phase === 'phase2_learning' || campaign.phase === 'phase2_active';
  const windows = sw && Number.isFinite(ms(sw.at)) ? rollbackWindows(now, sw.at, delay.delayDays) : null;
  const dayIndex = windows ? windows.dayIndex : null;

  // INPUT: must be in phase 2 with a recorded switch, and stats for the derived windows.
  const stats = input.stats;
  const mismatched = windows && stats
    ? (['r1', 'r2', 'sinceSwitch', 'cpc14', 'recon30'] as const).filter((k) => !sameRange(stats[k]?.range, windows[k]))
    : [];
  const inputOk = inPhase2 && Boolean(windows) && Boolean(stats) && mismatched.length === 0;
  rules.push({
    id: 'INPUT',
    evaluable: true,
    fired: !inputOk,
    value: !inPhase2 ? `not_in_phase2:${campaign.phase}` : !windows ? 'no_switch_transition' : !stats ? 'no_stats' : mismatched.length ? `range_mismatch:${mismatched.join(',')}` : 'ok',
    threshold: 'ok',
  });

  if (r5) return { action: 'hold', firedRule: 'R5', rules, dayIndex, alert: true, nextPhase: null, windows, ...base };
  if (!inPhase2) return { action: 'none', firedRule: null, rules, dayIndex, alert: false, nextPhase: null, windows, ...base };

  // R0: signal outage / missing data → freeze.
  const baselineCpl = finiteOr(sw?.baseline?.cplIls, NaN);
  const baselineCount = finiteOr(sw?.baseline?.verifiedCount, NaN);
  const baselineWindowDays = finiteOr(sw?.baseline?.windowDays, G2_WINDOW_DAYS);
  const ceiling = typeof input.ceilingIls === 'number' && input.ceilingIls > 0 ? input.ceilingIls : finiteOr(sw?.ceiling, NaN);
  const phase1Cpc = finiteOr(sw?.phase1AvgCpcIls, NaN);
  const health = computeUploadHealth(input.leads, now);
  const recon = stats && windows ? reconciliationDelta(finiteOr(stats.recon30.verified, 0), input.leads, windows.recon30) : null;
  const missing: string[] = [];
  if (!inputOk) missing.push('input');
  if (!Number.isFinite(baselineCpl) || !Number.isFinite(baselineCount) || baselineCount <= 0) missing.push('baseline');
  if (!Number.isFinite(ceiling)) missing.push('ceiling');
  const uploadsFailing = health.failingForHours !== null && health.failingForHours >= R0_UPLOAD_FAILING_HOURS;
  const reconOff = recon !== null && Math.abs(recon.delta) > R0_RECONCILIATION_TOLERANCE;
  const r0 = missing.length > 0 || uploadsFailing || reconOff;
  rules.push({
    id: 'R0',
    evaluable: true,
    fired: r0,
    value: missing.length ? `missing:${missing.join(',')}` : uploadsFailing ? `uploads_failing_${Math.floor(health.failingForHours!)}h` : reconOff ? `reconciliation_${recon!.delta}` : 'ok',
    threshold: `uploads failing < ${R0_UPLOAD_FAILING_HOURS}h, reconciliation within ±${R0_RECONCILIATION_TOLERANCE * 100}%`,
    detail: { ...health, reconciliationDelta: recon && Number.isFinite(recon.delta) ? recon.delta : null, crmMarkedReal: recon?.crmMarkedReal ?? null },
  });
  if (r0) return { action: 'freeze', firedRule: 'R0', rules, dayIndex, alert: true, nextPhase: null, windows, ...base };

  const w = windows!;
  const s = stats!;
  const day = w.dayIndex;
  const baselineDaily = baselineCount / baselineWindowDays;

  // R4: days 1–9 emergency.
  const r4Evaluable = day >= 1 && day <= R4_LAST_DAY;
  const spendSince = finiteOr(s.sinceSwitch.costIls, 0);
  const verifiedSince = finiteOr(s.sinceSwitch.verified, 0);
  const predicted = baselineDaily * day;
  const r4 = r4Evaluable && spendSince >= R4_SPEND_CEILINGS * ceiling && verifiedSince === 0 && predicted >= R4_MIN_PREDICTED;
  rules.push({ id: 'R4', evaluable: r4Evaluable, fired: r4, value: spendSince, threshold: R4_SPEND_CEILINGS * ceiling, detail: { verifiedSince, predicted } });

  // R2: from day 10, 7-day volume collapse with real spend.
  const budget = typeof input.dailyBudgetIls === 'number' && input.dailyBudgetIls > 0 ? input.dailyBudgetIls : null;
  const r2Evaluable = day >= R2_FROM_DAY && w.r2.days >= ROLLBACK_MIN_WINDOW_DAYS && budget !== null;
  const r2Verified = finiteOr(s.r2.verified, 0);
  const r2Spend = finiteOr(s.r2.costIls, 0);
  const r2VolumeFloor = R2_VOLUME_SHARE * baselineDaily * w.r2.days;
  const r2SpendFloor = budget !== null ? R2_SPEND_SHARE * budget * w.r2.days : null;
  const r2 = r2Evaluable && r2Verified < r2VolumeFloor && r2Spend >= r2SpendFloor!;
  rules.push({ id: 'R2', evaluable: r2Evaluable, fired: r2, value: r2Verified, threshold: r2VolumeFloor, detail: { spend: r2Spend, spendFloor: r2SpendFloor, windowDays: w.r2.days } });

  // R1: from day 15, CPL above 1.30 × baseline AND above the ceiling.
  const r1Evaluable = day >= R1_FROM_DAY && w.r1.days >= ROLLBACK_MIN_WINDOW_DAYS;
  const r1Verified = finiteOr(s.r1.verified, 0);
  const r1Spend = finiteOr(s.r1.costIls, 0);
  const r1Cpl = r1Verified > 0 ? r1Spend / r1Verified : r1Spend > 0 ? Infinity : 0;
  const r1 = r1Evaluable && r1Cpl > R1_CPL_MULTIPLIER * baselineCpl && r1Cpl > ceiling;
  rules.push({ id: 'R1', evaluable: r1Evaluable, fired: r1, value: Number.isFinite(r1Cpl) ? r1Cpl : 'no_conversions', threshold: Math.max(R1_CPL_MULTIPLIER * baselineCpl, ceiling), detail: { baselineCpl, ceiling, windowDays: w.r1.days } });

  // R6: from day 10, click price > 2 × phase-1 average AND verified below the baseline rate.
  const cpcClicks = finiteOr(s.cpc14.clicks, 0);
  const cpc = cpcClicks > 0 ? finiteOr(s.cpc14.costIls, 0) / cpcClicks : null;
  const r6Evaluable = day >= R6_FROM_DAY && w.r1.days >= ROLLBACK_MIN_WINDOW_DAYS && cpc !== null && Number.isFinite(phase1Cpc) && phase1Cpc > 0;
  const r6Expected = baselineDaily * w.r1.days;
  const r6 = r6Evaluable && cpc! > R6_CPC_MULTIPLIER * phase1Cpc && r1Verified < r6Expected;
  rules.push({ id: 'R6', evaluable: r6Evaluable, fired: r6, value: cpc, threshold: Number.isFinite(phase1Cpc) ? R6_CPC_MULTIPLIER * phase1Cpc : null, detail: { verified: r1Verified, expectedAtBaseline: r6Expected } });

  const fired = (['R4', 'R2', 'R1', 'R6'] as const).find((id) => rules.find((r) => r.id === id)!.fired) ?? null;
  if (fired) {
    return {
      action: 'rollback',
      firedRule: fired,
      rules,
      dayIndex: day,
      alert: true,
      nextPhase: campaign.rollbackCount + 1 >= MAX_ROLLBACKS ? 'manual_hold' : 'rolled_back',
      windows: w,
      ...base,
    };
  }
  const nextPhase = campaign.phase === 'phase2_learning' && day > PHASE2_LEARNING_DAYS ? 'phase2_active' : null;
  return { action: 'none', firedRule: null, rules, dayIndex: day, alert: false, nextPhase, windows: w, ...base };
}

/**
 * Days 0–14 after a live switch: A6 skips `budget_tune` / `search_term_harvest` for the
 * campaign (`phase2_freeze`) and caps cleanup negatives at 5 per run.
 */
export function isInPhase2Freeze(state: Record<string, unknown> | null, campaignId: string, now: Date): boolean {
  const campaign = campaignPhaseState(state, campaignId);
  if (campaign.phase !== 'phase2_learning' && campaign.phase !== 'phase2_active') return false;
  const sw = latestSwitch(campaign);
  if (!sw || !Number.isFinite(ms(sw.at))) return true; // in phase 2 with no switch record: stay frozen (fail closed)
  return daysBetweenIso(israelDate(new Date(sw.at)), israelDate(now)) <= PHASE2_LEARNING_DAYS;
}

export const PHASE2_FREEZE_MAX_CLEANUP_NEGATIVES = 5;
