"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CollectedData } from "@/lib/bot/prompts";
import { renderMixed } from "@/lib/bidi";
import { SCORECARD_COPY } from "@/lib/site-bot/scorecardCopy";
import { seedFromAudit } from "@/lib/site-bot/seedPrefill";
import { RESEARCH_COPY } from "@/lib/site-bot/researchCopy";

// Site Bot intake — a sequential chat that collects only the fields
// buildSiteCopyPrompt() / renderSitePages() actually read. Redesigned per the
// team review: Lior (mission-planner) scoped the field set/order — legal/tax
// (vatStatus) and license dropped from the paid path since both are safe to
// defer (renderer already treats them as non-exempt/absent by default);
// Yonatan (seo-strategist) added the serviceModel gate + street address (for
// LocalBusiness schema) and businessHours; Tamar (copywriter) designed the
// one-shot anti-generic follow-up probes on usp/idealClientFear/reviewQuote —
// Eitan's hard mandate is that the FIRST generated site must never read
// generic, so a too-generic answer gets pushed back on once, gently, before
// being accepted as-is. Maya (ux) called for single-question-per-screen (kept)
// and a segmented progress bar that doesn't move when a probe fires.
//
// Payment: once the chat is done, collected data is handed to
// /api/site-bot/checkout/init and the user is routed to /site-bot/pay/[sessionId],
// which owns charging + triggering generate/deploy (see that route).

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface Step {
  key: string;
  question: string;
  apply: (text: string, data: CollectedData) => CollectedData;
  skip?: (data: CollectedData) => boolean;
  detectGeneric?: (text: string) => boolean;
  probeQuestion?: string;
  combine?: (original: string, followUp: string) => string;
}

// ── Anti-generic detectors (Tamar's design) ─────────────────────────────────
// Each fires at most once per field (tracked in probedKeys). A still-generic
// second answer is accepted as-is — one nudge, never a loop.

function isGenericUsp(text: string): boolean {
  const genericWord = /מקצועי|אמין|איכות|יחס אישי|הכי טוב|הטוב ביותר|מחירים הוגנים|זמינות|ניסיון/;
  const hasConcrete = /\d/.test(text) || /דקות|שעה|שבת|תוך|אחריות|שנה|שנים/.test(text);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return genericWord.test(text) && !hasConcrete && wordCount <= 8;
}

function isGenericFear(text: string): boolean {
  const abstractOnly = /^(שירות טוב|מחיר טוב|מקצועיות|שיהיה בסדר|שיגיעו בזמן|אמינות|מחיר|איכות|זמינות)$/;
  const hasScenario = /נעלם|הקפיץ|בלגן|רימ|שילמ|חיכ|הצפ|נזק|פוצץ|לא הגיע|לא חזר/.test(text);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return (abstractOnly.test(text.trim()) || wordCount <= 4) && !hasScenario;
}

function isGenericReview(text: string): boolean {
  if (text.includes("אין")) return false; // honest no-proof path — don't probe
  const claimAboutReviews = /^(יש לי הרבה|מלא ביקורות|כולם מרוצים|\d[\d.]*\s*כוכבים?)$/;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return claimAboutReviews.test(text.trim()) || wordCount <= 3;
}

