# Spec — Execution-order item 9 (launch step 5, trimmed): Site Bot client message box → staff queue

Fable 5.2, read-only, 2026-11-13. Code references are to the working tree on `hermes-migration`.
No Google, Cloudflare or Meta API is called by this build (email goes through the Resend path the repo already uses), so no external API facts were fetched or relied on.

## Outcome

A paying Site Bot client can write one free-text message (support question or change request) from their account page. The message is stored durably, the client gets an on-screen and an email confirmation, staff get an email alert, and staff work the message in one queue at `/admin/site-bot-help`. Staff answer by hand, by email. When a client cancels online, a "cancel notice due" item lands in the same queue so staff send the notices by hand. This turns ledger B17 ("changes go through one message") from an endpoint that returns 503 (`src/app/api/site-bot/edit/route.ts:1-6`) into a real, hand-fulfilled channel.

**What exists today (read, not assumed)**

| Thing | State | Where |
|---|---|---|
| Pre-sale help intake (name + phone/email, tied to a free-audit record, no message text) | Built, behind `SITE_BOT_HELP_INTAKE_ENABLED` | `src/app/api/site-bot/help-request/route.ts:32`, `src/lib/site-bot/helpRequest.ts:39-55,75-95` |
| Staff inbox for those requests, with `received → handling → done` | Built | `src/app/(product)/admin/site-bot-help/page.tsx`, `src/components/admin/site-bot-help/inbox.mjs`, `src/lib/site-bot/helpFollowUp.ts:11,112-135` |
| Client account page, opened by an emailed 30-minute link | Built, **English and LTR** | `src/app/(product)/account/subscription/page.tsx:79,119`, `src/lib/payments/magic-link.ts:52` |
| Online cancel | Built | `src/lib/payments/subscriptions.ts:373-450`, `src/app/api/subscriptions/cancel/route.ts` |
| Link from a subscription to the business it belongs to | **Missing.** The pending file is deleted after payment (`src/app/api/site-bot/checkout/callback/paid.ts:77`) and the subscription row has no session or business field (`src/lib/payments/db.ts:45-62,132-145`) | — |
| Any channel for a paying client to write to WAO | **Missing** | — |
| Staff alert address convention | Only `BILLING_ADMIN_ALERT_EMAIL` (`src/lib/payments/email.ts:225`); `src/lib/mail.ts:79` hardcodes `eitan@wao.co.il` | — |

**Reuse vs new — exact**

| Existing code | Decision | Why |
|---|---|---|
| `helpRequest.ts` (`normalizeHelpRequest`, `submitHelpRequest`, `HelpRequestRecord`) | **Do not reuse or change.** Import only `UUID` (`:2`). | The record whitelists its keys (`:40`, `:63`), requires an audit id and place id, has no message field, and its status is the literal `'received'` (`:16`). Extending it would break the v1 validator and its tests. |
| `helpRequestStore.ts`, `helpOperatorStore.ts` | **Do not reuse.** | One-file-per-record stores that validate every file as a v1 pre-sale record (`helpRequestStore.ts:60`, `helpOperatorStore.ts:87`). Client messages need a join to `subscriptions`, so they go in the billing SQLite DB. |
| `helpFollowUp.ts` | **Reuse the vocabulary only**: statuses `received / handling / done` (`:11`). Store untouched. | Same staff mental model in both lists. |
| `help-request/route.ts` | **Reuse the pattern**: flag check before reading the body (`:32`), streamed bounded JSON (`:10-28`), `private, no-store` replies (`:6-9`), code-only errors. | Copy the shape; the route itself is unchanged. |
| `admin/site-bot/help-requests/status/route.ts` | **Reuse the logic** of the admin-cookie check (`:40-41`) and the `sameOrigin` CSRF guard (`:18-31`), copied into a new shared module. The existing route is **not** refactored. | Its 13 tests load the file with mocked imports; leave it byte-identical. |
| `components/admin/site-bot-help/inbox.mjs` | **Reuse** `formatIsraelTime` (`:16`) by import and the `createInbox` / `renderInbox` design (generation counter, `textContent` only, mounted `role="status"` line, `:42-152`) as the template for a sibling module. | Message text is untrusted; `textContent`-only rendering is the right guard. |
| `admin/site-bot-help/page.tsx` | **Extend**: same page, new "Client messages" section above the existing list. | One queue for staff; the nav link already exists (`admin/clients/page.tsx:49`). |
| `helpSubmission.mjs` | **Reuse the idea** only: the browser mints the id, so a retry is the same message (`:39`). | Its state machine is bound to audit identity and the recover endpoint. |
| `magic-link.ts` `peekMagicLinkToken` (`:111`) | **Reuse** as the client's proof of identity. | Posting a message must not burn the token the cancel button needs (see `CancelSubscriptionButton.tsx:11-13`). |
| `rate-limit.ts` `checkRateLimit` (`:35`) | **Reuse.** | — |
| `checkout/accountCopy.ts` placeholder pattern (`:5-7,26-30`) | **Reuse** for all new Hebrew. | Engineer builds before copy arrives; a placeholder can never render. |

