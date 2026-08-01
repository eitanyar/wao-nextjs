# WAO Progress — updated by Adam on every mission close

This mirrors VISION.md's phase checklists 1:1 — VISION.md is the source-of-truth
*definition* of what each phase requires; this file is the live status mirror.
STATUS.md is unchanged — it stays the session-handoff narrative (what happened,
what's blocking, what needs Eitan next). This file never carries prose narrative,
only checked/unchecked state and the headline signals below.

## At a glance

🔥 Verified-shipped streak: 3  *(Priority 4 — live payment verification, Priority 5 — live-readiness consent UI, both PASS by Roni 2026-07-24; Ads Bot 100/100 Ad Strength mission, 5/6 PASS by Roni 2026-08-01, 1 item BLOCKED pending live Google Ads sandbox credentials — external blocker, not a failure)*
🎯 Proactive-loop pilot clients: 0 / 10  *(Phase 1.5 gate — see below; a formal admission scorecard now exists, see `docs/specs/pilot-client-gating.md`, but has not yet been run against any real candidate)*
📊 Phase 1 MVP flows: [###-------] 1/3 built, verification depth still open — see Site Bot MVP note below

## Out of scope — tracked here only so it isn't mistaken for roadmap progress
- **Inner Coach** (`/inner-coach`, shipped 2026-08-01) — admin-gated, noindexed personal
  self-development tool. Not a WAO product, not in VISION.md's four-bot suite, zero
  weight toward any phase gate above. Flagged by Lior's 2026-08-01 reassessment as
  scope creep to watch, not a crisis — but should consume no further agent hours.

## Phase 0 — Foundation
- [x] SEO/course trust layer
- [x] Agent team established
- [ ] Bot architecture + MVP scope defined
- [x] Legal foundation: WAO's own Terms of Service / Privacy Policy / Data Processing
      Addendum, lawyer-approved 2026-08-01 (`docs/legal/`). Base scope is the Ads Bot's
      permission profile; Site Bot and GEO Bot permissions drafts exist and are also
      lawyer-approved (`docs/legal/site-bot-permissions-draft.md`,
      `docs/legal/geo-bot-permissions-draft.md`). Content Bot has no equivalent yet —
      correctly deferred, no code exists for that product.
- [x] Subscription/recurring-billing consumer legal copy, lawyer-approved 2026-07-30
      (`docs/legal/subscription-legal-copy-final.md`) — cancellation window, refund
      mechanics, unfair-terms review all signed off, written provider-agnostic.
- [x] Client-site legal disclosure pages (privacy.html always, accessibility.html
      gated on the `vatStatus` exemption ladder) — wording lawyer-approved 2026-08-01,
      wired into both Site Bot's 5-page output and the Ads Bot LP deploy path.
      **Not yet committed** — pending Roni's runtime verification pass (in progress).

## Phase 1R — GEO/AIO Managed Service (Standalone Revenue Product)
- [x] Pareto engine w/ intent filter (positions 4-25, LLM scoring)
- [x] Tamar→Noa two-pass Hebrew content generation
- [x] Immutable approval log (`data/geo-logs/{clientId}/log.jsonl`)
- [x] Verification crawler (content fingerprint + JSON-LD schema check)
- [x] WhatsApp delivery (wa.me deep links)
- [x] Eitan's send dashboard (`/geo/dashboard`)
- [x] Client-facing action page (`/geo/action/[actionId]`)
- [x] Pilot client: retter.co.il (20 actions generated, pending first send)
- [ ] First complete cycle: send → client implements → verified
- [ ] Auth on dashboard + action pages before public deploy
- [ ] Genderized copy (currently hardcoded feminine)
- [ ] Self-serve GSC OAuth (post-payment)

## Phase 1 — MVP Bot Flows
- [ ] Site Bot MVP — chat intake → generate → deploy pipeline built and Roni-verified
      end-to-end (no domain registrar or GMB step yet — sites ship on
      `{slug}.wao.co.il` subdomains, not client-purchased domains; GitHub is not
      wired in either, despite VISION.md's mention). **Open question, unresolved:**
      was the end-to-end verification exercised against the live Gemini brain or the
      no-cost simulation fallback? `GEMINI_API_KEY` is confirmed live in `.env` as of
      2026-08-01 (used successfully for real LP-copy generation), so any verification
      run from this date forward is real-AI by default — but earlier verification
      runs' mode is not confirmed. Do not mark this item `[x]` until that's settled.
      LP copy-generation pipeline itself was found silently broken (dead Azure key,
      falling back to template strings) and fixed 2026-08-01 — see commit `511728d`.
- [ ] Flow B: existing business audit → priority action plan
- [ ] Ads Bot MVP — campaign creation exists (`create-campaign/route.ts`) with RSA
      + call + callout + structured-snippet + sitelink + image assets wired
      (2026-08-01, commit `2229ce2`), fail-soft per asset type. **Not fully verified
      live** — 5 API-shape uncertainties (asset-type enum handling, image field-type
      naming, call-conversion setting, method signatures, sitelink URL fragments)
      confirmed correct against library typings but need a real Google Ads sandbox
      account to confirm the API actually accepts them; no sandbox credentials exist
      in this environment yet.
- [ ] Approval/execution loop ("continue" UX)
- [ ] First platform integrations (domain registrar + Google Ads API — Ads API is
      partially wired per above, not yet live-confirmed; domain registrar untouched)

## Phase 1 — Trust & Funnel (parallel to bot build)
- [ ] Design curriculum: "Agentic Website Building + SEO in the Age of AI"
- [ ] Produce course (Dror/Yonatan brief → Gil scripts → Noa QA → ElevenLabs → publish)
- [ ] Build course landing page

## Phase 1.5 — Proactive Management Loop: Pilot Client Gate

**Counter: 0 / 10**

Gate definition (VISION.md Phase 1.5): the automated weekly proactive loop must be
running, unattended, for clients who came through the real onboarding → ₪9.90 setup →
trial → ₪249/month subscription funnel. Phase 2 (mass onboarding) does not open until
this gate reaches 10/10.

**Resolved (2026-07-24):** retter.co.il does NOT count toward this gate. Confirmed by
Eitan: Retter is his own pre-existing client, used to get WAO bot advisory on already-
running Google Ads campaigns, with occasional bot-executed changes where he holds API
access. No onboarding, no subscription, no autonomous weekly loop — Eitan is the human
in the loop by design, not a funnel client. Retter separately remains the named Phase 1R
(GEO Bot, Wizard-of-Oz) pilot client — a different phase, correctly scoped there.

**Tracked separately, not counted:** "Internal / Advisory Use" — Eitan personally running
WAO's bot tooling against his own pre-existing clients' live campaigns for advisory
insight or manual-triggered execution. Valuable dogfooding, zero weight toward the
Phase 1.5 gate. Do not merge this category with pilot-funnel progress in future updates.

**Candidates checked in `data/clients/` (2026-07-24, re-confirmed 2026-08-01):** aasada,
ajudaica, merlo, retter, google-ads-sandbox. None qualify — google-ads-sandbox is a
test/QA account (live-readiness files created by a verifier QA run, not client
onboarding); retter is internal/advisory (see above); aasada, ajudaica, merlo are
existing GEO Bot advisory clients (Dina-approved, entitlement-gated) with SEO/content
data only — no budget, no niche CPC, no Ads Bot data at all, so they don't fit
`docs/specs/pilot-client-gating.md`'s framework (which is Ads-Bot-specific). Aasada is
additionally flagged in its own client record as "financial difficulty, low order
volume" — not a paid-pilot candidate regardless.

**Payment provider status affects this gate directly:** the ₪249/mo subscription
funnel this gate measures cannot go live without a working charge-a-stored-token API.
Takbull (the prior pick) never got a token-charge test past a decline (CCode=3);
decision reopened 2026-08-01, Payme.io and Grow (Meshulam) both under evaluation
(outreach sent to both). Grow's charging API looks structurally better than Takbull's
on paper, but its invoice-generation is not callable per-charge — same problem that
ruled out iFreelance. See `docs/specs/subscription-billing-provider-decision.md`.

**Minimum viable loop (what must be built, per VISION.md):**
- [ ] Weekly Monday performance digest
- [ ] Budget-pacing alert (>20% over/under)
- [ ] Zero-conversions-in-7-days alert + diagnosis
- [ ] Lead-closed celebration + value-capture prompt
- [ ] 30-day-no-login churn-risk internal flag

**Open question (unchanged):** who is the actual first pilot client to run through the
real onboarding → subscription funnel with the proactive loop live? No candidate exists
in the codebase yet.

## Phase 2 — Trial & Validation
- [ ] Launch free limited trial
- [ ] Run mass webinar onboarding
- [ ] Identify the pricing trigger
- [ ] Validate ₪249/month conversion rate from trial → subscription

## Phase 3 — Scale (hard gates before scaling)
- [ ] Open to English-speaking markets
- [ ] Eitan operates as Visionary only — agent teams run execution
- [ ] Campaign dashboard (RMF — client-visible spend/impressions/conversions)
- [ ] Consent log (immutable record of every bot-taken budget/campaign/billing action)
- [ ] Billing isolation (client owns spend liability, not WAO fronting)
- [ ] Human TOS gate per new account (persists as account creation moves to API)
- [ ] Per-client OAuth audit trail (WAO as authorized manager, never client impersonation)
