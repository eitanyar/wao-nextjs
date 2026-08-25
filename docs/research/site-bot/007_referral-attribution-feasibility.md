# Referral Attribution — Feasibility & Minimal-Change Design Recon

- Task: 2026-08-24_007 (handoff/pending/2026-08-24_007_waoengineer_referral-attribution-feasibility.md)
- Date: 2026-08-24
- Author: waoengineer (read-only analysis — zero source files modified)
- Scope: design-on-paper recon of the smallest schema + hook change to (1) attribute a signup to a referrer and (2) grant a per-account product-depth reward (GEO tier at the ₪199 price point) on the referred account's FIRST successful recurring charge. No migrations, no TypeScript — this report is the only artifact.
- Method: every current-state claim below cites `file:line` verified against the working tree.

---

## 0. Baseline: no referral primitives exist

A content search of `src/` for `referral` / `referredBy` / `referred_by` / `reward_ledger` returns zero functional hits — the only match is the English word "referrals" inside marketing prose in `src/lib/bot/prompts.ts:311`. There is no referral code table, no attribution column, and no reward ledger anywhere in the billing engine or the client-record store. Everything below is therefore additive.

---

## 1. Current schema map

### 1.1 Storage layer

All subscription billing state lives in one SQLite database (better-sqlite3, WAL mode) opened by `getDb()` at `src/lib/payments/db.ts:149-167`. Path resolution is `BILLING_DB_PATH` (production) or `./data/billing.db` (dev) — `db.ts:27-38`. Schema is created by idempotent `CREATE TABLE IF NOT EXISTS` migrations inside `migrate()` — `db.ts:43-129` — and additive columns are added via the `addColumnIfMissing()` helper (`db.ts:135-146`), which checks `PRAGMA table_info` before each `ALTER TABLE ... ADD COLUMN`. That helper is the established pattern for exactly the kind of additive change a referral system needs.

### 1.2 `subscriptions` table

Defined at `src/lib/payments/db.ts:45-62`; additive refund-model columns at `db.ts:123-125`. Row type `SubscriptionRow` at `db.ts:179-212`.

| Column | Declared at | Notes |
|---|---|---|
| `id` (PK, TEXT UUID) | `db.ts:46` | `crypto.randomUUID()` at insert |
| `user_id` (TEXT) | `db.ts:47` | holds the customer's **email** — set from `email` at `subscriptions.ts:108`. There is no separate user/account table; email is the identity key |
| `status` (TEXT) | `db.ts:48` | enum `'pending' \| 'trialing' \| 'active' \| 'past_due' \| 'canceled' \| 'expired'` — `db.ts:185` |
| `provider` / `provider_token` | `db.ts:49-50` | token stored encrypted (`subscriptions.ts:206`) |
| `card_last4` / `card_expiry` | `db.ts:51-52` | |
| `trial_amount` (REAL) | `db.ts:53` | trial charge amount (the ₪9.90-scale tokenization charge) |
| `recurring_amount` (REAL) | `db.ts:54` | monthly price charged by the cron engine (`cron-charge.ts:152`) |
| `currency` (TEXT) | `db.ts:55` | defaults `'ILS'` (`subscriptions.ts:97`) |
| `next_charge_at` (TEXT) | `db.ts:56` | cron eligibility driver; NULL ⇒ never charged again |
| `canceled_at` / `cancel_reason` | `db.ts:57-58` | |
| `failed_attempts` (INTEGER) | `db.ts:59` | per-billing-period retry counter, reset to 0 on success (`cron-charge.ts:168`) |
| `created_at` / `updated_at` | `db.ts:60-61` | |
| `joined_at` | `db.ts:123` | refund-window anchor, stamped once at creation (`subscriptions.ts:125`) |
| `extended_cancellation_flag` / `extended_flag_basis` | `db.ts:124-125` | admin-set legal-refund eligibility |

Insert primitive: `insertSubscription()` — `db.ts:285-299`.

### 1.3 `charges` table (the charge ledger)

