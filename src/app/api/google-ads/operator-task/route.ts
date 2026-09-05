import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { getClientRecord } from '@/lib/geo/client';
import { buildWeeklyDigest, loadCampaignConfigBySlug, loadClientGoogleAdsIndex, type WeeklyDigest } from '@/lib/crm/intelligence';
import { hasOperatorAccess } from '@/lib/operator/flags';
import {
  appendGoogleAdsApproval,
  updateGoogleAdsApproval,
  buildApprovalRecord,
  buildGoogleAdsOperatorTasks,
  readGoogleAdsApprovals,
  GoogleAdsOperatorApproval,
  GoogleAdsOperatorTask,
} from '@/lib/google-ads/operator';
import { sendGoogleAdsOperatorApprovalEmail } from '@/lib/mail';
import { executeGoogleAdsOperatorTask } from '@/lib/google-ads/executor';
import { enumerateEnabledCampaigns } from '@/lib/google-ads/campaign-enumeration';
import { evaluateCampaignAge } from '@/lib/google-ads/campaignAge';

/**
 * §8.3 point 2 — enumerate every ENABLED campaign under this client's live `customerId`
 * (replacing the old single `index.primaryCampaignId` resolution), build one task list per
 * campaign via `buildGoogleAdsOperatorTasks` (already single-campaign-per-call by design, per
 * its own doc comment in operator.ts), and merge. Each task carries its own `campaignId`
 * (operator.ts's §8.3 addition) so the caller can later resolve exactly which campaign a
 * specific approved task should mutate, instead of assuming `index.primaryCampaignId` for
 * every task regardless of which campaign it was actually generated for.
 *
 * Fail-soft: `enumerateEnabledCampaigns` itself never throws (degrades to `[]` on an Ads API
 * error) — when it returns nothing, this falls back to a single CRM-only digest for the
 * client's bound `CampaignConfig` (no live campaignId/campaignName), same posture the pipeline
 * already had before this fix, rather than leaving the client with an empty task queue.
 */
async function buildMergedTasks(params: {
  clientId: string;
  campaign: ReturnType<typeof loadCampaignConfigBySlug>;
  customerId: string;
}): Promise<{ tasks: GoogleAdsOperatorTask[]; digestsByCampaignId: Map<string | undefined, WeeklyDigest> }> {
  const { clientId, campaign, customerId } = params;
  if (!campaign) return { tasks: [], digestsByCampaignId: new Map() };
  const campaignAge = evaluateCampaignAge({ startDate: campaign.createdAt });

  const enumerated = await enumerateEnabledCampaigns({
    customerId,
    clientId,
    mode: campaign.mode === 'live' ? 'live' : 'test',
  });

  const digestsByCampaignId = new Map<string | undefined, WeeklyDigest>();

  if (!enumerated.length) {
    // Fallback: no live enumeration data this cycle. Build one CRM-only task list with no
    // campaignId/campaignName (defaults to 'non-brand', the safe classification per §4A.0).
    const digest = buildWeeklyDigest({ campaign });
    digestsByCampaignId.set(undefined, digest);
    const tasks = buildGoogleAdsOperatorTasks({
      clientId,
      digest,
      campaignConfig: campaign,
      campaignAge,
    });
    return { tasks, digestsByCampaignId };
  }

  const allTasks: GoogleAdsOperatorTask[] = [];
  for (const c of enumerated) {
    // 7-day digest for alert/pacing/next-action copy (unchanged cadence), 30-day digest for
    // the §4A.5 CPL-ceiling/baseline-watch gates — same split the pre-existing single-campaign
    // code already used, now applied per enumerated campaign instead of once for the client.
    const digest = buildWeeklyDigest({ campaign });
    const cplDigest = buildWeeklyDigest({
      campaign,
      windowDays: 30,
      performance: { spendMicros: Math.round(c.spendIls * 1_000_000), conversions: c.conversions },
    });
    const mergedDigest: WeeklyDigest = {
      ...digest,
      totals: { ...digest.totals, cpl: cplDigest.totals.cpl, verifiedLeads: cplDigest.totals.verifiedLeads, spendIls: cplDigest.totals.spendIls },
    };
    digestsByCampaignId.set(c.campaignId, mergedDigest);

    const campaignTasks = buildGoogleAdsOperatorTasks({
      clientId,
      digest: mergedDigest,
      campaignConfig: campaign,
      campaignAge,
      campaignId: c.campaignId,
      campaignName: c.campaignName,
    });
    allTasks.push(...campaignTasks);
  }

  return { tasks: allTasks, digestsByCampaignId };
}

interface OperatorTaskApprovalRequest {
  taskId?: string;
  /**
   * Explicit reviewer decision. Defaults to 'approve' to preserve the existing
   * GoogleAdsOperatorPanel click-through flow (which already requires an explicit button
   * click + confirm()). The one-card review surface (RecommendationCard) always sends this
   * explicitly. Per interaction-model spec §5/§6, what changed is that buildApprovalRecord()
   * itself no longer hardcodes 'approved' — the decision must be threaded through here.
   */
  decision?: 'approve' | 'reject';
  /** Required when decision === 'reject' (interaction-model spec §2.1, correctionNote). */
  correctionNote?: string;
}

