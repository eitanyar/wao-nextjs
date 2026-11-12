# Ads Bot — Phase 1 → Phase 2 Auto-Graduation (Maximize Clicks → Maximize Conversions with target CPA)

Spec date: 2026-11-12 · Owner: Dror (ppc-strategist) · Implementer: nextjs-engineer · Gates: language-qa (Hebrew), verifier (runtime)
All Google-behaviour claims are as of 2026-11-12 and sourced in §12. The engineer re-checks API field names against the pinned `google-ads-api` version before coding.
(Saved by Adam from Dror's hand-back; his tools could not create files.)

## 1. Outcome

A new Ads Bot account launches on Maximize Clicks with a ₪15 CPC ceiling (`create-campaign/route.ts:591-597`). It then moves **automatically, with no team step**, to Maximize Conversions with a target CPA. The trigger is evidence that real, owner-verified leads are reaching Google reliably and cheaply enough. The bot rolls back automatically if Phase 2 underperforms. Every transition is policy-gated and audited, and the owner is told in plain language.

## 2. Findings from the code (2026-11-12)

| # | Finding | Where | Impact on Phase 2 |
|---|---|---|---|
| F1 | Offline upload exists: `verified-lead` (QUALIFIED_LEAD, value = avgJobValue × closeRate) and `closed-deal` (CONVERTED_LEAD, value = revenue) via Data Manager `events:ingest` | `conversion-upload.ts`, `data-manager-events.js`, `clientLeadsActions.js`, `api/leads/route.ts` | Good foundation |
| F2 | No enhanced conversions for leads (no `userIdentifiers`) | `data-manager-events.js:113-131` | Optional later (§3.8) |
| F3 | All 5 conversion actions are created without `primary_for_goal`, which defaults to true, so every action is primary | `create-campaign/route.ts:489-539` | **Blocker.** tCPA would optimise to phone/WhatsApp click events and multi-count one lead |
| F4 | `toEventTimestamp` emits UTC wall-clock + `+03:00`, so the instant is shifted at least 3h early. `lead.date` is a zoneless UTC string re-parsed as server-local, which may shift it again | `data-manager-events.js:163-168`, `lead-capture.ts:33-35` | **Probable blocker.** Google rejects conversions dated before the click, and form leads usually arrive within minutes of the click |
| F5 | The upload result is discarded. `applyClientLeadFeedback` reports `'ok'` whenever the call doesn't throw, but `uploadLeadConversion` is non-throwing by contract | `clientLeadsActions.js:57-68`, `conversion-upload.ts:200-254` | Failures are invisible, so the graduation gate can't measure upload health |
| F6 | Marking a lead closed without a prior GOOD mark uploads only `closed-deal`, never `verified-lead` | `clientLeadsActions.js:46-49`, `api/leads/route.ts:224-235` | Closed jobs are missing from the bidding action |
| F7 | Campaign CPL uses `metrics.all_conversions`, which includes secondary actions | `campaign-enumeration.ts:27,65`, fed to `buildWeeklyDigest` via `autonomous-cycle.ts:117` | CPL is understated, so the ceiling gate and any tCPA baseline would be wrong |
| F8 | `RECOMMENDATION_REJECT_TYPES` classifies **Google's** recommendations only. It does not gate WAO's own mutations | `recommendation-feed.ts:25-49,112-122` | Nothing needs to be removed (§9) |
| F9 | Autonomy policy kinds are fixed to `budget_tune`, `search_term_cleanup`, `search_term_harvest`. `isValidPolicy` rejects unknown kinds | `autonomy.ts:6,87,136`, `autonomy-consent.ts:14-18`, `autonomous-cycle.ts:24` | New kinds need schema + consent changes (§8) |
| F10 | "15+ conversions" exists only as prompt text, and the two places disagree ("15–30" vs "15+") | `prompts.ts:403`, `api/bot/route.ts:827` | Align after the build (§10 step 7) |

## 3. Step 0 — Signal integrity (must ship and soak before any graduation can fire)

**Bidding-goal decision:** Smart Bidding optimises to **verified-lead only**. Closed-deal, form, phone-click and WhatsApp-click become **secondary**: still recorded, not used for bidding.
- *Why not closed jobs as the goal?* At the ₪1,500/month minimum spend and a ~20% close rate, an account produces about 2–5 closed jobs a month. That is far too few for a target-CPA learner. Google evaluates tCPA on at least 30 conversions per 30 days (S2). Verified leads, meaning leads the owner has confirmed are real, are the highest-quality signal that still has volume. Closed jobs stay in Google as secondary for observation and a future value-based phase (tROAS), which is out of scope here.
- *Why not the click events?* A phone or WhatsApp click is intent, not a lead. If they are primary, tCPA learns to buy cheap tap-happy traffic.
- *Trade-off:* if the owner never marks leads, the bidding signal is empty. That is correct, fail-closed behaviour: graduation never fires and the owner is nudged (N3).

**0a. Conversion goal configuration.**
- New accounts: in `create-campaign/route.ts`, set `primary_for_goal: true` on verified-lead and `false` on the other four. Then make sure the customer- and campaign-level goals for the verified-lead category/origin are `biddable: true` and the others are not. Engineer verifies via GAQL on `customer_conversion_goal` and `campaign_conversion_goal` (S6).
- Doing this at launch is deliberate. Goal changes are a structural Learning trigger (S3), and while bidding is on Maximize Clicks they have no bidding effect. So the change costs nothing now and would cost a Learning reset later.
- Existing accounts: a backfill script with `--dry-run` default and a per-client flag. It may touch `data/clients/` only for the named client, per AGENTS.md. The goal-change timestamp is recorded in the bidding state file (§7), because it starts a 14-day no-graduation window.

**0b. Timestamp fix.** `toEventTimestamp` must emit the true instant: either an ISO string ending in `Z`, or the correct Asia/Jerusalem offset for that date (+02:00 in winter, +03:00 in summer). Lead `date` parsing must treat the stored string as UTC. Before shipping, the engineer pulls Data Manager / upload diagnostics for one test-MCC lead and documents whether past uploads were being rejected. Tests in §11.

**0c. Persist upload outcomes per lead.** Add to `LeadRecord`: `verifiedUpload` and `closedUpload`, each `{ status: 'ok'|'failed'|'skipped_no_click_id'|'pending_retry', at, requestId?, error?, attempts }`. Fix `clientLeadsActions.js` and `api/leads/route.ts` to inspect the returned `UploadResult`, not just catch throws. The rule that the CRM write is truth and the Ads push is best-effort stays unchanged.

**0d. Backfill on close.** When a lead is marked closed and has no successful `verifiedUpload`, upload `verified-lead` too, timestamped at the lead's creation time, then upload `closed-deal`. Google dedupes per conversion action by `transactionId` (S7), so repeat sends are safe.

**0e. Retry.** Each autonomous cycle retries `failed`/`pending_retry` uploads, at most once per day per lead, until success or until the click is 85 days old (Google accepts conversions within 90 days of the click, S5).

**0f. Verified-only measurement.** Add a GAQL read for `metrics.conversions` segmented by `segments.conversion_action` = the verified-lead resource name, over a date range. The graduation evaluator, the rollback monitor and the Phase-2 CPL all use this count, never `all_conversions`.

**0g. Fix the CPL source (F7).** Once 0a ships, the digest/`budget_tune` CPL ceiling gate switches to the verified-lead count from 0f. Keep `all_conversions` for reporting only. Flagged separately because it changes `budget_tune` behaviour; the engineer adds a regression test.

**0h (optional, later).** Enhanced conversions for leads (hashed phone/email via `userIdentifiers`) would cover leads with no click ID. It needs the account-level EC-for-leads setting, a privacy/terms check and Adam's go-ahead. It is not required for graduation.

**Soak requirement:** graduation cannot fire for an account until 0a–0f have been live for that account for at least 14 days, enforced through `signalIntegritySince` in the state file.

## 4. Graduation trigger

Evaluated once per day per campaign inside the autonomous cycle. **All gates must pass.** Windows are **delay-adjusted**: they end `D` days ago, where `D = max(3, p75 of lead→GOOD-mark lag over the last 60 days, capped at 10)` (S2 also adjusts for conversion delay).

| Gate | Threshold | Reasoning |
|---|---|---|
| G1 Age | ≥21 days since first impression, and ≥14 days since `signalIntegritySince` and since any goal change | Three full Israeli business weeks; lets the pipeline settle |
| G2 Volume | ≥15 Google-recorded verified-lead conversions in the trailing 30-day delay-adjusted window | Google evaluates on 30 per 30 days (S2), unreachable for many ₪1,500/month accounts; 15 is the number the bot already promises and a practitioner floor (S8) |
| G2b Recency | ≥5 of those in the last 14 days | Don't graduate a fading campaign |
| G3 Closed-job truth | ≥2 owner-marked closed jobs in the trailing 60 days | Proves verified leads turn into real money. If G3 is the only failing gate for 14 days, send N3 and an internal alert |
| G4 Marking coverage | ≥70% of paid-attributed leads older than 3 days have a quality mark (GOOD/JUNK) | Unmarked leads silently undercount the signal |
| G5 Upload health | Over trailing 30d: verified upload success ≥90%; zero failed uploads in the last 72h; Google's verified count within ±20% of the CRM GOOD count with a click ID | Catches F4-type silent rejection |
| G6 Economics | Trailing-30d CPL ≤ CPL ceiling (`resolveCplCeilingIls` / `deriveCplCeilingIls`) | Otherwise route to `cpl_ceiling_review` / search-term cleanup |
| G7 Stability | No budget change, keyword harvest, ad/asset edit, network/geo change or goal change in the last 7 days; no open `tracking_audit` task | Don't stack structural change |
| G8 Timing | Execute only Sunday–Tuesday, 06:00–12:00 Asia/Jerusalem; not within 3 days before or during `GRADUATION_BLACKOUT_DATES` (Tishrei holidays, Pesach) | Our heuristic: Learning should overlap normal demand |
| G9 Policy | `evaluateAutonomousAction` allows kind `bid_strategy_graduation` | Same consent model as every autonomous action |
| G10 History | Not in cooldown (§5.4); fewer than 2 rollbacks ever on this campaign | — |

## 5. The switch

### 5.1 Strategy
**Maximize Conversions with a target CPA**, standard (non-portfolio) strategy on the campaign. API: `campaign.maximize_conversions.target_cpa_micros`, replacing `target_spend` (verify field and update mask against the pinned API version; S4). Since June 2026 the UI labels this "Target CPA"; behaviour unchanged (S1, S2).
- No target → can bid any CPA to spend the budget (S1); the ceiling is our business constraint.
- No portfolio: structural for no gain (S3).
- One jump: target edits take effect next auction without Learning (S3), so setting the target in the same switch costs one Learning period.

### 5.2 Starting target
```
baselineCpl = spend(window) / verifiedConversions(window)      // G2 window, delay-adjusted
ceiling     = resolveCplCeilingIls(...)
target      = round( min(ceiling, 1.10 × baselineCpl) )          // ₪, whole number
```
- Never below `baselineCpl` (G6 guarantees `baselineCpl ≤ ceiling`).
- Later `target_tune` kind (not this build): ≤15% per change, ≤1 per 14 days, only after Learning.
- If Google's TARGET_CPA_OPT_IN recommendation is present, log its suggested target next to ours; never apply it; warn if it differs by more than 30%.

### 5.3 Budget at the switch
- Budget unchanged in the same mutation and for 14 days after; `budget_tune` suppressed for the campaign in that window.
- Google may spend up to 2× average daily budget on a day, within the monthly limit (S2). N1 states this plainly.
- If `dailyBudget < targetCpa`, log `budget_below_target`; don't block.

### 5.4 No stacking, cooldowns, change caps
- Days 0–14 after the switch: freeze `budget_tune` and `search_term_harvest`; allow `search_term_cleanup` for high-confidence CUT negatives only, max 5 per run.
- No target edits in days 0–14 except the single R3 loosening (S3).
- At most one graduation per 30 days; at most 2 strategy changes per rolling 60 days; rollback always permitted.
- After a rollback: 30-day cooldown, re-evaluate with new windows after the rollback date. After 2 rollbacks: `manual_hold`, escalate to Dror/Adam.

### 5.5 Mutation and read-back
New helper `setCampaignBiddingStrategy({ campaignConfig, campaignId, strategy: 'MAXIMIZE_CONVERSIONS'|'MAXIMIZE_CLICKS', targetCpaIls?, cpcBidCeilingIls? })` in `src/lib/google-ads/mutations.ts`:
1. Snapshot `before`: `bidding_strategy_type`, `target_spend.cpc_bid_ceiling_micros`, `maximize_conversions.target_cpa_micros`, budget micros.
2. Mutate.
3. Read `after` back via GAQL, including `campaign.bidding_strategy_system_status`.
4. On mismatch: mark `failed`, alert, no retry in the same cycle.

## 6. Rollback monitor

Every cycle for campaigns in `phase2_learning` or `phase2_active`; delay-adjusted windows; no CPL/volume judgment before day 10 (S3).

| Rule | Condition | Action |
|---|---|---|
| R0 Signal outage | Verified uploads failing ≥72h, or G5 reconciliation off by >35% | Freeze evaluation (no rollback on missing data); internal alert; N3 if the cause is unmarked leads |
| R1 CPL blowout | From day 15: trailing-14d CPL > 1.30 × baselineCpl **and** > ceiling | Roll back |
| R2 Volume collapse | From day 10: verified conversions over the last 7 days < 40% of the baseline weekly rate **and** spend ≥ 50% of budget | Roll back |
| R3 Under-delivery | From day 8: spend < 30% of daily budget for 5 consecutive days | Loosen target once by +15% (capped at ceiling); if it persists 5 more days, roll back |
| R4 Emergency (days 1–9) | Spend since switch ≥ 3 × ceiling with zero verified conversions, while baseline predicted ≥2 | Roll back |
| R5 Kill switch / policy revoked | `killSwitch` true or mode ≠ autonomous | No automatic change; hold and alert |

CPL rising but under the ceiling is **not** a rollback. Rollback restores the `before` snapshot and starts the 30-day cooldown.

## 7. State, logging and audit

- **State file:** `data/clients/<clientId>/tasks/google-ads/bidding-phase.json`, atomic temp+rename like `writeAutonomyPolicy`; tests use temp `baseDir` only.
  - States: `phase1_clicks` → `graduation_proposed` (shadow) → `phase2_learning` (days 0–14) → `phase2_active` → `rolled_back` (`cooldownUntil`) → `manual_hold`.
  - Fields: `signalIntegritySince`, `lastGoalChangeAt`, `transitions[]` (at, from, to, actionId, targetCpaIls, baselineCpl, ceiling), `rollbackCount`, `r3LoosenedAt`.
- **Events:** append to `autonomous-actions.jsonl` via `appendAutonomousActionEvent`, kinds `bid_strategy_graduation` / `bid_strategy_rollback`; `before`/`after` = §5.5 snapshots; `evidenceIds` = window bounds; an `evidence` object with every gate value/threshold/pass, D, baselineCpl, ceiling, target, Google's suggested target, upload stats, and the rollback rule that fired.
- Failed daily evaluations logged as `status: 'blocked'`, `reason: 'graduation_gate:<G#>'`, deduplicated per gate-set change.
- Action ID: deterministic hash of (clientId, campaignId, transition, evaluation date).
- Owner-visible activity log (`AUTONOMY_AUDIT_SUMMARY`) shows graduation and rollback in plain language.

## 8. Fit with the autonomy/consent model

- Add `'bid_strategy_graduation' | 'bid_strategy_rollback'` to `AutonomousActionKind`, `ACTION_KINDS` (`autonomy.ts`) and `EXECUTABLE_KINDS` (`autonomous-cycle.ts`); `reversible: true`; `requireClickProtection: true`.
- §5.4 caps are checked in the graduation module before `evaluateAutonomousAction`; both must allow.
- `bid_strategy_rollback` is evaluated even when the policy would block graduation (stale click protection must not starve a safety reversal), as long as mode is autonomous and the kill switch is off.
- **Shadow mode:** compute everything, write `graduation_proposed`, internal notice only, no account change, no owner message.
- **Consent (legal decision for Eitan):** recommendation: Tamar adds an explicit bidding-strategy clause to `AUTONOMY_SCOPE_SUMMARY` and the terms (regenerates `AUTONOMY_TERMS_VERSION` via `scripts/build-autonomy-consent-copy.mjs`); `autonomy-consent.ts` adds both kinds to `ALLOWED_KINDS` for new consents; existing policies are not auto-upgraded and fail closed with `kind_not_allowed` until re-consent.

## 9. The recommendation reject set

`RECOMMENDATION_REJECT_TYPES` only classifies Google's recommendation feed; it does not gate WAO's own `campaigns.update`. **Nothing is removed from it.** The only addition is reading a TARGET_CPA_OPT_IN suggested target for logging. The graduation path must never call RecommendationService apply.

## 10. Build order

0. Step 0 (0a–0g) plus diagnostics on past uploads. Ship it; 14-day soak per account.
1. `src/lib/google-ads/bidding-graduation.ts`: pure `evaluateGraduation(input)` / `evaluateRollback(input)`, plus state-file read/write.
2. `setCampaignBiddingStrategy` with snapshot and read-back (`mutations.ts`), plus the 0f verified-only GAQL reader.
3. Wire both kinds into `runAutonomousClientCycle`, the §5.4 freeze, and the G8 timing window.
4. Rollback monitor (R0–R5) and the R3 one-time loosening.
5. Notifications (intent below → Tamar writes Hebrew → Noa → byte-exact patches). No jargon to the owner: never "tCPA", "Smart Bidding", "learning period".
   - **N1 (switch done):** campaign moved from collecting clicks to hunting for leads at a target of about ₪X per lead, based on what real leads cost so far; results can wobble for a week or two, some days can spend up to double the daily amount while the month stays in budget; keep marking leads good, junk or closed.
   - **N2 (rollback):** the new mode didn't beat the old one, so we switched back automatically; nothing to do; we'll try again in about a month.
   - **N3 (blocked on marking/closed jobs):** close to moving to lead-focused bidding; waiting on you to mark recent leads and report closed jobs.
   - **Internal shadow/escalation notice:** English, technical, with the gate table.
6. Consent kinds and copy (§8), pending the legal decision.
7. Prompt alignment: `prompts.ts:403` → "after 15+ verified leads"; Tamar re-words the Hebrew at `api/bot/route.ts:827`.
8. Verifier: end-to-end on the test MCC with injected counts; then `npm run test` and `npm run build -- --webpack`.

## 11. Tests the engineer must write

**Step 0**
- `toEventTimestamp`: a known UTC instant round-trips (winter + summer); zoneless `lead.date` treated as UTC; output never earlier than input.
- `create-campaign`: exactly one action (verified-lead) has `primary_for_goal: true`.
- `applyClientLeadFeedback`: `{success:false}` → `failed` persisted; `{skipped}` → `skipped_no_click_id`; success persisted with `requestId`.
- Closed-without-GOOD uploads verified-lead then closed-deal; closed-with-prior-OK-verified uploads only closed-deal.
- Retry once per cycle, stops at click age 85 days.
- Verified-only GAQL filters by the verified-lead resource name.
- `budget_tune` CPL gate uses the verified count (regression).

**Evaluator (pure, table-driven)**
- One passing fixture; each gate G1–G10 failing alone → `blocked` with `graduation_gate:<G#>`.
- Boundaries: 14/15 conversions; 4/5 recent; 1/2 closed; 69/70% marking; 89/90% upload; CPL = ceiling passes, +₪1 fails; 20/21 days.
- Delay D (floor 3, cap 10) shifts windows correctly.
- Target formula cases; never below baseline; whole ₪.
- G8: Wednesday blocked, Sunday 07:00 IL passes, blackout blocked, DST boundaries.

**Rollback**
- R1 needs both conditions; CPL +40% under the ceiling → no rollback.
- R2 day 9 vs 10; R3 loosens once then rolls back after 5 days; R4; R0 never rolls back on missing data; rollback restores the exact `before`.

**Caps and policy**
- Second graduation within 30 days blocked; rollback allowed on day 3; 3rd change within 60 days blocked; 2 rollbacks → `manual_hold`.
- Days 0–14 block `budget_tune` and harvest, allow ≤5 cleanup negatives.
- Shadow mode: `graduation_proposed`, no mutation, no owner notice.
- Kill switch: no graduation, no automatic rollback.
- Rollback not blocked by stale click protection.
- Existing policies without new kinds → `kind_not_allowed`; `isValidPolicy` accepts the new kinds.

**Integrity**
- `RECOMMENDATION_REJECT_TYPES` unchanged; graduation module never imports/calls recommendation apply (source-text guard like `production-access-guards.test.mjs`).
- One event per transition with complete `evidence`; same-day re-evaluation idempotent.
- Read-back mismatch → `failed`, no state advance.
- Atomic write of `bidding-phase.json`; tests never touch `data/clients/`.

## 12. Sources (verified 2026-11-12)

- S1 Google Ads Help, "About Maximize conversions bidding": https://support.google.com/google-ads/answer/7381968?hl=en
- S2 Google Ads Help, "About Target CPA bidding": https://support.google.com/google-ads/answer/6268632?hl=en
- S3 Google Ads Help, "Duration of the learning period…": https://support.google.com/google-ads/answer/13020501?hl=en
- S4 Google Ads API reference, MaximizeConversions `target_cpa_micros` (v22): https://developers.google.com/google-ads/api/reference/rpc/v22/MaximizeConversions
- S5 Google Ads Help, offline conversion import discrepancies: https://support.google.com/google-ads/answer/13321563?hl=en and https://support.google.com/google-ads/answer/10029210
- S6 Google Ads API, "Conversion goals": https://developers.google.com/google-ads/api/docs/conversions/goals/overview
- S7 Data Manager API, "Send events": https://developers.google.com/data-manager/api/devguides/events/google-ads/offline/send-events
- S8 Practitioner context (secondary): https://blackpropeller.com/blog/google-ads-bidding-strategies/ and https://logicalgecko.com/blog/google-ads-bidding-strategies
