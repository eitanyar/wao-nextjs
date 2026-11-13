# Post-launch week 1 (30.11–6.12.2026): Ads Bot phase 2 automatic switch + WhatsApp nurture

Read-only spec by Fable 5.2, 2026-11-13. Code references are to the working tree today. External facts were fetched from official docs on 2026-11-13 unless marked otherwise.

## Outcome

**Track A: Ads Bot phase 2.** The daily autonomous cycle decides, per campaign, whether to move from Maximize Clicks to Maximize Conversions with no target, using the founder-approved gates (volume-reality §1.6). It performs the switch with a read-back and rolls back automatically. It ships in **shadow mode**: it computes and logs, and changes nothing in Google. No account can pass the 45-day age gate before mid-January, so the week's goal is built, verified on the test manager account, and deployed in shadow.

**Track B: WhatsApp nurture.** Consent capture with stored proof, an inbound webhook with opt-out, a scheduler with quiet hours and stop rules, and five MARKETING templates ready to submit. It ships with sending **switched off**. Sending starts only after the dedicated number, lawyer sign-off and Meta template approval.

### What exists today

| Piece | State | Where |
|---|---|---|
| Verified-lead-only goals at account creation | Built | `src/app/api/google-ads/create-campaign/route.ts:597-667, 782`; `src/lib/google-ads/conversion-goals.js:145-189` |
| Phase 1 bidding (Maximize Clicks, per-trade click ceiling, not a flat ₪15) | Built | `create-campaign/route.ts:744-750`; `src/lib/google-ads/cpc-cap.ts:18-24` |
| State file with soak timestamps and the 14-day soak check | Built (two timestamps only) | `src/lib/google-ads/bidding-phase-state.js:54-93, 130-145` |
| Upload outcome per lead, retry each cycle | Built | `src/lib/crm/intelligence.ts:43-61`; `src/lib/google-ads/autonomous-cycle.ts:169-176, 240-245` |
| Verified-only conversion reader with a date range | Built | `src/lib/google-ads/campaign-enumeration.ts:66-119` |
| Graduation evaluator, rollback monitor, bidding-strategy mutation | **Not built** | `src/lib/google-ads/mutations.ts` exports only status, budget and keyword helpers (`:72, :103, :151, :187`) |
| New action kinds | **Not built** | `autonomy.ts:6, 87`; `autonomous-cycle.ts:27`; `autonomy-consent.ts:14-18` |
| Time a lead was marked real or junk | **Missing** | `src/lib/crm/clientLeadsActions.js:55-57` and `src/app/api/leads/route.ts:216-217` store no mark time; only `closedAt` exists |
| Automatic message to the owner | **Missing** | `src/app/api/google-ads/weekly-digest-cron/route.ts:27-32` returns "disabled"; the digest is a staff-sent link |
| Israeli holiday calendar | **Missing** | No shared calendar in `src/lib` |
| WhatsApp send helper | Built, one number, no buttons, error code discarded | `src/lib/notifications/whatsapp-cloud.ts:22-30, 61, 67-69` |
| Inbound WhatsApp webhook | **Missing** | No `hub.challenge` handler in `src/` |
| Demo phone field and consent | **Missing** | `src/app/(app)/google-ads/onboarding/page.tsx:166-168` loads a fixed profile; inputs disabled at `:499, :694, :750` |
| Store pattern to copy for consent | Built for email opt-in | `src/lib/exit-optin.ts:19-40` (SQLite outside the repo, refuses `data/clients`) |
| Privacy policy naming Meta/WhatsApp | **Missing** | `docs/legal/privacy-policy.md` has no mention |

### External facts (fetched 2026-11-13)

**Google Ads API.** The repo pins `google-ads-api` 24.1.0 (`package.json:23`), which is API v24. v24 sunsets May 2027; the latest version is v26.

| # | Fact | Source |
|---|---|---|
| G-1 | A standard strategy is set by writing one member of the campaign's bidding union (`maximize_conversions`, `target_spend`, …) in a campaign update. `bidding_strategy_type` is read-only and ignored if sent. Do not set `bidding_strategy` (portfolio only). | developers.google.com/google-ads/api/reference/rpc/v24/Campaign; …/docs/campaigns/bidding/assign-strategies |
| G-2 | `MaximizeConversions.target_cpa_micros`: "If the target CPA is not set, the bid strategy will aim to achieve the lowest possible CPA given the budget." Its click-price ceiling and floor are portfolio-only and ignored for Search. So phase 2 has no click-price cap, which is why rule R6 exists. | …/reference/rpc/v24/MaximizeConversions |
| G-3 | `TargetSpend.cpc_bid_ceiling_micros` is the Maximize Clicks ceiling. `target_spend_micros` is deprecated; never send it. | …/reference/rpc/v24/TargetSpend |
| G-4 | An action is used for bidding only when `primary_for_goal` is true and the applicable goal's `biddable` is true. Campaign-level goals override customer-level ones. | …/docs/conversions/goals/overview |
| G-5 | Since 15 June 2026, new offline-conversion work must use the Data Manager API (the existing code does). The conversion action must be ENABLED and of type `UPLOAD_CLICKS`. Imported numbers can take up to 3 hours to appear. | …/docs/conversions/upload-offline |
| G-6 | `change_event` queries need a date filter within the past 30 days and a `LIMIT` of at most 10,000. Criterion-level changes are not fully covered. | …/docs/change-event |

