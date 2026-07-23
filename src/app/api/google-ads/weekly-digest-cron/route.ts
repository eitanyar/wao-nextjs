import { NextResponse } from 'next/server';
import { buildAllClientDigests, type ClientDigestResult } from '@/lib/google-ads/weekly-digest-batch';
import { sendGoogleAdsWeeklyDigestEmail } from '@/lib/mail';

interface CronRunResult {
  clientId: string;
  status: 'sent' | 'digest_failed' | 'email_failed' | 'unbound';
  error?: string;
}

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // fail closed — same posture as ADMIN_SECRET
  const provided = req.headers.get('x-cron-secret') ?? '';
  return provided === expected;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const digestResults: ClientDigestResult[] = await buildAllClientDigests();
    const runResults: CronRunResult[] = [];

    for (const result of digestResults) {
      if (result.status !== 'ok' || !result.campaign || !result.digest) {
        runResults.push({ clientId: result.clientId, status: 'unbound', error: result.error });
        continue;
      }

      try {
        await sendGoogleAdsWeeklyDigestEmail({
          clientId: result.clientId,
          campaignName: result.campaign.businessName || result.campaign.slug,
          digest: result.digest,
        });
        runResults.push({ clientId: result.clientId, status: 'sent' });
      } catch (error) {
        runResults.push({
          clientId: result.clientId,
          status: 'email_failed',
          error: error instanceof Error ? error.message : 'Unknown email error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      ranAt: new Date().toISOString(),
      clientsProcessed: runResults.length,
      results: runResults,
    });
  } catch (error) {
    console.error('[google-ads/weekly-digest-cron] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run weekly digest batch' },
      { status: 500 },
    );
  }
}
