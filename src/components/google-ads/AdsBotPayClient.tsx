"use client";

import Link from "next/link";
import { useState } from "react";
import { ADS_BOT_CHECKOUT_COPY as COPY, ADS_BOT_TERMS_PATH, adsBotConsentParts } from "@/lib/google-ads/billing/adsBotCheckoutCopy";

// Ads Bot pay page, client part (mission item 3). Copy is read from adsBotBillingStrings.json (waocopy 2026-11-22),
// never typed here. With the mock provider the sign-up charge completes on this page (init -> callback); a real
// hosted-page provider (Takbull, later) gets redirectUrl from init instead.
// PRESENTATION IS MINIMAL ON PURPOSE: layout / RTL polish is Maya's (ux) pass.

/** English placeholder: no approved Hebrew string exists for an invalid / expired pay link yet (waocopy pending). */
export const ADS_BOT_PAY_INVALID_LINK_PLACEHOLDER = "This payment link is invalid or has expired.";

const consent = adsBotConsentParts();

type Phase = "form" | "paying" | "done" | "failed";

export default function AdsBotPayClient({ token }: { token: string | null }) {
  const [agreed, setAgreed] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");

  if (!token) {
    return (
      <main dir="ltr" style={{ maxWidth: 560, margin: "48px auto", padding: "0 16px" }}>
        <p>{ADS_BOT_PAY_INVALID_LINK_PLACEHOLDER}</p>
      </main>
    );
  }

  const pay = async () => {
    if (!agreed || phase === "paying") return;
    setPhase("paying");
    try {
      const init = await fetch("/api/google-ads/checkout/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, consent: true }),
      });
      const started = (await init.json().catch(() => null)) as { subscriptionId?: string; providerSessionId?: string; mockProvider?: boolean; redirectUrl?: string } | null;
      if (!init.ok || !started?.subscriptionId) return setPhase("failed");
      if (!started.mockProvider && started.redirectUrl) {
        window.location.assign(started.redirectUrl);
        return;
      }
      const done = await fetch("/api/google-ads/checkout/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: started.subscriptionId, payload: { sessionId: started.providerSessionId } }),
      });
      setPhase(done.ok ? "done" : "failed");
    } catch {
      setPhase("failed");
    }
  };

  return (
    <main dir="rtl" style={{ maxWidth: 560, margin: "48px auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{COPY.title}</h1>
      <p>{COPY.price_line}</p>
      <p>{COPY.refund_line}</p>
      {phase === "done" ? (
        <p role="status">{COPY.success}</p>
      ) : (
        <>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} disabled={phase === "paying"} />
            <span>
              {consent.before}
              <Link href={ADS_BOT_TERMS_PATH} target="_blank" rel="noopener noreferrer">{consent.linkLabel}</Link>
              {consent.after}
            </span>
          </label>
          <button type="button" onClick={pay} disabled={!agreed || phase === "paying"} style={{ padding: "12px 20px", fontWeight: 700 }}>
            {COPY.pay_button}
          </button>
          {phase === "failed" && <p role="alert">{COPY.failure}</p>}
        </>
      )}
    </main>
  );
}
