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

const FIELDS: { key: keyof FormState; label: string; required: boolean; placeholder?: string }[] = [
  { key: "businessName", label: "שם העסק", required: true, placeholder: "רטר עורכי דין" },
  { key: "siteUrl", label: "כתובת האתר", required: true, placeholder: "https://www.example.co.il" },
  { key: "email", label: "אימייל ליצירת קשר וחשבונית", required: true, placeholder: "you@example.co.il" },
  { key: "businessNiche", label: "תחום העיסוק", required: true, placeholder: "רואה חשבון, קליניקה, עורך דין..." },
  { key: "topService", label: "השירות המרכזי (לא חובה)", required: false },
  { key: "targetLocation", label: "אזור שירות (לא חובה)", required: false },
  { key: "usp", label: "מה מייחד אתכם (לא חובה)", required: false },
  { key: "approvalContact", label: "איש הקשר לאישור תוכן", required: true, placeholder: "השם שלך" },
  { key: "approvalWhatsapp", label: "מספר וואטסאפ לאישור תוכן", required: true, placeholder: "9725XXXXXXXX" },
];

type Phase = "form" | "submitting" | "error";

export default function GeoSignupPage() {
  const router = useRouter();
  const [data, setData] = useState<FormState>(EMPTY);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);

  const missing = FIELDS.filter((f) => f.required && !data[f.key].trim());

  async function submit() {
    if (missing.length) {
      setError(`חסרים שדות חובה: ${missing.map((f) => f.label).join(", ")}`);
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
          {FIELDS.map((f) => (
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
                value={data[f.key]}
                placeholder={f.placeholder}
                dir={f.key === "siteUrl" || f.key === "email" || f.key === "approvalWhatsapp" ? "ltr" : "rtl"}
                onChange={(e) => setData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  fontFamily: "var(--font-body), sans-serif",
                }}
              />
            </div>
          ))}

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
