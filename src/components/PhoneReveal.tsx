"use client";
import { useState } from "react";
import { useLeadTracking } from "@/lib/useLeadTracking";

type PhoneRevealProps = {
  /** Attribution label for this placement, e.g. "header", "footer", "contact-page". */
  source: string;
  /** Display format, e.g. "052-614-8860". */
  phone?: string;
  /** tel: href value (digits only), e.g. "0526148860". */
  phoneHref?: string;
  /** Class applied to the clickable element (link and button share it, e.g. "btn-primary"). */
  className?: string;
  style?: React.CSSProperties;
  /** Optional leading icon/emoji, rendered before both the reveal label and the revealed number. */
  icon?: React.ReactNode;
  /** Copy for the pre-reveal button. Flag for a Tamar/Noa pass if it needs a real copy treatment. */
  revealText?: string;
  /**
   * Below `md` (768px), phone numbers stay a plain, always-visible `tel:`
   * link — mobile click-to-call is already natively trackable, so a reveal
   * step there would only add friction with no attribution upside. Set to
   * `false` for placements (e.g. the header) that already have a separate
   * mobile phone/WhatsApp affordance elsewhere and shouldn't render a
   * second phone link on small screens at all.
   */
  showOnMobile?: boolean;
  /**
   * Wrapper class controlling at which breakpoint the desktop reveal
   * variant appears. Default `md` (768px). Override e.g. to
   * `"hidden lg:inline-flex"` to match a placement that was previously
   * desktop-only above `lg` (1024px).
   */
  desktopVisibleClassName?: string;
};

const DEFAULT_PHONE = "052-614-8860";
const DEFAULT_PHONE_HREF = "0526148860";
const DEFAULT_REVEAL_TEXT = "הצג מספר טלפון";

/**
 * "Reveal number" click-intent tracker for desktop phone display.
 * Desktop: shows a button; clicking it reveals the real number (text +
 * functioning tel: link) and fires `phone_reveal` to window.dataLayer plus
 * a durable server-side log via POST /api/phone-reveal — both carrying the
 * ref/UTM context from useLeadTracking(), same pattern as lead_submit.
 * Mobile: plain tel: link, no reveal step (see showOnMobile doc above).
 */
export default function PhoneReveal({
  source,
  phone = DEFAULT_PHONE,
  phoneHref = DEFAULT_PHONE_HREF,
  className,
  style,
  icon,
  revealText = DEFAULT_REVEAL_TEXT,
  showOnMobile = true,
  desktopVisibleClassName = "hidden md:inline-flex",
}: PhoneRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const tracking = useLeadTracking();

  const handleReveal = () => {
    setRevealed(true);

    const eventPayload = {
      event: "phone_reveal",
      source,
      ref: tracking.ref ?? undefined,
      utm_source: tracking.utm_source ?? undefined,
      utm_medium: tracking.utm_medium ?? undefined,
      utm_campaign: tracking.utm_campaign ?? undefined,
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(eventPayload);

    fetch("/api/phone-reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        ref: tracking.ref ?? undefined,
        utm_source: tracking.utm_source ?? undefined,
        utm_medium: tracking.utm_medium ?? undefined,
        utm_campaign: tracking.utm_campaign ?? undefined,
        page: window.location.pathname,
      }),
    }).catch(() => {});
  };

  return (
    <>
      {showOnMobile && (
        <a href={`tel:${phoneHref}`} className={`md:hidden ${className ?? ""}`} style={style}>
          {icon}
          <span dir="ltr">{phone}</span>
        </a>
      )}

      <span className={desktopVisibleClassName} style={{ alignItems: "center" }}>
        {revealed ? (
          <a href={`tel:${phoneHref}`} className={className} style={{ ...style, color: style?.color ?? "inherit" }}>
            {icon}
            <span dir="ltr">{phone}</span>
          </a>
        ) : (
          <button type="button" onClick={handleReveal} className={className} style={{ ...style, cursor: "pointer" }}>
            {icon}
            {revealText}
          </button>
        )}
      </span>
    </>
  );
}
