"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";

// Self-serve GEO Bot signup — plain form (not a scripted chat like Site
// Bot's /site-bot/start). GEO Bot's field set maps 1:1 onto
// GeoClientRecord (src/lib/geo/client.ts) and is functional/utilitarian
// like /client/login and /geo/login, not persuasive marketing copy — kept
// deliberately plain rather than freelancing a Tamar-style script here.
//
// Flow: this page -> POST /api/geo/signup/init -> /geo/signup/pay/[sessionId]
// (mock ₪199/mo charge) -> /geo/signup/connect-gsc (self-serve GSC OAuth).

interface FormState {
  businessName: string;
  siteUrl: string;
  email: string;
  businessNiche: string;
  topService: string;
  targetLocation: string;
  usp: string;
  approvalContact: string;
  approvalWhatsapp: string;
}

const EMPTY: FormState = {
  businessName: "",
  siteUrl: "",
  email: "",
  businessNiche: "",
  topService: "",
  targetLocation: "",
  usp: "",
  approvalContact: "",
  approvalWhatsapp: "",
};

type InputKind = "text" | "url" | "email" | "tel";

const FIELDS: { key: keyof FormState; label: string; required: boolean; placeholder?: string; kind: InputKind }[] = [
  { key: "businessName", label: "שם העסק", required: true, placeholder: "רטר עורכי דין", kind: "text" },
  { key: "siteUrl", label: "כתובת האתר", required: true, placeholder: "https://www.example.co.il", kind: "url" },
  { key: "email", label: "אימייל ליצירת קשר וחשבונית", required: true, placeholder: "you@example.co.il", kind: "email" },
  { key: "businessNiche", label: "תחום העיסוק", required: true, placeholder: "רואה חשבון, קליניקה, עורך דין...", kind: "text" },
  { key: "topService", label: "השירות המרכזי (לא חובה)", required: false, kind: "text" },
  { key: "targetLocation", label: "אזור שירות (לא חובה)", required: false, kind: "text" },
  { key: "usp", label: "מה מייחד אתכם (לא חובה)", required: false, kind: "text" },
  { key: "approvalContact", label: "איש הקשר לאישור תוכן", required: true, placeholder: "השם שלך", kind: "text" },
  { key: "approvalWhatsapp", label: "מספר וואטסאפ לאישור תוכן", required: true, placeholder: "9725XXXXXXXX", kind: "tel" },
];

