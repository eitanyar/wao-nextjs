import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { getClientRecord } from '@/lib/geo/client';
import { hasOperatorAccess } from '@/lib/operator/flags';
import {
  buildWeeklyDigest,
  loadCampaignConfigBySlug,
  loadClientGoogleAdsIndex,
} from '@/lib/crm/intelligence';
import {
  buildGoogleAdsOperatorTasks,
  computeTrustClock,
  readGoogleAdsApprovals,
  readGoogleAdsOperatorInquiries,
  selectNextOperatorTask,
  STAGE_GATE_LABELS,
  type GoogleAdsOperatorTask,
} from '@/lib/google-ads/operator';
import { buildSearchTermCleanupPreview } from '@/lib/google-ads/executor';
import { translateTaskToHebrew } from '@/lib/operators/hebrew-rewriter';
import { enumerateEnabledCampaigns } from '@/lib/google-ads/campaign-enumeration';
import ReviewContext from '@/components/admin/review/ReviewContext';
import RecommendationCard from '@/components/admin/review/RecommendationCard';

// Internal review surface — never indexed.
export const metadata: Metadata = {
  robots: { index: false },
};

/**
 * §8.3 point 4 — enumerate-and-merge pattern, same as `operator-task/route.ts`'s approval
 * handler: this route used to duplicate that route's task-building logic for the review-card
 * UI around a single `index.primaryCampaignId`; both now build one task list per enumerated
 * live campaign and merge them (each task carries its own `campaignId`, per operator.ts).
 */
async function buildMergedTasks(params: {
  clientId: string;
  campaign: ReturnType<typeof loadCampaignConfigBySlug>;
  customerId: string;
}): Promise<GoogleAdsOperatorTask[]> {
  const { clientId, campaign, customerId } = params;
  if (!campaign) return [];

  const enumerated = await enumerateEnabledCampaigns({
    customerId,
    clientId,
    mode: campaign.mode === 'live' ? 'live' : 'test',
  });

  if (!enumerated.length) {
    const digest = buildWeeklyDigest({ campaign });
    return buildGoogleAdsOperatorTasks({ clientId, digest, campaignConfig: campaign });
  }

  const allTasks: GoogleAdsOperatorTask[] = [];
  for (const c of enumerated) {
    const digest = buildWeeklyDigest({ campaign });
    // §4A.5 — a separate 30-day-windowed digest purely to feed the CPL-ceiling/baseline-watch
    // gates and campaign classification. The 7-day `digest` above still drives all existing
    // alert/pacing/next-action copy unchanged; only totals.cpl/verifiedLeads/spendIls merge in.
    const cplDigest = buildWeeklyDigest({
      campaign,
      windowDays: 30,
      performance: { spendMicros: Math.round(c.spendIls * 1_000_000), conversions: c.conversions },
    });
    const mergedDigest = {
      ...digest,
      totals: { ...digest.totals, cpl: cplDigest.totals.cpl, verifiedLeads: cplDigest.totals.verifiedLeads, spendIls: cplDigest.totals.spendIls },
    };

    let campaignTasks = buildGoogleAdsOperatorTasks({
      clientId,
      digest: mergedDigest,
      campaignConfig: campaign,
      campaignId: c.campaignId,
      campaignName: c.campaignName,
    });

    // Only run the read-only search-term fetch/score for this campaign when its own queue
    // head would actually be a search_term_cleanup task — never fetch/score unconditionally
    // for every enumerated campaign on every page load.
    const { current: campaignCurrent } = selectNextOperatorTask(campaignTasks, []);
    if (campaignCurrent?.kind === 'search_term_cleanup') {
      const searchTermCleanupPreview = await buildSearchTermCleanupPreview({
        campaignConfig: campaign,
        campaignId: c.campaignId,
        clientId,
      });
      if (searchTermCleanupPreview) {
        campaignTasks = buildGoogleAdsOperatorTasks({
          clientId,
          digest: mergedDigest,
          campaignConfig: campaign,
          campaignId: c.campaignId,
          campaignName: c.campaignName,
          searchTermCleanupPreview,
        });
      }
    }

    allTasks.push(...campaignTasks);
  }

  return allTasks;
}

