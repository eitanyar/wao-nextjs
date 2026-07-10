import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';

const CLIENT_PROTECTED = ['/client', '/geo/action', '/api/geo/action'];
const ADMIN_PROTECTED  = ['/geo/dashboard'];
const MASTER_ADMIN_PROTECTED = ['/admin/clients'];
const LOGIN_PATH       = '/client/login';
const ADMIN_LOGIN_PATH = '/geo/login';
const MASTER_ADMIN_LOGIN_PATH = '/admin/login';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');

  // ── Master-admin-gated routes (Eitan's "log in as any client" flow) ──────
  if (MASTER_ADMIN_PROTECTED.some(p => pathname.startsWith(p))) {
    const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? '';
    const isAdmin = await verifyAdminToken(adminToken);
    if (!isAdmin) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = MASTER_ADMIN_LOGIN_PATH;
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Admin-gated routes (Eitan's cross-client dashboard) ───────────────────
  if (ADMIN_PROTECTED.some(p => pathname.startsWith(p)) && !pathname.startsWith(ADMIN_LOGIN_PATH)) {
    const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? '';
    const isAdmin = await verifyAdminToken(adminToken);
    if (!isAdmin) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = ADMIN_LOGIN_PATH;
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Client-session-gated routes (pages + API) ─────────────────────────────
  const isProtected = CLIENT_PROTECTED.some(p => pathname.startsWith(p));
  const isLoginPage = pathname.startsWith(LOGIN_PATH);

  if (!isProtected || isLoginPage) return NextResponse.next();

  const token    = req.cookies.get(COOKIE_NAME)?.value ?? '';
  const clientId = await verifySessionToken(token);

  if (!clientId) {
    if (isApi) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/client/:path*', '/geo/action/:path*', '/api/geo/action/:path*', '/geo/dashboard/:path*', '/admin/clients/:path*'],
};
