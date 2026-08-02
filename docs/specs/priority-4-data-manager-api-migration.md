# Technical Specification — Priority 4: Data Manager API Migration for Offline Conversion Upload

Author: Dror (PPC Strategist), on behalf of WAO strategy
Owner for implementation: Eitan-Dev (Next.js Engineer) — **and Eitan personally for the manual
Google Cloud Console / OAuth steps in §2, which are on the critical path and cannot be done by
an agent**
Verification owner: Roni (Verifier)
Status: **Blocked on manual setup, not "ready for implementation" — read §0.1 before starting**
Depends on: `docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md` (extracted
`uploadLeadConversion({leadId, type})` in `src/lib/google-ads/conversion-upload.ts` specifically so
this migration would be a contained swap of that function's internals — see that spec's §4).
Supersedes: the "explicitly deferred, needs its own spec" item at the bottom of Priority 3's
Definition of Done.

---

## 0. Problem Statement

Priority 3 flagged, from a dated blog post, that Google was migrating offline-conversion-import off
the classic Google Ads API (`ConversionUploadService.UploadClickConversions`) to the new **Data
Manager API**, with new integrations blocked as of June 15, 2026, and tokens that had already sent at
least one such request between January and June 2026 grandfathered into continued legacy access.
At the time, WAO had no confirmation of which bucket its developer token fell into — the existing
`uploadConversion()` call only logged failures to `console.error`, invisible anywhere.

**That open question is now closed, empirically, not by inference.** A live test call today
(2026-08-02) — `uploadClickConversions` via the `google-ads-api` npm package, sandbox account
`customer_id 1725891566` (`data/campaigns/emergency-trades-4567.json`) — returned this exact
partial-failure error:

> "New integrations for uploading click conversions should use the Data Manager API. Usage of
> ConversionUploadService.UploadClickConversions is limited to existing users. Please see
> https://developers.google.com/data-manager/api/devguides/events/google-ads/offline for more
> information."

WAO's developer token is **not** grandfathered. The classic path
`uploadLeadConversion()` calls today (`services.ClickConversion` +
`customer.conversionUploads.uploadClickConversions(...)`, `src/lib/google-ads/conversion-upload.ts:148-172`)
is dead right now for WAO specifically — not "possibly at risk," confirmed dead.

**Blast radius is narrow, which is the one piece of good news.** June 15's cutoff is scoped to
`ConversionUploadService` only — offline click-conversion upload. It does **not** affect the rest of
WAO's classic-API surface: `src/lib/google-ads/mutations.ts` (campaign/ad-group/budget mutations),
`create-campaign/route.ts`, `negative-keywords/route.ts`, `budget/route.ts`,
`campaign-status/route.ts` all keep working on the classic API unchanged. This spec's scope is
**exactly one function**, `uploadLeadConversion()` — nothing else needs to move.

**Business urgency, stated honestly, not inflated.** WAO has **0 paying clients today**, so nothing
is breaking live revenue or an active client's Smart Bidding signal this week. But it does mean: no
pilot client can go live with offline-conversion feedback reaching Smart Bidding until this migration
ships and is verified — which per `docs/specs/pilot-client-gating.md` is exactly the kind of
readiness gap that should be closed *before*, not discovered *during*, pilot onboarding. Treat this
as a **pilot-readiness blocker**, not a production incident.

### 0.1 Read this before estimating a timeline — the critical path runs through Eitan's Google Cloud Console, not through code

Web-verified 2026-08-02, against Google's own Data Manager API setup docs: any Google Cloud OAuth
app that requests user credentials for the `datamanager` scope, and is in **"In production"**
publishing status, **must complete Google's OAuth verification review** before it can issue tokens
for that scope without an "unverified app" warning screen — and per Google's own restricted/sensitive
scope verification guidance, that review can take **multiple business days to a few weeks**, not
hours, and WAO has no control over Google's queue.

There is a narrower, faster path that plausibly unblocks **sandbox verification only, same session**:
an OAuth app left in **"Testing"** publishing status can issue scope-authorized tokens to up to 100
explicitly-added **test users** without going through verification at all — the user just has to
click through an "unverified app" warning once during consent. Since the account authorizing this
(`eitan@wao.co.il`) is both the developer and the only user who needs a token right now, this is very
likely sufficient to get one working, Data-Manager-scoped refresh token today, **if** WAO's existing
Google Cloud project/OAuth client is currently in Testing status. **This spec cannot confirm that
from the codebase — it depends on the current state of WAO's Google Cloud Console project, which only
Eitan can check.** See §2 for the exact steps either way.

