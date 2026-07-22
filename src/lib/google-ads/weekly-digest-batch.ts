import * as fs from 'fs';
import * as path from 'path';
import {
  buildWeeklyDigest,
  loadClientGoogleAdsIndex,
  loadCampaignConfigBySlug,
  type CampaignConfig,
  type WeeklyDigest,
} from '@/lib/crm/intelligence';

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

export function buildAllClientDigests(now?: Date): ClientDigestResult[] {
  return listGoogleAdsBoundClientIds().map((clientId) => {
    try {
      const index = loadClientGoogleAdsIndex(clientId);
      if (!index?.primarySlug) {
        return { clientId, status: 'unbound' as const, error: 'google-ads.json present but primarySlug missing' };
      }

      const campaign = loadCampaignConfigBySlug(index.primarySlug);
      if (!campaign) {
        return { clientId, status: 'unbound' as const, error: `Campaign config not found for slug: ${index.primarySlug}` };
      }

      const digest = buildWeeklyDigest({ campaign, now });
      return { clientId, status: 'ok' as const, campaign, digest };
    } catch (error) {
      return {
        clientId,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error building digest',
      };
    }
  });
}
