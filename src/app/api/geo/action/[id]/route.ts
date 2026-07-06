import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findActionById } from '@/lib/geo/actions';
import { getClientRecord } from '@/lib/geo/client';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';

/**
 * GET /api/geo/action/[id]
 * Shape consumed by the /geo/action/[actionId] page and its client components.
 * Backed by real data (data/clients/{clientId}/tasks/geo/*.json + client.json) —
 * not mocked, since a live pilot client (retter) already runs on this store.
 */
export async function GET(
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

  const client = getClientRecord(action.clientId);
  const schemaJson = JSON.stringify(
    { '@context': 'https://schema.org', ...action.content.jsonLd },
    null,
    2
  );

  return NextResponse.json({
    id:                 action.actionId,
    status:             action.status === 'done' ? 'done' : 'pending',
    implementationMode: action.publishMode ?? 'manual', // 'auto' | 'manual' — see PathCard
    wpConnected:        client?.wpConnected ?? false,
    platform:           client?.platform ?? null,
    contentHtml:        action.content.hebrewContent,
    schemaJson,
    placementUrl:       action.rankingUrl,
  });
}
