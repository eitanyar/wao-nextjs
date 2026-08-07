"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CollectedData } from "@/lib/bot/prompts";
import { renderMixed } from "@/lib/bidi";

// Minimal Site Bot intake — a trimmed, sequential version of the Ads Bot's
// DIAGNOSING flow (see /api/bot's handleSimulation), scoped to only the
// fields buildSiteCopyPrompt() actually reads. No budget/close-rate/Ads
// fields here — those belong to the Ads Bot conversation, not this one.
//
// Payment: once the chat is done, collected data is handed to
// /api/site-bot/checkout/init and the user is routed to /site-bot/pay/[sessionId],
// which owns charging + triggering generate/deploy (see that route). This page
// no longer calls generate/deploy directly.

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface Step {
  question: string;
  apply: (text: string, data: CollectedData) => CollectedData;
}

const STEPS: Step[] = [
  {
    question: "יאללה, בוא נבנה לך אתר. איך קוראים לעסק?",
    apply: (text, data) => ({ ...data, businessName: text }),
  },
  {
    question: "ובמה אתה עוסק בעיקר? (למשל: אינסטלציה, עיצוב גינות, ייעוץ עסקי)",
    apply: (text, data) => ({ ...data, businessNiche: text, primaryService: text }),
  },
  {
    question: "איך קוראים לך?",
    apply: (text, data) => ({ ...data, ownerName: text }),
  },
  {
    question: "באילו ערים או אזורים אתה נותן שירות?",
    apply: (text, data) => ({ ...data, targetLocation: text, specificCities: text }),
  },
  {
    question: "ובכנות — למה שיבחרו דווקא בך, ולא במישהו אחר שעושה אותו דבר?",
    apply: (text, data) => ({ ...data, usp: text }),
  },
  {
    question: "כמה שנים אתה בתחום? ויש לך אחריות על העבודה — לכמה זמן?",
    apply: (text, data) => ({ ...data, yearsInField: text, guarantee: text }),
  },
  {
    question: 'התחום שלך דורש רישיון או הסמכה רשמית? אם כן — איזה. אם לא, כתוב "לא"',
    apply: (text, data) => ({ ...data, license: text.includes("לא") ? undefined : text }),
  },
  {
    question: "מה הכי מטריד לקוחות רגע לפני שהם פונים אליך?",
    apply: (text, data) => ({ ...data, idealClientFear: text }),
  },
  {
    question: 'יש לך ביקורת מגוגל שאתה גאה בה? העתק-הדבק אותה, ותגיד גם מה הדירוג (למשל 4.9). אם אין, כתוב "אין"',
    apply: (text, data) => {
      if (text.includes("אין")) return data;
      const rating = text.match(/(\d[\d.]*)\s*(כוכב|★|\*)/);
      return { ...data, reviewQuote: text, starRating: rating ? rating[1] : data.starRating };
    },
  },
  {
    question: "איך הכי נוח שיצרו איתך קשר — טלפון, וואטסאפ, או שניהם? ומה המספר?",
    apply: (text, data) => {
      const digits = text.replace(/[^\d-]/g, "").trim();
      return { ...data, contactMethod: text, phone: digits || data.phone, whatsappNumber: digits || data.whatsappNumber };
    },
  },
  {
    question: 'רק כדי לדעת מה נדרש מבחינה חוקית באתר — אתה עוסק פטור, או שהמחזור השנתי שלך מעל 120 אלף ש״ח?',
    apply: (text, data) => {
      const t = text.trim();
      const vatStatus: CollectedData["vatStatus"] =
        t.includes("פטור") ? "osek_patur" :
        /מיליון/.test(t) || /1,?000,?000/.test(t) ? "over_1m" :
        /לא|מתחת|נמוך/.test(t) ? "under_120k" :
        /מעל|כן|יותר/.test(t) ? "between_120k_1m" :
        undefined; // unclear answer — left undefined, treated as non-exempt downstream
      return vatStatus ? { ...data, vatStatus, vatStatusCollectedAt: new Date().toISOString() } : data;
    },
  },
  {
    question: 'רוצה כתובת מותאמת לאתר (למשל wao-plumber-ta)? אפשר גם לכתוב "דלג" ואני אבחר בשבילך',
    apply: (text, data) => (text.includes("דלג") ? data : { ...data, preferredSlug: text }),
  },
];

