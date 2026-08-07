# WAO — Status Handoff
*Last updated: 2026-08-05, end of session*

For Lior (mission-planner) to open with tomorrow: what shipped, the real leverage point,
and the one open loop that needs Eitan's action first thing.

## Today in one line
Dror's cluster-precision audit and a mission-planner review both landed today, and the
mission-planner review found a real bug: the client→campaign binding layer has only ever
resolved to **one** `primaryCampaignId` per client, so every downstream consumer (operator
tasks, weekly digest, CPL-ceiling gate, admin review, budget/negative-keyword mutations)
was reading one campaign out of several — AAAsada was bound to its single worst-converting
campaign (₪230/lead) while a ₪5.46/lead brand campaign sat invisible; Retter's flaw is the
mirror image (bound to its cheap brand campaign, likely understating true cost). That fix
shipped today, but it also **froze** the search-term cleanup engine's live rollout (built
today too) and priority-4 pending a one-time reconciliation pass Eitan needs to sign off.

## Shipped today (commits `213c926`..`b6e224d`)
- **Campaign enumeration fix** (`213c926`) — replaced the single-campaign binding with
  `enumerateEnabledCampaigns(customerId)`, returning every `ENABLED` campaign per client
  with a classified type (`brand` / `non-brand` / new `seasonal-remarketing`, exact-match
  only) and `all_conversions`-based conversion counts (was `metrics.conversions`, which
  undercounted against non-primary goals). Blended CPL is now a display-only roll-up —
  gating still fires per-campaign, never off the blend. Wired into the operator-task route,
  weekly-digest-batch, the new admin/review UI (`src/app/(app)/admin/review/[clientId]`,
  new `DecisionRow` / `RecommendationCard` / `WhyDisclosure` / `TrustClockLine` components),
  and all four campaign-scoped mutation routes (budget, campaign-status, negative-keywords,
  sandbox-verify), which now require an explicit `campaignId` instead of silently
  defaulting. Roni-verified against both real clients (AAAsada, Retter) plus legacy
  request-shape compatibility on the mutation routes. 135 TS + 97 mjs tests passing,
  tsc/build clean.
- **Search-term cleanup scoring engine** (`a695066`) — intent-classification dictionaries,
  scoring logic, and GAQL fetch layer for priority-3, plus the priority-3 and priority-4
  (Recommendations feed + DSA) specs (`docs/specs/priority-3-search-term-cleanup-scoring.md`,
  `docs/specs/priority-4-recommendations-feed-and-dsa.md`). **Engine and tests landed;
  live rollout is explicitly frozen** — see the open loop below.
- **CPL ceiling + live spend tracking on the weekly digest** (`0efac6b`) — `CampaignConfig`
  gained an optional `cplCeilingIls`; `WeeklyDigest.totals` now carries `spendIls`/`cpl`
  sourced from live GAQL data when available, falling back to CRM-only behavior otherwise.
  Foundation piece for the priority-3 CPL-ceiling gate.
- **Buyer-intent cluster split** (`b6e224d`, per Dror's cluster-precision audit) — split
  three merged budget-cluster buckets that were mixing verticals with materially different
  urgency/deal-size/close-rate economics: `homeImprovement` → `homeImprovement` /
  `autoServices`; `education` → `academicTutoring` / `fitnessTraining`; `professionalSvc`
  → `businessProfessionalSvc` / `creativeVisualSvc`. Also fixed a pre-existing keyword-match
  bug where the Hebrew "צלמ" prefix never matched the bare word "צלם" (photographer).

## Open loop — search-term cleanup / priority-4 rollout freeze (blocking, added today)
Per mission-planner (Lior) review, `docs/specs/priority-3-search-term-cleanup-scoring.md`
§8.6: the engine built today is **frozen from live mutation** (may not add a single negative
keyword against a real client) until a one-time reconciliation pass is run and **signed off
by Eitan**:
1. **AAAsada** — re-run digest/CPL across all 5 now-enumerated campaigns, confirm the
   blended figure lands near the founder's observed ~₪70/lead, confirm each campaign's
   classification/gate status looks sane.
2. **Retter** — same pass; confirm which campaign is bound today (expected: brand, the
   inverted case), enumerate the rest, confirm true blended CPL comes out **higher** than
   what Retter's dashboard has been showing.
3. Both reconciliations reviewed and signed off by Eitan before `search_term_cleanup` can
   execute a live mutation, and before priority-4 (Recommendations feed/DSA) resumes.
This is now the actual gate on priority-3 going live — not build effort, a data-trust
checkpoint.

## Pareto read — what actually moves the needle next
20% of remaining work carrying 80% of the value, in order:
1. **A named pilot client.** Unchanged from prior sessions, still the single
   highest-leverage open item — the lead pipeline is fixed and live-verified, and the
   campaign-binding fix today removes another silent-failure mode a real client would
   have hit. The shortlist exists (`docs/specs/pilot-client-gating.md`); nobody's been
   called yet.
2. **The reconciliation pass above** — short, concrete, and it's what's standing between
   today's work and priority-3/4 actually going live. Do this before more building on top.
3. **Payment provider decision** — see reminder below, still open, still the second
   blocker on the ₪249/mo funnel.
4. **Priority 3 Full-spec Part A** (`docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md`)
   — sendBeacon/keepalive reliability on the click-tracking calls (`LandingPage.tsx`'s
   `pingClick()` still fires a bare `fetch(...).catch(()=>{})`; `handleSubmit()` still lacks
   keepalive/retry and regenerates `orderId` per call), plus the per-row "send lead to client
   via WhatsApp" deep link. **Bumped up from "trails pilot outreach" — no longer deferrable.**
   Lior found (2026-08-07, `docs/specs/readiness-gate.md` §"Lior's Resolution") that the
   Readiness Gate's Phase 2 onboarding checklist — greenlit for full near-term build — has one
   of its six go/no-go items (delivery reliability) hard-depend on this exact work; every real
   client will show that item failing until Part A ships. Do this alongside the Readiness Gate
   build, not after it.

## Reprioritization — 2026-08-03 (mission-planning session, "lior-mission-doubts")

**Retter's GEO cycle is on hold ~1 month** — external, client-side: Retter is migrating to a
different CMS on their own timeline, not a WAO execution gap. This freezes the 3-Month Foresight
doc's own priority-#1 item (close Retter's send→implement→verify cycle) for that window. **Re-check
Retter status around 2026-09-03.**

