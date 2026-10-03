import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, enabled, openOptinStore, optedIn } from '@/lib/exit-optin';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const dbPath = process.env.WAO_EXIT_OPTIN_DB_PATH;
  const response = NextResponse.json({ enabled: enabled({ feature: process.env.WAO_EXIT_OPTIN_ENABLED, send: process.env.WAO_EXIT_OPTIN_SEND_ENABLED, dbPath }), optedIn: false });
  response.headers.set('Cache-Control', 'no-store');
  if (!dbPath || process.env.WAO_EXIT_OPTIN_ENABLED !== 'true' || process.env.WAO_EXIT_OPTIN_SEND_ENABLED !== 'true') return response;
  try {
    const store = openOptinStore(dbPath);
    try { return NextResponse.json({ enabled: true, optedIn: optedIn(store, request.cookies.get(COOKIE_NAME)?.value) }, { headers: { 'Cache-Control': 'no-store' } }); }
    finally { store.db.close(); }
  } catch { return NextResponse.json({ enabled: false, optedIn: false }, { headers: { 'Cache-Control': 'no-store' } }); }
}
