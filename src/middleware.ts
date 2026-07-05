import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';

const PROTECTED = ['/client', '/geo/action'];
const LOGIN_PATH = '/client/login';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isLoginPage = pathname.startsWith(LOGIN_PATH);

  if (!isProtected || isLoginPage) return NextResponse.next();

  const token    = req.cookies.get(COOKIE_NAME)?.value ?? '';
  const clientId = await verifySessionToken(token);

  if (!clientId) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/client/:path*', '/geo/action/:path*'],
};