**Google Ads pilot outreach is the active top founder-hours lane for this window** — not a
permanent reprioritization of GEO Bot, just the one lane not externally blocked right now. GEO Bot
resumes its prior priority once Retter unblocks. Full plan: `docs/specs/grade-a-outreach-playbook.md`
(Grade-A archetypes, Tier 1/2 channel map, cadence, the free GBP review-comparison magnet as opener,
GMB Bot pricing deferred until a real prospect asks for it).

**Tier-1 Week 1 is cleared to start now** — no remaining gate. The pre-pilot pipeline defects fixed
yesterday were the real blocker; that's done and Roni-verified.

## Reminder for tomorrow — payment provider
Still open. Outreach was out to both **Payme.io** and **Grow (Meshulam)** as of
yesterday; unclear if either replied since — check first thing.  See
`docs/specs/subscription-billing-provider-decision.md` for full state.

## Payment/pricing decision — open loop

Eitan raised today whether the ₪9.90→₪249 trial-jump model (VISION.md Monetization table)
leaves the real revenue exposed to chargebacks, triggered by Takbull confirming 3D Secure
never covers recurring/token charges — only the initial authorization.

**Verdict: DROP pursuing 3DS as a mitigation, DEFER the flat-₪99 alternative.**
- 3DS was never a lever here — it doesn't cover recurring charges regardless of price
  structure, so the trigger doesn't actually change the risk calculus.
- Flat ₪99 from charge #1 looks safer but isn't the better move: cuts ARPU ~60% vs the
  vision's ₪249 anchor (₪249K MRR at 1,000 subs vs ₪99K flat), raises entry friction 10x
  (₪9.9→₪99, against the low-friction trial-funnel purpose) — and since per-user variable
  LLM/API cost is still unmeasured, flat ₪99 could be the economically riskier option, not
  the safer one, if it doesn't even cover a heavy user.
- Real chargeback defense is expectation-consistency, not price structure: the month-2
  reminder email (already shipped), "WAO" as the statement descriptor (needs live
  confirmation with Takbull — not yet verified), and the immutable consent log — all
  already required anyway for Google Ads ToS §11 indemnification (see Phase 3 gates).

**Recommended path:** ship the vision-consistent ₪9.90→₪249 model to the pilot cohort only.
Instrument two things before it scales: (a) per-user variable cost P95 — extractable from
existing pilot logs, route to Eitan-Dev; (b) month-2 dispute/decline rate. Pre-commit a
dispute-rate switch threshold *now*, before the pilot runs, not after seeing the data.

**Discrepancy flagged:** VISION.md's Monetization table says ₪249/month; Eitan's original
framing today used ₪299. Need to confirm which is the deliberate current number and update
VISION.md if ₪299 is intentional.

**Open question for Eitan:** what dispute/decline rate at month 2 actually triggers
switching to flat pricing? That number needs to be pre-registered now — not decided
retroactively once pilot data is in.

## Steering question for Lior
Eitan pushed hard today on a principle worth keeping as a standing check, not a one-off:
*"no client should be onboarded before basic lead tracking + grading works, even in
Wizard-of-Oz form — every contact channel must produce a gradeable trace, no silent
losses."* That instinct caught four real, otherwise-invisible defects today. Worth
Lior explicitly re-running that same audit lens (not just this specific checklist) against
whatever ships next before it goes near a real client — it found more in one afternoon
than the existing test suite had caught on its own.

## Scored & gated feature backlog — 2026-08-07 (Lior)
The three-bot brainstorm (Site 25 / Ads 21 / GEO 14 ideas) was scored `(Impact×Urgency)÷Effort`
against VISION.md + this file, and sequenced behind the six real gates (A pilot · B reconciliation ·
C GEO unblock ~09-03 · D live subscription · E first 2-bot client · F 10+ same-vertical). Full
board (Gantt + scored tables + synthesis) is a private artifact:
https://claude.ai/code/artifact/ad18631f-d8e1-40c8-b31e-c713cdf5c72f
- **Now stays protected** — pilot outreach + AAAsada/Retter reconciliation own the window; nothing
  from the 60 pre-empts them.
- **Top synthesized idea: the Readiness Gate** (scores a prospect for the right bot AND refuses
  onboarding until lead-tracking is provable — the standing "no silent losses" rule as a product
  surface). **Eitan's call 08-07: full near-term build, parallel to outreach** (the one exception to
  the protected window). Route Dror → Tamar/Noa → Eitan-Dev.
- **Cheap Now guardrails greenlit:** prerequisite warnings, custom pixels + callback, account-health
  audit. **Spec-now:** the shared "Explain + Remedy" card (VISION "Educates simply" pillar).
- **Mandated but un-brainstormed** (flag before scale): voice-first flow completion; a unified
  consent/audit log (ToS §11, hard gate before Ads scales). **Reassigned:** review-velocity is GMB,
  not GEO. Re-read the board when Gate A or B closes.

