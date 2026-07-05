import { NextResponse } from 'next/server';
import { findActionById } from '@/lib/geo/actions';
import { getClientRecord } from '@/lib/geo/client';

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
