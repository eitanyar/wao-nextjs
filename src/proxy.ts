import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';

// '/gmb/action' + '/api/gmb/action' reuse the same client-session cookie.
// `/geo/action` is gated in the page itself (wao-admin → /admin/login) so the
// page-level redirect is what an unauthenticated request observes. API
// mutations stay on the client-session cookie.
const CLIENT_PROTECTED = ['/client', '/api/geo/action', '/gmb/action', '/api/gmb/action'];
// Note: '/api/leads' is deliberately NOT listed here — its POST handler is
// the public lead-capture endpoint hit by landing-page forms. Only its GET
// (the admin CRM read) is gated, and that's done inside the route itself
// (src/app/api/leads/route.ts) so it can allow POST through unauthenticated
// while still requiring the admin cookie for GET.
// '/gmb/dashboard' reuses the same admin cookie/login as '/geo/dashboard' —
// one staff login gates both bots' WoZ dashboards.
const ADMIN_PROTECTED  = ['/geo/dashboard', '/gmb/dashboard', '/leads'];
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
  matcher: ['/client/:path*', '/geo/action/:path*', '/api/geo/action/:path*', '/geo/dashboard/:path*', '/gmb/action/:path*', '/api/gmb/action/:path*', '/gmb/dashboard/:path*', '/admin/clients/:path*', '/leads/:path*'],
};
