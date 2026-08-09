"use client";
import { useState } from "react";
import PrivacyConsent from "./PrivacyConsent";
import PhoneReveal from "./PhoneReveal";
import { useLeadTracking } from "@/lib/useLeadTracking";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "var(--radius-sm)",
  background: "var(--elevated)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "0.97rem",
  outline: "none",
  transition: "border-color 0.18s ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.83rem",
  fontWeight: 600,
  color: "var(--muted)",
  fontFamily: "var(--font-body), sans-serif",
  marginBottom: "6px",
};

/**
 * Lightweight, low-friction lead form for cold traffic (e.g. paid Meta
 * campaigns) — 2 fields + a qualifying checkbox, vs. ContactForm's 5-field
 * warm-traffic version. Shares the consent checkbox and UTM/ref tracking
 * logic with ContactForm; do not hand-copy the consent markup.
 */
export default function LeadFormLight({ source = "geo-audit-light" }: { source?: string }) {
  const [form, setForm] = useState({ name: "", contact: "" });
  const [qualified, setQualified] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const tracking = useLeadTracking();

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim() || !privacyAccepted) return;
    setStatus("loading");

    const isEmail = form.contact.includes("@");

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: isEmail ? undefined : form.contact,
          email: isEmail ? form.contact : undefined,
          message: `יש אתר עם 30+ עמודים ו-Google Search Console: ${qualified ? "כן" : "לא / לא בטוח"}`,
          source,
          ref: tracking.ref ?? undefined,
          utm_source: tracking.utm_source ?? undefined,
          utm_medium: tracking.utm_medium ?? undefined,
          utm_campaign: tracking.utm_campaign ?? undefined,
        }),
      });
      if (res.ok) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "lead_submit", source, ref: tracking.ref ?? undefined });
      }
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div
        style={{
          background: "var(--accent-dim)",
          border: "1px solid var(--accent-border)",
          borderRadius: "var(--radius-md)",
          padding: "48px 40px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>✅</div>
        <h3
          style={{
            fontFamily: "var(--font-rubik), sans-serif",
            fontWeight: 800,
            fontSize: "1.4rem",
            marginBottom: "10px",
          }}
        >
          הפנייה התקבלה — תודה!
        </h3>
        <p
          style={{
            color: "var(--muted)",
            fontFamily: "var(--font-body), sans-serif",
            lineHeight: 1.75,
            fontSize: "0.97rem",
          }}
        >
          נחזור אליך תוך 24 שעות (בימי עסקים).
          <br />
          אפשר גם להתקשר עכשיו לאיתן:{" "}
          <PhoneReveal
            source={`${source}-success`}
            style={{ color: "var(--accent)", fontWeight: 600, background: "none", border: "none", padding: 0 }}
          />
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <label htmlFor="lfl-name" style={labelStyle}>
          שם מלא <span style={{ color: "var(--accent)" }}>*</span>
        </label>
        <input
          id="lfl-name"
          type="text"
          required
          placeholder="ישראל ישראלי"
          value={form.name}
          onChange={set("name")}
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent-border)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />
      </div>

      <div>
        <label htmlFor="lfl-contact" style={labelStyle}>
          טלפון או אימייל <span style={{ color: "var(--accent)" }}>*</span>
        </label>
        <input
          id="lfl-contact"
          type="text"
          required
          placeholder="052-000-0000 או israel@example.com"
          value={form.contact}
          onChange={set("contact")}
          style={{ ...inputStyle, direction: "ltr" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent-border)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <input
          id="lfl-qualified"
          type="checkbox"
          checked={qualified}
          onChange={(e) => setQualified(e.target.checked)}
          style={{ marginTop: "3px", accentColor: "var(--accent)", flexShrink: 0, width: "16px", height: "16px", cursor: "pointer" }}
        />
        <label htmlFor="lfl-qualified" style={{ ...labelStyle, marginBottom: 0, fontWeight: 400, cursor: "pointer", lineHeight: 1.6 }}>
          יש לך אתר עם 30+ עמודים ו-Google Search Console?
        </label>
      </div>

      {/* Privacy consent — mandatory per Israeli Privacy Protection Law */}
      <PrivacyConsent id="lfl-privacy" checked={privacyAccepted} onChange={setPrivacyAccepted} />

      {status === "error" && (
        <p
          style={{
            fontSize: "0.85rem",
            color: "#f87171",
            fontFamily: "var(--font-body), sans-serif",
          }}
        >
          משהו השתבש — אפשר לנסות שוב או להתקשר ישירות ל-052-614-8860.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading" || !form.name.trim() || !form.contact.trim() || !privacyAccepted}
        className="btn-primary"
        style={{
          justifyContent: "center",
          fontSize: "1rem",
          padding: "16px 32px",
          opacity: status === "loading" ? 0.7 : 1,
          cursor: status === "loading" ? "wait" : "pointer",
        }}
      >
        {status === "loading" ? "שולח..." : "תשאיר פרטים ותקבל את 3 ההזדמנויות שלך"}
      </button>

      <p
        style={{
          fontSize: "0.78rem",
          color: "var(--muted)",
          fontFamily: "var(--font-body), sans-serif",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        ✓ ללא חוזה ✓ ייעוץ ראשון חינם ✓ מענה תוך 24 שעות
      </p>
    </form>
  );
}