The docs do not show an update example for switching strategy or say how to send "no target". The local library builds the update mask from the keys you pass (`node_modules/google-ads-api/build/src/utils.js:116-121`). Task A4 therefore starts by proving the exact call on the test manager account.

**WhatsApp Cloud API (Meta).**

| # | Fact | Source |
|---|---|---|
| W-1 | Error **131049**: a marketing message was held back by per-user limits. "Wait at least 24 hours before resending." Repeated retries inside 24 hours can block that user for up to 24 more hours. Messages inside an open 24-hour reply window don't count toward the limit. | developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes; …/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits |
| W-2 | Error **131050**: the user stopped marketing messages from this business. "Do not retry." Subscribe to the `user_preferences` webhook; its `value` is `stop` or `resume`. | error-codes; …/webhooks/reference/user_preferences |
| W-3 | Other codes: 131026 undeliverable; 131048 number restricted; 130429 throughput (retry later); 132001 template missing or unapproved; 132015/132016 template paused or disabled. | error-codes |
| W-4 | Webhook check: on GET, compare `hub.verify_token` and reply 200 with `hub.challenge`. On POST, verify `X-Hub-Signature-256` (HMAC-SHA256 of the raw body with the app secret). Failed deliveries are retried for up to 7 days, so de-duplicate. | …/webhooks/create-webhook-endpoint |
| W-5 | A tapped template button arrives as a message of type `button` with `button.payload` and `button.text` equal to the label, and `context.id` equal to the ID of the template message. The user's phone (`from`, `wa_id`) **can be missing** if the user adopted a username; `from_user_id` is always present. | …/webhooks/reference/messages/button |
| W-6 | Templates are created with `POST /<version>/<WABA_ID>/message_templates`. Body up to 1024 characters; footer up to 60; button label up to 25; up to two URL buttons; a URL may carry one variable at its end. | …/templates/components; …/templates/marketing-templates/custom-marketing-templates |
| W-7 | Today's docs show **no dedicated "Stop promotions" button type** in the API. The documented pattern is a quick-reply button with an opt-out label. | components |
| W-8 | Misfiling marketing as utility escalates to converting **all** the account's utility templates to marketing for 7–30 days. That would hit the lead first-response channel (`src/lib/crm/lead-response.ts:121-125`), so the nurture uses the MARKETING category only. | …/templates/template-categorization |

## Files

"Pre" means the task can start before 29.11 without touching launch files (Site Bot, `src/lib/lp/*`, payments, hosting). The launch plan has no spare engineer time (15.25 days against 15), so Pre tasks need an extra session. All Pre tasks are additive or new files.

### Track A: ordered tasks

| # | Task | Files | Days | Pre? |
|---|---|---|---|---|
| A1 | Record when a lead is marked | `clientLeadsActions.js`, `api/leads/route.ts`, `crm/intelligence.ts` | 0.25 | **Yes**; ship early so data accrues |
| A2 | Shared Israeli calendar | new `src/lib/calendar/il-calendar.ts` + test | 0.25 | **Yes** |
| A3 | Pure graduation evaluator | new `src/lib/google-ads/bidding-graduation.ts` + test | 1 | **Yes** |
| A4 | Pure rollback monitor, caps, state machine | `bidding-graduation.ts`, `bidding-phase-state.js` (new exports only) + tests | 1 | **Yes** |
| A5 | Google calls: switch, snapshot, read-back, readers | `mutations.ts` (new export), new `bidding-readers.ts` + tests, test-account proof script | 1 | Possible (test account only) |
| A6 | Wire into the cycle, freeze, shadow flag, audit events | `autonomy.ts`, `autonomous-cycle.ts`, `executor.ts` + tests | 1 | No |
| A7 | Notices, consent kinds, verifier run | new `bidding-notices.ts`, `autonomy-consent.ts`, copy regeneration | 0.75 | No |