type Phase = "chat" | "routing" | "error";

export default function SiteBotStartPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: STEPS[0].question }]);
  const [stepIndex, setStepIndex] = useState(0);
  const [collectedData, setCollectedData] = useState<CollectedData>({});
  const [inputValue, setInputValue] = useState("");
  const [phase, setPhase] = useState<Phase>("chat");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
  }

  async function finish(data: CollectedData) {
    setPhase("routing");
    try {
      const res = await fetch("/api/site-bot/checkout/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectedData: data }),
      });
      const json = await res.json();
      if (!res.ok || !json.sessionId) throw new Error(json.error || "יצירת התשלום נכשלה");
      router.push(`/site-bot/pay/${json.sessionId}`);
    } catch (err: any) {
      setErrorMessage(err.message || "משהו השתבש");
      setPhase("error");
    }
  }

  function handleSend() {
    const text = inputValue.trim();
    if (!text || phase !== "chat") return;

    const step = STEPS[stepIndex];
    const nextData = step.apply(text, collectedData);
    setCollectedData(nextData);
    setInputValue("");

    const userMsg: Message = { role: "user", content: text };
    const nextIndex = stepIndex + 1;

    if (nextIndex < STEPS.length) {
      setMessages(prev => [...prev, userMsg, { role: "assistant", content: STEPS[nextIndex].question }]);
      setStepIndex(nextIndex);
      scrollDown();
    } else {
      setMessages(prev => [...prev, userMsg, { role: "assistant", content: "מעולה, יש לי כל מה שצריך. בונה לך את האתר..." }]);
      scrollDown();
      finish(nextData);
    }
  }

  return (
    <section className="wao-section">
      <div className="wao-container" style={{ maxWidth: "640px" }}>
        <h1
          style={{
            fontFamily: "var(--font-rubik), sans-serif",
            fontWeight: 900,
            fontSize: "clamp(1.4rem,3vw,2rem)",
            marginBottom: "24px",
            color: "var(--text)",
          }}
        >
          {renderMixed("Site Bot")} — בונים את האתר שלך בצ׳אט
        </h1>

        <div
          ref={scrollRef}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface)",
            padding: "20px",
            maxHeight: "480px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "assistant" ? "flex-start" : "flex-end",
                background: m.role === "assistant" ? "var(--bg)" : "var(--accent)",
                color: m.role === "assistant" ? "var(--text)" : "#0a0a0a",
                border: m.role === "assistant" ? "1px solid var(--border)" : "none",
                borderRadius: "var(--radius-md)",
                padding: "10px 16px",
                maxWidth: "85%",
                lineHeight: 1.6,
                fontFamily: "var(--font-body), sans-serif",
                whiteSpace: "pre-wrap",
              }}
            >
              {renderMixed(m.content)}
            </div>
          ))}

          {phase === "routing" && (
            <div style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", padding: "0 4px" }}>
              {renderMixed("מעביר אותך לתשלום...")}
            </div>
          )}

          {phase === "error" && (
            <div style={{ color: "#e05555", fontFamily: "var(--font-body), sans-serif", padding: "0 4px" }}>
              {renderMixed(`קרתה תקלה: ${errorMessage}. אפשר לרענן ולנסות שוב.`)}
            </div>
          )}
        </div>

        {phase === "chat" && (
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="כתוב כאן את התשובה שלך"
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontFamily: "var(--font-body), sans-serif",
              }}
            />
            <button onClick={handleSend} className="btn-primary" style={{ padding: "12px 24px" }}>
              שלח
            </button>
          </div>
        )}

        <p style={{ marginTop: "24px", fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
          {renderMixed("גרסת בטא פנימית — ללא חיוב. ")}
          <Link href="/site-bot" style={{ color: "var(--accent)" }}>
            חזרה לעמוד Site Bot
          </Link>
        </p>
      </div>
    </section>
  );
}
