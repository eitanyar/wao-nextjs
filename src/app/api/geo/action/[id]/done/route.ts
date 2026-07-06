import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findActionById, updateActionStatus } from '@/lib/geo/actions';
import { appendEntry, makeEntryId } from '@/lib/geo/approvalLog';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actionId = decodeURIComponent(id);

  // Load server-side — do not trust the request body for log data
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

  updateActionStatus(actionId, 'done');

  try {
    const now = new Date().toISOString();
    appendEntry({
      entryId:            makeEntryId(actionId),
      clientId:           action.clientId,
      actionId,
      actionType:         action.actionType,
      targetUrl:          action.rankingUrl,
      // First 120 chars of the Hebrew content — verifier uses first 80 as fingerprint.
      // Must be non-empty so html.includes(fingerprint) is a real check, not trivially true.
      contentSnippet:     action.content.hebrewContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120),
      schemaType:         (action.content.jsonLd?.['@type'] as string | undefined) ?? undefined,
      tier:               'managed',
      approvedBy:         'client',
      approvedAt:         now,
      publishedAt:        now,      // required: batch verifier filters on publishedAt being set
      publishedBy:        'client',
      verifiedAt:         undefined,
      verificationResult: 'pending',
      fixAttempts:        0,
    });
  } catch {
    // Log failure is non-fatal — action is already marked done
  }

  return NextResponse.json({ success: true, actionId, status: 'done' });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actionId = decodeURIComponent(id);
  const action = findActionById(actionId);
  if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 });

  const jar = await cookies();
  const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
  if (!sessionClientId || sessionClientId !== action.clientId) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  updateActionStatus(actionId, 'generated');
  return NextResponse.json({ success: true, actionId, status: 'generated' });
}
