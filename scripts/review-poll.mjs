/**
 * Cron-able GBP review-polling runner (Reputation Loop back-half, stage 1 of 4).
 * Reads a client's GBP reviews (or a fixture file, zero network), diffs against the stored
 * snapshot, and prints the ReviewPollResult as JSON. Never polls all clients in one run.
 *
 * Usage:
 *   node scripts/review-poll.mjs --client=<clientId> [--fixture=<path-to-json>]
 *
 * Without --fixture: live mode — requires GBP_CLIENT_ID/GBP_CLIENT_SECRET/GBP_REFRESH_TOKEN
 * in .env.local. If credentials are missing, exits 0 with a BLOCKED message (no network call).
 * With --fixture: reads raw reviews from the given JSON file instead of any API call —
 * zero network, usable even with zero GBP quota.
 *
 * NOT wired into scripts/cron/ — arming the cron is a separate decision gated on the Google
 * quota approval (memory: project_gbp_quota_request_2026_08_21).
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local (same pattern as scripts/test-gbp-smoke.mjs)
const envPath = resolve(__dirname, "../.env.local");
try {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[m[1].trim()] = val;
    }
  }
} catch {
  // .env.local may not exist in some environments — proceed with whatever is already in process.env.
}

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=")];
  })
);

if (!args.client) {
  console.log("Usage: node scripts/review-poll.mjs --client=<clientId> [--fixture=<path-to-json>]");
  console.log("\n--client is required — this script never polls all clients in one run.");
  process.exit(1);
}

const clientPath = resolve(__dirname, "../src/lib/gbp/client.ts");
const pollPath = resolve(__dirname, "../src/lib/gbp/reviewPoll.ts");
const responderPath = resolve(__dirname, "../src/lib/gbp/reviewResponder.ts");
const sharedClientsPath = resolve(__dirname, "../src/lib/shared/clients.ts");
const gbp = await import(clientPath);
const { pollClientReviews } = await import(pollPath);
const { draftRepliesForBadReviews, createQwenReplyDrafter } = await import(responderPath);
const { loadClient } = await import(sharedClientsPath);

// Fixture-mode fake drafter — zero network, mirrors task _003's unit-test fake.
const fixtureDrafter = async (_systemPrompt, _fewshot, reviewComment) =>
  "[FIXTURE-DRAFT] reply for: " + reviewComment;

async function draftAndPrintBadReviews(result) {
  if (result.badReviews.length === 0) return;
  const client = loadClient(args.client);
  if (!client) {
    console.log(`[review-poll] no client record found for "${args.client}" — skipping draft step.`);
    return;
  }
  const drafter = args.fixture ? fixtureDrafter : createQwenReplyDrafter();
  const appended = await draftRepliesForBadReviews(client, result.badReviews, drafter);
  console.log("APPENDED QUEUE ITEMS:");
  console.log(JSON.stringify(appended, null, 2));
}

if (args.fixture) {
  // Fixture mode — zero network, reads raw reviews straight from the JSON file.
  const fixturePath = resolve(process.cwd(), args.fixture);
  const rawReviews = JSON.parse(readFileSync(fixturePath, "utf-8"));

  const result = await pollClientReviews(args.client, async () => rawReviews);
  console.log(JSON.stringify(result, null, 2));
  await draftAndPrintBadReviews(result);
  process.exit(0);
}

// Live mode — requires BOTH credentials present AND explicit opt-in via
// GBP_INTEGRATION_ENABLED=true (fail-safe per spec — creds may be present ahead of
// Google approving this Cloud Project for Business Profile API access).
if (!gbp.hasGbpCredentials()) {
  console.log("RESULT: BLOCKED — GBP credentials not configured (GBP_CLIENT_ID/GBP_CLIENT_SECRET/GBP_REFRESH_TOKEN missing from env).");
  console.log("Cannot run a live review poll. Use --fixture=<path> to run against test data instead.");
  process.exit(0);
}
if (!gbp.isGbpLive()) {
  console.log("RESULT: BLOCKED — GBP integration not enabled (set GBP_INTEGRATION_ENABLED=true once API access is approved).");
  console.log("Cannot run a live review poll. Use --fixture=<path> to run against test data instead.");
  process.exit(0);
}

// Same token-fetch pattern as scripts/test-gbp-smoke.mjs (client.ts doesn't export
// getAccessToken — it's an internal helper used by runGbpScopeSmokeTest).
async function getAccessTokenLocal() {
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
}

const result = await pollClientReviews(args.client, async (accountId, locationId) => {
  const token = await getAccessTokenLocal();
  const res = await gbp.listReviews(token, accountId, locationId);
  if (!res.ok) {
    throw new Error(`listReviews failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.reviews || [];
});

console.log(JSON.stringify(result, null, 2));
await draftAndPrintBadReviews(result);
