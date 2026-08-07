import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { isLiveYaadMode, resolveCallbackOutcome } from '@/lib/checkout/yaad-verify';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') || 'campaign';
    const transactionId = url.searchParams.get('Id') || url.searchParams.get('key') || 'TX-' + Date.now();

    const terminalNumber = process.env.YAAD_TERMINAL_NUMBER || '1234567890';
    const apiKey = process.env.YAAD_API_KEY;
    // TODO(Eitan-Dev): YAAD_PASSP not yet retrieved from Hyp — see
    // docs/specs/priority-4-live-payment-integration.md §1a. Until it is
    // sourced, every live callback fails closed inside
    // verifyYaadCallbackViaHyp (it explicitly checks for a missing passP).
    const passP = process.env.YAAD_PASSP;

    // Live mode: verification is mandatory and fail-closed — no opt-in env
    // flag, no bypass. Hyp Pay does not sign callbacks with a
    // locally-verifiable HMAC; instead the callback's own parameters are
    // round-tripped back to Hyp's APISign VERIFY endpoint, and only a
    // CCode=0 response is treated as genuine. A callback claiming success
    // without a valid Hyp VERIFY response is treated as a failure. Sandbox
    // mode (no real Hyp terminal configured) has no real Hyp server issuing
    // Sign at all, so it keeps bypassing this check — see
    // isLiveYaadMode / checkout/route.ts. The decision itself lives in the
    // pure, unit-tested resolveCallbackOutcome (see yaad-verify.test.mjs).
    const { outcome, reason } = await resolveCallbackOutcome({
      searchParams: url.searchParams,
      isLive: isLiveYaadMode(),
      terminal: terminalNumber,
      apiKey: apiKey || '',
      passP,
    });

    if (outcome === 'error') {
      console.error('[checkout/callback] Callback resolved as error' + (reason ? ` (${reason})` : ''));
      return NextResponse.redirect(new URL(`/google-ads/onboarding?payment=error${reason ? `&reason=${reason}` : ''}&slug=${encodeURIComponent(slug)}`, req.url));
    }

    try {
      const paymentLogDir = path.join(process.cwd(), 'data', 'payments');
      fs.mkdirSync(paymentLogDir, { recursive: true });
      fs.writeFileSync(
        path.join(paymentLogDir, `${slug}-${Date.now()}.json`),
        JSON.stringify({
          slug,
          transactionId,
          status: 'success',
          timestamp: new Date().toISOString(),
          query: Object.fromEntries(url.searchParams.entries()),
        }, null, 2)
      );
    } catch (logErr) {
      console.warn('[checkout/callback] Failed to write payment log:', logErr);
    }

    return NextResponse.redirect(new URL(`/google-ads/onboarding?payment=success&slug=${encodeURIComponent(slug)}`, req.url));
  } catch (error: any) {
    console.error('[checkout/callback] Error processing payment callback:', error);
    return NextResponse.redirect(new URL('/google-ads/onboarding?payment=error', req.url));
  }
}
