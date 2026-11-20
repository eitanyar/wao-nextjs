// HEBREW-SAFETY: zero Hebrew bytes.
import assert from "node:assert/strict";
import test from "node:test";

import {
  ENHANCED_CONVERSIONS_USER_DATA,
  buildUserData,
  createOnboardingConversions,
  leadSubmitEvent,
  toE164IL,
  withUserData,
  type DataLayerEvent,
  type OnboardingTrackingContext,
} from "./conversions";

function ctx(overrides: Partial<OnboardingTrackingContext> = {}) {
  const pushed: DataLayerEvent[] = [];
  const context: OnboardingTrackingContext = {
    push: (event) => void pushed.push(event),
    sessionId: "s-1",
    attribution: { utm_source: "test", utm_campaign: "qa" },
    suppressed: false,
    ...overrides,
  };
  return { context, pushed };
}

test("first ad shown: payload, value 15 ILS, attribution, once per session", () => {
  const tracker = createOnboardingConversions();
  const { context, pushed } = ctx();
  assert.equal(tracker.firstAdShown(context), true);
  assert.equal(tracker.firstAdShown(context), false);
  assert.deepEqual(pushed, [
    { event: "ads_bot_first_ad_shown", session_id: "s-1", value: 15, currency: "ILS", utm_source: "test", utm_campaign: "qa" },
  ]);
});

test("intake completed: only on a transition into REVIEWING with a phone, once", () => {
  const tracker = createOnboardingConversions();
  const { context, pushed } = ctx();
  assert.equal(tracker.stateChanged(context, "DIAGNOSING", "DIAGNOSING", { phone: "0521234567" }), false);
  assert.equal(tracker.stateChanged(context, "REVIEWING", "REVIEWING", { phone: "0521234567" }), false, "already REVIEWING");
  assert.equal(tracker.stateChanged(context, "DIAGNOSING", "REVIEWING", {}), false, "no phone");
  assert.equal(tracker.stateChanged(context, "DIAGNOSING", "REVIEWING", undefined), false);
  assert.equal(pushed.length, 0);
  assert.equal(tracker.stateChanged(context, "STRATEGIZING", "REVIEWING", { phone: "0521234567", email: "a@b.co" }), true);
  assert.equal(tracker.stateChanged(context, "DIAGNOSING", "REVIEWING", { phone: "0521234567" }), false, "once");
  assert.deepEqual(pushed, [
    { event: "ads_bot_intake_completed", session_id: "s-1", value: 60, currency: "ILS", utm_source: "test", utm_campaign: "qa" },
  ]);
  assert.ok(!("user_data" in pushed[0]), "user_data stays off");
});

test("approved: session_id only, once", () => {
  const tracker = createOnboardingConversions();
  const { context, pushed } = ctx();
  assert.equal(tracker.approved(context), true);
  assert.equal(tracker.approved(context), false);
  assert.deepEqual(pushed, [{ event: "ads_bot_approved", session_id: "s-1" }]);
});

test("demo / staff sessions (suppressed) push nothing and do not consume the once-guard", () => {
  const tracker = createOnboardingConversions();
  const suppressed = ctx({ suppressed: true });
  assert.equal(tracker.firstAdShown(suppressed.context), false);
  assert.equal(tracker.stateChanged(suppressed.context, "DIAGNOSING", "REVIEWING", { phone: "0521234567" }), false);
  assert.equal(tracker.approved(suppressed.context), false);
  assert.equal(suppressed.pushed.length, 0);
  const live = ctx();
  assert.equal(tracker.firstAdShown(live.context), true);
  assert.equal(live.pushed.length, 1);
});

test("each session gets its own guards", () => {
  const a = createOnboardingConversions();
  const b = createOnboardingConversions();
  const { context, pushed } = ctx();
  a.firstAdShown(context);
  b.firstAdShown(context);
  assert.equal(pushed.length, 2);
});

test("lead_submit keeps its name and adds attribution, value 60 and ILS; no user_data while disabled", () => {
  const event = leadSubmitEvent("contact-page", { ref: "google-ads", utm_source: "test", utm_medium: "cpc", utm_campaign: "qa" }, {
    phone: "050-123-4567",
    email: "x@y.co",
  });
  assert.deepEqual(event, {
    event: "lead_submit",
    source: "contact-page",
    ref: "google-ads",
    utm_source: "test",
    utm_medium: "cpc",
    utm_campaign: "qa",
    value: 60,
    currency: "ILS",
  });
});

test("enhanced conversions are disabled by default", () => {
  assert.equal(ENHANCED_CONVERSIONS_USER_DATA, false);
  const base = { event: "x" };
  assert.equal(withUserData(base, { phone: "0521234567" }), base);
  assert.deepEqual(withUserData(base, { phone: "0521234567", email: " A@B.co " }, true), {
    event: "x",
    user_data: { phone_number: "+972521234567", email: "a@b.co" },
  });
  assert.deepEqual(withUserData(base, { phone: "garbage", email: "nope" }, true), base);
});

test("toE164IL normalizes Israeli numbers", () => {
  assert.equal(toE164IL("0521234567"), "+972521234567");
  assert.equal(toE164IL("052-123-4567"), "+972521234567");
  assert.equal(toE164IL("052 1234567"), "+972521234567");
  assert.equal(toE164IL("+972 52-123-4567"), "+972521234567");
  assert.equal(toE164IL("972521234567"), "+972521234567");
  assert.equal(toE164IL("00972521234567"), "+972521234567");
  assert.equal(toE164IL("+972052-123-4567"), "+972521234567");
  assert.equal(toE164IL("03-1234567"), "+97231234567");
  assert.equal(toE164IL("077-1234567"), "+972771234567");
  assert.equal(toE164IL("052123456"), null, "mobile too short");
  assert.equal(toE164IL("5212345678"), null, "no trunk prefix");
  assert.equal(toE164IL(""), null);
  assert.equal(toE164IL(undefined), null);
  assert.equal(toE164IL("a@b.co"), null);
});

test("buildUserData returns null when nothing valid", () => {
  assert.equal(buildUserData({ phone: "x", email: "y" }), null);
  assert.deepEqual(buildUserData({ email: "a@b.co" }), { email: "a@b.co" });
});