**Scope: in**

1. A `site_bot_client_messages` table and store.
2. A subscription → business link, written at checkout.
3. Client POST endpoint and the message box on the account page (Site Bot plan rows only).
4. Client confirmation: on screen and by email.
5. Staff alert email per message, plus one daily reminder while items sit unhandled.
6. Staff queue: list, status, category, internal note, "reply by email" link.
7. Cancel hook: a system item in the queue when a Site Bot client cancels.
8. Terms §16 patch (wording from Tamar → Noa → lawyer) and regenerated terms module.

**Scope: out (with the seam left for each)**

- **Review-request kit** — after launch (founder, 2026-11-13). Seam: nothing in this build touches `src/lib/crm/reviewFlywheelCopy.ts`. The `staff_category` list includes `reviews`, so review questions that arrive early are countable.
- **AI triage and AI drafts** — later (readiness step 11). Seam: a nullable `triage_json` column and a single function `triageClientMessage(message)` that returns `null` today and is called after the insert. Staff-set `staff_category` is the labelled data the later model is checked against.
- **Automatic site edits** — `edit/route.ts` stays 503. Staff apply changes by hand through the existing build and copy-review flow.
- **Automatic cancel and take-down notices, site take-down, site export** — staff send by hand from the queue item.
- **In-app replies or a conversation thread** — staff reply by email.
- **Translating the account page to Hebrew** — see founder decision 4.
- **WhatsApp notifications** — email only.

## Files

### New

**`src/lib/site-bot/clientMessages.ts`** — store and rules. Zero Hebrew.

- Table, created with the idempotent `ensureTable()` pattern of `magic-link.ts:56-71`, on `getDb()`:

```sql
CREATE TABLE IF NOT EXISTS site_bot_client_messages (
  id               TEXT PRIMARY KEY,          -- lowercase UUID; minted by the browser, or by the server for system items
  subscription_id  TEXT NOT NULL REFERENCES subscriptions(id),
  kind             TEXT NOT NULL,             -- 'client_message' | 'cancel_notice_due'
  body             TEXT NOT NULL,             -- client text; '' for system items
  meta_json        TEXT,                      -- system items: {"effectiveAt","siteOfflineAt","cancelAtPeriodEnd"}
  business_name    TEXT,                      -- snapshot at write time; NULL if unknown
  contact_email    TEXT,                      -- snapshot: subscriptions.user_id when it is an email
  contact_mobile   TEXT,                      -- snapshot from the link event; may be NULL
  status           TEXT NOT NULL DEFAULT 'received',   -- 'received' | 'handling' | 'done'
  staff_category   TEXT,                      -- NULL | 'change' | 'support' | 'billing' | 'cancel' | 'reviews' | 'other'
  staff_note       TEXT,                      -- internal, max 1000 chars
  triage_json      TEXT,                      -- NULL until AI triage exists
  received_at      TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  staff_alerted_at TEXT,                      -- NULL = the alert email did not go out
  client_confirmed_at TEXT,
  reminded_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_sbcm_subscription ON site_bot_client_messages(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sbcm_status ON site_bot_client_messages(status, received_at);
```

