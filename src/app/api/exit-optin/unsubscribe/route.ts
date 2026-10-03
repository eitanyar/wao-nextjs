import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, openOptinStore, unsubscribe } from '@/lib/exit-optin';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const dbPath = process.env.WAO_EXIT_OPTIN_DB_PATH;
  if (dbPath) {
    try {
      const store = openOptinStore(dbPath);
      try { unsubscribe(store, request.nextUrl.searchParams.get('token')); }
      finally { store.db.close(); }
    } catch { /* Generic response; do not disclose membership or persistence errors. */ }
  }
  const response = new NextResponse(null, { status: 303, headers: { Location: '/privacy', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