/**
 * One-card-per-decision review surface, per
 * docs/specs/adam-recommendation-audit-interaction-model.md §1 and
 * docs/specs/adam-recommendation-audit-visual-design.md §1. Mirrors the shape of
 * /geo/action/[actionId] — one <main>, one card, nothing beside it.
 */
export default async function GoogleAdsReviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId: rawId } = await params;
  const clientId = decodeURIComponent(rawId);

  // Same session model as /client/dashboard — the reviewer is logged in *as* this client
  // via /admin/clients, then works this client's queue from here.
  const jar = await cookies();
  const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
  if (!sessionClientId || sessionClientId !== clientId) notFound();

  const clientRecord = getClientRecord(clientId);
  if (!clientRecord) notFound();
  if (!hasOperatorAccess(clientId, clientRecord.entitlements)) notFound();

  const index = loadClientGoogleAdsIndex(clientId);
  const campaign = index?.primarySlug ? loadCampaignConfigBySlug(index.primarySlug) : null;

  const clientName = clientRecord.businessNiche || clientId;
  const approvals = readGoogleAdsApprovals(clientId);
  const clock = computeTrustClock({ clientId, approvals });
  const stageGateLabel = STAGE_GATE_LABELS[clock.stageGate] ?? clock.stageGate;

  if (!campaign || !index?.primaryCustomerId) {
    return (
      <main dir="rtl" lang="he" className="mx-auto min-h-screen max-w-2xl px-4 pt-8 pb-32">
        <ReviewContext
          clientName={clientName}
          stageGateLabel={stageGateLabel}
          weeksClean={clock.weeksClean}
          targetWeeks={clock.targetWeeks}
        />
        <div role="status" className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <p className="text-sm text-[var(--muted)]">אין קמפיין Google Ads מחובר ללקוח הזה כרגע.</p>
        </div>
      </main>
    );
  }

  // §8.3 point 4 — enumerate every live campaign under this client's customerId and merge
  // their task lists, instead of resolving a single `index.primaryCampaignId`.
  const tasks = await buildMergedTasks({ clientId, campaign, customerId: index.primaryCustomerId });

  const { current, queueDepth } = selectNextOperatorTask(tasks, approvals);

  if (!current) {
    return (
      <main dir="rtl" lang="he" className="mx-auto min-h-screen max-w-2xl px-4 pt-8 pb-32">
        <ReviewContext
          clientName={clientName}
          stageGateLabel={stageGateLabel}
          weeksClean={clock.weeksClean}
          targetWeeks={clock.targetWeeks}
        />
        {/* Resolved-state pattern, mirrors MarkDoneBar.tsx — a role="status" panel, not a redirect. */}
        <div role="status" className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <p className="font-semibold text-[var(--text)]">אין החלטות פתוחות ללקוח הזה כרגע.</p>
          <p className="mt-1 text-sm text-[var(--muted)]">הצעה הבאה תופיע כאן כשתעבור את סף המהותיות.</p>
        </div>
      </main>
    );
  }

  const initialInquiries = readGoogleAdsOperatorInquiries(clientId, current.taskId);

  // Internal review surface — qwen3.7-plus per Eitan's 2026-08-18 direction (no human-gate
  // requirement, this text is never client-facing).
  const translatedCurrent = await translateTaskToHebrew(current, { model: 'qwen3.7-plus' });

  return (
    <main dir="rtl" lang="he" className="mx-auto min-h-screen max-w-2xl px-4 pt-8 pb-32">
      <ReviewContext
        clientName={clientName}
        stageGateLabel={stageGateLabel}
        weeksClean={clock.weeksClean}
        targetWeeks={clock.targetWeeks}
      />
      <RecommendationCard
        task={{
          taskId: current.taskId,
          title: translatedCurrent.title,
          whyNeeded: translatedCurrent.whyNeeded,
          recommendedAction: translatedCurrent.recommendedAction,
          risk: current.risk,
        }}
        queueDepth={queueDepth}
        initialInquiries={initialInquiries}
      />
    </main>
  );
}
