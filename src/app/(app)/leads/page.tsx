"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Lead {
  id: number;
  orderId?: string;
  name: string | null;
  phone: string | null;
  date: string;
  status: string;
  quality: string;
  revenue: number;
  closed: boolean;
  closedAt: string | null;
  type?: string; // "form" | "phone-click" | "whatsapp-click"
  slug?: string;
}

interface StubDraft {
  name: string;
  phone: string;
}

const SOURCE_ICON: Record<string, string> = {
  "phone-click":    "📞",
  "whatsapp-click": "💬",
  "form":           "📋",
};

const SOURCE_LABEL: Record<string, string> = {
  "phone-click":    "לחיצה על טלפון",
  "whatsapp-click": "לחיצה על וואטסאפ",
  "form":           "טופס",
};

export default function LeadsDashboard() {
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrichingId, setEnrichingId] = useState<number | null>(null);
  const [stubDraft, setStubDraft]     = useState<StubDraft>({ name: "", phone: "" });
  const [closingId, setClosingId]     = useState<number | null>(null);
  const [closingRevenue, setClosingRevenue] = useState<string>("");

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(d => { if (d.success) setLeads(d.leads); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  async function apiPost(body: object) {
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const toggleQuality = async (id: number, current: string) => {
    const next = current === "PENDING" ? "GOOD" : current === "GOOD" ? "JUNK" : "PENDING";
    setLeads(ls => ls.map(l => l.id === id ? { ...l, quality: next } : l));
    apiPost({ action: "updateQuality", id, quality: next }).catch(console.error);
  };

  const enrichStub = async (id: number) => {
    if (!stubDraft.name.trim() && !stubDraft.phone.trim()) return;
    setLeads(ls => ls.map(l =>
      l.id === id ? { ...l, name: stubDraft.name, phone: stubDraft.phone, status: "חדש" } : l
    ));
    setEnrichingId(null);
    setStubDraft({ name: "", phone: "" });
    apiPost({ action: "enrichStub", id, name: stubDraft.name, phone: stubDraft.phone }).catch(console.error);
  };

  const markClosed = async (id: number) => {
    const rev = parseInt(closingRevenue) || 0;
    const closedAt = new Date().toISOString();
    setLeads(ls => ls.map(l =>
      l.id === id ? { ...l, closed: true, closedAt, revenue: rev, quality: "GOOD" } : l
    ));
    setClosingId(null);
    setClosingRevenue("");
    apiPost({ action: "markClosed", id, revenue: rev }).catch(console.error);
  };

  const isStub = (l: Lead) => !l.name && (l.type === "phone-click" || l.type === "whatsapp-click");

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
      ) : leads.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</div>
          <div>עדיין אין לידים. כשמישהו ילחץ על המודעה הם יופיעו כאן.</div>
        </div>
      ) : (
        <div style={{ background: "rgba(22, 25, 34, 0.75)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
            <thead style={{ background: "rgba(0,0,0,0.3)", color: "var(--muted)", fontSize: "0.85rem" }}>
              <tr>
                <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontWeight: "normal" }}>מקור</th>
                <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontWeight: "normal" }}>תאריך</th>
                <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontWeight: "normal" }}>שם</th>
                <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontWeight: "normal" }}>טלפון</th>
                <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontWeight: "normal" }}>איכות</th>
                <th style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontWeight: "normal" }}>עסקה</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => {
                const stub       = isStub(lead);
                const srcIcon    = SOURCE_ICON[lead.type || "form"] ?? "📋";
                const srcLabel   = SOURCE_LABEL[lead.type || "form"] ?? "טופס";
                const isEnriching = enrichingId === lead.id;
                const isClosing   = closingId === lead.id;
                const rowBg = lead.closed
                  ? "rgba(74,227,181,0.04)"
                  : stub
                  ? "rgba(255,170,0,0.03)"
                  : "transparent";

                return (
                  <tr
                    key={lead.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: rowBg, transition: "background 0.15s" }}
                    onMouseEnter={e => { if (!lead.closed && !stub) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
                  >
                    {/* Source */}
                    <td style={{ padding: "14px 16px", fontSize: "0.95rem" }}>
                      <span title={srcLabel}>{srcIcon}</span>
                    </td>

                    {/* Date */}
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {lead.closed && lead.closedAt
                        ? <><div>{lead.date.slice(0, 10)}</div><div style={{ color: "#4AE3B5", fontSize: "0.75rem" }}>סגור {lead.closedAt.slice(0, 10)}</div></>
                        : lead.date.slice(0, 10)
                      }
                    </td>

                    {/* Name */}
                    <td style={{ padding: "14px 16px", fontWeight: stub ? "normal" : "bold", color: stub ? "var(--muted)" : "var(--text)" }}>
                      {isEnriching ? (
                        <input
                          autoFocus
                          value={stubDraft.name}
                          onChange={e => setStubDraft(d => ({ ...d, name: e.target.value }))}
                          placeholder="שם מלא"
                          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text)", padding: "6px 10px", borderRadius: "6px", width: "130px", fontSize: "0.9rem" }}
                        />
                      ) : stub ? (
                        <span style={{ fontStyle: "italic" }}>{srcLabel}</span>
                      ) : (
                        lead.name || "—"
                      )}
                    </td>

                    {/* Phone */}
                    <td style={{ padding: "14px 16px", direction: "ltr", textAlign: "right", fontFamily: "monospace", color: stub ? "var(--muted)" : "var(--accent)" }}>
                      {isEnriching ? (
                        <input
                          value={stubDraft.phone}
                          onChange={e => setStubDraft(d => ({ ...d, phone: e.target.value }))}
                          placeholder="050-0000000"
                          dir="ltr"
                          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text)", padding: "6px 10px", borderRadius: "6px", width: "130px", fontSize: "0.9rem" }}
                        />
                      ) : (
                        lead.phone || "—"
                      )}
                    </td>

                    {/* Quality */}
                    <td style={{ padding: "14px 16px" }}>
                      {lead.closed ? (
                        <span style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "bold", background: "rgba(74,227,181,0.15)", color: "#4AE3B5" }}>
                          ✅ עסקה סגורה
                        </span>
                      ) : stub && !isEnriching ? (
                        <button
                          onClick={() => { setEnrichingId(lead.id); setStubDraft({ name: "", phone: "" }); }}
                          style={{ background: "rgba(255,170,0,0.12)", border: "1px solid rgba(255,170,0,0.3)", color: "#FFAA00", padding: "7px 14px", borderRadius: "20px", cursor: "pointer", fontSize: "0.82rem", fontWeight: "bold" }}
                        >
                          ✏️ הוסף פרטים
                        </button>
                      ) : isEnriching ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => enrichStub(lead.id)}
                            style={{ background: "rgba(74,227,181,0.15)", border: "1px solid rgba(74,227,181,0.3)", color: "#4AE3B5", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: "bold" }}
                          >
                            שמור
                          </button>
                          <button
                            onClick={() => setEnrichingId(null)}
                            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: "7px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem" }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleQuality(lead.id, lead.quality)}
                          style={{
                            border: lead.quality === "PENDING" ? "1px dashed var(--muted)" : "1px solid transparent",
                            background: lead.quality === "GOOD" ? "rgba(74,227,181,0.15)" : lead.quality === "JUNK" ? "rgba(255,94,94,0.15)" : "transparent",
                            color: lead.quality === "GOOD" ? "#4AE3B5" : lead.quality === "JUNK" ? "#FF5E5E" : "var(--muted)",
                            padding: "7px 14px", borderRadius: "20px", cursor: "pointer", fontSize: "0.82rem", fontWeight: "bold", transition: "all 0.2s"
                          }}
                        >
                          {lead.quality === "PENDING" ? "סווג" : lead.quality === "GOOD" ? "🔥 איכותי" : "🗑️ זבל"}
                        </button>
                      )}
                    </td>

                    {/* Deal / Revenue */}
                    <td style={{ padding: "14px 16px" }}>
                      {lead.closed ? (
                        <span style={{ color: "#4AE3B5", fontWeight: "bold", fontFamily: "monospace" }}>
                          ₪{lead.revenue?.toLocaleString()}
                        </span>
                      ) : lead.quality === "GOOD" && !isClosing ? (
                        <button
                          onClick={() => { setClosingId(lead.id); setClosingRevenue(lead.revenue ? String(lead.revenue) : ""); }}
                          style={{ background: "rgba(74,227,181,0.1)", border: "1px solid rgba(74,227,181,0.25)", color: "#4AE3B5", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: "bold" }}
                        >
                          💰 סגור עסקה
                        </button>
                      ) : isClosing ? (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>₪</span>
                          <input
                            autoFocus
                            type="number"
                            value={closingRevenue}
                            onChange={e => setClosingRevenue(e.target.value)}
                            placeholder="סכום"
                            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text)", padding: "6px 10px", borderRadius: "6px", width: "90px", fontSize: "0.9rem" }}
                            onKeyDown={e => { if (e.key === "Enter") markClosed(lead.id); if (e.key === "Escape") setClosingId(null); }}
                          />
                          <button
                            onClick={() => markClosed(lead.id)}
                            style={{ background: "rgba(74,227,181,0.15)", border: "1px solid rgba(74,227,181,0.3)", color: "#4AE3B5", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", fontWeight: "bold" }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setClosingId(null)}
                            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: "6px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem" }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "var(--muted)", opacity: 0.4, fontSize: "0.85rem" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
