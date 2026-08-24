# Site-Bot Activation & Time-to-First-Value Instrumentation Audit

- Task: 2026-08-24_004 (handoff/pending/2026-08-24_004_waoengineer_activation-instrumentation-audit.md)
- Date: 2026-08-24
- Author: waoengineer (read-only analysis — zero source files modified)
- Scope: inventory what the subscription and onboarding code already emits, from trial signup to the first full (₪199-scale) charge, so time-to-first-value measurability can be assessed.
- Method: every behavioral claim below cites `file:line` verified against the working tree. Hebrew UI strings are referenced by location only, never reproduced.

---

## 1. Subscription lifecycle events (what the billing engine emits)

The recurring-billing engine persists events to the `subscription_events` SQLite table, defined at `src/lib/payments/db.ts:79-85`. The complete event-type union is declared at `src/lib/payments/db.ts:252-271`: `created`, `trial_charged`, `renewed`, `charge_failed`, `canceled_by_user`, `canceled_by_admin`, `card_updated`, `reminder_sent`, `card_expiry_notice_sent`.

### 1.1 Events actually emitted (every `insertSubscriptionEvent` call site)

| event_type | Emitted at | Trigger |
|---|---|---|
| `created` | `src/lib/payments/subscriptions.ts:131-137` | `createPendingSubscription` — row inserted with status `pending` (`subscriptions.ts:109`) |
| `trial_charged` | `src/lib/payments/subscriptions.ts:246-252` | hosted-tokenization callback verified; trial amount charged; status set to `trialing` (`subscriptions.ts:213`) |
| `charge_failed` (stage: trial_tokenization_callback) | `src/lib/payments/subscriptions.ts:194-200` | invalid/failed tokenization callback |
| `canceled_by_user` | `src/lib/payments/subscriptions.ts:371-377` | self-serve magic-link cancel; status set to `canceled` (`subscriptions.ts:339`) |
| `renewed` | `src/lib/payments/cron-charge.ts:194-200` | any successful recurring charge; status set to `active` (`cron-charge.ts:167`) |
| `charge_failed` (terminal) | `src/lib/payments/cron-charge.ts:255-266` | 3rd retryable failure; status set to `expired` (`cron-charge.ts:248`) |
| `charge_failed` (retry scheduled) | `src/lib/payments/cron-charge.ts:296-307` | retryable failure, attempts < 3; status set to `past_due` (`cron-charge.ts:289`) |
| `charge_failed` (non-retryable) | `src/lib/payments/cron-charge.ts:325-331` | non-retryable failure; status `past_due`, `next_charge_at` nulled (`cron-charge.ts:319-323`) |
| `reminder_sent` | `src/lib/payments/cron-charge.ts:429-435` | "trial ending before first full charge" email sent 3–5 days out (`cron-charge.ts:385-427`) |
| `card_updated` | `src/lib/payments/card-update.ts:162-168` | card swap via magic-link flow |
| `card_expiry_notice_sent` | `src/lib/payments/cron-card-expiry.ts:130-136` | proactive card-expiry email, scoped per calendar month in metadata |
| `canceled_by_admin` | **nowhere** | declared in the union (`db.ts:258`) but has zero call sites in `src/` — reserved, never emitted |

### 1.2 Status transitions

Status enum: `pending | trialing | active | past_due | canceled | expired` (`src/lib/payments/db.ts:185`).

| Transition | Where |
|---|---|
| (insert) → `pending` | `subscriptions.ts:109` |
| `pending` → `trialing` | `subscriptions.ts:208-224` (trial charge succeeds) |
| `trialing`/`active`/`past_due` → `active` | `cron-charge.ts:165-172` (successful recurring charge; candidates selected at `cron-charge.ts:109`) |
| any chargeable → `past_due` | `cron-charge.ts:287-294` (retryable failure) and `cron-charge.ts:317-323` (non-retryable) |
| `past_due` → `active` (customer fixes card) | `card-update.ts:181-192` reuses `chargeOneSubscription` |
| chargeable → `expired` | `cron-charge.ts:246-253` (max 3 retryable failures) |
| any non-canceled → `canceled` | `subscriptions.ts:337-350` |

**Billing-side measurability verdict:** the engine fully timestamps trial charge (`trial_charged`), the pre-charge reminder (`reminder_sent`), and the **first full charge = the first `renewed` event** (`cron-charge.ts:197`). So "time from trial signup to first full charge" is queryable from `subscription_events` today.

---

## 2. Funnel wiring reality: the ₪9.90 checkout and the ₪199 engine are not connected in code

This is the audit's central structural finding.