**A1.** Add an optional `qualityMarkedAt` (ISO time) to `LeadRecord`. Set it wherever `quality` is written: `clientLeadsActions.js:56, 60` and `api/leads/route.ts:217, 255`. Never overwrite an existing value when the quality is unchanged.

**A2.** Export `isIsraelBlackoutDate(date)` and `israelLocalParts(date)` (weekday, hour and minute in Asia/Jerusalem via `Intl`). The date list covers December 2026 to December 2027: holiday eves and holidays, the Tishrei run and Pesach. Generate it by script from a cited calendar source with the source URL and fetch date in the file header; do not type dates from memory. Both tracks use it.

**A3.** `evaluateGraduation(input)` is pure: no I/O, and `now` is passed in. It returns `{ decision: 'graduate' | 'blocked', gates: [{ id, value, threshold, pass }], delayDays, baselineCpl, ceiling, phase1AvgCpcIls, n4BudgetIls? }`.

| Gate | Rule |
|---|---|
| G1 | At least 45 days since first impression, and `evaluateSignalIntegritySoak` passes (`bidding-phase-state.js:130`) |
| G2 | At least 15 Google-recorded verified-lead conversions in the trailing 60 days ending `D` days ago |
| G2b | At least 5 in the last 30 days and at least 2 in the last 14 |
| G3 | At least 2 owner-marked closed jobs in 90 days |
| G4 | At least 70% of paid leads older than 3 days carry a mark |
| G5 | Upload success at least 90% over 30 days; no failed upload in 72 hours; Google's count within ±20% of marked-real leads that have a click ID |
| G6 | 60-day cost per verified lead is at or below the ceiling from `resolveCplCeilingIls` (`cpl-ceiling.ts:179`); an unknown ceiling blocks |
| G7 | No budget, keyword, ad, geo or goal change in 7 days; no open `tracking_audit` task |
| G8 | Sunday–Tuesday, 06:00–12:00 Israel time; not on or within 3 days before a blackout date |
| G9 | Policy allows the kind (checked in A6; passed in as a boolean here) |
| G10 | Not in cooldown; fewer than 2 rollbacks ever |

- `D = max(3, p75 of lead-to-mark lag over 60 days, capped at 10)`, from `qualityMarkedAt`. With fewer than 5 samples, use 10.
- N4: when G1 passes, the campaign is at least 90 days old and G2 fails, return `n4BudgetIls = ceil(15 × verifiedCpl / 2)` rounded up to ₪100.
- Phase 3 (Target CPA) is out of scope. Do not add a target anywhere.

**A4.** `evaluateRollback(input)` is pure. Also add the caps and the state transitions.

| Rule | Condition | Action |
|---|---|---|
| R0 | Uploads failing for 72 hours or more, or reconciliation off by more than 35% | Freeze and alert; never roll back on missing data |
| R1 | From day 15: 14-day cost per lead above 1.30 × baseline **and** above the ceiling | Roll back |
| R2 | From day 10: 7-day verified count below 40% of the baseline weekly rate **and** spend at least 50% of budget | Roll back |
| R4 | Days 1–9: spend since the switch at least 3 × ceiling with zero verified leads, while the baseline predicted at least 2 | Roll back |
| R5 | Kill switch on, or mode is not autonomous | Hold and alert |
| R6 | From day 10: average click price above 2 × the phase-1 30-day average **and** 14-day verified count below the baseline rate | Roll back |

- R3 is dropped (no target, so nothing to loosen).
- Caps: one graduation per 30 days; at most 2 strategy changes per rolling 60 days; rollback always allowed; 30-day cooldown after a rollback; 2 rollbacks → `manual_hold`.
- New exports in `bidding-phase-state.js`: `recordTransition`, `readPhase`, using the existing atomic writer (`:96-107`). States: `phase1_clicks`, `graduation_proposed`, `phase2_learning` (days 0–14), `phase2_active`, `rolled_back`, `manual_hold`. Each transition stores the time, from, to, action ID, baseline, ceiling, phase-1 average click price and the full `before` snapshot.
- Do not change the three existing functions' behaviour.

**A5.** Start with the proof script (below), then write the helper to match what the proof showed.

- New export in `mutations.ts`: `setCampaignBiddingStrategy({ campaignConfig, campaignId, strategy: 'MAXIMIZE_CONVERSIONS' | 'MAXIMIZE_CLICKS', cpcBidCeilingMicros?, clientInstance? })`. Steps:
  1. Read `before`: `campaign.bidding_strategy_type`, `campaign.target_spend.cpc_bid_ceiling_micros`, `campaign.maximize_conversions.target_cpa_micros`, `campaign_budget.amount_micros`.
  2. For a switch to conversions, re-read the goal state (`readConversionGoalState`, `planVerifiedLeadOnlyGoals`, `conversion-goals.js:145, 174`) and refuse unless the plan is empty.
  3. Update the campaign:
     - To conversions (first candidate): `customer.campaigns.update([{ resource_name, maximize_conversions: { target_cpa_micros: 0 } }])`.
     - To clicks (rollback): `customer.campaigns.update([{ resource_name, target_spend: { cpc_bid_ceiling_micros: <snapshot value> } }])`.
  4. Read `after`, including `campaign.bidding_strategy_system_status`.
  5. On a mismatch return `{ success: false }`; no retry.
