import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { findActionById, approveAction, unapproveAction } from '@/lib/geo/actions';
import { appendReviewerNote } from '@/lib/geo/client';

// Internal WAO-staff review gate (review queue, 2026-08-17) — admin-cookie
// gated like the dashboard itself, NOT the client-session gate used by
// done/route.ts (that one is the client marking their own implementation
// complete; this one is WAO staff approving before they're allowed to send).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const { id } = await params;
  const actionId = decodeURIComponent(id);
  const action = findActionById(actionId);
  if (!action) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  }

  let reviewerName = '';
  let note = '';
  try {
    const body = await req.json();
    reviewerName = String(body?.reviewerName ?? '').trim();
    note = String(body?.note ?? '').trim();
  } catch {
    // no body — fall through to the empty-name rejection below
  }
  if (!reviewerName) {
    return NextResponse.json({ error: 'reviewerName is required' }, { status: 400 });
  }

  if (!approveAction(actionId, reviewerName)) {
    return NextResponse.json({ error: 'Failed to approve — action may have been archived.' }, { status: 409 });
  }

  // Standing style/content condition for future generations on this client
  // — non-fatal to the approval itself if it fails to persist.
  if (note) {
    try {
      appendReviewerNote(action.clientId, note, reviewerName);
    } catch {
      // approval already succeeded; note persistence is best-effort
    }
  }

  return NextResponse.json({ success: true, actionId, approvedBy: reviewerName });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const { id } = await params;
  const actionId = decodeURIComponent(id);
  const action = findActionById(actionId);
  if (!action) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  }

  if (!unapproveAction(actionId)) {
    return NextResponse.json({ error: 'Failed to unapprove.' }, { status: 409 });
  }

  return NextResponse.json({ success: true, actionId });
}
