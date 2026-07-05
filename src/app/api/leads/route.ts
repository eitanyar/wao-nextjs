import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { sendLeadNotificationEmail } from "@/lib/mail";

async function uploadConversion(leadId: number, type: "verified-lead" | "closed-deal") {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/google-ads/import-conversion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadId, type }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`[uploadConversion] ${type} failed for lead ${leadId}:`, err);
  }
}

const leadsFilePath = path.join(process.cwd(), "src/data/leads.json");

async function readLeads() {
  try {
    const data = await fs.readFile(leadsFilePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeLeads(leads: any[]) {
  await fs.writeFile(leadsFilePath, JSON.stringify(leads, null, 2), "utf-8");
}

export async function GET() {
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
      const updatedLeads = leads.map((l: any) => l.id === id ? { ...l, quality } : l);
      await writeLeads(updatedLeads);

      // When a lead is marked GOOD → upload "ליד מאומת" offline conversion
      if (quality === "GOOD") {
        const lead = leads.find((l: any) => l.id === id);
        if (lead?.gclid || lead?.wbraid || lead?.gbraid) {
          uploadConversion(id, "verified-lead").catch(console.error);
        }
      }

      return NextResponse.json({ success: true, message: "Lead quality updated" });
    }

    if (body.action === "updateRevenue") {
      const { id, revenue } = body;
      const updatedLeads = leads.map((l: any) => l.id === id ? { ...l, revenue } : l);
      await writeLeads(updatedLeads);
      return NextResponse.json({ success: true, message: "Lead revenue updated" });
    }

    if (body.action === "enrichStub") {
      // Client fills in name + phone for a phone/WhatsApp click stub
      const { id, name, phone } = body;
      const updatedLeads = leads.map((l: any) =>
        l.id === id ? { ...l, name, phone, status: "חדש" } : l
      );
      await writeLeads(updatedLeads);
      return NextResponse.json({ success: true, message: "Stub enriched" });
    }

    if (body.action === "markClosed") {
      const { id, revenue } = body;
      const closedAt = new Date().toISOString();
      const updatedLeads = leads.map((l: any) =>
        l.id === id ? { ...l, closed: true, closedAt, revenue, quality: "GOOD" } : l
      );
      await writeLeads(updatedLeads);

      // Upload "עסקה סגורה" as a fresh offline conversion with real revenue
      const lead = leads.find((l: any) => l.id === id);
      if (lead?.gclid || lead?.wbraid || lead?.gbraid) {
        uploadConversion(id, "closed-deal").catch(console.error);
      }

      return NextResponse.json({ success: true, closedAt, message: "Lead marked closed" });
    }

    // Otherwise, create a new lead
    const isClickStub = body.type === 'click-stub';
    const newLead = {
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
