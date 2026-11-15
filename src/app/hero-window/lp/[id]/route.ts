// The landing page shown inside the homepage hero window (iframe), one per showcase entry
// (src/lib/home/heroShowcases.ts). Built once at build time (live-url entries are fetched from our Worker then);
// unknown ids 404. noindex so a showcased page is never indexed, nor indexed as embedded in the homepage.
import { showcaseLandingHtml } from "@/lib/home/heroLandingPage";
import { SHOWCASES } from "@/lib/home/heroShowcases";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return SHOWCASES.map((e) => ({ id: e.id }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = SHOWCASES.find((e) => e.id === id);
  if (!entry) return new Response("Not found", { status: 404 });
  return new Response(await showcaseLandingHtml(entry), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
