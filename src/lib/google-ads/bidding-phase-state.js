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
