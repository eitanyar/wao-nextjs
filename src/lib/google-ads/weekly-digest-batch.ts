import * as fs from 'fs';
import * as path from 'path';
import {
  buildWeeklyDigest,
  loadClientGoogleAdsIndex,
  loadCampaignConfigBySlug,
  type CampaignConfig,
  type WeeklyDigest,
} from '@/lib/crm/intelligence';
import {
  enumerateEnabledCampaigns,
  computeBlendedCplDisplay,
  type EnumeratedCampaign,
} from '@/lib/google-ads/campaign-enumeration';

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

/**
 * §8.3's enumeration query is a 30-day window (`segments.date DURING LAST_30_DAYS`) — the
 * per-campaign digest built from its spend/conversions figures uses the same window so
 * `WeeklyDigest.pacing`/`totals.spendIls` stay internally consistent (a digest mixing a
 * 30-day spend total against a 7-day pacing target would silently miscompute pacing). This is
 * a deliberate widening from the pre-§8 code's 7-day batch-digest window — flagged as a
 * judgment call, not a silent behavior change: the previous 7-day cadence was informational
 * (weekly email / GEO dashboard copy), never a gating input, so the wider window changes what
 * "this week" reads as in that copy but does not affect correctness of any CUT/WATCH/ceiling
 * decision (those all run their own explicit-window digests elsewhere, unaffected by this file).
 */
const ENUMERATION_WINDOW_DAYS = 30;

/** One enumerated campaign's own digest, per spec §8.3 point 3 ("expose both the per-campaign
 * digests and a labeled client-level roll-up rather than a single client digest"). */
export interface CampaignDigest {
  campaignId: string;
  campaignName: string;
  type: EnumeratedCampaign['type'];
  digest: WeeklyDigest;
}

export interface ClientDigestResult {
  clientId: string;
  status: 'ok' | 'unbound' | 'error';
  campaign?: CampaignConfig;
  /**
   * Back-compat single-campaign digest for existing consumers that haven't been migrated to
   * `digests` yet — the first enumerated campaign's digest (highest-spend, since
   * `enumerateEnabledCampaigns`'s GAQL result isn't ordered and callers historically expected
   * "the" digest to represent the client's most material campaign). New code must read
   * `digests`/`blended` instead per §8.3/§8.5 — do not add new consumers of this field.
   */
  digest?: WeeklyDigest;
  /** Every enumerated ENABLED campaign's own digest — the real fix, per §8.3. */
  digests?: CampaignDigest[];
  /**
   * §8.5 — a true blended CPL across every enumerated campaign, DISPLAY-ONLY. Must never be
   * read by any gating function; every gate operates on one entry of `digests` at a time.
   */
  blended?: { spendIls: number; conversions: number; cpl: number | undefined };
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
      if (!index?.primarySlug || !index?.primaryCustomerId) {
        results.push({ clientId, status: 'unbound', error: 'google-ads.json present but primarySlug or primaryCustomerId missing' });
        continue;
      }

      const campaign = loadCampaignConfigBySlug(index.primarySlug);
      if (!campaign) {
        results.push({ clientId, status: 'unbound', error: `Campaign config not found for slug: ${index.primarySlug}` });
        continue;
      }

      // §8.3 — enumerate every ENABLED campaign under this client's live customerId, not just
      // `index.primaryCampaignId` (the single WAO-bound, "highest spend at onboarding" campaign
      // that caused the AAAsada/Retter accuracy bug, §8.0).
      const enumerated = await enumerateEnabledCampaigns({
        customerId: index.primaryCustomerId,
        clientId,
        mode: campaign.mode === 'live' ? 'live' : 'test',
      });

      if (!enumerated.length) {
        // Fail-soft degrade: enumeration failed (Ads API error) or the account genuinely has
        // no enabled campaigns right now. Fall back to a single CRM-only digest (no live
        // performance) rather than going dark for this client — matches the pre-existing
        // fail-soft convention for every other live-pull site in this pipeline.
        const digest = buildWeeklyDigest({ campaign, now });
        results.push({ clientId, status: 'ok', campaign, digest, digests: [], blended: undefined });
        continue;
      }

      const digests: CampaignDigest[] = enumerated.map((c) => ({
        campaignId: c.campaignId,
        campaignName: c.campaignName,
        type: c.type,
        digest: buildWeeklyDigest({
          campaign,
          now,
          windowDays: ENUMERATION_WINDOW_DAYS,
          performance: {
            spendMicros: Math.round(c.spendIls * 1_000_000),
            conversions: c.conversions,
          },
        }),
      }));

      // Highest-spend campaign first, for the back-compat `digest` field's "most material
      // campaign" convention documented above.
      const bySpendDesc = [...digests].sort(
        (a, b) => (b.digest.totals.spendIls ?? 0) - (a.digest.totals.spendIls ?? 0)
      );

      results.push({
        clientId,
        status: 'ok',
        campaign,
        digest: bySpendDesc[0]?.digest,
        digests,
        // §8.5 — display-only roll-up, computed from the raw enumeration output, never from
        // any of the per-campaign `digests` gating fields.
        blended: computeBlendedCplDisplay(enumerated),
      });
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
