import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sendLeadNotificationEmail } from "@/lib/mail";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin-auth";
import { readLeads, writeLeads, findLeadById } from "@/lib/crm/leadsStore";
import { uploadLeadConversion, type ConversionType } from "@/lib/google-ads/conversion-upload";
import { loadCampaignConfigBySlug, type LeadRecord } from "@/lib/crm/intelligence";
import { loadClient } from "@/lib/shared/clients";
import { buildReviewRequestOwnerNotification } from "@/lib/crm/reviewFlywheelCopy";
import { buildWaLink } from "@/lib/gmb/whatsapp";
import { appendReviewFlywheelQueueItem } from "@/lib/crm/reviewFlywheelStore";
import { captureLead, type LeadCapturePayload } from "@/lib/crm/lead-capture";

/**
 * In-process call to `uploadLeadConversion()` (`@/lib/google-ads/conversion-upload`).
 * Replaces the old self-`fetch()` to `/api/google-ads/import-conversion`,
 * which never forwarded the `wao-client` session cookie and therefore got a
 * silent 401 on every attempt (docs/specs/priority-3 §0/§1.2/§3.2).
 */
async function uploadConversion(leadId: number, type: ConversionType) {
  try {
    const result = await uploadLeadConversion({ leadId, type });
    if ("success" in result && result.success === false) {
      console.error(`[uploadConversion] ${type} failed for lead ${leadId}:`, result);
    }
  } catch (err) {
    console.error(`[uploadConversion] ${type} threw for lead ${leadId}:`, err);
  }
}

/**
 * Review-generation flywheel hook (handoff/completed/2026-08-22_007_*.md) — fires after a lead
 * is marked closed. Opt-in only (`client.reviewFlywheelEnabled`); every failure path skips
 * silently (warn at most) rather than throwing, so it can never block the existing markClosed
 * response or the conversion-upload logic that runs before it. No live send — this only
 * generates a wa.me link and appends it to the client's review-flywheel queue file for a future
 * dashboard surface to display (see src/lib/crm/reviewFlywheelStore.ts).
 */
