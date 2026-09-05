import assert from "node:assert/strict";
import test from "node:test";
import { resolveBoundedOnboardingResponse } from "./onboarding-response";

test("a valid live onboarding response is preserved", async () => {
  const live = {
    response: "live response",
    currentState: "DIAGNOSING",
    collectedData: { turnIndex: 3 },
    isSimulation: false,
  };

  const result = await resolveBoundedOnboardingResponse({
    live: async () => live,
    fallback: () => {
      throw new Error("fallback must not run");
    },
    timeoutMs: 10,
  });

  assert.equal(result, live);
});

test("a hung live onboarding response falls back with the post-name continuation", async () => {
  const result = await resolveBoundedOnboardingResponse({
    live: () => new Promise<never>(() => {}),
    fallback: () => ({
      response: "deterministic continuation",
      currentState: "DIAGNOSING",
      collectedData: {
        businessNiche: "Synthetic landscaping",
        businessName: "Demo Yard Co",
        ownerName: "Alex",
        turnIndex: 3,
      },
      isSimulation: true,
    }),
    timeoutMs: 10,
  });

  assert.equal(result.currentState, "DIAGNOSING");
  assert.equal(result.response.length > 0, true);
  assert.equal(result.collectedData.ownerName, "Alex");
  assert.equal(result.collectedData.turnIndex, 3);
  assert.equal(result.isSimulation, true);
});

test("a rejected live onboarding response falls back in finite time", async () => {
  const result = await resolveBoundedOnboardingResponse({
    live: async () => {
      throw new Error("upstream failure");
    },
    fallback: () => ({
      response: "deterministic continuation",
      currentState: "DIAGNOSING",
      collectedData: { ownerName: "Alex", turnIndex: 3 },
      isSimulation: true,
    }),
    timeoutMs: 10,
  });

  assert.equal(result.response.length > 0, true);
  assert.equal(result.currentState, "DIAGNOSING");
  assert.equal(result.isSimulation, true);
});