export async function POST(req: Request) {
  try {
    const jar = await cookies();
    const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');

    if (!sessionClientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientRecord = getClientRecord(sessionClientId);
    if (!clientRecord) {
      return NextResponse.json({ error: 'Client record not found' }, { status: 404 });
    }

    if (!hasOperatorAccess(sessionClientId, clientRecord.entitlements)) {
      return NextResponse.json({ error: 'Operator access is not enabled for this client' }, { status: 403 });
    }

    const index = loadClientGoogleAdsIndex(sessionClientId);
    if (!index?.primarySlug || !index?.primaryCustomerId) {
      return NextResponse.json({ error: 'No bound Google Ads campaign found for this client' }, { status: 409 });
    }

    const campaign = loadCampaignConfigBySlug(index.primarySlug);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign config could not be loaded' }, { status: 409 });
    }

    const body = (await req.json().catch(() => ({}))) as OperatorTaskApprovalRequest;
    const taskId = body.taskId?.trim();
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }
    const decision: 'approve' | 'reject' = body.decision === 'reject' ? 'reject' : 'approve';
    const correctionNote = body.correctionNote?.trim();
    if (decision === 'reject' && !correctionNote) {
      return NextResponse.json({ error: 'correctionNote is required to reject a task' }, { status: 400 });
    }

    // §8.3 point 2 — enumerate-and-merge across every live campaign, instead of resolving one
    // `index.primaryCampaignId`. Every returned task now carries its own `campaignId`.
    const { tasks, digestsByCampaignId } = await buildMergedTasks({
      clientId: sessionClientId,
      campaign,
      customerId: index.primaryCustomerId,
    });
    const task = tasks.find((item) => item.taskId === taskId);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or it is stale. Refresh the dashboard and try again.' },
        { status: 404 }
      );
    }

    // windowEnd for the approval record — from this task's own campaign digest when known,
    // falling back to any digest built this cycle (they share the same 7-day window/`now`).
    const digestWindowEnd =
      digestsByCampaignId.get(task.campaignId)?.windowEnd ??
      digestsByCampaignId.values().next().value?.windowEnd ??
      new Date().toISOString();

    const existingApproval = readGoogleAdsApprovals(sessionClientId).find((item) => item.taskId === taskId);
    if (existingApproval) {
      return NextResponse.json({
        success: true,
        task: existingApproval,
        queued: true,
        message: 'Task already has a decision on record.',
      });
    }

    // Reject: log the decision (resets the trust clock, per interaction-model spec §2.1)
    // and stop — never enters the execution pipeline below.
    if (decision === 'reject') {
      const rejection = buildApprovalRecord(task, sessionClientId, digestWindowEnd, 'rejected', {
        correctionNote,
      });
      appendGoogleAdsApproval(rejection);

      try {
        await sendGoogleAdsOperatorApprovalEmail({
          clientId: sessionClientId,
          title: task.title,
          recommendedAction: task.recommendedAction,
          approvedBy: sessionClientId,
          status: 'rejected',
          error: correctionNote,
        });
      } catch {
        // Notification failure is non-fatal. The rejection record remains durable.
      }

      return NextResponse.json({
        success: true,
        task: rejection,
        queued: false,
        message: 'Task rejected. It will not execute.',
      });
    }

    const approval = buildApprovalRecord(task, sessionClientId, digestWindowEnd, 'approved');
    appendGoogleAdsApproval(approval);

    // §8.3 point 2 — resolve the mutation-execution campaign from the *found task's own*
    // campaignId, not `index.primaryCampaignId` (the old hardcode this section replaces).
    const campaignId = task.campaignId;
    if (!campaignId) {
      const failedApproval: GoogleAdsOperatorApproval = {
        ...approval,
        status: 'failed',
        executedAt: new Date().toISOString(),
        error: 'Campaign ID missing from task — cannot resolve which live campaign to mutate',
      };
      updateGoogleAdsApproval(failedApproval);
      return NextResponse.json(
        {
          success: false,
          task: failedApproval,
          error: 'Campaign ID missing from task',
        },
        { status: 500 }
      );
    }

    const executionResult = await executeGoogleAdsOperatorTask({
      task,
      campaignConfig: campaign,
      campaignId,
    });

    const finalStatus: GoogleAdsOperatorApproval = {
      ...approval,
      status: executionResult.success ? 'executed' : 'failed',
      executedAt: new Date().toISOString(),
      error: executionResult.success ? undefined : executionResult.error,
    };

    updateGoogleAdsApproval(finalStatus);

    try {
      await sendGoogleAdsOperatorApprovalEmail({
        clientId: sessionClientId,
        title: task.title,
        recommendedAction: task.recommendedAction,
        approvedBy: sessionClientId,
        status: finalStatus.status,
        error: finalStatus.error,
      });
    } catch {
      // Notification failure is non-fatal. The approval record remains durable.
    }

    const message = executionResult.success
      ? 'Task approved and executed successfully.'
      : `Task approved but execution failed: ${executionResult.error}.`;

    return NextResponse.json({
      success: executionResult.success,
      task: finalStatus,
      queued: false,
      message,
    });
  } catch (error: any) {
    console.error('[google-ads/operator-task] error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to approve operator task' },
      { status: 500 }
    );
  }
}