1. **Site Bot checkout is a one-time, DB-less flow.** `SITE_BOT_PRICE = 9.9` is hardcoded at `src/app/api/site-bot/checkout/init/route.ts:14` and `src/app/api/site-bot/checkout/callback/route.ts:8`. The init route explicitly documents that it is "separate from the recurring-subscription engine in subscriptions.ts" (`checkout/init/route.ts:8-13`) and writes only a filesystem pending-session file (`checkout/init/route.ts:26-31`). The callback charges once (`checkout/callback/route.ts:36-41`), then triggers generate + deploy (`checkout/callback/route.ts:67-85`). **No `subscriptions` row and no `subscription_events` row are ever written by this flow** — the ₪9.90 trial charge itself is unrecorded in any queryable store (invoice issuance at `checkout/callback/route.ts:51-62` is best-effort and provider-side only).
2. **The recurring engine has no in-repo caller that prices the ladder.** `/api/subscriptions/create` accepts `trialAmount`/`recurringAmount` from the request body (`src/app/api/subscriptions/create/route.ts:8-19`), but a repo-wide search for `subscriptions/create` finds **no frontend or route that calls it** — only tests exercise `createPendingSubscription` (`src/lib/payments/subscriptions.test.ts`, `src/lib/payments/invoicing.test.ts`). The ₪9.90 → ₪199/mo upgrade exists in strategy docs (e.g. `VISION.md:273`) but has no code path today.
3. The only live ₪199/month self-serve checkout is the retired-GEO remnant at `src/app/api/geo/signup/init/route.ts:27` (`GEO_PRICE = 199`), which also deliberately bypasses the recurring engine (`geo/signup/init/route.ts:8-26`).

**Consequence:** time-to-first-value vs. first-₪199-charge cannot currently be computed for Site Bot customers, because the Site Bot funnel never enters the subscription engine at all. Even after the upgrade path is wired, the value milestones below (Section 3) still emit nothing into `subscription_events`.

---

## 3. Onboarding milestones — what the owner sees, what is emitted

### 3.1 Live site URL generated (primary first-value artifact)

Funnel: intake chat `src/app/(app)/site-bot/start/page.tsx` → `finish()` posts to `/api/site-bot/checkout/init` and routes to the pay page (`start/page.tsx:185-200`); pay page calls `/api/site-bot/checkout/callback` (`src/app/(product)/site-bot/pay/[sessionId]/page.tsx:23-31`) and renders the live URL on success (`pay/[sessionId]/page.tsx:77-84`).

- Generate persists the site record to `data/sites/{slug}.json` with a `createdAt` timestamp (`src/app/api/site-bot/generate/route.ts:199-209`).
- Deploy builds the live URL `https://{slug}.wao.co.il` (`src/app/api/site-bot/deploy/route.ts:79`), runs wrangler deploy (`deploy/route.ts:192-195`), registers domain/DNS (`deploy/route.ts:204-229`), bridges a client-dashboard record (`deploy/route.ts:241-268`), and returns `{ success, url, projectName }` (`deploy/route.ts:270`).
- **Emitted today: NO queryable event.** The only durable traces are the filesystem record (`generate/route.ts:209`) and the deploy success response (`deploy/route.ts:270`). Failures produce `console.error` only (`generate/route.ts:213`, `deploy/route.ts:273`); there is no DB row and no success log line.

### 3.2 First GBP review reply drafted

- Drafting: `draftRepliesForBadReviews` builds a queue item with `status: 'drafted'` and `generatedAt` (`src/lib/gbp/reviewResponder.ts:76-86`) and appends it via `appendReviewResponderQueueItem` (`reviewResponder.ts:88`), which writes `data/clients/{clientId}/review-responder-queue.json` (`src/lib/gbp/reviewResponderStore.ts:26-44`; statuses `'drafted' | 'posted'` at `reviewResponderStore.ts:21`).
- Posting (after human approval): `src/app/api/gbp/review-reply/route.ts:82-91` appends a JSONL ledger line to `data/clients/{clientId}/review-responder-log.jsonl` (with `postedAt`, edit distance) and flips the queue item to `posted`.
- Trigger wiring: only `scripts/review-poll.mjs:75` calls the drafter; the script is explicitly "NOT wired into scripts/cron/" (`scripts/review-poll.mjs:14-15`) and live mode is gated behind `GBP_INTEGRATION_ENABLED` (`scripts/review-poll.mjs:99-103`). Drafting also logs the appended items to stdout only (`scripts/review-poll.mjs:76-77`).
- **Emitted today: NO DB event.** The draft milestone exists as a per-client JSON file append (queryable only by scanning `data/clients/*/review-responder-queue.json`); the posted milestone exists as a per-client JSONL ledger. Neither is a subscription-scoped, SQL-queryable event, and the draft stage has no timestamped ledger at all (only the posted stage does).

