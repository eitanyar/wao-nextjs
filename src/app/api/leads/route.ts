import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sendLeadNotificationEmail } from "@/lib/mail";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin-auth";
import { readLeads, writeLeads, findLeadById } from "@/lib/crm/leadsStore";
import { uploadLeadConversion, type ConversionType } from "@/lib/google-ads/conversion-upload";
import type { LeadRecord } from "@/lib/crm/intelligence";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leads = await readLeads();

    // Check if it's an update request or a new lead creation
    if (body.action === "updateQuality") {
      const { id, quality } = body;
      const updatedLeads = leads.map((l) => l.id === id ? { ...l, quality } : l);
      await writeLeads(updatedLeads);

      // When a lead is marked GOOD → upload "ליד מאומת" offline conversion
      if (quality === "GOOD") {
        const lead = findLeadById(leads, id);
        if (lead?.gclid || lead?.wbraid || lead?.gbraid) {
          uploadConversion(id, "verified-lead").catch(console.error);
        }
      }

      return NextResponse.json({ success: true, message: "Lead quality updated" });
    }

    if (body.action === "updateRevenue") {
      const { id, revenue } = body;
      const updatedLeads = leads.map((l) => l.id === id ? { ...l, revenue } : l);
      await writeLeads(updatedLeads);
      return NextResponse.json({ success: true, message: "Lead revenue updated" });
    }

    if (body.action === "enrichStub") {
      // Client fills in name + phone for a phone/WhatsApp click stub
      const { id, name, phone } = body;
      const updatedLeads = leads.map((l) =>
        l.id === id ? { ...l, name, phone, status: "חדש" } : l
      );
      await writeLeads(updatedLeads);
      return NextResponse.json({ success: true, message: "Stub enriched" });
    }

    if (body.action === "markClosed") {
      const { id, revenue } = body;
      const closedAt = new Date().toISOString();
      const updatedLeads = leads.map((l) =>
        l.id === id ? { ...l, closed: true, closedAt, revenue, quality: "GOOD" } : l
      );
      await writeLeads(updatedLeads);

      // Upload "עסקה סגורה" as a fresh offline conversion with real revenue
      const lead = findLeadById(leads, id);
      if (lead?.gclid || lead?.wbraid || lead?.gbraid) {
        uploadConversion(id, "closed-deal").catch(console.error);
      }

      return NextResponse.json({ success: true, closedAt, message: "Lead marked closed" });
    }

    // Otherwise, create a new lead — upsert by orderId (idempotency key for
    // the sendBeacon/keepalive retry path in LandingPage.tsx, and for any
    // accidental double-submit): if a lead with this orderId already exists,
    // return it unchanged instead of pushing a duplicate.
    // See docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §1.1/§3.2.
    if (body.orderId) {
      const existing = leads.find((l) => l.orderId === body.orderId);
      if (existing) {
        return NextResponse.json({
          success: true,
          message: "Lead safely routed to WAO CRM",
          lead: existing,
        });
      }
    }

    const isClickStub = body.type === 'click-stub';
    const newLead: LeadRecord = {
      id: Date.now(),
      orderId: body.orderId || `wao-${Date.now()}`,
      name: body.name || null,
      phone: body.phone || null,
      date: new Date().toISOString().replace("T", " ").substring(0, 16),
      status: isClickStub ? "לחיצה" : "חדש",
      quality: "PENDING",
      revenue: 0,
      closed: false,
      closedAt: null,
      type: body.type || "form",            // "form" | "phone-click" | "whatsapp-click"
      source: body.source || "",
      slug: body.slug || "",
      customerId: body.customerId || "",     // Google Ads sub-account ID
      // Click identifiers — exactly one will be set (gclid OR wbraid OR gbraid)
      gclid:  body.gclid  || null,
      wbraid: body.wbraid || null,
      gbraid: body.gbraid || null,
      businessNiche: body.businessNiche || ""
    };

    leads.push(newLead);
    await writeLeads(leads);

    console.log("[WAO CRM] New Lead Captured & Saved:", newLead);

    // Fire and forget email notification
    sendLeadNotificationEmail(newLead);

    return NextResponse.json({
      success: true,
      message: "Lead safely routed to WAO CRM",
      lead: newLead
    });
  } catch (error: any) {
    console.error("Error processing lead:", error);
    return NextResponse.json(
      { success: false, error: "Failed to route lead" },
      { status: 500 }
    );
  }
}
