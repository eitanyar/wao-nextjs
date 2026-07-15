import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';
import { assessLiveReadiness } from '@/lib/google-ads/live-readiness';

interface LiveReadinessRecord {
  clientAccountOwned?: boolean;
  clientBillingAccepted?: boolean;
  mccInvitationAccepted?: boolean;
  approvalContactConfirmed?: boolean;
  liveConsentRecorded?: boolean;
  auditLogEnabled?: boolean;
}

function loadReadinessRecord(clientId: string): LiveReadinessRecord {
  const recordPath = path.join(process.cwd(), 'data', 'clients', clientId, 'live-readiness.json');
  try {
    return JSON.parse(fs.readFileSync(recordPath, 'utf8')) as LiveReadinessRecord;
  } catch {
    return {};
  }
}

export async function GET() {
  const jar = await cookies();
  const clientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
  if (!clientId) {
    return NextResponse.json({ error: 'Sign in before viewing live rollout readiness.' }, { status: 401 });
  }

  if (!/^[a-z0-9-]+$/i.test(clientId)) {
    return NextResponse.json({ error: 'Invalid client session.' }, { status: 400 });
  }

  const managerCredentialsConfigured = Boolean(
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN &&
    process.env.GOOGLE_ADS_MCC_CUSTOMER_ID
  );

  return NextResponse.json(assessLiveReadiness({
    clientId,
    record: loadReadinessRecord(clientId),
    managerCredentialsConfigured,
    liveModeEnabled: process.env.GOOGLE_ADS_ENABLE_LIVE_MODE === 'true',
  }));
}
