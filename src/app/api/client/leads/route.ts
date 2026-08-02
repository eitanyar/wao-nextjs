import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';
import { loadClientGoogleAdsIndex } from '@/lib/crm/intelligence';
import { readLeads, writeLeads } from '@/lib/crm/leadsStore';
import { uploadLeadConversion } from '@/lib/google-ads/conversion-upload';
import { leadMatchesClientIndex } from '@/lib/crm/ownership';
import { applyClientLeadFeedback } from '@/lib/crm/clientLeadsActions';

/**
 * Client-scoped, session-gated equivalent of `/api/leads` — deliberately NOT
 * a passthrough to that route's full admin `action` vocabulary (so a client
 * can never reach `enrichStub` or any future admin-only action by
 * shape-guessing the request body). See
 * docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §1.2/§2.3.
 *
 * GET  → only leads where `leadMatchesClientIndex(lead, clientIndex)` is
 *         true (the same ownership semantics `isLeadOwnedByClient` exposes
 *         from `intelligence.ts`, checked directly against the already-loaded
 *         index to avoid reloading it per lead).
 * POST → restricted action vocabulary: { leadId, quality: 'GOOD'|'JUNK' } or
 *         { leadId, closed: { revenue } }. Ownership checked per-lead inside
 *         `applyClientLeadFeedback` → 403 (write path never reached) if the
 *         lead isn't theirs. The CRM write is truth; the Google Ads upload
 *         is best-effort and never fails or reverts the write (§1.2).
 */

export async function GET() {
  const jar = await cookies();
  const clientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
  if (!clientId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const clientIndex = loadClientGoogleAdsIndex(clientId);
  const leads = await readLeads();
  const ownLeads = leads.filter((lead) => leadMatchesClientIndex(lead, clientIndex));

  return NextResponse.json({ success: true, leads: ownLeads });
}

export async function POST(req: Request) {
  const jar = await cookies();
  const clientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
  if (!clientId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { leadId?: number; quality?: 'GOOD' | 'JUNK'; closed?: { revenue?: number } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { leadId, quality, closed } = body;
  const isValidQuality = quality === 'GOOD' || quality === 'JUNK';
  const isValidClosed = Boolean(closed) && typeof closed?.revenue === 'number';

  if (!leadId || (!isValidQuality && !isValidClosed)) {
    return NextResponse.json(
      { success: false, error: "Expected { leadId, quality: 'GOOD'|'JUNK' } or { leadId, closed: { revenue } }" },
      { status: 400 }
    );
  }

  const clientIndex = loadClientGoogleAdsIndex(clientId);
  const leads = await readLeads();

  const result = await applyClientLeadFeedback({
    leadId,
    quality,
    closed: isValidClosed ? { revenue: closed!.revenue as number } : undefined,
    leads,
    clientIndex,
    writeLeads,
    uploadLeadConversion,
  });

  return NextResponse.json(result.body, { status: result.status });
}
