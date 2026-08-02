"use client";

import React, { useEffect, useRef, useState } from "react";

// Deliberately mirrors LeadRecord's optionality (src/lib/crm/intelligence.ts)
// rather than widening it to required fields — this component renders both
// admin (/api/leads) and client-scoped (/api/client/leads) leads, both of
// which are LeadRecord[] under the hood. Defensive fallbacks at render time
// handle the optional fields.
export interface Lead {
  id: number;
  orderId?: string;
  name?: string | null;
  phone?: string | null;
  date?: string;
  status?: string;
  quality?: string;
  revenue?: number;
  closed?: boolean;
  closedAt?: string | null;
  type?: string; // "form" | "phone-click" | "whatsapp-click"
  slug?: string;
}

interface StubDraft {
  name: string;
  phone: string;
}

interface LeadsTableProps {
  leads: Lead[];
  /** '/api/leads' (WAO-internal, full admin action set) or
   * '/api/client/leads' (session-gated, restricted action vocabulary — see
   * docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §2.3/§2.4). */
  apiBase: string;
  /** Scrolls to and visually highlights this lead's row on mount — target of
   * the `?highlight=` deep link from the "send to client" WhatsApp message. */
  highlightId?: number;
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

export default function LeadsTable({ leads: initialLeads, apiBase, highlightId }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [enrichingId, setEnrichingId] = useState<number | null>(null);
  const [stubDraft, setStubDraft]     = useState<StubDraft>({ name: "", phone: "" });
  const [closingId, setClosingId]     = useState<number | null>(null);
  const [closingRevenue, setClosingRevenue] = useState<string>("");
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null);

  // '/api/leads' (WAO-internal) accepts the full admin `action` vocabulary.
  // '/api/client/leads' is deliberately restricted (§2.3) — no `enrichStub`,
  // and grade/close use a different, flatter body shape.
  const isClientScoped = apiBase.includes("/client/leads");

  useEffect(() => {
    if (highlightId == null) return;
    highlightRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, leads]);

  async function apiPost(body: object) {
    await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const toggleQuality = async (id: number, current: string) => {
    // Admin view cycles through PENDING as a reachable state; the
    // client-scoped API only accepts quality: 'GOOD' | 'JUNK' (§2.3), so the
    // client-facing cycle never attempts to send PENDING back to the server.
    const next = isClientScoped
      ? (current === "GOOD" ? "JUNK" : "GOOD")
      : (current === "PENDING" ? "GOOD" : current === "GOOD" ? "JUNK" : "PENDING");

    setLeads(ls => ls.map(l => l.id === id ? { ...l, quality: next } : l));

    if (isClientScoped) {
      apiPost({ leadId: id, quality: next }).catch(console.error);
    } else {
      apiPost({ action: "updateQuality", id, quality: next }).catch(console.error);
    }
  };

  const enrichStub = async (id: number) => {
    if (isClientScoped) return; // not in the client-scoped action vocabulary
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

    if (isClientScoped) {
      apiPost({ leadId: id, closed: { revenue: rev } }).catch(console.error);
    } else {
      apiPost({ action: "markClosed", id, revenue: rev }).catch(console.error);
    }
  };

  const isStub = (l: Lead) => !l.name && (l.type === "phone-click" || l.type === "whatsapp-click");

  if (leads.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px", color: "var(--muted)" }}>
        <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</div>
        <div>עדיין אין לידים. כשמישהו ילחץ על המודעה הם יופיעו כאן.</div>
      </div>
    );
  }

  return (
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
            const isHighlighted = highlightId != null && lead.id === highlightId;
            const rowBg = isHighlighted
              ? "rgba(255,215,0,0.10)"
              : lead.closed
              ? "rgba(74,227,181,0.04)"
              : stub
              ? "rgba(255,170,0,0.03)"
              : "transparent";

            return (
              <tr
                key={lead.id}
                ref={isHighlighted ? highlightRowRef : undefined}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: rowBg,
                  transition: "background 0.15s",
                  outline: isHighlighted ? "2px solid #FFD700" : "none",
                  outlineOffset: isHighlighted ? "-2px" : undefined,
                }}
                onMouseEnter={e => { if (!lead.closed && !stub && !isHighlighted) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
              >
                {/* Source */}
                <td style={{ padding: "14px 16px", fontSize: "0.95rem" }}>
                  <span title={srcLabel}>{srcIcon}</span>
                </td>

                {/* Date */}
                <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {lead.closed && lead.closedAt
                    ? <><div>{(lead.date || "").slice(0, 10) || "—"}</div><div style={{ color: "#4AE3B5", fontSize: "0.75rem" }}>סגור {lead.closedAt.slice(0, 10)}</div></>
                    : (lead.date || "").slice(0, 10) || "—"
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
                  ) : stub && !isEnriching && !isClientScoped ? (
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
                      onClick={() => toggleQuality(lead.id, lead.quality || "PENDING")}
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
  );
}
