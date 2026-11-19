// HEBREW-SAFETY: zero Hebrew bytes. Claim words come from CLAIM_TOKENS at runtime.
import assert from "node:assert/strict";
import test from "node:test";

import { CLAIM_TOKENS as T, MIN_DESCRIPTIONS, MIN_HEADLINES, guardAdCopy, unbackedClaims } from "./ad-claims-guard";

const thin = { primaryService: "plumber", businessNiche: "plumber", targetLocation: "north", serviceModel: "field" as const };

const banned: Record<string, string> = {
  duration: `arrive in 30 ${T.minutes}`,
  durationHours: `24 ${T.hours} service`,
  around_the_clock: "open 24/7",
  years: `20 ${T.yearsOf} x`,
  percent: "100% happy",
  free: `call ${T.free}`,
  licensed: `plumber ${T.licensed}`,
  guarantee: `${T.guarantee} full`,
  price: `fair ${T.price}`,
  shekel: "from ₪150",
};

test("every banned claim is flagged when the owner gave no such fact", () => {
  for (const [name, line] of Object.entries(banned)) {
    assert.ok(unbackedClaims(line, thin).length > 0, `${name} must be flagged: ${line}`);
  }
});

test("neutral lines (service, area, easy to call) pass", () => {
  for (const line of ["plumber north", "plumber in the north area", "call the plumber now", "local plumber"]) {
    assert.deepEqual(unbackedClaims(line, thin), [], line);
  }
});

test("a claim backed by an owner fact is kept", () => {
  assert.deepEqual(unbackedClaims(`20 ${T.yearsOf} x`, { ...thin, yearsInField: "20" }), []);
  assert.deepEqual(unbackedClaims(`plumber ${T.licensed}`, { ...thin, license: "L-123" }), []);
  assert.deepEqual(unbackedClaims(`${T.guarantee} full`, { ...thin, guarantee: "one year" }), []);
  assert.deepEqual(unbackedClaims(`arrive in 30 ${T.minutes}`, { ...thin, responseTime: "half an hour" }), []);
  assert.deepEqual(unbackedClaims(`fair ${T.price}`, { ...thin, pricingNotes: "fixed visit fee" }), []);
  assert.deepEqual(unbackedClaims(`call ${T.free}`, { ...thin, pricingPromises: ["free_quote"] }), []);
  // the owner's own words carry the same claim
  assert.deepEqual(unbackedClaims("100% happy", { ...thin, usp: "100% of jobs on time" }), []);
  // a different fact does not back an unrelated claim
  assert.ok(unbackedClaims(`plumber ${T.licensed}`, { ...thin, guarantee: "one year" }).length > 0);
});

test("guardAdCopy drops unbacked lines and keeps the rest in order", () => {
  const copy = { headlines: ["plumber north", banned.duration, "call the plumber", banned.licensed, "local plumber"], descriptions: ["fast local plumber", banned.percent, "plumber in the north"], callToAction: "x" };
  const out = guardAdCopy(copy, thin);
  assert.deepEqual(out.headlines, ["plumber north", "call the plumber", "local plumber"]);
  assert.deepEqual(out.descriptions, ["fast local plumber", "plumber in the north"]);
  assert.equal(out.callToAction, "x");
});

test("short sets are topped up from the template, which is guarded too", () => {
  const copy = { headlines: [banned.duration, "plumber north", banned.price], descriptions: [banned.free] };
  const template = {
    copy: { headlines: [banned.shekel, "plumber north", "plumber service", "trusted local"], descriptions: [banned.guarantee, "plumber in the north, call now", "local plumber service"] },
    keywords: ["plumber north area"],
  };
  const out = guardAdCopy(copy, thin, template);
  assert.equal(out.headlines.length, MIN_HEADLINES);
  assert.deepEqual(out.headlines, ["plumber north", "plumber service", "trusted local"]);
  assert.equal(out.descriptions.length, MIN_DESCRIPTIONS);
  for (const line of [...out.headlines, ...out.descriptions]) assert.deepEqual(unbackedClaims(line, thin), [], line);
});

test("keywords fill headlines when the template runs dry; nothing over 30 chars is used", () => {
  const out = guardAdCopy({ headlines: [], descriptions: [] }, thin, {
    copy: { headlines: ["plumber north"], descriptions: [] },
    keywords: ["a keyword that is far longer than thirty characters", "plumber nearby", "plumbing services"],
  });
  assert.deepEqual(out.headlines, ["plumber north", "plumber nearby", "plumbing services"]);
});

test("non-array model output becomes empty lists, never a crash", () => {
  const out = guardAdCopy({ headlines: "oops", descriptions: null } as { headlines: unknown; descriptions: unknown }, thin);
  assert.deepEqual(out.headlines, []);
  assert.deepEqual(out.descriptions, []);
});
