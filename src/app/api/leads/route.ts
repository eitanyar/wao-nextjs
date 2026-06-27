import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { sendLeadNotificationEmail } from "@/lib/mail";

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
      return NextResponse.json({ success: true, message: "Lead quality updated" });
    }

    if (body.action === "updateRevenue") {
      const { id, revenue } = body;
      const updatedLeads = leads.map((l: any) => l.id === id ? { ...l, revenue } : l);
      await writeLeads(updatedLeads);
      return NextResponse.json({ success: true, message: "Lead revenue updated" });
    }

    // Otherwise, create a new lead
    const newLead = {
      id: Date.now(),
      name: body.name || "אנונימי",
      phone: body.phone || "",
      date: new Date().toISOString().replace("T", " ").substring(0, 16),
      status: "חדש",
      quality: "PENDING",
      revenue: 0,
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
