import fs from 'fs';
import path from 'path';

/**
 * `<clientsDir>/<clientId>/tasks/google-ads/bidding-phase.json` (ads-bot-phase2 spec §7).
 *
 * Step 0 only writes the two timestamps the graduation gate (G1) will need: when this account's
 * signal-integrity fixes went live (`signalIntegritySince`) and its latest conversion-goal change
 * (`lastGoalChangeAt`, which starts a 14-day no-graduation window), plus the pure soak check
 * `evaluateSignalIntegritySoak`. The rest of the §7 state machine is Phase 2 work. Atomic temp+rename write, like `writeAutonomyPolicy`.
 *
 * `baseDir` is required on purpose: callers pass the dataRoots clients dir (route) or an explicit
 * directory (backfill script, tests) so nothing here can silently default into live data.
 */

const CLIENT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;

/**
 * @param {string} clientId
 * @param {string} baseDir
 * @returns {string | null}
 */
export function biddingPhasePath(clientId, baseDir) {
  if (!baseDir || !CLIENT_ID_PATTERN.test(clientId)) return null;
  const root = path.resolve(baseDir);
  const dir = path.join(root, clientId);
  if (!dir.startsWith(`${root}${path.sep}`)) return null;
  return path.join(dir, 'tasks', 'google-ads', 'bidding-phase.json');
}

/**
 * @param {string} clientId
 * @param {string} baseDir
 * @returns {Record<string, any> | null}
 */
