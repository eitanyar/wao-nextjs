"use client";
import { useState } from "react";
import Link from "next/link";

const SERVICES = [
  { value: "seo", label: "קידום אתרים (SEO)" },
  { value: "google-ads", label: "פרסום בגוגל (Google Ads)" },
  { value: "consulting", label: "ייעוץ שיווקי" },
  { value: "content", label: "שיווק תוכן" },
  { value: "training", label: "הכשרות שיווק" },
  { value: "other", label: "אחר / לא בטוח עדיין" },
];

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

export default function ContactForm({ source = "contact-page" }: { source?: string }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    message: "",
  });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !privacyAccepted) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source }),
      });
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
          <a
            href="tel:0526148860"
            style={{ color: "var(--accent)", fontWeight: 600 }}
            dir="ltr"
          >
            052-614-8860
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Name + Phone */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="form-2col">
        <div>
          <label htmlFor="cf-name" style={labelStyle}>
            שם מלא <span style={{ color: "var(--accent)" }}>*</span>
          </label>
          <input
            id="cf-name"
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
          <label htmlFor="cf-phone" style={labelStyle}>
            טלפון <span style={{ color: "var(--accent)" }}>*</span>
          </label>
          <input
            id="cf-phone"
            type="tel"
            required
            placeholder="052-000-0000"
            value={form.phone}
            onChange={set("phone")}
            style={{ ...inputStyle, direction: "ltr" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent-border)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="cf-email" style={labelStyle}>
          אימייל (אופציונלי)
        </label>
        <input
          id="cf-email"
          type="email"
          placeholder="israel@example.com"
          value={form.email}
          onChange={set("email")}
          style={{ ...inputStyle, direction: "ltr" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent-border)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />
      </div>

      {/* Service */}
      <div>
        <label htmlFor="cf-service" style={labelStyle}>
          במה אפשר לעזור?
        </label>
        <select
          id="cf-service"
          value={form.service}
          onChange={set("service")}
          style={{
            ...inputStyle,
            cursor: "pointer",
            appearance: "none",
            WebkitAppearance: "none",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%236B7080' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "left 14px center",
            paddingLeft: "40px",
          }}
        >
          <option value="">בחר שירות...</option>
          {SERVICES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="cf-message" style={labelStyle}>
          ספר לנו קצת על העסק (אופציונלי)
        </label>
        <textarea
          id="cf-message"
          rows={4}
          placeholder="מה אתה מוכר, מה האתגר הכי גדול שלך כרגע, מה ניסית עד עכשיו..."
          value={form.message}
          onChange={set("message")}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent-border)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />
      </div>

      {/* Privacy consent — mandatory per Israeli Privacy Protection Law */}
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <input
          id="cf-privacy"
          type="checkbox"
          required
          checked={privacyAccepted}
          onChange={(e) => setPrivacyAccepted(e.target.checked)}
          style={{ marginTop: "3px", accentColor: "var(--accent)", flexShrink: 0, width: "16px", height: "16px", cursor: "pointer" }}
        />
        <label htmlFor="cf-privacy" style={{ ...labelStyle, marginBottom: 0, fontWeight: 400, cursor: "pointer", lineHeight: 1.6 }}>
          קראתי ומסכים/ת ל
          <Link href="/privacy" style={{ color: "var(--accent)", fontWeight: 600 }}>מדיניות הפרטיות</Link>
          {" "}של WAO. ידוע לי שהפרטים ישמשו ליצירת קשר בלבד ולא יועברו לצד שלישי.{" "}
          <span style={{ color: "var(--accent)" }}>*</span>
        </label>
      </div>

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
        disabled={status === "loading" || !form.name.trim() || !form.phone.trim() || !privacyAccepted}
        className="btn-primary"
        style={{
          justifyContent: "center",
          fontSize: "1rem",
          padding: "16px 32px",
          opacity: status === "loading" ? 0.7 : 1,
          cursor: status === "loading" ? "wait" : "pointer",
        }}
      >
        {status === "loading" ? "שולח..." : "שלח פנייה — ייעוץ ראשון חינם"}
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
