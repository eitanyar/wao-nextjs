import type { GoogleAdsOperatorTask } from './operator';
import type { CampaignConfig } from '../crm/intelligence';
import { buildWeeklyDigest } from '../crm/intelligence';
import { setCampaignDailyBudget, addNegativeKeywords, addPositiveKeywords, buildClient, resolveCustomer } from './mutations';
import {
  campaignType,
  resolveCplCeilingIls,
  isCplCeilingBreached,
  evaluateBrandCplBaselineWatch,
  BRAND_BASELINE_DEGRADATION_MULTIPLIER,
} from './cpl-ceiling';
import { fetchSearchTermReport, fetchAdGroupBaselinesWithKeywords } from './search-term-fetch';
import { scoreSearchTerms, type ScoredSearchTerm } from './search-term-scoring';
import { resolveIntentDictionary } from './intent-dictionaries';
import { evaluateSearchTermHarvesting } from './searchTermHarvest';
import fs from 'fs';
import path from 'path';

/**
 * §4A.4's default campaign-scope trailing window (30 days). This is a simplification of the
 * spec's full per-client window logic (Retter's 7-day conversion-lag exclusion, AAAsada's
 * 60-90 day low-volume window, §6) — those nuances govern the search-term-level CUT/WATCH
 * decision, which is out of scope here (see docs/specs/priority-3-search-term-cleanup-scoring.md
 * §4A.5, scoped strictly to the `budget_tune` gate). Neither client is bound into this
 * pipeline yet (§6's blocking gap), so this window will not run against live Retter/AAAsada
 * data until that onboarding happens and the window is revisited.
 */
const BUDGET_TUNE_CPL_TRAILING_WINDOW_DAYS = 30;

/**
 * Live campaign spend + name over the trailing window, for the §4A.5 CPL-ceiling gate.
 * Mirrors the existing pattern in `weekly-digest-batch.ts` (same GAQL shape, same fail-soft
 * try/catch — an Ads API error here must not itself block the campaign, only a *confirmed*
 * CPL breach or baseline-watch should). `campaign.name` is now also pulled (§4A.0) — it's
 * needed to classify brand vs. non-brand before any §4A gate can apply correctly.
 */
async function fetchTrailingCampaignSpendAndName(
  campaignConfig: CampaignConfig,
  campaignId: string,
  clientInstance?: ReturnType<typeof buildClient>
): Promise<{ spendMicros?: number; conversions?: number; campaignName?: string }> {
  try {
    const customer = resolveCustomer(campaignConfig, clientInstance);
    const query = `SELECT campaign.name, metrics.cost_micros, metrics.all_conversions FROM campaign WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS`;
    const rows = (await customer.query(query)) as Array<{
      campaign?: { name?: string | null };
      metrics?: { cost_micros?: string | number | null; all_conversions?: string | number | null };
    }>;
    const costMicros = rows?.[0]?.metrics?.cost_micros;
    const conversions = rows?.[0]?.metrics?.all_conversions;
    return {
      spendMicros: costMicros !== undefined && costMicros !== null ? Number(costMicros) : undefined,
      conversions: conversions !== undefined && conversions !== null ? Number(conversions) : undefined,
      campaignName: rows?.[0]?.campaign?.name ?? undefined,
    };
  } catch (err) {
    console.warn('[executor] Failed to fetch trailing campaign spend/name for CPL-ceiling gate:', err);
    return {};
  }
}

/**
 * Per-client trailing-window overrides for search-term scoring, per spec §6:
 *  - AAAsada: low-volume account, most terms would sit under the 20-impression eligibility
 *    floor on a 30-day window. Use 60-90 days (75 as the midpoint) before proposing any CUT.
 *  - Retter: default 30 days is fine for volume, but the spec also calls for excluding the
 *    trailing 7 days of clicks from the WASTED_SPEND_CUT calculation (conversion-lag buffer
 *    for a multi-step course-enrollment funnel). That per-click date exclusion is NOT
 *    implemented in this pass (our GAQL pull aggregates cost/clicks over the whole window,
 *    it doesn't do click-level date filtering for one flag only) — flagged clearly as a
 *    scope simplification; Retter's WASTED_SPEND_CUT proposals may be slightly more
 *    aggressive than the full spec intends until this is added.
 */
