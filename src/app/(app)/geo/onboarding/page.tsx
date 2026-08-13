"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { GeoCollectedData } from "@/lib/geo/prompts";

// ── Hebrew-safety: ASCII placeholder tokens filled by scripts/patch_geo_011_hebrew.py ──
const GEO_GREETING = "היי, אני אדם. בוא נבנה ביחד נוכחות שגוגל וה-AI ישמחו להמליץ עליה. נתחיל?";   // filled by scripts/patch_geo_011_hebrew.py
const GEO_CONFIRM  = "תודה! קיבלנו את כל הפרטים. נשלח לך בוואטסאפ את תוכנית העבודה הראשונה שלך.";     // filled by scripts/patch_geo_011_hebrew.py

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function GeoOnboardingPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: GEO_GREETING },
  ]);
  const [currentState, setCurrentState] = useState<"COLLECTING" | "RECOMMENDING" | "COMPLETED">("COLLECTING");
  const [collectedData, setCollectedData] = useState<GeoCollectedData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [leadDone, setLeadDone] = useState(false);
  const [simulate, setSimulate] = useState(false);
  const sessionIdRef = useRef(`geo-s-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Sim toggle: read ?sim=1 from URL once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const simParam = params.get("sim");
    setSimulate(simParam === "1");
  }, []);

  // Auto-scroll chat to latest assistant message
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.role === "assistant") {
      const assistantMessages = el.querySelectorAll<HTMLElement>("[data-chat-role='assistant']");
      const latestAssistant = assistantMessages[assistantMessages.length - 1];
      if (latestAssistant) el.scrollTop = Math.max(0, latestAssistant.offsetTop - 16);
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Completion flow: when currentState becomes 'COMPLETED' and leadDone=false
  useEffect(() => {
    if (currentState === "COMPLETED" && !leadDone && collectedData.businessNiche) {
      setLeadDone(true);
      postComplete(collectedData);
    }
  }, [currentState, leadDone, collectedData]);

  const postComplete = async (data: GeoCollectedData) => {
    try {
      const res = await fetch("/api/geo-bot/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectedData: data }),
      });
      const result = await res.json();
      if (result.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: GEO_CONFIRM }]);
      }
    } catch (err) {
      console.error("[geo/onboarding] complete error:", err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isSubmitting || currentState === "COMPLETED") return;

    const updatedMessages = [...messages, { role: "user" as const, content: trimmedInput }];
    setMessages(updatedMessages);
    setInputValue("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/geo-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          currentState,
          collectedData,
          simulate: simulate ? true : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("חלה שגיאה בתקשורת עם הבוט.");
      }

      const data: {
        response?: string;
        currentState?: "COLLECTING" | "RECOMMENDING" | "COMPLETED";
        collectedData?: GeoCollectedData;
      } = await response.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.response || "" }]);
      if (data.currentState) setCurrentState(data.currentState);
      if (data.collectedData) setCollectedData(data.collectedData);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "אוי, נראה שיש לנו תקלת תקשורת קלה. בוא ננסה שוב!" },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Progress tracker: show GeoCollectedData fields as done/pending ──
  const progressSteps = [
    { label: "תחום עסקי", field: "businessNiche" as keyof GeoCollectedData },
    { label: "כתובת אתר", field: "siteUrl" as keyof GeoCollectedData },
    { label: "אזור שירות", field: "targetLocation" as keyof GeoCollectedData },
    { label: "שאלות לקוחות", field: "clientQuestions" as keyof GeoCollectedData },
    { label: "בדיקת AI בגוגל", field: "aioDetected" as keyof GeoCollectedData },
    { label: "אישור WHATSAPP", field: "approvalWhatsapp" as keyof GeoCollectedData },
  ];

  // Styles
  const glass: React.CSSProperties = {
    background: "rgba(22, 25, 34, 0.75)",
    backdropFilter: "blur(12px)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-card)",
  };

  return (
    <div
      dir="rtl"
      style={{
        paddingTop: "clamp(100px, 12vw, 130px)",
        paddingBottom: "64px",
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div className="wao-container" style={{ width: "100%", maxWidth: "1200px" }}>
        {/* Header Section */}
        <div style={{ marginBottom: "32px", textAlign: "right" }}>
          <div className="eyebrow">GEO / AIO</div>
          <h1
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: "8px",
            }}
          >
            נוכחות שגוגל וה-AI <span className="text-gradient">ימליצו</span> עליך
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "8px" }}>
            הבוט אוסף את הפרטים הנדרשים.
          </p>
          {simulate && (
            <p style={{ color: "#FFAA00", fontSize: "0.9rem", fontWeight: 700, marginBottom: "6px" }}>
              מצב הדגמה פעיל. התשובות רצות דרך הזרימה המוכנה.
            </p>
          )}
          <p style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: "16px" }}>
            {simulate ? (
              <span
                style={{
                  background: "rgba(255, 170, 0, 0.1)",
                  color: "#FFAA00",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid rgba(255, 170, 0, 0.2)",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                }}
              >
                ● מצב דגמה
              </span>
            ) : (
              <span
                style={{
                  background: "rgba(74, 227, 181, 0.1)",
                  color: "var(--accent)",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--accent-border)",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                }}
              >
                ● Live mode
              </span>
            )}
          </p>
        </div>

        {/* Dashboard Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            alignItems: "stretch",
          }}
        >
          {/* Right Column: Chat Assistant */}
          <div
            style={{
              ...glass,
              display: "flex",
              flexDirection: "column",
              height: "clamp(380px, 55dvh, 600px)",
              overflow: "hidden",
            }}
          >
            {/* Assistant Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(13, 15, 21, 0.5)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4AE3B5, #00C3FF)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    color: "var(--bg)",
                    fontSize: "1.1rem",
                  }}
                >
                  א
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>אדם - GEO Onboarding</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--accent)" }}>מחובר ומקשיב</div>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div
              ref={messagesContainerRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  justifyContent: "flex-end",
                  minHeight: "100%",
                }}
              >
                {messages.map((msg, i) => (
                  <div
                    data-chat-role={msg.role}
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: msg.role === "user" ? "flex-start" : "flex-end",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "85%",
                        padding: "12px 18px",
                        borderRadius: "14px",
                        fontSize: "0.95rem",
                        lineHeight: "1.5",
                        direction: "rtl",
                        whiteSpace: "pre-line",
                        background:
                          msg.role === "user"
                            ? "var(--subtle)"
                            : "linear-gradient(135deg, rgba(74,227,181,0.08) 0%, rgba(0,195,255,0.08) 100%)",
                        border:
                          msg.role === "user"
                            ? "1px solid var(--border)"
                            : "1px solid var(--accent-border)",
                        color: msg.role === "user" ? "var(--text)" : "#EEE9E2",
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isSubmitting && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ color: "var(--muted)", fontSize: "0.85rem", padding: "8px" }}>
                      אדם חושב...
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Input Form */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: "16px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                background: "rgba(13, 15, 21, 0.4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  שאלה {collectedData.turnIndex != null ? collectedData.turnIndex + 1 : 1}
                </div>
                <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(((collectedData.turnIndex ?? 0) + 1) / 11 * 100, 100)}%`,
                      height: "100%",
                      background: "linear-gradient(135deg, #4AE3B5, #00C3FF)",
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <input
                    type="text"
                    placeholder="כתוב כאן…"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isSubmitting || currentState === "COMPLETED"}
                    style={{
                      width: "100%",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-pill)",
                      padding: "12px 20px",
                      color: "var(--text)",
                      fontFamily: "var(--font-body), sans-serif",
                      fontSize: "0.95rem",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !inputValue.trim() || currentState === "COMPLETED"}
                  className="btn-primary"
                  style={{
                    padding: "12px 24px",
                    fontSize: "0.9rem",
                    borderRadius: "var(--radius-pill)",
                  }}
                >
                  שלח
                </button>
              </div>
            </form>
          </div>

          {/* Left Column: Lightweight Progress Tracker */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Status Steps Tracker */}
            <div style={{ ...glass, padding: "20px 24px" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "16px" }}>
                שלבי איסוף פרטים
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {progressSteps.map(({ label, field }) => {
                  const done = !!collectedData[field];
                  const value = field === "aioDetected" 
                    ? (collectedData.aioDetected ? "זוהתה" : "לא זוהתה") 
                    : (collectedData[field] as string) || undefined;
                  return (
                    <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: done ? "var(--accent)" : "var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          color: done ? "var(--bg)" : "var(--muted)",
                          fontWeight: "bold",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        {done ? "✓" : "•"}
                      </div>
                      <span style={{ fontSize: "0.85rem", color: done ? "var(--text)" : "var(--muted)", lineHeight: 1.4 }}>
                        {label}
                        {value && (
                          <>
                            {": "}
                            <strong style={{ color: done ? "var(--accent)" : "var(--muted)" }}>{value}</strong>
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info Panel */}
            <div style={{ ...glass, padding: "24px" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "12px" }}>
                מה זה GEO/AIO?
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.6 }}>
                GEO = Generative Engine Optimization. AIO = AI Overview (התשובה של גוגל בראש התוצאות).
              </p>
              <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.8 }}>
                הבוט אוסף את הפרטים הנדרשים כדי לבנות נוכחות שגוגל וה-AI ימליצו עליך. אין תשלום.
              </p>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <Link href="/google-ads" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            ← חזרה ל Google Ads
          </Link>
        </div>
      </div>
    </div>
  );
}
