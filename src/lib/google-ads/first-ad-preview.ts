// Ads Bot onboarding: the owner sees a first real ad after THREE answers (Eitan, 2026-11-20).
// The product pages promise it literally ("three questions, and your ad is in front of you").
//
//   Q1  how he delivers the service  -> serviceModel   (buttons, client-side, page.tsx selectDeliveryModel)
//   Q2  which main service            -> primaryService / businessNiche  (/api/bot, this gate)
//   Q3  service area                  -> targetLocation / specificCities (/api/bot, this gate) -> first ad preview
//
// After the preview the rest of the intake is an optional "sharpen it" continuation in the normal
// DIAGNOSING flow (simulation switch or live Adam prompt). The preview never changes state:
// currentState stays DIAGNOSING, so REVIEWING (approval) and every payment / launch gate are reached
// only through the full intake exactly as before. Nothing goes live from the first preview.
//
// HEBREW-SAFETY: this file holds no Hebrew. The question / reply strings are injected by the caller.
import type { CollectedData } from "@/lib/bot/prompts";
import { checkRateLimit, type RateLimitResult } from "../payments/rate-limit";

export const FIRST_AD_QUESTION_COUNT = 3;

/** turnIndex the regular intake resumes at after the preview: T2, the business-name question. */
export const SHARPEN_RESUME_TURN = 1;

export type OnboardingState = "DIAGNOSING" | "STRATEGIZING" | "REVIEWING" | "COMPLETED";
export type QuickIntakeStep = "main_service" | "service_area";

export function hasFirstAdPreview(data: CollectedData | undefined): boolean {
  return Boolean(data?.firstAdPreviewShown);
}

/**
 * The quick-intake step the next typed answer belongs to, or null once the gate is passed.
 * A session that already holds a niche AND an area (the demo profile, an older in-flight session)
 * is past the gate even without the flag, so it is never pulled back into the three questions.
 */
export function pendingQuickIntakeStep(state: string, data: CollectedData | undefined): QuickIntakeStep | null {
  if (state !== "DIAGNOSING" || hasFirstAdPreview(data)) return null;
  if (!data?.businessNiche) return "main_service";
  if (!data.targetLocation) return "service_area";
  return null;
}

/** "Question N of 3" while the gate is open; null afterwards (the counter is hidden while sharpening). */
export function quickIntakeProgress(state: string, data: CollectedData | undefined): { current: number; total: number } | null {
  if (state !== "DIAGNOSING" || hasFirstAdPreview(data)) return null;
  if (data?.businessNiche && data.targetLocation) return null;
  const answered = (data?.serviceModel ? 1 : 0) + (data?.businessNiche ? 1 : 0);
  return { current: Math.min(answered + 1, FIRST_AD_QUESTION_COUNT), total: FIRST_AD_QUESTION_COUNT };
}

/** Keeps the preview flag when a live model rewrites collectedData and drops fields it does not know. */
export function carryFirstAdPreviewFlag(before: CollectedData | undefined, after: CollectedData | undefined): CollectedData | undefined {
  if (!after || !hasFirstAdPreview(before) || hasFirstAdPreview(after)) return after;
  return { ...after, firstAdPreviewShown: true };
}

export interface FirstAdCampaign {
  strategy: unknown;
  copy: unknown;
  /** false = rate-limited: the client must not build the landing-page preview for this ad. */
  landingPreview?: boolean;
}

// Cost guard: answer 3 triggers paid model calls (2 specialists + 2 landing-page calls). Per client IP,
// in-memory fixed windows (src/lib/payments/rate-limit.ts, single-process app). Staff are exempt.
export const FIRST_AD_HOURLY_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 } as const;
export const FIRST_AD_DAILY_LIMIT = { maxRequests: 20, windowMs: 24 * 60 * 60 * 1000 } as const;

type RateCheck = (key: string, limit: { maxRequests: number; windowMs: number }) => RateLimitResult;

/** True when this client may have a full (model-written) first ad; false = template ad, no page. */
export function allowFirstAdGeneration(clientKey: string, isStaff: boolean, check: RateCheck = checkRateLimit): boolean {
  if (isStaff) return true;
  if (!check(`first-ad:hour:${clientKey}`, FIRST_AD_HOURLY_LIMIT).allowed) return false;
  return check(`first-ad:day:${clientKey}`, FIRST_AD_DAILY_LIMIT).allowed;
}

export interface QuickIntakeDeps {
  /** True for synthetic transcript lines (upload acknowledgements) that are not an answer. */
  isNonAnswer: (text: string) => boolean;
  /** Stores the main-service answer exactly like the regular T1 does. */
  storeMainService: (data: CollectedData, text: string) => void;
  askMainService: (data: CollectedData) => string;
  askServiceArea: (data: CollectedData) => string;
  /** Adam's line after answer 3; it ends with the first sharpen question (business name, T2). */
  firstAdReady: string;
  buildFirstAd: (data: CollectedData) => Promise<FirstAdCampaign>;
}

export interface QuickIntakeResult {
  response: string;
  currentState: "DIAGNOSING";
  collectedData: CollectedData;
  strategy?: unknown;
  copy?: unknown;
  firstAdPreview?: true;
  landingPreview?: boolean;
}

export async function runQuickIntakeTurn(
  step: QuickIntakeStep,
  rawText: string,
  collectedData: CollectedData,
  deps: QuickIntakeDeps,
): Promise<QuickIntakeResult> {
  const text = rawText.trim();
  const data: CollectedData = { ...collectedData };
  const ask = (response: string): QuickIntakeResult => ({ response, currentState: "DIAGNOSING", collectedData: data });

  if (step === "main_service") {
    if (deps.isNonAnswer(text) || text.length < 3) return ask(deps.askMainService(data));
    deps.storeMainService(data, text);
    data.turnIndex = 0;
    return ask(deps.askServiceArea(data));
  }

  if (deps.isNonAnswer(text) || text.length < 2) return ask(deps.askServiceArea(data));
  data.targetLocation = text;
  data.specificCities = text;
  const { strategy, copy, landingPreview = true } = await deps.buildFirstAd(data);
  data.firstAdPreviewShown = true;
  data.turnIndex = SHARPEN_RESUME_TURN;
  return { response: deps.firstAdReady, currentState: "DIAGNOSING", collectedData: data, strategy, copy, firstAdPreview: true, landingPreview };
}
