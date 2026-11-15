// The Site Bot's self-hosted Heebo font, for the landing page inside the homepage hero window.
import { siteFontFiles, SITE_FONT_PATHS } from "@/lib/lp/siteFonts";

export const dynamic = "force-static";
export const dynamicParams = false;

const FILES: Record<string, string> = {
  [SITE_FONT_PATHS.hebrew.split("/").pop()!]: SITE_FONT_PATHS.hebrew,
  [SITE_FONT_PATHS.latin.split("/").pop()!]: SITE_FONT_PATHS.latin,
};

export function generateStaticParams() {
  return Object.keys(FILES).map((file) => ({ file }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const key = FILES[file];
  const bytes = key ? siteFontFiles()[key.slice(1)] : undefined;
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "font/woff2",
      "X-Robots-Tag": "noindex",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
