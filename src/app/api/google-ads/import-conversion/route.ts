import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySessionToken } from '@/lib/client-auth';
import { resolveGoogleAdsMutationAccess } from '@/lib/google-ads/access-policy';
import { loadCampaignConfigBySlug } from '@/lib/crm/intelligence';
import { readLeads, findLeadById } from '@/lib/crm/leadsStore';
import { uploadLeadConversion, type ConversionType } from '@/lib/google-ads/conversion-upload';

interface ImportRequest {
  leadId: number;
  type: ConversionType;
}

/**
 * Thin wrapper: session check → ownership check (both unchanged from before
 * the Priority 3 refactor) → delegate the actual upload mechanics to
 * `uploadLeadConversion()` (`@/lib/google-ads/conversion-upload`). This
 * route's own contract (browser-facing, cookie-authenticated) is unchanged —
 * only its internals are thinned.
 * See docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §1.2/§3.3.
 */
export async function POST(req: Request) {
  try {
    const jar = await cookies();
    const sessionClientId = await verifySessionToken(jar.get(COOKIE_NAME)?.value ?? '');
    if (!sessionClientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body: ImportRequest = await req.json();
    const { leadId, type } = body;

    if (!leadId || (type !== 'verified-lead' && type !== 'closed-deal')) {
      return NextResponse.json({ error: 'leadId and type are required' }, { status: 400 });
    }

    // ── Ownership check (unchanged) ───────────────────────────────────────────
    const leads = await readLeads();
    const lead = findLeadById(leads, leadId);
    if (!lead) {
      return NextResponse.json({ error: `Lead ${leadId} not found` }, { status: 404 });
    }

    const slug = lead.slug;
    if (!slug) {
      return NextResponse.json({ error: 'Lead has no slug — cannot resolve campaign config' }, { status: 400 });
    }

    const config = loadCampaignConfigBySlug(slug);
    if (!config) {
      return NextResponse.json({ error: `Campaign config not found for slug: ${slug}` }, { status: 404 });
    }

    if (!config.clientId || config.clientId !== sessionClientId) {
      return NextResponse.json({ error: 'You can only upload conversions for the Google Ads account linked to your session.' }, { status: 403 });
    }

    const mode = config.mode === 'test' ? 'test' : 'live';
    const sandboxClientId = process.env.GOOGLE_ADS_SANDBOX_CLIENT_ID || 'google-ads-sandbox';
    const access = resolveGoogleAdsMutationAccess({
      sessionClientId,
      requestedClientId: config.clientId,
      mode,
      sandboxClientId,
      liveModeEnabled: process.env.GOOGLE_ADS_ENABLE_LIVE_MODE === 'true',
    });
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });

    // ── Delegate the actual upload mechanics ──────────────────────────────────
    const result = await uploadLeadConversion({ leadId, type });

    if ('skipped' in result) {
      return NextResponse.json(result);
    }
    if (!result.success) {
      return NextResponse.json(result, { status: result.status });
    }
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Conversion upload failed';
    const details = error instanceof Error && 'errors' in error ? (error as { errors?: unknown }).errors : null;
    console.error('[import-conversion] error:', error);
    return NextResponse.json(
      { error: message, details },
      { status: 500 }
    );
  }
}
