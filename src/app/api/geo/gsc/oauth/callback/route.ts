import { NextResponse } from 'next/server';
import { verifyGscOAuthState } from '@/lib/geo/gsc-oauth-state';
import { saveGscToken } from '@/lib/geo/gsc-token';
import { setClientGscConnected, getClientRecord } from '@/lib/geo/client';

/**
 * GET /api/geo/gsc/oauth/callback — Google redirects here after consent.
 * Exchanges the auth code for a refresh token (same token-exchange call as
 * `scripts/gsc-get-token.mjs`, but per-client rather than into .env.local),
 * lists the Google account's accessible GSC properties, and stores both
 * under data/clients/{clientId}/gsc-token.json (encrypted at rest).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const landingBase = `${url.origin}/geo/signup/connect-gsc`;

  if (error || !code || !state) {
    return NextResponse.redirect(`${landingBase}?error=1`);
  }

  const clientId = verifyGscOAuthState(state);
  if (!clientId) {
    return NextResponse.redirect(`${landingBase}?error=1`);
  }

  if (!getClientRecord(clientId)) {
    return NextResponse.redirect(`${landingBase}?error=1`);
  }

  const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('[geo/gsc/oauth/callback] GOOGLE_ADS_CLIENT_ID/SECRET not set.');
    return NextResponse.redirect(`${landingBase}?clientId=${clientId}&error=1`);
  }

  const redirectUri = `${url.origin}/api/geo/gsc/oauth/callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      console.error(`[geo/gsc/oauth/callback] No refresh token for client=${clientId}:`, tokens);
      return NextResponse.redirect(`${landingBase}?clientId=${clientId}&error=1`);
    }

    // Best-effort: list accessible sites so the client (and future
    // gsc-pareto.mjs wiring) knows which property to query. A failure here
    // must not fail the connection itself — an empty list is still a valid,
    // connected state (e.g. property added to the account later).
    let sites: string[] = [];
    try {
      const sitesRes = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const sitesJson = await sitesRes.json();
      sites = (sitesJson.siteEntry || []).map((s: { siteUrl: string }) => s.siteUrl);
    } catch (err) {
      console.error(`[geo/gsc/oauth/callback] Failed to list GSC sites for client=${clientId}:`, err);
    }

    saveGscToken({
      clientId,
      refreshTokenPlain: tokens.refresh_token,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      sites,
    });
    setClientGscConnected(clientId, true);

    return NextResponse.redirect(`${landingBase}?clientId=${clientId}&success=1`);
  } catch (err) {
    console.error(`[geo/gsc/oauth/callback] Token exchange failed for client=${clientId}:`, err);
    return NextResponse.redirect(`${landingBase}?clientId=${clientId}&error=1`);
  }
}
