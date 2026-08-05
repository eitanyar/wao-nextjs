import fs from 'fs';
import path from 'path';
import type { CampaignConfig } from '../crm/intelligence';
import { deriveCplCeilingIls } from '../crm/intelligence';

/**
 * Per-(client, campaign-type) CPL ceiling model, per
 * docs/specs/priority-3-search-term-cleanup-scoring.md §4A.0-§4A.5, extended by §8.1/§8.2 with
 * a third campaign type (`'seasonal-remarketing'`).
 *
 * This supersedes the earlier flat `CPL_CEILING_ILS_BY_CLIENT` model (one number per
 * client). Brand, non-brand, and seasonal-remarketing search campaigns have structurally
 * different economics — brand converts far more cheaply by nature, non-brand carries the real
 * cold-prospecting waste risk, and seasonal-remarketing (event-triggered DSA/remarketing
 * traffic) is structurally warmer than non-brand but, unlike brand, can still genuinely waste
 * money — so the ceiling is resolved per `(clientId, campaignType)`. Brand campaigns get a
 * different kind of check entirely (baseline-degradation WATCH, §4A.0.2) rather than a hard
 * ceiling; non-brand and seasonal-remarketing both get a real, enforceable ceiling, just
 * resolved against different numbers.
 */

/**
 * §8.2 — third bucket added alongside brand/non-brand:
 * docs/specs/priority-3-search-term-cleanup-scoring.md §8.1/§8.2. Covers campaigns whose
 * traffic is structurally warmer than cold local-intent prospecting (audience- or
 * page-content-triggered, e.g. event-specific DSA/remarketing) but that — unlike brand — can
 * still genuinely waste money and therefore need a real, enforceable CPL ceiling (not just a
 * baseline-degradation WATCH).
 */
export type CampaignType = 'brand' | 'non-brand' | 'seasonal-remarketing';

/**
 * Case-insensitive substring match against `campaign.name` (Hebrew + English variants),
 * per §4A.0. `campaignType()` below defaults to `'non-brand'` on no match — the safe
 * failure mode is holding an unclassified campaign to the stricter, ceiling-enforced path,
 * never silently exempting it.
 *
 * - `aasada`: CONFIRMED — AAAsada's live account has a campaign literally named "ברנד".
 * - `retter`: CONFIRMED live via GAQL (SELECT campaign.name FROM campaign against customer
 *   8344335641, live MCC), 2026-08-04. Retter's brand campaigns are named with the Hebrew
 *   word "מותג" ("brand"/"trademark"), not "ברנד" — e.g. the currently ENABLED Search
 *   campaign "רטר - מותג עלות התחרות לברנד" (campaign.id 23402666112,
 *   advertising_channel_type = SEARCH, status = ENABLED). Two further "מותג"-named Retter
 *   campaigns exist paused/removed ("רטר - מותג TLV Ariel", "רטר - מותג #2"), consistent
 *   naming convention. "ברנד" is kept in the list too (it happens to also appear as a
 *   substring of "לברנד" in the live campaign name, and covers any future differently-named
 *   brand campaign) but "מותג" is the pattern that actually matches Retter's real naming.
 */
export const BRAND_CAMPAIGN_NAME_PATTERNS: Record<string, string[]> = {
  retter: ['מותג', 'ברנד', 'brand'],
  aasada: ['ברנד', 'brand'],
};

/**
 * §8.1/§8.2 — the concept-level pattern list for the seasonal-remarketing bucket (named risk:
 * matching on the generic word "דינאמי"/"dynamic" is a *weaker* signal than "ברנד" — a future
 * non-brand prospecting campaign could plausibly contain "dynamic" in an unrelated sense). This
 * export documents the concept only; the classifier below does NOT substring-match against it.
 * Per §8.2's explicit mitigation, the actual implementation uses exact campaign-name/ID
 * matching (`SEASONAL_REMARKETING_EXACT_CAMPAIGNS` below) until a client has enough confirmed
 * campaigns of this type that name-listing individually becomes unwieldy.
 */
export const SEASONAL_REMARKETING_CAMPAIGN_NAME_PATTERNS: Record<string, string[]> = {
  aasada: ['דינאמי', 'dynamic'], // CONFIRMED this session: both known campaigns contain "דינאמי".
  // retter: not yet confirmed — do not assume Retter has none; confirm via the same live GAQL
  // check §4A.2 already flags for Retter's brand name.
};

