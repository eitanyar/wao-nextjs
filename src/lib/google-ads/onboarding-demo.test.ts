import assert from "node:assert/strict";
import test from "node:test";

import { resolveOnboardingDemoEntry } from "./onboarding-demo";

const expectedDemo = {
  isDemo: true,
  mode: "test",
  clientId: "google-ads-sandbox",
} as const;

const expectedNormal = {
  isDemo: false,
  mode: "test",
} as const;

test("accepts the advertised demo query in any parameter order", () => {
  assert.deepEqual(
    resolveOnboardingDemoEntry("?demo=1&mode=test&clientId=google-ads-sandbox"),
    expectedDemo,
  );
  assert.deepEqual(
    resolveOnboardingDemoEntry("?clientId=google-ads-sandbox&demo=1&mode=test"),
    expectedDemo,
  );
});

test("allows unrelated marketing parameters", () => {
  assert.deepEqual(
    resolveOnboardingDemoEntry(
      "?utm_source=homepage&demo=1&ref=ads&mode=test&clientId=google-ads-sandbox",
    ),
    expectedDemo,
  );
});

test("fails closed for missing or empty security parameters", () => {
  for (const search of [
    "?demo=1&mode=test",
    "?demo=1&clientId=google-ads-sandbox",
    "?mode=test&clientId=google-ads-sandbox",
    "?demo=&mode=test&clientId=google-ads-sandbox",
  ]) {
    assert.deepEqual(resolveOnboardingDemoEntry(search), expectedNormal);
  }
});

test("fails closed for repeated or conflicting security parameters", () => {
  for (const search of [
    "?demo=1&demo=1&mode=test&clientId=google-ads-sandbox",
    "?demo=1&mode=test&mode=live&clientId=google-ads-sandbox",
    "?demo=1&mode=test&clientId=google-ads-sandbox&clientId=other",
  ]) {
    assert.deepEqual(resolveOnboardingDemoEntry(search), expectedNormal);
  }
});

test("fails closed for alternate IDs and live mode", () => {
  assert.deepEqual(
    resolveOnboardingDemoEntry("?demo=1&mode=test&clientId=other"),
    expectedNormal,
  );
  assert.deepEqual(
    resolveOnboardingDemoEntry("?demo=1&mode=live&clientId=google-ads-sandbox"),
    expectedNormal,
  );
});

test("fails closed for malformed or empty input", () => {
  for (const search of [
    "",
    "?",
    "?demo=1&mode=test&clientId=google-ads-sandbox%",
    "?demo=1&mode=test&clientId=%E0%A4%A",
  ]) {
    assert.deepEqual(resolveOnboardingDemoEntry(search), expectedNormal);
  }
});