// Maps our semantic input "kind" to the actual <input type> + inputMode pair
// that gets mobile keyboards right (email keyboard w/ @, numeric-leaning tel
// pad, URL keyboard w/ / and .com key) without changing validation behavior.
const INPUT_ATTRS: Record<InputKind, { type: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }> = {
  text: { type: "text" },
  url: { type: "url", inputMode: "url" },
  email: { type: "email", inputMode: "email" },
  tel: { type: "tel", inputMode: "tel" },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts "9725XXXXXXXX" (E.164-ish w/o +) or common Israeli local formats — approval
// WhatsApp numbers get normalized server-side; this is just a format sanity check.
const PHONE_RE = /^[0-9+\-\s]{9,15}$/;

function validateField(field: (typeof FIELDS)[number], value: string): string | null {
  const trimmed = value.trim();
  if (field.required && !trimmed) return "שדה חובה";
  if (!trimmed) return null; // optional + empty — no format check needed
  if (field.kind === "email" && !EMAIL_RE.test(trimmed)) return "כתובת אימייל לא תקינה";
  if (field.kind === "url" && !/^https?:\/\/.+\..+/i.test(trimmed)) return "כתובת אתר לא תקינה (צריך להתחיל ב-https://)";
  if (field.kind === "tel" && !PHONE_RE.test(trimmed)) return "מספר טלפון לא תקין";
  return null;
}

type Phase = "form" | "submitting" | "error";

export default function GeoSignupPage() {
  const router = useRouter();
  const [data, setData] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);

  const fieldErrors = Object.fromEntries(
    FIELDS.map((f) => [f.key, validateField(f, data[f.key])])
  ) as Record<keyof FormState, string | null>;
  const missing = FIELDS.filter((f) => fieldErrors[f.key]);

  async function submit() {
    if (missing.length) {
      // Surface every field's error at once (not just required-but-empty) and
      // mark them touched so the inline messages render even for fields the
      // user never blurred.
      setTouched(Object.fromEntries(FIELDS.map((f) => [f.key, true])) as Record<keyof FormState, boolean>);
      setError(`יש לתקן ${missing.length} שדות לפני המשך`);
      return;
    }
    setPhase("submitting");
    setError(null);
    try {
      const res = await fetch("/api/geo/signup/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.sessionId) throw new Error(json.error || "יצירת ההרשמה נכשלה");
      router.push(`/geo/signup/pay/${json.sessionId}`);
    } catch (e: any) {
      setError(e.message || "משהו השתבש");
      setPhase("form");
    }
  }

  return (
    <section className="wao-section">
      <div className="wao-container" style={{ maxWidth: "560px" }}>
        <h1
          style={{
            fontFamily: "var(--font-rubik), sans-serif",
            fontWeight: 900,
            fontSize: "clamp(1.4rem,3vw,2rem)",
            marginBottom: "8px",
            color: "var(--text)",
          }}
        >
          {renderMixed("הרשמה ל-GEO Bot")}
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "28px", fontFamily: "var(--font-body), sans-serif" }}>
          {renderMixed("₪199 לחודש. אחרי התשלום תוכל לחבר את Search Console שלך בעצמך.")}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {FIELDS.map((f) => {
            const attrs = INPUT_ATTRS[f.kind];
            const showError = touched[f.key] && fieldErrors[f.key];
            return (
              <div key={f.key}>
                <label
                  htmlFor={f.key}
                  style={{ display: "block", fontSize: "0.85rem", marginBottom: "6px", color: "var(--text)" }}
                >
                  {f.label}
                  {f.required && <span style={{ color: "var(--accent)" }}> *</span>}
                </label>
                <input
                  id={f.key}
                  type={attrs.type}
                  inputMode={attrs.inputMode}
                  value={data[f.key]}
                  placeholder={f.placeholder}
                  dir={f.key === "siteUrl" || f.key === "email" || f.key === "approvalWhatsapp" ? "ltr" : "rtl"}
                  aria-invalid={!!showError}
                  aria-describedby={showError ? `${f.key}-error` : undefined}
                  onChange={(e) => setData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  onBlur={() => setTouched((prev) => ({ ...prev, [f.key]: true }))}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: `1px solid ${showError ? "#e05555" : "var(--border)"}`,
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontFamily: "var(--font-body), sans-serif",
                  }}
                />
                {showError && (
                  <p
                    id={`${f.key}-error`}
                    role="alert"
                    style={{ marginTop: "5px", fontSize: "0.78rem", color: "#e05555", fontFamily: "var(--font-body), sans-serif" }}
                  >
                    {renderMixed(fieldErrors[f.key]!)}
                  </p>
                )}
              </div>
            );
          })}

          {error && (
            <p style={{ color: "#e05555", fontSize: "0.9rem", fontFamily: "var(--font-body), sans-serif" }}>
              {renderMixed(error)}
            </p>
          )}

          <button
            onClick={submit}
            disabled={phase === "submitting"}
            className="btn-primary"
            style={{ padding: "14px", width: "100%" }}
          >
            {phase === "submitting" ? renderMixed("מעביר אותך לתשלום...") : renderMixed("המשך לתשלום — ₪199")}
          </button>
        </div>

        <p style={{ marginTop: "24px", fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
          <Link href="/geo" style={{ color: "var(--accent)" }}>
            חזרה לעמוד GEO Bot
          </Link>
        </p>
      </div>
    </section>
  );
}
