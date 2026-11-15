import { NextRequest, NextResponse } from "next/server";
import { allowedLeadOrigin } from "@/lib/site-hosting/leadOrigins";

// CORS: https wao.co.il and its subdomains, plus every attached Site Bot owner host (data/sites ownerDomain /
// canonicalOrigin, cached 60 s). Anything else gets the fixed main-site origin, which the browser rejects.
function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowed = allowedLeadOrigin(origin);
  return {
    'Access-Control-Allow-Origin': allowed ?? 'https://wao.co.il',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}
import nodemailer from "nodemailer";
import { createLeadsStore } from "@/lib/crm/leadsStore";
import { intakeSiteLead, type ClickType, type LeadIntakeInput, type LeadIntakeResult } from "@/lib/crm/siteLeadIntake";
import { fileTenantLookup } from "@/lib/crm/siteLeadTenantLookup";

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

const CLICK_TYPES = new Set<ClickType>(['phone-click', 'whatsapp-click']);

/** Renderer tap ping: `{ type: 'click-stub', service: 'phone-click' | 'whatsapp-click' }` (renderSitePages / renderStaticHtml). */
function clickTypeOf(body: Record<string, unknown>): ClickType | null {
  if (body.type === 'click-stub' && typeof body.service === 'string' && CLICK_TYPES.has(body.service as ClickType)) {
    return body.service as ClickType;
  }
  if (typeof body.type === 'string' && CLICK_TYPES.has(body.type as ClickType)) return body.type as ClickType;
  return null;
}

/** Click-id fields are optional; a malformed one is dropped rather than failing the lead. */
function optionalField(value: unknown, maxLength: number): string | undefined {
  try {
    return leadField(value, maxLength) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Storing a slugged submission must never depend on SMTP (runbook S11). Any store failure is
 * logged and the request falls back to the email-only path.
 */
async function intake(input: LeadIntakeInput): Promise<LeadIntakeResult> {
  // Main-site forms carry no slug: no store, no lookup, no filesystem or env read at all.
  if (!input.slug) return { stored: false, created: false };
  try {
    return await intakeSiteLead(input, { store: createLeadsStore(), lookup: fileTenantLookup });
  } catch (error) {
    console.error('[api/lead] CRM store failed:', error);
    return { stored: false, created: false };
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  let leadData: Parameters<typeof sendLeadEmail>[0];
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return leadResponse(req, 400, { ok: false });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return leadResponse(req, 400, { ok: false });
  }

  // Optional and never fatal: a malformed tenant field only means the lead is not stored for a client.
  const tenantFields: Pick<LeadIntakeInput, 'slug' | 'customerId' | 'orderId' | 'gclid' | 'wbraid' | 'gbraid'> = {
    slug: optionalField(body.slug, 120),
    customerId: optionalField(body.customerId, 40),
    orderId: optionalField(body.orderId, 80),
    gclid: optionalField(body.gclid, 512),
    wbraid: optionalField(body.wbraid, 512),
    gbraid: optionalField(body.gbraid, 512),
  };

  // Tap pings (tel: / wa.me) carry no personal data, so they need no consent: stored as click
  // events for a verified tenant only, never emailed.
  const clickType = clickTypeOf(body);
  if (clickType) {
    let source: string;
    try {
      source = leadField(body.source ?? '', 120);
    } catch {
      return leadResponse(req, 400, { ok: false });
    }
    const result = await intake({ kind: 'click', clickType, source, slug: tenantFields.slug,
      customerId: tenantFields.customerId, orderId: tenantFields.orderId, origin });
    return leadResponse(req, result.stored ? 200 : 400, { ok: result.stored });
  }

  try {
    if (body.privacyAccepted !== true) {
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

  // Slugged submissions (client sites / LPs) are stored first; main-site forms have no slug and
  // keep the email-only path.
  const stored = await intake({
    kind: 'form',
    form: {
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      source: leadData.source,
      utmSource: leadData.utmSource,
      utmMedium: leadData.utmMedium,
      utmCampaign: leadData.utmCampaign,
    },
    ...tenantFields,
    origin,
  });

  // A repeat of an already stored lead is acknowledged without a second email.
  if (stored.stored && !stored.created) return leadResponse(req, 200, { ok: true });

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const notifyTo = process.env.LEAD_NOTIFY_EMAIL;
  if (!smtpHost?.trim() || !smtpUser?.trim() || !smtpPass?.trim() || !validRecipient(notifyTo)) {
    if (stored.stored) console.warn('[api/lead] SMTP not configured; lead stored in CRM only');
    return leadResponse(req, stored.stored ? 200 : 503, { ok: stored.stored });
  }

  let accepted = false;
  try {
    accepted = await sendLeadEmail(leadData, smtpHost, smtpUser, smtpPass, notifyTo);
  } catch (error) {
    if (stored.stored) console.warn('[api/lead] notification email failed; lead stored in CRM:', error);
  }
  const ok = stored.stored || accepted;
  return leadResponse(req, ok ? 200 : 503, { ok });
}

export function GET() {
  return NextResponse.json({ ok: false }, { status: 405 });
}