- Never send `bidding_strategy_type`, `bidding_strategy` or `target_spend_micros` (G-1, G-3). Never touch the budget.
- New `bidding-readers.ts` (each reader returns `{ ok: false }` on error and never throws):
  - Verified conversions for an arbitrary date range: reuse `fetchVerifiedLeadConversionsByCampaign` with its `range` parameter (`campaign-enumeration.ts:107-119`).
  - Cost, clicks and impressions per campaign for a date range.
  - First-impression date.
  - Recent changes from `change_event` for G7 (date filter within 30 days, `LIMIT 1000`), merged with our own log (`readAutonomousActionEvents`, `autonomy.ts:240`).
- Proof script `scripts/google-ads-bidding-switch-proof.mjs`: test mode only; refuses unless `GOOGLE_ADS_TEST_MCC_CUSTOMER_ID` is set (`mutations.ts:22-30`); dry-run by default. It switches a test campaign to conversions, reads back, switches back with the original ceiling, reads back, and prints both snapshots.
- If Google rejects `target_cpa_micros: 0`, try the lower-level mutate with an explicit update mask of `maximize_conversions.target_cpa_micros`. Record which form works in a comment above the helper.

**A6.**
- Add `'bid_strategy_graduation' | 'bid_strategy_rollback'` to `AutonomousActionKind` and `ACTION_KINDS` (`autonomy.ts:6, 87`).
- In `runAutonomousClientCycle`, add a step after the task loop (`autonomous-cycle.ts:317`) for each campaign of an account that has a verified-lead action. It builds the evaluator input from the readers, the leads store and the state file, and calls A3 or A4 depending on the phase. It is injected through `AutonomousCycleDependencies` like the existing steps (`:29-41`).
- Env flag `ADS_BOT_GRADUATION_MODE`: `off`, `shadow` (default) or `live`.
  - Shadow: write `graduation_proposed`, append the event, send the internal notice; no mutation, no owner message.
  - Live: also call `evaluateAutonomousAction` (`autonomy.ts:197`) with `reversible: true, requireClickProtection: true`, then A5.
- Rollback calls `evaluateAutonomousAction` with `requireClickProtection: false`. It still requires autonomous mode and the kill switch off.
- Freeze for days 0–14 after a switch: skip `budget_tune` and `search_term_harvest` tasks for that campaign with reason `phase2_freeze`; allow at most 5 cleanup negatives per run. Put the check where tasks are filtered (`autonomous-cycle.ts:272-278`).
- Events via `appendAutonomousActionEvent` (`autonomy.ts:228`): `before`/`after` are the A5 snapshots plus an `evidence` object with every gate value. Blocked evaluations are logged once per change in the failing-gate set. The action ID is a hash of client, campaign, transition and evaluation date.
- The graduation code must not import or call anything that applies Google's recommendations.

**A7.**
- `bidding-notices.ts`: an internal English notice (gate table, snapshots) sent by email with `sendResendTransactionalEmail` (already used at `exit-optin.ts:6`). Owner messages N1–N4 are Hebrew strings loaded from a generated copy file and included in the staff notice **for staff to forward**. No automatic owner send exists yet (decision 3).
- Consent: add both kinds to `ALLOWED_KINDS` (`autonomy-consent.ts:14-18`) for **new** consents only, after the consent copy is regenerated with `scripts/build-autonomy-consent-copy.mjs` (new `AUTONOMY_TERMS_VERSION`, `autonomyCopy.ts:2`). Existing policies are not upgraded; they stay blocked with `kind_not_allowed`. Gated on decision 1.
- Confirm `src/lib/bot/prompts.ts:403` and `src/app/api/bot/route.ts:827` already carry the corrected wording from pre-launch item 3. If not, request a patch; do not edit the Hebrew.
- The schedule that calls `/api/google-ads/autonomous-cycle` is not in the repo. Check the server crontab: G8 only passes if a run happens Sunday–Tuesday between 06:00 and 12:00 Israel time. Record the schedule in the runbook.

### Track B: ordered tasks