Defined at `src/lib/payments/db.ts:64-77`; additive refund columns at `db.ts:126-128`. Row type `ChargeRow` at `db.ts:214-233`.

Key columns: `subscription_id` FK (`db.ts:66`), `idempotency_key` **UNIQUE** (`db.ts:67`), `amount` (`db.ts:68`), `status` `'pending' | 'succeeded' | 'failed'` (`db.ts:219`), `attempt_number` (`db.ts:70`), `provider_transaction_id` (`db.ts:71`), `invoice_id` (`db.ts:74`), `charged_at` (`db.ts:75`), and refund columns `refunded_at` / `refund_amount` / `refund_provider_ref` (`db.ts:126-128`). Insert primitive: `insertCharge()` — `db.ts:301-313`. Refund writer: `recordChargeRefund()` — `db.ts:339-356` (documented as "not wired into any route/cron yet").

### 1.4 `subscription_events` table (the event log)

Defined at `src/lib/payments/db.ts:79-85`: `id`, `subscription_id` (FK), `event_type`, `metadata` (JSON TEXT), `created_at`. Event-type union declared at `db.ts:252-271`: `created`, `trial_charged`, `renewed`, `charge_failed`, `canceled_by_user`, `canceled_by_admin`, `card_updated`, `reminder_sent`, `card_expiry_notice_sent`. Insert primitive: `insertSubscriptionEvent()` — `db.ts:358-366`. This is an append-only audit log; every lifecycle mutation in the engine writes one row (see the call-site inventory in `docs/research/site-bot/004_activation-instrumentation-audit.md` §1.1).

### 1.5 Supporting tables

- `pending_invoices` — `db.ts:97-109` (manual-issuance fallback queue for invoicing).
- `magic_link_tokens` — `src/lib/payments/magic-link.ts:60-67` (created lazily by `ensureTable()`, same DB via `getDb()`): `token_hash` UNIQUE (SHA-256 only, plaintext never stored — `magic-link.ts:11-16`), `expires_at` (30 min), `consumed_at` (single-use). This is the codebase's existing template for single-use, replay-proof token links — directly relevant to referral links.

### 1.6 Where a signup is created

`createPendingSubscription()` — `src/lib/payments/subscriptions.ts:94-150`. It validates input (`subscriptions.ts:98-100`), inserts a `pending` row (`subscriptions.ts:106-129` via `insertSubscription`), writes the `created` event (`subscriptions.ts:131-137`), then opens a provider tokenization session whose `returnUrl` embeds the `subscriptionId` (`subscriptions.ts:139-147`). HTTP entry point: `POST /api/subscriptions/create` — `src/app/api/subscriptions/create/route.ts:4-25`, which forwards `email`, `trialAmount`, `recurringAmount`, `currency` at `route.ts:19`. **This function + route is the single funnel through which every subscription signup enters**, so it is the natural capture point for referral attribution.

### 1.7 Where the trial charge is recorded (NOT the reward trigger)

`applyTokenizationCallback()` — `src/lib/payments/subscriptions.ts:166-276`. On a verified callback it sets status `trialing` and schedules the first recurring charge one month out (`subscriptions.ts:208-224`), inserts the trial charge row with idempotency key `(subscriptionId, 'trial', 1)` (`subscriptions.ts:226-244`), and emits `trial_charged` (`subscriptions.ts:246-252`). HTTP entry: `src/app/api/subscriptions/callback/route.ts:24` (GET and POST). Per the task's explicit instruction, the ₪9.90 trial tokenization is **not** proof of a paying referral — it is listed here only to mark the boundary the reward hook must NOT use.

### 1.8 Where the first successful RECURRING charge is recorded (the reward trigger point)

`chargeOneSubscription()` — `src/lib/payments/cron-charge.ts:125-342` — is "the single shared charge/idempotency/state-transition implementation" (its own doc comment, `cron-charge.ts:117-124`). Every recurring charge flows through it:

