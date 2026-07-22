# Technical Specification — Priority 1: Close the Google Ads Execution Loop

Author: Dror (PPC Strategist), on behalf of WAO strategy
Owner for implementation: Eitan-Dev (Next.js Engineer)
Verification owner: Roni (Verifier)
Status: Ready for implementation
Related prior analysis: session `20260722_145343_9a1008` — "Google Ads Bot Status Report" (gap #1: no execution engine; gap #7: source-regex tests only)

---

## 0. Problem Statement

`GoogleAdsOperatorStatus` (`src/lib/google-ads/operator.ts:6`) already declares `'executed'` and `'failed'` as valid states. Nothing in the codebase ever assigns them. `POST /api/google-ads/operator-task` (the only mutation-adjacent route besides `create-campaign`) writes an approval record and stops — it never calls the Google Ads API. There is also no route capable of mutating an *existing* campaign at all: pause/resume, daily-budget change, and negative-keyword add are all unimplemented. This blocks Phase 1.5 (VISION.md's explicit gate before subscription revenue).

This spec closes that loop for the three `kind` values that already exist on `GoogleAdsOperatorTask` and map cleanly to concrete mutations:
- `budget_tune` → daily budget adjustment
- `search_term_cleanup` → negative keyword addition
- (new, general-purpose, not tied to a single `kind`) pause/resume campaign — needed as a primitive the executor calls internally when `tracking_audit`/`conversion_review` findings require pausing spend, and exposed as its own mutation route for direct operator use.

`tracking_audit`, `conversion_review`, `lead_followup`, `general_review` remain **manual, non-executing** task kinds in this phase — they route a human to look at something, they don't fire a Google Ads mutation. Do not build execution for those four kinds in this pass.

---

## 1. Files to Create

### 1.1 `src/lib/google-ads/mutations.ts` (NEW)

Shared mutation primitives. All three new API routes and the executor call into this module — the Google Ads client construction and account resolution logic must not be duplicated a fourth time (it already exists, slightly differently shaped, in `create-campaign/route.ts:69-97`, `import-conversion/route.ts`, and `weekly-digest/route.ts`).

Responsibilities:
- Build a `GoogleAdsApi` client from `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` / `GOOGLE_ADS_DEVELOPER_TOKEN` (reuse pattern from `create-campaign/route.ts:69-79` verbatim — do not fork it a second time; extract it here and re-import from `create-campaign/route.ts` if that avoids duplication, otherwise keep both in sync).
- Resolve a `Customer` handle for a given `CampaignConfig` (`customerId`, `mode`), using the same `GOOGLE_ADS_TEST_REFRESH_TOKEN` / `GOOGLE_ADS_REFRESH_TOKEN` + MCC login-customer-id split as `resolveAdsAccount()` in `create-campaign/route.ts:81-97`.
- Three exported functions, each pure with respect to I/O side effects beyond the single Google Ads API call they make:

```ts
export interface MutationResult {
  success: boolean;
  resourceName?: string;
  error?: string;
}

export async function setCampaignStatus(params: {
  campaignConfig: CampaignConfig; // from '@/lib/crm/intelligence'
  campaignId: string;             // numeric Google Ads campaign ID (not resource name)
  status: 'ENABLED' | 'PAUSED';
}): Promise<MutationResult>;

export async function setCampaignDailyBudget(params: {
  campaignConfig: CampaignConfig;
  campaignId: string;
  dailyBudgetIls: number;         // whole-currency ILS, e.g. 120 — NOT micros. Convert internally.
}): Promise<MutationResult>;

export async function addNegativeKeywords(params: {
  campaignConfig: CampaignConfig;
  adGroupResourceName: string;    // 'customers/{id}/adGroups/{id}' — see §1.1a on resolving this
  keywords: string[];
  matchType?: 'BROAD' | 'PHRASE' | 'EXACT'; // default 'BROAD', matching create-campaign's existing negative convention
}): Promise<MutationResult>;
```

Implementation notes:
- `setCampaignStatus` mutates via `customer.campaigns.update([{ resource_name, status: enums.CampaignStatus.X }])`.
- `setCampaignDailyBudget` must resolve the campaign's `campaign_budget` resource name first (GAQL: `SELECT campaign_budget.resource_name FROM campaign WHERE campaign.id = X`), then `customer.campaignBudgets.update([{ resource_name, amount_micros }])`. Do not assume the budget resource name is cached anywhere on disk — it isn't today.
- `addNegativeKeywords` calls `customer.adGroupCriteria.create([...])` with `negative: true`, mirroring `create-campaign/route.ts:334-339`.
- Every function must catch Google Ads API errors and return `{ success: false, error: <message> }` rather than throwing — the caller (executor, §3) needs a non-throwing contract to persist `'failed'` status with the error message intact.
- No function in this file touches the filesystem or `data/clients/**`. Persistence is the executor's job, not the mutation primitives'.

### 1.1a — Resolving `adGroupResourceName`

`CampaignConfig` (both copies — `create-campaign/route.ts:12-27` and `src/lib/crm/intelligence.ts:25-40`) does **not** currently store the ad-group resource name created in `create-campaign/route.ts:318-325`. Two options; pick option A:

- **Option A (required):** Add `adGroupResourceName: string` to `CampaignConfig` in both locations (the interface is duplicated — keep both in sync, this is a pre-existing duplication, not one to fix in this pass) and populate it in `create-campaign/route.ts` at Step 10 (`campaignConfig` object, `src/app/api/google-ads/create-campaign/route.ts:357-372`) using the `adGroupResourceName` variable already in scope from Step 7 (line 325). This is a one-line addition to an existing object literal plus one field on an existing interface — not a schema migration, since `data/campaigns/*.json` files are read with optional-safe parsing (`loadCampaignConfigBySlug`, `intelligence.ts:298-307`) and missing the new field on old records simply resolves to `undefined`, which the negative-keyword mutation must treat as a hard `400`/`failed` (see §2.3).
- Option B (rejected): re-querying GAQL for the ad group at mutation time. Rejected because it adds an unnecessary API round-trip and a "which ad group" ambiguity if a campaign later has more than one ad group. Not future-proof; do not implement.

### 1.2 `src/app/api/google-ads/campaign-status/route.ts` (NEW)

Pause/resume an existing campaign.

### 1.3 `src/app/api/google-ads/budget/route.ts` (NEW)

Adjust an existing campaign's daily budget.

### 1.4 `src/app/api/google-ads/negative-keywords/route.ts` (NEW)

Add negative keywords to the campaign's ad group.

(Full request/response contracts for 1.2–1.4 in §2.)

---

## 2. Files to Modify / Create — API Contracts

All three routes below share a **common security and shape pattern** copied from `create-campaign/route.ts` and `operator-task/route.ts`:

1. Read session cookie → `verifySessionToken` → `sessionClientId`. 401 if absent.
2. Resolve the client's bound campaign via `loadClientGoogleAdsIndex(sessionClientId)` → `index.primarySlug` → `loadCampaignConfigBySlug(slug)`. 409 if either is missing (exact same pattern as `operator-task/route.ts:37-45`).
3. Run `resolveGoogleAdsMutationAccess({ sessionClientId, requestedClientId: campaignConfig.clientId, mode: campaignConfig.mode, sandboxClientId, liveModeEnabled })` from `@/lib/google-ads/access-policy.js` — **reuse this gate verbatim, do not write a new one.** This is the same function `create-campaign` already uses; it is the single source of truth for sandbox-vs-live and client-ownership checks.
4. On `access.allowed === false`, return `NextResponse.json({ error: access.error }, { status: access.status })`.
5. Call the relevant `src/lib/google-ads/mutations.ts` function.
6. Return the shapes below.

These three routes are also the ones the executor (§3) calls internally — but the executor calls the **mutation functions in `mutations.ts` directly**, not these HTTP routes, to avoid an internal HTTP round-trip and to keep one non-throwing error contract. The routes exist so the operator-panel UI (and Roni's curl-based verification) has a directly callable, session-gated HTTP surface independent of the approval-queue flow, and so each mutation kind is independently testable.

### 2.1 `POST /api/google-ads/campaign-status`

Request body:
```ts
interface CampaignStatusRequest {
  action: 'pause' | 'resume';
}
```

Success response (200):
```ts
interface CampaignStatusResponse {
  success: true;
  campaignId: string;
  status: 'ENABLED' | 'PAUSED';
}
```

Error response (400/401/403/409/500):
```ts
interface ErrorResponse {
  error: string;
}
```

### 2.2 `POST /api/google-ads/budget`

Request body:
```ts
interface BudgetRequest {
  dailyBudgetIls: number; // must be > 0, finite. Reject NaN/0/negative with 400.
}
```

Success response (200):
```ts
interface BudgetResponse {
  success: true;
  campaignId: string;
  dailyBudgetIls: number;
}
```

Validation: reject any value below a floor of 5 ILS/day with `400` and message `'Daily budget must be at least ₪5.'` — this matches the smallest sane Search-campaign budget and prevents a fat-fingered near-zero value from silently starving delivery. This floor is a product guardrail, not a Google Ads platform minimum — confirm the number with Eitan before shipping if a different floor is preferred; do not hardcode it as an "official Google minimum" in any user-facing copy, because Google has no fixed platform minimum.

### 2.3 `POST /api/google-ads/negative-keywords`

Request body:
```ts
interface NegativeKeywordsRequest {
  keywords: string[];     // 1–20 items per call
  matchType?: 'BROAD' | 'PHRASE' | 'EXACT'; // default 'BROAD'
}
```

Success response (200):
```ts
interface NegativeKeywordsResponse {
  success: true;
  campaignId: string;
  added: string[];
}
```

Validation:
- `keywords` must be a non-empty array, max 20 items per request (Google Ads UI convention for batch sanity, not an API-enforced hard cap — keep the cap so a single call/task stays reviewable in one approval).
- Trim and drop empty strings; if the array is empty after trimming, `400`.
- If `campaignConfig.adGroupResourceName` is `undefined` (pre-migration campaign record, see §1.1a), return `409` with `{ error: 'This campaign was created before ad-group binding was tracked. Re-run create-campaign or backfill adGroupResourceName manually.' }` — do not attempt the GAQL fallback described as "rejected" in §1.1a.

---

## 3. Executor — Wiring `operator-task/route.ts` to Actually Execute

### 3.1 Current state (do not remove any of this — extend it)

`src/app/api/google-ads/operator-task/route.ts:74-93` builds an `approval` record via `buildApprovalRecord()` (status hardcoded to `'approved'` inside `operator.ts:256`), appends it to `data/clients/<id>/tasks/google-ads/approvals.jsonl`, fires a best-effort email, and returns. **Everything up to and including the `appendGoogleAdsApproval(approval)` call at line 75 stays exactly as-is.** The new logic is inserted immediately after.

### 3.2 New logic — insert after `appendGoogleAdsApproval(approval)` (line 75), before the email block (line 77)

```ts
const executionResult = await executeGoogleAdsOperatorTask({
  task,
  campaignConfig: campaign,
});

const finalStatus: GoogleAdsOperatorApproval = {
  ...approval,
  status: executionResult.success ? 'executed' : 'failed',
  executedAt: new Date().toISOString(),
  error: executionResult.success ? undefined : executionResult.error,
};

updateGoogleAdsApproval(finalStatus); // see §3.4 — new function in operator.ts, rewrites the matching JSONL line
```

The email send (existing lines 77-86) should report `finalStatus.status`, not the hardcoded "approved" copy currently in `sendGoogleAdsOperatorApprovalEmail` — pass `finalStatus.status` and `finalStatus.error` through as new optional params on that function (small, additive change to `src/lib/mail.ts:55-60`, do not rewrite the function body beyond adding the two fields to the template).

The final `NextResponse.json(...)` (lines 88-93) must return `finalStatus` instead of `approval`, and the `message` field must reflect execution outcome, e.g. `'Task approved and executed.'` or `'Task approved but execution failed: <error>.'`.

### 3.3 New file: `src/lib/google-ads/executor.ts` (NEW)

This is the dispatch table mapping `GoogleAdsOperatorTask['kind']` to a mutation call. It is deliberately conservative: only `budget_tune` and `search_term_cleanup` execute a real mutation in this phase. Everything else is treated as informational and marked `'executed'` immediately with no API call, since there's nothing to execute — a human already has the "why" and "recommended action" text and must act outside the system (e.g. actually going and looking at the landing page for `tracking_audit`).

```ts
import type { GoogleAdsOperatorTask } from './operator';
import type { CampaignConfig } from '@/lib/crm/intelligence';
import { setCampaignDailyBudget, addNegativeKeywords } from './mutations';

export interface ExecutionResult {
  success: boolean;
  error?: string;
}

export async function executeGoogleAdsOperatorTask(params: {
  task: GoogleAdsOperatorTask;
  campaignConfig: CampaignConfig;
}): Promise<ExecutionResult> {
  const { task, campaignConfig } = params;

  switch (task.kind) {
    case 'budget_tune': {
      // Phase 1 executes a conservative, fixed step — it does NOT parse
      // a target number out of task.recommendedAction free text.
      // Direction is inferred from whyNeeded/recommendedAction wording
      // set in operator.ts (search 'lift budget' vs pacing.status 'over').
      // See §3.5 for the exact rule — do not invent a different heuristic.
      ...
    }
    case 'search_term_cleanup': {
      // Phase 1 does NOT auto-mine negative keywords from live search-term
      // reports (no live reporting ingestion yet — see status-report gap #3).
      // It cannot execute without a concrete keyword list. Mark 'failed'
      // with a clear reason so the approval record shows why, rather than
      // silently no-opping as if it succeeded.
      return {
        success: false,
        error: 'Automatic search-term negative mining requires live GAQL search-term reporting (Priority 3, not yet built). Add negatives manually via POST /api/google-ads/negative-keywords.',
      };
    }
    case 'tracking_audit':
    case 'conversion_review':
    case 'lead_followup':
    case 'general_review':
    default:
      // No mutation exists for these kinds. They are informational —
      // mark executed with no side effect, so the queue doesn't show
      // them stuck forever as neither executed nor failed.
      return { success: true };
  }
}
```

### 3.4 New function: `updateGoogleAdsApproval` in `src/lib/google-ads/operator.ts`

`readGoogleAdsApprovals`/`appendGoogleAdsApproval` (operator.ts:230-243) only append — there is no update-in-place for an append-only JSONL log. Add:

```ts
export function updateGoogleAdsApproval(entry: GoogleAdsOperatorApproval): void {
  const file = approvalsPath(entry.clientId);
  const all = readGoogleAdsApprovals(entry.clientId); // already sorted desc by approvedAt
  const next = all.map((existing) => (existing.taskId === entry.taskId ? entry : existing));
  ensureTaskDir(entry.clientId);
  fs.writeFileSync(file, next.map((r) => JSON.stringify(r)).join('\n') + (next.length ? '\n' : ''), 'utf8');
}
```

This rewrites the whole file rather than appending a second line per task — the approvals log must stay a one-row-per-task source of truth (`taskId` unique), not an event stream with duplicate rows the dashboard would need to de-duplicate. Confirm this doesn't collide with any other reader of `approvals.jsonl` that assumes strict append-only semantics — search for other consumers of `readGoogleAdsApprovals` before shipping this (`google-ads-operator-panel.tsx` is the only known one as of this analysis; re-check at implementation time).

### 3.5 `budget_tune` execution rule (fill in the `...` in §3.3)

Do not parse magnitude out of free-text `recommendedAction`. Use the same signal `operator.ts` already used to *decide* this was a `budget_tune` task in the first place (`digest.pacing.status`, `operator.ts:116-131`):

- If the task was generated because pacing is **under** (recommendation: "Consider broadening coverage or lifting budget"): increase the current daily budget by a fixed **+15%**, rounded to the nearest whole ILS.
- `budget_tune` tasks are never generated when pacing is `'over'` (that branch produces `search_term_cleanup` instead, per `operator.ts:117`) — so there is no "decrease" case to handle for this `kind` in Phase 1. Do not add one speculatively.
- Read the current daily budget from `campaignConfig.targetDailyBudget` (already on the interface, `intelligence.ts:33` / `create-campaign/route.ts:20`), compute `newBudget = Math.round(campaignConfig.targetDailyBudget * 1.15)`, call `setCampaignDailyBudget({ campaignConfig, campaignId: <resolve from index>, dailyBudgetIls: newBudget })`.
- After a successful mutation, update the on-disk `CampaignConfig.targetDailyBudget` (and `targetMonthlyBudget = newBudget * 30.4`, matching the existing derivation at `create-campaign/route.ts:366`) so the next digest computes pacing against the new baseline, not the stale one. Use the same `fs.writeFileSync(path.join(configDir, \`${slug}.json\`), ...)` pattern already in `create-campaign/route.ts:373-375` — do not introduce a second persistence mechanism.
- `campaignId` needed for `setCampaignDailyBudget` is not on `CampaignConfig` today — resolve it via `loadClientGoogleAdsIndex(campaignConfig.clientId).campaigns.find(c => c.slug === campaignConfig.slug).campaignId` (the `GoogleAdsCampaignLink.campaignId` field already exists, `intelligence.ts:42-48`). Do this resolution once in `operator-task/route.ts` (which already loaded the index at line 37) and pass `campaignId` into `executeGoogleAdsOperatorTask` as a third param — update the signature in §3.3 accordingly.

---

## 4. Type/Interface Changes Summary (for quick diff review)

| File | Change |
|---|---|
| `src/app/api/google-ads/create-campaign/route.ts` | Add `adGroupResourceName: string` to `CampaignConfig`; populate it in Step 10 object literal |
| `src/lib/crm/intelligence.ts` | Add `adGroupResourceName?: string` to its copy of `CampaignConfig` (optional here — old records won't have it) |
| `src/lib/google-ads/operator.ts` | Add `updateGoogleAdsApproval()` export |
| `src/lib/mail.ts` | `sendGoogleAdsOperatorApprovalEmail` gains optional `status` and `error` params, template reflects them |
| `src/app/api/google-ads/operator-task/route.ts` | Insert execution call + `updateGoogleAdsApproval` + response/email changes described in §3.2 |

New files: `src/lib/google-ads/mutations.ts`, `src/lib/google-ads/executor.ts`, `src/app/api/google-ads/campaign-status/route.ts`, `src/app/api/google-ads/budget/route.ts`, `src/app/api/google-ads/negative-keywords/route.ts`.

---

## 5. Mock Testing Instructions (Eitan-Dev / Claude Code)

Hard rule carried over from the prior gap analysis: **do not repeat the existing anti-pattern.** `create-campaign.conversion-actions.test.mjs` and `production-access-guards.test.mjs` assert against raw route *source text* via regex — that proves a string exists in a file, not that a mutation payload is correct. Every test below must mock the Google Ads client and assert against the **actual constructed request object**, not source text.

### 5.1 Test runner

Project has no test script in `package.json` (`npm test` is not defined) — tests today are run directly via `node --test`. Confirmed working invocation for this repo:
```
node --test --test-reporter=spec "src/**/*.test.mjs"
```
(12/12 existing tests pass with this exact command as of this analysis.) Add new `.test.mjs` files alongside the modules they test, matching the existing convention (`access-policy.test.mjs` next to `access-policy.js`).

### 5.2 Mocking strategy for `google-ads-api`

The `google-ads-api` package instantiates a real `Customer` object with `.campaigns`, `.campaignBudgets`, `.adGroupCriteria`, `.query()` methods that make network calls. Do not call the real API in tests, and do not require live credentials to run the suite. Structure `mutations.ts` so the `GoogleAdsApi`/`Customer` construction is injectable:

```ts
// mutations.ts — export a factory seam, not just the top-level functions
export function buildMutationClient(deps?: { GoogleAdsApiCtor?: typeof GoogleAdsApi }) { ... }
```

In tests, use `node:test`'s `mock.method()` (Node 22 has this built in — confirmed available, this repo runs Node v22.22.1) to stub `Customer.prototype.campaigns.update`, `.campaignBudgets.update`, `.adGroupCriteria.create`, and `.query`, and assert on the **arguments** those mocks were called with (e.g. `assert.equal(callArgs[0].amount_micros, 138_000_000)` for a ₪138/day budget-tune step), not on file content.

### 5.3 Required test cases

**`src/lib/google-ads/mutations.test.mjs`**
1. `setCampaignStatus` with `status: 'PAUSED'` calls `campaigns.update` with the correct `resource_name` and `enums.CampaignStatus.PAUSED` — assert the mock call args, not a regex.
2. `setCampaignDailyBudget` converts ILS to micros correctly: `dailyBudgetIls: 120` → asserts `amount_micros === 120_000_000` in the mocked `campaignBudgets.update` call.
3. `setCampaignDailyBudget` first resolves `campaign_budget.resource_name` via the mocked `.query()` before calling `.update()` — assert call order (query before update) using `mock.method` call count/order, not just "was called."
4. `addNegativeKeywords` with `matchType: 'PHRASE'` calls `adGroupCriteria.create` with `negative: true` and `keyword.match_type === enums.KeywordMatchType.PHRASE` for every keyword in the input array.
5. All three functions return `{ success: false, error: <message> }` (not a thrown exception) when the mocked Google Ads call rejects — assert with `assert.doesNotReject` wrapping the call, then check the returned object shape.

**`src/lib/google-ads/executor.test.mjs`**
6. `executeGoogleAdsOperatorTask` with `kind: 'budget_tune'` and a mocked `setCampaignDailyBudget` that resolves `{ success: true }` — assert the mock was called with `dailyBudgetIls` equal to `Math.round(campaignConfig.targetDailyBudget * 1.15)` for a known input (e.g. `targetDailyBudget: 100` → expect `115`).
7. `executeGoogleAdsOperatorTask` with `kind: 'search_term_cleanup'` returns `{ success: false, error: <non-empty string mentioning GAQL/Priority 3> }` and does **not** call any mutation function — assert the mutation mocks were never invoked (`mock.method(...).mock.callCount() === 0`).
8. `executeGoogleAdsOperatorTask` with `kind: 'tracking_audit'` (and each of `conversion_review`, `lead_followup`, `general_review`) returns `{ success: true }` with no mutation call.

**`src/app/api/google-ads/operator-task.execution.test.mjs`** (new — behavioral, not source-regex, unlike its sibling `create-campaign.conversion-actions.test.mjs`)
9. Mock `executeGoogleAdsOperatorTask` to resolve `{ success: true }`; POST to the route handler directly (import and invoke, constructing a `Request` object) with a valid session cookie and `taskId`; assert the response JSON has `status: 'executed'` and the JSONL file at the (temp-dir-mocked) approvals path has exactly one line for that `taskId` with `status: 'executed'`.
10. Mock `executeGoogleAdsOperatorTask` to resolve `{ success: false, error: 'boom' }`; assert response `status: 'failed'`, `error: 'boom'`, and the persisted JSONL line reflects `'failed'` — **not** `'approved'` (this is the exact regression this whole spec exists to prevent; make this assertion explicit and named clearly, e.g. `test('a failed mutation is never left in approved status forever')`).
11. Call the route twice with the same `taskId` (idempotency — existing behavior at `operator-task/route.ts:64-72` short-circuits on an existing approval) — assert the second call does **not** invoke `executeGoogleAdsOperatorTask` again (no double-mutation on retry/refresh).

**Route-level mock testing for Eitan-Dev (manual, via curl, against the sandbox account only)**
Do this only after the unit tests above pass and only against `GOOGLE_ADS_SANDBOX_CLIENT_ID` / `GOOGLE_ADS_TEST_MCC_CUSTOMER_ID` / `GOOGLE_ADS_TEST_REFRESH_TOKEN` (mode `'test'`) — never against a real client account, per the existing `resolveGoogleAdsMutationAccess` gate:

```bash
# Pause
curl -X POST http://localhost:3000/api/google-ads/campaign-status \
  -H "Content-Type: application/json" -b "wao_session=<sandbox session cookie>" \
  -d '{"action":"pause"}'

# Budget bump
curl -X POST http://localhost:3000/api/google-ads/budget \
  -H "Content-Type: application/json" -b "wao_session=<sandbox session cookie>" \
  -d '{"dailyBudgetIls": 150}'

# Negative keywords
curl -X POST http://localhost:3000/api/google-ads/negative-keywords \
  -H "Content-Type: application/json" -b "wao_session=<sandbox session cookie>" \
  -d '{"keywords": ["חינם", "עבודה"], "matchType": "BROAD"}'
```
After each call, verify via the Google Ads sandbox account UI (or a follow-up GAQL query through `sandbox-verify/route.ts` if it can be extended to read campaign/budget/criteria state — check that route's current scope before assuming it already supports this) that the mutation actually landed, not just that the route returned 200. This is Roni's job at verification time, not Eitan-Dev's to self-certify.

### 5.4 Definition of Done for Priority 1

- [ ] All 11+ new unit tests pass under `node --test --test-reporter=spec "src/**/*.test.mjs"`, alongside the existing 12 (23+ total, 0 fail).
- [ ] `npm run build` is clean (no TypeScript errors from the new `CampaignConfig.adGroupResourceName` field across both interface copies).
- [ ] `npm run lint` is clean.
- [ ] Manual sandbox curl verification (§5.3, route-level) performed by Eitan-Dev, then independently re-verified by Roni per her PASS/FAIL evidence standard — a self-reported "it worked" from Eitan-Dev is not sufficient sign-off per the team's existing verifier role boundary.
- [ ] `data/clients/google-ads-sandbox/tasks/google-ads/approvals.jsonl` shows at least one real `'executed'` record (from a real sandbox `budget_tune` task run end-to-end through `operator-task/route.ts`, not just a unit-mocked one) before this is reported complete.
