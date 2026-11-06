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

const privateHeaders = { 'Cache-Control': 'private, no-store' };

function leadResponse(req: NextRequest, status: number, body: { ok: boolean }) {
  return NextResponse.json(body, { status, headers: { ...corsHeaders(req), ...privateHeaders } });
}

function leadField(value: unknown, maxLength: number, required = false, multiline = false): string {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.length > maxLength
    || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)
    || (!multiline && /[\r\n]/.test(value))) {
    throw new Error('invalid lead field');
  }
  const trimmed = value.trim();
  if (required && !trimmed) throw new Error('missing lead field');
  return trimmed;
}

function validRecipient(value: string | undefined): value is string {
  return !!value && value.length <= 254 && /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/.test(value);
}

async function sendLeadEmail(data: {
  name: string;
  phone?: string;
  email?: string;
  service?: string;
  message?: string;
  source: string;
  ref?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}, smtpHost: string, smtpUser: string, smtpPass: string, notifyTo: string): Promise<boolean> {
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

  const hasUtm = data.utmSource || data.utmMedium || data.utmCampaign;

  const subject = `פנייה חדשה מ-WAO.co.il — ${data.name}`;
  const text = [
    `שם: ${data.name}`,
    `טלפון: ${data.phone ?? "—"}`,
    `אימייל: ${data.email ?? "—"}`,
    `שירות: ${serviceLabel[data.service ?? ""] ?? data.service ?? "—"}`,
    `מקור: ${data.source}`,
    data.ref ? `ref: ${data.ref}` : "",
    hasUtm
      ? `קמפיין: utm_source=${data.utmSource ?? "—"} | utm_medium=${data.utmMedium ?? "—"} | utm_campaign=${data.utmCampaign ?? "—"}`
      : "",
    data.message ? `\nהודעה:\n${data.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await transporter.sendMail({
    from: `"WAO אתר" <${smtpUser}>`,
    to: notifyTo,
    subject,
    text,
  });
  return Array.isArray(result.accepted) && result.accepted.includes(notifyTo)
    && !result.rejected?.includes(notifyTo);
}

export async function POST(req: NextRequest) {
  let leadData: Parameters<typeof sendLeadEmail>[0];
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || body.privacyAccepted !== true) {
      return leadResponse(req, 400, { ok: false });
    }
    leadData = {
      name: leadField(body.name, 120, true),
      phone: leadField(body.phone, 40) || undefined,
      email: leadField(body.email, 254) || undefined,
      service: leadField(body.service, 60) || undefined,
      message: leadField(body.message, 4000, false, true) || undefined,
      source: leadField(body.source ?? 'contact-page', 120, true),
      ref: leadField(body.ref, 200) || undefined,
      utmSource: leadField(body.utm_source, 200) || undefined,
      utmMedium: leadField(body.utm_medium, 200) || undefined,
      utmCampaign: leadField(body.utm_campaign, 200) || undefined,
    };
    if (!leadData.phone && !validRecipient(leadData.email)) {
      return leadResponse(req, 400, { ok: false });
    }
  } catch {
    return leadResponse(req, 400, { ok: false });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const notifyTo = process.env.LEAD_NOTIFY_EMAIL;
  if (!smtpHost?.trim() || !smtpUser?.trim() || !smtpPass?.trim() || !validRecipient(notifyTo)) {
    return leadResponse(req, 503, { ok: false });
  }

  try {
    const accepted = await sendLeadEmail(leadData, smtpHost, smtpUser, smtpPass, notifyTo);
    return leadResponse(req, accepted ? 200 : 503, { ok: accepted });
  } catch {
    return leadResponse(req, 503, { ok: false });
  }
}

export function GET() {
  return NextResponse.json({ ok: false }, { status: 405 });
}
