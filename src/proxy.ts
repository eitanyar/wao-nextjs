import { NextRequest, NextResponse } from 'next/server';
import { verifyClientSession, COOKIE_NAME } from '@/lib/client-auth';
import { ADMIN_COOKIE_NAME, verifyAdminClientFixtureAccess, verifyAdminToken } from '@/lib/admin-auth';

const CLIENT_PROTECTED = ['/client', '/api/geo/action', '/gmb/action', '/api/gmb/action'];
const ADMIN_PROTECTED = ['/geo/dashboard', '/gmb/dashboard', '/leads'];
const MASTER_ADMIN_PROTECTED = ['/admin/clients', '/admin/podcast-titles'];
const LOGIN_PATH = '/client/login';
const ADMIN_LOGIN_PATH = '/geo/login';
const MASTER_ADMIN_LOGIN_PATH = '/admin/login';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');
  if (MASTER_ADMIN_PROTECTED.some(prefix => pathname.startsWith(prefix))) {
    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? '';
    const authorized = pathname === '/admin/clients'
      ? await verifyAdminClientFixtureAccess(token, pathname, process.env.WAO_CLIENT_AUTH_DEV_FIXTURE_ROOT)
      : await verifyAdminToken(token) ? 'live' : null;
    if (!authorized) {
      const loginUrl = req.nextUrl.clone(); loginUrl.pathname = MASTER_ADMIN_LOGIN_PATH; loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }
  if (ADMIN_PROTECTED.some(prefix => pathname.startsWith(prefix)) && !pathname.startsWith(ADMIN_LOGIN_PATH)) {
    if (!await verifyAdminToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? '')) {
      const loginUrl = req.nextUrl.clone(); loginUrl.pathname = ADMIN_LOGIN_PATH; loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }
  const isProtected = CLIENT_PROTECTED.some(prefix => pathname.startsWith(prefix));
  if (!isProtected || pathname.startsWith(LOGIN_PATH)) return NextResponse.next();
  if (req.method === 'GET' && pathname === '/client/recover') return NextResponse.next();
  const session = await verifyClientSession(req.cookies.get(COOKIE_NAME)?.value ?? '');
  if (!session) {
    if (isApi) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const loginUrl = req.nextUrl.clone(); loginUrl.pathname = LOGIN_PATH; loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (session.scope === 'change-pin' && pathname !== '/client/change-pin') {
    if (isApi) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const changeUrl = req.nextUrl.clone(); changeUrl.pathname = '/client/change-pin'; changeUrl.search = '';
    return NextResponse.redirect(changeUrl);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/client/:path*', '/geo/action/:path*', '/api/geo/action/:path*', '/geo/dashboard/:path*', '/gmb/action/:path*', '/api/gmb/action/:path*', '/gmb/dashboard/:path*', '/admin/clients/:path*', '/admin/podcast-titles/:path*', '/leads/:path*'] };
