"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { renderMixed } from "@/lib/bidi";
import type { CollectedData } from "@/lib/bot/prompts";
import type { ResearchGate } from "@/lib/site-bot/research/gates";
import { RESEARCH_COPY } from "@/lib/site-bot/researchCopy";
import { checkoutCallbackOutcome, readJsonBody } from "@/lib/site-bot/checkout/customerError";
import { SITE_BOT_CHECKOUT_COPY_PENDING, siteBotCheckoutText } from "@/lib/site-bot/checkout/checkoutCopy";
import type { CardFieldDefaults } from "@/lib/site-bot/checkout/mockCard";
import { SITE_BOT_ACCOUNT_COPY, accountLinkHref, customerVisibleLabel } from "@/lib/site-bot/checkout/accountCopy";
import { SITE_BOT_PLAN, formatShekels } from "@/lib/payments/plans";
import {
  buildResearchGateAnswer,
  RESEARCH_PROGRESS_KEYS,
  researchGateCopyKey,
} from "@/lib/site-bot/research/gatePresentation";

// Site-Bot pay page (client part; page.tsx decides the card-field defaults on the server). The plan's price and terms
// (SITE_BOT_PLAN: monthly, + VAT) are shown above the pay action. The real Takbull integration will redirect here
// from a hosted tokenization page instead (see TAKBULL SWAP POINT in subscriptions.ts); this page's job (call
// /api/site-bot/checkout/callback with the sessionId once the user confirms) doesn't change when that swap happens.
// Errors: the customer only ever sees the generic message; server error codes / exception text are logged, not shown.
/** The generic customer-facing error (the existing copy, moved from the old customerErrorText fallback). */
const GENERIC_ERROR = "משהו השתבש";

/** The manage / cancel link label; null (link hidden) while it is still a copy placeholder. */
const manageLinkLabel = customerVisibleLabel(SITE_BOT_ACCOUNT_COPY.manageLink);

type Phase = "form" | "charging" | "gates" | "submitting_gate" | "done" | "error";

interface CheckoutCallbackResponse {
  success: boolean;
  charged?: boolean;
  researchId: string;
  status?: string;
  openGateCount?: number;
  collectedData?: CollectedData;
  openResearchGates?: ResearchGate[];
  /** Fresh magic-link path to /account/subscription (manage / cancel), on a fresh activation only. */
  manageUrl?: string;
}

