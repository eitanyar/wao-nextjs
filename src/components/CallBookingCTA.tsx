"use client";
import { renderMixed } from "@/lib/bidi";
import { useLeadTracking } from "@/lib/useLeadTracking";
import PhoneReveal from "./PhoneReveal";

/**
 * Wizard-of-Oz call-booking option (Phase 1, per Lior's scoping brief) —
 * Eitan personally takes these calls; this generates the conversion-signal
 * data the self-serve product still needs. Secondary/parallel option next
 * to the audit's self-serve lead form, NOT a replacement for it.
 *
 * Scheduling tool: no Calendly/Cal.com URL is configured anywhere in the
 * codebase or .env.local yet (checked both — nothing under CALENDLY_URL,
 * CAL_URL, or similar). Set NEXT_PUBLIC_CALENDLY_URL once a scheduling link
 * exists and this component switches automatically to the "book a slot"
 * link — no other code change needed. Until then it falls back to a
 * click-to-reveal phone number (reusing PhoneReveal, which already logs
 * `phone_reveal` to dataLayer + POST /api/phone-reveal with the same
 * ref/UTM attribution as lead submissions) so the CTA isn't dead in the
 * meantime.
 *
 * Consent: the Calendly branch is a plain outbound `<a>` — no third-party
 * script is loaded on our own page, so CookieBanner's consent-suppression
 * pattern doesn't need to gate it (nothing fires on our domain before the
 * user actually leaves for calendly.com). If this later becomes an embedded
 * widget/iframe instead of a link-out, that decision needs to be revisited
 * against CookieBanner.tsx's SUPPRESS_ON pattern.
 */
export default function CallBookingCTA({ source }: { source: string }) {
  const tracking = useLeadTracking();
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

  const fireCallScheduled = () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "call_scheduled",
      source,
      method: "calendly",
      ref: tracking.ref ?? undefined,
      utm_source: tracking.utm_source ?? undefined,
      utm_medium: tracking.utm_medium ?? undefined,
      utm_campaign: tracking.utm_campaign ?? undefined,
    });
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        alignItems: "flex-start",
        textAlign: "start",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          color: "var(--muted)",
          fontSize: "0.95rem",
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        {renderMixed("לא בטוח שזה מתאים לך בשלב הזה? קבע שיחת טלפון קצרה איתי, איתן, בלי מחויבות.")}
      </p>

      {calendlyUrl ? (
        <a
          href={calendlyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={fireCallScheduled}
          className="btn-outline"
          style={{ fontSize: "0.95rem" }}
        >
          {renderMixed("קבע שיחה קצרה ←")}
        </a>
      ) : (
        <PhoneReveal
          source={`${source}-call-fallback`}
          className="btn-outline"
          revealText="הצג מספר וקבע שיחה"
          style={{ fontSize: "0.95rem" }}
        />
      )}
    </div>
  );
}
