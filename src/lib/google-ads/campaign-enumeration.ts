/**
 * Campaign-enumeration fix, per docs/specs/priority-3-search-term-cleanup-scoring.md §8.3.
 *
 * Replaces the wrong mechanism this pipeline used to lean on
 * (`GoogleAdsClientIndex.campaigns[]` / `primaryCampaignId`, which tracks WAO-originated,
 * landing-page-bound campaigns — populated one entry at a time by `bindCampaignToClient()` —
 * not "every enabled campaign under this client's live `customerId`"). AAAsada's 5 live,
 * founder-managed campaigns have no WAO `CampaignConfig`/slug at all; a genuinely new,
 * separate enumeration step, keyed by `customerId`, is required. `GoogleAdsClientIndex` keeps
 * its existing meaning unchanged — this is additive, computed live, never persisted as client
 * config.
 */

import { buildClient, resolveAdsAccount } from './mutations';
import { campaignType, type CampaignType } from './cpl-ceiling';

export interface EnumeratedCampaign {
  campaignId: string;
  campaignName: string;
  advertisingChannelType: string;
  /** `campaign.dynamic_search_ads_setting.domain_name` present, per §8.1's blocking flag on
   * whether AAAsada's two "-דינאמי" campaigns are DSA or Display/PMax dynamic remarketing. */
  isDsaSetting: boolean;
  /** Classified per §4A.0/§8.2 (brand → seasonal-remarketing → non-brand default). */
  type: CampaignType;
  spendIls: number;
  /** From `metrics.all_conversions`, per §8.4 — not `metrics.conversions`. */
  conversions: number;
  /** `spendIls / conversions`, undefined when `conversions === 0` (that case belongs to §4,
   * not the CPL-ceiling gate). Reporting only — gates use `cplGateConversions()`. */
  cpl: number | undefined;
  /**
   * Google-recorded verified-lead conversions (`metrics.conversions` segmented by the
   * verified-lead conversion action) over the same window — ads-bot-phase2 spec §3 0f. Only set
   * when `verifiedConversionsSource === 'verified_lead'`.
   */
  verifiedConversions?: number;
  /**
   * `verified_lead`: the 0f read ran. `not_configured`: the account has no WAO verified-lead
   * action (founder-managed accounts such as Retter / AAAsada). `error`: the 0f read failed, so
   * no gate may use this campaign's numbers this cycle. Absent = enumeration called without a
   * verified-lead action (legacy callers), same as `not_configured`.
   */
  verifiedConversionsSource?: 'verified_lead' | 'not_configured' | 'error';
}

/** Raw shape of one row from the 0f verified-lead query. */
export interface RawVerifiedConversionRow {
  campaign?: { id?: string | number | null };
  segments?: { conversion_action?: string | null };
  metrics?: { conversions?: string | number | null };
}

const CONVERSION_ACTION_RESOURCE = /^customers\/\d+\/conversionActions\/\d+$/;
const GAQL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type GaqlDateRange = 'LAST_30_DAYS' | { startDate: string; endDate: string };

/**
 * ads-bot-phase2 spec §3 0f — the verified-only GAQL. Counts `metrics.conversions` of exactly
 * one conversion action (the verified-lead resource name) per campaign over a date range.
 * `metrics.conversions` (not `all_conversions`) because that is what Smart Bidding optimises
 * to; the verified-lead action is the account's only primary action once 0a ran. Throws on a
 * malformed resource name or date so nothing unvalidated reaches the query string.
 */
export function buildVerifiedLeadConversionsQuery(verifiedLeadConversionResourceName: string, range: GaqlDateRange = 'LAST_30_DAYS'): string {
  if (!CONVERSION_ACTION_RESOURCE.test(verifiedLeadConversionResourceName)) {
    throw new Error(`Malformed verified-lead conversion action resource name: ${verifiedLeadConversionResourceName}`);
  }
  let dateClause: string;
  if (range === 'LAST_30_DAYS') {
    dateClause = 'segments.date DURING LAST_30_DAYS';
  } else {
    if (!GAQL_DATE.test(range.startDate) || !GAQL_DATE.test(range.endDate)) throw new Error('Malformed GAQL date range');
    dateClause = `segments.date BETWEEN '${range.startDate}' AND '${range.endDate}'`;
  }
  return `
      SELECT
        campaign.id,
        segments.conversion_action,
        metrics.conversions
      FROM campaign
      WHERE segments.conversion_action = '${verifiedLeadConversionResourceName}'
        AND ${dateClause}
    `;
}