- `normalizeMessageBody(raw): string` — string only; `\r\n` → `\n`; reject any C0/C1 control other than `\n`, and reject bidi override characters (U+202A–U+202E, U+2066–U+2069); trim; collapse runs of 3+ newlines to 2; length 1–2000 characters; otherwise throw `invalid_input`.
- `createClientMessage({ id, subscriptionId, body, now })` — `INSERT OR IGNORE`, then read the row back. Same id with the same `subscription_id` and `body` returns the existing row (idempotent). Same id with different content throws `conflict`. Snapshots `business_name`, `contact_email`, `contact_mobile` through `resolveClientIdentity`.
- `createCancelNoticeItem({ subscriptionId, effectiveAt, cancelAtPeriodEnd, now })` — `kind = 'cancel_notice_due'`, `staff_category = 'cancel'`, `siteOfflineAt = effectiveAt + 30 days` (terms §8, `docs/legal/site-bot-terms-of-use.md:71`). At most one per subscription: skip if one already exists.
- `resolveClientIdentity(subscriptionId)` — reads the latest `subscription_events` row with `event_type = 'site_bot_session_linked'` for `{ sessionId, businessName, ownerMobile }`; `contact_email` is `subscriptions.user_id` when it matches the email pattern at `subscriptions.ts:25`.
- `listClientMessages({ limit = 500 })` — newest first, open items (`status != 'done'`) before done.
- `updateClientMessage(id, { status?, staffCategory?, staffNote? }, now)` — validates against the enumerations; returns `null` when the id does not exist.
- `countMessagesSince(subscriptionId, sinceIso)` — for the daily cap.
- `listUnhandledOlderThan(cutoffIso)` and `markReminded(ids, now)` — for the reminder.
- `triageClientMessage(row): Promise<null>` — the AI seam. Returns `null`. One comment naming readiness step 11.

**`src/lib/site-bot/clientMessageEmail.ts`** — two senders, using the `resend` package the way `src/lib/payments/email.ts:45-53` does. With no `RESEND_API_KEY`, log and return `false` (same posture as `email.ts:40-43`). Both append to the existing dev outbox file so links and text are inspectable.

- `sendClientMessageStaffAlert(row)` — to `SITE_BOT_SUPPORT_ALERT_EMAIL`, falling back to `BILLING_ADMIN_ALERT_EMAIL`; if neither is set, warn and return `false`. English, plain text: kind, business name, contact, received time (Israel time), the first 500 characters of the body, and the link `${NEXT_PUBLIC_BASE_URL}/admin/site-bot-help`. Subject: `Site Bot client message — <business or email>` or `Site Bot cancel — notices due — <business or email>`.
- `sendClientMessageConfirmation(row)` — to `row.contact_email`; skipped when it is null. `from` and `reply-to` = `SITE_BOT_SUPPORT_FROM_EMAIL` (founder decision 1). Hebrew, sent as a minimal RTL HTML body (`<div dir="rtl" lang="he">`) plus a plain-text part. All Hebrew strings come from `clientMessageCopy.ts`; if any needed key is still a placeholder, do not send. The client's own text is quoted back, HTML-escaped.
- `sendUnhandledReminder(rows)` — one English email to the staff address listing open items older than the cutoff.

**`src/lib/site-bot/clientMessageCopy.ts`** — Hebrew labels, `accountCopy.ts` pattern: every key starts as `__HE_TODO_<key>__`, one exported `SITE_BOT_CLIENT_MESSAGE_COPY_PENDING` flag, values applied later by Python `str.replace` from a Noa-approved patch. Keys: `boxHeading`, `boxIntro`, `textareaLabel`, `textareaHint`, `submit`, `sending`, `sentHeading`, `sentBody`, `sendAnother`, `errorRetry`, `errorTooLong`, `errorRateLimited`, `errorLinkExpired`, `cancelPointer`, `emailSubject`, `emailBodyIntro`, `emailQuotedLabel`, `emailBodyOutro`. Optional key `turnaroundLine` (rendered only if not a placeholder — founder decision 2).

**`src/lib/site-bot/adminRequestGuards.ts`** — `requireAdmin()` (cookie check as at `status/route.ts:40-41`), `sameOrigin(request)` (logic copied from `status/route.ts:18-31`), `boundedJsonText(request, maxBytes)`. Used only by the new admin routes.

**`src/app/api/site-bot/client-message/route.ts`** — `POST`, `runtime = 'nodejs'`. Order of checks:

1. `SITE_BOT_CLIENT_MESSAGES_ENABLED !== 'true'` → `503 disabled`, before reading the body.
2. Bounded JSON, max 16,384 bytes (2000 Hebrew characters are about 4 KB; this leaves room). Allowed keys exactly `token`, `messageId`, `body`. `messageId` must match `UUID`; lowercase it.
3. `peekMagicLinkToken(token)` — invalid → `401 link_expired`. Never consume.
4. `getSubscriptionById`; require `plan === SITE_BOT_PLAN.id` and `status !== 'pending'` → otherwise `404 not_found`. Cancelled, paused and past-due clients may still write (they need the channel for the data-deletion choice in terms §18 and the site-copy request in §8).
5. Rate limits: `checkRateLimit('sitebot-msg-ip:<ip>', 10 per 10 min)` and `checkRateLimit('sitebot-msg-sub:<subscriptionId>', 5 per 10 min)`; plus a durable cap of 20 messages per subscription per rolling 24 hours via `countMessagesSince` → `429 rate_limited`.
6. `normalizeMessageBody` → `400 invalid_input` (`400 too_long` when over 2000).
7. `createClientMessage`. A replay of the same message returns 200 and sends no second email.
8. On a first insert only: `await` both emails, each in its own try/catch; set `staff_alerted_at` / `client_confirmed_at` on success. Email failure never fails the request. Then call `triageClientMessage`.
9. Reply `200 { ok: true, messageId, status: 'received', confirmationEmailed: boolean }`. Errors are `{ ok: false, error: <code> }`.

**`src/app/(product)/account/subscription/ClientMessageBox.tsx`** — client component, props `{ token }`. Wrapper `<section dir="rtl" lang="he">` (an RTL island inside the LTR page). A labelled `<textarea>` (`maxLength` 2000, `dir="auto"`, min height about 8 rows, font size ≥ 16px so iOS does not zoom), a live character count, a submit button with min height 44px. The `messageId` is minted with `crypto.randomUUID()` when the user first types and kept until a 200, so a retry cannot duplicate. States: idle, sending, sent (heading + body + "send another" which mints a new id), and errors mapped from codes; `401` shows `errorLinkExpired`. Status text sits in a mounted `role="status" aria-live="polite"` node; errors use `role="alert"`. All labels pass through `customerVisibleLabel` and `renderMixed`. Below the box, the `cancelPointer` line (it says where the cancel button is, so a "cancel me" message is not the cancel path). No phone number, no `mailto:` to a person, no founder name.

**`src/app/api/admin/site-bot/client-messages/route.ts`** — `GET`, admin only → `{ ok: true, messages: [...] }` with every column except `triage_json`. Disabled flag → `503`.

**`src/app/api/admin/site-bot/client-messages/update/route.ts`** — `POST`, admin + `sameOrigin`, body max 4,096 bytes, keys `id` plus any of `status`, `staffCategory`, `staffNote`. `404` on unknown id.

**`src/components/admin/site-bot-help/clientMessages.mjs`** (+ `.d.mts`) and **`ClientMessagesInbox.tsx`** — siblings of `inbox.mjs` / `HelpInbox.tsx`. English operator UI. Per item: short id, kind badge, business, email, mobile, received time (`formatIsraelTime`), status, a warning line "Alert email not sent" when `staff_alerted_at` is null, and the message body in a `<p dir="auto">` with `white-space: pre-wrap`, set by `textContent`. Cancel items show "Effective" and "Site offline on" dates and a three-line checklist as plain text: send the cancel-day notice; send the notice 7 days before the site goes offline; remove WAO's manager access to the Google profile. Controls: "Mark handling", "Mark done", a category `<select>`, a note field with Save, and a "Reply by email" link — `mailto:<contact_email>?subject=…` with an **ASCII-only** subject `WAO Site Bot [<first 8 of id>]` (the engineer types no Hebrew). Above the list: counts of open items and of open items older than one business day.

**Tests** — `src/lib/site-bot/clientMessages.test.ts`, `src/app/api/site-bot/client-message/route.test.mjs`, `src/app/api/admin/site-bot/client-messages/route.test.mjs`, `src/components/admin/site-bot-help/clientMessages.test.mjs`. Follow the neighbouring tests for the loader and mocking style.

### Changed

