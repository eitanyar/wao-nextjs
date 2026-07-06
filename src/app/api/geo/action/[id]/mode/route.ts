import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findActionById, updateActionPublishMode } from '@/lib/geo/actions';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';

/**
 * POST /api/geo/action/[id]/mode
 * Body: { mode: 'auto' | 'manual' }
 * Switching is mutual exclusion (radio, not checkboxes) — enforced client-side by PathCard
 * and re-enforced here. If auto-publish already executed (status done, mode auto),
 * the switch is locked server-side too.
 */
export async function POST(
  req: Request,
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

  let body: { mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const mode = body.mode;
  if (mode !== 'auto' && mode !== 'manual') {
    return NextResponse.json({ error: 'mode must be "auto" or "manual"' }, { status: 400 });
  }

  const currentMode = action.publishMode ?? 'manual';
  if (action.status === 'done' && currentMode === 'auto') {
    return NextResponse.json(
      { error: 'Auto-publish already executed for this action — switching to manual is disabled.' },
      { status: 409 }
    );
  }

  updateActionPublishMode(actionId, mode);
  return NextResponse.json({ success: true, actionId, implementationMode: mode });
}
