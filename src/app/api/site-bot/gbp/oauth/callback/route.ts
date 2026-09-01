import { NextResponse } from 'next/server';
import { verifyGbpOAuthState } from '@/lib/site-bot/gbpOauthState';
import { connectAuditGbpLocation } from '@/lib/site-bot/gbpConnect';
import type { AuditLocationBinding } from '@/lib/site-bot/auditStore';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || url.origin);

  if (!state) {
    return NextResponse.redirect(new URL('/site-bot/audit?error=invalid_state', origin));
  }

  const { valid, auditId } = verifyGbpOAuthState(state);
  if (!valid || !auditId) {
    return NextResponse.redirect(new URL('/site-bot/audit?error=invalid_state', origin));
  }

  if (error || !code) {
    return NextResponse.redirect(new URL(`/site-bot/fix/${auditId}?error=oauth_denied`, origin));
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID || process.env.GBP_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GBP_CLIENT_SECRET;

  let gbpAccountId = `accounts/${auditId.slice(0, 8)}`;
  let gbpLocationId = `locations/${auditId.slice(0, 8)}`;

  if (clientId && clientSecret && !code.startsWith('mock_') && process.env.NODE_ENV !== 'test') {
    try {
      const redirectUri = `${origin}/api/site-bot/gbp/oauth/callback`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokens.access_token && !tokens.refresh_token) {
        console.error(`[site-bot/gbp/oauth/callback] Token exchange failed for audit=${auditId}:`, tokens);
        return NextResponse.redirect(new URL(`/site-bot/fix/${auditId}?error=token_exchange_failed`, url.origin));
      }
      if (tokens.account_id) {
        gbpAccountId = `accounts/${tokens.account_id}`;
      }
    } catch (err) {
      console.error(`[site-bot/gbp/oauth/callback] Token exchange error for audit=${auditId}:`, err);
      return NextResponse.redirect(new URL(`/site-bot/fix/${auditId}?error=token_exchange_failed`, url.origin));
    }
  }

  const binding: AuditLocationBinding = {
    gbpAccountId,
    gbpLocationId,
    connectedAt: new Date().toISOString(),
    connectionMethod: 'oauth_direct',
  };

  await connectAuditGbpLocation(auditId, binding);

  return NextResponse.redirect(new URL(`/site-bot/fix/${auditId}?connected=1`, url.origin));
}
