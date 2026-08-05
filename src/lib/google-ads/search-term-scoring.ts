/**
 * Search-term cleanup scoring rubric, per
 * docs/specs/priority-3-search-term-cleanup-scoring.md §2-§5 (the core CTR-floor /
 * intent-mismatch / wasted-spend / combination-logic table).
 *
 * Deliberately a **pure, side-effect-free scoring function** — no GAQL, no fs, no network.
 * The read layer that pulls live `search_term_view`/`ad_group`/`ad_group_criterion` data
 * lives in `search-term-fetch.ts`; this module only turns rows + baselines + client context
 * into scored CUT/WATCH proposals, which is what makes it unit-testable with synthetic rows.
 *
 * Scope decision (flagged to Dror/Eitan): this module implements the core CUT/WATCH table
 * (spec §2-§5 — eligibility gate, CTR floor, intent-mismatch, wasted-spend, combination
 * logic, 15-term cap, EXACT/PHRASE match-type forcing). It does **not** implement the
 * search-term-scope `CPL_CEILING_BREACH`/`CPL_CEILING_WATCH` flags from spec §4A.4 (the
 * independent "converting but over the hard ₪ ceiling" CUT trigger) — that requires
 * per-term brand/non-brand campaign classification plus per-term CPL aggregation layered on
 * top of this rubric, and was not in the explicit numbered "read first" list for this task.
 * The campaign-level CPL ceiling (§4A.1-§4A.5) is already implemented and wired in
 * `cpl-ceiling.ts`/`operator.ts`/`executor.ts`'s `budget_tune` gate; a term-level CPL ceiling
 * CUT trigger is a reasonable fast-follow, not built here. Flag this clearly before treating
 * search_term_cleanup as fully closing spec §4A end-to-end.
 */

// ---------------------------------------------------------------------------------------
// Named, tunable constants (spec explicitly asks for these, not inline magic numbers).
// ---------------------------------------------------------------------------------------

/** §2 — below this, a single click swings CTR by 5+ points; pure noise, not signal. */
export const MIN_IMPRESSIONS_ELIGIBLE = 20;

/**
 * §2 confidence banding. [MIN_IMPRESSIONS_ELIGIBLE, HIGH_CONFIDENCE_IMPRESSIONS) = low
 * confidence — WATCH-only, never auto-propose a CUT, no matter how many flags fire.
 * >= HIGH_CONFIDENCE_IMPRESSIONS = high confidence — full CUT logic applies.
 */
export const HIGH_CONFIDENCE_IMPRESSIONS = 50;

/** §2 — term underperforms its own ad group's baseline CTR by 60%+. */
export const CTR_RELATIVE_THRESHOLD = 0.4;

/** §2 — absolute backstop: never flag a term that already clears 3% CTR outright. */
export const CTR_ABSOLUTE_BACKSTOP = 0.03;

/** §4 — never flag on cost alone below this click floor (CUT band). */
export const WASTED_SPEND_CUT_MIN_CLICKS = 5;

/** §4 — WATCH band's looser click floor (still requires a real sample, not one fluke click). */
export const WASTED_SPEND_WATCH_MIN_CLICKS = 3;

/** §4 — "burned 2x a normal lead's cost with zero return" half of the CUT cost bar. */
export const WASTED_SPEND_CPL_MULTIPLIER = 2;

/** §4 — the avgJobValue-based backstop half of the CUT cost bar, for thin-CPL-history accounts. */
export const WASTED_SPEND_JOB_VALUE_FRACTION = 0.15;

/** §4 — WATCH band fires at half the CUT cost bar, to accumulate more data before re-scoring. */
export const WASTED_SPEND_WATCH_FRACTION = 0.5;

/** §5 — card size cap, kept scannable for a human review click. */
export const MAX_TERMS_PER_TASK = 15;

// ---------------------------------------------------------------------------------------
// Tokenization for §3's intent-mismatch heuristic. Deliberately simple lexical tokenization
// (lowercase, strip punctuation/niqqud, drop a small Hebrew+English stopword list) — the
// spec calls for "compare stems/lemmas, not exact strings" but also says this must be
// rules-based with no LLM/semantic scoring. Full Hebrew stemming is out of scope for this
// pass (flagged below); token-equality after normalization is the implemented approximation.
// ---------------------------------------------------------------------------------------