| # | Task | Files | Days | Pre? |
|---|---|---|---|---|
| B1 | Store + pure scheduler rules | new `src/lib/nurture/store.ts`, `schedule.ts` + tests | 0.75 | **Yes** |
| B2 | Send helper: second number, buttons, typed errors | `src/lib/notifications/whatsapp-cloud.ts` + test | 0.5 | No (shared with the live lead-response channel; change after launch) |
| B3 | Inbound webhook + opt-out | new `src/app/api/whatsapp/webhook/route.ts`, `src/lib/nurture/inbound.ts` + tests | 0.75 | Possible (new files) |
| B4 | Consent form + endpoint | new `src/components/NurtureConsentForm.tsx`, `src/app/api/nurture/consent/route.ts`, one render line in `onboarding/page.tsx` near `:419` | 0.5 | No (needs lawyer-approved text) |
| B5 | Send cron, 131049 handling, retention purge | new `src/app/api/nurture/cron/route.ts`, `src/lib/nurture/run.ts` + tests | 0.75 | No |
| B6 | Template submission script, privacy patch, verifier | new `scripts/whatsapp-submit-nurture-templates.mjs`; `docs/legal/privacy-policy.md` by patch | 0.5 | Script yes; submitting no |

**B1.** A SQLite file outside the repo at `NURTURE_DB_PATH`, opened with the same guards as `openOptinStore` (`exit-optin.ts:19-26`).

- Tables:
  - `contacts`: phone in E.164, `consent_at`, `consent_version`, sha256 of the exact consent text shown, `source_path`, state (`active | paused | stopped | converted | completed`), `bsuid` (nullable), `last_message_at`.
  - `sends`: contact, message number 1–5, `due_at`, status, Meta message ID, error code, hold count.
  - `suppressions`: phone and `bsuid`, reason, time. Kept after the contact row is deleted.
  - `inbound_events`: Meta event ID, unique, for de-duplication.
- `schedule.ts` (pure): `nextSendAt(consentAt, n, now)`. Day offsets 0, 4, 9, 15, 22. Windows Sunday–Thursday 07:00–08:00 or 19:30–21:00 Israel time. Never Friday, Saturday or a blackout date (A2). A due time outside a window moves to the next window.
- Stop rules: `stopped` or `converted` → nothing more. Any inbound reply that is not an opt-out → `paused` plus a staff notice. Before message 4, if none of messages 1–3 has a `read` status or a reply, mark `completed`.
- Day 0 sends in the first allowed window after consent, not instantly.

**B2.** Keep the current behaviour for existing callers (`lead-response.ts:121-125` passes no config).

- Add `loadMarketingConfig()` reading `WHATSAPP_MARKETING_PHONE_NUMBER_ID` (token and version as today). It throws if that ID is missing or equals `WHATSAPP_CLOUD_PHONE_NUMBER_ID`.
- Add optional `buttonParameters` to the input.
- On a non-OK response, parse the body and throw a `WhatsAppSendError` carrying `status`, `code` and `subcode`, instead of the bare status at `:67-69`.

**B3.**
- GET: reply 200 with `hub.challenge` when `hub.verify_token` equals `WHATSAPP_WEBHOOK_VERIFY_TOKEN`; otherwise 403.
- POST: read the raw body, verify `X-Hub-Signature-256` with `WHATSAPP_APP_SECRET` using a timing-safe compare (401 on failure), de-duplicate, then always reply 200.
- Route by `metadata.phone_number_id`. Events for the product number are ignored and logged as a count only. Subscribing the app delivers both numbers' events to this URL.
- Handling:
  - `messages` of type `text`: normalise (trim, lower-case, strip punctuation and quote marks); if it equals an opt-out keyword → suppress.
  - `messages` of type `button`: if `button.payload` equals the opt-out label → suppress. Match the contact by `from`, else by `context.id` against `sends`, else by `from_user_id` (W-5). Store `from_user_id` as `bsuid` whenever it is seen.
  - `user_preferences` with `value: stop` → suppress. `resume` → log only; never re-subscribe automatically.
  - `statuses`: `read` → engagement; `failed` → store the error code.
- Suppress means: write `suppressions`, set the contact to `stopped`, cancel pending sends, all in one transaction. No reply message is sent.
- Opt-out keywords and the button label are data, not typed Hebrew: a script copies them from the approved copy file into a generated module as `\u` escapes, the convention at `cpc-cap.ts:10-12`.

**B4.** Shown only in demo mode, after the demo summary.

- One mobile field and one **unticked** checkbox, separate from `PrivacyConsent.tsx`. The submit button is disabled until the box is ticked and `normalizeIsraeliPhone` accepts the number (`whatsapp-cloud.ts:32-41`).
- The endpoint checks same-origin (`sameOrigin`, `exit-optin.ts:60-64`), requires `consent === true`, refuses suppressed numbers silently, stores the proof row, and returns a neutral success.
- Collect nothing else.
- Flag `NURTURE_CONSENT_ENABLED` (default false) hides the form.

