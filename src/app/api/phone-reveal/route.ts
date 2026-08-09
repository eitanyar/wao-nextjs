import { NextRequest, NextResponse } from "next/server";
import { appendPhoneReveal } from "@/lib/phoneRevealStore";

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowed = origin.endsWith(".wao.co.il") || origin === "https://wao.co.il";
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://wao.co.il",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * Click-intent tracker for the desktop "reveal number" pattern — logs the
 * event server-side (durable record in src/data/phone-reveals.json) as a
 * fallback/complement to the client-side `phone_reveal` dataLayer push,
 * so there's a record even before/without a Meta Pixel wired into GTM.
 * Not a lead — no name/phone captured, just the attribution context at
 * the moment someone chose to reveal the number.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    await appendPhoneReveal({
      source: String(body.source ?? "unknown").trim(),
      ref: String(body.ref ?? "").trim() || undefined,
      utmSource: String(body.utm_source ?? "").trim() || undefined,
      utmMedium: String(body.utm_medium ?? "").trim() || undefined,
      utmCampaign: String(body.utm_campaign ?? "").trim() || undefined,
      page: String(body.page ?? "").trim() || undefined,
    });

    return NextResponse.json({ ok: true }, { headers: corsHeaders(req) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500, headers: corsHeaders(req) });
  }
}

export function GET() {
  return NextResponse.json({ ok: false }, { status: 405 });
}
