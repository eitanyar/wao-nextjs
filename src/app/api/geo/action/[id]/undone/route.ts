import { NextResponse } from 'next/server';
import { findActionById, updateActionStatus } from '@/lib/geo/actions';

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

  updateActionStatus(actionId, 'generated');
  return NextResponse.json({ success: true, actionId, status: 'generated' });
}
