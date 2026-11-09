"use client";

import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { checkoutInitSessionId, customerErrorText, readJsonBody } from "@/lib/site-bot/checkout/customerError";
import type { CollectedData } from "@/lib/bot/prompts";
import { renderMixed } from "@/lib/bidi";
import { RESEARCH_COPY } from "@/lib/site-bot/researchCopy";
import { seedFromPrefillSnapshot } from "@/lib/site-bot/seedPrefill";
import type { PrefillSnapshot } from "@/lib/site-bot/placePrefill";
import { displayBusinessHours } from "@/lib/lp/businessHours";
import { INTAKE_COPY } from "@/lib/site-bot/intakeCopy";
import { ISRAELI_LOCALITIES } from "@/lib/site-bot/israeliLocalities";
import { MAX_LISTED_SERVED_AREAS, servedAreaCandidates } from "@/lib/site-bot/servedAreas";
import {
  buildIntakeCollectedData,
  emptyIntakeCard,
  INTAKE_CARD_FIELDS,
  INTAKE_REQUIRED_FIELDS,
  INTAKE_SERVICE_MODELS,
  intakeFromSeed,
  intakeQuestions,
  isolateTimeRanges,
  isPrefillRequest,
  missingCardFields,
  stripBidiIsolates,
  travelStepNeedsServiceModel,
  type IntakeAnswers,
  type IntakeCard,
  type IntakeCardField,
  type IntakeEvidence,
  type IntakeQuestionKey,
  type IntakeServiceModel,
} from "@/lib/site-bot/startIntake";

// Site Bot intake, paid-journey v2 M1 (F3/F4, B11). Two steps:
//   A. one confirm card with everything Google already knows (fresh Places read via the
//      flag-gated /api/site-bot/prefill, keyed by the audit's confirmed placeId), each
//      fact editable inline, one confirm action. No pre-fill (no placeId, or a Places
//      failure) -> the same card with empty editable fields.
//   B. at most 3 typed questions, the truth gaps M0 found: priority services, travel
//      boundary / service area (service model first, as buttons, when the card could not
//      infer it), and the differentiator with Tamar's one-shot anti-generic probe.
// Owner name, client fear, years/guarantee, review, contact, hours and slug are no longer
// asked: they are derived from GBP (src/lib/site-bot/startIntake.ts) or dropped.
// Every new string is a slot in src/lib/site-bot/intakeCopy.ts.
// M2b.1g (Yonatan's cap, Eitan's concern): the travel-boundary answer is free text, parsed against the tracked locality
// list (the same parse checkout init runs). The step shows the area hint under the question. When the answer names more
// than MAX_LISTED_SERVED_AREAS towns besides the base city, the answer is not cut behind the owner's back: the reason and
// the swap hint appear inline (aria-live), the text input is disabled (described by the reason), and the parsed towns
// become toggle chips. Once MAX_LISTED_SERVED_AREAS are selected the rest are soft-blocked (aria-disabled, described by the
// reason); un-selecting one frees a slot for another (swap). Send confirms; checkout re-validates the pick
// (servedAreaChoice) against its own parse and keeps every other town in overflow.
//
// Payment: once the questions are done, collected data is handed to
// /api/site-bot/checkout/init and the user is routed to /site-bot/pay/[sessionId],
// which owns charging + triggering research (see that route).

interface Message {
  role: "assistant" | "user";
  content: string;
}

/** M2b.1g: the open area choice (the owner's answer text, the towns it names, the ones he keeps). */
interface AreaChoice {
  text: string;
  candidates: string[];
  selected: string[];
}

function isGenericUsp(text: string): boolean {
  const genericWord = /מקצועי|אמין|איכות|יחס אישי|הכי טוב|הטוב ביותר|מחירים הוגנים|זמינות|ניסיון/;
  const hasConcrete = /\d/.test(text) || /דקות|שעה|שבת|תוך|אחריות|שנה|שנים/.test(text);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return genericWord.test(text) && !hasConcrete && wordCount <= 8;
}