const STOPWORDS = new Set([
  // Hebrew
  'את', 'של', 'עם', 'על', 'אל', 'זה', 'זו', 'הוא', 'היא', 'אני', 'אתה', 'הם', 'הן',
  'ל', 'ב', 'מ', 'ה', 'ו', 'כמו', 'איך', 'מה', 'מי', 'למה', 'כמה', 'יש', 'אין',
  // English
  'the', 'a', 'an', 'of', 'in', 'on', 'for', 'to', 'and', 'or', 'is', 'how', 'what',
  'near', 'me',
]);

const NIQQUD_RANGE = /[֑-ׇ]/g;
const PUNCTUATION = /[^\p{L}\p{N}\s]/gu;

export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(NIQQUD_RANGE, '')
    .replace(PUNCTUATION, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

// ---------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------

/** `segments.search_term_match_type` — the keyword match type that surfaced this term. */
export type TriggeringMatchType = 'BROAD' | 'PHRASE' | 'EXACT' | 'UNKNOWN';

/** Match type we're willing to force on an actual negative-keyword add — never BROAD (§5). */
export type NegativeMatchType = 'EXACT' | 'PHRASE';

export interface SearchTermReportRow {
  searchTerm: string;
  adGroupId: string;
  /** `ad_group_criterion`/`negative-keywords` resource name — needed to actually mutate. */
  adGroupResourceName?: string;
  campaignId: string;
  campaignName?: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
  triggeringMatchType: TriggeringMatchType;
}

export interface AdGroupBaseline {
  /** Trailing-window baseline CTR (clicks/impressions) for this ad group, §2. */
  ctr: number;
  /** Tokenized, deduped tokens from every live positive keyword in this ad group, §3. */
  positiveKeywordTokens: string[];
}

/** Spec §3/§5 — hand-curated per-client setup data. Optional per ad group / per client. */
export interface ClientIntentDictionary {
  /** Short, hand-authored anchor tokens per ad group (spec §3's "pinned anchor token(s)"). */
  anchorTokensByAdGroupId?: Record<string, string[]>;
  /** Generic low-intent modifiers + vertical-specific negative-intent terms (tokenized). */
  negativeIntentTokens?: string[];
}

/** §4 — inputs for the wasted-spend-with-zero-conversions economics test. */
export interface WastedSpendContext {
  /** Account trailing ~90d avg cost-per-verified-lead (₪), when known. */
  trailingAvgCplIls?: number;
  /** `campaignConfig.avgJobValue` — backstop for accounts too new/thin for a reliable CPL. */
  avgJobValueIls?: number;
}

export interface ScoredSearchTerm {
  searchTerm: string;
  adGroupId: string;
  adGroupResourceName?: string;
  campaignId: string;
  verdict: 'CUT' | 'WATCH';
  confidence: 'low' | 'high';
  reasons: string[];
  suggestedMatchType: NegativeMatchType;
  metrics: {
    impressions: number;
    clicks: number;
    costIls: number;
    conversions: number;
    ctr: number;
  };
  /** Internal sort key — wasted-spend CUTs first, then combined-flag CUTs, then WATCH. */
  severityRank: number;
}

function costIlsFromMicros(costMicros: number): number {
  return costMicros / 1_000_000;
}

function suggestMatchType(searchTerm: string): NegativeMatchType {
  // §5 — single-word terms get EXACT (a broad/phrase negative on one generic word risks
  // blocking legitimate multi-word queries containing it); multi-word terms get PHRASE.
  // Never BROAD, no matter what — the type system itself forbids returning 'BROAD' here.
  return searchTerm.trim().split(/\s+/).filter(Boolean).length === 1 ? 'EXACT' : 'PHRASE';
}

/**
 * §2 — CTR_LOW test. Only evaluable (and only ever a soft flag, never standalone-CUT — see
 * scoreSearchTerms) when the term already cleared the eligibility floor upstream.
 */
function isCtrLow(row: SearchTermReportRow, baseline: AdGroupBaseline | undefined): boolean {
  if (!baseline || baseline.ctr <= 0) return false;
  const ctr = row.impressions > 0 ? row.clicks / row.impressions : 0;
  return ctr <= CTR_RELATIVE_THRESHOLD * baseline.ctr && ctr < CTR_ABSOLUTE_BACKSTOP;
}

/**
 * §3 — INTENT_MISMATCH test. Requires a per-client negative-intent dictionary to be
 * configured at all — per spec §6, this must be skipped entirely (not guessed) for a client
 * with no curated dictionary yet (e.g. AAAsada, pending service-scope assessment).
 */
function evaluateIntentMismatch(
  row: SearchTermReportRow,
  baseline: AdGroupBaseline | undefined,
  dictionary: ClientIntentDictionary | undefined
): { mismatch: boolean; cutEligible: boolean; reason?: string } {
  if (!dictionary?.negativeIntentTokens?.length) {
    return { mismatch: false, cutEligible: false };
  }

  const termTokens = tokenize(row.searchTerm);
  if (termTokens.length === 0) return { mismatch: false, cutEligible: false };

  const positiveTokens = new Set(baseline?.positiveKeywordTokens ?? []);
  const hasOverlap = termTokens.some((t) => positiveTokens.has(t));
  if (hasOverlap) return { mismatch: false, cutEligible: false };

  const anchorTokens = dictionary.anchorTokensByAdGroupId?.[row.adGroupId] ?? [];
  const hasAnchor = anchorTokens.length > 0 && termTokens.some((t) => anchorTokens.includes(t));
  if (hasAnchor) return { mismatch: false, cutEligible: false };

  const negativeTokens = new Set(dictionary.negativeIntentTokens);
  const matchedNegative = termTokens.find((t) => negativeTokens.has(t));
  if (!matchedNegative) return { mismatch: false, cutEligible: false };

  // §3 — EXACT-triggered mismatch is "flag for manual review, don't auto-propose a cut."
  // The mismatch is still real (WATCH-eligible), it just can never drive a CUT.
  const cutEligible = row.triggeringMatchType === 'BROAD' || row.triggeringMatchType === 'PHRASE';
  const reason = cutEligible
    ? `Intent mismatch: no overlap with ad-group positive keywords, matches negative-intent term "${matchedNegative}" (triggered via ${row.triggeringMatchType})`
    : `Intent mismatch flagged for manual keyword-taxonomy review: matches negative-intent term "${matchedNegative}", but triggered via EXACT — an exact keyword producing this term usually means the taxonomy needs a look, not just a negative`;

  return { mismatch: true, cutEligible, reason };
}

/** §4 — the CUT cost bar: max(2x trailing avg CPL, 0.15x avgJobValue). Undefined if neither input is known. */
function wastedSpendCutBar(context: WastedSpendContext): number | undefined {
  const fromCpl = context.trailingAvgCplIls !== undefined ? WASTED_SPEND_CPL_MULTIPLIER * context.trailingAvgCplIls : undefined;
  const fromJobValue = context.avgJobValueIls !== undefined ? WASTED_SPEND_JOB_VALUE_FRACTION * context.avgJobValueIls : undefined;
  if (fromCpl === undefined && fromJobValue === undefined) return undefined;
  return Math.max(fromCpl ?? 0, fromJobValue ?? 0);
}

function evaluateWastedSpend(
  row: SearchTermReportRow,
  context: WastedSpendContext
): { cut: boolean; watch: boolean; reason?: string } {
  if (row.conversions !== 0) return { cut: false, watch: false };
  const cutBar = wastedSpendCutBar(context);
  if (cutBar === undefined) return { cut: false, watch: false }; // degrade gracefully — no economics data yet

  const costIls = costIlsFromMicros(row.costMicros);

  if (row.clicks >= WASTED_SPEND_CUT_MIN_CLICKS && costIls >= cutBar) {
    return {
      cut: true,
      watch: false,
      reason: `Wasted spend: ₪${costIls.toFixed(0)} cost across ${row.clicks} clicks, 0 conversions (≥ ₪${cutBar.toFixed(0)} cut bar)`,
    };
  }

  if (row.clicks >= WASTED_SPEND_WATCH_MIN_CLICKS && costIls >= WASTED_SPEND_WATCH_FRACTION * cutBar) {
    return {
      cut: false,
      watch: true,
      reason: `Rising spend with 0 conversions: ₪${costIls.toFixed(0)} across ${row.clicks} clicks (watch bar ₪${(WASTED_SPEND_WATCH_FRACTION * cutBar).toFixed(0)}) — roll into next cycle`,
    };
  }

  return { cut: false, watch: false };
}

export interface ScoreSearchTermsParams {
  rows: SearchTermReportRow[];
  /** Keyed by `adGroupId`. */
  baselines: Map<string, AdGroupBaseline>;
  intentDictionary?: ClientIntentDictionary;
  wastedSpend: WastedSpendContext;
}

/**
 * Scores every eligible search term per spec §2-§5 and returns CUT/WATCH proposals, capped
 * at MAX_TERMS_PER_TASK and sorted wasted-spend-CUTs-first, then combined-flag CUTs, then
 * WATCH (highest cost first within each band, per §5's "highest-cost-first" instruction).
 */
export function scoreSearchTerms(params: ScoreSearchTermsParams): ScoredSearchTerm[] {
  const { rows, baselines, intentDictionary, wastedSpend } = params;
  const results: ScoredSearchTerm[] = [];

  for (const row of rows) {
    // §2 — eligibility gate. Below the floor, a term is pure noise: skip entirely, no
    // CUT, no WATCH, no card noise.
    if (row.impressions < MIN_IMPRESSIONS_ELIGIBLE) continue;

    const confidence: 'low' | 'high' = row.impressions >= HIGH_CONFIDENCE_IMPRESSIONS ? 'high' : 'low';
    const baseline = baselines.get(row.adGroupId);
    const ctr = row.impressions > 0 ? row.clicks / row.impressions : 0;

    const reasons: string[] = [];

    // §2 — CTR_LOW only usable as a soft flag on high-confidence terms (§2's explicit rule:
    // "CTR signal alone cannot drive a CUT this cycle" below 50 impressions).
    const ctrLow = confidence === 'high' && isCtrLow(row, baseline);
    if (ctrLow && baseline) {
      reasons.push(
        `CTR ${(ctr * 100).toFixed(2)}% is ≤ 40% of ad-group baseline ${(baseline.ctr * 100).toFixed(2)}% (${row.impressions} impressions, high confidence)`
      );
    }

    const intent = evaluateIntentMismatch(row, baseline, intentDictionary);
    if (intent.mismatch && intent.reason) reasons.push(intent.reason);

    const waste = evaluateWastedSpend(row, wastedSpend);
    if (waste.reason) reasons.push(waste.reason);

    // §5 combination logic. Count set is {CTR_LOW, INTENT_MISMATCH (cut-eligible only),
    // WASTED_SPEND_CUT} — an EXACT-triggered mismatch never contributes to the CUT count,
    // per §3's explicit "never auto-propose a cut" rule, even though it's still a real,
    // reportable signal (surfaced as WATCH-eligible above).
    const cutFlagCount = [ctrLow, intent.mismatch && intent.cutEligible, waste.cut].filter(Boolean).length;

    let verdict: 'CUT' | 'WATCH' | undefined;
    let severityRank = 0;

    if (waste.cut) {
      verdict = 'CUT';
      severityRank = 0; // wasted-spend CUTs first
    } else if (cutFlagCount >= 2) {
      verdict = 'CUT';
      severityRank = 1; // combined-flag CUTs next
    } else if (ctrLow || intent.mismatch || waste.watch) {
      verdict = 'WATCH';
      severityRank = 2;
    }

    // §2's confidence-banding hard rule: a low-confidence (20-49 impression) term is
    // WATCH-only this cycle, no matter what combination of flags fired.
    if (verdict === 'CUT' && confidence === 'low') {
      verdict = 'WATCH';
      severityRank = 2;
      reasons.push(`Downgraded CUT→WATCH: only ${row.impressions} impressions (low confidence, floor is ${HIGH_CONFIDENCE_IMPRESSIONS} for a CUT this cycle)`);
    }

    if (!verdict || reasons.length === 0) continue; // no task, no card noise (§5)

    results.push({
      searchTerm: row.searchTerm,
      adGroupId: row.adGroupId,
      adGroupResourceName: row.adGroupResourceName,
      campaignId: row.campaignId,
      verdict,
      confidence,
      reasons,
      suggestedMatchType: suggestMatchType(row.searchTerm),
      metrics: {
        impressions: row.impressions,
        clicks: row.clicks,
        costIls: costIlsFromMicros(row.costMicros),
        conversions: row.conversions,
        ctr,
      },
      severityRank,
    });
  }

  results.sort((a, b) => {
    if (a.severityRank !== b.severityRank) return a.severityRank - b.severityRank;
    return b.metrics.costIls - a.metrics.costIls; // highest-cost-first within each band
  });

  return results.slice(0, MAX_TERMS_PER_TASK);
}