**Honest bottom line on sequencing:**
- **Code changes (§3–§5 below) are same-session work** — small, contained, testable with mocks today,
  independent of whether the Console setup is done yet.
- **A real, verified sandbox upload (§6, Definition of Done)** is only possible after Eitan completes
  §2's manual steps and hands back a working `datamanager`-scoped refresh token. If WAO's OAuth app is
  already in Testing status with `eitan@wao.co.il` as a test user, that could plausibly happen the
  same day. If it's already in "In production" status (likely, since WAO already has a working
  `adwords`-scope flow in production use per `get-google-ads-token.mjs`/`GOOGLE_ADS_REFRESH_TOKEN`),
  adding the new scope may force it back through review, and the real-upload verification step could
  be **blocked for days to weeks** on Google, not on WAO's engineering.
- **Do not report this spec "done" on clean TypeScript/mocked tests alone.** Per the task brief and
  §6.6 below, the bar is a real successful Data Manager API upload against the sandbox account,
  confirmed by Roni — not just code that compiles.

---

## 1. What the Data Manager API is, web-verified today (2026-08-02)

Sources checked: Google's own Data Manager API devguides (`developers.google.com/data-manager/api/`),
the Google Ads Developer Blog post that announced the cutover, and independent PPC-press coverage
corroborating the same dates.

- The Data Manager API is a **separate product from the classic Google Ads API** — different base
  URL (`https://datamanager.googleapis.com`), different auth scope, different request/response shape.
  It launched December 9, 2025 and is the mandated path for new offline-conversion, enhanced-conversions-
  for-leads, and Customer Match integrations.
- **Endpoint for offline click conversions:** `POST https://datamanager.googleapis.com/v1/events:ingest`
  (REST; a gRPC surface also exists). One call can batch up to 2,000 events.
- **Auth:** OAuth 2.0 with scope `https://www.googleapis.com/auth/datamanager` — **distinct from**
  `https://www.googleapis.com/auth/adwords`, which is what WAO's current `GOOGLE_ADS_REFRESH_TOKEN`
  is scoped to. A refresh token's scope is fixed at consent time, so the existing refresh token
  **cannot** be reused — a new consent flow against the new scope is required (§2).
- **No developer token required for Data Manager API calls.** This is a real, useful difference from
  the classic Ads API — `GOOGLE_ADS_DEVELOPER_TOKEN` (the thing that's grandfathered/not-grandfathered
  for `ConversionUploadService`) is irrelevant to this new path entirely. Confirmed: Google's own docs
  never mention a developer-token header for `events:ingest`; it authenticates purely on the OAuth
  bearer token's scope and the Google Ads account access granted to that token's user.
- **Request shape** (`events:ingest`, fields relevant to an offline click conversion — full schema is
  much larger, this is the subset this migration needs):

  ```json
  {
    "destinations": [
      {
        "operatingAccount": { "accountId": "<Google Ads customer_id, no dashes>", "accountType": "GOOGLE_ADS" },
        "loginAccount":     { "accountId": "<MCC customer_id, no dashes>",        "accountType": "GOOGLE_ADS" },
        "productDestinationId": "<numeric conversion action ID>"
      }
    ],
    "events": [
      {
        "transactionId": "<idempotency key — WAO already has this: lead.orderId>",
        "eventTimestamp": "<RFC 3339, e.g. 2026-08-02T14:30:00+03:00>",
        "adIdentifiers": { "gclid": "..." },
        "currency": "ILS",
        "conversionValue": 650
      }
    ]
  }
  ```
  `adIdentifiers` accepts exactly one of `gclid` / `gbraid` / `wbraid` — mirrors the mutually-exclusive
  click-ID shape `uploadLeadConversion()` already builds today.
- **`productDestinationId` is a bare numeric conversion-action ID, not the resource-name string**
  (`customers/{id}/conversionActions/{id}`) that `CampaignConfig.verifiedLeadConversionResourceName`/
  `closedDealConversionResourceName` already store (confirmed against real values in
  `data/campaigns/*.json`, e.g. `"customers/1725891566/conversionActions/7705676785"`). No new field
  or backfill needed — the numeric ID is the trailing path segment, extracted with a one-line
  `resourceName.split('/').pop()`.
