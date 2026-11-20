// HEBREW-SAFETY: zero Hebrew bytes.
import assert from "node:assert/strict";
import test from "node:test";

import {
  ATTRIBUTION_STORAGE_KEY,
  attributionFields,
  parseAttribution,
  resolveFirstTouchAttribution,
} from "./attribution";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

test("parseAttribution reads ref and utm_* and drops blanks", () => {
  assert.deepEqual(parseAttribution("?utm_source=test&utm_campaign=qa&utm_medium=&x=1"), {
    ref: null,
    utm_source: "test",
    utm_medium: null,
    utm_campaign: "qa",
  });
});

test("first touch is stored and survives a later page with no params", () => {
  const storage = memoryStorage();
  const landing = resolveFirstTouchAttribution("?utm_source=test&utm_campaign=qa", storage);
  assert.equal(landing.utm_source, "test");
  assert.ok(storage.data.has(ATTRIBUTION_STORAGE_KEY));
  const onboarding = resolveFirstTouchAttribution("", storage);
  assert.deepEqual(onboarding, { ref: null, utm_source: "test", utm_medium: null, utm_campaign: "qa" });
});

test("stored first touch wins per field; later URLs only fill empty fields", () => {
  const storage = memoryStorage();
  resolveFirstTouchAttribution("?utm_source=test&utm_campaign=qa", storage);
  const contact = resolveFirstTouchAttribution("?ref=google-ads&utm_source=other", storage);
  assert.deepEqual(contact, { ref: "google-ads", utm_source: "test", utm_medium: null, utm_campaign: "qa" });
});

test("throwing or corrupt storage never throws; URL values still apply", () => {
  const throwing = {
    getItem: () => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("QuotaExceeded");
    },
  };
  assert.equal(resolveFirstTouchAttribution("?utm_source=a", throwing).utm_source, "a");
  const corrupt = memoryStorage({ [ATTRIBUTION_STORAGE_KEY]: "{not json" });
  assert.equal(resolveFirstTouchAttribution("?utm_source=b", corrupt).utm_source, "b");
  assert.equal(resolveFirstTouchAttribution("?utm_source=c", null).utm_source, "c");
});

test("attributionFields keeps only fields with a value", () => {
  assert.deepEqual(attributionFields({ ref: null, utm_source: "test", utm_medium: null, utm_campaign: "qa" }), {
    utm_source: "test",
    utm_campaign: "qa",
  });
});