export function readBiddingPhaseState(clientId, baseDir) {
  const filePath = biddingPhasePath(clientId, baseDir);
  if (!filePath) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Records a verified-lead-only goal change. Sets `lastGoalChangeAt` (always) and
 * `signalIntegritySince` (only if unset), starts the file at `phase1_clicks`.
 *
 * @param {{ clientId: string, baseDir: string, at: string, customerId?: string, source: string }} params
 * @returns {Record<string, any> | null} the written state, or null if it could not be written
 */
export function recordGoalChange({ clientId, baseDir, at, customerId, source }) {
  const filePath = biddingPhasePath(clientId, baseDir);
  if (!filePath) return null;
  const previous = readBiddingPhaseState(clientId, baseDir) ?? {};
  const goalChanges = Array.isArray(previous.goalChanges) ? previous.goalChanges : [];
  const next = {
    version: 1,
    clientId,
    phase: previous.phase ?? 'phase1_clicks',
    ...previous,
    signalIntegritySince: previous.signalIntegritySince ?? at,
    lastGoalChangeAt: at,
    goalChanges: [...goalChanges, { at, customerId: customerId ?? null, source, change: 'verified_lead_only_primary' }],
  };
  return writeStateAtomic(filePath, next);
}

/**
 * Starts the soak for an account whose goals were already verified-lead-only when step 0
 * reached it (the backfill found nothing to change), so there was no goal change to record.
 * Sets `signalIntegritySince` only if unset; never touches `lastGoalChangeAt`.
 *
 * @param {{ clientId: string, baseDir: string, at: string, customerId?: string, source: string }} params
 * @returns {Record<string, any> | null}
 */
export function recordSignalIntegrity({ clientId, baseDir, at, customerId, source }) {
  const filePath = biddingPhasePath(clientId, baseDir);
  if (!filePath) return null;
  const previous = readBiddingPhaseState(clientId, baseDir) ?? {};
  if (previous.signalIntegritySince) return previous;
  const next = {
    version: 1,
    clientId,
    phase: previous.phase ?? 'phase1_clicks',
    ...previous,
    signalIntegritySince: at,
    signalIntegritySource: { at, customerId: customerId ?? null, source },
  };
  return writeStateAtomic(filePath, next);
}

/** @param {string} filePath @param {Record<string, any>} next */
function writeStateAtomic(filePath, next) {
  try {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
    fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    fs.renameSync(tmp, filePath);
    return next;
  } catch {
    return null;
  }
}

/** §3 "Soak requirement" / §4 G1: days that must pass after signal integrity and after any goal change. */
export const SIGNAL_INTEGRITY_SOAK_DAYS = 14;

/** @param {unknown} value */
function instantMs(value) {
  if (typeof value !== 'string' || !value) return NaN;
  return new Date(value).getTime();
}

/**
 * Soak enforcement (ads-bot-phase2 spec §3 "Soak requirement", §7). Graduation may not fire for
 * an account until step 0 has been live for it for 14 days (`signalIntegritySince`) AND 14 days
 * have passed since its latest conversion-goal change (`lastGoalChangeAt`). Fails closed: no
 * state file, no `signalIntegritySince` or an unparseable / future timestamp means "not soaked".
 * Pure; the Phase 2 graduation evaluator (G1) calls this.
 *
 * @param {Record<string, any> | null | undefined} state
 * @param {Date} now
 * @param {{ soakDays?: number }} [options]
 * @returns {{ ok: boolean, reason?: 'signal_integrity_not_recorded'|'signal_integrity_soaking'|'goal_change_window', signalIntegritySince: string | null, lastGoalChangeAt: string | null, eligibleAt: string | null }}
 */
export function evaluateSignalIntegritySoak(state, now, options = {}) {
  const soakMs = (options.soakDays ?? SIGNAL_INTEGRITY_SOAK_DAYS) * 86_400_000;
  const since = typeof state?.signalIntegritySince === 'string' ? state.signalIntegritySince : null;
  const lastGoal = typeof state?.lastGoalChangeAt === 'string' ? state.lastGoalChangeAt : null;
  const sinceMs = instantMs(since);
  const goalMs = lastGoal === null ? NaN : instantMs(lastGoal);
  const base = { signalIntegritySince: since, lastGoalChangeAt: lastGoal };
  if (!Number.isFinite(sinceMs) || sinceMs > now.getTime() || (lastGoal !== null && !Number.isFinite(goalMs))) {
    return { ok: false, reason: 'signal_integrity_not_recorded', ...base, eligibleAt: null };
  }
  const eligibleMs = Math.max(sinceMs, Number.isFinite(goalMs) ? goalMs : -Infinity) + soakMs;
  const eligibleAt = new Date(eligibleMs).toISOString();
  if (now.getTime() - sinceMs < soakMs) return { ok: false, reason: 'signal_integrity_soaking', ...base, eligibleAt };
  if (Number.isFinite(goalMs) && now.getTime() - goalMs < soakMs) return { ok: false, reason: 'goal_change_window', ...base, eligibleAt };
  return { ok: true, ...base, eligibleAt };
}

// ---------------------------------------------------------------------------------------------
// Phase-2 state machine (post-launch week 1 spec, task A4). New exports only; the functions
// above keep their behaviour. State is per campaign, under `campaigns[<campaignId>]` in the same
// per-client file; the legacy top-level `phase` written by step 0 is left untouched.
// ---------------------------------------------------------------------------------------------

/** @typedef {'phase1_clicks'|'graduation_proposed'|'phase2_learning'|'phase2_active'|'rolled_back'|'manual_hold'} BiddingPhase */

/** @type {ReadonlyArray<BiddingPhase>} */
export const BIDDING_PHASES = Object.freeze(['phase1_clicks', 'graduation_proposed', 'phase2_learning', 'phase2_active', 'rolled_back', 'manual_hold']);

/** After a rollback, no new graduation for this many days. */
export const ROLLBACK_COOLDOWN_DAYS = 30;
/** The rollback that makes this count goes to `manual_hold` instead of `rolled_back`. */
export const MAX_ROLLBACKS = 2;

/**
 * Allowed automatic transitions. `manual_hold` has no automatic exit: a human edits the file.
 * `graduation_proposed → graduation_proposed` is a repeat shadow proposal on a later day.
 * @type {Readonly<Record<BiddingPhase, ReadonlyArray<BiddingPhase>>>}
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  phase1_clicks: ['graduation_proposed', 'phase2_learning', 'manual_hold'],
  graduation_proposed: ['graduation_proposed', 'phase1_clicks', 'phase2_learning', 'manual_hold'],
  phase2_learning: ['phase2_active', 'rolled_back', 'manual_hold'],
  phase2_active: ['rolled_back', 'manual_hold'],
  rolled_back: ['graduation_proposed', 'phase2_learning', 'manual_hold'],
  manual_hold: [],
});

const CAMPAIGN_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const PHASE2 = new Set(['phase2_learning', 'phase2_active']);

/**
 * The per-campaign block of a parsed state file, with defaults (pure).
 *
 * @param {Record<string, any> | null | undefined} state
 * @param {string} campaignId
 * @returns {{ phase: BiddingPhase, transitions: Array<Record<string, any>>, rollbackCount: number, cooldownUntil: string | null, lastGraduationAt: string | null, phaseSince: string | null }}
 */
export function campaignPhaseState(state, campaignId) {
  const raw = state && typeof state === 'object' && state.campaigns && typeof state.campaigns === 'object' ? state.campaigns[campaignId] : undefined;
  const block = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    ...block,
    phase: BIDDING_PHASES.includes(block.phase) ? block.phase : 'phase1_clicks',
    transitions: Array.isArray(block.transitions) ? block.transitions : [],
    rollbackCount: Number.isInteger(block.rollbackCount) && block.rollbackCount > 0 ? block.rollbackCount : 0,
    cooldownUntil: typeof block.cooldownUntil === 'string' ? block.cooldownUntil : null,
    lastGraduationAt: typeof block.lastGraduationAt === 'string' ? block.lastGraduationAt : null,
    phaseSince: typeof block.phaseSince === 'string' ? block.phaseSince : null,
  };
}