| File | Change |
|---|---|
| `src/app/api/site-bot/checkout/callback/paid.ts` | After a successful activation (after line 67, covering both the fresh and the `alreadyActive` path, and before the research run), write one `subscription_events` row with `insertSubscriptionEvent` (`db.ts:422`): `event_type: 'site_bot_session_linked'`, metadata `{ sessionId, businessName: pending.collectedData.businessName ?? null, ownerMobile: pending.collectedData.ownerContact?.mobile ?? null }`. Skip if one already exists for this subscription. Wrap in try/catch: a failure here must never fail the checkout. |
| `src/app/(product)/account/subscription/page.tsx` | In the final (valid-token) return, when `subscription.plan === SITE_BOT_PLAN.id`, `subscription.status !== 'pending'`, the env flag is `'true'` and `SITE_BOT_CLIENT_MESSAGE_COPY_PENDING` is false, render `<ClientMessageBox token={token} />` in its own card **above** the subscription card. Widen the container for this case (`max-w-sm` → `max-w-md`). Nothing else on the page changes. |
| `src/app/api/subscriptions/cancel/route.ts` | After `outcome.ok` (line 13–19): if the flag is on and the subscription's plan is Site Bot, call `createCancelNoticeItem` and `sendClientMessageStaffAlert`, in a try/catch that only logs. The cancel response is unchanged. Do not touch `cancelSubscriptionByToken`. |
| `src/lib/payments/cron-charge.ts` | Next to the `finalizeScheduledCancellations` call (line 444): when the flag is on, take `listUnhandledOlderThan(now − 24h)` where `reminded_at` is null or older than 24h; if any, `sendUnhandledReminder` and `markReminded`. try/catch, log only. |
| `src/app/(product)/admin/site-bot-help/page.tsx` | Add an `<h2>Client messages</h2>` + `<ClientMessagesInbox />` section above the existing list, which gets an `<h2>Pre-sale help requests</h2>`. |
| `docs/legal/site-bot-terms-of-use.md` | §16 support paragraph (line 161) and the "last updated" date (line 3), by byte-exact `old → new` patch only, after Noa and the lawyer. |
| `scripts/build-site-bot-terms.mjs` | Update `SOURCE_SHA256` (line 9), then run the script to regenerate `src/lib/legal/siteBotTerms.ts`. |
| `README.md` | Document the three env variables below. |
| `docs/missions/claims-ledger-2026-11-12.md` | Not edited by the engineer. Adam updates B17 and D6 after verifier PASS. |

### Environment variables (new)

| Name | Meaning |
|---|---|
| `SITE_BOT_CLIENT_MESSAGES_ENABLED` | `'true'` turns on the box, the endpoints, the cancel hook and the reminder. Anything else: box hidden, endpoints 503. |
| `SITE_BOT_SUPPORT_ALERT_EMAIL` | Where staff alerts go. Falls back to `BILLING_ADMIN_ALERT_EMAIL`. |
| `SITE_BOT_SUPPORT_FROM_EMAIL` | The sender and reply-to of the client confirmation, and the address in terms §16. Must be a real, monitored mailbox. |

### Terms wording this build must match (published at `/site-bot/terms`, generated from `docs/legal/site-bot-terms-of-use.md`)

| Terms text | What it says today | What this build must do |
|---|---|---|
| §16, line 161 | Support is by email to the founder's personal address, estimated answer within 24 hours on business days. | **Conflicts with the founder rule.** Must be patched before the box goes live: support is in writing, through the message box in the account area and by email to the support address; no stated hour count unless the founder sets one (decision 2); no personal address. The lawyer already has this item (execution order, parallel lane; readiness legal item 14). |
| §3, line 23 | The client must report an error in AI-written text and WAO will fix it. | The box is that reporting channel. The box copy may say so. |
| §8, line 69 | Cancel online at any time. | The box is not a cancel path. `cancelPointer` sends the client to the cancel button. Staff answer a "cancel me" message by pointing there. |
| §8, lines 71 and 79 | The site stays 30 days after the cancellation takes effect; a static copy is free after 12 months, paid before. | The cancel queue item shows the offline date (effective date + 30 days). Copy requests arrive through the box and are handled by hand. No price is shown anywhere (the terms have none). |
| §18, line 169 | On ending, data is deleted or handed over, as the client chooses, within 30 days. | The client states the choice through the box, which is why cancelled clients can still write. |
| §10, lines 87–96 | Lists the data collected. Support messages are not listed. | **Lawyer question**: add "messages you send us through the service" to §10, or confirm it is covered by "content you enter". Not blocking the build; blocking the flag in production if the lawyer says it must be listed. |
| §20, line 177 | Contact line with the founder's address. | Changes with founder decision 1, in the same patch. `page.test.mjs:59-64` requires at least two email addresses in the source and that each renders as a `mailto` link; keep at least two. |
| Landing copy `landingCopy.generated.ts:39,120,135` | "Changes go through one message"; "send a message to the bot"; "update by message". | Becomes true, by hand, when the flag is on. No landing copy change in this item. |

### Copy briefs (the engineer and this spec author no Hebrew)

