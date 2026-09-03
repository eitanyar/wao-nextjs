"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { renderMixed } from "@/lib/bidi";
import type { CollectedData } from "@/lib/bot/prompts";
import type { ResearchGate } from "@/lib/site-bot/research/gates";
import { RESEARCH_COPY } from "@/lib/site-bot/researchCopy";
import {
  buildResearchGateAnswer,
  RESEARCH_PROGRESS_KEYS,
  researchGateCopyKey,
} from "@/lib/site-bot/research/gatePresentation";

// Mock-provider checkout page. The real Takbull integration will redirect
// here from a hosted tokenization page instead — this page's job (call
// /api/site-bot/checkout/callback with the sessionId once the user
// confirms) doesn't change when that swap happens.
type Phase = "form" | "charging" | "gates" | "submitting_gate" | "done" | "error";

interface CheckoutCallbackResponse {
  success: boolean;
  url: string;
  slug: string;
  researchId: string;
  collectedData: CollectedData;
  openResearchGates: ResearchGate[];
}

export default function SiteBotPayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [researchId, setResearchId] = useState<string | null>(null);
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null);
  const [openResearchGates, setOpenResearchGates] = useState<ResearchGate[]>([]);
  const [gateIndex, setGateIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const answerInputRef = useRef<HTMLInputElement>(null);

  async function pay() {
    setPhase("charging");
    setError(null);
    try {
      const res = await fetch("/api/site-bot/checkout/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const json = await res.json() as CheckoutCallbackResponse & { error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || "משהו השתבש");
      setLiveUrl(json.url);
      if (json.openResearchGates?.length && json.researchId && json.collectedData) {
        setResearchId(json.researchId);
        setCollectedData(json.collectedData);
        setOpenResearchGates(json.openResearchGates);
        setGateIndex(0);
        setAnswer("");
        setPhase("gates");
      } else {
        setPhase("done");
      }
    } catch (e: any) {
      setError(e.message || "משהו השתבש");
      setPhase("error");
    }
  }

  async function submitGate() {
    const gate = openResearchGates[gateIndex];
    if (!gate || !researchId || !collectedData) return;
    const normalizedAnswer = buildResearchGateAnswer(gate.type, answer, collectedData);
    if (!normalizedAnswer) return;

    setPhase("submitting_gate");
    setError(null);
    try {
      const res = await fetch("/api/site-bot/research/gates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchId,
          collectedData,
          gateId: gate.id,
          evidenceDigest: gate.evidenceDigest,
          answer: normalizedAnswer,
        }),
      });
      const json = await res.json() as { status?: string; collectedData?: CollectedData; error?: string };
      if (!res.ok || (json.status !== "approved" && json.status !== "already_approved") || !json.collectedData) {
        throw new Error(json.error || "");
      }

      setCollectedData(json.collectedData);
      setAnswer("");
      if (gateIndex + 1 === openResearchGates.length) {
        setPhase("done");
      } else {
        setGateIndex((current) => current + 1);
        setPhase("gates");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "");
      setPhase("gates");
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

          {(phase === "gates" || phase === "submitting_gate") && openResearchGates[gateIndex] && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {RESEARCH_PROGRESS_KEYS.map((key) => (
                  <p key={key} style={{ color: "var(--muted)", margin: 0 }}>
                    {renderMixed(RESEARCH_COPY[key])}
                  </p>
                ))}
              </div>
              <p style={{ margin: 0 }}>
                {renderMixed(RESEARCH_COPY[researchGateCopyKey(openResearchGates[gateIndex].type)])}
              </p>
              {error && <p style={{ color: "#e05555", margin: 0 }}>{renderMixed(error)}</p>}
              <input
                ref={answerInputRef}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={phase === "submitting_gate"}
                style={inputStyle}
              />
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => answerInputRef.current?.focus()}
                  className="btn-outline"
                  style={{ flex: 1, padding: "14px" }}
                >
                  {RESEARCH_COPY.action_edit}
                </button>
                <button
                  type="button"
                  onClick={submitGate}
                  disabled={!answer.trim() || phase === "submitting_gate"}
                  className="btn-primary"
                  style={{ flex: 1, padding: "14px" }}
                >
                  {phase === "submitting_gate" ? RESEARCH_COPY.action_continue : RESEARCH_COPY.action_approve}
                </button>
              </div>
            </div>
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
