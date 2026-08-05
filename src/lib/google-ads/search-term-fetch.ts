/**
 * GAQL read layer for search-term cleanup, per
 * docs/specs/priority-3-search-term-cleanup-scoring.md §1 (queries A/B/C). Follows the exact
 * `resolveCustomer(campaignConfig, clientInstance).query(...)` pattern already used in
 * `executor.ts`'s `fetchTrailingCampaignSpendAndName` and `operator-task/route.ts`'s
 * `fetchLivePerformance` — same fail-soft posture is intentionally NOT applied here (unlike
 * those two helpers, a read failure in this module should surface to the caller so the
 * `search_term_cleanup` task can report "couldn't read search-term data" rather than silently
 * scoring against an empty report).
 *
 * All three queries hard-filter `campaign.advertising_channel_type = 'SEARCH'` even though
 * `search_term_view` is a Search-only resource today — a safety filter against future account
 * changes, per spec §1.
 *
 * Field names verified against this repo's pinned `google-ads-api` SDK version
 * (`node_modules/google-ads-api/build/src/protos/autogen/fields.d.ts`) as of this session:
 * `search_term_view.search_term`, `search_term_view.status`, `search_term_view.ad_group`,
 * `segments.search_term_match_type`, `ad_group_criterion.keyword.text`,
 * `ad_group_criterion.keyword.match_type` all exist in that SDK's type definitions.
 */

import type { CampaignConfig } from '@/lib/crm/intelligence';
import { resolveCustomer, buildClient } from './mutations';
import { tokenize, type AdGroupBaseline, type SearchTermReportRow, type TriggeringMatchType } from './search-term-scoring';

/** GAQL only accepts specific literal windows for `segments.date DURING <literal>`; we use an
 * explicit BETWEEN range instead so callers can pass any window length (30d default, 60-90d
 * for AAAsada's low-volume override, spec §6). */