- Candidates: `findDueSubscriptions()` — `cron-charge.ts:104-115` selects `status IN ('trialing','active','past_due') AND next_charge_at <= now`.
- Double-charge guard: existing succeeded charge for the same idempotency key short-circuits — `cron-charge.ts:136-143`.
- Charge attempt: `provider.chargeToken(...)` — `cron-charge.ts:155-160`.
- **Success branch — `cron-charge.ts:162-221`**: status updated to `active` (`cron-charge.ts:165-172`), succeeded charge row inserted (`cron-charge.ts:174-192`), `renewed` event emitted (`cron-charge.ts:194-200`), invoice issued best-effort (`cron-charge.ts:204`), confirmation email sent (`cron-charge.ts:206-218`).

Two properties make this function the exact hook point:

1. **The `trialing` → `active` transition happens only here.** A row enters `chargeOneSubscription` with `status = 'trialing'` (read in the `row` snapshot before the UPDATE) if and only if no recurring charge has ever succeeded for it; the success branch at `cron-charge.ts:165-172` is therefore the moment the **first successful recurring charge** is confirmed. Capturing `row.status === 'trialing'` from the pre-charge snapshot distinguishes first charge from renewals.
2. **All charge paths converge here.** The cron pass (`runChargeCron()` — `cron-charge.ts:346-365`) and the card-update flow's immediate re-charge of a fixed `past_due` subscription both call this same function (documented at `cron-charge.ts:117-124`), so a hook placed here cannot be bypassed by a later flow.

**Named hook point: `chargeOneSubscription` in `src/lib/payments/cron-charge.ts` — success branch `cron-charge.ts:162-221`.**

The placement precedent already exists: `issueInvoiceForCharge()` (`src/lib/payments/invoicing.ts:23-48`) is invoked from both charge-success points (trial: `subscriptions.ts:256`; recurring: `cron-charge.ts:204`) under the documented invariant that post-charge side effects must never block or fail the committed charge (`invoicing.ts:1-14`). A referral-reward grant would follow the same pattern — best-effort, after the charge row is committed, never throwing into the charge path.

### 1.9 Magic-link self-serve flow (identity precedent)

Request side: `POST /api/subscriptions/magic-link/request` — `src/app/api/subscriptions/magic-link/request/route.ts:16-48`: normalizes email (`route.ts:19`), rate-limits per email+IP (`route.ts:26-34` via `checkRateLimit`), calls `requestMagicLinkForEmail()` (`subscriptions.ts:288-300`), and returns an identical response whether or not the email matched — anti-enumeration (`route.ts:37-43`). Consumption side: `validateAndConsumeMagicLinkToken()` — `magic-link.ts:133-162` — atomic single-use consume (`UPDATE ... WHERE consumed_at IS NULL`, `changes === 1` as truth), called by `cancelSubscriptionByToken()` (`subscriptions.ts:317-380`). This hash-only, expiring, single-use token model is the template a referral-link mechanism should copy.

### 1.10 Existing entitlement / pricing primitives (for the reward representation)