**B5.** `POST /api/nurture/cron`, guarded by `isCronAuthorized` (`src/lib/payments/cron-auth.ts:11`). Sends only when `NURTURE_SEND_ENABLED === 'true'`; otherwise it reports what it would send. For each due send:

1. Claim it under a write lock (the pattern at `lead-response.ts:78-113`).
2. Re-check suppression and contact state **immediately before** the call.
3. Check the quiet-hours window again.
4. Send the template through the marketing config.

- Error handling:
  - 131049 → move `due_at` to the first window at least 24 hours later and add 1 to the hold count; after 2 holds skip that message. No retry in the same run.
  - 131050 → suppress.
  - 131026 → mark `completed`.
  - 130429 → leave due for the next run.
  - 131048, 132001, 132015, 132016 → stop the whole run and send a staff alert.
- "Stop on signup": at send time, match the phone against client records; a match sets `converted`.
- Purge: delete contact and send rows 90 days after `last_message_at`; keep `suppressions`.
- Add the cron line to the server (every 10 minutes) and record it in the runbook.

**B6.** The script reads the approved copy file and builds five templates, category `MARKETING`, language `he`.

- Body = message text + opt-out line + sender line, copied byte-for-byte. The sender line cannot go in the 60-character footer (W-6), so it goes in the body. The body must be 1024 characters or fewer, or the script aborts.
- Buttons = one static URL button where the message has a link, plus one quick-reply opt-out button.
- No variables in the body.
- Dry-run prints the JSON; `--submit` posts to `/<version>/<WHATSAPP_WABA_ID>/message_templates` and prints each returned `id`, `status` and `category`. If Meta returns any category other than `MARKETING`, stop and report.
- Privacy policy: applied as a byte-exact patch after the lawyer approves the text.

### Copy briefs (Tamar via waocopy → Noa; the engineer applies byte-exact patches)

1. **Owner notices N1–N4.** Persona: the Ads Bot client, a hands-on trade owner. Angle: plain reassurance, no jargon (never "tCPA", "Smart Bidding", "learning period"). No target figure in N1.
   - N1: the campaign moved from chasing clicks to chasing real enquiries; results may wobble for a week or two; some days can spend up to double the daily amount while the month stays in budget; keep marking.
   - N2: the new mode did not beat the old one, so we switched back automatically; nothing to do.
   - N3: close to the switch; waiting on marks and closed jobs.
   - N4: the monthly budget that would unlock the switch.
   - Goes to: the staff notice, then WhatsApp by hand.
2. **Consent clause for bidding changes** in `AUTONOMY_SCOPE_SUMMARY` and the Ads Bot terms. Angle: the agent may change how Google bids (clicks to enquiries and back) inside the same daily budget. Goes to: the source of `scripts/build-autonomy-consent-copy.mjs`.
3. **Nurture consent block.** Field label, checkbox text and success line, from Amit's English intent in `docs/copy/reviews/amit-nurture-compliance-2026-11-12.md` ("Consent" bullet). The lawyer approves the final text; its hash is the consent version.
4. **Nurture template adjustments** to `docs/copy/ads-bot-nurture-sequence-r2-2026-11-12.waocopy.json`:
   - Remove the inline link tokens at the end of messages 1, 3 and 5; links become buttons.
   - Two URL-button labels and one opt-out button label, each 25 characters or fewer.
   - Final sender line with the real postal address and contact, replacing the two placeholders.
   - The opt-out keyword list (the Hebrew and English words that count as "stop").
5. **Privacy-policy section** naming Meta/WhatsApp as a service provider, data abroad, 90-day deletion and the kept opt-out list. Drafted with the lawyer.

## Constraints

- No writes to `data/clients/`. All tests use temp directories; the nurture store refuses paths inside the repo. After each task: `git diff data/clients/` is empty.
- The engineer never types Hebrew. Hebrew arrives as generated files or byte-exact patches; opt-out tokens enter code as script-copied escapes.
- Track A deploys with `ADS_BOT_GRADUATION_MODE=shadow`. Going `live` is a separate, later decision after at least two weeks of shadow output reviewed by Dror.
- Track B deploys with `NURTURE_SEND_ENABLED` and `NURTURE_CONSENT_ENABLED` unset. Nothing sends until the number, the lawyer, Noa and Meta approval are all in place.
- Marketing sends never use `WHATSAPP_CLOUD_PHONE_NUMBER_ID`. Templates are MARKETING only (W-8).
- The switch never sets a target, never changes the budget, and never applies a Google recommendation. `RECOMMENDATION_REJECT_TYPES` stays unchanged.
- Existing consents are not widened. Accounts without the new kinds stay in phase 1.
- Never claim in copy or to owners that the switch is live until `live` mode is on and one real switch has been read back.
- One writer at a time in the repo; Pre tasks run only in an extra session and never touch launch files.
- Re-fetch the Google and Meta pages on the build day if it is after 6.12; versions and limits move.

