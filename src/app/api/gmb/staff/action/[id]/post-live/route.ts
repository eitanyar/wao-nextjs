/**
 * GMB Bot — WoZ "post live" step (docs/specs/gmb-bot-scope.md §2/§3, mandatory manual stage).
 * Staff-only: confirms the approved review-reply/post was pushed to GBP via the API and
 * logs it. Deliberately under /api/gmb/staff/... (NOT /api/gmb/action/...) so it falls
 * outside the client-session-gated matcher in src/proxy.ts — this needs the ADMIN cookie,
 * not the client cookie. Same inline-check convention as src/app/api/leads/route.ts's GET.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { findQueueItemById, updateQueueItem } from '@/lib/gmb/store';
import { appendEntry, makeEntryId } from '@/lib/gmb/log';

async function isAdminAuthorized(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE_NAME)?.value ?? '';
  return verifyAdminToken(token);
}

interface Body {
  gbpConfirmationNote?: string; // e.g. "reply live at reviews/{reviewId}" — free text, staff-entered
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const itemId = decodeURIComponent(id);
  const item = findQueueItemById(itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  if (item.status !== 'approved-as-is' && item.status !== 'approved-edited') {
    return NextResponse.json(
      { error: `Item must be approved before posting live (current: ${item.status})` },
      { status: 409 }
    );
  }

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine — confirmation note is optional
  }

  const now = new Date().toISOString();
  const updated = updateQueueItem(itemId, { status: 'posted', postedAt: now, postedBy: 'staff' });

  try {
    appendEntry({
      entryId:      makeEntryId(item.clientId),
      clientId:     item.clientId,
      actionId:     itemId,
      actionType:   item.type,
      targetUrl:    item.sourceId,
      contentSnippet: item.draftText.slice(0, 120),
      tier:         'managed',
      approvedBy:   item.approvedBy || 'client',
      approvedAt:   item.approvedAt || now,
      publishedAt:  now,
      publishedBy:  'staff',
      verifiedAt:   now,
      verificationResult: 'pass',
      verificationNote:   body.gbpConfirmationNote,
      fixAttempts:  0,
    });
  } catch {
    // Log failure is non-fatal — item is already marked posted; log is best-effort here
    // the same way GEO's done-route treats its log append as best-effort.
  }

  return NextResponse.json({ success: true, item: updated });
}
