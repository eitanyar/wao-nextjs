// The landing page shown inside the homepage hero window (iframe). Built once at build time; noindex so its
// content (a demo business) is never indexed, nor indexed as embedded in the homepage.
import { heroLandingPageHtml } from "@/lib/home/heroLandingPage";

export const dynamic = "force-static";

export function GET() {
  return new Response(heroLandingPageHtml(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
