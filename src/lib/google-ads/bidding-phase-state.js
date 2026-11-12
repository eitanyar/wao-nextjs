import fs from 'fs';
import path from 'path';

/**
 * `<clientsDir>/<clientId>/tasks/google-ads/bidding-phase.json` (ads-bot-phase2 spec §7).
 *
 * Step 0 only writes the two timestamps the graduation gate (G1) will need: when this account's
 * signal-integrity fixes went live (`signalIntegritySince`) and its latest conversion-goal change
 * (`lastGoalChangeAt`, which starts a 14-day no-graduation window). The rest of the §7 state
 * machine is Phase 2 work. Atomic temp+rename write, like `writeAutonomyPolicy`.
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
