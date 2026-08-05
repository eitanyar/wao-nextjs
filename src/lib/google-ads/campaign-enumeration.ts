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
   * not the CPL-ceiling gate). */
  cpl: number | undefined;
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
}): Promise<EnumeratedCampaign[]> {
  const { customerId, clientId, mode = 'live', clientInstance } = params;
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
    return mapEnumeratedCampaignRows(rows, clientId);
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
