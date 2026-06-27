import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Get hostname of request (e.g. demo.wao.co.il, localhost:3000)
  const hostname = req.headers.get("host") || "";

  // Define allowed core domains that shouldn't be treated as tenant subdomains
  // Check if it's strictly 'localhost:3000' without a subdomain prefix
  const isStrictLocalhost = hostname === "localhost:3000" || hostname === "127.0.0.1:3000" || hostname === "localhost";
  
  const isCoreDomain = 
    hostname === "wao.co.il" || 
    hostname === "www.wao.co.il" || 
    isStrictLocalhost;

  // If it's a known core domain, let Next.js handle it normally
  if (isCoreDomain) {
    return NextResponse.next();
  }

  // Otherwise, extract the subdomain (e.g. 'david-plumbing' from 'david-plumbing.wao.co.il')
  // Note: for local testing, 'client1.localhost:3000' will yield 'client1'
  const subdomain = hostname.split(".")[0];

  // Prevent infinite rewrite loops
  if (url.pathname.startsWith(`/site/`)) {
    return NextResponse.next();
  }

  // Rewrite the URL to the dynamic site route: /site/[subdomain]
  return NextResponse.rewrite(new URL(`/site/${subdomain}${url.pathname}`, req.url));
}
