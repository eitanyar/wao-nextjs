import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { getClientRecord } from '@/lib/geo/client';
import { buildWeeklyDigest, loadCampaignConfigBySlug, loadClientGoogleAdsIndex } from '@/lib/crm/intelligence';
import { hasOperatorAccess } from '@/lib/operator/flags';
import {
  appendGoogleAdsApproval,
  buildApprovalRecord,
  buildGoogleAdsOperatorTasks,
  readGoogleAdsApprovals,
} from '@/lib/google-ads/operator';
import { sendGoogleAdsOperatorApprovalEmail } from '@/lib/mail';

interface OperatorTaskApprovalRequest {
  taskId?: string;
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
    if (!index?.primarySlug) {
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

    const digest = buildWeeklyDigest({ campaign });
    const tasks = buildGoogleAdsOperatorTasks({ clientId: sessionClientId, digest });
    const task = tasks.find((item) => item.taskId === taskId);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or it is stale. Refresh the dashboard and try again.' },
        { status: 404 }
      );
    }

    const existingApproval = readGoogleAdsApprovals(sessionClientId).find((item) => item.taskId === taskId);
    if (existingApproval) {
      return NextResponse.json({
        success: true,
        task: existingApproval,
        queued: true,
        message: 'Task was already approved.',
      });
    }

    const approval = buildApprovalRecord(task, sessionClientId, digest.windowEnd);
    appendGoogleAdsApproval(approval);

    try {
      await sendGoogleAdsOperatorApprovalEmail({
        clientId: sessionClientId,
        title: task.title,
        recommendedAction: task.recommendedAction,
        approvedBy: sessionClientId,
      });
    } catch {
      // Notification failure is non-fatal. The approval record remains durable.
    }

    return NextResponse.json({
      success: true,
      task: approval,
      queued: true,
      message: 'Task approved and queued for the operator.',
    });
  } catch (error) {
    console.error('[google-ads/operator-task] error:', error);
    return NextResponse.json(
      { error: 'Failed to approve operator task' },
      { status: 500 }
    );
  }
}
