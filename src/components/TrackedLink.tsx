"use client";
import Link from "next/link";
import { useLeadTracking } from "@/lib/useLeadTracking";

/**
 * A plain internal Link that pushes one named click event to window.dataLayer (GTM -> Google Ads conversion
 * mapping), carrying the same ref/UTM context as phone_reveal and lead_submit. Uses onClick, not onNavigate, so a
 * Ctrl/Cmd-click into a new tab still counts as intent. The navigation itself is untouched.
 * HEBREW-SAFETY: zero Hebrew bytes; the label arrives as children.
 */
export default function TrackedLink({
  href,
  event,
  className,
  style,
  children,
}: {
  href: string;
  /** dataLayer event name; one distinct name per CTA placement. */
  event: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const tracking = useLeadTracking();
  const onClick = () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event,
      cta_href: href,
      page: window.location.pathname,
      ref: tracking.ref ?? undefined,
      utm_source: tracking.utm_source ?? undefined,
      utm_medium: tracking.utm_medium ?? undefined,
      utm_campaign: tracking.utm_campaign ?? undefined,
    });
  };
  return (
    <Link href={href} className={className} style={style} onClick={onClick}>
      {children}
    </Link>
  );
}
