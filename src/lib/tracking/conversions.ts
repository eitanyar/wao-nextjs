/**
 * dataLayer conversion events for the Ads Bot onboarding funnel and the contact lead (Dror's measurement spec,
 * 2026-11-20). GTM maps the event names to Google Ads conversions. HEBREW-SAFETY: zero Hebrew bytes.
 *
 * Not here on purpose: the purchase event (checkout is still 503).
 */
import type { AttributionFields } from "./attribution";

export const CONVERSION_CURRENCY = "ILS";

/** Conversion values (ILS) per Dror's spec. */
export const CONVERSION_VALUES = {
  adsBotFirstAdShown: 15,
  adsBotIntakeCompleted: 60,
  leadSubmit: 60,
} as const;

export const ADS_BOT_EVENTS = {
  firstAdShown: "ads_bot_first_ad_shown",
  intakeCompleted: "ads_bot_intake_completed",
  approved: "ads_bot_approved",
} as const;

/**
 * Enhanced-conversions user_data (hashed by GTM/Google tag). OFF until the privacy page discloses it — flip only
 * after that copy ships. While false, no phone/email ever reaches the dataLayer.
 */
export const ENHANCED_CONVERSIONS_USER_DATA = false;

export type DataLayerEvent = Record<string, unknown> & { event: string };
export type DataLayerPush = (event: DataLayerEvent) => void;

/** Israeli phone -> E.164. 05x-xxxxxxx -> +9725xxxxxxxx; also accepts 972/+972 prefixes and landlines. */
export function toE164IL(phone: string | null | undefined): string | null {
  if (typeof phone !== "string") return null;
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.includes("+")) return null;
  if (digits.startsWith("00972")) digits = digits.slice(5);
  else if (digits.startsWith("972")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  else return null;
  if (digits.startsWith("0")) digits = digits.slice(1);
  // Mobile 5x + 7 digits = 9 digits; landline area code + 7 digits = 8 digits (2,3,4,8,9) or 9 (7x VoIP).
  if (!/^\d{8,9}$/.test(digits)) return null;
  if (digits.startsWith("5") && digits.length !== 9) return null;
  return `+972${digits}`;
}

export type UserData = { phone_number?: string; email?: string };

export function buildUserData(contact: { phone?: string | null; email?: string | null }): UserData | null {
  const out: UserData = {};
  const phone = toE164IL(contact.phone);
  if (phone) out.phone_number = phone;
  const email = typeof contact.email === "string" ? contact.email.trim().toLowerCase() : "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.email = email;
  return out.phone_number || out.email ? out : null;
}

/** Adds user_data only when enhanced conversions are enabled (default: the module constant, currently off). */
export function withUserData<T extends DataLayerEvent>(
  payload: T,
  contact: { phone?: string | null; email?: string | null },
  enabled: boolean = ENHANCED_CONVERSIONS_USER_DATA,
): T & { user_data?: UserData } {
  if (!enabled) return payload;
  const userData = buildUserData(contact);
  return userData ? { ...payload, user_data: userData } : payload;
}

export function leadSubmitEvent(
  source: string,
  attribution: AttributionFields,
  contact: { phone?: string | null; email?: string | null } = {},
): DataLayerEvent {
  return withUserData(
    {
      event: "lead_submit",
      source,
      ...attribution,
      value: CONVERSION_VALUES.leadSubmit,
      currency: CONVERSION_CURRENCY,
    },
    contact,
  );
}

export type OnboardingState = "DIAGNOSING" | "STRATEGIZING" | "REVIEWING" | "COMPLETED";

export type OnboardingTrackingContext = {
  push: DataLayerPush;
  sessionId: string;
  attribution: AttributionFields;
  /** Demo mode (?demo=1) or a staff session (wao-admin cookie): nothing is pushed. */
  suppressed: boolean;
};

export type OnboardingContact = { phone?: string | null; email?: string | null };

/**
 * Once-per-session guards for the three onboarding conversions. One instance per page session (kept in a ref next to
 * sessionIdRef); each event fires at most once for its lifetime. A suppressed call does NOT consume the event.
 */
export function createOnboardingConversions() {
  const fired = new Set<string>();

  function fire(ctx: OnboardingTrackingContext, name: string, payload: DataLayerEvent): boolean {
    if (ctx.suppressed || fired.has(name)) return false;
    fired.add(name);
    ctx.push(payload);
    return true;
  }

  return {
    /** The bot response carried firstAdPreview. */
    firstAdShown(ctx: OnboardingTrackingContext): boolean {
      return fire(ctx, ADS_BOT_EVENTS.firstAdShown, {
        event: ADS_BOT_EVENTS.firstAdShown,
        session_id: ctx.sessionId,
        value: CONVERSION_VALUES.adsBotFirstAdShown,
        currency: CONVERSION_CURRENCY,
        ...ctx.attribution,
      });
    },

    /** Fires when a response moves the session into REVIEWING from any other state and the phone was collected. */
    stateChanged(
      ctx: OnboardingTrackingContext,
      previous: OnboardingState | string | undefined,
      next: OnboardingState | string | undefined,
      contact: OnboardingContact | undefined,
    ): boolean {
      if (next !== "REVIEWING" || previous === "REVIEWING") return false;
      if (!contact?.phone) return false;
      return fire(
        ctx,
        ADS_BOT_EVENTS.intakeCompleted,
        withUserData(
          {
            event: ADS_BOT_EVENTS.intakeCompleted,
            session_id: ctx.sessionId,
            value: CONVERSION_VALUES.adsBotIntakeCompleted,
            currency: CONVERSION_CURRENCY,
            ...ctx.attribution,
          },
          contact,
        ),
      );
    },

    /** The bot response carried approved: true (owner approved the plan in REVIEWING). */
    approved(ctx: OnboardingTrackingContext): boolean {
      return fire(ctx, ADS_BOT_EVENTS.approved, { event: ADS_BOT_EVENTS.approved, session_id: ctx.sessionId });
    },
  };
}

export type OnboardingConversions = ReturnType<typeof createOnboardingConversions>;

/** window.dataLayer push for browser callers. */
export function pushToDataLayer(event: DataLayerEvent): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(event);
}
