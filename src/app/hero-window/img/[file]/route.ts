// The approved look images (hero photo widths) of the stored showcase records, for the landing page inside the homepage
// hero window. Built at build time from data/video/demo/site-proof (sha256-checked against the staff approval).
import { heroWindowImages } from "@/lib/home/heroLandingPage";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(heroWindowImages()).map((file) => ({ file }));
}

const TYPES: Record<string, string> = { avif: "image/avif", webp: "image/webp" };

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const bytes = heroWindowImages()[file];
  const type = TYPES[file.slice(file.lastIndexOf(".") + 1)];
  if (!bytes || !type) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "X-Robots-Tag": "noindex",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
