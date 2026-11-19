// HEBREW-SAFETY: zero Hebrew bytes. Strings are injected fakes.
import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRST_AD_QUESTION_COUNT,
  SHARPEN_RESUME_TURN,
  carryFirstAdPreviewFlag,
  pendingQuickIntakeStep,
  quickIntakeProgress,
  runQuickIntakeTurn,
  allowFirstAdGeneration,
  FIRST_AD_DAILY_LIMIT,
  FIRST_AD_HOURLY_LIMIT,
  type QuickIntakeDeps,
} from "./first-ad-preview";
import { resetRateLimitState } from "../payments/rate-limit";

function deps(builds: unknown[] = []): QuickIntakeDeps {
  return {
    isNonAnswer: (text) => text === "UPLOAD-ACK",
    storeMainService: (data, text) => { data.primaryService = text; data.businessNiche = text; },
    askMainService: () => "ASK-SERVICE",
    askServiceArea: (data) => `ASK-AREA-${data.serviceModel ?? "none"}`,
    firstAdReady: "FIRST-AD-READY",
    buildFirstAd: async (data) => { builds.push({ ...data }); return { strategy: { keywords: ["k"] }, copy: { headlines: ["h"] } }; },
  };
}

test("the gate is exactly three questions: delivery button, main service, area", async () => {
  assert.equal(FIRST_AD_QUESTION_COUNT, 3);
  let data = { serviceModel: "field" as const, turnIndex: 0 };
  assert.deepEqual(quickIntakeProgress("DIAGNOSING", {}), { current: 1, total: 3 });
  assert.deepEqual(quickIntakeProgress("DIAGNOSING", data), { current: 2, total: 3 });
  assert.equal(pendingQuickIntakeStep("DIAGNOSING", data), "main_service");

  const builds: unknown[] = [];
  const second = await runQuickIntakeTurn("main_service", "plumbing", data, deps(builds));
  assert.equal(second.response, "ASK-AREA-field");
  assert.equal(second.collectedData.businessNiche, "plumbing");
  assert.equal(second.firstAdPreview, undefined);
  assert.equal(builds.length, 0, "no ad before answer 3");
  assert.deepEqual(quickIntakeProgress("DIAGNOSING", second.collectedData), { current: 3, total: 3 });
  assert.equal(pendingQuickIntakeStep("DIAGNOSING", second.collectedData), "service_area");

  const third = await runQuickIntakeTurn("service_area", "north", second.collectedData, deps(builds));
  assert.equal(builds.length, 1, "the ad is built on answer 3");
  assert.equal(third.firstAdPreview, true);
  assert.equal(third.response, "FIRST-AD-READY");
  assert.deepEqual(third.copy, { headlines: ["h"] });
  assert.equal(third.collectedData.targetLocation, "north");
  assert.equal(third.collectedData.specificCities, "north");
  assert.equal(third.collectedData.firstAdPreviewShown, true);
  assert.equal(third.collectedData.turnIndex, SHARPEN_RESUME_TURN);
  data = third.collectedData as typeof data;
  assert.equal(pendingQuickIntakeStep("DIAGNOSING", data), null, "sharpening is the regular intake, not the gate");
  assert.equal(quickIntakeProgress("DIAGNOSING", data), null, "the counter never shows a total past 3");
});

test("the first preview never approves or advances the state", async () => {
  const third = await runQuickIntakeTurn("service_area", "north", { serviceModel: "field", businessNiche: "x" }, deps());
  assert.equal(third.currentState, "DIAGNOSING");
});

test("short answers and upload acknowledgements re-ask without consuming a question", async () => {
  const builds: unknown[] = [];
  const a = await runQuickIntakeTurn("main_service", "ab", { serviceModel: "field" }, deps(builds));
  assert.equal(a.response, "ASK-SERVICE");
  assert.equal(a.collectedData.businessNiche, undefined);
  const b = await runQuickIntakeTurn("service_area", "UPLOAD-ACK", { serviceModel: "field", businessNiche: "x" }, deps(builds));
  assert.equal(b.response, "ASK-AREA-field");
  assert.equal(b.collectedData.targetLocation, undefined);
  assert.equal(builds.length, 0);
});

test("sessions already past the gate (demo profile, older sessions) are never pulled back", () => {
  const demo = { businessNiche: "n", targetLocation: "t", turnIndex: 12 };
  assert.equal(pendingQuickIntakeStep("DIAGNOSING", demo), null);
  assert.equal(quickIntakeProgress("DIAGNOSING", demo), null);
  for (const state of ["STRATEGIZING", "REVIEWING", "COMPLETED"]) {
    assert.equal(pendingQuickIntakeStep(state, {}), null);
    assert.equal(quickIntakeProgress(state, {}), null);
  }
});

test("the preview flag survives a live reply that rewrites collectedData", () => {
  assert.deepEqual(carryFirstAdPreviewFlag({ firstAdPreviewShown: true }, { businessName: "b" }), { businessName: "b", firstAdPreviewShown: true });
  assert.deepEqual(carryFirstAdPreviewFlag({}, { businessName: "b" }), { businessName: "b" });
  assert.equal(carryFirstAdPreviewFlag({ firstAdPreviewShown: true }, undefined), undefined);
});

test("cost guard: 5 first ads per IP per hour, then template only; other IPs and staff unaffected", () => {
  resetRateLimitState();
  assert.deepEqual([FIRST_AD_HOURLY_LIMIT.maxRequests, FIRST_AD_DAILY_LIMIT.maxRequests], [5, 20]);
  for (let i = 0; i < 5; i++) assert.equal(allowFirstAdGeneration("1.1.1.1", false), true, `generation ${i + 1}`);
  assert.equal(allowFirstAdGeneration("1.1.1.1", false), false, "6th in the hour is refused");
  assert.equal(allowFirstAdGeneration("2.2.2.2", false), true, "another IP has its own quota");
  assert.equal(allowFirstAdGeneration("1.1.1.1", true), true, "staff are exempt");
  resetRateLimitState();
});

test("cost guard: 20 per IP per day even when the hourly window keeps resetting", () => {
  const counts = new Map<string, number>();
  const check = (key: string, limit: { maxRequests: number }) => {
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    return { allowed: n <= limit.maxRequests, remaining: 0, retryAfterMs: 0 };
  };
  let allowed = 0;
  for (let hour = 0; hour < 6; hour++) {
    counts.delete("first-ad:hour:9.9.9.9"); // a new hourly window
    for (let i = 0; i < 5; i++) if (allowFirstAdGeneration("9.9.9.9", false, check)) allowed++;
  }
  assert.equal(allowed, 20);
});

test("a rate-limited build is passed through: no landing-page preview", async () => {
  const limited: QuickIntakeDeps = { ...deps(), buildFirstAd: async () => ({ strategy: {}, copy: {}, landingPreview: false }) };
  const res = await runQuickIntakeTurn("service_area", "north", { serviceModel: "field", businessNiche: "x" }, limited);
  assert.equal(res.firstAdPreview, true);
  assert.equal(res.landingPreview, false);
  const normal = await runQuickIntakeTurn("service_area", "north", { serviceModel: "field", businessNiche: "x" }, deps());
  assert.equal(normal.landingPreview, true);
});
