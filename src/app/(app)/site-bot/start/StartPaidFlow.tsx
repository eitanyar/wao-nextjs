"use client";

import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { customerErrorText, readJsonBody } from "@/lib/site-bot/checkout/customerError";
import { browserSiteBotTracking, trackInterviewStarted } from "@/lib/tracking/siteBotConversions";
import { renderMixed } from "@/lib/bidi";
import { RESEARCH_COPY } from "@/lib/site-bot/researchCopy";
import { seedFromPrefillSnapshot } from "@/lib/site-bot/seedPrefill";
import type { PrefillSnapshot } from "@/lib/site-bot/placePrefill";
import { displayBusinessHours } from "@/lib/lp/businessHours";
import { INTAKE_COPY } from "@/lib/site-bot/intakeCopy";
import { INTAKE_OWNER_COPY } from "@/lib/site-bot/intakeOwnerCopy";
import { DOMAIN_CHOICES, mobilePrefillFromListing, normalizeIsraeliMobile, normalizeOwnerDomain, normalizeOwnerEmail, type DomainChoice, type OwnerDomainRejection, type OwnerIntakeAnswers } from "@/lib/site-bot/ownerIntake";
import { startVoiceNote, VOICE_NOTE_CONTROL_LABELS, voiceNoteStepAvailable, type VoiceNoteRecording } from "@/lib/site-bot/voiceNote";
import { ISRAELI_LOCALITIES } from "@/lib/site-bot/israeliLocalities";
import { MAX_LISTED_SERVED_AREAS, servedAreaCandidates } from "@/lib/site-bot/servedAreas";
import { chatBubbleDir } from "@/lib/site-bot/chatBubbleDir";
import { SITE_BOT_STEP2A_COPY as STEP2A_COPY } from "@/lib/site-bot/step2aCopy.generated";
import { SITE_BOT_STEP2B_COPY as STEP2B_COPY } from "@/lib/site-bot/step2bCopy.generated";
import { SITE_BOT_POSTPAY_COPY as POSTPAY_COPY } from "@/lib/site-bot/postPayCopy.generated";
import {
  INTERVIEW_QUESTION_KEYS,
  isPriceChipId,
  MAX_INTERVIEW_ANSWER_CHARS,
  PRICE_CHIP_COPY_KEY,
  PRICE_CHIP_IDS,
  QUESTION_COPY_KEY,
  QUESTION_HINT_COPY_KEY,
  type InterviewQuestionsView,
  type PriceChipId,
} from "@/lib/site-bot/interviewQuestions";
import { FACT_TYPE_COPY_KEY, INTERVIEW_FACT_TYPES, MAX_OWNER_TEXT_CHARS, type InterviewFact } from "@/lib/site-bot/interviewFacts";
import { researchGateCopyKey } from "@/lib/site-bot/research/gatePresentation";
import type { ResearchGateType } from "@/lib/site-bot/research/gates";
import {
  isWorkLocationTrade,
  WORK_LOCATION_OPTION_KEY,
  WORK_LOCATION_OPTIONS,
  WORK_LOCATION_QUESTION_KEY,
  type WorkLocation,
  type WorkLocationTrade,
} from "@/lib/site-bot/workLocation";
import { CREDENTIALS_COPY, credentialTier, licenseQuestionCopy, showsLicenseQuestions, WARRANTY_CHOICE_COPY_KEY, WARRANTY_CHOICES, type CredentialsAnswers } from "@/lib/site-bot/credentialsCopy";
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
// Owner name, client fear, review, contact, hours and slug are no longer asked: they are
// derived from GBP (src/lib/site-bot/startIntake.ts) or dropped. Years / licence / warranty come
// from the optional credentials step after the questions (2026-11-10).
// Every new string is a slot in src/lib/site-bot/intakeCopy.ts.
// M2b.1g (Yonatan's cap, Eitan's concern): the travel-boundary answer is free text, parsed against the tracked locality
// list (the same parse checkout init runs). The step shows the area hint under the question. When the answer names more
// than MAX_LISTED_SERVED_AREAS towns besides the base city, the answer is not cut behind the owner's back: the reason and
// the swap hint appear inline (aria-live), the text input is disabled (described by the reason), and the parsed towns
// become toggle chips. Once MAX_LISTED_SERVED_AREAS are selected the rest are soft-blocked (aria-disabled, described by the
// reason); un-selecting one frees a slot for another (swap). Send confirms; checkout re-validates the pick
// (servedAreaChoice) against its own parse and keeps every other town in overflow.
//
// Launch step 1 (2026-11-12): after credentials come two required steps, the owner's own contact (mobile, pre-filled from
// the listing phone only when it is a mobile, and email) and the domain question (yes + domain / no / not sure). Both are
// validated in src/lib/site-bot/ownerIntake.ts and land on collectedData as ownerContact / domainChoice / ownerDomain,
// apart from the public business phone. Their strings are slots in src/lib/site-bot/intakeOwnerCopy.ts.
//
// Step 2a (2026-11-25, docs/missions/site-bot-step2-interview-preview-2026-11-25.md): the interview is a server-side
// session (POST /api/site-bot/interview-start sets its httpOnly cookie). The browser saves its step snapshot to the
// session while it answers (POST /api/site-bot/interview-step { step: 'progress' }), so a reload resumes where it stopped.
// The contact step sends the record to the session (research starts there, in the background, unless the work-location
// question is asked), the domain step merges the domain answer, and tutors / photographers / solar suppliers then answer
// the work-location question (src/lib/site-bot/workLocation.ts): studio-only or online-only exits to the waiting list.
// The flow then stops on the holding screen. Payment moves after the interview and the home-page preview (steps 2b / 2c);
// this page no longer calls the checkout init route (2c hands the confirmed session to checkout).
//
// Step 2b (2026-11-25): HOLDING_CTA starts interview v1 in the same session: five questions, one per screen
// (src/lib/site-bot/interviewQuestions.ts; the server applies every answer, so a reload resumes on the same question,
// and shows the vague-answer probe at most once per question), then the open owner research gates (interview-gates,
// once the research settled; the holding text is the waiting state), then the confirm-facts screen (interview-facts,
// src/lib/site-bot/interviewFactsFlow.ts). FACTS_DONE lands on the holding text until 2c adds the home-page preview.
// Every new string comes from src/lib/site-bot/step2bCopy.generated.ts (waocopy).

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
  minHeight: "44px",
  padding: "10px 14px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--muted)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "1rem",
};

// Launch step 1: the owner-contact and domain step cards (same look as the credentials step).
const ownerStepStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  background: "var(--surface)",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  marginBottom: "16px",
  fontFamily: "var(--font-body), sans-serif",
  overflowWrap: "anywhere",
};
const ownerHeadingStyle: CSSProperties = { margin: 0, fontSize: "1rem", fontWeight: 600, lineHeight: 1.5, color: "var(--text)" };
const ownerLabelStyle: CSSProperties = { fontSize: "0.92rem", fontWeight: 600, color: "var(--text)" };
const ownerNoteStyle: CSSProperties = { margin: 0, fontSize: "0.88rem", lineHeight: 1.5, color: "var(--muted)" };
const ownerErrorStyle: CSSProperties = { margin: 0, fontSize: "0.88rem", lineHeight: 1.5, color: "#e05555" };

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

// "credentials" is the optional, skippable credentials step right after the 3 questions (years, licence for licensed
// trades only, warranty chips; src/lib/site-bot/credentialsCopy.ts). Its answers reach checkout init through
// buildIntakeCollectedData (yearsInField / license / guarantee).
// Content depth: "voice" is the optional voice-note step after the 3 questions. voiceNoteStepAvailable() is false
// (src/lib/site-bot/voiceNote.ts: no safe storage / transcription / control labels yet), so the flow never enters it today.
// Step 2a: "location" (work-location question), "holding" (after the owner steps), "exited" (location exit, waiting list)
// and "expired" (the spot was released after 72 h) come from the interview session.
// Step 2b: "questions" (interview v1), "gates" (owner research gates), "facts" (confirm facts), "facts_confirmed"
// (2c adds the preview there) and "elsewhere" (the session is open in another browser).
type Phase = "loading" | "card" | "chat" | "credentials" | "contact" | "domain" | "location" | "holding" | "questions" | "gates" | "facts" | "facts_confirmed" | "exited" | "expired" | "elsewhere" | "voice" | "routing" | "error";