- **Client-record entitlements**: `GeoClientRecord.entitlements?: string[]` — `src/lib/geo/client.ts:24` — persisted in `data/clients/{clientId}/client.json` (path helpers `client.ts:76-86`, writer `writeClientRecord()` `client.ts:166-170`). Grant-by-push pattern with an idempotent `includes()` guard: `src/app/api/geo/upgrade/callback/route.ts:149-152`. Direct GEO sale writes `entitlements: ['geo']` at `src/app/api/geo/signup/callback/route.ts:83`. Dashboard gating reads it via `hasEntitlement()` (`src/app/(product)/client/dashboard/page.tsx:33-35`) and `hasOperatorAccess()` (`src/lib/operator/flags.ts:23`). Eligibility already special-cases `'geo'` / `'geo:internal'` — `checkGeoUpgradeEligibility()` at `client.ts:52-74` (the `already_entitled` guard at `client.ts:58-61`).
- **GEO pricing constants**: direct-sale `GEO_PRICE = 199` at `src/app/api/geo/signup/init/route.ts:27` (also `src/app/api/geo/signup/callback/route.ts:10`); self-serve month-4 upgrade price `GEO_UPGRADE_PRICE = 299` at `src/app/api/geo/upgrade/callback/route.ts:22`. The referral reward under evaluation (GEO tier at ₪199) matches the direct-sale constant.
- **Subscription-side pricing fields**: `trial_amount` (`db.ts:53`), `recurring_amount` (`db.ts:54`), `currency` (`db.ts:55`) — see §2.3 for how they do and don't fit.
- **Known architectural gap**: GEO signup intentionally bypasses the shared subscription engine (`src/app/api/geo/signup/init/route.ts:8-26` doc comment — the shared engine's `returnUrl` has no hook for creating `client.json` records). Consequently the two identity stores — subscription `user_id` = email (`db.ts:47`) vs. client record keyed by `clientId` (`client.ts:76-79`) — have **no linking column today**. This is the single most important design decision a build spec must make (§2.3, §4.9).

---

## 2. Minimal-change proposal

Design only — no SQL, no TypeScript, per task constraint. Shapes and hook points only.

### 2.1 Schema additions (three additive pieces, all following existing patterns)

1. **`subscriptions.referred_by` column (TEXT, nullable).** Added through the existing `addColumnIfMissing()` pattern (`db.ts:123-128`, `db.ts:135-146`); mirrored on `SubscriptionRow` (`db.ts:179-212`) and in `insertSubscription()` (`db.ts:285-299`). Stores the referral code presented at signup. Written exactly once at row creation inside `createPendingSubscription()` (`subscriptions.ts:106-129`) and never mutated afterwards — attribution is a signup-time fact.

2. **`referral_codes` table.** Shape: `code` (TEXT PK or UNIQUE — short human-shareable code), `owner_subscription_id` (TEXT FK → `subscriptions.id`), `owner_email` (TEXT, denormalized for convenience), `created_at`, optional `disabled_at`. One row per participating existing customer. This is the lookup the signup funnel validates the incoming code against.

3. **`referral_rewards` ledger table.** Shape: `id`, `referred_subscription_id` (TEXT FK → `subscriptions.id`, UNIQUE), `referrer_subscription_id` (TEXT FK → `subscriptions.id`), `trigger_charge_id` (TEXT FK → `charges.id`), `reward_type` (TEXT, e.g. `'geo_tier_199'`), `status` (`'granted' | 'clawed_back'`), `granted_at`, `clawed_back_at`, plus an idempotency key column carrying a UNIQUE constraint — modeled on `charges.idempotency_key` (`db.ts:67`). The UNIQUE on `referred_subscription_id` plus the idempotency key is the double-grant defense (§4.4). Every grant also writes a `subscription_events` row (new event types, additive to the union at `db.ts:252-271`, e.g. `referral_attributed` at signup and `referral_reward_granted` at grant) — reusing the event log as the audit trail.

### 2.2 The single hook point

**`chargeOneSubscription()` in `src/lib/payments/cron-charge.ts` — inside the success branch (`cron-charge.ts:162-221`), immediately after the `renewed` event insert (`cron-charge.ts:194-200`).** Logic on paper:

1. Read `row.referred_by` from the pre-charge snapshot (the same `SubscriptionRow` the function already holds — `cron-charge.ts:125`). If null → no-op.
2. First-charge check: the snapshot's `row.status === 'trialing'`. Only a row whose no-recurring-charge-ever-succeeded state is `trialing` can be earning a first-charge reward; rows arriving as `active` (renewals) or `past_due` (retries of a later period) are skipped. (Edge: a `past_due` retry of the FIRST period — see §4.4/§4.5; the ledger's UNIQUE constraint, not the status check, is the authoritative double-grant guard.)
3. Resolve the referral: `referral_codes` lookup by `referred_by` → referrer identity.
4. Insert the `referral_rewards` row (idempotent via UNIQUE constraints) and grant the entitlement (§2.3) for **both** accounts, then emit `referral_reward_granted` events for both subscriptions. All best-effort inside try/catch, exactly like `issueInvoiceForCharge()` at `cron-charge.ts:204` — a grant failure must never fail the committed charge (`invoicing.ts:1-14` precedent).