- **Headers:** Google's docs are explicit that `IngestionService` requests should **not** set custom
  request headers (e.g. no `login-customer-id` header analog) — routing between login/operating/linked
  accounts happens entirely through the `Destination` object's fields in the request body, not headers.
  This is a real behavioral difference from the classic API's client library, which used a
  `login_customer_id` constructor field on `Customer(...)`.
- **No official, stable Node.js client library confirmed usable here.** Search surfaced a
  `@google-ads/datamanager` npm package reference, but it could not be independently verified (npm
  registry page returned 403 on fetch during this research) and Google's own quickstart examples are
  written for .NET and Java, not Node — the closest Node-specific material found describes
  authenticating with `google-auth-library`/ADC and calling the REST endpoint directly, not a
  generated client. **Recommendation (§3): call the REST endpoint directly with `fetch()`, do not
  add a speculative new npm dependency for this.** This also matches this codebase's existing,
  proven pattern — `scripts/get-google-ads-token.mjs` already does raw `fetch()` OAuth token exchange
  against `oauth2.googleapis.com/token` rather than pulling in `google-auth-library`, and
  `conversion-upload.ts` otherwise stays dependency-light per Priority 3's stated philosophy
  ("proportionate to a single-VPS Next.js app," Priority 3 §1.1). If Eitan later finds a genuinely
  maintained, well-documented Node client during implementation, swapping the internals of
  `sendConversionEvent()` (§3) for it is a contained, low-risk change — same argument Priority 3 made
  for extracting this function in the first place.

Sources: [Data Manager API — Events overview](https://developers.google.com/data-manager/api/devguides/events), [Data Manager API — Send events](https://developers.google.com/data-manager/api/devguides/events/send-events), [Data Manager API — Google Ads offline conversions guide](https://developers.google.com/data-manager/api/devguides/events/google-ads/offline), [Data Manager API — events.ingest reference](https://developers.google.com/data-manager/api/reference/rest/v1/events/ingest), [Data Manager API — Configure destinations and headers](https://developers.google.com/data-manager/api/devguides/concepts/destinations), [Data Manager API — Set up API access](https://developers.google.com/data-manager/api/devguides/quickstart/set-up-access), [Data Manager API — Install a client library](https://developers.google.com/data-manager/api/devguides/quickstart/install-library), [Google Ads Developer Blog — Changes to Offline Click Conversion Import Support](https://ads-developers.googleblog.com/2026/05/changes-to-offline-click-conversion.html), [Google Ads Developer Blog — Data Manager API now supports sending events to GMP destinations](https://ads-developers.googleblog.com/2026/05/data-manager-api-now-supports-sending.html), [Google — Restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification), [PPC Land — Google blocks new offline conversion imports via Ads API from June 15](https://ppc.land/google-blocks-new-offline-conversion-imports-via-ads-api-from-june-15/)

---

## 2. Manual setup required — Eitan, in Google Cloud Console, before §6 can be verified

None of this is code; none of it can be done by an agent. Sequenced in the order Google's own setup
guide presents them:

1. **Confirm which Google Cloud project WAO's existing OAuth client (`GOOGLE_ADS_CLIENT_ID`/
   `GOOGLE_ADS_CLIENT_SECRET`) belongs to**, and its current **publishing status** (Testing vs. In
   production) on the OAuth consent screen ("Google Auth Platform" in current Console naming). This
   single fact determines whether §0.1's fast path or slow path applies — check it first.
2. **Enable the Data Manager API** on that project (Console → APIs & Services → Library → "Data
   Manager API" → Enable). Requires `serviceusage.services.enable` permission on the project.
3. **Add the `datamanager` scope** to the OAuth consent screen's configured scopes (Google Auth
   Platform → Data Access → "Add or remove scopes" → check **Data Manager API** → Update).
4. **Branch on publishing status from step 1:**
   - **If Testing:** add/confirm `eitan@wao.co.il` as a test user (Google Auth Platform → Audience →
     Test users). No verification submission needed. Proceed to step 5.
   - **If In production:** adding a new scope re-triggers Google's review requirement for that scope.
     Submitting for **restricted/sensitive scope verification** is a multi-day-to-multi-week external
     dependency — flag this to Adam/Eitan explicitly as soon as confirmed, since it changes this
     spec's realistic completion date independent of any engineering effort. Consider whether a
     **second, Testing-status OAuth client** (same Cloud project, new client ID) scoped only to
     `datamanager` is a faster unblock for sandbox verification purposes, since it doesn't touch the
     already-in-production `adwords`-scope client at all — cheap to create, avoids re-triggering
     review on the client that already works. Recommend this as the default choice unless Eitan has a
     reason to keep one unified client.
