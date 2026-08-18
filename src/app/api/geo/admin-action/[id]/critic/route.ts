import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { findActionById, saveCriticResult, recordCriticFlagsActedOn } from '@/lib/geo/actions';
import { runDistinctivenessCritic } from '@/lib/geo/critic';

// Admin-only, reviewer-triggered distinctiveness critic (2026-08-17). Same
// /api/geo/admin-action prefix as approve/qa — outside the /api/geo/action
// prefix that src/proxy.ts gates with the CLIENT session cookie.
// On-demand only: this route does NOT run automatically, a reviewer clicks
// a button in the dashboard to fire it. Not yet trusted at production
// scale — see src/lib/geo/critic.ts's file header for the validation gate.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  try {
    const result = await runDistinctivenessCritic(action);
    saveCriticResult(actionId, result);
    return NextResponse.json({ success: true, actionId, result });
  } catch (err) {
    console.error(`[geo/admin-action/${actionId}/critic] failed:`, err);
    return NextResponse.json({ error: 'Critic call failed — check Qwen API config/logs.' }, { status: 502 });
  }
}

// Records whether the reviewer's decision was actually changed by the
// critic's flags — the flag-hit-rate signal the Retter validation needs.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const { id } = await params;
  const actionId = decodeURIComponent(id);

  let actedOn: boolean | null = null;
  try {
    const body = await req.json();
    actedOn = typeof body?.actedOn === 'boolean' ? body.actedOn : null;
  } catch {
    // fall through to validation below
  }
  if (actedOn === null) {
    return NextResponse.json({ error: 'actedOn (boolean) is required' }, { status: 400 });
  }

  if (!recordCriticFlagsActedOn(actionId, actedOn)) {
    return NextResponse.json({ error: 'Failed to record — no prior critic result found for this action.' }, { status: 409 });
  }

  return NextResponse.json({ success: true, actionId, actedOn });
}