No second hook point is needed: the trial path (`applyTokenizationCallback`) is explicitly excluded, and every recurring charge — cron-driven or card-update-driven — passes through `chargeOneSubscription`.

### 2.3 Per-account entitlement grant representation (GEO at ₪199)

Primary representation — **reuse `client.json` `entitlements`**:

- Push `'geo'` into each account's `GeoClientRecord.entitlements` exactly as `src/app/api/geo/upgrade/callback/route.ts:149-152` does (guarded, idempotent push + `writeClientRecord()`), and exactly as the direct-sale path stamps `entitlements: ['geo']` (`src/app/api/geo/signup/callback/route.ts:83`). All existing gating UI already lights up from that array (`client/dashboard/page.tsx:33-35`, `operator/flags.ts:23`) — zero new read-path code.
- This represents a **product-depth unlock**, which is what the reward is. It deliberately does not touch `subscriptions.recurring_amount` (`db.ts:54`): changing that field changes what the customer is billed monthly, which is a discount mechanism, not an entitlement unlock. The `₪199` figure is the value of the unlocked tier (matching `GEO_PRICE = 199`, `geo/signup/init/route.ts:27`), recorded as the `reward_type` / metadata on the ledger row, not as a billing mutation. If a future variant of the reward IS billing-side (free month, price cut), the reusable fields are `recurring_amount` / `trial_amount` (`db.ts:53-54`) — but that is a different reward type, and the ledger's `reward_type` column is what keeps them distinguishable.
- **The genuinely new piece this grant requires: the subscription ↔ client-record bridge.** The referred account is a `subscriptions` row keyed by email (`db.ts:47`); the entitlement lives in `data/clients/{clientId}/client.json` keyed by `clientId` (`client.ts:76-79`). No link exists today (§1.10). The build spec must choose: (a) store `clientId` on the subscription row at signup (additive column, same pattern as `referred_by`), (b) resolve email → clientId via a lookup over `data/clients/*/client.json`, or (c) have the reward hook create the client record via `ensureSiteBotClientRecord()` (`client.ts:182-215`) when none exists. Option (a) is the smallest and most robust; all three are listed because the choice interacts with edge cases §4.8–§4.9.

---

## 3. Reuse-vs-new audit

### Reuse (existing primitives)

| Primitive | Where | Reused for |
|---|---|---|
| `addColumnIfMissing()` additive migration pattern | `db.ts:135-146` | `subscriptions.referred_by` (+ optional bridge column) |
| `buildIdempotencyKey()` convention + UNIQUE `charges.idempotency_key` | `db.ts:277-283`, `db.ts:67` | `referral_rewards` idempotency-key shape and double-grant guard |
| `subscription_events` append-only log + `insertSubscriptionEvent()` | `db.ts:79-85`, `db.ts:358-366` | attribution + grant audit trail (additive event types) |
| `issueInvoiceForCharge()` best-effort post-charge pattern | `invoicing.ts:1-48` | reward-grant placement and never-block-the-charge discipline |
| `chargeOneSubscription()` as universal charge funnel | `cron-charge.ts:125` | single hook point — no bypass path exists |
| Magic-link token security model (hash-only, expiry, single-use, atomic consume) | `magic-link.ts:11-16`, `magic-link.ts:133-162` | template if referral codes are ever delivered as links |
| Anti-enumeration response + `checkRateLimit()` | `magic-link/request/route.ts:26-43` | referral-code validation/signup endpoint hardening |
| `entitlements[]` push-grant + dashboard gating | `geo/upgrade/callback/route.ts:149-152`, `client/dashboard/page.tsx:33-35` | the reward itself — zero new read-path code |
| `GEO_PRICE = 199` constant | `geo/signup/init/route.ts:27` | the reward's reference value |
| `recordChargeRefund()` write primitive | `db.ts:339-356` | future clawback trigger writes (§4.3) |

### Genuinely new