/**
 * §8.2 — exact campaign-name/ID matching for the seasonal-remarketing bucket, per the section's
 * explicit safety mitigation: a false-positive match here would route a genuinely broken
 * non-brand campaign into the looser 1.25x ceiling instead of the stricter non-brand one, so
 * this bucket is intentionally NOT a loose substring rule. Matched on `campaignId` (primary,
 * stable across renames) OR an exact (case-insensitive, trimmed) `campaignName` match.
 *
 * - `aasada`: CONFIRMED this session — "אזכרות - שבעה - דינאמי" (24045777050) and
 *   "שבת חתן - דינאמי" (24053311090), both live Search campaigns.
 * - `retter`: no confirmed equivalent yet — leave empty until a live GAQL check identifies one
 *   (do not guess a pattern into existence).
 *
 * Only broaden this to a generic substring match (`SEASONAL_REMARKETING_CAMPAIGN_NAME_PATTERNS`
 * above) once a client has enough of this campaign type that listing them individually becomes
 * unwieldy, per §8.2.
 */
export const SEASONAL_REMARKETING_EXACT_CAMPAIGNS: Record<string, Array<{ campaignId: string; campaignName: string }>> = {
  aasada: [
    { campaignId: '24045777050', campaignName: 'אזכרות - שבעה - דינאמי' },
    { campaignId: '24053311090', campaignName: 'שבת חתן - דינאמי' },
  ],
  retter: [],
};

/**
 * Classifies a campaign as 'brand'/'non-brand'/'seasonal-remarketing' off `campaign.name`
 * (and, for seasonal-remarketing, `campaign.id`), per §4A.0/§8.2.
 *
 * Resolution order (§8.7's explicit "brand → seasonal-remarketing → non-brand default"):
 *  1. Brand — case-insensitive substring match against BRAND_CAMPAIGN_NAME_PATTERNS. Brand
 *     still wins on conflict (a hypothetical "ברנד - דינאמי" campaign resolves to 'brand').
 *  2. Seasonal-remarketing — EXACT campaign-id or exact-name match against
 *     SEASONAL_REMARKETING_EXACT_CAMPAIGNS (never a substring match, per §8.2's named risk).
 *  3. Non-brand — the safe default for anything unclassified, unchanged from §4A.0.
 *
 * A missing/unknown clientId or a name with no configured pattern list both fall through
 * to 'non-brand' — the stricter, ceiling-enforced path is the safe default, never the
 * looser one.
 */
export function campaignType(
  campaignName: string | undefined,
  clientId: string | undefined,
  campaignId?: string
): CampaignType {
  if (!campaignName || !clientId) return 'non-brand';

  const brandPatterns = BRAND_CAMPAIGN_NAME_PATTERNS[clientId];
  const lower = campaignName.toLowerCase();
  if (brandPatterns?.length && brandPatterns.some((pattern) => lower.includes(pattern.toLowerCase()))) {
    return 'brand';
  }

  const seasonalExact = SEASONAL_REMARKETING_EXACT_CAMPAIGNS[clientId];
  if (seasonalExact?.length) {
    const trimmedName = campaignName.trim().toLowerCase();
    const isSeasonal = seasonalExact.some(
      (entry) =>
        (campaignId !== undefined && entry.campaignId === campaignId) ||
        entry.campaignName.trim().toLowerCase() === trimmedName
    );
    if (isSeasonal) return 'seasonal-remarketing';
  }

  return 'non-brand';
}

/**
 * Real, Eitan-confirmed non-brand CPL ceilings (per verified lead, ILS), per spec
 * §4A.2/§4A.3. These are direct figures from Eitan (2026-08-04), not derived from
 * avgJobValue * closeRateEstimate * 0.3 — that formula remains a fallback path only, for
 * future clients without an explicit number (see resolveCplCeilingIls below).
 *
 * No 'brand' key exists here by design (§4A.0.1) — brand campaigns are not gated against
 * an absolute ceiling at all; they run evaluateBrandCplBaselineWatch instead.
 *
 * §8.1/§8.2 — `seasonalRemarketing` is optional and, where present, a PLACEHOLDER anchored at
 * 1.25x the client's confirmed non-brand ceiling (no Eitan-confirmed number exists for this
 * bucket yet, unlike nonBrand's real figures) — replace with Eitan's own number the moment he
 * has a view on it, same convention as nonBrand once superseded the derived-formula placeholder.
 */
