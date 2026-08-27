import { NextResponse } from 'next/server';
import { UUID_REGEX } from '@/lib/site-bot/auditStore';
import { signGbpOAuthState } from '@/lib/site-bot/gbpOauthState';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const auditId = url.searchParams.get('auditId')?.trim() ?? '';

  if (!auditId || !UUID_REGEX.test(auditId)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID || process.env.GBP_CLIENT_ID;
  if (!clientId) {
    console.error('[site-bot/gbp/oauth/start] GBP OAuth client ID is not configured.');
    return NextResponse.json({ error: 'GBP OAuth is not configured on this server.' }, { status: 503 });
  }

  const redirectUri = `${url.origin}/api/site-bot/gbp/oauth/callback`;
  const state = signGbpOAuthState(auditId);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/business.manage');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