export function maybeQueueReviewFlywheelRequest(lead: LeadRecord): void {
  try {
    if (!lead.slug) return;
    const campaign = loadCampaignConfigBySlug(lead.slug);
    const clientId = campaign?.clientId;
    if (!clientId) return;

    const client = loadClient(clientId);
    if (!client?.reviewFlywheelEnabled) return;

    if (!client.reviewLink) {
      console.warn(
        `[reviewFlywheel] enabled for client "${clientId}" but reviewLink is missing — skipping lead ${lead.id}`
      );
      return;
    }
    if (!client.approvalWhatsapp) {
      console.warn(
        `[reviewFlywheel] enabled for client "${clientId}" but approvalWhatsapp is missing — skipping lead ${lead.id}`
      );
      return;
    }

    const message = buildReviewRequestOwnerNotification({
      ownerName: client.approvalContact || "בעל העסק",
      businessName: client.brandName || clientId,
      customerName: lead.name || "הלקוח",
      reviewLink: client.reviewLink,
    });
    const waLink = buildWaLink(client.approvalWhatsapp, message);

    appendReviewFlywheelQueueItem({
      leadId: lead.id,
      clientId,
      waLink,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[reviewFlywheel] hook threw for lead ${lead.id}:`, err);
  }
}

/**
 * Auth: same admin-cookie convention as `/geo/dashboard`
 * (`src/lib/admin-auth.ts` — `verifyAdminToken` / `ADMIN_COOKIE_NAME`).
 * This is WAO's own internal Mini-CRM, not a client-scoped view — GET
 * returns every client's leads, so it must never be reachable without the
 * admin cookie. Route-level check is required even though `/leads` (the
 * page) is also gated via `src/proxy.ts`, because this route is directly
 * reachable via curl regardless of page-level protection. Fails closed if
 * `ADMIN_SECRET` isn't configured (same posture as `verifyAdminSecret`).
 */
async function isAdminAuthorized(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE_NAME)?.value ?? "";
  return verifyAdminToken(token);
}

export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leads = await readLeads();
    return NextResponse.json({ success: true, leads });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

const ADMIN_MUTATION_ACTIONS = new Set([
  "updateQuality",
  "updateRevenue",
  "enrichStub",
  "markClosed",
]);
const LEAD_QUALITIES = new Set(["PENDING", "GOOD", "JUNK"]);
const MAX_STUB_NAME_LENGTH = 200;
const MAX_STUB_PHONE_LENGTH = 64;

type AdminMutationAction = "updateQuality" | "updateRevenue" | "enrichStub" | "markClosed";
type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidLeadId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isValidRevenue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isAdminMutationAction(value: unknown): value is AdminMutationAction {
  return typeof value === "string" && ADMIN_MUTATION_ACTIONS.has(value);
}

function isValidMutationPayload(action: AdminMutationAction, body: JsonRecord): boolean {
  if (!isValidLeadId(body.id)) return false;

  switch (action) {
    case "updateQuality":
      return typeof body.quality === "string" && LEAD_QUALITIES.has(body.quality);
    case "updateRevenue":
    case "markClosed":
      return isValidRevenue(body.revenue);
    case "enrichStub":
      return isBoundedString(body.name, MAX_STUB_NAME_LENGTH)
        && isBoundedString(body.phone, MAX_STUB_PHONE_LENGTH);
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const bodyRecord = isJsonRecord(body) ? body : undefined;
  const hasAction = Boolean(bodyRecord && Object.prototype.hasOwnProperty.call(bodyRecord, "action"));
  let action: AdminMutationAction | undefined;
  if (hasAction && bodyRecord) {
    if (!isAdminMutationAction(bodyRecord.action)) {
      return NextResponse.json({ success: false, error: "Unsupported action" }, { status: 400 });
    }

    if (!(await isAdminAuthorized())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isValidMutationPayload(bodyRecord.action, bodyRecord)) {
      return NextResponse.json({ success: false, error: "Invalid mutation payload" }, { status: 400 });
    }

    action = bodyRecord.action;
  }

  try {
    if (action && bodyRecord) {
      const leads = await readLeads();

      if (action === "updateQuality") {
        const id = bodyRecord.id as number;
        const quality = bodyRecord.quality as string;
        const updatedLeads = leads.map((lead) => lead.id === id ? { ...lead, quality } : lead);
        await writeLeads(updatedLeads);

        if (quality === "GOOD") {
          const lead = findLeadById(leads, id);
          if (lead?.gclid || lead?.wbraid || lead?.gbraid) {
            uploadConversion(id, "verified-lead").catch(console.error);
          }
        }

        return NextResponse.json({ success: true, message: "Lead quality updated" });
      }

      if (action === "updateRevenue") {
        const id = bodyRecord.id as number;
        const revenue = bodyRecord.revenue as number;
        const updatedLeads = leads.map((lead) => lead.id === id ? { ...lead, revenue } : lead);
        await writeLeads(updatedLeads);
        return NextResponse.json({ success: true, message: "Lead revenue updated" });
      }

      if (action === "enrichStub") {
        const id = bodyRecord.id as number;
        const name = bodyRecord.name as string;
        const phone = bodyRecord.phone as string;
        const updatedLeads = leads.map((lead) =>
          lead.id === id ? { ...lead, name, phone, status: "חדש" } : lead
        );
        await writeLeads(updatedLeads);
        return NextResponse.json({ success: true, message: "Stub enriched" });
      }

      const id = bodyRecord.id as number;
      const revenue = bodyRecord.revenue as number;
      const closedAt = new Date().toISOString();
      const updatedLeads = leads.map((lead) =>
        lead.id === id ? { ...lead, closed: true, closedAt, revenue, quality: "GOOD" } : lead
      );
      await writeLeads(updatedLeads);

      const lead = findLeadById(leads, id);
      if (lead?.gclid || lead?.wbraid || lead?.gbraid) {
        uploadConversion(id, "closed-deal").catch(console.error);
      }

      if (lead) {
        maybeQueueReviewFlywheelRequest(lead);
      }

      return NextResponse.json({ success: true, closedAt, message: "Lead marked closed" });
    }

    const leadBody = body as LeadCapturePayload;
    const leads = await readLeads();

    if (leadBody.orderId) {
      const existing = leads.find((lead) => lead.orderId === leadBody.orderId);
      if (existing) {
        return NextResponse.json({
          success: true,
          message: "Lead safely routed to WAO CRM",
          lead: existing,
        });
      }
    }

    const captured = captureLead({ leads, body: leadBody });
    const newLead = captured.lead;
    leads.push(newLead);
    await writeLeads(leads);

    console.log("[WAO CRM] New Lead Captured & Saved:", newLead);
    sendLeadNotificationEmail(newLead);

    return NextResponse.json({
      success: true,
      message: "Lead safely routed to WAO CRM",
      lead: newLead,
    });
  } catch (error: unknown) {
    console.error("Error processing lead:", error);
    return NextResponse.json(
      { success: false, error: "Failed to route lead" },
      { status: 500 }
    );
  }
}