/** The error fallback of a failed interview request (the same text the checkout handoff used). */
const STEP_ERROR_FALLBACK = "משהו השתבש";

/** How often the gates step asks whether the research settled, and the facts step whether the extraction finished. */
const RESEARCH_POLL_MS = 8000;
const FACTS_POLL_MS = 3000;

/** The browser's step snapshot saved on the interview session (resume only; the server never trusts it). */
interface IntakeProgress {
  v: 1;
  phase: "chat" | "credentials" | "contact";
  card: IntakeCard;
  evidence: IntakeEvidence;
  prefilled: boolean;
  hoursEdited: boolean;
  questions: IntakeQuestionKey[];
  stepIndex: number;
  answers: IntakeAnswers;
  messages: Message[];
  probed: boolean;
  pendingAnswer: string | null;
  credentials: CredentialsAnswers;
  credentialsCard: IntakeCard | null;
}

function isIntakeProgress(value: unknown): value is IntakeProgress {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<IntakeProgress>;
  return p.v === 1 && (p.phase === "chat" || p.phase === "credentials" || p.phase === "contact")
    && Boolean(p.card) && typeof p.card === "object" && Array.isArray(p.questions) && Array.isArray(p.messages)
    && typeof p.stepIndex === "number" && Boolean(p.answers) && typeof p.answers === "object";
}

interface InterviewSessionView {
  phase: "intake" | "domain" | "location" | "holding" | "questions" | "gates" | "facts" | "facts_confirmed" | "exited" | "expired" | "paid" | "superseded";
  progress: unknown;
  locationTrade: WorkLocationTrade | null;
  workLocation: WorkLocation | null;
  questions: InterviewQuestionsView | null;
  researchReady: boolean;
}

function questionsViewOf(value: unknown): InterviewQuestionsView | null {
  if (!value || typeof value !== "object") return null;
  const view = value as Partial<InterviewQuestionsView>;
  if (typeof view.index !== "number" || (view.key !== null && !(INTERVIEW_QUESTION_KEYS as readonly unknown[]).includes(view.key))) return null;
  return {
    pass: view.pass === 2 ? 2 : 1,
    index: view.index,
    key: view.key ?? null,
    probing: view.probing === true,
    drafts: view.drafts && typeof view.drafts === "object" ? view.drafts : {},
    chips: Array.isArray(view.chips) ? view.chips.filter(isPriceChipId) : [],
  };
}

function sessionViewOf(value: unknown): InterviewSessionView | null {
  if (!value || typeof value !== "object") return null;
  const view = value as Partial<InterviewSessionView>;
  return typeof view.phase === "string"
    ? {
        phase: view.phase, progress: view.progress ?? null, locationTrade: isWorkLocationTrade(view.locationTrade) ? view.locationTrade : null,
        workLocation: view.workLocation ?? null, questions: questionsViewOf(view.questions), researchReady: view.researchReady === true,
      }
    : null;
}

/** One open owner gate (interview-gates list). */
interface OwnerGate {
  id: string;
  type: ResearchGateType;
  evidenceDigest: string;
}

/** One fact as the confirm-facts screen gets it (interview-facts). */
interface FactItem extends InterviewFact {
  serviceName?: string;
  contextLabel?: string;
}

interface FactsScreen {
  facts: FactItem[];
  empty: boolean;
  canReturn: boolean;
  canFinish: boolean;
}

async function postInterviewJson(url: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await readJsonBody(res);
  return { ok: res.ok, status: res.status, json };
}

function factsScreenOf(json: Record<string, unknown>): FactsScreen | null {
  if (!Array.isArray(json.facts)) return null;
  return { facts: json.facts as FactItem[], empty: json.empty === true, canReturn: json.canReturn === true, canFinish: json.canFinish === true };
}

