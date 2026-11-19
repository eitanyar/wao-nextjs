"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { renderMixed } from "@/lib/bidi";
import type { CollectedData } from "@/lib/bot/prompts";
import type { ResearchGate } from "@/lib/site-bot/research/gates";
import { SITE_BOT_POSTPAY_COPY as COPY, type SiteBotPostPayCopyKey } from "@/lib/site-bot/postPayCopy.generated";
import { checkoutCallbackOutcome, checkoutPayErrorKind, doneDomainLine, readJsonBody, type CheckoutPayErrorKind } from "@/lib/site-bot/checkout/customerError";
import { SITE_BOT_CHECKOUT_COPY_PENDING, SITE_BOT_TERMS_PATH, siteBotCheckoutText, siteBotTermsConsentParts } from "@/lib/site-bot/checkout/checkoutCopy";
import type { CardFieldDefaults } from "@/lib/site-bot/checkout/mockCard";
import { SITE_BOT_ACCOUNT_COPY, accountLinkHref, customerVisibleLabel } from "@/lib/site-bot/checkout/accountCopy";
import { SITE_BOT_PLAN, formatShekels } from "@/lib/payments/plans";
import { SHOWCASE_CONSENT_COPY } from "@/lib/showcase/consentCopy.generated";
import { buildResearchGateAnswer } from "@/lib/site-bot/research/gatePresentation";

// Site-Bot pay page (client part; page.tsx decides the card-field defaults on the server). The plan's price and terms
// (SITE_BOT_PLAN: monthly, + VAT) are shown above the pay action. The real Takbull integration will redirect here
// from a hosted tokenization page instead (see TAKBULL SWAP POINT in subscriptions.ts); this page's job (call
// /api/site-bot/checkout/callback with the sessionId once the user confirms) doesn't change when that swap happens.
// Errors: the customer only ever sees the approved post-payment texts (postPayCopy.generated.ts, 2026-11-20): a pay error
// says whether the card was charged, was not, or may have been (checkoutPayErrorKind; a retry only when it provably was
// not; the account link stays otherwise), a gate error says the
// answer was not saved. Server error codes / exception text are logged, never shown.

/** The pay-page question of each owner gate type (ambiguous_intent is staff-only and never reaches this page). */
const GATE_COPY_KEYS: Partial<Record<ResearchGate["type"], SiteBotPostPayCopyKey>> = {
  business_boundary: "gate_business_boundary",
  service_attributes: "gate_service_attributes",
  geography: "gate_geography",
  money_services: "gate_money_services",
};

/** The manage / cancel link label; null (link hidden) while it is still a copy placeholder. */
const manageLinkLabel = customerVisibleLabel(SITE_BOT_ACCOUNT_COPY.manageLink);

/** Consent small print above the pay button: text, then the terms-of-use link, then text (approved 2026-11-11). */
const termsConsent = siteBotTermsConsentParts();

