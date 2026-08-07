import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { getClientRecord } from '@/lib/geo/client';
import { signGscOAuthState } from '@/lib/geo/gsc-oauth-state';

/**
 * GET /api/geo/gsc/oauth/start?clientId=...
 * Kicks off the self-serve Google Search Console OAuth consent flow
 * (VISION.md line 247: "Self-serve GSC OAuth (for clients post-payment)").
 *
 * Reuses the existing GOOGLE_ADS_CLIENT_ID/SECRET OAuth web client — it's
 * the same Google Cloud project `scripts/gsc-get-token.mjs` already uses for
 * the `webmasters.readonly` scope for WAO's own single-account GSC pull, so
 * the scope/consent-screen review is already in place. The only external
 * step this route needs (cannot be done from code — flagging for Eitan):
 * add `{origin}/api/geo/gsc/oauth/callback` as an Authorized redirect URI
 * on that OAuth client in Google Cloud Console, for both localhost:3000 (dev)
 * and the production origin.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value ?? '';
  const sessionClientId = await verifySessionToken(token);
  if (!sessionClientId || sessionClientId !== clientId) {
    const next = encodeURIComponent(`/geo/signup/connect-gsc?clientId=${clientId}`);
    return NextResponse.redirect(new URL(`/client/login?next=${next}&c=${clientId}`, url.origin));
  }

  const record = getClientRecord(clientId);
  if (!record) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
  if (!CLIENT_ID) {
    console.error('[geo/gsc/oauth/start] GOOGLE_ADS_CLIENT_ID is not set.');
    return NextResponse.json({ error: 'GSC OAuth is not configured on this server.' }, { status: 500 });
  }

  const redirectUri = `${url.origin}/api/geo/gsc/oauth/callback`;
  const state = signGscOAuthState(clientId);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/webmasters.readonly');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
