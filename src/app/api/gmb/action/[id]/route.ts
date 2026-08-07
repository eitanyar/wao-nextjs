/**
 * GMB Bot — client-facing approve/edit/reject for one queue item.
 * Mirrors the ownership-check pattern of src/app/api/geo/action/[id]/done/route.ts
 * (session cookie must match the item's clientId) but the state machine differs:
 * GEO's `done` just means "client pasted it themselves"; a GMB decision here is
 * the client's approval, NOT the live post — that only happens in the separate
 * staff-only /api/gmb/action/[id]/post-live route (WoZ, per spec §2).
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findQueueItemById, updateQueueItem } from '@/lib/gmb/store';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';

interface Body {
  decision: 'approve-as-is' | 'approve-edited' | 'reject';
  editedText?: string;
  approvedBy?: string;
  rejectedReason?: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = decodeURIComponent(id);

  const item = findQueueItemById(itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const jar = await cookies();
  const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
  if (!sessionClientId || sessionClientId !== item.clientId) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  if (item.status !== 'pending') {
    return NextResponse.json({ error: `Item already ${item.status}` }, { status: 409 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (body.decision === 'reject') {
    const updated = updateQueueItem(itemId, {
      status: 'rejected',
      rejectedAt: now,
      rejectedReason: body.rejectedReason,
    });
    return NextResponse.json({ success: true, item: updated });
  }

  if (body.decision === 'approve-edited') {
    if (!body.editedText || !body.editedText.trim()) {
      return NextResponse.json({ error: 'editedText is required for approve-edited' }, { status: 400 });
    }
    const updated = updateQueueItem(itemId, {
      status: 'approved-edited',
      draftText: body.editedText.trim(),
      approvedAt: now,
      approvedBy: body.approvedBy || 'client',
    });
    return NextResponse.json({ success: true, item: updated });
  }

  if (body.decision === 'approve-as-is') {
    const updated = updateQueueItem(itemId, {
      status: 'approved-as-is',
      approvedAt: now,
      approvedBy: body.approvedBy || 'client',
    });
    return NextResponse.json({ success: true, item: updated });
  }

  return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
}
