import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findActionById, updateActionStatus } from '@/lib/geo/actions';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';

/**
 * POST /api/geo/action/[id]/undone
 * "סימנתי בטעות" — reverts a mistaken "done" mark back to 'generated'.
 * Mirrors the DELETE handler on ../done/route.ts (kept there for backward
 * compatibility); this POST form is what MarkDoneBar calls per spec.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actionId = decodeURIComponent(id);
  const action = findActionById(actionId);

  if (!action) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  }

  // Ownership check: middleware only confirms SOME valid session exists.
  const jar = await cookies();
  const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
  if (!sessionClientId || sessionClientId !== action.clientId) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  updateActionStatus(actionId, 'generated');
  return NextResponse.json({ success: true, actionId, status: 'generated' });
}
