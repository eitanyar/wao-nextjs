/** Offline-only recommendation source. A caller must inject the account-scoped read adapter. */
export interface RawTagCoverageRecommendationRow {
  recommendation?: {
    type?: unknown;
    resource_name?: unknown;
    campaign?: unknown;
  } | null;
}

export interface TagCoverageCandidate {
  type: 'IMPROVE_GOOGLE_TAG_COVERAGE';
  resourceName: string;
}

export type TagCoverageRecommendationsByCampaign = Record<string, TagCoverageCandidate[]>;

interface Scope {
  customerId: string;
  enabledCampaignIds: readonly string[];
}

const numericId = (value: unknown): value is string =>
  typeof value === 'string' && /^[1-9][0-9]*$/.test(value);

/** Keep the SDK resource name intact; never fabricate identity from a digest or campaign list. */
export function mapTagCoverageRecommendationRows(
  rows: readonly RawTagCoverageRecommendationRow[],
  { customerId, enabledCampaignIds }: Scope
): TagCoverageRecommendationsByCampaign {
  const result: TagCoverageRecommendationsByCampaign = {};
  if (!numericId(customerId) || !Array.isArray(rows)) return result;
  const enabled = new Set(enabledCampaignIds.filter(numericId));
  if (!enabled.size) return result;
  const seen = new Set<string>();
  for (const row of rows) {
    const recommendation = row?.recommendation;
    if (recommendation?.type !== 'IMPROVE_GOOGLE_TAG_COVERAGE') continue;
    const resourceName = recommendation.resource_name;
    const campaign = recommendation.campaign;
    if (typeof resourceName !== 'string' || typeof campaign !== 'string') continue;
    const resource = /^customers\/([1-9][0-9]*)\/recommendations\/([A-Za-z0-9_.~-]+)$/.exec(resourceName);
    const scopedCampaign = /^customers\/([1-9][0-9]*)\/campaigns\/([1-9][0-9]*)$/.exec(campaign);
    if (!resource || !scopedCampaign || resource[1] !== customerId
      || scopedCampaign[1] !== customerId || !enabled.has(scopedCampaign[2])) continue;
    const campaignId = scopedCampaign[2];
    const pair = JSON.stringify([resourceName, campaignId]);
    if (seen.has(pair)) continue;
    seen.add(pair);
    (result[campaignId] ??= []).push({ type: 'IMPROVE_GOOGLE_TAG_COVERAGE', resourceName });
  }
  return result;
}

/** v24 recommendation fields: each SELECT field is selectable and type is filterable. */
const TAG_COVERAGE_QUERY = `SELECT recommendation.resource_name, recommendation.type, recommendation.campaign
FROM recommendation
WHERE recommendation.type = IMPROVE_GOOGLE_TAG_COVERAGE`;

export async function fetchTagCoverageRecommendations({
  customerId, enabledCampaignIds, query,
}: Scope & {
  query: (customerId: string, gaql: string) => Promise<readonly RawTagCoverageRecommendationRow[]>;
}): Promise<TagCoverageRecommendationsByCampaign> {
  if (!numericId(customerId) || !enabledCampaignIds.some(numericId)) return {};
  try {
    return mapTagCoverageRecommendationRows(await query(customerId, TAG_COVERAGE_QUERY), {
      customerId, enabledCampaignIds,
    });
  } catch {
    // No account identifiers or provider error payloads may leak into logs.
    return {};
  }
}