/**
 * Sums verified-lead conversions per campaign id. Rows for any other conversion action are
 * ignored (defence in depth on top of the WHERE clause).
 */
export function mapVerifiedConversionRows(rows: RawVerifiedConversionRow[], verifiedLeadConversionResourceName: string): Map<string, number> {
  const byCampaign = new Map<string, number>();
  for (const row of rows) {
    const id = row.campaign?.id;
    if (id === undefined || id === null) continue;
    if (row.segments?.conversion_action && row.segments.conversion_action !== verifiedLeadConversionResourceName) continue;
    const key = String(id);
    byCampaign.set(key, (byCampaign.get(key) ?? 0) + Number(row.metrics?.conversions ?? 0));
  }
  return byCampaign;
}

/**
 * The 0f reader. Never throws: `{ ok: false }` on any API or validation error.
 */
export async function fetchVerifiedLeadConversionsByCampaign(params: {
  customer: { query: (gaql: string) => Promise<unknown[]> };
  verifiedLeadConversionResourceName: string;
  range?: GaqlDateRange;
}): Promise<{ ok: true; byCampaign: Map<string, number> } | { ok: false; error: string }> {
  try {
    const query = buildVerifiedLeadConversionsQuery(params.verifiedLeadConversionResourceName, params.range);
    const rows = (await params.customer.query(query)) as RawVerifiedConversionRow[];
    return { ok: true, byCampaign: mapVerifiedConversionRows(rows, params.verifiedLeadConversionResourceName) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * ads-bot-phase2 spec §3 0g — the conversion count the CPL-ceiling / `budget_tune` gate uses.
 *   verified_lead  → the verified-lead count (0f);
 *   error          → undefined: the caller must not gate on this campaign this cycle;
 *   not_configured → `conversions` (all_conversions): accounts with no WAO verified-lead action
 *                    keep their legacy behaviour.
 * `conversions` / `cpl` on the campaign stay all_conversions-based for reporting.
 */
export function cplGateConversions(campaign: EnumeratedCampaign): number | undefined {
  if (campaign.verifiedConversionsSource === 'verified_lead') return campaign.verifiedConversions ?? 0;
  if (campaign.verifiedConversionsSource === 'error') return undefined;
  return campaign.conversions;
}

/** Raw shape of one row from §8.3's enumeration GAQL query. */
export interface RawEnumeratedCampaignRow {
  campaign?: {
    id?: string | number | null;
    name?: string | null;
    status?: string | null;
    advertising_channel_type?: string | null;
    dynamic_search_ads_setting?: { domain_name?: string | null } | null;
  };
  metrics?: {
    cost_micros?: string | number | null;
    all_conversions?: string | number | null;
  };
}

/**
 * Pure mapping/classification step, deliberately split out from the live GAQL call below so
 * it's unit-testable without network access or Google Ads credentials — mirrors the existing
 * "pure scoring function" convention in `search-term-scoring.ts`.
 */
export function mapEnumeratedCampaignRows(
  rows: RawEnumeratedCampaignRow[],
  clientId: string | undefined
): EnumeratedCampaign[] {
  return rows
    .filter((row) => row.campaign?.id !== undefined && row.campaign?.id !== null)
    .map((row) => {
      const campaignId = String(row.campaign!.id);
      const campaignName = row.campaign?.name ?? '';
      const spendMicros = Number(row.metrics?.cost_micros ?? 0);
      const spendIls = spendMicros / 1_000_000;
      const conversions = Number(row.metrics?.all_conversions ?? 0);
      return {
        campaignId,
        campaignName,
        advertisingChannelType: row.campaign?.advertising_channel_type ?? '',
        isDsaSetting: !!row.campaign?.dynamic_search_ads_setting?.domain_name,
        type: campaignType(campaignName, clientId, campaignId),
        spendIls,
        conversions,
        cpl: conversions > 0 ? spendIls / conversions : undefined,
      };
    });
}

/**
 * §8.3's enumeration query — one call per `customerId`, not per campaign. Uses
 * `metrics.all_conversions` (§8.4's undercount fix), scoped to `ENABLED` campaigns over a
 * trailing 30-day window. Fail-soft, same convention as every other live-pull site in this
 * pipeline: an Ads API error degrades to "skip this client's per-campaign gating this cycle,"
 * never crashes the caller — returns `[]` on failure rather than throwing.
 */
export async function enumerateEnabledCampaigns(params: {
  customerId: string;
  clientId?: string;
  mode?: 'test' | 'live';
  clientInstance?: ReturnType<typeof buildClient>;
  /** When given, also runs the 0f verified-lead read and fills `verifiedConversions`. */
  verifiedLeadConversionResourceName?: string | null;
}): Promise<EnumeratedCampaign[]> {
  const { customerId, clientId, mode = 'live', clientInstance, verifiedLeadConversionResourceName } = params;
  try {
    const adsAccount = resolveAdsAccount(mode);
    const client = clientInstance || buildClient();
    const customer = client.Customer({
      customer_id: customerId,
      login_customer_id: adsAccount.mccId,
      refresh_token: adsAccount.refreshToken,
    });

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.dynamic_search_ads_setting.domain_name,
        metrics.cost_micros,
        metrics.all_conversions
      FROM campaign
      WHERE campaign.status = 'ENABLED'
        AND segments.date DURING LAST_30_DAYS
    `;

    const rows = (await customer.query(query)) as RawEnumeratedCampaignRow[];
    const campaigns = mapEnumeratedCampaignRows(rows, clientId);
    if (!verifiedLeadConversionResourceName) {
      return campaigns.map((c) => ({ ...c, verifiedConversionsSource: 'not_configured' as const }));
    }
    const verified = await fetchVerifiedLeadConversionsByCampaign({ customer, verifiedLeadConversionResourceName });
    if (!verified.ok) {
      console.warn('[campaign-enumeration] Verified-lead conversion read failed for customer', customerId, verified.error);
      return campaigns.map((c) => ({ ...c, verifiedConversionsSource: 'error' as const }));
    }
    return campaigns.map((c) => ({
      ...c,
      verifiedConversions: verified.byCampaign.get(c.campaignId) ?? 0,
      verifiedConversionsSource: 'verified_lead' as const,
    }));
  } catch (err) {
    console.warn('[campaign-enumeration] Failed to enumerate enabled campaigns for customer', customerId, err);
    return [];
  }
}

/**
 * §8.5 — a true blended CPL, trivially computable from the enumeration output. This is
 * DISPLAY-ONLY: useful for founder-facing "total spend / total leads / blended CPL"
 * reconciliation (e.g. AAAsada's ~₪77.41/lead reconciling with the founder's observed
 * ~₪70/lead), but must NEVER be fed into `CPL_CEILING_BREACH`/`WATCH`,
 * `BRAND_CPL_BASELINE_WATCH`, `budget_tune` gating, or pacing-status alerts — every one of
 * those evaluates a single campaign's own CPL against its own classified type. Blending would
 * launder a genuinely broken campaign inside a healthy average, exactly the waste this system
 * exists to catch (§8.0's AAAsada worked example: ₪230/lead "אירועים" hidden inside a ₪77
 * blend). Callers must treat the return value of this function as render-only data.
 */
export function computeBlendedCplDisplay(campaigns: EnumeratedCampaign[]): {
  spendIls: number;
  conversions: number;
  cpl: number | undefined;
} {
  const spendIls = campaigns.reduce((sum, c) => sum + c.spendIls, 0);
  const conversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  return { spendIls, conversions, cpl: conversions > 0 ? spendIls / conversions : undefined };
}
