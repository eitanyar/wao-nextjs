import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, enabled, openOptinStore, resendMailer, sameOrigin, submitOptin, validateSubmission } from '@/lib/exit-optin';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const dbPath = process.env.WAO_EXIT_OPTIN_DB_PATH;
  if (!enabled({ feature: process.env.WAO_EXIT_OPTIN_ENABLED, send: process.env.WAO_EXIT_OPTIN_SEND_ENABLED, dbPath }))
    return NextResponse.json({ ok: false }, { status: 404 });
  if (!sameOrigin(request) || Number(request.headers.get('content-length') || 0) > 2048 ||
      !request.headers.get('content-type')?.startsWith('application/json'))
    return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const text = await request.text();
    if (text.length > 2048) return NextResponse.json({ ok: false }, { status: 400 });
    const body = JSON.parse(text);
    const input = validateSubmission(body);
    const referer = request.headers.get('referer');
    if (!input || !referer || new URL(referer).origin !== new URL(request.url).origin || new URL(referer).pathname !== input.source)
      return NextResponse.json({ ok: false }, { status: 400 });
    const store = openOptinStore(dbPath!);
    try {
      const result = await submitOptin(store, body, new URL(request.url).origin, resendMailer);
      const response = NextResponse.json({ ok: result.delivered }, { status: result.delivered ? 200 : 400 });
      response.headers.set('Cache-Control', 'no-store');
      if (result.session) response.cookies.set(COOKIE_NAME, result.session, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 60 * 60 * 24 * 365 });
      return response;
    } finally { store.db.close(); }
  } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
}