/**
 * Reads one campaign's phase block. No file means `phase1_clicks`. Null on a bad id / baseDir.
 *
 * @param {string} clientId
 * @param {string} baseDir
 * @param {string} campaignId
 */
export function readPhase(clientId, baseDir, campaignId) {
  if (!biddingPhasePath(clientId, baseDir) || !CAMPAIGN_ID_PATTERN.test(String(campaignId))) return null;
  return campaignPhaseState(readBiddingPhaseState(clientId, baseDir), String(campaignId));
}

/**
 * Records one phase transition for a campaign (atomic temp+rename, same writer as above).
 *
 * - `from` must equal the stored phase (guards against a stale read); `to` must be allowed.
 * - Idempotent on `actionId`: a repeat returns the stored state with `duplicate: true`.
 * - A rollback that brings `rollbackCount` to `MAX_ROLLBACKS` is stored as `manual_hold`.
 * - A rollback sets `cooldownUntil = at + ROLLBACK_COOLDOWN_DAYS`; a switch to
 *   `phase2_learning` sets `lastGraduationAt`. Both count as strategy changes.
 * - Each transition stores time, from, to, action ID, baseline, ceiling, phase-1 average click
 *   price and the full `before` snapshot.
 *
 * @param {{ clientId: string, baseDir: string, campaignId: string, at: string, from: BiddingPhase, to: BiddingPhase, actionId: string, baseline?: Record<string, any> | null, ceiling?: number | null, phase1AvgCpcIls?: number | null, before?: Record<string, any> | null, rule?: string | null }} params
 * @returns {{ ok: true, duplicate: boolean, state: Record<string, any>, campaign: ReturnType<typeof campaignPhaseState> } | { ok: false, error: 'bad_input'|'phase_mismatch'|'transition_not_allowed'|'write_failed' }}
 */
export function recordTransition(params) {
  const { clientId, baseDir, campaignId, at, from, to, actionId } = params;
  const filePath = biddingPhasePath(clientId, baseDir);
  if (!filePath || !CAMPAIGN_ID_PATTERN.test(String(campaignId)) || typeof actionId !== 'string' || !actionId
    || !Number.isFinite(instantMs(at)) || !BIDDING_PHASES.includes(from) || !BIDDING_PHASES.includes(to)) {
    return { ok: false, error: 'bad_input' };
  }
  const previous = readBiddingPhaseState(clientId, baseDir) ?? {};
  const current = campaignPhaseState(previous, campaignId);
  if (current.transitions.some((t) => t && t.actionId === actionId)) {
    return { ok: true, duplicate: true, state: previous, campaign: current };
  }
  if (current.phase !== from) return { ok: false, error: 'phase_mismatch' };

  const isRollback = PHASE2.has(from) && to === 'rolled_back';
  const rollbackCount = current.rollbackCount + (isRollback ? 1 : 0);
  const effectiveTo = isRollback && rollbackCount >= MAX_ROLLBACKS ? 'manual_hold' : to;
  if (!ALLOWED_TRANSITIONS[from].includes(effectiveTo)) return { ok: false, error: 'transition_not_allowed' };

  const strategyChange = effectiveTo === 'phase2_learning' || (PHASE2.has(from) && (effectiveTo === 'rolled_back' || effectiveTo === 'manual_hold'));
  const transition = {
    at,
    from,
    to: effectiveTo,
    ...(effectiveTo !== to ? { requestedTo: to } : {}),
    actionId,
    strategyChange,
    rule: params.rule ?? null,
    baseline: params.baseline ?? null,
    ceiling: params.ceiling ?? null,
    phase1AvgCpcIls: params.phase1AvgCpcIls ?? null,
    before: params.before ?? null,
  };
  const nextCampaign = {
    ...current,
    phase: effectiveTo,
    phaseSince: at,
    rollbackCount,
    cooldownUntil: isRollback ? new Date(instantMs(at) + ROLLBACK_COOLDOWN_DAYS * 86_400_000).toISOString() : current.cooldownUntil,
    lastGraduationAt: effectiveTo === 'phase2_learning' ? at : current.lastGraduationAt,
    transitions: [...current.transitions, transition],
  };
  const prevCampaigns = previous.campaigns && typeof previous.campaigns === 'object' && !Array.isArray(previous.campaigns) ? previous.campaigns : {};
  const next = {
    version: 1,
    clientId,
    phase: previous.phase ?? 'phase1_clicks',
    ...previous,
    campaigns: { ...prevCampaigns, [campaignId]: nextCampaign },
  };
  const written = writeStateAtomic(filePath, next);
  if (!written) return { ok: false, error: 'write_failed' };
  return { ok: true, duplicate: false, state: written, campaign: campaignPhaseState(written, campaignId) };
}
