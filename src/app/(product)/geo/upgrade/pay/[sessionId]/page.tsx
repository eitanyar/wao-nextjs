"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";

// Mock-provider checkout page for the month-4 self-serve GEO Bot upgrade —
// same shape as /geo/signup/pay/[sessionId] (see that page's doc comment),
// but the client here is already authenticated, so there's no pin/clientId
// reveal on success — just a confirmation and a link back to the dashboard.
type Phase = "form" | "charging" | "done" | "error";

export default function GeoUpgradePayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setPhase("charging");
    setError(null);
    try {
      const res = await fetch("/api/geo/upgrade/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "משהו השתבש");
      setPhase("done");
    } catch (e: any) {
      setError(e.message || "משהו השתבש");
      setPhase("error");
    }
  }

  return (
    <section style={{ minHeight: "100vh", paddingTop: "120px", paddingBottom: "80px" }}>
      <div className="wao-container" style={{ maxWidth: "480px" }}>
        <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.6rem", marginBottom: "8px" }}>
          {renderMixed("תשלום — ₪299 לחודש")}
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "28px" }}>
          {renderMixed("החיוב הראשון מתבצע עכשיו. אחריו — ₪299 בכל חודש, ניתן לביטול בכל שלב.")}
        </p>

        <div style={{ border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
          {phase === "form" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <input placeholder="מספר כרטיס" defaultValue="4242 4242 4242 4242" style={inputStyle} />
                <div style={{ display: "flex", gap: "12px" }}>
                  <input placeholder="MM/YY" defaultValue="12/30" style={inputStyle} />
                  <input placeholder="CVC" defaultValue="123" style={inputStyle} />
                </div>
              </div>
              <button onClick={pay} className="btn-primary" style={{ width: "100%", padding: "14px" }}>
                {renderMixed("שלם ₪299")}
              </button>
            </>
          )}

          {phase === "charging" && (
            <p style={{ color: "var(--muted)", textAlign: "center" }}>{renderMixed("מחייב ומפעיל את השדרוג...")}</p>
          )}

          {phase === "error" && (
            <>
              <p style={{ color: "#e05555", marginBottom: "16px" }}>{renderMixed(`קרתה תקלה: ${error}`)}</p>
              <button onClick={pay} className="btn-outline" style={{ width: "100%", padding: "14px" }}>
                {renderMixed("נסה שוב")}
              </button>
            </>
          )}

          {phase === "done" && (
            <div style={{ textAlign: "center" }}>
              <p style={{ marginBottom: "8px" }}>{renderMixed("השדרוג פעיל! GEO Bot כבר התחיל לעבוד על התוכן שלך.")}</p>
              <p style={{ marginBottom: "16px", color: "var(--muted)", fontSize: "0.85rem" }}>
                {renderMixed("התוצאות הראשונות ייקחו זמן — נעדכן אותך באזור האישי ברגע שהן מוכנות.")}
              </p>
              <Link href="/client/dashboard" className="btn-primary" style={{ display: "block", padding: "14px" }}>
                {renderMixed("המשך לאזור האישי ←")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "transparent",
  color: "inherit",
  flex: 1,
};
