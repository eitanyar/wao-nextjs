import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { runAdvisorPanel, type AdvisorPanelInput } from '@/lib/seo-advisor-panel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const jar = await cookies();
  if (!await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ status: 'invalid_arguments', reason: 'Invalid JSON.', actions: [], plannedTools: [] }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ status: 'invalid_arguments', reason: 'Invalid input.', actions: [], plannedTools: [] }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (typeof input.domain !== 'string' || !Number.isInteger(input.approvedCap) || (input.approvedCap as number) < 1 || (input.approvedCap as number) > 2000 ||
    !(input.locationCode === null || Number.isSafeInteger(input.locationCode)) ||
    !(input.languageCode === null || typeof input.languageCode === 'string')) {
    return NextResponse.json({ status: 'invalid_arguments', reason: 'Invalid input.', actions: [], plannedTools: [] }, { status: 400 });
  }
  const result = await runAdvisorPanel(input as unknown as AdvisorPanelInput, {
    offlineFixture: process.env.NODE_ENV !== 'production' && process.env.WAO_SEO_ADVISOR_OFFLINE_FIXTURE === '1',
  });
  return NextResponse.json(result, { status: result.status === 'invalid_arguments' ? 400 : 200 });
}