Run each through `node --env-file=.env.local scripts/waocopy.mjs <brief.md> --patches`, then Noa. Planned for Sun 22.11 in the execution order.

**Brief A — message box and its states** (fills the UI keys of `clientMessageCopy.ts`)
- Persona: a hands-on, one-person local business owner who already pays ₪199 a month; on a phone, between jobs; wants to say it once and get back to work.
- Situation: this is the only place to ask for a change to the site or to ask a question. A person on the team reads every message. There is no editor to learn.
- Hard limits: written only. No promise of hours or days unless the `turnaroundLine` key is supplied by the founder's decision. No "talk to Eitan", no founder name, no phone, no "we answer immediately". Do not say the bot answers; say the team does. Singular male. Short lines.
- Must cover: heading, a one-line intro with two or three examples of what to write (a changed phone or hours, a service to add, a mistake in the text), the field label and hint, the button, the sending state, the sent state (received and stored; the answer comes by email to the address on the account), "send another", four error lines (try again; too long; too many messages, try later; the link expired, ask for a new one), and the cancel pointer (cancelling is done with the button on this page, not by message).
- Angle: Tamar's to choose.

**Brief B — confirmation email** (keys `emailSubject`, `emailBodyIntro`, `emailQuotedLabel`, `emailBodyOutro`)
- Same persona. Purpose: proof the message arrived. Says: we got your message; here it is quoted; we will answer by reply to this email; to add something, reply to this email or send another message from the account page. Same hard limits. Plain, four to six short lines, no marketing.

**Brief C — terms §16 sentence and the §20 contact line** (legal register; Tamar → Noa → lawyer)
- Replace the support sentence at line 161 as described in the table above. Deliver as a byte-exact `old → new` pair for `docs/legal/site-bot-terms-of-use.md`, plus the new "last updated" date line.

## Constraints

- **Engineer never types Hebrew.** New Hebrew arrives as byte-exact patches applied with Python `str.replace` and asserted counts. After the change, `git diff` shows no Hebrew change outside those patches.
- **Additive only.** Do not modify `helpRequest.ts`, `helpRequestStore.ts`, `helpOperatorStore.ts`, `helpFollowUp.ts`, `helpSubmission.mjs`, `inbox.mjs`, the three existing help routes, `magic-link.ts`, or `cancelSubscriptionByToken`. Their tests stay green and untouched.
- **No promises in product text**: no hour or day count (unless decision 2 supplies one), no direct access to the founder, no phone. The staff UI and staff emails may say whatever is useful.
- **The token is never consumed by a message.** Only peek. A message POST after the token was used for a cancel returns 401 with the "ask for a new link" line.
- **Untrusted text**: the message body is rendered by `textContent` in the staff UI and HTML-escaped in emails. Never `dangerouslySetInnerHTML`. Never interpolate the body into a subject line.
- **Storage is the receipt.** A 200 means the row is committed. Email failure must not fail the request, and must be visible in the queue (`staff_alerted_at` null).
- **No message content in server logs.** Log ids and codes only.
- **Checkout and cancel must not be able to fail because of this feature.** Every hook is wrapped and only logs.
- **Flag off = today's behaviour**, byte for byte, on the account page, the cancel route and the cron.
- **`data/clients/` is not touched.** Check `git diff data/clients/` after the run.
- **Read `node_modules/next/dist/docs/` for route handlers and server/client components before writing** (AGENTS.md: this Next.js version differs from training data).
- **RTL**: the box is an RTL island; logical CSS properties only; the page's bidi regression grep stays at 0 on the account page.
- **Model for the later AI seam** is not chosen here. `triageClientMessage` ships as a stub.

## Acceptance

Run focused tests first, then `npm run test`, then `npm run build -- --webpack` (serially), then scoped lint on changed files.

**Store (`clientMessages.test.ts`)**
1. `normalizeMessageBody`: accepts Hebrew, Latin, digits and single newlines; converts `\r\n`; collapses 3+ newlines; rejects empty, whitespace-only, 2001 characters, a NUL, a tab-free C0 control, U+202E.
2. `createClientMessage` twice with the same id and content → one row, same result. Same id, different body → `conflict`.
3. `resolveClientIdentity` returns the business name and mobile from a `site_bot_session_linked` event, and nulls when none exists.
4. `createCancelNoticeItem` writes `siteOfflineAt` = effective date + 30 days, and a second call for the same subscription writes nothing.
5. `updateClientMessage` rejects an unknown status or category and a note over 1000 characters; returns `null` for an unknown id.

