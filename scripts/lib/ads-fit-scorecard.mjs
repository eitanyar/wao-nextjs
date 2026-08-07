/**
 * Ads Bot admission scorecard — docs/specs/pilot-client-gating.md.
 *
 * IMPORTANT PROVENANCE NOTE (flagged for Roni/Adam, not silently assumed):
 * pilot-client-gating.md's 8-signal scorecard existed ONLY as a markdown
 * spec before this file — no importable code module implemented it anywhere
 * in this codebase (checked: no prior `src/` or `scripts/` file computes
 * `totalScore`/`hardFail`/the 8 signals). docs/specs/readiness-gate.md §1
 * says Phase 1's Ads-fit axis "reuses [the scorecard] unchanged... import
 * the admission thresholds as constants" — this file IS that one
 * implementation, built here for the first time, so that
 * `scripts/readiness-gate.mjs` calls into a single place rather than
 * inlining scoring logic into the routing-tree code. If a second consumer
 * of the scorecard is ever built, it must import from here — never
 * reimplement.
 *
 * v1 automation posture (readiness-gate.md §3.4) — do NOT silently default
 * signals 2/5/6/7:
 *   - Signal 4 (reputation floor) — automated from GBP signals already fetched.
 *   - Signal 8 (AI-resistance tier) — static lookup by vertical archetype.
 *   - Signals 1/3 (demand, budget floor) — partial: computed if a CPC-band
 *     or live Keyword Planner figure is supplied, else left unscored.
 *   - Signals 2/5/6/7 (unit economics, capacity, auction sanity, service
 *     radius) — human-entered only. Left `null`/unscored if not supplied on
 *     the CLI; NEVER defaulted to a number.
 */

/** Admission thresholds — pilot-client-gating.md's own numbers, imported as constants, not re-derived. */
export const ADMISSION_PILOT_MIN_SCORE = 12; // >=12/16, zero hard-fails -> pilot cohort
export const ADMISSION_CONDITIONAL_MIN_SCORE = 9; // 9-11 -> conditional
export const ADMISSION_MAX_SCORE = 16;

// Signal 8 — AI-resistance tier, static lookup (pilot-client-gating.md
// signal 8): Tier 1 (physical/licensed trades) = 2, Tier 2 (GEO Bot
// content-ready verticals) = 1, Tier 3 (coaches/generic consultants/
// tutors, deprioritized) = 0. Kept as its own table (not reused from
// vertical-classifier.mjs's archetype table) because it's "one level more
// granular" per readiness-gate.md §3.4 — coach is content-ready-SMB for
// Site/GEO routing purposes but Tier 3 (score 0) for AI-resistance, and
// that distinction is pilot-client-gating.md's, not this file's to resolve.
const TIER_1_KEYWORDS = ['אינסטלטור', 'שרברב', 'חשמלאי', 'מנעולן', 'מיזוג', 'מזגן', 'מוסך', 'מכונאי', 'פיזיותרפ', 'רופא שיניים', 'שיניים'];
const TIER_2_KEYWORDS = ['רואה חשבון', 'חשבונאי', 'עורך דין', 'עו"ד', 'משפט', 'אדריכל', 'קוסמט', 'אסתט', 'מרפאה', 'קליניקה'];
const TIER_3_KEYWORDS = ['מאמן', 'קואצ', 'coach', 'מורה פרטי', 'שיעורי', 'ייעוץ עסקי'];

function aiResistanceTierScore(category) {
  const value = (category || '').toLowerCase();
  if (TIER_1_KEYWORDS.some(kw => value.includes(kw.toLowerCase()))) return 2;
  if (TIER_2_KEYWORDS.some(kw => value.includes(kw.toLowerCase()))) return 1;
  if (TIER_3_KEYWORDS.some(kw => value.includes(kw.toLowerCase()))) return 0;
  return null; // unclassified — not silently scored 0, left unscored
}

// Signal 4 — reputation floor, automated from GbpSignals already fetched
// (pilot-client-gating.md signal 4): rating >=4.0 with >=10 reviews = 2,
// 4.0+ with fewer = 1, below 4.0 or no profile = 0.
function reputationFloorScore(gbp) {
  if (!gbp || typeof gbp.rating !== 'number') return 0;
  if (gbp.rating >= 4.0 && gbp.reviewCount >= 10) return 2;
  if (gbp.rating >= 4.0) return 1;
  return 0;
}

/**
 * @param {{
 *   gbp: { rating: number|null, reviewCount: number },
 *   category: string,
 *   manual?: {
 *     demandScore?: number,        // signal 1, 0/1/2, human/Keyword-Planner-entered
 *     unitEconomicsScore?: number, // signal 2, 0/1/2
 *     budgetFloorScore?: number,   // signal 3, 0/1/2
 *     budgetHardFail?: boolean,    // signal 3 hard-fail flag
 *     capacityOk?: boolean,        // signal 5 — false is a HARD FAIL
 *     auctionSanityScore?: number, // signal 6, 0/2
 *     serviceRadiusScore?: number, // signal 7, 0/2
 *   },
 * }} input
 * @returns {import('./ads-fit-scorecard.types').AdsFitResult}
 */
export function scoreAdsFit({ gbp, category, manual = {} }) {
  const signals = {
    demand: manual.demandScore ?? null,
    unitEconomics: manual.unitEconomicsScore ?? null,
    budgetFloor: manual.budgetFloorScore ?? null,
    reputationFloor: reputationFloorScore(gbp),
    capacity: manual.capacityOk === undefined ? null : (manual.capacityOk ? 2 : 0),
    auctionSanity: manual.auctionSanityScore ?? null,
    serviceRadius: manual.serviceRadiusScore ?? null,
    aiResistanceTier: aiResistanceTierScore(category),
  };

  const scoredValues = Object.values(signals).filter(v => v !== null);
  const totalScore = scoredValues.reduce((sum, v) => sum + v, 0);

  const hardFail = manual.budgetHardFail === true || manual.capacityOk === false;

  const manualSignalsProvided = ['demandScore', 'unitEconomicsScore', 'budgetFloorScore', 'capacityOk', 'auctionSanityScore', 'serviceRadiusScore']
    .some(key => manual[key] !== undefined);

  /** @type {'automated' | 'partial-manual' | 'not-yet-scored'} */
  const signalsSource = manualSignalsProvided ? 'partial-manual' : 'not-yet-scored';

  let admission;
  if (hardFail) {
    admission = 'decline-or-site-only';
  } else if (signalsSource === 'not-yet-scored') {
    // A score built almost entirely from the two automatable signals must
    // never present as a real admission verdict (readiness-gate.md §3.4).
    admission = 'decline-or-site-only';
  } else if (totalScore >= ADMISSION_PILOT_MIN_SCORE) {
    admission = 'pilot';
  } else if (totalScore >= ADMISSION_CONDITIONAL_MIN_SCORE) {
    admission = 'conditional';
  } else {
    admission = 'decline-or-site-only';
  }

  const weakestEntry = Object.entries(signals)
    .filter(([, v]) => v !== null)
    .sort((a, b) => a[1] - b[1])[0];

  return {
    totalScore,
    hardFail,
    admission,
    weakestSignal: weakestEntry ? weakestEntry[0] : undefined,
    signalsSource,
    signals,
  };
}