5. **Mint a new, `datamanager`-scoped refresh token.** Reuse the existing
   `scripts/get-google-ads-token.mjs` pattern (it's already exactly this flow — local HTTP redirect
   listener, OAuth consent, code-for-token exchange) with one change: `SCOPE =
   'https://www.googleapis.com/auth/datamanager'` instead of `'.../auth/adwords'`. §4 below specs the
   env-var name this token should be saved under; do not overwrite `GOOGLE_ADS_REFRESH_TOKEN` — the
   two scopes are separate credentials serving separate purposes and both remain in use (classic API
   for mutations, Data Manager API for conversion upload).
6. **Confirm Google Ads account access.** The Google account used to authorize (step 5) must already
   have access to the target Google Ads account(s) — this is very likely already true for
   `eitan@wao.co.il` against WAO's MCC and sandbox account, since the same account already operates
   the classic-API flow today, but confirm rather than assume, per Google's own setup checklist.
7. **Hand the new refresh token to Eitan-Dev for §4's env-var wiring** and confirm to Adam/Roni that
   this step is complete before §6's verification is attempted — this is the literal unblock for the
   Definition of Done.

**This spec explicitly does not attempt to guess or shortcut steps 1 and 4's branch** — that would
make the spec assert a timeline it cannot actually know. Flag the outcome back to Adam once checked.

---

## 3. Architecture Decisions — the swap inside `uploadLeadConversion()`

### 3.1 Preserve the function boundary Priority 3 built for exactly this moment

`uploadLeadConversion({ leadId, type }): Promise<UploadResult>` keeps its exact signature. Every
caller — `/api/leads`'s Mini-CRM trigger, `/api/client/leads`'s scoped feedback route,
`import-conversion/route.ts`'s thin wrapper — needs **zero changes**. This is the entire point of the
Priority 3 extraction; this migration is the payoff. `UploadResult`'s shape (non-throwing, tagged
success/failure/skip) also stays unchanged — no caller needs updating to handle a new error shape.

### 3.2 What moves, concretely

