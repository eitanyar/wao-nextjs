"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { renderMixed } from "@/lib/bidi";

// Mock-provider checkout page. The real Takbull integration will redirect
// here from a hosted tokenization page instead — this page's job (call
// /api/site-bot/checkout/callback with the sessionId once the user
// confirms) doesn't change when that swap happens.
type Phase = "form" | "charging" | "done" | "error";

export default function SiteBotPayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);

  async function pay() {
    setPhase("charging");
    setError(null);
    try {
      const res = await fetch("/api/site-bot/checkout/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "משהו השתבש");
      setLiveUrl(json.url);
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
          {renderMixed("תשלום — ₪9.90")}
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "28px" }}>
          חיוב חד-פעמי. ברגע שהתשלום עובר, הבוט בונה ומעלה את האתר שלך.
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
                {renderMixed("שלם ₪9.90")}
              </button>
            </>
          )}

          {phase === "charging" && (
            <p style={{ color: "var(--muted)", textAlign: "center" }}>{renderMixed("מחייב ובונה את האתר...")}</p>
          )}

          {phase === "error" && (
            <>
              <p style={{ color: "#e05555", marginBottom: "16px" }}>{renderMixed(`קרתה תקלה: ${error}`)}</p>
              <button onClick={pay} className="btn-outline" style={{ width: "100%", padding: "14px" }}>
                נסה שוב
              </button>
            </>
          )}

          {phase === "done" && liveUrl && (
            <div style={{ textAlign: "center" }}>
              <p style={{ marginBottom: "16px" }}>{renderMixed("האתר שלך באוויר!")}</p>
              <a href={liveUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: "inline-block" }}>
                {liveUrl}
              </a>
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
