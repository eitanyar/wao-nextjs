import { NextRequest, NextResponse } from "next/server";

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowed = origin.endsWith('.wao.co.il') || origin === 'https://wao.co.il';
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://wao.co.il',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}
import nodemailer from "nodemailer";

async function sendLeadEmail(data: {
  name: string;
  phone?: string;
  email?: string;
  service?: string;
  message?: string;
  source: string;
}) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const notifyTo  = process.env.LEAD_NOTIFY_EMAIL ?? "eitan@wao.co.il";

  if (!smtpHost || !smtpUser || !smtpPass) return; // silent skip if not configured

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: smtpUser, pass: smtpPass },
  });

  const serviceLabel: Record<string, string> = {
    seo: "קידום אתרים (SEO)",
    "google-ads": "פרסום בגוגל",
    consulting: "ייעוץ שיווקי",
    content: "שיווק תוכן",
    training: "הכשרות שיווק",
    other: "אחר",
  };

  const subject = `פנייה חדשה מ-WAO.co.il — ${data.name}`;
  const text = [
    `שם: ${data.name}`,
    `טלפון: ${data.phone ?? "—"}`,
    `אימייל: ${data.email ?? "—"}`,
    `שירות: ${serviceLabel[data.service ?? ""] ?? data.service ?? "—"}`,
    `מקור: ${data.source}`,
    data.message ? `\nהודעה:\n${data.message}` : "",
  ].join("\n");

  await transporter.sendMail({
    from: `"WAO אתר" <${smtpUser}>`,
    to: notifyTo,
    subject,
    text,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const leadData = {
      name: String(body.name ?? "").trim(),
      phone: String(body.phone ?? "").trim() || undefined,
      email: String(body.email ?? "").trim() || undefined,
      service: body.service || undefined,
      message: String(body.message ?? "").trim() || undefined,
      source: String(body.source ?? "contact-page").trim(),
    };

    // Fire-and-forget — don't fail the request if email fails
    sendLeadEmail(leadData).catch(() => {});

    return NextResponse.json({ ok: true }, { headers: corsHeaders(req) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500, headers: corsHeaders(req) });
  }
}

export function GET() {
  return NextResponse.json({ ok: false }, { status: 405 });
}