async function postInterviewStep(body: Record<string, unknown>): Promise<{ ok: boolean; status?: string; session: InterviewSessionView | null }> {
  const res = await fetch("/api/site-bot/interview-step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await readJsonBody(res);
  return { ok: res.ok, status: typeof json.status === "string" ? json.status : undefined, session: sessionViewOf(json.session) };
}

/** Each line of a multi-line copy string as its own paragraph. */
function copyLines(text: string): string[] {
  return text.split("\n").filter((line) => line.trim() !== "");
}

const DOMAIN_CHOICE_LABEL: Record<DomainChoice, string> = {
  has_domain: INTAKE_OWNER_COPY.domainChoiceYes,
  no_domain: INTAKE_OWNER_COPY.domainChoiceNo,
  not_sure: INTAKE_OWNER_COPY.domainChoiceNotSure,
};

/** The error slot for a rejected domain ('empty' never shows: the field is required only after "yes"). */
function domainErrorText(reason: OwnerDomainRejection): string {
  return reason === "subdomain" ? INTAKE_OWNER_COPY.domainSubdomain : INTAKE_OWNER_COPY.domainInvalid;
}

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
  const [recording, setRecording] = useState<VoiceNoteRecording | null>(null);
  const [credentials, setCredentials] = useState<CredentialsAnswers>({});
  const [credentialsCard, setCredentialsCard] = useState<IntakeCard | null>(null);
  const credentialsHeadingRef = useRef<HTMLHeadingElement>(null);
  const [owner, setOwner] = useState<OwnerIntakeAnswers>({});
  const [mobilePrefilled, setMobilePrefilled] = useState(false);
  const [contactErrors, setContactErrors] = useState<{ mobile: boolean; email: boolean }>({ mobile: false, email: false });
  const [domainError, setDomainError] = useState<OwnerDomainRejection | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [locationTrade, setLocationTrade] = useState<WorkLocationTrade | null>(null);
  const [locationChoice, setLocationChoice] = useState<WorkLocation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Step 2b: interview v1, owner gates, confirm facts.
  const [questionsView, setQuestionsView] = useState<InterviewQuestionsView | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");
  const [chipDraft, setChipDraft] = useState<PriceChipId[]>([]);
  const [researchReady, setResearchReady] = useState(false);
  const [gates, setGates] = useState<OwnerGate[] | null>(null);
  const [gateIndex, setGateIndex] = useState(0);
  const [gateDraft, setGateDraft] = useState("");
  const [gateError, setGateError] = useState(false);
  const [factsScreen, setFactsScreen] = useState<FactsScreen | null>(null);
  const [editingFact, setEditingFact] = useState<string | null>(null);
  const [factEdit, setFactEdit] = useState("");
  const ownerHeadingRef = useRef<HTMLHeadingElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const domainInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstAreaRef = useRef<HTMLButtonElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);

  /** Restores the session's phase (and, inside the intake, this browser's saved snapshot). True when it resumed. */
  function resumeFrom(view: InterviewSessionView): boolean {
    if (view.locationTrade) setLocationTrade(view.locationTrade);
    if (view.phase === "domain" || view.phase === "location" || view.phase === "holding" || view.phase === "facts" || view.phase === "facts_confirmed") {
      setPhase(view.phase);
      return true;
    }
    if (view.phase === "questions" && view.questions) {
      showQuestions(view.questions);
      return true;
    }
    if (view.phase === "gates") {
      setResearchReady(view.researchReady);
      setGates(null);
      setPhase("gates");
      return true;
    }
    if (view.phase === "intake" && isIntakeProgress(view.progress)) {
      const saved = view.progress;
      setCard(saved.card);
      setEvidence(saved.evidence ?? {});
      setPrefilled(Boolean(saved.prefilled));
      setHoursEdited(Boolean(saved.hoursEdited));
      setQuestions(saved.questions);
      setStepIndex(saved.stepIndex);
      setAnswers(saved.answers);
      setMessages(saved.messages);
      setProbed(Boolean(saved.probed));
      setPendingAnswer(saved.pendingAnswer ?? null);
      setCredentials(saved.credentials ?? {});
      setCredentialsCard(saved.credentialsCard ?? null);
      if (saved.phase === "contact" && saved.credentialsCard) {
        const prefill = mobilePrefillFromListing(saved.credentialsCard.phone);
        setOwner((prev) => ({ ...prev, mobile: prev.mobile ?? prefill }));
        setMobilePrefilled(prefill !== "");
      }
      setPhase(saved.phase);
      return true;
    }
    return false;
  }

  useEffect(() => {
    if (!prefillRequested || !auditId || !placeId || fetchedRef.current) return;
    fetchedRef.current = true;
    const query = new URLSearchParams({ auditId, placeId });
    // Launch step 1: claim the interview spot on the server first (POST /api/site-bot/interview-start). Anything but
    // started / resumed (cap full, not eligible, gate closed, network) goes back to the audit result, which shows the
    // owner his waiting list or block. site_bot_interview_started fires only on a fresh claim, once.
    const fallback = `/site-bot/audit?${query.toString()}`;
    let claimed = false;
    let resumed = false;
    fetch("/api/site-bot/interview-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auditId, placeId }),
    })
      .then(async (res) => {
        const json = await readJsonBody(res);
        const view = sessionViewOf(json.session);
        // Step 2a: this browser's session for this check already ended (location exit / 72 h expiry): show its end state,
        // never a fresh start.
        if (res.ok && json.status === "closed" && view && (view.phase === "exited" || view.phase === "expired")) {
          setPhase(view.phase);
          return false;
        }
        // Step 2b: the session is open in another browser (after its contact step): say so, never bounce to the audit.
        if (res.status === 409 && json.status === "elsewhere") {
          setPhase("elsewhere");
          return false;
        }
        if (res.ok && (json.status === "started" || json.status === "resumed") && view) {
          if (json.status === "started") {
            const tracking = browserSiteBotTracking();
            if (tracking) trackInterviewStarted(tracking, { auditId, placeId });
          }
          claimed = true;
          setSessionReady(true);
          resumed = resumeFrom(view);
          return !resumed;
        }
        const target = typeof json.redirect === "string" && json.redirect.startsWith("/site-bot/audit") ? json.redirect : fallback;
        router.replace(target);
        return false;
      }, () => {
        router.replace(fallback);
        return false;
      })
      .then((started) => (started ? fetch(`/api/site-bot/prefill?${query.toString()}`) : null))
      .then(async (res) => {
        if (!res) return;
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
      // Not claimed: stay on the loading state while the router leaves for the audit result (the card never flashes).
      .finally(() => { if (claimed && !resumed) setPhase((current) => (current === "loading" ? "card" : current)); });
    // One-shot (fetchedRef): resumeFrom only sets state; step 2b's showQuestions made the linter see it as a changing dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillRequested, auditId, placeId, router]);

  // Step 2a: the browser's step snapshot goes to the interview session at every step of the intake, so a reload (or the
  // reminder link) resumes here. Fire-and-forget: a failed save only costs the resume point.
  useEffect(() => {
    if (!sessionReady || (phase !== "chat" && phase !== "credentials" && phase !== "contact")) return;
    const progress: IntakeProgress = {
      v: 1, phase, card, evidence, prefilled, hoursEdited, questions, stepIndex, answers, messages, probed, pendingAnswer,
      credentials, credentialsCard,
    };
    postInterviewStep({ step: "progress", progress }).catch(() => undefined);
    // Saved on step changes only (not on every keystroke of a draft answer).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, phase, stepIndex, messages.length]);

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

  // The credentials step takes focus when it opens (its heading, so a screen reader reads the intro first).
  useEffect(() => {
    if (phase !== "credentials") return;
    const timer = setTimeout(() => credentialsHeadingRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [phase]);

  const questionIndex = questionsView?.index;
  const questionProbing = questionsView?.probing;
  const gatesListed = gates !== null;
  const factsLoaded = factsScreen !== null;

  // The contact and domain steps take focus on their heading when they open, like the credentials step.
  useEffect(() => {
    if (phase !== "contact" && phase !== "domain" && phase !== "location" && phase !== "holding" && phase !== "exited" && phase !== "expired"
      && phase !== "questions" && phase !== "gates" && phase !== "facts" && phase !== "facts_confirmed" && phase !== "elsewhere") return;
    // Touch users get no focus-scroll, so bring the step's top into view explicitly (scroll-padding keeps it off the banner).
    const timer = setTimeout(() => {
      ownerHeadingRef.current?.focus();
      ownerHeadingRef.current?.scrollIntoView({ block: "start" });
    }, 0);
    return () => clearTimeout(timer);
    // Step 2b: every new question, the probe, each gate and the facts loading -> list switch move focus to the heading too.
  }, [phase, questionIndex, questionProbing, gateIndex, gatesListed, factsLoaded]);

  // Step 2b, gates step: until the research settled, poll the session status (the holding text is the waiting state);
  // then list the open owner gates once. No gates -> straight on to the facts.
  useEffect(() => {
    if (phase !== "gates" || gates !== null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const listGates = async () => {
      const result = await postInterviewJson("/api/site-bot/interview-gates", { action: "list" });
      if (cancelled) return;
      if (result.status === 409 && result.json.error === "research_pending") { setResearchReady(false); timer = setTimeout(check, RESEARCH_POLL_MS); return; }
      if (!result.ok || !Array.isArray(result.json.gates)) throw new Error("gates");
      const listed = result.json.gates as OwnerGate[];
      setGateIndex(0);
      setGateDraft("");
      setGateError(false);
      if (listed.length === 0) { await finishGates(); return; }
      setGates(listed);
    };
    const check = async () => {
      try {
        if (!researchReady) {
          const status = await postInterviewStep({ step: "status" });
          if (cancelled) return;
          if (!status.ok || !status.session) throw new Error("status");
          if (!status.session.researchReady) { timer = setTimeout(check, RESEARCH_POLL_MS); return; }
          setResearchReady(true);
        }
        await listGates();
      } catch {
        if (cancelled) return;
        setErrorMessage(customerErrorText(undefined, STEP_ERROR_FALLBACK));
        setPhase("error");
      }
    };
    void check();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
    // finishGates is stable enough for this one-shot effect (it only posts and sets the phase).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, gates, researchReady]);

  // Step 2b, facts step: load the fact set (the server extracts it once); while another request extracts, poll.
  useEffect(() => {
    if ((phase !== "facts" && phase !== "facts_confirmed") || factsScreen !== null) return;
    if (phase === "facts_confirmed") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const result = await postInterviewJson("/api/site-bot/interview-facts", { action: "load" });
        if (cancelled) return;
        if (result.status === 409 && result.json.error === "extracting") { timer = setTimeout(load, FACTS_POLL_MS); return; }
        const screen = result.ok ? factsScreenOf(result.json) : null;
        if (!screen) throw new Error("facts");
        setFactsScreen(screen);
      } catch {
        if (cancelled) return;
        setErrorMessage(customerErrorText(undefined, STEP_ERROR_FALLBACK));
        setPhase("error");
      }
    };
    void load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [phase, factsScreen]);

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
    // The optional credentials step comes next (skippable); it builds the collected data when it closes.
    setMessages((prev) => [...prev, userMsg]);
    setCredentialsCard(nextCard);
    setCredentials({});
    setPhase("credentials");
    scrollDown();
  }

  /** Leaves the credentials step: skip = no credentials (nothing written), continue = the answers given. */
  function finishCredentialsStep(skip: boolean) {
    if (phase !== "credentials" || !credentialsCard) return;
    const nextAnswers: IntakeAnswers = skip ? answers : { ...answers, credentials };
    setAnswers(nextAnswers);
    // Launch step 1: the owner-contact step is next. The listing phone pre-fills the mobile only when it is a mobile.
    const prefill = mobilePrefillFromListing(credentialsCard.phone);
    setOwner((prev) => ({ ...prev, mobile: prev.mobile ?? prefill }));
    setMobilePrefilled(owner.mobile === undefined && prefill !== "");
    setContactErrors({ mobile: false, email: false });
    setPhase("contact");
  }

  /** Contact step: both fields required and valid; the first invalid field takes focus. */
  function submitContact() {
    if (phase !== "contact") return;
    const errors = { mobile: !normalizeIsraeliMobile(owner.mobile), email: !normalizeOwnerEmail(owner.email) };
    setContactErrors(errors);
    if (errors.mobile) { mobileInputRef.current?.focus(); return; }
    if (errors.email) { emailInputRef.current?.focus(); return; }
    if (!credentialsCard || submitting) return;
    // Step 2a: the record goes to the interview session now (research starts in the background unless the work-location
    // question is asked). The domain answer follows in the next step.
    const data = buildIntakeCollectedData(credentialsCard, evidence, { ...answers, owner: { mobile: owner.mobile, email: owner.email } });
    setSubmitting(true);
    postInterviewStep({ step: "contact", collectedData: data })
      .then((result) => {
        if (!result.ok || !result.session) throw new Error("contact");
        setLocationTrade(result.session.locationTrade);
        setDomainError(null);
        setPhase("domain");
      })
      .catch(() => {
        setErrorMessage(customerErrorText(undefined, STEP_ERROR_FALLBACK));
        setPhase("error");
      })
      .finally(() => setSubmitting(false));
  }

  /** Domain step: a choice is required; "yes" also needs a registrable domain. Then the record is built. */
  function submitDomain() {
    if (phase !== "domain" || !owner.domainChoice || submitting) return;
    if (owner.domainChoice === "has_domain") {
      const result = normalizeOwnerDomain(owner.domain);
      if (!result.ok) {
        setDomainError(result.reason);
        domainInputRef.current?.focus();
        return;
      }
    }
    setSubmitting(true);
    postInterviewStep({ step: "domain", owner: { domainChoice: owner.domainChoice, domain: owner.domain } })
      .then((result) => {
        if (!result.ok || !result.session) throw new Error("domain");
        setCredentialsCard(null);
        if (result.session.phase === "location" && result.session.locationTrade) {
          setLocationTrade(result.session.locationTrade);
          setLocationChoice(null);
          setPhase("location");
          return;
        }
        afterOwnerSteps();
      })
      .catch(() => {
        setErrorMessage(customerErrorText(undefined, STEP_ERROR_FALLBACK));
        setPhase("error");
      })
      .finally(() => setSubmitting(false));
  }

  /** Step 2a: the work-location answer. OWN_PLACE / ONLINE end the interview (waiting list); HOME / MIX continue. */
  function submitLocation() {
    if (phase !== "location" || !locationChoice || submitting) return;
    setSubmitting(true);
    postInterviewStep({ step: "location", workLocation: locationChoice })
      .then((result) => {
        if (!result.ok || !result.session) throw new Error("location");
        if (result.status === "exited") {
          setPhase("exited");
          return;
        }
        afterOwnerSteps();
      })
      .catch(() => {
        setErrorMessage(customerErrorText(undefined, STEP_ERROR_FALLBACK));
        setPhase("error");
      })
      .finally(() => setSubmitting(false));
  }

  function afterOwnerSteps() {
    // Content depth: the optional voice note, only when it is available (it is off; see voiceNote.ts).
    if (voiceNoteStepAvailable(typeof window === "undefined" ? {} : { MediaRecorder: window.MediaRecorder, mediaDevices: navigator.mediaDevices })) {
      setMessages((prev) => [...prev, { role: "assistant", content: INTAKE_COPY.M1_VOICE_NOTE_PROMPT }]);
      setPhase("voice");
      scrollDown();
      return;
    }
    setPhase("holding");
  }

  // Content depth: leaves the voice-note step. The recording is never uploaded or stored (no safe path yet).
  function finishVoiceStep() {
    if (phase !== "voice") return;
    setPhase("holding");
  }

  async function toggleVoiceRecording() {
    if (phase !== "voice") return;
    if (recording) {
      setRecording(null);
      await recording.stop();
      finishVoiceStep();
      return;
    }
    try {
      setRecording(await startVoiceNote());
    } catch {
      // Microphone refused or unavailable: the step stays skippable.
    }
  }

  // ---- Step 2b: interview v1 -------------------------------------------------------------------------------------

  /** Shows a question screen from the server's view (pre-filling his own earlier answer; the probe screen starts empty). */
  function showQuestions(view: InterviewQuestionsView) {
    setQuestionsView(view);
    setAnswerDraft(view.probing || !view.key || view.key === "priceStyle" ? "" : view.drafts[view.key] ?? "");
    setChipDraft(view.chips);
    setPhase("questions");
  }

  /** Moves on from a step-2b server view (questions -> gates -> facts). */
  function followView(view: InterviewSessionView) {
    if (view.phase === "questions" && view.questions) { showQuestions(view.questions); return; }
    if (view.phase === "gates") { setResearchReady(view.researchReady); setGates(null); setPhase("gates"); return; }
    if (view.phase === "facts") { setFactsScreen(null); setPhase("facts"); return; }
    if (view.phase === "facts_confirmed") { setPhase("facts_confirmed"); return; }
    throw new Error("phase");
  }

  function stepFailed() {
    setErrorMessage(customerErrorText(undefined, STEP_ERROR_FALLBACK));
    setPhase("error");
  }

  function beginQuestions() {
    if (phase !== "holding" || submitting) return;
    setSubmitting(true);
    postInterviewStep({ step: "questions_begin" })
      .then((result) => {
        if (!result.ok || !result.session) throw new Error("questions_begin");
        followView(result.session);
      })
      .catch(stepFailed)
      .finally(() => setSubmitting(false));
  }

  function submitAnswer(skip: boolean) {
    const key = questionsView?.key;
    if (phase !== "questions" || !key || submitting) return;
    const body: Record<string, unknown> = { step: "answer", key };
    if (skip) body.skip = true;
    else if (key === "priceStyle") body.chips = chipDraft;
    else body.text = answerDraft.trim();
    if (!skip && key !== "priceStyle" && !answerDraft.trim()) return;
    if (!skip && key === "priceStyle" && chipDraft.length === 0) return;
    setSubmitting(true);
    postInterviewStep(body)
      .then((result) => {
        // ok, or out_of_order (a second tab or a double submit won): both carry the state the server kept.
        if (!result.session) throw new Error("answer");
        followView(result.session);
      })
      .catch(() => {
        // Re-read the session state once; an out_of_order reply still carries the winning view.
        postInterviewStep({ step: "status" })
          .then((status) => { if (!status.ok || !status.session) throw new Error("status"); followView(status.session); })
          .catch(stepFailed);
      })
      .finally(() => setSubmitting(false));
  }

  function toggleChip(chip: PriceChipId) {
    setChipDraft((prev) => (prev.includes(chip) ? prev.filter((item) => item !== chip) : PRICE_CHIP_IDS.filter((id) => id === chip || prev.includes(id))));
  }

  // ---- Step 2b: owner research gates -----------------------------------------------------------------------------

  async function finishGates() {
    const result = await postInterviewStep({ step: "gates_done" });
    if (!result.ok || !result.session) throw new Error("gates_done");
    followView(result.session);
  }

  function nextGate() {
    if (!gates) return;
    setGateDraft("");
    setGateError(false);
    if (gateIndex + 1 < gates.length) { setGateIndex(gateIndex + 1); return; }
    setSubmitting(true);
    finishGates().catch(stepFailed).finally(() => setSubmitting(false));
  }

  function submitGate(skip: boolean) {
    const gate = gates?.[gateIndex];
    if (phase !== "gates" || !gate || submitting) return;
    if (skip) { nextGate(); return; }
    if (!gateDraft.trim()) return;
    setSubmitting(true);
    setGateError(false);
    postInterviewJson("/api/site-bot/interview-gates", { action: "answer", gateId: gate.id, evidenceDigest: gate.evidenceDigest, text: gateDraft.trim() })
      .then((result) => {
        // A gate closed meanwhile (answered in another tab) needs no second answer.
        if (!result.ok && result.json.error !== "gate_closed") throw new Error("gate");
        setSubmitting(false);
        nextGate();
      })
      .catch(() => { setGateError(true); setSubmitting(false); });
  }

  // ---- Step 2b: confirm facts ------------------------------------------------------------------------------------

  function reviewFactItem(factId: string, decision: "confirm" | "remove" | "fix", text?: string) {
    if (phase !== "facts" || submitting) return;
    setSubmitting(true);
    postInterviewJson("/api/site-bot/interview-facts", { action: "review", factId, decision, ...(text === undefined ? {} : { text }) })
      .then((result) => {
        const screen = result.ok ? factsScreenOf(result.json) : null;
        if (!screen) throw new Error("review");
        setFactsScreen(screen);
        setEditingFact(null);
        setFactEdit("");
      })
      .catch(stepFailed)
      .finally(() => setSubmitting(false));
  }

  function finishFacts() {
    if (phase !== "facts" || !factsScreen?.canFinish || submitting) return;
    setSubmitting(true);
    postInterviewJson("/api/site-bot/interview-facts", { action: "done" })
      .then((result) => {
        if (!result.ok || result.json.phase !== "facts_confirmed") throw new Error("done");
        setPhase("facts_confirmed");
      })
      .catch(stepFailed)
      .finally(() => setSubmitting(false));
  }

  function returnToQuestions() {
    if (phase !== "facts" || !factsScreen?.canReturn || submitting) return;
    setSubmitting(true);
    postInterviewJson("/api/site-bot/interview-facts", { action: "return" })
      .then(async (result) => {
        if (!result.ok) throw new Error("return");
        setFactsScreen(null);
        const status = await postInterviewStep({ step: "status" });
        if (!status.ok || !status.session) throw new Error("status");
        followView(status.session);
      })
      .catch(stepFailed)
      .finally(() => setSubmitting(false));
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

        {phase !== "loading" && phase !== "card" && phase !== "holding" && phase !== "exited" && phase !== "expired"
          && phase !== "questions" && phase !== "gates" && phase !== "facts" && phase !== "facts_confirmed" && phase !== "elsewhere"
          && (messages.length > 0 || phase === "error" || phase === "routing") && (
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface)",
            padding: "20px",
            // Maya: the last bubble scrolls clear of the floating accessibility button.
            paddingBottom: "56px",
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
              dir={chatBubbleDir(m.content)}
              data-intake-message-role={m.role}
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
            <div role="alert" style={{ color: "#e05555", fontFamily: "var(--font-body), sans-serif", padding: "0 4px" }}>
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

        {phase === "credentials" && credentialsCard && (
          <form
            data-intake-credentials="true"
            aria-labelledby="intake-credentials-intro"
            onSubmit={(e) => {
              e.preventDefault();
              finishCredentialsStep(false);
            }}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginBottom: "16px",
              fontFamily: "var(--font-body), sans-serif",
              overflowWrap: "anywhere",
            }}
          >
            <h2 id="intake-credentials-intro" ref={credentialsHeadingRef} tabIndex={-1} style={{ margin: 0, fontSize: "1rem", fontWeight: 600, lineHeight: 1.5, color: "var(--text)" }}>
              {renderMixed(CREDENTIALS_COPY.stepIntro)}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="intake-credentials-years" style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text)" }}>
                {renderMixed(CREDENTIALS_COPY.yearsQuestion)}
              </label>
              <input
                id="intake-credentials-years"
                name="yearsInField"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                className="wao-intake-field"
                placeholder={CREDENTIALS_COPY.yearsPlaceholder}
                value={credentials.years ?? ""}
                onChange={(e) => setCredentials((prev) => ({ ...prev, years: e.target.value.replace(/[^0-9]/g, "") }))}
                style={{ ...fieldInputStyle, maxWidth: "140px" }}
              />
            </div>

            {showsLicenseQuestions(credentialsCard.businessNiche) && (
              <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                <legend style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text)", marginBottom: "8px", padding: 0 }}>
                  {renderMixed(licenseQuestionCopy(credentialsCard.businessNiche).question)}
                </legend>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {(["yes", "no"] as const).map((value) => {
                    const selected = credentials.license === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        className="wao-intake-choice"
                        aria-pressed={selected}
                        data-intake-credentials-license={value}
                        data-intake-credentials-tier={credentialTier(credentialsCard.businessNiche)}
                        onClick={() => setCredentials((prev) => ({ ...prev, license: selected ? undefined : value }))}
                        style={{ minHeight: "44px", background: selected ? "var(--accent)" : "transparent", color: selected ? "#0a0a0a" : "var(--text)" }}
                      >
                        {renderMixed(value === "yes" ? licenseQuestionCopy(credentialsCard.businessNiche).yes : licenseQuestionCopy(credentialsCard.businessNiche).no)}
                      </button>
                    );
                  })}
                </div>
                {credentials.license === "yes" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label htmlFor="intake-credentials-license" style={{ fontSize: "0.88rem", color: "var(--text)" }}>
                      {renderMixed(licenseQuestionCopy(credentialsCard.businessNiche).typePrompt)}
                    </label>
                    <input
                      id="intake-credentials-license"
                      name="license"
                      type="text"
                      maxLength={60}
                      className="wao-intake-field"
                      placeholder={licenseQuestionCopy(credentialsCard.businessNiche).typePlaceholder}
                      value={credentials.licenseText ?? ""}
                      onChange={(e) => setCredentials((prev) => ({ ...prev, licenseText: e.target.value }))}
                      style={fieldInputStyle}
                    />
                  </div>
                )}
              </fieldset>
            )}

            <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              <legend style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text)", marginBottom: "8px", padding: 0 }}>
                {renderMixed(CREDENTIALS_COPY.warrantyQuestion)}
              </legend>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {WARRANTY_CHOICES.map((choice) => {
                  const selected = credentials.warranty === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      className="wao-intake-choice"
                      aria-pressed={selected}
                      data-intake-credentials-warranty={choice}
                      onClick={() => setCredentials((prev) => ({ ...prev, warranty: selected ? undefined : choice }))}
                      style={{ minHeight: "44px", background: selected ? "var(--accent)" : "transparent", color: selected ? "#0a0a0a" : "var(--text)" }}
                    >
                      {renderMixed(CREDENTIALS_COPY[WARRANTY_CHOICE_COPY_KEY[choice]])}
                    </button>
                  );
                })}
              </div>
              {credentials.warranty === "other" && (
                <input
                  id="intake-credentials-warranty-other"
                  name="guarantee"
                  type="text"
                  maxLength={60}
                  aria-label={CREDENTIALS_COPY.warrantyQuestion}
                  className="wao-intake-field"
                  placeholder={CREDENTIALS_COPY.warrantyOtherPlaceholder}
                  value={credentials.warrantyOther ?? ""}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, warrantyOther: e.target.value }))}
                  style={fieldInputStyle}
                />
              )}
            </fieldset>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              <button type="submit" className="btn-primary" data-intake-credentials-continue="true" style={{ padding: "12px 24px", minHeight: "44px", justifyContent: "center" }}>
                {renderMixed(CREDENTIALS_COPY.continueButton)}
              </button>
              <button type="button" className="wao-intake-choice" data-intake-credentials-skip="true" onClick={() => finishCredentialsStep(true)} style={{ minHeight: "44px" }}>
                {renderMixed(CREDENTIALS_COPY.skipButton)}
              </button>
            </div>
          </form>
        )}

        {phase === "contact" && (
          <form
            data-intake-owner-contact="true"
            aria-labelledby="intake-owner-contact-title"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitContact();
            }}
            style={ownerStepStyle}
          >
            <h2 id="intake-owner-contact-title" ref={ownerHeadingRef} tabIndex={-1} style={ownerHeadingStyle}>
              {renderMixed(INTAKE_OWNER_COPY.contactTitle)}
            </h2>
            <p id="intake-owner-contact-intro" style={ownerNoteStyle}>
              {renderMixed(INTAKE_OWNER_COPY.contactIntro)}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="intake-owner-mobile" style={ownerLabelStyle}>
                {renderMixed(INTAKE_OWNER_COPY.contactMobileLabel)}
              </label>
              <input
                ref={mobileInputRef}
                id="intake-owner-mobile"
                name="ownerMobile"
                type="tel"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                required
                maxLength={20}
                className="wao-intake-field"
                aria-invalid={contactErrors.mobile || undefined}
                aria-describedby={[mobilePrefilled ? "intake-owner-mobile-prefill" : "", contactErrors.mobile ? "intake-owner-mobile-error" : ""].filter(Boolean).join(" ") || undefined}
                value={owner.mobile ?? ""}
                onChange={(e) => {
                  setMobilePrefilled(false);
                  setContactErrors((prev) => ({ ...prev, mobile: false }));
                  setOwner((prev) => ({ ...prev, mobile: e.target.value }));
                }}
                style={fieldInputStyle}
              />
              {mobilePrefilled && (
                <p id="intake-owner-mobile-prefill" data-intake-owner-mobile-prefill="true" style={ownerNoteStyle}>
                  {renderMixed(INTAKE_OWNER_COPY.contactMobilePrefillNote)}
                </p>
              )}
              {contactErrors.mobile && (
                <p id="intake-owner-mobile-error" role="alert" style={ownerErrorStyle}>
                  {renderMixed(INTAKE_OWNER_COPY.contactMobileInvalid)}
                </p>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="intake-owner-email" style={ownerLabelStyle}>
                {renderMixed(INTAKE_OWNER_COPY.contactEmailLabel)}
              </label>
              <input
                ref={emailInputRef}
                id="intake-owner-email"
                name="ownerEmail"
                type="email"
                dir="ltr"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={254}
                className="wao-intake-field"
                aria-invalid={contactErrors.email || undefined}
                aria-describedby={contactErrors.email ? "intake-owner-email-error" : undefined}
                value={owner.email ?? ""}
                onChange={(e) => {
                  setContactErrors((prev) => ({ ...prev, email: false }));
                  setOwner((prev) => ({ ...prev, email: e.target.value }));
                }}
                style={fieldInputStyle}
              />
              {contactErrors.email && (
                <p id="intake-owner-email-error" role="alert" style={ownerErrorStyle}>
                  {renderMixed(INTAKE_OWNER_COPY.contactEmailInvalid)}
                </p>
              )}
            </div>

            <button type="submit" className="btn-primary" data-intake-owner-contact-continue="true" disabled={submitting} style={{ padding: "12px 24px", minHeight: "44px", justifyContent: "center" }}>
              {renderMixed(INTAKE_OWNER_COPY.contactContinue)}
            </button>
          </form>
        )}

        {phase === "domain" && (
          <form
            data-intake-owner-domain="true"
            aria-labelledby="intake-owner-domain-title"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitDomain();
            }}
            style={ownerStepStyle}
          >
            <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              <legend style={{ padding: 0, marginBottom: "8px" }}>
                <h2 id="intake-owner-domain-title" ref={ownerHeadingRef} tabIndex={-1} style={ownerHeadingStyle}>
                  {renderMixed(INTAKE_OWNER_COPY.domainQuestion)}
                </h2>
              </legend>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {DOMAIN_CHOICES.map((choice) => {
                  const selected = owner.domainChoice === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      className="wao-intake-choice"
                      aria-pressed={selected}
                      data-intake-owner-domain-choice={choice}
                      onClick={() => {
                        setDomainError(null);
                        setOwner((prev) => ({ ...prev, domainChoice: choice }));
                      }}
                      style={{ minHeight: "44px", background: selected ? "var(--accent)" : "transparent", color: selected ? "#0a0a0a" : "var(--text)" }}
                    >
                      {renderMixed(DOMAIN_CHOICE_LABEL[choice])}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div aria-live="polite">
              {owner.domainChoice === "no_domain" && (
                <p data-intake-owner-domain-note="no_domain" style={ownerNoteStyle}>{renderMixed(INTAKE_OWNER_COPY.domainNoNote)}</p>
              )}
              {owner.domainChoice === "not_sure" && (
                <p data-intake-owner-domain-note="not_sure" style={ownerNoteStyle}>{renderMixed(INTAKE_OWNER_COPY.domainNotSureNote)}</p>
              )}
            </div>

            {owner.domainChoice === "has_domain" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label htmlFor="intake-owner-domain" style={ownerLabelStyle}>
                  {renderMixed(INTAKE_OWNER_COPY.domainInputLabel)}
                </label>
                <input
                  ref={domainInputRef}
                  id="intake-owner-domain"
                  name="ownerDomain"
                  type="text"
                  dir="ltr"
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  maxLength={253}
                  placeholder="example.co.il"
                  className="wao-intake-field"
                  aria-invalid={domainError ? true : undefined}
                  aria-describedby={domainError ? "intake-owner-domain-error" : undefined}
                  value={owner.domain ?? ""}
                  onChange={(e) => {
                    setDomainError(null);
                    setOwner((prev) => ({ ...prev, domain: e.target.value }));
                  }}
                  style={fieldInputStyle}
                />
                {domainError && (
                  <p id="intake-owner-domain-error" role="alert" style={ownerErrorStyle}>
                    {renderMixed(domainErrorText(domainError))}
                  </p>
                )}
              </div>
            )}

            <button type="submit" className="btn-primary" data-intake-owner-domain-continue="true" disabled={!owner.domainChoice || submitting} style={{ padding: "12px 24px", minHeight: "44px", justifyContent: "center" }}>
              {renderMixed(STEP2B_COPY.STEP_CONTINUE)}
            </button>
          </form>
        )}

        {phase === "location" && locationTrade && (
          <form
            data-intake-work-location={locationTrade}
            aria-labelledby="intake-work-location-title"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitLocation();
            }}
            style={ownerStepStyle}
          >
            <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              <legend style={{ padding: 0, marginBottom: "8px" }}>
                <h2 id="intake-work-location-title" ref={ownerHeadingRef} tabIndex={-1} style={ownerHeadingStyle}>
                  {renderMixed(STEP2A_COPY[WORK_LOCATION_QUESTION_KEY[locationTrade]])}
                </h2>
              </legend>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {WORK_LOCATION_OPTIONS[locationTrade].map((choice) => {
                  const selected = locationChoice === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      className="wao-intake-choice"
                      aria-pressed={selected}
                      data-intake-work-location-choice={choice}
                      onClick={() => setLocationChoice(choice)}
                      style={{ minHeight: "44px", background: selected ? "var(--accent)" : "transparent", color: selected ? "#0a0a0a" : "var(--text)" }}
                    >
                      {renderMixed(STEP2A_COPY[WORK_LOCATION_OPTION_KEY[choice]])}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <button type="submit" className="btn-primary" data-intake-work-location-continue="true" disabled={!locationChoice || submitting} style={{ padding: "12px 24px", minHeight: "44px", justifyContent: "center" }}>
              {renderMixed(STEP2B_COPY.STEP_CONTINUE)}
            </button>
          </form>
        )}

        {phase === "holding" && (
          <div data-interview-holding="true" style={ownerStepStyle}>
            <h2 ref={ownerHeadingRef} tabIndex={-1} style={ownerHeadingStyle}>{renderMixed(STEP2A_COPY.HOLDING_HEAD)}</h2>
            {copyLines(STEP2A_COPY.HOLDING_BODY).map((line, index) => (
              <p key={index} style={{ ...ownerNoteStyle, color: "var(--text)" }}>{renderMixed(line)}</p>
            ))}
            <button type="button" className="btn-primary" data-interview-holding-cta="true" onClick={beginQuestions} disabled={submitting} style={{ padding: "12px 24px", minHeight: "44px", justifyContent: "center" }}>
              {renderMixed(STEP2A_COPY.HOLDING_CTA)}
            </button>
          </div>
        )}

        {phase === "questions" && questionsView?.key && (
          <form
            data-interview-question={questionsView.key}
            data-interview-probe={questionsView.probing ? "true" : undefined}
            aria-labelledby="interview-question-title"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitAnswer(false);
            }}
            style={ownerStepStyle}
          >
            {questionsView.index === 0 && !questionsView.probing && (
              <p data-interview-intro="true" style={{ ...ownerNoteStyle, color: "var(--text)" }}>{renderMixed(STEP2B_COPY.Q_INTRO)}</p>
            )}
            <h2 id="interview-question-title" ref={ownerHeadingRef} tabIndex={-1} style={ownerHeadingStyle}>
              {renderMixed(STEP2B_COPY[QUESTION_COPY_KEY[questionsView.key]])}
            </h2>
            {questionsView.probing ? (
              <p id="interview-question-hint" data-interview-probe-text="true" style={{ ...ownerNoteStyle, color: "var(--text)", borderInlineStart: "3px solid var(--accent)", paddingInlineStart: "12px" }}>
                {renderMixed(STEP2B_COPY.PROBE_GENERIC)}
              </p>
            ) : (
              <p id="interview-question-hint" style={ownerNoteStyle}>{renderMixed(STEP2B_COPY[QUESTION_HINT_COPY_KEY[questionsView.key]])}</p>
            )}
            {questionsView.key === "priceStyle" ? (
              <div role="group" aria-labelledby="interview-question-title" aria-describedby="interview-question-hint" style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {PRICE_CHIP_IDS.map((chip) => {
                  const selected = chipDraft.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      className="wao-intake-choice"
                      aria-pressed={selected}
                      data-interview-price-chip={chip}
                      onClick={() => toggleChip(chip)}
                      style={{ minHeight: "44px", background: selected ? "var(--accent)" : "transparent", color: selected ? "#0a0a0a" : "var(--text)" }}
                    >
                      {renderMixed(STEP2B_COPY[PRICE_CHIP_COPY_KEY[chip]])}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                id="interview-answer"
                name="interviewAnswer"
                className="wao-intake-field"
                aria-labelledby="interview-question-title"
                aria-describedby="interview-question-hint"
                maxLength={MAX_INTERVIEW_ANSWER_CHARS}
                rows={5}
                value={answerDraft}
                onChange={(e) => setAnswerDraft(e.target.value)}
                style={{ ...fieldInputStyle, minHeight: "120px", resize: "vertical", lineHeight: 1.6 }}
              />
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              <button
                type="submit"
                className="btn-primary"
                data-interview-next="true"
                disabled={submitting || (questionsView.key === "priceStyle" ? chipDraft.length === 0 : !answerDraft.trim())}
                style={{ padding: "12px 24px", minHeight: "44px", justifyContent: "center" }}
              >
                {renderMixed(questionsView.index === INTERVIEW_QUESTION_KEYS.length - 1 ? STEP2B_COPY.Q_SUBMIT_LAST : STEP2B_COPY.Q_NEXT)}
              </button>
              <button type="button" className="wao-intake-choice" data-interview-skip="true" disabled={submitting} onClick={() => submitAnswer(true)} style={{ minHeight: "44px" }}>
                {renderMixed(STEP2B_COPY.Q_SKIP)}
              </button>
            </div>
          </form>
        )}

        {phase === "gates" && gates === null && (
          <div data-interview-gates-waiting="true" aria-busy="true" style={ownerStepStyle}>
            <h2 ref={ownerHeadingRef} tabIndex={-1} style={ownerHeadingStyle}>{renderMixed(STEP2A_COPY.HOLDING_HEAD)}</h2>
            {copyLines(STEP2A_COPY.HOLDING_BODY).map((line, index) => (
              <p key={index} style={{ ...ownerNoteStyle, color: "var(--text)" }}>{renderMixed(line)}</p>
            ))}
          </div>
        )}

        {phase === "gates" && gates !== null && gates[gateIndex] && (
          <form
            data-interview-gate={gates[gateIndex].type}
            aria-labelledby="interview-gate-title"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitGate(false);
            }}
            style={ownerStepStyle}
          >
            <p style={{ ...ownerNoteStyle, color: "var(--text)" }}>{renderMixed(STEP2B_COPY.GATES_INTRO)}</p>
            <h2 id="interview-gate-title" ref={ownerHeadingRef} tabIndex={-1} style={ownerHeadingStyle}>
              {renderMixed(RESEARCH_COPY[researchGateCopyKey(gates[gateIndex].type)])}
            </h2>
            {gateError && <p role="alert" style={ownerErrorStyle}>{renderMixed(POSTPAY_COPY.answer_error)}</p>}
            <textarea
              id="interview-gate-answer"
              name="gateAnswer"
              className="wao-intake-field"
              aria-labelledby="interview-gate-title"
              maxLength={1000}
              rows={3}
              value={gateDraft}
              onChange={(e) => setGateDraft(e.target.value)}
              style={{ ...fieldInputStyle, minHeight: "88px", resize: "vertical", lineHeight: 1.6 }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              <button type="submit" className="btn-primary" data-interview-gate-next="true" disabled={submitting || !gateDraft.trim()} style={{ padding: "12px 24px", minHeight: "44px", justifyContent: "center" }}>
                {renderMixed(STEP2B_COPY.Q_NEXT)}
              </button>
              <button type="button" className="wao-intake-choice" data-interview-gate-skip="true" disabled={submitting} onClick={() => submitGate(true)} style={{ minHeight: "44px" }}>
                {renderMixed(STEP2B_COPY.Q_SKIP)}
              </button>
            </div>
          </form>
        )}

        {phase === "facts" && (
          <div data-interview-facts={factsScreen === null ? "loading" : factsScreen.empty ? "empty" : "list"} aria-busy={factsScreen === null || undefined} style={ownerStepStyle}>
            <h2 ref={ownerHeadingRef} tabIndex={-1} style={ownerHeadingStyle}>{renderMixed(STEP2B_COPY.FACTS_HEAD)}</h2>
            {factsScreen?.empty && factsScreen.canReturn ? (
              <>
                <p style={{ ...ownerNoteStyle, color: "var(--text)" }}>{renderMixed(STEP2B_COPY.FACTS_EMPTY)}</p>
                <button type="button" className="btn-primary" data-interview-facts-return="true" disabled={submitting} onClick={returnToQuestions} style={{ padding: "12px 24px", minHeight: "44px", justifyContent: "center" }}>
                  {renderMixed(STEP2A_COPY.HOLDING_CTA)}
                </button>
              </>
            ) : (
              <>
                <p style={{ ...ownerNoteStyle, color: "var(--text)" }}>{renderMixed(STEP2B_COPY.FACTS_BODY)}</p>
                {factsScreen && INTERVIEW_FACT_TYPES.map((type) => {
                  const group = factsScreen.facts.filter((fact) => fact.type === type);
                  if (group.length === 0) return null;
                  return (
                    <section key={type} data-interview-fact-group={type} aria-labelledby={`interview-fact-group-${type}`} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <h3 id={`interview-fact-group-${type}`} style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>
                        {renderMixed(STEP2B_COPY[FACT_TYPE_COPY_KEY[type]])}
                      </h3>
                      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                        {group.map((fact) => (
                          <li
                            key={fact.id}
                            data-interview-fact={fact.id}
                            data-interview-fact-status={fact.status}
                            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", opacity: fact.status === "removed" ? 0.6 : 1 }}
                          >
                            {fact.contextLabel && <p style={{ ...ownerNoteStyle, fontSize: "0.82rem" }}>{renderMixed(fact.contextLabel)}</p>}
                            <p id={`interview-fact-text-${fact.id}`} style={{ margin: 0, lineHeight: 1.6, color: "var(--text)", textDecoration: fact.status === "removed" ? "line-through" : undefined }}>
                              {renderMixed(fact.status === "edited" && fact.ownerText ? fact.ownerText : fact.quote)}
                            </p>
                            {fact.serviceName && <p data-interview-fact-service="true" style={{ ...ownerNoteStyle, fontSize: "0.82rem" }}>{renderMixed(fact.serviceName)}</p>}
                            {fact.condition && <p data-interview-fact-condition="true" style={{ ...ownerNoteStyle, fontSize: "0.82rem" }}>{renderMixed(fact.condition)}</p>}
                            {editingFact === fact.id ? (
                              <form
                                noValidate
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (factEdit.trim()) reviewFactItem(fact.id, "fix", factEdit.trim());
                                }}
                                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                              >
                                <textarea
                                  id={`interview-fact-edit-${fact.id}`}
                                  className="wao-intake-field"
                                  aria-labelledby={`interview-fact-text-${fact.id}`}
                                  maxLength={MAX_OWNER_TEXT_CHARS}
                                  rows={3}
                                  autoFocus
                                  value={factEdit}
                                  onChange={(e) => setFactEdit(e.target.value)}
                                  style={{ ...fieldInputStyle, minHeight: "80px", resize: "vertical", lineHeight: 1.6 }}
                                />
                                <button type="submit" className="btn-primary" data-interview-fact-save={fact.id} disabled={submitting || !factEdit.trim()} style={{ padding: "10px 20px", minHeight: "44px", justifyContent: "center" }}>
                                  {renderMixed(STEP2B_COPY.FACT_FIX_SAVE)}
                                </button>
                              </form>
                            ) : (
                              <div role="group" aria-labelledby={`interview-fact-text-${fact.id}`} style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                <button type="button" className="wao-intake-choice" aria-pressed={fact.status === "confirmed" || fact.status === "edited"} data-interview-fact-confirm={fact.id} disabled={submitting} onClick={() => reviewFactItem(fact.id, "confirm")}
                                  style={{ minHeight: "44px", flex: "1 1 90px", background: fact.status === "confirmed" || fact.status === "edited" ? "var(--accent)" : "transparent", color: fact.status === "confirmed" || fact.status === "edited" ? "#0a0a0a" : "var(--text)" }}>
                                  {renderMixed(STEP2B_COPY.FACT_CONFIRM)}
                                </button>
                                <button type="button" className="wao-intake-choice" data-interview-fact-fix={fact.id} disabled={submitting} onClick={() => { setEditingFact(fact.id); setFactEdit(fact.ownerText ?? fact.quote); }} style={{ minHeight: "44px", flex: "1 1 90px" }}>
                                  {renderMixed(STEP2B_COPY.FACT_FIX)}
                                </button>
                                <button type="button" className="wao-intake-choice" aria-pressed={fact.status === "removed"} data-interview-fact-remove={fact.id} disabled={submitting} onClick={() => reviewFactItem(fact.id, "remove")}
                                  style={{ minHeight: "44px", flex: "1 1 90px", background: fact.status === "removed" ? "var(--accent)" : "transparent", color: fact.status === "removed" ? "#0a0a0a" : "var(--text)" }}>
                                  {renderMixed(STEP2B_COPY.FACT_REMOVE)}
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
                {factsScreen && (
                  <button type="button" className="btn-primary" data-interview-facts-done="true" disabled={submitting || !factsScreen.canFinish} onClick={finishFacts} style={{ padding: "12px 24px", minHeight: "44px", justifyContent: "center" }}>
                    {renderMixed(STEP2B_COPY.FACTS_DONE)}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {phase === "facts_confirmed" && (
          <div data-interview-facts-confirmed="true" style={ownerStepStyle}>
            <h2 ref={ownerHeadingRef} tabIndex={-1} style={ownerHeadingStyle}>{renderMixed(STEP2A_COPY.HOLDING_HEAD)}</h2>
            {copyLines(STEP2A_COPY.HOLDING_BODY).map((line, index) => (
              <p key={index} style={{ ...ownerNoteStyle, color: "var(--text)" }}>{renderMixed(line)}</p>
            ))}
          </div>
        )}

        {phase === "elsewhere" && (
          <div data-interview-elsewhere="true" style={ownerStepStyle}>
            <h2 ref={ownerHeadingRef} tabIndex={-1} style={ownerHeadingStyle}>{renderMixed(STEP2B_COPY.SESSION_ELSEWHERE_HEAD)}</h2>
            <p style={{ ...ownerNoteStyle, color: "var(--text)" }}>{renderMixed(STEP2B_COPY.SESSION_ELSEWHERE_BODY)}</p>
          </div>
        )}

        {phase === "exited" && (
          <div data-interview-exited="location" style={ownerStepStyle}>
            <h2 ref={ownerHeadingRef} tabIndex={-1} style={ownerHeadingStyle}>{renderMixed(STEP2A_COPY.LOCATION_EXIT_HEAD)}</h2>
            {copyLines(STEP2A_COPY.LOCATION_EXIT_BODY).map((line, index) => (
              <p key={index} style={{ ...ownerNoteStyle, color: "var(--text)" }}>{renderMixed(line)}</p>
            ))}
          </div>
        )}

        {phase === "expired" && (
          <div data-interview-expired="true" style={ownerStepStyle}>
            <h2 ref={ownerHeadingRef} tabIndex={-1} style={ownerHeadingStyle}>{renderMixed(STEP2A_COPY.EXPIRED_HEAD)}</h2>
            {copyLines(STEP2A_COPY.EXPIRED_BODY).map((line, index) => (
              <p key={index} style={{ ...ownerNoteStyle, color: "var(--text)" }}>{renderMixed(line)}</p>
            ))}
            <Link href="/site-bot/audit" className="btn-primary" data-interview-expired-cta="true" style={{ padding: "12px 24px", minHeight: "44px", justifyContent: "center", textAlign: "center" }}>
              {renderMixed(STEP2A_COPY.EXPIRED_CTA)}
            </Link>
          </div>
        )}

        {phase === "voice" && VOICE_NOTE_CONTROL_LABELS.record && VOICE_NOTE_CONTROL_LABELS.stop && (
          <div data-intake-voice-note="true" style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <button type="button" className="btn-primary" aria-pressed={recording !== null} onClick={toggleVoiceRecording} style={{ padding: "12px 24px", minHeight: "44px" }}>
              {renderMixed(recording ? VOICE_NOTE_CONTROL_LABELS.stop : VOICE_NOTE_CONTROL_LABELS.record)}
            </button>
            <button type="button" className="wao-intake-choice" disabled={recording !== null} onClick={finishVoiceStep} style={{ minHeight: "44px" }}>
              {renderMixed(INTAKE_COPY.M1_VOICE_NOTE_SKIP)}
            </button>
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
          {renderMixed(`${STEP2B_COPY.START_FOOTER_NOTE} `)}
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
