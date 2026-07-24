# WAO Progress — updated by Adam on every mission close

This mirrors VISION.md's phase checklists 1:1 — VISION.md is the source-of-truth
*definition* of what each phase requires; this file is the live status mirror.
STATUS.md is unchanged — it stays the session-handoff narrative (what happened,
what's blocking, what needs Eitan next). This file never carries prose narrative,
only checked/unchecked state and the headline signals below.

## At a glance

🔥 Verified-shipped streak: 2  *(Priority 4 — live payment verification, Priority 5 — live-readiness consent UI; both closed PASS by Roni on 2026-07-24)*
🎯 Proactive-loop pilot clients: 0 / 10  *(Phase 1.5 gate — see below)*
📊 Phase 1 MVP flows: [----------] 0/3 verified

## Phase 0 — Foundation
- [x] SEO/course trust layer
- [x] Agent team established
- [ ] Bot architecture + MVP scope defined

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
- [ ] Site Bot MVP (domain → website → GMB → first ad)
- [ ] Flow B: existing business audit → priority action plan
- [ ] Ads Bot MVP (Google Ads setup + first campaign launch)
- [ ] Approval/execution loop ("continue" UX)
- [ ] First platform integrations (domain registrar + Google Ads API)

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

**Candidates checked in `data/clients/` (2026-07-24):** aasada, ajudaica, merlo,
retter, google-ads-sandbox. None qualify — google-ads-sandbox is a test/QA account
(live-readiness files created by a verifier QA run, not client onboarding); the other
three have no confirmed onboarding/subscription/live-loop record yet.

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