**Client endpoint (`client-message/route.test.mjs`)**
6. Flag off → 503 `disabled`, body never read.
7. Missing, expired or unknown token → 401 `link_expired`. A valid token is still valid afterwards (`peek` returns valid; the cancel still works with it).
8. Subscription with no plan, or with status `pending` → 404.
9. Statuses `active`, `past_due`, `paused`, `canceled`, and a row with `cancel_at_period_end = 1` → 200.
10. Extra JSON key, bad `messageId`, body over 16,384 bytes, wrong content type → 400.
11. Sixth message in 10 minutes for one subscription → 429. Twenty-first in 24 hours → 429.
12. First POST sends exactly one staff alert and one confirmation (mocked senders); a replay sends none and returns 200.
13. A throwing email sender still yields 200, and the row has `staff_alerted_at` null.
14. With copy placeholders in place, the confirmation is not sent and `confirmationEmailed` is `false`.

**Admin (`client-messages/route.test.mjs`, `clientMessages.test.mjs`)**
15. No admin cookie → 401 on both routes. Update without a same-origin `Origin` → 403.
16. Update changes status, category and note; unknown id → 404.
17. The renderer puts a body containing `<script>` and `<img onerror>` into the DOM as text only.
18. Open items sort before done ones; a cancel item shows both dates and the checklist.

**Hooks**
19. Checkout callback test: a successful activation writes exactly one `site_bot_session_linked` event; a replayed callback writes no second one; a throwing event insert still returns the normal success reply.
20. Cancel route test: with the flag on and a Site Bot plan row, a successful cancel creates one `cancel_notice_due` item and one staff alert; with the flag off, neither; a throwing hook leaves the cancel response unchanged.
21. Cron test: an item `received` for 25 hours triggers one reminder and sets `reminded_at`; a second run inside 24 hours sends none.

**Terms**
22. `node scripts/build-site-bot-terms.mjs` succeeds with the new digest; `scripts/build-site-bot-terms.test.mjs` and `src/app/(app)/site-bot/terms/page.test.mjs` pass (20 sections, at least two addresses, each one a `mailto`).
23. The generated terms and the served `/site-bot/terms` HTML no longer contain the old §16 sentence. Assert with the `old` string read from the patch file, never typed.

**Existing suites untouched and green**: `help-request/route.test.mjs`, `help-requests/route.test.mjs`, `help-requests/followup.test.mjs`, `helpSubmission.test.mjs`, `magic-link.test.ts`, `plans.test.ts`.

**Hebrew gate**: `plans.test.ts`-style check that `SITE_BOT_CLIENT_MESSAGE_COPY_PENDING` agrees with the values; Noa PASS on briefs A–C before the flag is turned on in production.

## Verifier

Roni runs the app with the mock payment provider, `SITE_BOT_PAID_FLOW` on, `SITE_BOT_CLIENT_MESSAGES_ENABLED=true`, a temp `BILLING_DB_PATH`, and no `RESEND_API_KEY` (emails land in the dev outbox file). Use `WAO_DEPLOY_DIST_DIR` if another server holds `.next`. PASS needs every line; no partial pass.

1. **Paid journey → link.** Complete a mock checkout from `/site-bot/start`. In the DB, the subscription has one `site_bot_session_linked` event carrying the business name.
2. **Box renders.** Open the manage link from the pay-success state. The message box shows above the subscription card, in Hebrew, right-to-left, with no `__HE_TODO_` text in the HTML. Screenshot at 390px and at desktop width.
3. **Send.** Post a message with Hebrew, a Latin brand name, a number in brackets and two line breaks. The sent state appears. The DB row matches the text exactly. The outbox has one staff alert and one confirmation; the confirmation quotes the text, has no hour or day promise, no founder name, no phone.
4. **Replay.** Re-send the same request with curl (same `messageId`) → 200, still one row, no new outbox lines.
5. **Guards.** curl with a made-up token → 401. curl with the flag off (restart) → 503 and the box is absent. A 2001-character body → 400. Six rapid posts → the sixth is 429.
6. **Staff queue.** `/admin/site-bot-help` without the cookie redirects to login. With it, the message is listed under "Client messages" with business name, contact and exact text; line breaks kept; the mixed-direction line reads correctly. Set handling → category `change` → note → done; reload; all persisted. The pre-sale list still loads below.
7. **Injection.** Send `<img src=x onerror=alert(1)>` as a message; the queue shows it as text and nothing runs; the alert email shows it escaped.
8. **Cancel hook.** Request a fresh link, cancel online. The cancel confirmation is unchanged. The queue shows a "cancel notice due" item with the effective date and an offline date 30 days later; the outbox has the cancel alert. With the consumed token, a message POST returns 401 and the box shows the "ask for a new link" line.
9. **Cancelled client can still write.** Request a new link for the cancelled subscription, send a message → 200.
10. **Reminder.** Backdate one open row by 25 hours, run the charge cron entry point once → one reminder in the outbox; run again → none.
11. **Terms.** `/site-bot/terms` returns 200; §16 shows the new sentence; the old one is absent; the bidi regression grep `grep -oP '<bdi dir="ltr">\([^)<]*</bdi>'` returns 0 on `/site-bot/terms` and on the account page.
12. **Hebrew integrity.** Served HTML for the account page and the terms page contains no CJK, Cyrillic or Arabic characters. `git diff` shows Hebrew changes only in the patched copy file and the terms source/generated pair.
13. **No collateral.** `git diff data/clients/` is empty. `/api/site-bot/edit` still returns 503. `/site-bot/audit` help form still submits.