## Acceptance

Run each task's focused tests, then `npm run test`, then `npm run build -- --webpack` (serially), plus scoped lint.

| Task | Must pass |
|---|---|
| A1 | Marking real, junk and closed each sets `qualityMarkedAt`; a repeat mark with the same quality keeps the first time; the existing tests in `src/app/api/client/leads/route.test.mjs` stay green. |
| A2 | Friday 14:00 and Saturday report the right Israel weekday across both clock changes; a listed holiday and its eve return true; the file header names the source and fetch date. |
| A3 | One passing fixture. Each gate failing alone → `blocked` naming that gate. Boundaries: 14/15 in 60 days; 4/5 in 30; 1/2 in 14; 1/2 closed in 90; 69/70% marked; 89/90% uploads; cost equal to the ceiling passes and ₪1 above fails; 44/45 days. `D` floor 3, cap 10, and 10 with fewer than 5 samples. G8: Wednesday blocked; Sunday 07:00 passes; blackout blocked. N4 formula cases. |
| A4 | R1 needs both conditions (cost +40% but under the ceiling → no rollback). R2 at day 9 versus day 10. R4. R6 needs both conditions. R0 never rolls back. A second graduation within 30 days is blocked; rollback is allowed on day 3; a third change in 60 days is blocked; two rollbacks → `manual_hold`. State writes are atomic and leave no temp files. The existing `conversion-goals.test.mjs` stays green. |
| A5 | The proof script output from the test account shows clicks → conversions → clicks, with `before` equal to the final `after` (same ceiling). Unit tests with a fake customer: the conversions update carries only the `maximize_conversions` key; the rollback carries the snapshot ceiling; a read-back mismatch → `success: false`; a non-empty goal plan refuses the switch; a source-text test proves the three forbidden fields never appear. |
| A6 | Shadow: `graduation_proposed` written, one event, the mutation dependency never called. Live with a passing fixture: one mutation, state `phase2_learning`, an event with complete evidence. A same-day re-run is idempotent. Kill switch: no graduation and no rollback. Rollback proceeds with stale click protection. Days 0–14: `budget_tune` and harvest skipped with `phase2_freeze`, at most 5 cleanup negatives. An old policy → `kind_not_allowed`; `isValidPolicy` accepts the new kinds. A source-text guard proves there is no recommendation-apply import. |
| A7 | The internal notice renders the gate table. Owner strings come only from the generated file. New consent includes both kinds and old policy files are unchanged. `git diff` shows no Hebrew changes outside generated files. |
| B1 | Table tests: consent Thursday 22:00 → first send Sunday 07:00; a due time on Friday or a holiday eve moves on; offsets 0/4/9/15/22 hold; no read or reply on messages 1–3 → `completed` before message 4; a reply → `paused`. The store refuses a path inside the repo. |
| B2 | Existing `whatsapp-cloud.test.ts` passes unchanged. A marketing ID equal to the product ID throws. A 400 body with code 131049 produces `WhatsAppSendError.code === 131049`. |
| B3 | GET with a wrong token → 403; a right token echoes the challenge. POST with a bad signature → 401. Fixtures for the Hebrew keyword, the English keyword, the button tap with no `from` (matched by `context.id`), and `user_preferences` stop each produce a suppression and cancel pending sends. A duplicate event is a no-op. An event for the product number changes nothing. `resume` does not re-subscribe. |
| B4 | The box is unticked on load. Submit is impossible without the tick and a valid mobile. The stored row has the time, the text hash, the source path and the number. A suppressed number stores nothing and gets the same neutral response. A cross-origin POST is rejected. |
| B5 | With sending off: zero HTTP calls and a "would send" report. With sending on and a fake client: a number suppressed between claim and send is not sent; 131049 moves `due_at` at least 24 hours on with no second call in the run; a second hold skips the message; 131050 suppresses; 132001 stops the run and alerts; outside a window nothing sends; the purge removes 91-day-old contacts and keeps suppressions. |
| B6 | The dry-run prints five template bodies byte-identical to the copy file pieces, each 1024 characters or fewer, category `MARKETING`, no variables. Served HTML and the generated JSON contain no CJK, Cyrillic or Arabic characters. |