function windowDateRange(windowDays: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - windowDays * 86400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function toMatchType(raw: unknown): TriggeringMatchType {
  const value = String(raw ?? '').toUpperCase();
  if (value === 'BROAD') return 'BROAD';
  if (value === 'PHRASE') return 'PHRASE';
  if (value === 'EXACT') return 'EXACT';
  return 'UNKNOWN';
}

export interface FetchSearchTermReportParams {
  campaignConfig: CampaignConfig;
  campaignId: string;
  /** Trailing window length in days (default 30, spec §1/§6). */
  windowDays?: number;
  clientInstance?: ReturnType<typeof buildClient>;
}

/** Query (A) — search-term performance over the trailing window, scoped to one campaign. */
export async function fetchSearchTermReport(params: FetchSearchTermReportParams): Promise<SearchTermReportRow[]> {
  const { campaignConfig, campaignId, windowDays = 30, clientInstance } = params;
  const customer = resolveCustomer(campaignConfig, clientInstance);
  const { start, end } = windowDateRange(windowDays);

  const query = `
    SELECT
      search_term_view.search_term,
      segments.search_term_match_type,
      campaign.id, campaign.name, campaign.advertising_channel_type,
      ad_group.id,
      metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.all_conversions
    FROM search_term_view
    WHERE campaign.advertising_channel_type = 'SEARCH'
      AND campaign.id = ${campaignId}
      AND segments.date BETWEEN '${start}' AND '${end}'
  `;

  const rows = (await customer.query(query)) as Array<{
    search_term_view?: { search_term?: string | null };
    segments?: { search_term_match_type?: unknown };
    campaign?: { id?: string | number; name?: string | null };
    ad_group?: { id?: string | number };
    metrics?: {
      impressions?: string | number | null;
      clicks?: string | number | null;
      cost_micros?: string | number | null;
      all_conversions?: string | number | null;
    };
  }>;

  return rows
    .filter((r) => r.search_term_view?.search_term && r.ad_group?.id !== undefined)
    .map((r) => ({
      searchTerm: String(r.search_term_view!.search_term),
      adGroupId: String(r.ad_group!.id),
      // Constructed directly rather than relying on `campaignConfig.adGroupResourceName`
      // (which only names the single default ad group created at campaign-creation time) —
      // a campaign can have multiple ad groups, and search terms span all of them. Standard
      // Google Ads resource-name format.
      adGroupResourceName: `customers/${campaignConfig.customerId}/adGroups/${r.ad_group!.id}`,
      campaignId: String(r.campaign?.id ?? campaignId),
      campaignName: r.campaign?.name ?? undefined,
      impressions: Number(r.metrics?.impressions ?? 0),
      clicks: Number(r.metrics?.clicks ?? 0),
      costMicros: Number(r.metrics?.cost_micros ?? 0),
      conversions: Number(r.metrics?.all_conversions ?? 0),
      triggeringMatchType: toMatchType(r.segments?.search_term_match_type),
    }));
}

export interface FetchAdGroupBaselinesParams {
  campaignConfig: CampaignConfig;
  campaignId: string;
  windowDays?: number;
  clientInstance?: ReturnType<typeof buildClient>;
}

/** Query (B) — ad-group baseline CTR over the same window, keyed by `ad_group.id`. */
export async function fetchAdGroupBaselines(
  params: FetchAdGroupBaselinesParams
): Promise<Map<string, Pick<AdGroupBaseline, 'ctr'>>> {
  const { campaignConfig, campaignId, windowDays = 30, clientInstance } = params;
  const customer = resolveCustomer(campaignConfig, clientInstance);
  const { start, end } = windowDateRange(windowDays);

  const query = `
    SELECT ad_group.id, metrics.impressions, metrics.clicks
    FROM ad_group
    WHERE campaign.advertising_channel_type = 'SEARCH'
      AND campaign.id = ${campaignId}
      AND segments.date BETWEEN '${start}' AND '${end}'
  `;

  const rows = (await customer.query(query)) as Array<{
    ad_group?: { id?: string | number };
    metrics?: { impressions?: string | number | null; clicks?: string | number | null };
  }>;

  const out = new Map<string, Pick<AdGroupBaseline, 'ctr'>>();
  for (const r of rows) {
    if (r.ad_group?.id === undefined) continue;
    const adGroupId = String(r.ad_group.id);
    const impressions = Number(r.metrics?.impressions ?? 0);
    const clicks = Number(r.metrics?.clicks ?? 0);
    out.set(adGroupId, { ctr: impressions > 0 ? clicks / impressions : 0 });
  }
  return out;
}

export interface FetchAdGroupPositiveKeywordsParams {
  campaignConfig: CampaignConfig;
  campaignId: string;
  clientInstance?: ReturnType<typeof buildClient>;
}

/** Query (C) — live positive keywords per ad group, tokenized for the §3 overlap test. */
export async function fetchAdGroupPositiveKeywordTokens(
  params: FetchAdGroupPositiveKeywordsParams
): Promise<Map<string, string[]>> {
  const { campaignConfig, campaignId, clientInstance } = params;
  const customer = resolveCustomer(campaignConfig, clientInstance);

  const query = `
    SELECT ad_group.id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type
    FROM ad_group_criterion
    WHERE ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.negative = false
      AND campaign.advertising_channel_type = 'SEARCH'
      AND campaign.id = ${campaignId}
  `;

  const rows = (await customer.query(query)) as Array<{
    ad_group?: { id?: string | number };
    ad_group_criterion?: { keyword?: { text?: string | null } };
  }>;

  const out = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.ad_group?.id === undefined || !r.ad_group_criterion?.keyword?.text) continue;
    const adGroupId = String(r.ad_group.id);
    const tokens = tokenize(r.ad_group_criterion.keyword.text);
    const set = out.get(adGroupId) ?? new Set<string>();
    tokens.forEach((t) => set.add(t));
    out.set(adGroupId, set);
  }

  const flat = new Map<string, string[]>();
  out.forEach((set, adGroupId) => flat.set(adGroupId, Array.from(set)));
  return flat;
}

/** Combines (B) and (C) into the `AdGroupBaseline` shape `scoreSearchTerms` expects. */
export async function fetchAdGroupBaselinesWithKeywords(params: {
  campaignConfig: CampaignConfig;
  campaignId: string;
  windowDays?: number;
  clientInstance?: ReturnType<typeof buildClient>;
}): Promise<Map<string, AdGroupBaseline>> {
  const [ctrByAdGroup, keywordsByAdGroup] = await Promise.all([
    fetchAdGroupBaselines(params),
    fetchAdGroupPositiveKeywordTokens(params),
  ]);

  const merged = new Map<string, AdGroupBaseline>();
  const adGroupIds = new Set([...ctrByAdGroup.keys(), ...keywordsByAdGroup.keys()]);
  adGroupIds.forEach((adGroupId) => {
    merged.set(adGroupId, {
      ctr: ctrByAdGroup.get(adGroupId)?.ctr ?? 0,
      positiveKeywordTokens: keywordsByAdGroup.get(adGroupId) ?? [],
    });
  });
  return merged;
}
