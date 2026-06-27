"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Lead {
  id: number;
  name: string;
  phone: string;
  date: string;
  status: string;
  quality: string;
  revenue: number;
}

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await fetch("/api/leads");
        const data = await res.json();
        if (data.success) {
          setLeads(data.leads);
        }
      } catch (err) {
        console.error("Failed to fetch leads", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLeads();
  }, []);

  const toggleQuality = async (id: number, currentQuality: string) => {
    const nextQuality = currentQuality === "PENDING" ? "GOOD" : currentQuality === "GOOD" ? "JUNK" : "PENDING";
    setLeads(leads.map(l => l.id === id ? { ...l, quality: nextQuality } : l));

    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateQuality", id, quality: nextQuality })
      });
    } catch (err) {
      console.error("Failed to sync quality update", err);
    }
  };

  const updateRevenue = async (id: number, revenue: number) => {
    setLeads(leads.map(l => l.id === id ? { ...l, revenue } : l));

    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateRevenue", id, revenue })
      });
    } catch (err) {
      console.error("Failed to sync revenue update", err);
    }
  };

  return (
    <div dir="rtl" style={{ paddingTop: "120px", paddingBottom: "64px", paddingLeft: "20px", paddingRight: "20px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.5rem)", fontWeight: 900, marginBottom: "8px", color: "var(--text)" }}>ניהול לידים <span className="text-gradient">(Mini-CRM)</span></h1>
          <p style={{ color: "var(--muted)", maxWidth: "600px" }}>
            כאן תוכל לראות את כל הלידים שנכנסו מדפי הנחיתה של הקמפיינים שלך. 
            סמן 'ליד איכותי' ודווח על הכנסות כדי שהאלגוריתם שלנו יוכל לייעל את הקמפיין עבורך בעתיד (היזון חוזר).
          </p>
        </div>
        <Link href="/google-ads" className="btn-secondary" style={{ padding: "10px 20px", borderRadius: "8px", textDecoration: "none" }}>
          חזרה לדאשבורד
        </Link>
      </div>

      <div style={{ background: "rgba(22, 25, 34, 0.75)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
          <thead style={{ background: "rgba(0,0,0,0.3)", color: "var(--muted)", fontSize: "0.9rem" }}>
            <tr>
              <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", fontWeight: "normal" }}>תאריך פנייה</th>
              <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", fontWeight: "normal" }}>שם מלא</th>
              <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", fontWeight: "normal" }}>טלפון</th>
              <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", fontWeight: "normal" }}>סטטוס</th>
              <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", fontWeight: "normal" }}>איכות הליד (היזון חוזר)</th>
              <th style={{ padding: "16px", borderBottom: "1px solid var(--border)", fontWeight: "normal" }}>הכנסה מדווחת (₪)</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "16px", fontSize: "0.9rem", color: "var(--muted)" }}>{lead.date}</td>
                <td style={{ padding: "16px", fontWeight: "bold" }}>{lead.name}</td>
                <td style={{ padding: "16px", direction: "ltr", textAlign: "right", fontFamily: "monospace", fontSize: "1.05rem", color: "var(--accent)" }}>{lead.phone}</td>
                <td style={{ padding: "16px" }}>
                  <span style={{ 
                    padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold",
                    background: lead.status === "חדש" ? "rgba(0,195,255,0.1)" : lead.status === "בטיפול" ? "rgba(255,170,0,0.1)" : "rgba(74,227,181,0.1)",
                    color: lead.status === "חדש" ? "#00C3FF" : lead.status === "בטיפול" ? "#FFAA00" : "#4AE3B5"
                  }}>
                    {lead.status}
                  </span>
                </td>
                <td style={{ padding: "16px" }}>
                  <button 
                    onClick={() => toggleQuality(lead.id, lead.quality)}
                    style={{
                      border: lead.quality === "PENDING" ? "1px dashed var(--muted)" : "1px solid transparent",
                      background: lead.quality === "GOOD" ? "rgba(74,227,181,0.15)" : lead.quality === "JUNK" ? "rgba(255,94,94,0.15)" : "transparent",
                      color: lead.quality === "GOOD" ? "#4AE3B5" : lead.quality === "JUNK" ? "#FF5E5E" : "var(--muted)",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: "bold",
                      transition: "all 0.2s"
                    }}
                  >
                    {lead.quality === "PENDING" ? "סווג איכות" : lead.quality === "GOOD" ? "🔥 ליד איכותי" : "🗑️ זבל/לא רלוונטי"}
                  </button>
                </td>
                <td style={{ padding: "16px" }}>
                  {lead.quality === "GOOD" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "var(--muted)" }}>₪</span>
                      <input 
                        type="number" 
                        value={lead.revenue || ""} 
                        onChange={(e) => updateRevenue(lead.id, parseInt(e.target.value) || 0)}
                        placeholder="0"
                        style={{ 
                          background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", color: "var(--text)", 
                          padding: "8px 12px", borderRadius: "8px", width: "120px", fontSize: "1rem" 
                        }}
                      />
                    </div>
                  ) : <span style={{ color: "var(--muted)", opacity: 0.5 }}>-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