## Verifier

Roni runs these against a dev server on an isolated build directory (`WAO_DEPLOY_DIST_DIR=.next-postlaunch`) with temp data directories. He reports PASS, FAIL or BLOCKED per line, with captured output.

1. **A, shadow end to end.** Seed a temp client directory with a policy, a state file soaked for 15 days and leads fixtures that pass every gate; stub the Google readers with injected counts. POST `/api/google-ads/autonomous-cycle` with the cron bearer. Expect `graduation_proposed` in the temp state file, one event with every gate listed, and no mutation call.
2. **A, real switch on the test account.** Run the proof script with `--apply` on the test manager account; capture both snapshots. Then run the cycle in `live` mode against the same test campaign with injected counts: expect `phase2_learning` and a read-back showing Maximize Conversions with no target. Force R4 with injected numbers: expect a rollback to Maximize Clicks with the original ceiling and a 30-day cooldown in the state file.
3. **A, safety.** Kill switch on → no change. A policy without the new kinds → blocked with `kind_not_allowed`. `git diff data/clients/` empty.
4. **B, webhook.** `curl` the GET challenge with good and bad tokens. POST signed fixtures for the keyword, the button and `user_preferences`; inspect the temp database for the suppression row and cancelled sends. A bad signature → 401.
5. **B, consent.** Load the demo at 390px and desktop; screenshot the unticked box. Submit a test mobile; show the stored proof row. Maya checks the label, focus order and RTL.
6. **B, cron dry-run.** Sending off: the "would send" report matches the schedule for a consent seeded on a Thursday night. Sending on against a local fake Graph server returning 131049: the send is rescheduled at least 24 hours later with no second request.
7. **B, live smoke (only after the number and template approval).** One consented staff phone receives message 1 from the marketing number. Tapping the opt-out button produces a suppression within one webhook delivery, and the next cron run sends nothing. Until then, report this line as BLOCKED on the founder items.
8. `npm run test` and `npm run build -- --webpack` green; no unintended Hebrew in `git diff`.

Noa gates every Hebrew string before any flag is switched on. Dror reviews the first shadow gate tables.

## Engineer-days estimate

| Block | Days |
|---|---|
| Track A total (A1–A7) | 5.25 |
| Track B total (B1–B6) | 3.75 |
| **Total** | **9.0** |
| Can be done before 29.11 in extra sessions (A1–A4, B1; optionally A5 and the B3 code) | 3.25 to 5.0 |
| Left for 30.11–6.12 if the Pre block is done | 4.0 to 5.75 |

The week has five working days. Without the Pre block it does not fit: do Track A first (30.11–6.12) and move Track B to the following week. Amit's "about 2 days" for Track B did not include the store, typed error handling, the template script or tests.

## Open founder decisions (with your recommendation)

1. **Consent for bidding changes.** Add an explicit clause and require new consent, or treat the current wording as covering it? **Recommend the explicit clause**, lawyer-reviewed. Old consents stay in phase 1 until the owner re-approves. Needed before `live` mode, not before shadow.
2. **When to go live on the switch.** **Recommend:** shadow from the first post-launch deploy; Dror reviews two weeks of gate tables; go live by 10.1.2027, before the first account can reach 45 days.
3. **How owners hear about a switch.** No automatic owner message exists. **Recommend** staff forwarding the approved notice by hand for the pilot, and building an automatic send only when volume justifies it.
4. **Dedicated WhatsApp marketing number.** You provide a number not registered on any WhatsApp app, able to receive an SMS or voice code, added to WAO's WhatsApp Business account with a display name. **Recommend** buying it this week; display-name and template review take days.
5. **Meta app details.** You or Adam provide the WhatsApp Business account ID, the app secret and a webhook verify token, and subscribe the app to `messages` and `user_preferences`.
6. **Lawyer review.** The consent text, the "advertisement" opening and sender line, whether the direct-mail section (17F) adds per-message duties, and the privacy-policy section naming Meta. **Recommend** sending the package now; it blocks B4 and all sending.
7. **Sender details.** The real postal address and contact line for every message. Only you can supply these.
8. **Opt-out button wording.** Meta's API docs today show no built-in "Stop promotions" button, only a normal quick-reply. **Recommend** a quick-reply with Noa-approved wording, plus Meta's own stop setting handled through the `user_preferences` webhook.
9. **"No engagement" rule for messages 4–5.** **Recommend** defining engagement as a read receipt or any reply on messages 1–3. People with read receipts off will be dropped early, which is the cautious side. Amit to confirm.
10. **Order if time runs short.** **Recommend** Track A complete first; it has the hard mid-January deadline, and Track B cannot send before the outside approvals anyway.