Everything **inside** `uploadLeadConversion()` from the point a click ID and conversion-action
resource name are already resolved (lines ~119–172 of the current file — building the `GoogleAdsApi`
client, resolving `login_customer_id`/refresh token, constructing `services.ClickConversion`, and
calling `customer.conversionUploads.uploadClickConversions(...)`) is replaced by a new, extracted
`sendConversionEvent()` helper in the same file that:
1. Parses the numeric conversion-action ID out of the existing resource-name string
   (`config.verifiedLeadConversionResourceName`/`closedDealConversionResourceName` — no new
   `CampaignConfig` field, per §1's finding that this is a one-line `.split('/').pop()`).
2. Exchanges the (new) `datamanager`-scoped refresh token for a short-lived OAuth access token via a
   plain `fetch()` POST to `https://oauth2.googleapis.com/token` — the exact same primitive
   `scripts/get-google-ads-token.mjs` already uses for the classic-API token exchange, just pointed at
   a different refresh token/client credential pair. **No token caching layer is being built** — this
   function is called at most a handful of times per day per lead-grading action; a fresh token
   exchange per call is well inside Google's rate limits and avoids the complexity (and staleness bugs)
   of an in-memory cache in a process that restarts on every deploy.
3. `POST`s to `https://datamanager.googleapis.com/v1/events:ingest` with the request shape from §1,
   using the resolved `mccId` as `loginAccount.accountId`, `config.customerId` as
   `operatingAccount.accountId`, the parsed numeric ID as `productDestinationId`, the resolved click ID
   as `adIdentifiers`, `lead.orderId || String(lead.id)` as `transactionId` (same idempotency key
   already used for `order_id` in the classic path — Data Manager API's own dedup semantics are
   documented to work the same way, per §1), and the same conversion-value/date logic
   `uploadLeadConversion()` already computes for `verified-lead` vs. `closed-deal` (unchanged — that
   logic lives *above* the swapped block and is not part of this migration).
4. Maps the REST response back into the existing `UploadResult` union: HTTP 200 with no
   `fieldWarnings` → `{ success: true, ... }`; HTTP 200 with `fieldWarnings` present → treat as the
   new equivalent of today's `partial_failure_error` branch (`{ success: false, partialError: ...,
   status: 207 }`, keeping the same shape callers already handle); non-2xx → `{ success: false, error,
   status }`. **No new `UploadResult` variant is introduced** — deliberately, so no caller needs a new
   branch.

### 3.3 `mode: 'test' | 'live'` gating stays exactly as-is

`resolveAdsAccount(mode)` keeps its existing shape and env-var names (`GOOGLE_ADS_TEST_MCC_CUSTOMER_ID`
/ `GOOGLE_ADS_MCC_CUSTOMER_ID`) — the Data Manager API's `Destination.loginAccount` plays exactly the
role `login_customer_id` played in the classic client, so the MCC-resolution logic doesn't need to
change, only the refresh-token lookup does (§4). This also means the existing regression test
(`src/app/api/google-ads/production-access-guards.test.mjs`, which asserts
`conversion-upload.ts` still references `GOOGLE_ADS_TEST_MCC_CUSTOMER_ID`) keeps passing unmodified —
flagged explicitly so Eitan doesn't need to go hunting for why a source-text-regex test exists when
touching this file.

### 3.4 Pure function, no HTTP/session coupling — unchanged discipline from Priority 1–3

`sendConversionEvent()` and the OAuth token exchange it does are plain `fetch()` calls inside the
existing pure function — no `cookies()`, no `NextResponse`, no new coupling to Next.js request/response
machinery. Matches the established convention this codebase has held through three prior specs.

### 3.5 Non-throwing contract preserved

Every failure mode (missing scope-token env var, OAuth token exchange failure, malformed conversion
resource name, non-2xx from `events:ingest`, network error) is caught and mapped to a
`UploadResult`-shaped return, never a thrown exception — matching `uploadLeadConversion()`'s existing
contract and every caller's existing (non-try/catch) usage of it.

---

## 4. Environment Variables — new, alongside existing (not replacing)

| Variable | New? | Purpose |
|---|---|---|
| `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` | Reused | Same OAuth client credentials — **unless** §2 step 4 recommends a second Testing-status client, in which case a second pair (e.g. `GOOGLE_DATAMANAGER_CLIENT_ID`/`_SECRET`) is added instead of overwriting these. Confirm with Eitan which path §2 landed on before wiring this. |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Not used by this path | Confirmed §1 — Data Manager API calls don't send a developer token at all. Left untouched for the classic-API surfaces that still need it (`mutations.ts` etc.). |
| `GOOGLE_ADS_REFRESH_TOKEN` / `GOOGLE_ADS_TEST_REFRESH_TOKEN` | Unchanged, still used | Classic-API scope (`adwords`) — stays exactly as-is for `mutations.ts` and anything else on the classic API. **Not reusable** for this migration (§1 — scope is fixed per-token). |
| `GOOGLE_ADS_DATAMANAGER_REFRESH_TOKEN` | **NEW** | The `datamanager`-scoped refresh token minted in §2 step 5. Read by the new `resolveDataManagerRefreshToken()` helper (mirrors `resolveAdsAccount`'s mode-gated lookup — `GOOGLE_ADS_DATAMANAGER_TEST_REFRESH_TOKEN` for `mode: 'test'` falling back to this if unset, same fallback pattern as the existing `GOOGLE_ADS_TEST_REFRESH_TOKEN`). |
| `GOOGLE_ADS_TEST_MCC_CUSTOMER_ID` / `GOOGLE_ADS_MCC_CUSTOMER_ID` | Unchanged, reused | Same env vars, now also feed `Destination.loginAccount.accountId` (§3.3). No new var needed. |

**Net new for Eitan to set:** one credential
(`GOOGLE_ADS_DATAMANAGER_REFRESH_TOKEN`/`GOOGLE_ADS_DATAMANAGER_TEST_REFRESH_TOKEN`), produced by §2's
manual OAuth flow — not something that can be fabricated or guessed in code.

---

## 5. Files to Modify

### 5.1 `src/lib/google-ads/conversion-upload.ts`
- Remove the `GoogleAdsApi`/`services` import and `buildClient()` (no longer used by this file — this
  is the one function in the codebase that stops depending on `google-ads-api` entirely; other files
  in `src/lib/google-ads/` keep using it, this is a deliberate divergence, comment it as such).
- Add `resolveDataManagerRefreshToken(mode)` (mirrors §3.3/§4).
- Add `getDataManagerAccessToken(refreshToken)` — the OAuth token-exchange `fetch()` (§3.2 step 2).
- Add `parseConversionActionId(resourceName)` — the `.split('/').pop()` extraction (§1), with an
  explicit `null` return (not a throw) if the resource name is malformed or absent, feeding the
  existing "no conversion action resource name" `UploadResult` branch unchanged.
- Add `sendConversionEvent(...)` — builds and sends the `events:ingest` request body (§1/§3.2 step 3),
  maps the response (§3.2 step 4).
- `uploadLeadConversion()`'s own body: unchanged above the swap point (click-ID resolution, campaign
  config resolution, conversion-value/date computation) — only the final block (currently lines
  ~148–187) is replaced by a call to the new helpers.
- Update the file's own header comment (currently documents the "dated caveat" from Priority 3 §4 as a
  forward-looking TODO) to reflect that the migration described there is now **done**, with a pointer
  to this spec instead.

### 5.2 No other file changes required
Confirmed by re-reading every current caller (`src/app/api/leads/route.ts`,
`src/app/api/client/leads/route.ts`, `src/app/api/google-ads/import-conversion/route.ts`) — none
touch anything inside `uploadLeadConversion()`'s internals, all call it only by its stable
`{leadId, type} → UploadResult` shape. This is Priority 3's extraction paying off exactly as designed.

---

## 6. Test Coverage

Same hard rule as Priority 1–3: assert against real behavior via mocks, never source-text regex
(except the one pre-existing regression test in §3.3, which is left as-is because it already tests
the right thing for the right reason).

### 6.1 `src/lib/google-ads/conversion-upload.test.mjs` (NEW — none exists today; this migration is
the first time this file gets direct unit coverage rather than only the source-text guard in
`production-access-guards.test.mjs`)

1. `parseConversionActionId('customers/1725891566/conversionActions/7705676785')` → `'7705676785'`.
2. `parseConversionActionId(null)` → `null`, no throw.
3. `parseConversionActionId('not-a-resource-name')` → `null`, no throw (malformed input doesn't crash
   the caller).
4. Lead with no `gclid`/`wbraid`/`gbraid` → `{ skipped: true, reason: 'no_click_id' }`, and the new
   OAuth-token-exchange `fetch` is **never called** (assert call count zero — regression guard so a
   skip doesn't waste a token exchange).
5. `type: 'closed-deal'` uses `lead.revenue` as `conversionValue` — not the estimated
   `avgJobValue * closeRateEstimate` (carried over unchanged from Priority 3's existing test #16 for
   this file, re-asserted here since this is the first real test file for it).
6. Mocked `fetch` to `oauth2.googleapis.com/token` returns a token; mocked `fetch` to
   `datamanager.googleapis.com/v1/events:ingest` returns `200` with no `fieldWarnings` → `{ success:
   true, leadId, type, conversionValue }`; assert the request body sent matches §1's shape (`gclid`
   under `adIdentifiers`, numeric `productDestinationId`, `transactionId === lead.orderId`).
7. Mocked `events:ingest` response `200` **with** `fieldWarnings` present → `{ success: false,
   partialError: ..., status: 207 }` — same shape as the old partial-failure branch, named explicitly
   as a regression guard, e.g. `test('field warnings map to the same partial-failure shape callers already handle')`.
8. Mocked `events:ingest` response non-2xx (e.g. `401`) → `{ success: false, error, status: 401 }`, no
   throw.
9. Mocked OAuth token exchange itself failing (e.g. `invalid_grant` — the exact failure mode if
   `GOOGLE_ADS_DATAMANAGER_REFRESH_TOKEN` is missing/expired) → `{ success: false, error, status }`,
   not an unhandled rejection — this is the specific failure mode most likely to happen for real
   during §2's setup window, so it must degrade cleanly rather than 500 the calling route.
10. `resolveDataManagerRefreshToken('test')` falls back from
    `GOOGLE_ADS_DATAMANAGER_TEST_REFRESH_TOKEN` to `GOOGLE_ADS_DATAMANAGER_REFRESH_TOKEN` when the
    former is unset — mirrors the existing `resolveAdsAccount` fallback test convention.

### 6.2 `src/app/api/google-ads/production-access-guards.test.mjs` (unchanged, re-verify)
Confirm the existing assertion (`conversionUploadLib` still matches `/GOOGLE_ADS_TEST_MCC_CUSTOMER_ID/`)
still passes after the rewrite — no new test needed, this is a "don't break it" check, not new
coverage.

### 6.3 `src/app/api/client/leads/route.test.mjs` / `src/app/api/leads/route.test.mjs` (no changes
expected)
Both mock `uploadLeadConversion` at the module boundary already (Priority 3 §6.3 #12–14) — since this
migration doesn't change that function's exported signature or `UploadResult` shape, those tests
should require zero edits. Re-run them as a regression check, don't rewrite them.

### 6.4 Explicitly not covered by `node --test`
A real network call to `oauth2.googleapis.com` or `datamanager.googleapis.com` — matches this
codebase's established convention (Priority 1–3 never call live Google Ads API endpoints from
`node --test`; live verification is always a separate, explicit script/manual step). That's §6.5/§7
below, not this section.

### 6.5 Live sandbox verification script (NEW) — `scripts/verify-datamanager-conversion-upload.mjs`
A small, one-shot script (same spirit as `scripts/verify-google-ads-sandbox.mjs` and
`scripts/get-google-ads-token.mjs` — load `.env.local`, call `uploadLeadConversion()` directly against
a real lead, print the raw result) — **not** a `node --test` file, run manually by Eitan/Roni once §2
is complete. Target: a real lead record (or a synthetic one inserted for this purpose) against
`data/campaigns/emergency-trades-4567.json` (`customer_id 1725891566`, the exact account today's
empirical failure was reproduced against, so success here is a direct, symmetric proof the new path
works where the old one now provably doesn't) or `google-ads-sandbox.json` if its conversion-action
resource names get populated first. Prints the full `UploadResult` and, on success, the
`datamanager.googleapis.com` response body (`requestId`) for Roni to independently spot-check in the
Google Ads UI's conversion-action "recent uploads" view if that surface exists (confirm during
verification — not asserted here, since this spec can't verify Google Ads UI surfaces that may
themselves be renamed by the time this runs, per the forward-radar mandate).

---

## 7. Definition of Done

**Not done until every item below is true — clean TypeScript and passing mocks are necessary but
explicitly insufficient, per the task brief.**

- [ ] §2's manual Google Cloud Console setup complete, confirmed by Eitan: Data Manager API enabled,
      `datamanager` scope added, publishing-status branch resolved (Testing+test-user or a second
      Testing-status client, per §2 step 4), a working `datamanager`-scoped refresh token minted and
      handed off.
- [ ] `GOOGLE_ADS_DATAMANAGER_REFRESH_TOKEN` (and `_TEST_` variant if applicable) set in the
      environment Roni will verify against.
- [ ] `src/lib/google-ads/conversion-upload.ts` rewritten per §3/§5 — `uploadLeadConversion()`'s
      signature and `UploadResult` shape unchanged; zero changes needed in any calling route.
- [ ] All new unit tests (§6.1, items 1–10) pass under
      `node --test --test-reporter=spec "src/**/*.test.mjs"`, alongside the full existing suite, 0 fail.
- [ ] `production-access-guards.test.mjs`'s existing assertion still passes unmodified (§6.2).
- [ ] `npm run build` and `npm run lint` clean.
- [ ] **A real, successful Data Manager API upload against the sandbox account**
      (`scripts/verify-datamanager-conversion-upload.mjs`, §6.5), run and confirmed by Roni — a real
      `requestId` back from `datamanager.googleapis.com`, not a mocked or simulated response. This is
      the bar, explicitly, because today's empirical test already proved the *old* path is dead for
      this exact account; "the new code compiles" is not evidence the new path actually works end to
      end against Google's live service, OAuth scope, and account-access grant.
- [ ] Roni separately confirms — by reading `console.error` output or PM2 logs from a deliberately
      broken run (e.g. temporarily unset the new refresh token) — that a Data Manager API failure still
      degrades exactly the way Priority 3 §1.2 requires: the CRM write succeeds, `conversionUpload:
      'failed'` is reported, nothing rolls back, and the failure is loud in logs, not silently
      swallowed. This is the one behavioral guarantee from Priority 3 that must survive this migration
      unchanged.

**If §2 is still pending Google's OAuth verification review when this is otherwise ready:** report
code-complete-but-verification-blocked as a distinct state to Adam, do not report full Definition of
Done — per §0.1, this is a real, honest possibility, not a hedge.