// Tamar's one-shot anti-generic probe on the differentiator (kept from the pre-M1 intake).
// A still-generic second answer is accepted as-is: one nudge, never a loop.
const USP_PROBE = "תפסתי, אבל “מקצועי ואמין” הלקוח שומע מכל אחד. תן לי דבר אחד קונקרטי שאתה עושה אחרת — משהו שמתחרה ממול לא באמת יגיד על עצמו. מספר, זמן תגובה, אחריות, איך אתה עובד בשטח. מה גורם ללקוח להגיד “אה, זה שונה”?";
const DONE_MESSAGE = "מעולה, יש לי כל מה שצריך. עוד רגע נעבור לתשלום מאובטח, ואז האתר שלך ייבנה בזמן אמת.";

const FIELD_LABEL: Record<IntakeCardField, string> = {
  businessName: INTAKE_COPY.M1_FIELD_BUSINESS_NAME,
  businessNiche: INTAKE_COPY.M1_FIELD_NICHE,
  phone: INTAKE_COPY.M1_FIELD_PHONE,
  streetAddress: INTAKE_COPY.M1_FIELD_ADDRESS,
  city: INTAKE_COPY.M1_FIELD_CITY,
  businessHours: INTAKE_COPY.M1_FIELD_HOURS,
  websiteUri: INTAKE_COPY.M1_FIELD_WEBSITE,
};

const SERVICE_MODEL_LABEL: Record<IntakeServiceModel, string> = {
  field: INTAKE_COPY.M1_SERVICE_MODEL_FIELD,
  location: INTAKE_COPY.M1_SERVICE_MODEL_LOCATION,
  mixed: INTAKE_COPY.M1_SERVICE_MODEL_MIXED,
  remote: INTAKE_COPY.M1_SERVICE_MODEL_REMOTE,
};

const REQUIRED: readonly string[] = INTAKE_REQUIRED_FIELDS;

const fieldInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
  padding: "10px 14px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--muted)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "1rem",
};

// M1 a11y: browser autofill hints for the card fields (none for trade or hours).
const FIELD_AUTOCOMPLETE: Partial<Record<IntakeCardField, string>> = {
  businessName: "organization",
  phone: "tel",
  streetAddress: "street-address",
  city: "address-level2",
  websiteUri: "url",
};

function questionText(key: IntakeQuestionKey, card: IntakeCard): string {
  if (key === "priorityServices") return INTAKE_COPY.M1_Q1_PRIORITY_SERVICES;
  if (key === "usp") return INTAKE_COPY.M1_Q3_USP;
  if (travelStepNeedsServiceModel(card)) return INTAKE_COPY.M1_Q2_SERVICE_MODEL;
  return card.serviceModel === "location" ? INTAKE_COPY.M1_Q2_SERVICE_AREA : INTAKE_COPY.M1_Q2_TRAVEL_BOUNDARY;
}

type Phase = "loading" | "card" | "chat" | "routing" | "error";

function SiteBotStartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auditId = searchParams.get("auditId");
  const placeId = searchParams.get("placeId");
  const prefillRequested = isPrefillRequest(auditId, placeId);
  const fetchedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>(prefillRequested ? "loading" : "card");
  const [card, setCard] = useState<IntakeCard>(emptyIntakeCard);
  const [evidence, setEvidence] = useState<IntakeEvidence>({});
  const [prefilled, setPrefilled] = useState(false);
  const [hoursEdited, setHoursEdited] = useState(false);
  const [questions, setQuestions] = useState<IntakeQuestionKey[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [probed, setProbed] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [areaChoice, setAreaChoice] = useState<AreaChoice | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstAreaRef = useRef<HTMLButtonElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!prefillRequested || !auditId || !placeId || fetchedRef.current) return;
    fetchedRef.current = true;
    const query = new URLSearchParams({ auditId, placeId });
    fetch(`/api/site-bot/prefill?${query.toString()}`)
      .then(async (res) => {
        const json = await readJsonBody(res);
        const snapshot = json.snapshot as PrefillSnapshot | undefined;
        if (!res.ok || json.status !== "ready" || !snapshot || typeof snapshot !== "object" || snapshot.placeId !== placeId) return;
        const seeded = intakeFromSeed(seedFromPrefillSnapshot(snapshot));
        setCard(seeded.card);
        setEvidence(seeded.evidence);
        setPrefilled(true);
      })
      .catch(() => {
        // Silent degradation: the card stays empty and editable.
      })
      .finally(() => setPhase((current) => (current === "loading" ? "card" : current)));
  }, [prefillRequested, auditId, placeId]);

  function scrollDown() {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
  }

  const missing = missingCardFields(card);
  const currentKey = phase === "chat" ? questions[stepIndex] : undefined;
  const awaitingChoice = currentKey === "travelBoundary" && travelStepNeedsServiceModel(card);
  const lastAssistantIndex = messages.reduce((found, message, index) => (message.role === "assistant" ? index : found), -1);
  const onTravelStep = currentKey === "travelBoundary" && !awaitingChoice;
  const areaChoiceOpen = areaChoice !== null;

  // M1 a11y: after the card is confirmed and after every new question, focus moves to the
  // answer control (the first service-model button when Q2 asks for it, else the chat input).
  useEffect(() => {
    if (phase !== "chat") return;
    // Deferred one tick so the keystroke that submitted the previous answer never lands on the new control.
    const timer = setTimeout(() => {
      if (awaitingChoice) firstChoiceRef.current?.focus();
      else if (areaChoiceOpen) firstAreaRef.current?.focus();
      else chatInputRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => clearTimeout(timer);
    // M2b.1g: focus moves to the first town chip when the area choice opens, back to the input when it closes.
  }, [phase, stepIndex, awaitingChoice, messages.length, areaChoiceOpen]);

  function fieldValue(field: IntakeCardField): string {
    // Display only: time ranges are isolated LTR so the RTL input shows 08:00-18:00, not 18:00-08:00.
    if (field === "businessHours") return isolateTimeRanges(hoursEdited ? card.businessHours : displayBusinessHours(card.businessHours) ?? card.businessHours);
    return card[field];
  }

  function updateField(field: IntakeCardField, value: string) {
    if (field === "businessHours") setHoursEdited(true);
    // Isolates from the display string never reach the stored value.
    setCard((previous) => ({ ...previous, [field]: stripBidiIsolates(value) }));
  }

  function confirmCard() {
    if (phase !== "card" || missingCardFields(card).length > 0) return;
    const steps = intakeQuestions(card);
    setQuestions(steps);
    setStepIndex(0);
    setMessages([{ role: "assistant", content: questionText(steps[0], card) }]);
    setPhase("chat");
  }

  async function finish(data: CollectedData) {
    setPhase("routing");
    try {
      const res = await fetch("/api/site-bot/checkout/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectedData: data }),
      });
      // M0.5 (B10): a non-2xx, non-JSON or malformed init never navigates to /site-bot/pay/undefined.
      const json = await readJsonBody(res);
      const sessionId = checkoutInitSessionId(res.ok, json);
      if (!sessionId) throw new Error(customerErrorText(json.error, "יצירת התשלום נכשלה"));
      router.push(`/site-bot/pay/${sessionId}`);
    } catch (err: unknown) {
      setErrorMessage(customerErrorText(err instanceof Error ? err.message : undefined, "משהו השתבש"));
      setPhase("error");
    }
  }

  function handleSend() {
    if (areaChoice) {
      confirmAreaChoice();
      return;
    }
    const text = inputValue.trim();
    if (!text || phase !== "chat" || !currentKey || awaitingChoice) return;

    const userMsg: Message = { role: "user", content: text };
    setInputValue("");

    // M2b.1g: more towns than the cap -> the owner picks which ones are listed (never cut behind his back).
    if (currentKey === "travelBoundary") {
      const candidates = servedAreaCandidates(text, card.city, ISRAELI_LOCALITIES);
      if (candidates.length > MAX_LISTED_SERVED_AREAS) {
        setMessages((prev) => [...prev, userMsg]);
        setAreaChoice({ text, candidates, selected: candidates.slice(0, MAX_LISTED_SERVED_AREAS) });
        scrollDown();
        return;
      }
    }

    // One-shot anti-generic probe on the differentiator only.
    if (currentKey === "usp" && !probed && isGenericUsp(text)) {
      setProbed(true);
      setPendingAnswer(text);
      setMessages((prev) => [...prev, userMsg, { role: "assistant", content: USP_PROBE }]);
      scrollDown();
      return;
    }

    const finalText = currentKey === "usp" && pendingAnswer ? `${pendingAnswer}. ${text}` : text;
    setPendingAnswer(null);
    advance({ ...answers, [currentKey]: finalText }, card, userMsg);
  }

  // M2b.1g: a selected town is removed by pressing it again; an unselected one is added only while a slot is free.
  function toggleArea(name: string) {
    setAreaChoice((prev) => {
      if (!prev) return prev;
      if (prev.selected.includes(name)) return { ...prev, selected: prev.selected.filter((item) => item !== name) };
      if (prev.selected.length >= MAX_LISTED_SERVED_AREAS) return prev;
      return { ...prev, selected: [...prev.selected, name] };
    });
  }

  function confirmAreaChoice() {
    if (!areaChoice || areaChoice.selected.length === 0) return;
    const picked = areaChoice.candidates.filter((name) => areaChoice.selected.includes(name));
    setAreaChoice(null);
    advance({ ...answers, travelBoundary: areaChoice.text, servedAreaChoice: picked }, card, { role: "user", content: picked.join(", ") });
  }

  function chooseServiceModel(model: IntakeServiceModel) {
    if (!awaitingChoice) return;
    const nextCard: IntakeCard = { ...card, serviceModel: model };
    setCard(nextCard);
    const userMsg: Message = { role: "user", content: SERVICE_MODEL_LABEL[model] };
    // A remote business has no travel boundary: the choice completes Q2.
    if (model === "remote") {
      advance(answers, nextCard, userMsg);
      return;
    }
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: questionText("travelBoundary", nextCard) }]);
    scrollDown();
  }

  function advance(nextAnswers: IntakeAnswers, nextCard: IntakeCard, userMsg: Message) {
    setAnswers(nextAnswers);
    const nextIndex = stepIndex + 1;
    if (nextIndex < questions.length) {
      setMessages((prev) => [...prev, userMsg, { role: "assistant", content: questionText(questions[nextIndex], nextCard) }]);
      setStepIndex(nextIndex);
      scrollDown();
      return;
    }
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: DONE_MESSAGE }]);
    scrollDown();
    finish(buildIntakeCollectedData(nextCard, evidence, nextAnswers));
  }

  const visibleSteps = questions;
  const currentVisibleIndex = stepIndex;
  const isProbing = currentKey === "usp" && probed && pendingAnswer !== null;

  return (
    <section className="wao-section wao-intake">
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

        {phase === "loading" && (
          <p data-intake-loading="true" style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
            {renderMixed(INTAKE_COPY.M1_PREFILL_LOADING)}
          </p>
        )}

        {phase === "card" && (
          <form
            data-intake-card={prefilled ? "prefilled" : "empty"}
            onSubmit={(e) => {
              e.preventDefault();
              confirmCard();
            }}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              marginBottom: "16px",
              overflowWrap: "anywhere",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.15rem", color: "var(--text)" }}>{renderMixed(INTAKE_COPY.M1_CARD_TITLE)}</h2>
            <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5, color: "var(--muted)" }}>
              {renderMixed(prefilled ? INTAKE_COPY.M1_CARD_INTRO : INTAKE_COPY.M1_CARD_FALLBACK_NOTE)}
            </p>
            {INTAKE_CARD_FIELDS.map((field) => (
              <div key={field} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor={`intake-${field}`} style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>
                  {renderMixed(FIELD_LABEL[field])}
                </label>
                <input
                  id={`intake-${field}`}
                  name={field}
                  type={field === "phone" ? "tel" : field === "websiteUri" ? "url" : "text"}
                  dir={field === "phone" || field === "websiteUri" ? "ltr" : undefined}
                  inputMode={field === "phone" ? "tel" : undefined}
                  autoComplete={FIELD_AUTOCOMPLETE[field]}
                  className="wao-intake-field"
                  required={REQUIRED.includes(field)}
                  aria-invalid={REQUIRED.includes(field) && !card[field].trim() ? true : undefined}
                  aria-describedby={REQUIRED.includes(field) && missing.length > 0 ? "intake-required-hint" : undefined}
                  value={fieldValue(field)}
                  onChange={(e) => updateField(field, e.target.value)}
                  style={fieldInputStyle}
                />
              </div>
            ))}
            {card.serviceModelInferred && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor="intake-serviceModel" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>
                  {renderMixed(INTAKE_COPY.M1_FIELD_SERVICE_MODEL)}
                </label>
                <select
                  id="intake-serviceModel"
                  name="serviceModel"
                  value={card.serviceModel}
                  onChange={(e) => setCard((previous) => ({ ...previous, serviceModel: e.target.value as IntakeServiceModel }))}
                  className="wao-intake-field"
                  style={fieldInputStyle}
                >
                  {INTAKE_SERVICE_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {SERVICE_MODEL_LABEL[model]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div role="status">
              {missing.length > 0 && (
                <p id="intake-required-hint" style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
                  {renderMixed(INTAKE_COPY.M1_CARD_REQUIRED_HINT)}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={missing.length > 0}
              aria-describedby={missing.length > 0 ? "intake-required-hint" : undefined}
              style={{ padding: "12px 24px", justifyContent: "center" }}
            >
              {renderMixed(INTAKE_COPY.M1_CARD_CONFIRM)}
            </button>
          </form>
        )}

        {phase === "chat" && (
          <div style={{ display: "flex", gap: "5px", marginBottom: "20px" }} role="progressbar" aria-valuemin={1} aria-valuemax={visibleSteps.length} aria-valuenow={currentVisibleIndex + 1} aria-label={`שאלה ${currentVisibleIndex + 1} מתוך ${visibleSteps.length}`}>
            {visibleSteps.map((key, i) => (
              <div
                key={key}
                style={{
                  flex: 1,
                  height: "4px",
                  borderRadius: "2px",
                  background: i <= currentVisibleIndex ? "var(--accent)" : "var(--border)",
                  opacity: i === currentVisibleIndex && isProbing ? 0.5 : i <= currentVisibleIndex ? 1 : 0.5,
                  animation: i === currentVisibleIndex && isProbing ? "wao-pulse 1.2s ease-in-out infinite" : undefined,
                }}
              />
            ))}
          </div>
        )}

        {phase !== "loading" && phase !== "card" && (
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
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
              id={`intake-message-${i}`}
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
        )}

        {awaitingChoice && (
          <div role="group" aria-label={INTAKE_COPY.M1_FIELD_SERVICE_MODEL} style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {INTAKE_SERVICE_MODELS.map((model, index) => (
              <button key={model} ref={index === 0 ? firstChoiceRef : undefined} type="button" className="wao-intake-choice" onClick={() => chooseServiceModel(model)}>
                {renderMixed(SERVICE_MODEL_LABEL[model])}
              </button>
            ))}
          </div>
        )}

        {phase === "chat" && onTravelStep && (
          <p id="intake-area-hint" data-intake-area-hint="true" style={{ margin: "0 0 12px", fontSize: "0.9rem", lineHeight: 1.5, color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
            {renderMixed(INTAKE_COPY.M1_Q2_AREA_INTRO_HINT)}
          </p>
        )}

        {phase === "chat" && onTravelStep && (
          <div aria-live="polite" data-intake-area-live="true">
            {areaChoice && (
              <div
                data-intake-area-limit="true"
                style={{ border: "1px solid var(--accent)", borderRadius: "var(--radius-md)", background: "var(--surface)", padding: "12px 16px", marginBottom: "12px", fontFamily: "var(--font-body), sans-serif", lineHeight: 1.5 }}
              >
                <p id="intake-area-limit-reason" style={{ margin: 0, color: "var(--text)" }}>
                  {renderMixed(INTAKE_COPY.M1_Q2_AREA_LIMIT_REASON)}
                </p>
                <p id="intake-area-swap-hint" style={{ margin: "6px 0 0", fontSize: "0.9rem", color: "var(--muted)" }}>
                  {renderMixed(INTAKE_COPY.M1_Q2_AREA_LIMIT_SWAP_HINT)}
                </p>
              </div>
            )}
          </div>
        )}

        {phase === "chat" && onTravelStep && areaChoice && (
          <div
            role="group"
            aria-labelledby="intake-area-limit-reason"
            aria-describedby="intake-area-swap-hint"
            data-intake-area-choice="true"
            style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}
          >
            {areaChoice.candidates.map((name, index) => {
              const selected = areaChoice.selected.includes(name);
              const blocked = !selected && areaChoice.selected.length >= MAX_LISTED_SERVED_AREAS;
              return (
                <button
                  key={name}
                  ref={index === 0 ? firstAreaRef : undefined}
                  type="button"
                  className="wao-intake-choice"
                  aria-pressed={selected}
                  aria-disabled={blocked || undefined}
                  aria-describedby={blocked ? "intake-area-limit-reason" : undefined}
                  data-intake-area-town={selected ? "selected" : blocked ? "blocked" : "free"}
                  onClick={() => toggleArea(name)}
                  style={{
                    minHeight: "44px",
                    minWidth: "44px",
                    background: selected ? "var(--accent)" : "transparent",
                    color: selected ? "#0a0a0a" : "var(--text)",
                    borderStyle: blocked ? "dashed" : "solid",
                    opacity: blocked ? 0.55 : 1,
                    cursor: blocked ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {selected && <span aria-hidden="true">✓</span>}
                  <span>{renderMixed(name)}</span>
                  {selected && <span aria-hidden="true">×</span>}
                </button>
              );
            })}
          </div>
        )}

        {phase === "chat" && !awaitingChoice && (
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              ref={chatInputRef}
              className="wao-intake-field"
              aria-labelledby={lastAssistantIndex >= 0 ? `intake-message-${lastAssistantIndex}` : undefined}
              aria-describedby={onTravelStep ? (areaChoice ? "intake-area-limit-reason intake-area-swap-hint" : "intake-area-hint") : undefined}
              disabled={Boolean(areaChoice)}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={scrollDown}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                // preventDefault stops the same keystroke from clicking the control that receives focus next.
                e.preventDefault();
                handleSend();
              }}
              placeholder="כתוב כאן את התשובה שלך"
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--muted)",
                background: "var(--bg)",
                color: "var(--text)",
                fontFamily: "var(--font-body), sans-serif",
              }}
            />
            <button type="button" onClick={handleSend} className="btn-primary" disabled={areaChoice !== null && areaChoice.selected.length === 0} style={{ padding: "12px 24px", minHeight: "44px" }}>
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