### 3.3 First weekly digest sent

- Builder: `buildWeeklyDigest` (`src/lib/crm/intelligence.ts:280`; `WeeklyDigest` shape at `intelligence.ts:96`), batched per client by `buildAllClientDigests` (`src/lib/google-ads/weekly-digest-batch.ts:75`).
- Send path: cron route `src/app/api/google-ads/weekly-digest-cron/route.ts:30-87` sends one email per enumerated campaign via `sendGoogleAdsWeeklyDigestEmail` (`route.ts:63-67`), which goes to **WAO operators** (`to: eitan@wao.co.il, leads@wao.co.il`, `src/lib/mail.ts:223-228`) — not to the client.
- Client-facing delivery is manual: the operator clicks a wa.me deep link rendered on the GEO dashboard (`src/app/(product)/geo/dashboard/page.tsx:164-173`), built by `buildWeeklyDigestWhatsAppLink` (`src/lib/google-ads/whatsapp-digest.ts:40-48`).
- **Emitted today: NO event, not even a log row.** The cron route returns a per-client status (`sent` / `email_failed` / `unbound`) in its HTTP response only (`weekly-digest-cron/route.ts:82-87`); nothing is persisted. There is no "digest sent to client" event because the client leg is an operator's manual WhatsApp click with no callback.

---

## 4. Measurability gap table

| Milestone | Emitted today? | Event name (if yes) | Single smallest hook that would capture it |
|---|---|---|---|
| **live-site-live** (owner's site reachable at its URL) | **N** — filesystem record (`generate/route.ts:209`) + HTTP response (`deploy/route.ts:270`) only; no DB row, no success log | — | Write one event row at `deploy/route.ts:270` just before the success response (e.g. an `activation_events` insert, or reuse `insertSubscriptionEvent` once Site Bot joins the subscription engine), carrying `slug`, `url`, timestamp |
| **first-review-reply** (first reply drafted for the client's bad review) | **N** — draft = per-client JSON append (`reviewResponderStore.ts:37-44`), post = per-client JSONL ledger (`review-reply/route.ts:82-89`); neither DB-backed, and the draft stage has no ledger at all | — | Append a `drafted` entry to the existing `review-responder-log.jsonl` ledger at `reviewResponder.ts:88`, mirroring the posted-entry shape already written at `review-reply/route.ts:82-89` |
| **first-digest-opened** (owner actually opened/read the weekly digest) | **N** — not tracked anywhere (see Section 5) | — | Subscribe to Resend's email-open webhook (`contact.email_opened`) and record it per clientId; the send call at `mail.ts:10-17` already goes through Resend, so the open signal exists upstream and is simply never consumed |

---

## 5. Digest engagement — are opens/clicks tracked?

**Not tracked.** Evidence:

- The Resend send is a bare POST with no tracking options, tags, or metadata (`src/lib/mail.ts:10-17`), and the module has no webhook consumer — a repo-wide search for Resend webhooks / `email_opened` / open-tracking pixels finds zero matches in `src/`.
- The digest email goes to WAO operators (`mail.ts:223-228`), so even if opens were tracked they would measure operator reads, not client engagement.
- The client-facing leg is a plain `wa.me` deep link (`whatsapp-digest.ts:47`) clicked manually by an operator (`geo/dashboard/page.tsx:164-173`) — no delivery confirmation, no read receipt, no click callback of any kind.
- The cron route persists nothing: its run summary exists only in the HTTP response (`weekly-digest-cron/route.ts:82-87`).

---

## 6. Bottom line

- **Measurable today (billing side only):** trial charge → reminder → first full charge, fully timestamped in `subscription_events` (`subscriptions.ts:249`, `cron-charge.ts:432`, `cron-charge.ts:197`).
- **Not measurable today:** all three first-value milestones (Section 4), and the Site Bot ₪9.90 funnel never enters the subscription engine in the first place (Section 2) — so "time-to-first-value before first ₪199 charge" is currently **unmeasurable end-to-end**, for two independent reasons: (a) the checkout/upgrade path to the recurring engine is unwired, (b) the value milestones emit no queryable events.
- Per spec, this report proposes no implementation; each gap table row names its smallest possible hook for a follow-up instrumentation spec.

---

## Verification Checklist (waoengineer Final Gate)

- **npm run build** — N/A — read-only analysis, no source files modified.
- **npm run test** — N/A — read-only analysis.
- **git diff gate** — `git status --porcelain` attached to the kanban completion note; the only file this task adds is this report. (The repo carries pre-existing modified/untracked files from other in-flight work; none were touched here.)
- **Evidence** — gap table in Section 4; completion note carries it verbatim.

Escalation: None — read-only analysis.
