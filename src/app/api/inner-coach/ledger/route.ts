import { NextRequest, NextResponse } from 'next/server';
import { isStaff } from '@/lib/trainer/auth';
import { addBeliefs, createEmptyLedger, isValidDraftBelief, loadLedger, saveLedger } from '@/lib/inner-coach/ledger';

export const dynamic = 'force-dynamic';

/** GET /api/inner-coach/ledger — read for the dashboard. Staff-gated, Eitan-only. */
export async function GET() {
  if (!(await isStaff())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const ledger = loadLedger() ?? createEmptyLedger();
  return NextResponse.json({ ok: true, ledger });
}

/**
 * POST /api/inner-coach/ledger — the hand-approve step (vision §4: "sum thing is
 * NEVER written without his approval"). Body: { beliefs: DraftBelief[] }. Appends
 * hand-edited/approved drafts as new active beliefs — never overwrites existing
 * beliefs' evidence/status. Staff-gated, Eitan-only.
 */
export async function POST(request: NextRequest) {
  if (!(await isStaff())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  const beliefs = Array.isArray(body.beliefs) ? body.beliefs : null;
  if (!beliefs || beliefs.length === 0 || !beliefs.every(isValidDraftBelief)) {
    return NextResponse.json({ error: 'invalid-beliefs' }, { status: 400 });
  }

  const ledger = loadLedger() ?? createEmptyLedger();
  const updated = addBeliefs(ledger, beliefs);
  saveLedger(updated);

  return NextResponse.json({ ok: true, ledger: updated });
}