1. `referral_codes` table + code issuance/lookup.
2. `referral_rewards` ledger table.
3. `subscriptions.referred_by` column + its capture through `createPendingSubscription()` (`subscriptions.ts:94`) and `POST /api/subscriptions/create` (`create/route.ts:19`) — the only funnel modifications.
4. The reward-grant function called from the `chargeOneSubscription` success branch (new code, existing placement pattern).
5. The subscription ↔ client-record identity bridge (§2.3) — email-to-clientId linkage does not exist in either store today.

---

## 4. Risk / edge list (for the future build spec — enumerated, not solved)

1. **Self-referral.** Referrer and referred resolve to the same person — same email, same `client.json` record, or same payment token. The grant must detect and refuse (or no-op) before writing the ledger row.
2. **Cancel-before-first-charge, then re-sign.** The referred account cancels during `trialing` (`cancelSubscriptionByToken`, `subscriptions.ts:317-380`, which NULLs `next_charge_at` at `subscriptions.ts:341`) and later re-signs, creating a NEW subscription row. Decide: does attribution ride on the new row via the same email, and does the reward fire on the new row's first recurring charge even though the old row was already attributed? The ledger UNIQUE on `referred_subscription_id` is per-row, not per-email — the spec must choose the grain.
3. **Refund/chargeback clawback.** The first recurring charge that triggered the grant is later refunded or charged back. `charges.refunded_at` (`db.ts:126`) and `recordChargeRefund()` (`db.ts:339-356`) exist but are wired to nothing yet — there is currently no code path that records a refund, so the clawback trigger itself must be built, and the `referral_rewards` row needs a reversible status.
4. **Double-grant idempotency.** Overlapping cron ticks, the `existingSucceeded` guard's window (`cron-charge.ts:136-143`), and the card-update re-charge path that also calls `chargeOneSubscription` (`cron-charge.ts:117-124`) can all present the same first charge more than once. The ledger's UNIQUE constraints must be the authority, not the in-code status check.
5. **Trial is not a payment.** `applyTokenizationCallback` (`subscriptions.ts:166-276`) must never trigger the reward — the ₪9.90 trial tokenization is explicitly excluded (task Implementation Notes). Equally, a `trial_charged` event (`subscriptions.ts:246-252`) must never be mistaken for a qualifying charge by any reconciliation query.
6. **Referrer churn between attribution and grant.** The referrer cancels or expires (`cron-charge.ts:245-284`) after the referred signup but before the referred account's first recurring charge (which lands ~1 month after the trial — `subscriptions.ts:205`). Decide whether the reward still grants to a churned referrer.
7. **Code staleness / attribution window.** A referral code used long after issuance, after the referrer disabled it, or replayed across many signups — define validity window and per-code usage limits.
8. **Multiple subscriptions per email.** `getActiveSubscriptionsByEmail()` (`subscriptions.ts:71-76`) returns an array by design. Which row owns the attribution, and does a second active subscription for the same email earn a second reward?
9. **Identity-bridge mismatch.** One email may correspond to zero, one, or several `data/clients/*/client.json` records (e.g. a Site Bot slug record created by `ensureSiteBotClientRecord()` at `client.ts:182-215` plus a separate GEO record). Granting to the wrong record — or to none when one exists — silently wastes the reward; the bridge choice in §2.3 must be made before build.
10. **Grant failure after charge success.** The entitlement write (`writeClientRecord`, `client.ts:166-170`) is a plain file write with no transaction spanning the SQLite ledger. If the process dies between ledger insert and file write (or vice versa), the two stores disagree. Needs the same reconciliation discipline invoicing has (`pending_invoices`, `db.ts:97-109`).

---

## 5. Verification checklist (waoengineer final gate)

- **npm run build** — N/A, read-only task; no code changed.
- **npm run test** — N/A, read-only task; no code changed.
- **git diff gate** — `git status --porcelain` shows exactly one new untracked file (this report). Output attached in the kanban completion note.
- **Evidence** — the minimal-change proposal (§2) is pasted into the kanban completion note.

Escalation: None — read-only analysis.
