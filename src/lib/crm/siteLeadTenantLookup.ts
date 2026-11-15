/**
 * Filesystem-backed TenantLookup for /api/lead (see siteLeadIntake.ts).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 *
 * Site records come from the sites data root (WAO_SITES_DIR override), campaign configs and the
 * client's Google Ads index from intelligence.ts (the clients root honours WAO_CLIENTS_DIR).
 */

import { readFileSync, statSync } from 'fs';
import path from 'path';
import { sitesDir } from '../dataRoots';
import { isTenantSlug, type SiteHostingFields } from '../site-hosting/tenant';
import { loadCampaignConfigBySlug, loadClientGoogleAdsIndex } from './intelligence';
import type { TenantLookup } from './siteLeadIntake';

const MAX_RECORD_BYTES = 16 * 1024 * 1024;

export function readSiteRecord(slug: string, dir: string = sitesDir()): (SiteHostingFields & { slug?: unknown }) | null {
  if (!isTenantSlug(slug)) return null;
  const file = path.join(/* turbopackIgnore: true */ dir, `${slug}.json`);
  try {
    const stat = statSync(file);
    if (!stat.isFile() || stat.size > MAX_RECORD_BYTES) return null;
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as SiteHostingFields & { slug?: unknown } : null;
  } catch {
    return null;
  }
}

export const fileTenantLookup: TenantLookup = {
  siteRecord: (slug) => readSiteRecord(slug),
  campaign: (slug) => (isTenantSlug(slug) ? loadCampaignConfigBySlug(slug) : null),
  clientCustomerIds: (clientId) => {
    const index = loadClientGoogleAdsIndex(clientId);
    return (index?.campaigns ?? []).map((campaign) => campaign.customerId).filter((id): id is string => Boolean(id));
  },
};
