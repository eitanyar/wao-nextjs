"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { renderMixed } from "@/lib/bidi";

// Mock-provider checkout page for GEO Bot — same shape as
// /site-bot/pay/[sessionId] (see that page's doc comment): the real
// Takbull integration will redirect here from a hosted tokenization page
// instead, but this page's job (call the callback route with the
// sessionId once the user confirms) doesn't change when that swap happens.
type Phase = "form" | "charging" | "done" | "error";

export default function GeoSignupPayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);

  async function pay() {
    setPhase("charging");
    setError(null);
    try {
      const res = await fetch("/api/geo/signup/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const json = await res.json();
      if (!res.ok || !json.clientId) throw new Error(json.error || "משהו השתבש");
      setClientId(json.clientId);
      setPin(json.pin);
      setPhase("done");
    } catch (e: any) {
      setError(e.message || "משהו השתבש");
      setPhase("error");
    }
  }

  function goToGscConnect() {
    if (clientId) router.push(`/geo/signup/connect-gsc?clientId=${clientId}`);
  }

  return (
    <section style={{ minHeight: "100vh", paddingTop: "120px", paddingBottom: "80px" }}>
      <div className="wao-container" style={{ maxWidth: "480px" }}>
        <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.6rem", marginBottom: "8px" }}>
          {renderMixed("תשלום — ₪199 לחודש")}
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "28px" }}>
          {renderMixed("החיוב הראשון נטען עכשיו. אחריו — ₪199 בכל חודש, ניתן לביטול בכל שלב.")}
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
                {renderMixed("שלם ₪199")}
              </button>
            </>
          )}

          {phase === "charging" && (
            <p style={{ color: "var(--muted)", textAlign: "center" }}>{renderMixed("מחייב ופותח את החשבון שלך...")}</p>
          )}

          {phase === "error" && (
            <>
              <p style={{ color: "#e05555", marginBottom: "16px" }}>{renderMixed(`קרתה תקלה: ${error}`)}</p>
              <button onClick={pay} className="btn-outline" style={{ width: "100%", padding: "14px" }}>
                נסה שוב
              </button>
            </>
          )}

          {phase === "done" && clientId && (
            <div style={{ textAlign: "center" }}>
              <p style={{ marginBottom: "8px" }}>{renderMixed("החשבון שלך פעיל!")}</p>
              <p style={{ marginBottom: "16px", color: "var(--muted)", fontSize: "0.9rem" }}>
                {renderMixed(`מזהה לקוח: ${clientId} · קוד גישה: ${pin}`)}
              </p>
              <p style={{ marginBottom: "16px", color: "var(--muted)", fontSize: "0.85rem" }}>
                {renderMixed("שמור את הפרטים האלה — הם ישמשו אותך לכניסה לאזור האישי בעתיד.")}
              </p>
              <button onClick={goToGscConnect} className="btn-primary" style={{ width: "100%", padding: "14px" }}>
                {renderMixed("המשך לחיבור Search Console")}
              </button>
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