const SEARCH_TERM_WINDOW_DAYS_BY_CLIENT: Record<string, number> = {
  aasada: 75,
};

function resolveSearchTermWindowDays(clientId: string | undefined): number {
  if (!clientId) return 30;
  return SEARCH_TERM_WINDOW_DAYS_BY_CLIENT[clientId] ?? 30;
}

/**
 * §4's "account_trailing_90d_avg_CPL" input for the WASTED_SPEND_CUT cost bar
 * (`max(2 * trailing avg CPL, 0.15 * avgJobValue)`). Reuses `buildWeeklyDigest`'s
 * cost/verified-lead CPL formula (already the single source of truth for CPL elsewhere in
 * this file, §4A.4) over a 90-day window. Fail-soft: an Ads API error or zero verified leads
 * returns `undefined`, and the caller degrades gracefully (falls back to the avgJobValue
 * backstop only, or skips the wasted-spend check entirely if that's also missing — spec's
 * explicit "don't invent numbers" constraint).
 */
async function fetchTrailingAvgCplIls90d(
  campaignConfig: CampaignConfig,
  campaignId: string,
  clientInstance?: ReturnType<typeof buildClient>
): Promise<number | undefined> {
  try {
    const customer = resolveCustomer(campaignConfig, clientInstance);
    const end = new Date();
    const start = new Date(end.getTime() - 90 * 86400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const query = `SELECT metrics.cost_micros, metrics.all_conversions FROM campaign WHERE campaign.id = ${campaignId} AND segments.date BETWEEN '${fmt(start)}' AND '${fmt(end)}'`;
    const rows = (await customer.query(query)) as Array<{ metrics?: { cost_micros?: string | number | null; all_conversions?: string | number | null } }>;
    const costMicros = rows?.[0]?.metrics?.cost_micros;
    if (costMicros === undefined || costMicros === null) return undefined;
    const conversions = rows?.[0]?.metrics?.all_conversions;
    const digest = buildWeeklyDigest({
      campaign: campaignConfig,
      windowDays: 90,
      performance: {
        spendMicros: Number(costMicros),
        conversions: conversions !== undefined && conversions !== null ? Number(conversions) : undefined,
      },
    });
    return digest.totals.cpl;
  } catch (err) {
    console.warn('[executor] Failed to fetch trailing 90d avg CPL for wasted-spend backstop:', err);
    return undefined;
  }
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
}

/**
 * Read-only preview of what the `search_term_cleanup` case above would propose, for display
 * on the review-card (§5's "12 search terms flagged for negative — ₪340 wasted spend" copy,
 * fed into `buildGoogleAdsOperatorTasks`'s `searchTermCleanupPreview` param). Deliberately
 * shares the exact fetch → score sequence and the same CUT-eligibility filter as the
 * `search_term_cleanup` execution case (`toMutate`) so the preview count never diverges from
 * what an actual approval would do — but it never calls `addNegativeKeywords` or any other
 * mutation, only GAQL reads via `fetchSearchTermReport`/`fetchAdGroupBaselinesWithKeywords`/
 * `fetchTrailingAvgCplIls90d`. Fail-soft: any Ads API error returns `undefined`, and the
 * caller falls back to the pre-existing generic card copy, same posture as every other
 * live-data pull in this file.
 */
export async function buildSearchTermCleanupPreview(params: {
  campaignConfig: CampaignConfig;
  campaignId: string;
  clientId: string;
  clientInstance?: ReturnType<typeof buildClient>;
}): Promise<{ cutCount: number; watchCount: number; wastedSpendIls: number } | undefined> {
  const { campaignConfig, campaignId, clientId, clientInstance } = params;
  const windowDays = resolveSearchTermWindowDays(clientId);
  try {
    const rows = await fetchSearchTermReport({ campaignConfig, campaignId, windowDays, clientInstance });
    if (!rows.length) return { cutCount: 0, watchCount: 0, wastedSpendIls: 0 };

    const baselines = await fetchAdGroupBaselinesWithKeywords({ campaignConfig, campaignId, windowDays, clientInstance });
    const trailingAvgCplIls = await fetchTrailingAvgCplIls90d(campaignConfig, campaignId, clientInstance);
    const intentDictionary = resolveIntentDictionary(clientId);

    const scored = scoreSearchTerms({
      rows,
      baselines,
      intentDictionary,
      wastedSpend: {
        trailingAvgCplIls,
        avgJobValueIls: campaignConfig.avgJobValue,
      },
    });

    // Same high-confidence CUT filter as `toMutate` below — the preview must count exactly
    // what an approval would actually cut, not every soft-flagged term.
    const cutTerms = scored.filter(
      (t): t is ScoredSearchTerm & { adGroupResourceName: string } =>
        t.verdict === 'CUT' && t.confidence === 'high' && !!t.adGroupResourceName
    );
    const watchCount = scored.filter((t) => t.verdict === 'WATCH').length;
    const wastedSpendIls = cutTerms.reduce((sum, t) => sum + t.metrics.costIls, 0);

    return { cutCount: cutTerms.length, watchCount, wastedSpendIls };
  } catch (err) {
    console.warn('[executor] Failed to build read-only search-term-cleanup preview:', err);
    return undefined;
  }
}

export async function executeGoogleAdsOperatorTask(params: {
  task: GoogleAdsOperatorTask;
  campaignConfig: CampaignConfig;
  campaignId: string;
  clientInstance?: ReturnType<typeof buildClient>;
}): Promise<ExecutionResult> {
  const { task, campaignConfig, campaignId, clientInstance } = params;

  switch (task.kind) {
    case 'budget_tune': {
      // §4A.5 hard gate — never increase spend on a campaign that isn't converting
      // efficiently. Compute trailing campaign-scope CPL (spec §4A.4: cost / verified leads,
      // reusing buildWeeklyDigest as the single source of truth for that computation) and
      // first classify the campaign brand/non-brand (§4A.0) before deciding which gate
      // applies — a non-brand campaign is gated on an absolute ceiling, a brand campaign on
      // its own trailing baseline (§4A.0.1/§4A.0.2). Neither gate applies until we know
      // which type this campaign is.
      const { spendMicros, conversions, campaignName } = await fetchTrailingCampaignSpendAndName(campaignConfig, campaignId, clientInstance);
      const cplDigest = buildWeeklyDigest({
        campaign: campaignConfig,
        windowDays: BUDGET_TUNE_CPL_TRAILING_WINDOW_DAYS,
        performance: spendMicros !== undefined ? { spendMicros, conversions } : undefined,
      });
      // §8.2 — campaignId now threaded into classification (exact-match requirement for the
      // seasonal-remarketing bucket).
      const type = campaignType(campaignName, task.clientId, campaignId);

      if (type !== 'brand') {
        // §8.2 — non-brand and seasonal-remarketing both get a real, enforceable ceiling;
        // `resolveCplCeilingIls` already resolves the correct sub-ceiling for either type.
        const cplCeilingIls = resolveCplCeilingIls({ clientId: task.clientId, campaignConfig, type });
        const ceilingTypeLabel = type === 'seasonal-remarketing' ? 'seasonal-remarketing' : 'non-brand';
        if (isCplCeilingBreached(cplDigest.totals.cpl, cplCeilingIls)) {
          return {
            success: false,
            error: `Budget increase blocked: trailing campaign CPL (₪${cplDigest.totals.cpl?.toFixed(0)}/lead over ${BUDGET_TUNE_CPL_TRAILING_WINDOW_DAYS}d) is already at or above this client's ${ceilingTypeLabel} ₪${cplCeilingIls}/lead ceiling. Clean up search terms and fix efficiency before increasing spend (per docs/specs/priority-3-search-term-cleanup-scoring.md §4A.5/§8.2).`,
          };
        }
      } else {
        // Brand campaign — no absolute ceiling (§4A.0.1). Block only if this campaign's
        // CPL has already degraded past its own trailing baseline (§4A.0.2). This call
        // also seeds the baseline on first run for this campaign (bootstrap rule) and
        // never fires on that first, freshly-seeded cycle.
        const watch = evaluateBrandCplBaselineWatch({
          clientId: task.clientId,
          campaignId,
          campaignName: campaignName ?? campaignConfig.businessName ?? campaignConfig.slug,
          currentCpl: cplDigest.totals.cpl,
          conversions: cplDigest.totals.verifiedLeads,
        });
        if (watch.watch) {
          return {
            success: false,
            error: `Budget increase blocked: this brand campaign's trailing CPL (₪${cplDigest.totals.cpl?.toFixed(0)}/lead over ${BUDGET_TUNE_CPL_TRAILING_WINDOW_DAYS}d) is already more than ${BRAND_BASELINE_DEGRADATION_MULTIPLIER}x its own baseline (₪${watch.baselineCpl?.toFixed(0)}/lead). "It should stay cheap" means investigate before scaling spend further (per docs/specs/priority-3-search-term-cleanup-scoring.md §4A.0.2/§4A.5).`,
          };
        }
      }

      // Under pacing and within the CPL gate for this campaign's type: increase daily
      // budget by +15%
      const currentBudget = campaignConfig.targetDailyBudget || 100;
      const newBudget = Math.round(currentBudget * 1.15);

      const mutResult = await setCampaignDailyBudget({
        campaignConfig,
        campaignId,
        dailyBudgetIls: newBudget,
        clientInstance,
      });

      if (!mutResult.success) {
        return { success: false, error: mutResult.error || 'Budget tune mutation failed' };
      }

      // Update on-disk campaign config
      try {
        const updatedConfig: CampaignConfig = {
          ...campaignConfig,
          targetDailyBudget: newBudget,
          targetMonthlyBudget: Math.round(newBudget * 30.4 * 100) / 100,
        };
        const configDir = path.join(process.cwd(), 'data', 'campaigns');
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(
          path.join(configDir, `${campaignConfig.slug}.json`),
          JSON.stringify(updatedConfig, null, 2),
          'utf8'
        );
      } catch (err: any) {
        console.warn('Failed to update campaign config file after budget tune:', err);
      }

      return { success: true };
    }
    case 'search_term_harvest': {
      if (task.campaignPhase !== 'growth' && task.campaignPhase !== 'maturity') {
        return {
          success: false,
          error: 'Search-term harvesting is only permitted for growth or maturity campaigns; no mutation performed.',
        };
      }

      const windowDays = resolveSearchTermWindowDays(task.clientId);
      let rows;
      try {
        rows = await fetchSearchTermReport({ campaignConfig, campaignId, windowDays, clientInstance });
      } catch (err) {
        return { success: false, error: `Failed to read search-term report: ${err instanceof Error ? err.message : String(err)}` };
      }

      const type = campaignType(rows[0]?.campaignName, task.clientId, campaignId);
      const targetCplIls = resolveCplCeilingIls({ clientId: task.clientId, campaignConfig, type });
      const candidates = evaluateSearchTermHarvesting({
        campaignId,
        targetCplIls,
        searchTerms: rows.map((row) => ({
          query: row.searchTerm,
          conversions: row.conversions,
          spendIls: row.costMicros / 1_000_000,
          isExistingKeyword: row.isExistingKeyword,
          hasNegativeKeywordConflict: row.hasNegativeKeywordConflict,
          adGroupResourceName: row.adGroupResourceName,
        })),
      });

      if (!candidates.length) {
        return { success: true, error: 'No eligible profitable search-term candidates; no mutation performed.' };
      }

      const groups = new Map<string, { adGroupResourceName: string; matchType: 'EXACT' | 'PHRASE'; keywords: Set<string> }>();
      for (const candidate of candidates) {
        const matchType = candidate.recommendedMatchType.toUpperCase() as 'EXACT' | 'PHRASE';
        const key = `${candidate.adGroupResourceName}|${matchType}`;
        const group = groups.get(key) ?? { adGroupResourceName: candidate.adGroupResourceName, matchType, keywords: new Set<string>() };
        group.keywords.add(candidate.query.trim());
        groups.set(key, group);
      }

      const failures: string[] = [];
      let addedCount = 0;
      const candidateCount = [...groups.values()].reduce((count, group) => count + group.keywords.size, 0);
      for (const group of groups.values()) {
        const keywords = [...group.keywords];
        const result = await addPositiveKeywords({
          campaignConfig,
          adGroupResourceName: group.adGroupResourceName,
          keywords,
          matchType: group.matchType,
          clientInstance,
        });
        if (result.success) {
          addedCount += keywords.length;
        } else {
          failures.push(`${group.adGroupResourceName} (${group.matchType}): ${result.error || 'unknown error'}`);
        }
      }

      if (failures.length) {
        return {
          success: addedCount > 0,
          error: `Added ${addedCount}/${candidateCount} positive keywords; ${failures.length} group(s) failed: ${failures.join('; ')}`,
        };
      }
      return { success: true };
    }
    case 'search_term_cleanup': {
      // Priority 3 — real read → score → propose → (on approval) mutate implementation, per
      // docs/specs/priority-3-search-term-cleanup-scoring.md §1-§5. This case only ever runs
      // post-approval (the review-card approval flow in operator-task/route.ts gates
      // execution behind a human Approve click) — but WATCH-verdict terms and low-confidence
      // (20-49 impression) CUTs still must never mutate even here, so the scorer's own
      // confidence banding is re-enforced below, not just trusted from upstream.
      const clientId = task.clientId;
      const windowDays = resolveSearchTermWindowDays(clientId);

      let rows;
      try {
        rows = await fetchSearchTermReport({ campaignConfig, campaignId, windowDays, clientInstance });
      } catch (err: any) {
        return { success: false, error: `Failed to read search-term report: ${err?.message || err}` };
      }

      if (!rows.length) {
        return { success: false, error: `No search-term data in the trailing ${windowDays}-day window — nothing to clean up.` };
      }

      const baselines = await fetchAdGroupBaselinesWithKeywords({ campaignConfig, campaignId, windowDays, clientInstance });
      const trailingAvgCplIls = await fetchTrailingAvgCplIls90d(campaignConfig, campaignId, clientInstance);
      const intentDictionary = resolveIntentDictionary(clientId);

      const scored = scoreSearchTerms({
        rows,
        baselines,
        intentDictionary,
        wastedSpend: {
          trailingAvgCplIls,
          avgJobValueIls: campaignConfig.avgJobValue,
        },
      });

      // Hard re-enforcement of the propose-only rule: only high-confidence CUT-verdict terms
      // with a resolvable ad-group resource name are ever mutated. WATCH terms (informational
      // only, per spec §5) and low-confidence terms (scoreSearchTerms already downgrades
      // these to WATCH, but re-check here defensively — never trust a single layer for a
      // live-mutation gate) are skipped, never negatived.
      const toMutate = scored.filter(
        (t): t is ScoredSearchTerm & { adGroupResourceName: string } =>
          t.verdict === 'CUT' && t.confidence === 'high' && !!t.adGroupResourceName
      );
      const watchOnly = scored.filter((t) => t.verdict === 'WATCH');

      if (!toMutate.length) {
        return {
          success: true, // nothing eligible to cut this cycle is a legitimate outcome, not a failure
          error: watchOnly.length
            ? `No high-confidence CUT terms this cycle — ${watchOnly.length} term(s) on WATCH, rolled into next cycle. No mutation performed.`
            : 'No search terms crossed the CUT or WATCH bar this cycle — account looks clean.',
        };
      }

      // Group by (adGroupResourceName, matchType) — one addNegativeKeywords call per group,
      // never omitting matchType (never falls through to mutations.ts's BROAD default).
      const groups = new Map<string, { adGroupResourceName: string; matchType: 'EXACT' | 'PHRASE'; keywords: string[] }>();
      for (const term of toMutate) {
        const key = `${term.adGroupResourceName}|${term.suggestedMatchType}`;
        const group = groups.get(key) ?? { adGroupResourceName: term.adGroupResourceName, matchType: term.suggestedMatchType, keywords: [] };
        group.keywords.push(term.searchTerm);
        groups.set(key, group);
      }

      const failures: string[] = [];
      let addedCount = 0;
      for (const group of groups.values()) {
        const result = await addNegativeKeywords({
          campaignConfig,
          adGroupResourceName: group.adGroupResourceName,
          keywords: group.keywords,
          matchType: group.matchType,
          clientInstance,
        });
        if (result.success) {
          addedCount += group.keywords.length;
        } else {
          failures.push(`${group.adGroupResourceName} (${group.matchType}): ${result.error || 'unknown error'}`);
        }
      }

      if (failures.length) {
        return {
          success: addedCount > 0,
          error: `Added ${addedCount}/${toMutate.length} negative keywords; ${failures.length} group(s) failed: ${failures.join('; ')}`,
        };
      }

      return { success: true };
    }
    case 'tracking_audit':
    case 'conversion_review':
    case 'lead_followup':
    case 'general_review':
    default:
      return { success: true };
  }
}
