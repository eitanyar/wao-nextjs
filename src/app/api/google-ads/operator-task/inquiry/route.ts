import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { getClientRecord } from '@/lib/geo/client';
import { buildWeeklyDigest, loadCampaignConfigBySlug, loadClientGoogleAdsIndex } from '@/lib/crm/intelligence';
import { hasOperatorAccess } from '@/lib/operator/flags';
import { askGoogleAdsOperatorInquiry, buildGoogleAdsOperatorTasks, readGoogleAdsOperatorInquiries } from '@/lib/google-ads/operator';
import { evaluateCampaignAge } from '@/lib/google-ads/campaignAge';

/**
 * "Why?" thread endpoint — structurally separate from /api/google-ads/operator-task.
 * Per interaction-model spec §2.1: never writes to approvals.jsonl, never changes task
 * status, never touches the trust clock. Only appends to inquiries.jsonl.
 */

interface InquiryRequest {
  taskId?: string;
  question?: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId')?.trim();
  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }

  const jar = await cookies();
  const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
  if (!sessionClientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const inquiries = readGoogleAdsOperatorInquiries(sessionClientId, taskId);
  return NextResponse.json({ inquiries });
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

    const body = (await req.json().catch(() => ({}))) as InquiryRequest;
    const taskId = body.taskId?.trim();
    const question = body.question?.trim();
    if (!taskId || !question) {
      return NextResponse.json({ error: 'taskId and question are required' }, { status: 400 });
    }

    const index = loadClientGoogleAdsIndex(sessionClientId);
    if (!index?.primarySlug) {
      return NextResponse.json({ error: 'No bound Google Ads campaign found for this client' }, { status: 409 });
    }
    const campaign = loadCampaignConfigBySlug(index.primarySlug);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign config could not be loaded' }, { status: 409 });
    }

    const digest = buildWeeklyDigest({ campaign });
    const tasks = buildGoogleAdsOperatorTasks({
      clientId: sessionClientId,
      digest,
      campaignConfig: campaign,
      campaignAge: evaluateCampaignAge({ startDate: campaign.createdAt }),
    });
    const task = tasks.find((item) => item.taskId === taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or it is stale. Refresh the dashboard and try again.' },
        { status: 404 }
      );
    }

    const inquiry = askGoogleAdsOperatorInquiry({ task, question, askedBy: sessionClientId });
    return NextResponse.json({ inquiry });
  } catch (error: any) {
    console.error('[google-ads/operator-task/inquiry] error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to submit question' }, { status: 500 });
  }
}