const STEPS: Step[] = [
  {
    key: "businessName",
    question: "יאללה, בוא נבנה לך אתר. איך קוראים לעסק?",
    apply: (text, data) => ({ ...data, businessName: text }),
  },
  {
    key: "businessNiche",
    question: "ובמה אתה עוסק בעיקר? (למשל: אינסטלציה, עיצוב גינות, ייעוץ עסקי)",
    apply: (text, data) => ({ ...data, businessNiche: text, primaryService: text }),
  },
  {
    key: "serviceModel",
    question: "איך אתה עובד מול לקוחות — אתה מגיע אליהם, הם מגיעים אליך, או שניהם?",
    apply: (text, data) => {
      const t = text.trim();
      const serviceModel: CollectedData["serviceModel"] =
        /שניהם|גם וגם|תלוי/.test(t) ? "mixed" :
        /מגיע אלי|אצלי|חנות|מרפאה|קליניקה|משרד/.test(t) ? "location" :
        /מרחוק|טלפון|זום|אונליין/.test(t) ? "remote" :
        "field";
      return { ...data, serviceModel };
    },
  },
  {
    key: "streetAddress",
    question: "מה כתובת העסק? (רחוב ומספר — מופיע באתר ובגוגל)",
    skip: (data) => data.serviceModel !== "location" && data.serviceModel !== "mixed",
    apply: (text, data) => ({ ...data, streetAddress: text }),
  },
  {
    key: "targetLocation",
    question: "באילו ערים או אזורים אתה נותן שירות?",
    apply: (text, data) => ({ ...data, targetLocation: text, specificCities: text }),
  },
  {
    key: "ownerName",
    question: "איך קוראים לך?",
    apply: (text, data) => ({ ...data, ownerName: text }),
  },
  {
    key: "usp",
    question: "ובכנות — למה שיבחרו דווקא בך, ולא במישהו אחר שעושה אותו דבר?",
    apply: (text, data) => ({ ...data, usp: text }),
    detectGeneric: isGenericUsp,
    probeQuestion:
      "תפסתי, אבל “מקצועי ואמין” הלקוח שומע מכל אחד. תן לי דבר אחד קונקרטי שאתה עושה אחרת — משהו שמתחרה ממול לא באמת יגיד על עצמו. מספר, זמן תגובה, אחריות, איך אתה עובד בשטח. מה גורם ללקוח להגיד “אה, זה שונה”?",
    combine: (original, followUp) => `${original}. ${followUp}`,
  },
  {
    key: "idealClientFear",
    question: "מה הכי מטריד לקוחות רגע לפני שהם פונים אליך?",
    apply: (text, data) => ({ ...data, idealClientFear: text }),
    detectGeneric: isGenericFear,
    probeQuestion:
      "זה בדיוק החלק שגורם לאנשים להרים אליך טלפון, אז בוא נדייק. תחשוב על לקוח שהגיע אליך שרוף ממישהו קודם — מה בדיוק עשו לו? נעלמו באמצע? הקפיצו מחיר? השאירו בלגן? תאר לי את הסיטואציה במשפט, כאילו אתה מספר לי אותה.",
    combine: (original, followUp) => `${original}. ${followUp}`,
  },
  {
    key: "yearsAndGuarantee",
    question: "כמה שנים אתה בתחום? ויש לך אחריות על העבודה — לכמה זמן?",
    apply: (text, data) => ({ ...data, yearsInField: text, guarantee: text }),
  },
  {
    key: "services",
    question: "מה השירותים המרכזיים שאתה נותן? (אפשר כמה, מופרדים בפסיק)",
    apply: (text, data) => ({ ...data, secondaryServices: text }),
  },
  {
    key: "reviewQuote",
    question: 'יש לך ביקורת מגוגל שאתה גאה בה? העתק-הדבק אותה, ותגיד גם מה הדירוג (למשל 4.9). אם אין, כתוב "אין"',
    apply: (text, data) => {
      if (text.includes("אין")) return data;
      const rating = text.match(/(\d[\d.]*)\s*(כוכב|★|\*)/);
      return { ...data, reviewQuote: text, starRating: rating ? rating[1] : data.starRating };
    },
    detectGeneric: isGenericReview,
    probeQuestion:
      "זה שווה זהב באתר, אז שנייה. תיכנס לגוגל או לוואטסאפ, ותעתיק לי ביקורת אחת אמיתית כמו שהיא — עם המשפט המלא שהלקוח כתב. עדיף ביקורת שמספרת מה בדיוק עשית לו, גם אם היא לא מושלמת. אם ממש אין כרגע, כתוב “אין” ונמשיך.",
    combine: (original, followUp) => (followUp.includes("אין") ? original : followUp),
  },
  {
    key: "contact",
    question: "איך הכי נוח שיצרו איתך קשר — טלפון, וואטסאפ, או שניהם? ומה המספר?",
    apply: (text, data) => {
      const digits = text.replace(/[^\d-]/g, "").trim();
      return { ...data, contactMethod: text, phone: digits || data.phone, whatsappNumber: digits || data.whatsappNumber };
    },
  },
  {
    key: "businessHours",
    question: 'מה שעות הפעילות שלך? (אם אין שעות קבועות, כתוב "לא קבוע")',
    apply: (text, data) => (text.includes("לא קבוע") ? data : { ...data, businessHours: text }),
  },
  {
    key: "preferredSlug",
    question: 'רוצה כתובת מותאמת לאתר (למשל wao-plumber-ta)? אפשר גם לכתוב "דלג" ואני אבחר בשבילך',
    apply: (text, data) => (text.includes("דלג") ? data : { ...data, preferredSlug: text }),
  },
];

type Phase = "chat" | "routing" | "error";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getStepPrefillValue(key: string, prefill?: Partial<CollectedData>): string | undefined {
  if (!prefill) return undefined;
  if (key === "contact") {
    return prefill.phone;
  }
  const val = (prefill as Record<string, unknown>)[key];
  if (val !== undefined && val !== null && String(val).trim() !== "") {
    return String(val);
  }
  return undefined;
}

function getQuestionText(step: Step, prefillData?: Partial<CollectedData>): string {
  let text = step.question;
  const prefillVal = getStepPrefillValue(step.key, prefillData);
  if (prefillVal !== undefined) {
    const hint = (SCORECARD_COPY.PREFILL_HINT || "").replace("__VALUE__", prefillVal);
    text = `${text}\n${hint}`;
  }
  return text;
}

function SiteBotStartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auditId = searchParams.get("auditId");
  const [prefill, setPrefill] = useState<Partial<CollectedData> | undefined>(undefined);
  const fetchedRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: STEPS[0].question }]);
  const [stepIndex, setStepIndex] = useState(0);
  const [collectedData, setCollectedData] = useState<CollectedData>({});
  const [inputValue, setInputValue] = useState("");
  const [phase, setPhase] = useState<Phase>("chat");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [probedKeys, setProbedKeys] = useState<Set<string>>(new Set());
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auditId || !UUID_REGEX.test(auditId) || fetchedRef.current) return;
    fetchedRef.current = true;

    fetch(`/api/site-bot/audit-result?auditId=${encodeURIComponent(auditId)}&withPlace=1`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && data.place) {
          const seeded = seedFromAudit(data.place);
          setPrefill(seeded);
          setCollectedData((prev) => ({ ...prev, ...seeded }));
          setMessages((prev) => {
            if (prev.length === 1 && prev[0].role === "assistant") {
              return [{ role: "assistant", content: getQuestionText(STEPS[0], seeded) }];
            }
            return prev;
          });
        }
      })
      .catch(() => {
        // silent degradation
      });
  }, [auditId]);

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
    const userMsg: Message = { role: "user", content: text };
    setInputValue("");

    // One-shot anti-generic probe: fire at most once per field.
    if (step.detectGeneric && step.probeQuestion && !probedKeys.has(step.key) && step.detectGeneric(text)) {
      setProbedKeys((prev) => new Set(prev).add(step.key));
      setPendingAnswer(text);
      setMessages((prev) => [...prev, userMsg, { role: "assistant", content: step.probeQuestion! }]);
      scrollDown();
      return;
    }

    const finalText = pendingAnswer && step.combine ? step.combine(pendingAnswer, text) : text;
    setPendingAnswer(null);

    const isKeep = text === (SCORECARD_COPY.PREFILL_KEEP_WORD || "").trim();
    const hasPrefill = getStepPrefillValue(step.key, prefill) !== undefined;
    const nextData = isKeep && hasPrefill ? collectedData : step.apply(finalText, collectedData);
    setCollectedData(nextData);

    let nextIndex = stepIndex + 1;
    while (nextIndex < STEPS.length && STEPS[nextIndex].skip?.(nextData)) nextIndex++;

    if (nextIndex < STEPS.length) {
      setMessages((prev) => [...prev, userMsg, { role: "assistant", content: getQuestionText(STEPS[nextIndex], prefill) }]);
      setStepIndex(nextIndex);
      scrollDown();
    } else {
      setMessages((prev) => [
        ...prev,
        userMsg,
        { role: "assistant", content: "מעולה, יש לי כל מה שצריך. עוד רגע נעבור לתשלום מאובטח, ואז האתר שלך ייבנה בזמן אמת." },
      ]);
      scrollDown();
      finish(nextData);
    }
  }

  const visibleSteps = STEPS.filter((s) => !s.skip || !s.skip(collectedData));
  const currentKey = STEPS[stepIndex]?.key;
  const currentVisibleIndex = Math.max(0, visibleSteps.findIndex((s) => s.key === currentKey));
  const isProbing = currentKey ? probedKeys.has(currentKey) && pendingAnswer !== null : false;

  return (
    <section className="wao-section">
      <div className="wao-container" style={{ maxWidth: "640px" }}>
        <h1
          style={{
            fontFamily: "var(--font-rubik), sans-serif",
            fontWeight: 900,
            fontSize: "clamp(1.4rem,3vw,2rem)",
            marginBottom: "16px",
            color: "var(--text)",
          }}
        >
          {renderMixed("Site Bot")} — בונים את האתר שלך בצ׳אט
        </h1>

        {phase === "chat" && (
          <div style={{ display: "flex", gap: "5px", marginBottom: "20px" }} aria-label={`שאלה ${currentVisibleIndex + 1} מתוך ${visibleSteps.length}`}>
            {visibleSteps.map((s, i) => (
              <div
                key={s.key}
                style={{
                  flex: 1,
                  height: "4px",
                  borderRadius: "2px",
                  background: i < currentVisibleIndex ? "var(--accent)" : i === currentVisibleIndex ? "var(--accent)" : "var(--border)",
                  opacity: i === currentVisibleIndex && isProbing ? 0.5 : i === currentVisibleIndex ? 1 : i < currentVisibleIndex ? 1 : 0.5,
                  animation: i === currentVisibleIndex && isProbing ? "wao-pulse 1.2s ease-in-out infinite" : undefined,
                }}
              />
            ))}
          </div>
        )}

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
              {renderMixed(RESEARCH_COPY.progress_truth)}
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
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={scrollDown}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
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
          {renderMixed("בסיום השיחה תועבר לדף תשלום מאובטח. ")}
          <Link href="/site-bot" style={{ color: "var(--accent)" }}>
            חזרה לעמוד Site Bot
          </Link>
        </p>
      </div>
    </section>
  );
}

export default function SiteBotStartPage() {
  return (
    <Suspense fallback={null}>
      <SiteBotStartContent />
    </Suspense>
  );
}