Also dispatch **Maya** (box at 390px: label association, focus order, live-region announcements, 44px targets, RTL island inside the LTR page) and **Noa** (rendered box, confirmation email, §16). After deploy, one real email round trip in production with Resend on: the staff alert arrives at the alert address, the confirmation arrives from the support address, and a reply to it lands in a mailbox someone reads.

## Engineer-days estimate

| Part | Days |
|---|---|
| Store, validation, identity link at checkout, tests | 0.5 |
| Client endpoint, message box, confirmation and alert emails, tests | 0.6 |
| Staff queue (list, status, category, note, reply link), tests | 0.5 |
| Cancel hook, daily reminder, terms patch + regenerate, README, full test and build run | 0.4 |
| **Total** | **2.0** |

This fits the 2 days in the execution order because the review-request kit moved out and the AI draft is a stub. Copy (briefs A–C), Noa, Maya and the verifier run are outside the engineer's 2 days. The engineer can build everything before the Hebrew arrives; the box stays hidden until the copy flag clears.

## Open founder decisions (with your recommendation)

1. **The support address** (due Thu 19.11 in the execution order). It appears in terms §16 and §20, and is the sender and reply-to of the confirmation email. Recommendation: a role address such as `support@wao.co.il` as a Google Workspace alias or group that you and any future staff can read, replacing your personal address in the Site Bot terms. It must exist and receive mail before the flag goes on, because clients will reply to it.
2. **A stated turnaround for change requests** (due Thu 19.11). Recommendation: state none at launch, in the box, the email and the terms. Your rule is no hour promises, and with a hand-worked queue any number becomes a claim someone has to keep. If the lawyer wants a number in §16, use a loose one in business days and put it only in the terms. The build supports either: the `turnaroundLine` key renders only if filled.
3. **Who receives staff alerts.** Recommendation: the same role mailbox as decision 1 for now. This means every message reaches you during the pilot, which is more than "only when required", but for up to 10 clients it is the honest setup until the AI triage exists. The daily reminder is the safety net if an alert is missed.
4. **The account page is in English.** A Hebrew-speaking owner lands on "Manage your subscription", English status labels and an English "email me a new link" form (`account/subscription/page.tsx:7,123`, `RequestLinkForm.tsx:61`), and the sign-up email with the manage link is English too (`payments/email.ts:92-96`). The Hebrew message box will sit inside that page. Recommendation: accept it for this item, and add a 0.5-day Hebrew pass on the page and that one email to the rehearsal fix list (item 10), with copy from Tamar. It is the first thing a paying client sees after checkout.
5. **The 30-minute link.** To send a message weeks later, the owner goes to the account page, types their email, and opens a fresh link. Recommendation: keep it for the pilot (it is the existing security model and costs nothing to build), and watch in rehearsal whether it annoys. If it does, the cheapest fix later is a longer-lived, message-only link in the confirmation and receipt emails.
6. **Lawyer, alongside the existing §16 item:** whether support messages must be named in the §10 data list, and confirm the hand-sent cancel notices (cancel day, and 7 days before the site goes offline) are what you want promised for Site Bot. The Site Bot terms do not promise them today; the Ads Bot terms do. Recommendation: send them by hand as good practice and do not add the promise to the Site Bot terms until sending is automatic.