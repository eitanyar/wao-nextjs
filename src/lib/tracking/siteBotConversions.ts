/**
 * dataLayer events for the Site Bot ads-first launch funnel (build step 1, 2026-11-25). GTM maps the names to Google Ads
 * conversions; no tags are created here. Same push shape as TrackedLink / conversions.ts (window.dataLayer.push).
 *
 *   site_bot_check_completed    the confirmed free-check result is shown        { offer }
 *   site_bot_waitlist_joined    the waiting-list form was accepted              { reason: preopen | full | trade }
 *   site_bot_interview_started  the server claimed a fresh interview spot       {}
 *   site_bot_paid_signup        the checkout callback reported a fresh sign-up  {}
 *
 * Each fires exactly once per subject (the audit + place, or the checkout session): an in-memory guard for re-renders
 * and effect re-runs, plus a sessionStorage mark so a reload or a back-navigation does not fire it again. Identifiers are
 * used for the guard only and never pushed; no personal data reaches the dataLayer.
 * Pure apart from the injected context. HEBREW-SAFETY: zero Hebrew bytes.
 */
import type { DataLayerEvent, DataLayerPush } from './conversions';

export const SITE_BOT_EVENTS = {
  checkCompleted: 'site_bot_check_completed',
  waitlistJoined: 'site_bot_waitlist_joined',
  interviewStarted: 'site_bot_interview_started',
  paidSignup: 'site_bot_paid_signup',
} as const;

export type SiteBotEventName = (typeof SITE_BOT_EVENTS)[keyof typeof SITE_BOT_EVENTS];

type OnceStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };

export interface SiteBotTrackingContext {
  push: DataLayerPush;
  /** sessionStorage, or null when unavailable (then only the in-memory guard applies). */
  storage: OnceStorage | null;
  /** In-memory guard; one Set per page session (browserSiteBotTracking shares one module-level Set). */
  fired: Set<string>;
}

const STORAGE_PREFIX = 'wao-sb-event:';

/** Pushes `payload` unless `onceKey` already fired in this page session or this browser tab. */
export function fireSiteBotEventOnce(ctx: SiteBotTrackingContext, onceKey: string, payload: DataLayerEvent): boolean {
  const key = `${payload.event}:${onceKey}`;
  if (ctx.fired.has(key)) return false;
  try {
    if (ctx.storage?.getItem(STORAGE_PREFIX + key)) {
      ctx.fired.add(key);
      return false;
    }
  } catch {
    // Storage blocked: the in-memory guard still holds.
  }
  ctx.fired.add(key);
  try { ctx.storage?.setItem(STORAGE_PREFIX + key, '1'); } catch { /* storage full or blocked */ }
  ctx.push(payload);
  return true;
}

export function trackCheckCompleted(ctx: SiteBotTrackingContext, subject: { auditId: string; placeId: string; offer: string }): boolean {
  return fireSiteBotEventOnce(ctx, `${subject.auditId}:${subject.placeId}`, { event: SITE_BOT_EVENTS.checkCompleted, offer: subject.offer });
}

export function trackWaitlistJoined(ctx: SiteBotTrackingContext, subject: { auditId: string; placeId: string; reason: string }): boolean {
  return fireSiteBotEventOnce(ctx, `${subject.auditId}:${subject.placeId}`, { event: SITE_BOT_EVENTS.waitlistJoined, reason: subject.reason });
}

export function trackInterviewStarted(ctx: SiteBotTrackingContext, subject: { auditId: string; placeId: string }): boolean {
  return fireSiteBotEventOnce(ctx, `${subject.auditId}:${subject.placeId}`, { event: SITE_BOT_EVENTS.interviewStarted });
}

export function trackPaidSignup(ctx: SiteBotTrackingContext, subject: { sessionId: string }): boolean {
  return fireSiteBotEventOnce(ctx, subject.sessionId, { event: SITE_BOT_EVENTS.paidSignup });
}

const browserFired = new Set<string>();

/** The browser context: window.dataLayer + sessionStorage + one module-level guard. Null on the server. */
export function browserSiteBotTracking(): SiteBotTrackingContext | null {
  if (typeof window === 'undefined') return null;
  let storage: OnceStorage | null = null;
  try { storage = window.sessionStorage; } catch { storage = null; }
  return {
    push: event => {
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push(event);
    },
    storage,
    fired: browserFired,
  };
}
