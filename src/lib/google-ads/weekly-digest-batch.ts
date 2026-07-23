import * as fs from 'fs';
import * as path from 'path';
import {
  buildWeeklyDigest,
  loadClientGoogleAdsIndex,
  loadCampaignConfigBySlug,
  type CampaignConfig,
  type WeeklyDigest,
  type PerformanceSnapshot,
} from '@/lib/crm/intelligence';
import { resolveCustomer } from '@/lib/google-ads/mutations';

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

export interface ClientDigestResult {
  clientId: string;
  status: 'ok' | 'unbound' | 'error';
  campaign?: CampaignConfig;
  digest?: WeeklyDigest;
  error?: string;
}

export function listGoogleAdsBoundClientIds(): string[] {
  if (!fs.existsSync(CLIENTS_DIR)) return [];
  return fs.readdirSync(CLIENTS_DIR)
    .filter((entry) => {
      try {
        return fs.statSync(path.join(CLIENTS_DIR, entry)).isDirectory();
      } catch {
        return false;
      }
    })
    .filter((clientId) => fs.existsSync(path.join(CLIENTS_DIR, clientId, 'google-ads.json')));
}

export async function buildAllClientDigests(now?: Date): Promise<ClientDigestResult[]> {
  const results: ClientDigestResult[] = [];
  const clientIds = listGoogleAdsBoundClientIds();

  for (const clientId of clientIds) {
    try {
      const index = loadClientGoogleAdsIndex(clientId);
      if (!index?.primarySlug || !index?.primaryCampaignId) {
        results.push({ clientId, status: 'unbound', error: 'google-ads.json present but primarySlug or primaryCampaignId missing' });
        continue;
      }

      const campaign = loadCampaignConfigBySlug(index.primarySlug);
      if (!campaign) {
        results.push({ clientId, status: 'unbound', error: `Campaign config not found for slug: ${index.primarySlug}` });
        continue;
      }

      let performance: PerformanceSnapshot | undefined = undefined;
      try {
        const customer = resolveCustomer(campaign);
        const query = `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE campaign.id = ${index.primaryCampaignId} AND segments.date DURING LAST_7_DAYS`;
        const rows = (await customer.query(query)) as Array<{
          metrics?: {
            impressions?: string | number | null;
            clicks?: string | number | null;
            cost_micros?: string | number | null;
          };
        }>;

        const row = rows?.[0];
        if (row?.metrics) {
          performance = {
            impressions: row.metrics.impressions !== undefined && row.metrics.impressions !== null ? Number(row.metrics.impressions) : undefined,
            clicks: row.metrics.clicks !== undefined && row.metrics.clicks !== null ? Number(row.metrics.clicks) : undefined,
            spendMicros: row.metrics.cost_micros !== undefined && row.metrics.cost_micros !== null ? Number(row.metrics.cost_micros) : undefined,
          };
        }
      } catch (err) {
        console.error(`[weekly-digest-batch] Failed to fetch live metrics for client ${clientId}, campaign ${index.primaryCampaignId}:`, err);
      }

      const digest = buildWeeklyDigest({ campaign, now, performance });
      results.push({ clientId, status: 'ok', campaign, digest });
    } catch (error) {
      results.push({
        clientId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error building digest',
      });
    }
  }

  return results;
}
