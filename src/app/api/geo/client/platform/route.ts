import { NextResponse } from 'next/server';
import { setClientPlatform } from '@/lib/geo/client';

/**
 * POST /api/geo/client/platform
 * Body: { clientId: string, platform: string }
 * Persists the client's self-declared platform (PlatformSelect) so future
 * visits pre-fill the select and CodeBlock/ContentBlock can tailor guidance.
 */
export async function POST(req: Request) {
  let body: { clientId?: string; platform?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { clientId, platform } = body;
  if (!clientId || !platform) {
    return NextResponse.json({ error: 'clientId and platform are required' }, { status: 400 });
  }

  const ok = setClientPlatform(clientId, platform);
  if (!ok) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, clientId, platform });
}