export const CPL_CEILING_ILS_BY_CLIENT_AND_TYPE: Record<string, { nonBrand: number; seasonalRemarketing?: number }> = {
  retter: { nonBrand: 130 }, // Eitan, 2026-08-04 — real number, not derived.
  // seasonalRemarketing: TBD once/if a Retter equivalent campaign is confirmed (§8.1).
  aasada: { nonBrand: 80, seasonalRemarketing: 100 }, // nonBrand: Eitan, 2026-08-04 — real
  // number, not derived (deliberately the stricter of the two, consistent with AAAsada's
  // "financial difficulty" framing). seasonalRemarketing: 1.25x nonBrand, §8.1 placeholder.
};

/**
 * Resolve the CPL ceiling to gate a non-brand OR seasonal-remarketing campaign/term against.
 * Brand campaigns never resolve here — callers must branch on campaignType first and route
 * brand campaigns to evaluateBrandCplBaselineWatch instead (§4A.0.1); calling this with
 * type: 'brand' always returns undefined so a brand campaign can never be accidentally
 * ceiling-gated.
 *
 * Resolution order for non-brand (unchanged from §4A.1):
 *  1. The named, Eitan-confirmed non-brand ceiling above (Retter/AAAsada, §4A.2/§4A.3).
 *  2. When a campaignConfig is available and the client isn't in the named map, fall back
 *     to the generic derivation (deriveCplCeilingIls) already used elsewhere in the
 *     codebase — spec §4A.1's explicit "fallback for future clients" instruction.
 *  3. undefined when neither is available (e.g. sandbox/test campaigns with no real
 *     economics) — callers must treat undefined as "ceiling unknown, do not gate," never
 *     as a coerced 0.
 *
 * Resolution for seasonal-remarketing (§8.2 — "a branch mirroring the existing non-brand
 * one," no new resolution logic): the named `seasonalRemarketing` key first, then the same
 * generic-derivation fallback as non-brand (there is no separate seasonal-specific formula —
 * mirroring the existing convention is the spec's explicit instruction), then undefined.
 */
export function resolveCplCeilingIls(params: {
  clientId?: string;
  campaignConfig?: CampaignConfig;
  type: CampaignType;
}): number | undefined {
  const { clientId, campaignConfig, type } = params;
  if (type === 'brand') return undefined;

  if (clientId) {
    const entry = CPL_CEILING_ILS_BY_CLIENT_AND_TYPE[clientId];
    if (type === 'seasonal-remarketing') {
      if (entry?.seasonalRemarketing !== undefined) return entry.seasonalRemarketing;
    } else if (entry?.nonBrand !== undefined) {
      return entry.nonBrand;
    }
  }
  if (campaignConfig?.cplCeilingIls !== undefined) {
    return campaignConfig.cplCeilingIls;
  }
  if (campaignConfig) {
    return deriveCplCeilingIls(campaignConfig);
  }
  return undefined;
}

/**
 * Non-brand CPL_CEILING_BREACH/WATCH test (spec §4A.4's campaign-scope aggregation, gating
 * budget_tune per §4A.5; also the search-term-scope test in §5, same formula, different
 * scope). Both cpl and ceilingIls must be known — an unknown ceiling or an unknown trailing
 * CPL (e.g. no live spend data pulled yet) must never be treated as a breach; the gate is
 * "block on a confirmed breach," not "block whenever data is missing."
 */
export function isCplCeilingBreached(cpl: number | undefined, ceilingIls: number | undefined): boolean {
  if (cpl === undefined || ceilingIls === undefined) return false;
  return cpl >= ceilingIls;
}

// ---------------------------------------------------------------------------------------
// §4A.0.2 — BRAND_CPL_BASELINE_WATCH: brand-campaign baseline-degradation persistence.
// ---------------------------------------------------------------------------------------

/**
 * 50%+ worse than a brand campaign's own recent normal is a real "something changed"
 * signal without being noise-prone on ordinary week-to-week variance. Named, tunable
 * constant per spec §4A.0.2 — do not inline this multiplier at call sites.
 */
export const BRAND_BASELINE_DEGRADATION_MULTIPLIER = 1.5;

/**
 * Same high-confidence floor as §4A.4's non-brand banding (conversions >= 2) — don't fire
 * a baseline-degradation flag off a 1-lead sample.
 */
export const BRAND_BASELINE_WATCH_MIN_CONVERSIONS = 2;

