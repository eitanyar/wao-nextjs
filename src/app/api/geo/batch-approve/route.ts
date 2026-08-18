import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { batchApproveClean } from '@/lib/geo/actions';

// Fast-path batch approval — the review-queue throughput lever for the
// 250-client/180-day plan (Lior, 2026-08-17). Approves only the actions that
// already cleared every static gate cleanly; anything flagged stays in the
// queue for individual review. See batchApproveClean's own doc comment for
// the exact clean-criteria definition.
export async function POST(req: Request) {
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  let clientId = '';
  let reviewerName = '';
  try {
    const body = await req.json();
    clientId = String(body?.clientId ?? '').trim();
    reviewerName = String(body?.reviewerName ?? '').trim();
  } catch {
    // fall through to validation below
  }
  if (!clientId || !reviewerName) {
    return NextResponse.json({ error: 'clientId and reviewerName are required' }, { status: 400 });
  }

  const approved = batchApproveClean(clientId, reviewerName);
  return NextResponse.json({ success: true, approvedCount: approved.length, approvedIds: approved });
}
