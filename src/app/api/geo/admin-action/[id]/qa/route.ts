import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { findActionById, getActionQA, updateActionQA } from '@/lib/geo/actions';

// Admin-only Q&A editor (review queue item 2a, 2026-08-17). Same
// /api/geo/admin-action prefix as approve/route.ts — deliberately outside
// the /api/geo/action prefix that src/proxy.ts gates with the CLIENT
// session cookie, so this route's own admin check is the actual gate.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  const isAdmin = await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '');
  if (!isAdmin) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const { id } = await params;
  const action = findActionById(decodeURIComponent(id));
  if (!action) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  }
  if (action.actionType !== 'faq_block') {
    return NextResponse.json({ error: 'Only faq_block actions have editable Q&A' }, { status: 400 });
  }

  return NextResponse.json({ items: getActionQA(action) });
}

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
  if (action.actionType !== 'faq_block') {
    return NextResponse.json({ error: 'Only faq_block actions have editable Q&A' }, { status: 400 });
  }

  let items: { question: string; answer: string }[] = [];
  let editorName = '';
  try {
    const body = await req.json();
    editorName = String(body?.editorName ?? '').trim();
    items = Array.isArray(body?.items)
      ? body.items.map((it: unknown) => {
          const rec = it as Record<string, unknown>;
          return { question: String(rec?.question ?? '').trim(), answer: String(rec?.answer ?? '').trim() };
        })
      : [];
  } catch {
    // fall through to validation below
  }

  if (!editorName) {
    return NextResponse.json({ error: 'editorName is required' }, { status: 400 });
  }
  if (!items.length || items.some(it => !it.question || !it.answer)) {
    return NextResponse.json({ error: 'Every question and answer must be non-empty' }, { status: 400 });
  }

  if (!updateActionQA(actionId, items, editorName)) {
    return NextResponse.json({ error: 'Failed to save — action may have been archived.' }, { status: 409 });
  }

  return NextResponse.json({ success: true, actionId });
}