interface BrandCplBaselineRecord {
  campaignId: string;
  campaignName: string;
  baselineCpl: number;
  /** ISO timestamp of when this baseline was first seeded. */
  seededAt: string;
}

/**
 * Minimal persistence for §4A.0.2's "compare against the campaign's own trailing history"
 * test — nothing in the codebase stored a rolling historical CPL baseline before this. One
 * small JSON file per client, keyed by campaignId, alongside the existing
 * data/clients/<clientId>/... per-client data convention (mirrors the data/campaigns/*.json
 * config-write pattern in executor.ts's budget_tune case).
 *
 * Minimal-version note (intentional simplification): the baseline is seeded once, on the
 * first cycle a brand campaign is scored, and then held fixed — it does not "roll forward"
 * automatically on every cycle the way the full spec language describes ("the 90 days
 * before the current window, rolling forward each cycle"). A fixed early baseline is the
 * safer conservative choice for a WATCH-only, never-CUT signal: it keeps flagging until a
 * human (Eitan) looks at it and resets it, rather than silently re-anchoring to a degraded
 * number and losing the signal. A future iteration can add scheduled baseline
 * refresh/reset if that turns out to be too noisy in practice.
 */
function brandBaselineStorePath(clientId: string): string {
  return path.join(process.cwd(), 'data', 'clients', clientId, 'google-ads', 'brand-cpl-baselines.json');
}

function loadBrandCplBaselines(clientId: string): Record<string, BrandCplBaselineRecord> {
  try {
    const raw = fs.readFileSync(brandBaselineStorePath(clientId), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveBrandCplBaselines(clientId: string, records: Record<string, BrandCplBaselineRecord>): void {
  const filePath = brandBaselineStorePath(clientId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf8');
}

/** Read-only lookup — used by callers that just want to display/inspect the current baseline. */
export function getBrandCplBaseline(clientId: string, campaignId: string): BrandCplBaselineRecord | undefined {
  return loadBrandCplBaselines(clientId)[campaignId];
}

/**
 * Explicit manual reset, for when Eitan investigates a BRAND_CPL_BASELINE_WATCH flag and
 * confirms the new, higher CPL is the legitimate new normal (e.g. a durable market change)
 * rather than a transient regression to fix. Not wired to any UI yet — exported for that
 * future hook; re-seeds on the next evaluateBrandCplBaselineWatch call after removal.
 */
export function resetBrandCplBaseline(clientId: string, campaignId: string): void {
  const records = loadBrandCplBaselines(clientId);
  if (records[campaignId]) {
    delete records[campaignId];
    saveBrandCplBaselines(clientId, records);
  }
}

/**
 * §4A.0.2's BRAND_CPL_BASELINE_WATCH test. Always WATCH-only, never CUT — callers must
 * never feed this into a negative-keyword mutation path. Per §4A.5, this DOES gate
 * budget_tune the same way a non-brand ceiling breach does (block the increase), but it
 * must never be treated as equivalent to a search-term-level CUT trigger.
 *
 * Bootstrap rule: on the first cycle a brand campaign is scored (no prior baseline), this
 * seeds and persists the observed CPL as the baseline and returns watch: false — there is
 * nothing to compare against yet, and firing on a freshly-seeded baseline would be
 * comparing a number to itself.
 */
export function evaluateBrandCplBaselineWatch(params: {
  clientId: string;
  campaignId: string;
  campaignName: string;
  currentCpl: number | undefined;
  conversions: number;
}): { watch: boolean; baselineCpl: number | undefined; justSeeded: boolean } {
  const { clientId, campaignId, campaignName, currentCpl, conversions } = params;

  if (currentCpl === undefined || conversions < BRAND_BASELINE_WATCH_MIN_CONVERSIONS) {
    const existing = getBrandCplBaseline(clientId, campaignId);
    return { watch: false, baselineCpl: existing?.baselineCpl, justSeeded: false };
  }

  const records = loadBrandCplBaselines(clientId);
  const existing = records[campaignId];

  if (!existing) {
    records[campaignId] = {
      campaignId,
      campaignName,
      baselineCpl: currentCpl,
      seededAt: new Date().toISOString(),
    };
    saveBrandCplBaselines(clientId, records);
    return { watch: false, baselineCpl: currentCpl, justSeeded: true };
  }

  const watch = currentCpl > BRAND_BASELINE_DEGRADATION_MULTIPLIER * existing.baselineCpl;
  return { watch, baselineCpl: existing.baselineCpl, justSeeded: false };
}