/** Optional showcase consent (approved 2026-11-17): its own checkbox, unticked by default, never required to pay. */
const SHOWCASE_COPY = SHOWCASE_CONSENT_COPY.products["site-bot"];

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
  const [payError, setPayError] = useState<CheckoutPayErrorKind | null>(null);
  const [gateError, setGateError] = useState(false);
  const [domainLine, setDomainLine] = useState<"own" | "wao" | null>(null);
  const [gatesFinished, setGatesFinished] = useState(false);
  const [researchId, setResearchId] = useState<string | null>(null);
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null);
  const [openResearchGates, setOpenResearchGates] = useState<ResearchGate[]>([]);
  const [gateIndex, setGateIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [manageHref, setManageHref] = useState<string>(() => accountLinkHref(undefined));
  // Unticked by default; paying works the same either way. Sent with the callback, recorded only after a successful charge.
  const [showcaseConsent, setShowcaseConsent] = useState(false);

  async function pay() {
    setPhase("charging");
    setPayError(null);
    let body: Record<string, unknown> | null = null;
    try {
      const res = await fetch("/api/site-bot/checkout/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, showcaseConsent }),
      });
      // M0.5 (B9): a non-2xx or non-JSON callback is an error state, never "done".
      const json = await readJsonBody(res) as Partial<CheckoutCallbackResponse> & { error?: string; chargeState?: string };
      body = json;
      const outcome = checkoutCallbackOutcome(res.ok, json);
      if (outcome.kind === "error") throw new Error(`checkout callback ${res.status}: ${String(json.error ?? "")}`);
      setDomainLine(doneDomainLine(json.collectedData));
      setManageHref(accountLinkHref(json.manageUrl));
      setGatesFinished(false);
      if (outcome.kind === "gates") {
        setResearchId(outcome.researchId);
        setCollectedData(outcome.collectedData);
        // Only the gate types this page asks (the callback already hands over owner-answerable gates only).
        const askable = outcome.openResearchGates.filter((gate) => GATE_COPY_KEYS[gate.type] !== undefined);
        setOpenResearchGates(askable);
        setGateIndex(0);
        setAnswer("");
        setGateError(false);
        setPhase(askable.length ? "gates" : "done");
      } else {
        setPhase("done");
      }
    } catch (e: unknown) {
      console.error("[site-bot pay]", e);
      // A thrown fetch (network, no response) leaves body null: the charge state is unknown (pay_error_unknown).
      setPayError(checkoutPayErrorKind(body));
      setPhase("error");
    }
  }

  async function submitGate() {
    const gate = openResearchGates[gateIndex];
    if (!gate || !researchId || !collectedData) return;
    const normalizedAnswer = buildResearchGateAnswer(gate.type, answer, collectedData);
    if (!normalizedAnswer) return;

    setPhase("submitting_gate");
    setGateError(false);
    try {
      const res = await fetch("/api/site-bot/research/gates", {
        method: "POST",
        // The owner's capability: this checkout's session id (see the owner path in research/gates/route.ts).
        headers: { "Content-Type": "application/json", "X-Site-Bot-Session": sessionId },
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
      setGateError(true);
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
            <li data-domain-line="site-bot">{renderMixed(siteBotCheckoutText("domainLine", SITE_BOT_PLAN))}</li>
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
              <div data-showcase-consent="site-bot" style={{ display: "flex", gap: "10px", alignItems: "flex-start", margin: "0 0 14px" }}>
                <input
                  id="showcase-consent"
                  type="checkbox"
                  checked={showcaseConsent}
                  onChange={(event) => setShowcaseConsent(event.target.checked)}
                  aria-describedby="showcase-consent-help"
                  style={{ marginTop: "4px", width: "18px", height: "18px", flexShrink: 0, accentColor: "var(--accent)" }}
                />
                <div>
                  <label htmlFor="showcase-consent" style={{ fontSize: "0.88rem", lineHeight: 1.6, cursor: "pointer" }}>
                    {renderMixed(SHOWCASE_COPY.checkboxLabel)}
                  </label>
                  <p id="showcase-consent-help" style={{ color: "var(--muted)", fontSize: "0.78rem", lineHeight: 1.6, margin: "4px 0 0" }}>
                    {renderMixed(SHOWCASE_COPY.checkboxHelp)}
                  </p>
                </div>
              </div>
              <p data-terms-consent="site-bot" style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.6, margin: "0 0 10px" }}>
                {renderMixed(termsConsent.before)}
                <a href={SITE_BOT_TERMS_PATH} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                  {renderMixed(termsConsent.linkLabel)}
                  <span aria-hidden="true">↗</span>
                </a>
                {renderMixed(termsConsent.after)}
              </p>
              <button onClick={pay} className="btn-primary" style={{ width: "100%", padding: "14px" }}>
                {renderMixed(siteBotCheckoutText("payButton", SITE_BOT_PLAN))}
              </button>
            </>
          )}

          {phase === "charging" && (
            <p style={{ color: "var(--muted)", textAlign: "center" }}>{renderMixed(COPY.charging)}</p>
          )}

          {(phase === "gates" || phase === "submitting_gate") && openResearchGates[gateIndex] && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ color: "var(--muted)", margin: 0 }}>{renderMixed(COPY.intro)}</p>
              <p style={{ margin: 0 }}>
                {renderMixed(COPY[GATE_COPY_KEYS[openResearchGates[gateIndex].type] ?? "intro"])}
              </p>
              {gateError && <p role="alert" style={{ color: "#e05555", margin: 0 }}>{renderMixed(COPY.answer_error)}</p>}
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={phase === "submitting_gate"}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={submitGate}
                disabled={!answer.trim() || phase === "submitting_gate"}
                className="btn-primary"
                style={{ width: "100%", padding: "14px" }}
              >
                {phase === "submitting_gate" ? COPY.sending : COPY.send}
              </button>
            </div>
          )}

          {phase === "error" && (
            <>
              <p role="alert" style={{ color: "#e05555", marginBottom: "16px" }}>{renderMixed(payError === "not_charged" ? COPY.pay_error_not_charged : payError === "after_charge" ? COPY.pay_error_after_charge : COPY.pay_error_unknown)}</p>
              {payError === "not_charged" && (<button onClick={pay} className="btn-outline" style={{ width: "100%", padding: "14px" }}>
                נסה שוב
              </button>)}
            </>
          )}

          {phase === "done" && (
            <div style={{ textAlign: "center" }}>
              <p style={{ marginBottom: "16px" }}>{renderMixed(COPY.done_paid)}</p>
              {domainLine && <p style={{ marginBottom: "16px" }}>{renderMixed(domainLine === "own" ? COPY.done_next_own_domain : COPY.done_next_no_domain)}</p>}
              {gatesFinished && <p>{renderMixed(COPY.done_answers_saved)}</p>}
            </div>
          )}
        </div>

        {/* Self-serve cancel (approved terms: online, effective at the end of the paid month): shown as soon as the
            sign-up charge succeeded (the research gates, the done state, and a pay error after the charge). */}
        {manageLinkLabel && (phase === "gates" || phase === "submitting_gate" || phase === "done" || (phase === "error" && payError !== null && payError !== "not_charged")) && (
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
