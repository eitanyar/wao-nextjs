"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { CollectedData } from "@/lib/bot/prompts";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface CampaignStrategy {
  targetLocation: string;
  suggestedDailyBudget: number;
  keywords: string[];
  negativeKeywords: string[];
  strategyRationale: string;
}

interface CampaignCopy {
  headlines: string[];
  descriptions: string[];
  callToAction: string;
  copywritingRationale: string;
}

export default function OnboardingPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "שלום, אני אדם — מנהל ה-Google Ads שלך כאן ב-WAO. בוא נבנה לך קמפיין ביחד: אני אשאל אותך כמה שאלות קצרות, ומהתשובות שלך ניצור קמפיין שמביא לקוחות משלמים, לא סתם קליקים. אז נתחיל מהבסיס — במה העסק שלך עוסק, ואיזה שירות נרצה לקדם?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [currentState, setCurrentState] = useState<"DIAGNOSING" | "STRATEGIZING" | "REVIEWING" | "COMPLETED">("DIAGNOSING");
  const [collectedData, setCollectedData] = useState<CollectedData>({});

  const [strategy, setStrategy] = useState<CampaignStrategy | null>(null);
  const [copy, setCopy] = useState<CampaignCopy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSimulation, setIsSimulation] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [lpUrl, setLpUrl] = useState<string | null>(null);
  const [lpGenerating, setLpGenerating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechUttRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Auto-scroll to the bottom of the chat list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle browser TTS (Web Speech API) fallback for vocal experience
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Stop current speech
    window.speechSynthesis.cancel();

    // Create new utterance
    const cleanText = text.replace(/[*#]/g, ""); // strip markdown characters
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "he-IL";
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechUttRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Speak the initial message on load (after user interaction is permitted)
  useEffect(() => {
    const handleInitialSpeak = () => {
      speakText(messages[0].content);
      window.removeEventListener("click", handleInitialSpeak);
    };
    window.addEventListener("click", handleInitialSpeak);
    return () => window.removeEventListener("click", handleInitialSpeak);
  }, []);

  // Listen for the callback redirect from the Ya'ad payment sandbox
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success" && currentState !== "COMPLETED") {
      const triggerCampaignLaunch = async () => {
        setIsSubmitting(true);
        try {
          // Step 1: Close the bot conversation
          const updatedMessages = [...messages, { role: "user" as const, content: "אשר והפעל קמפיין" }];
          setMessages(updatedMessages);

          const botRes = await fetch("/api/bot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: updatedMessages, currentState: "REVIEWING", collectedData }),
          });
          const botData = await botRes.json();
          setMessages((prev) => [...prev, { role: "assistant", content: botData.response }]);
          setCurrentState(botData.currentState);
          speakText(botData.response);

          // Step 2: Generate the landing page
          setLpGenerating(true);
          const lpRes = await fetch("/api/lp-generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ collectedData }),
          });
          const lpData = await lpRes.json();
          setLpGenerating(false);

          if (lpData.success && lpData.url) {
            setLpUrl(lpData.url);
            const lpMsg = `הדף שלך מוכן! 🎉\n\nכל מי שילחץ על המודעה בגוגל יגיע לכאן:\n👉 wao.co.il${lpData.url}\n\nשמור את הקישור הזה — אפשר לשתף אותו גם ישירות בוואטסאפ.`;
            setMessages((prev) => [...prev, { role: "assistant", content: lpMsg }]);
            speakText(lpMsg);
          }

          // Step 3: Store the lead for CRM
          await fetch("/api/lead", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: collectedData.ownerName || collectedData.businessName || "לקוח חדש",
              phone: collectedData.phone,
              service: "google-ads",
              message: `עסק: ${collectedData.businessName || collectedData.businessNiche} | תקציב: ₪${collectedData.monthlyBudget} | LP: ${lpData.url || "N/A"} | ענף: ${collectedData.feasibilityBranch || "—"}`,
              source: "bot-onboarding-v6",
            }),
          }).catch(() => {}); // non-fatal — SMTP may not be configured

          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error(err);
          setLpGenerating(false);
        } finally {
          setIsSubmitting(false);
        }
      };
      triggerCampaignLaunch();
    }
  }, [currentState]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isSubmitting) return;

    // Append user message
    const updatedMessages = [...messages, { role: "user" as const, content: trimmedInput }];
    setMessages(updatedMessages);
    setInputValue("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          currentState,
          collectedData,
        }),
      });

      if (!response.ok) {
        throw new Error("חלה שגיאה בתקשורת עם הבוט.");
      }

      const data = await response.json();

      // Update states
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      setCurrentState(data.currentState);
      setCollectedData(data.collectedData);
      setIsSimulation(data.isSimulation !== false);

      if (data.strategy) {
        setStrategy(data.strategy);
      }
      if (data.copy) {
        setCopy(data.copy);
      }

      // Speak response aloud
      speakText(data.response);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "אוי, נראה שיש לנו תקלת תקשורת קלה. בוא ננסה שוב!" },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 9.9,
          businessName: collectedData.businessName || collectedData.businessNiche || "קמפיין Google Ads"
        }),
      });

      const data = await response.json();
      if (data.success && data.redirectUrl) {
        // Redirect the user to the Ya'ad sandbox checkout page
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="eyebrow">מערכת הקמת קמפיינים אוטומטית</div>
          <h1
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: "8px",
            }}
          >
            אשף הקמת קמפיין <span className="text-gradient">Google Ads</span>
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
            {isSimulation ? (
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
                ● מצב סימולציה (הדמיה מקומית)
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
                ● מחובר ל-Azure OpenAI
              </span>
            )}
            {" | "}
            בנה קמפיין ממומן בגוגל בצורה קולית ומאובטחת תחת ה-MCC של WAO.
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
          {/* Right Column: Chat Assistant (Adam) */}
          <div
            style={{
              ...glass,
              display: "flex",
              flexDirection: "column",
              height: "600px",
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
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>אדם - יועץ Google Ads</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--accent)" }}>
                    {isSpeaking ? "מדבר כעת..." : "מחובר ומקשיב"}
                  </div>
                </div>
              </div>

              {/* Animated Soundwave */}
              {isSpeaking && (
                <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                  <div className="soundwave-bar" style={{ animationDelay: "0.1s" }} />
                  <div className="soundwave-bar" style={{ animationDelay: "0.3s", height: "18px" }} />
                  <div className="soundwave-bar" style={{ animationDelay: "0.2s" }} />
                  <div className="soundwave-bar" style={{ animationDelay: "0.4s", height: "22px" }} />
                  <div className="soundwave-bar" style={{ animationDelay: "0.5s" }} />
                </div>
              )}
            </div>

            {/* Chat Messages */}
            <div
              style={{
                flex: 1,
                padding: "24px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {messages.map((msg, i) => (
                <div
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
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Form */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: "16px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                gap: "12px",
                background: "rgba(13, 15, 21, 0.4)",
              }}
            >
              <input
                type="text"
                placeholder="הקלד כאן הודעה (למשל: אינסטלטור בתל אביב...)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isSubmitting || currentState === "COMPLETED"}
                style={{
                  flex: 1,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-pill)",
                  padding: "12px 20px",
                  color: "var(--text)",
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: "0.95rem",
                }}
              />
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
            </form>
          </div>

          {/* Left Column: Live Campaign Preview & Strategy */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Status Steps Tracker */}
            <div style={{ ...glass, padding: "20px 24px" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "16px" }}>
                שלבי אפיון הקמפיין
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  {
                    label: "פרטי העסק",
                    done: !!collectedData.businessNiche,
                    value: collectedData.businessName
                      ? `${collectedData.businessName} (${collectedData.businessNiche})`
                      : collectedData.businessNiche,
                    num: 1,
                  },
                  {
                    label: "מיקום ומודל שירות",
                    done: !!collectedData.targetLocation,
                    value: collectedData.targetLocation,
                    num: 2,
                  },
                  {
                    label: "פרופיל לקוח ובידול",
                    done: !!collectedData.usp,
                    value: collectedData.usp ? collectedData.usp.slice(0, 40) + (collectedData.usp.length > 40 ? "…" : "") : undefined,
                    num: 3,
                  },
                  {
                    label: "תקציב ופיננסים",
                    done: !!collectedData.monthlyBudget,
                    value: collectedData.monthlyBudget
                      ? `₪${collectedData.monthlyBudget.toLocaleString()} / חודש${collectedData.feasibilityBranch ? ` (ענף ${collectedData.feasibilityBranch})` : ""}`
                      : undefined,
                    num: 4,
                  },
                  {
                    label: "נכסי אמון",
                    done: !!collectedData.hasTrustAssets,
                    value: collectedData.starRating ? `${collectedData.starRating} כוכבים בגוגל` : collectedData.hasTrustAssets ? "יש ביקורות" : undefined,
                    num: 5,
                  },
                  {
                    label: "פרטי קשר",
                    done: !!collectedData.phone,
                    value: collectedData.phone,
                    num: 6,
                  },
                ].map(({ label, done, value, num }) => (
                  <div key={num} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
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
                      {done ? "✓" : num}
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
                ))}
              </div>
            </div>

            {/* Campaign Plan Details Panel */}
            <div style={{ ...glass, padding: "24px", flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                אסטרטגיית קמפיין מוצעת (Dror & Tamar)
              </h3>

              {currentState === "DIAGNOSING" && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--muted)",
                    textAlign: "center",
                    padding: "40px 20px",
                  }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>⚙️</div>
                  <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>
                    ממתין להשלמת האפיון בצ'אט
                  </p>
                  <p style={{ fontSize: "0.85rem", maxWidth: "260px" }}>
                    ברגע שנאסוף את כל הפרטים, ה-Specialists ייצרו עבורך את הקמפיין באופן מיידי.
                  </p>
                </div>
              )}

              {(currentState === "REVIEWING" || currentState === "COMPLETED") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Location & Budget Info */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                      background: "rgba(13, 15, 21, 0.4)",
                      padding: "16px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>
                        מיקוד מיקום
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--accent)" }}>
                        📍 {strategy?.targetLocation}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>
                        תקציב יומי מומלץ
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--accent)" }}>
                        💰 ₪{strategy?.suggestedDailyBudget} / יום
                      </div>
                    </div>
                  </div>

                  {/* Keywords Block */}
                  <div>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "8px" }}>
                      🎯 מילות מפתח ממוקדות (Search Term)
                    </h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {strategy?.keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: "rgba(74, 227, 181, 0.08)",
                            border: "1px solid rgba(74, 227, 181, 0.2)",
                            color: "var(--accent)",
                            padding: "4px 10px",
                            borderRadius: "var(--radius-pill)",
                            fontSize: "0.8rem",
                          }}
                        >
                          +{kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Negative Keywords Block */}
                  <div>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "8px", color: "#FF5E5E" }}>
                      🚫 מילות מפתח שליליות (למניעת בזבוז כסף)
                    </h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {strategy?.negativeKeywords.map((nkw, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: "rgba(255, 94, 94, 0.08)",
                            border: "1px solid rgba(255, 94, 94, 0.2)",
                            color: "#FF5E5E",
                            padding: "4px 10px",
                            borderRadius: "var(--radius-pill)",
                            fontSize: "0.8rem",
                          }}
                        >
                          -{nkw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Ad Live Preview */}
                  <div>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "8px" }}>
                      👀 תצוגה מקדימה למודעה בגוגל (Google Search)
                    </h4>
                    <div
                      style={{
                        background: "#FFFFFF",
                        color: "#1A0DAB",
                        padding: "16px",
                        borderRadius: "8px",
                        border: "1px solid #DFE1E5",
                        fontFamily: "Arial, sans-serif",
                        textAlign: "right",
                      }}
                    >
                      {/* Sponsor & Domain */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "0.78rem",
                          color: "#202124",
                          marginBottom: "4px",
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        <span style={{ fontWeight: "bold" }}>ממומן</span>
                        <span style={{ color: "#5F6368" }}>•</span>
                        <span style={{ color: "#202124" }}>
                          www.{collectedData.businessNiche ? "my-business" : "yoursite"}.co.il
                        </span>
                      </div>

                      {/* Headlines */}
                      <div
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: "medium",
                          color: "#1a0dab",
                          lineHeight: "1.3",
                          marginBottom: "4px",
                          cursor: "pointer",
                        }}
                      >
                        {copy?.headlines.slice(0, 3).join(" | ")}
                      </div>

                      {/* Descriptions */}
                      <div
                        style={{
                          fontSize: "0.87rem",
                          color: "#4d5156",
                          lineHeight: "1.5",
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        {copy?.descriptions.join(" ")}
                      </div>
                    </div>
                  </div>

                  {/* Landing Page Preview */}
                  <div>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "8px", color: "var(--accent)" }}>
                      📱 תצוגה מקדימה לדף הנחיתה
                    </h4>
                    <div style={{
                      background: "rgba(13, 15, 21, 0.6)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      position: "relative",
                      overflow: "hidden"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>{collectedData.businessNiche || "העסק שלך"}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>☰</div>
                      </div>
                      <div style={{ textAlign: "center", marginTop: "12px" }}>
                        <h1 style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: "8px", lineHeight: 1.2 }}>
                          {copy?.headlines[0] || "הכותרת המנצחת שלך תופיע כאן"}
                        </h1>
                        <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "16px" }}>
                          {copy?.descriptions[0] || "כאן יופיע טקסט משכנע המבוסס על ה-USP שלך"}
                        </p>
                        <button style={{
                          background: "linear-gradient(135deg, #4AE3B5, #00C3FF)",
                          color: "var(--bg)",
                          border: "none",
                          padding: "10px 24px",
                          borderRadius: "20px",
                          fontWeight: "bold",
                          fontSize: "0.95rem",
                          width: "80%"
                        }}>
                          התקשר עכשיו
                        </button>
                      </div>
                      <div style={{ marginTop: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "8px" }}>לקוחות ממליצים בוואטסאפ:</div>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <div style={{ width: "60px", height: "80px", background: "var(--border)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "var(--muted)" }}>צילום 1</div>
                          <div style={{ width: "60px", height: "80px", background: "var(--border)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "var(--muted)" }}>צילום 2</div>
                          <div style={{ width: "60px", height: "80px", background: "var(--border)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "var(--muted)" }}>צילום 3</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Checkout & Action CTA */}
                  {currentState === "REVIEWING" && (
                    <div style={{
                      background: "rgba(13, 15, 21, 0.4)",
                      border: "1px solid var(--accent-border)",
                      padding: "20px",
                      borderRadius: "12px",
                      marginTop: "10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px"
                    }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>דמי הקמה ותקופת ניסיון</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text)", margin: "4px 0" }}>9.90 ₪</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>תשלום חד-פעמי להפעלת הקמפיין ודף הנחיתה</div>
                      </div>
                      
                      <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                        <input 
                          type="checkbox" 
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          style={{ marginTop: "4px", accentColor: "var(--accent)", width: "16px", height: "16px" }}
                        />
                        <span style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: "1.4" }}>
                          אני מאשר/ת את <strong>תנאי השימוש</strong> ומסכים/ה שהשירות מסופק "As-Is".
                          ידוע לי שההוצאה היומית לגוגל תשולם ישירות מחשבון ה-Ads שייפתח עבורי.
                        </span>
                      </label>

                      <button
                        onClick={handleApprove}
                        disabled={isSubmitting || !acceptedTerms}
                        className="btn-primary"
                        style={{
                          width: "100%",
                          padding: "16px",
                          justifyContent: "center",
                          fontSize: "1.1rem",
                          background: acceptedTerms ? "linear-gradient(135deg, #4AE3B5, #00C3FF)" : "var(--border)",
                          color: acceptedTerms ? "var(--bg)" : "var(--muted)",
                          cursor: acceptedTerms ? "pointer" : "not-allowed",
                          transition: "all 0.3s ease",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: "bold"
                        }}
                      >
                        🚀 לתשלום (9.9 ₪) והפעלת קמפיין
                      </button>
                    </div>
                  )}

                  {currentState === "COMPLETED" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {lpGenerating && (
                        <div style={{ background: "rgba(74,227,181,0.06)", border: "1px solid var(--accent-border)", borderRadius: "var(--radius-sm)", padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
                          <div style={{ marginBottom: "8px", fontSize: "1.2rem" }}>⚙️</div>
                          בונה את הדף שלך... זה ייקח כמה שניות
                        </div>
                      )}
                      {lpUrl && (
                        <div style={{ background: "rgba(74,227,181,0.10)", border: "1px solid var(--accent-border)", borderRadius: "var(--radius-sm)", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ color: "var(--accent)", fontWeight: 800, fontSize: "1rem", textAlign: "center" }}>
                            🎉 הדף שלך מוכן!
                          </div>
                          <a
                            href={lpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ background: "var(--accent)", color: "var(--bg)", padding: "12px 20px", borderRadius: "var(--radius-pill)", fontWeight: 700, fontSize: "0.95rem", textAlign: "center", textDecoration: "none", display: "block" }}
                          >
                            👉 צפה בדף הנחיתה שלך
                          </a>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", wordBreak: "break-all" }}>
                            wao.co.il{lpUrl}
                          </div>
                        </div>
                      )}
                      {!lpGenerating && !lpUrl && (
                        <div style={{ background: "rgba(74,227,181,0.08)", border: "1px solid var(--accent-border)", borderRadius: "var(--radius-sm)", padding: "16px", color: "var(--accent)", textAlign: "center", fontWeight: "bold", fontSize: "0.95rem" }}>
                          🎉 הקמפיין באוויר! בדוק את תיבת המייל שלך להזמנת הניהול.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <Link href="/google-ads" style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            ← חזרה לעמוד הבית של Google Ads
          </Link>
        </div>
      </div>

      {/* Embedded CSS for custom styling (soundwave bars, etc) */}
      <style jsx global>{`
        .soundwave-bar {
          width: 3px;
          height: 10px;
          background-color: var(--accent);
          border-radius: 2px;
          animation: pulse 1s ease-in-out infinite alternate;
        }
        @keyframes pulse {
          0% {
            transform: scaleY(1);
          }
          100% {
            transform: scaleY(1.8);
          }
        }
      `}</style>
    </div>
  );
}
