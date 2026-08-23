/**
 * One-off smoke test: GBP API access prerequisite check per docs/specs/gmb-bot-scope.md §5.
 * Loads .env.local, checks GBP_CLIENT_ID/GBP_CLIENT_SECRET/GBP_REFRESH_TOKEN, and — if
 * present — reports which scopes actually work via a real API call (read-only; never
 * live-writes a reply/post, per the irreversible-write risk in spec §2).
 *
 * Run from the wao/ directory:
 *   node scripts/test-gbp-smoke.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local (same pattern as scripts/test-cf-deploy.mjs)
const envPath = resolve(__dirname, "../.env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) {
    let val = m[2].trim();
    // Strip surrounding quotes the way Next.js's own env loader does — a raw split on "="
    // otherwise leaves literal quote characters baked into the value (e.g. `"abc"` instead of `abc`),
    // which corrupts client_id/client_secret/refresh_token and breaks OAuth token exchange.
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[m[1].trim()] = val;
  }
}

const required = ["GBP_CLIENT_ID", "GBP_CLIENT_SECRET", "GBP_REFRESH_TOKEN"];
const present = required.filter((k) => !!process.env[k]);
const missing = required.filter((k) => !process.env[k]);

console.log("GBP credential check (.env.local):");
console.log("  present:", present.length ? present.join(", ") : "(none)");
console.log("  missing:", missing.length ? missing.join(", ") : "(none)");

if (missing.length > 0) {
  console.log("\nRESULT: BLOCKED — GBP credentials not configured. Cannot run a live API smoke test.");
  console.log("Missing exactly:", missing.join(", "));
  process.exit(0);
}

// Credentials present — proceed to a real live smoke test via src/lib/gbp/client.ts.
console.log("\nCredentials present — loading src/lib/gbp/client.ts and running a live smoke test.\n");

const clientPath = resolve(__dirname, "../src/lib/gbp/client.ts");
const gbp = await import(clientPath);

console.log("hasGbpCredentials():", gbp.hasGbpCredentials());
if (!gbp.hasGbpCredentials()) {
  console.log("\nRESULT: FAIL — env vars are present in the file but hasGbpCredentials() returned false (unexpected).");
  process.exit(1);
}

// Step 1: run with no accountId/locationId to discover real accounts via accounts.list.
console.log("\n--- Pass 1: accounts.list only (no accountId/locationId yet) ---");
const pass1 = await gbp.runGbpScopeSmokeTest();
console.log(JSON.stringify(pass1, null, 2));

if (pass1.results["accounts.list"] !== "pass") {
  console.log("\nRESULT: accounts.list did not pass — stopping here, cannot discover a real account/location to test location.read/reviews.read against.");
  process.exit(0);
}

// Step 2: fetch accounts.list ourselves (client.ts doesn't return the parsed body from the
// smoke test, only pass/fail) so we can pick a real accountId, then list locations under it
// to find a real locationId, then re-run the smoke test with both IDs for location.read/reviews.read.
const token = await (async () => {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GBP_CLIENT_ID,
      client_secret: process.env.GBP_CLIENT_SECRET,
      refresh_token: process.env.GBP_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
})();

const accountsRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
  headers: { Authorization: `Bearer ${token}` },
});
const accountsJson = await accountsRes.json();
console.log("\n--- accounts.list raw response ---");
console.log(JSON.stringify(accountsJson, null, 2));

const accounts = accountsJson.accounts || [];
console.log(`\nFound ${accounts.length} account(s) under this Google login.`);

if (accounts.length === 0) {
  console.log("\nRESULT: accounts.list PASS (200 OK) but zero accounts returned — no GBP account under this Google login to test location.read/reviews.read against.");
  process.exit(0);
}

// Try each account until we find at least one location.
let foundAccountId = null;
let foundLocationId = null;
let locationsJson = null;

for (const acct of accounts) {
  const acctId = acct.name.split("/").pop();
  const readMask = "name,title,categories,serviceItems,storefrontAddress,phoneNumbers,websiteUri,regularHours,metadata";
  const locRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${acct.name}/locations?readMask=${encodeURIComponent(readMask)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const locJson = await locRes.json();
  console.log(`\n--- locations.list for account ${acct.name} (status ${locRes.status}) ---`);
  console.log(JSON.stringify(locJson, null, 2));

  if (locRes.ok && locJson.locations && locJson.locations.length > 0) {
    foundAccountId = acctId;
    foundLocationId = locJson.locations[0].name.split("/").pop();
    locationsJson = locJson;
    break;
  }
}

if (!foundAccountId || !foundLocationId) {
  console.log("\nRESULT: accounts.list PASS, but no locations found under any account — cannot test location.read/reviews.read (nothing to read).");
  process.exit(0);
}

console.log(`\nUsing accountId=${foundAccountId} locationId=${foundLocationId} for location.read + reviews.read.`);

console.log("\n--- Pass 2: full smoke test with real accountId/locationId ---");
const pass2 = await gbp.runGbpScopeSmokeTest(foundAccountId, foundLocationId);
console.log(JSON.stringify(pass2, null, 2));

console.log("\n=== FINAL SUMMARY ===");
for (const [scope, result] of Object.entries(pass2.results)) {
  console.log(`  ${scope}: ${result}`);
}
console.log("\nNo writes were performed (reviews.reply / posts.write are never live-called by this test).");
