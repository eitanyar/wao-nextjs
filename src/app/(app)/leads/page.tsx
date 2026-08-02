"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LeadsTable, { type Lead } from "@/components/crm/LeadsTable";

export default function LeadsDashboard() {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(d => { if (d.success) setLeads(d.leads); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div dir="rtl" style={{ paddingTop: "120px", paddingBottom: "64px", padding: "120px 20px 64px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 900, marginBottom: "8px", color: "var(--text)" }}>
            ניהול לידים <span className="text-gradient">(Mini-CRM)</span>
          </h1>
          <p style={{ color: "var(--muted)", maxWidth: "600px", lineHeight: 1.5 }}>
            כאן נכנסים כל הלידים מדף הנחיתה — גם פניות דרך הטופס וגם לחיצות על טלפון/וואטסאפ.
            סמן ליד איכותי, ועדכן הכנסה כשסוגרים עסקה — זה מאמן את גוגל לשלוח לידים טובים יותר.
          </p>
        </div>
        <Link href="/google-ads" className="btn-secondary" style={{ padding: "10px 20px", borderRadius: "8px", textDecoration: "none", whiteSpace: "nowrap" }}>
          חזרה לדאשבורד
        </Link>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[
          { icon: "📋", label: "טופס — פנייה מלאה" },
          { icon: "📞", label: "לחיצה על טלפון — ממתין לפרטים" },
          { icon: "💬", label: "לחיצה על וואטסאפ — ממתין לפרטים" },
          { icon: "✅", label: "עסקה סגורה" },
        ].map(item => (
          <div key={item.icon} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--muted)" }}>
            <span>{item.icon}</span><span>{item.label}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--muted)" }}>טוען לידים...</div>
      ) : (
        <LeadsTable leads={leads} apiBase="/api/leads" />
      )}
    </div>
  );
}