export default function SiteBotPayClient({ cardDefaults }: { cardDefaults: CardFieldDefaults }) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [researchStatus, setResearchStatus] = useState<string | null>(null);
  const [gatesFinished, setGatesFinished] = useState(false);
  const [researchId, setResearchId] = useState<string | null>(null);
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null);
  const [openResearchGates, setOpenResearchGates] = useState<ResearchGate[]>([]);
  const [gateIndex, setGateIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [manageHref, setManageHref] = useState<string>(() => accountLinkHref(undefined));
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
      // M0.5 (B9): a non-2xx or non-JSON callback is an error state, never "done".
      const json = await readJsonBody(res) as Partial<CheckoutCallbackResponse> & { error?: string };
      const outcome = checkoutCallbackOutcome(res.ok, json);
      if (outcome.kind === "error") throw new Error(`checkout callback ${res.status}: ${String(json.error ?? "")}`);
      setResearchStatus(json.status ?? null);
      setManageHref(accountLinkHref(json.manageUrl));
      setGatesFinished(false);
      if (outcome.kind === "gates") {
        setResearchId(outcome.researchId);
        setCollectedData(outcome.collectedData);
        setOpenResearchGates(outcome.openResearchGates);
        setGateIndex(0);
        setAnswer("");
        setPhase("gates");
      } else {
        setPhase("done");
      }
    } catch (e: unknown) {
      console.error("[site-bot pay]", e);
      setError(GENERIC_ERROR);
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
        setGatesFinished(true);
        setPhase("done");
      } else {
        setGateIndex((current) => current + 1);
        setPhase("gates");
      }
    } catch (e: unknown) {
      console.error("[site-bot pay] gate", e);
      setError(GENERIC_ERROR);
      setPhase("gates");
    }
  }

  return (
    <section style={{ minHeight: "100vh", paddingTop: "120px", paddingBottom: "80px" }}>
      <div className="wao-container" style={{ maxWidth: "480px" }}>
        <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "1.6rem", marginBottom: "8px" }}>
          {renderMixed("תשלום")}
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "20px" }}>
          {renderMixed(siteBotCheckoutText("pageSubheading", SITE_BOT_PLAN))}
        </p>

        {/* Price and terms, always above the pay action (approved terms 2026-11-07). */}
        <div data-checkout-terms="site-bot" data-copy-pending={SITE_BOT_CHECKOUT_COPY_PENDING ? "true" : undefined} style={{ border: "1px solid var(--border)", borderRadius: "16px", padding: "20px 24px", marginBottom: "16px" }}>
          <p style={{ margin: 0, display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
            <bdi dir="ltr" style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "2rem" }}>{formatShekels(SITE_BOT_PLAN.netAmount)}</bdi>
            <span>{renderMixed(siteBotCheckoutText("priceSuffix", SITE_BOT_PLAN))}</span>
          </p>
          <p style={{ color: "var(--muted)", margin: "6px 0 12px" }}>{renderMixed(siteBotCheckoutText("priceTotalLine", SITE_BOT_PLAN))}</p>
          <ul style={{ margin: 0, paddingInlineStart: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <li>{renderMixed(siteBotCheckoutText("termsNoCommitment", SITE_BOT_PLAN))}</li>
            <li>{renderMixed(siteBotCheckoutText("termsCancelOnline", SITE_BOT_PLAN))}</li>
          </ul>
        </div>

        <div style={{ border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
          {phase === "form" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <input placeholder="מספר כרטיס" defaultValue={cardDefaults.number} inputMode="numeric" autoComplete="cc-number" style={inputStyle} />
                <div style={{ display: "flex", gap: "12px" }}>
                  <input placeholder="MM/YY" defaultValue={cardDefaults.expiry} inputMode="numeric" autoComplete="cc-exp" style={inputStyle} />
                  <input placeholder="CVC" defaultValue={cardDefaults.cvc} inputMode="numeric" autoComplete="cc-csc" style={inputStyle} />
                </div>
              </div>
              <button onClick={pay} className="btn-primary" style={{ width: "100%", padding: "14px" }}>
                {renderMixed(siteBotCheckoutText("payButton", SITE_BOT_PLAN))}
              </button>
            </>
          )}

          {phase === "charging" && (
            <p style={{ color: "var(--muted)", textAlign: "center" }}>{renderMixed("התשלום מתקבל עכשיו — ובאותו רגע אנחנו מתחילים לחקור את העסק שלך לעומק.")}</p>
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

          {phase === "done" && (
            <div style={{ textAlign: "center" }}>
              <p style={{ marginBottom: "16px" }}>{renderMixed("קיבלנו את התשלום שלך — הכל עבר חלק.")}</p>
              <p>{renderMixed((researchStatus === "architecture_ready" || researchStatus === "copy_ready" || researchStatus === "deploy_ready") ? "המחקר הושלם. הצוות של WAO בונה את האתר מהתשובות שלך — ונחזור אליך לפרטים שמסרת." : "המחקר עדיין רץ ברקע. הצוות של WAO משלים אותו, בונה את האתר — ונחזור אליך.")}</p>
              {gatesFinished && <p>{renderMixed("התשובות שלך נשמרו — הן הבסיס שהצוות בונה ממנו את האתר.")}</p>}
            </div>
          )}
        </div>

        {/* Self-serve cancel (approved terms: online, effective at the end of the paid month): shown as soon as the
            sign-up charge succeeded (the research gates and the done state). */}
        {manageLinkLabel && (phase === "gates" || phase === "submitting_gate" || phase === "done") && (
          <p style={{ marginTop: "16px", textAlign: "center" }}>
            <Link href={manageHref} prefetch={false} data-account-link="site-bot" className="btn-outline" style={{ display: "inline-block", padding: "10px 20px" }}>
              {renderMixed(manageLinkLabel)}
            </Link>
          </p>
        )}
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
  minWidth: 0,
};
