# WAO — 3-Month Foresight
*Author: Lior (Mission Planner) · Date: 2026-07-06 · Status: Living document — re-read every 2–3 weeks*
*Companion: [1-Year Foresight](./wao-1year-foresight-2026-07-06.md) · Linked from VISION.md, Phase 1*

Ambitious goals, generalized lead-magnet plays, and where the AI capability curve actually flips something — over July–September 2026.

**How to read this on a re-visit:** everything is scored on WAO's standard framework (builds the bot / fills the trial funnel / builds agent capacity) plus (Impact × Urgency) ÷ Effort — plus one new axis: **time-windowed vs. evergreen.** Time-windowed items decay if not started in their window; evergreen items are still worth full value in month 3. On each re-read, check §5 first — it tells you what should have changed by now.

The spine, unchanged from VISION.md: **the bot doesn't exist at scale yet, and nothing here may distract from Phase 1.** Everything below either is the bot, feeds the trial funnel with a real shipped capability, or builds capacity to ship faster. If an idea fails all three, it isn't here — several were cut for exactly this reason (see §2).

## 01 — The lead-magnet pattern, generalized

The Instant GEO Audit's real innovation wasn't "a free tool" — it was taking a capability WAO already built for paying delivery, cutting a narrow read-only slice, and exposing it publicly with a specific, personal, *shareable* result. Four required parts: a real internal capability (not a mock), a minimum free slice that still feels like insider knowledge, a share trigger specific enough to get forwarded, and a paywall that's the natural "now fix it" step.

**1.1 — "Is Your Website AI-Search-Ready?" scanner** — `PROCEED, Month 1`
Capability: verification crawler + Crawl Errors detection + page-quality heuristics. Zero-friction — just a URL, no OAuth.
Free slice: crawl 5–10 pages, return a letter grade + top 3 fixes. Share trigger: a grade — people screenshot and argue about grades. Also genuinely link-earning. Funnel: low score + small site → Site Bot ₪1,490; low score + big site → GEO Bot ₪199. Why first: best reach-to-effort ratio of anything here, reuses shipped code.

**1.2 — "Google Ads Waste Check"** — `PROCEED, sequenced Month 2`
Capability: Dror's audit logic (search-term waste, bidding mismatch, tracking gaps) via read-only Ads OAuth.
Free slice: one number — estimated ₪/month wasted — plus top 3 leaks. Share trigger: a shekel figure of waste is viscerally shareable. Funnel: Ads Bot ₪249. **Honest caveat:** Ads Bot is held pending Retter's first cycle — building the magnet before the product can absorb leads wastes them. Sequence after Ads Bot unholds, not before.

**1.3 — "How Do Your Google Reviews Compare?"** — `PROCEED, fires when GBP API lands`
Capability: GMB Bot's review-analysis, likely fetchable via public Places API — near-zero friction.
Free slice: rating/velocity/response-rate vs. 3 named local competitors. Share trigger: strongest in this list — people share wins, act on losses, either way WAO benefits. Funnel: GMB Bot ₪149 review-responder MVP. GBP API application already filed (1–4 weeks) — this should launch as one motion with GMB Bot itself.

**1.4 — "Am I Cited by AI?" brand-mention checker** — `DEFER, Month 2–3, evergreen`
Capability: query ChatGPT/Gemini/AI Overviews for category+city queries, report if/who gets cited.
Share trigger: "AI doesn't know you exist" is an existential jolt — strong PR/press angle. Caveats: nonzero API cost per check, nondeterministic AI answers risk credibility if a repeat check differs. Needs a caching/sampling design decision first — high ceiling, medium confidence.

**1.5 — "Free Marketing Plan in 5 Minutes" (voice bot demo)** — `DEFER, Month 3, bot-first`
Capability: the onboarding bot's diagnose flow itself — TURN_QUESTIONS + budget estimation.
This isn't a magnet *about* the product — it *is* the product's first minute, free. Doubles as Phase 2's trial-experience answer. Not now: exposes the bot before the execution layer can deliver on the plan it promises. Right timing: once Site Bot MVP is live to absorb the ₪9.90 conversion.

**Portfolio note:** don't build all five. Two live magnets (1.1 + 1.3) alongside the existing GEO Audit is a full-strength funnel for a 2-client company. More magnets than delivery capacity means leads that churn on contact — which burns trust in a small market faster than it builds it.

## 02 — Beyond SEO/GEO/Ads — and what got cut

**2.1 — Course platform as B2B revenue (training other agencies)** — `DROP, this window`
A real business, but a *different* one — competes for the same agent-hours as the bot and arms competitors in a market WAO wants to own. VISION.md is explicit: courses are marketing, not product. Also blocked by the still-frozen "sell to specialists/agencies" audience question. Revisit post-North-Star, not in 3 months.

**2.2 — The 97-article knowledge base as a citability asset** — `PROCEED, narrow version only`
Licensing/API/dataset plays fail the framework outright. But: making the knowledge base maximally citable by AI engines (`llms.txt`, aggressive on-page Q&A structure — visible Q&A, not schema, is the actual AIO lever per the July-2026 finding) is dogfooding as marketing. WAO being itself heavily cited in Hebrew AI answers is the ultimate credential. Low effort. Evergreen, but sooner is better — the Hebrew AIO citation space is uncrowded now, and that's a real window competitors will eventually fill.

**2.3 — Productizing the multi-agent build process** — `DEFER as product · PROCEED as internal codification`
Selling "Adam-as-a-service" to other agencies is the same drift as 2.1. But codifying the WoZ manual, graduation ladder, and mission pipelines into repeatable runbooks scores high on capacity — it's what lets client #3–10 onboard without Eitan personally being the bottleneck (the WoZ manual already names client #10 as the ceiling). Unglamorous, but it's what makes month-3 scale real. Do incrementally, one runbook per completed client cycle.

**2.4 — Adjacent local-business pains (competitor monitoring, price alerts, citations)** — `Mostly DROP, one exception`
Mostly new products for a company whose core bot doesn't exist at scale yet — classic drift. Exception: competitor monitoring as a *feature* inside existing bots — a "your competitor just outranked/out-reviewed you" alert inside the already-decided free bundled monitoring layer, at marginal cost. Evergreen; slots into GEO/GMB Bot roadmaps, no standalone mission needed.

**2.5 — Ajudaica English-market beachhead** — `FLAG, needs Eitan's scoping, not ranked`
Eitan's own initiative, legitimately Phase-3 material arriving early via a real paying client. Valuable as learning — does the GEO pipeline work in English, do Pareto dynamics differ? Real risk: the Hebrew-native Tamar→Noa quality moat doesn't transfer to English content. Recommendation: bounded single-client experiment, not a strategic front, until Eitan explicitly scopes it wider.

## 03 — The AI advancement curve — what actually flips in 3 months

Reasoning about a genuinely 90-day horizon, not a 3-year one:

- **Cost collapse already flipped.** Frontier-quality output at commodity prices means per-check LLM cost for public free tools (1.1, 1.4) is now negligible — six months ago a public scanner risked real API spend. Implication: don't rate-limit magnets defensively, only against abuse.
- **The graduation ladder starts graduating around week 8–10.** The ladder is a calendar mechanism — with monthly cycles on 2 clients, the first tools become eligible for semi-automation roughly then. Likely first graduate: title-tag optimization or review responses (drafted, one-tap approve). Honest note: the binding constraint isn't model reliability, it's evidence accumulation — don't accelerate the ladder just because models improved. What models DO change in-window is the quality bar of suggestions, making review cycles pass faster.
- **Multi-agent orchestration is now a repeatable WAO capability, not a stunt.** This very session is the evidence — one mission arc produced 5 verified tools plus a full lead magnet. The 3-month implication: WAO can plausibly run 2 parallel mission tracks (bot-build + funnel) where 6 months ago it was one serial track. That's the real justification for attempting both §1 and Phase 1 at once.
- **Voice quality is crossing the product-surface threshold.** Hebrew TTS/STT is approaching real-time conversational grade — VISION.md's voice-first principle stops being aspirational in this window. Expect voice-driven onboarding (magnet 1.5) to be technically viable by month 3. No competitor in the Israeli SMB space is voice-native yet — a 6–12 month differentiation window opening during this quarter.
- **What does NOT flip in 90 days:** fully autonomous write-access to client Google Ads accounts (a ToS/trust constraint, not a capability one), unattended Hebrew copy without the Noa gate (the grammar failure modes are model-behavioral and persistent), and GBP API approval timelines (Google's queue doesn't move faster because WAO's models did).

## 04 — Master priority table

| # | Goal | Framework hit | (I×U)÷E | Window |
|---|---|---|---|---|
| 1 | **Retter — first complete GEO cycle** (send→implement→verify) | Builds the bot — unblocks Ads/Content Bot holds + starts the graduation clock | Highest | Time-windowed — everything downstream waits on this |
| 2 | AI-Search-Ready scanner (1.1) | Funnel | High | Evergreen — do in month 1 while GEO Audit momentum is warm |
| 3 | GMB review-comparison magnet + GMB Bot MVP, one launch (1.3) | Bot + funnel | High | Time-windowed — fires when GBP API lands |
| 4 | Site Bot MVP (5-page render + edit-via-chat) | Builds the bot; unlocks ₪9.90 trial + magnet 1.5 + L2-4 CTA | High | Evergreen, Phase 1 core |
| 5 | Self-citation / llms.txt / Q&A retrofit (2.2) | Funnel-authority | Medium-high | Soft window — uncrowded Hebrew AIO space |
| 6 | WhatsApp digest (approved, unbuilt) | Retention prerequisite (Phase 1.5 seed) | Medium | Evergreen — must exist before client #3 |
| 7 | Course module continuation | Funnel | Medium | Evergreen |
| 8 | WoZ runbook codification (2.3, internal) | Capacity | Medium | Evergreen, incremental |
| 9 | Ads Waste Check magnet (1.2) | Funnel | Medium | Sequenced — after Ads Bot unhold |
| 10 | AI-citation checker (1.4) | Funnel | Medium | Evergreen |
| 11 | Voice bot demo magnet (1.5) | Bot + funnel | High later | Month 3 — gated on Site Bot MVP |
| — | Agency training, content licensing, standalone monitoring products | None cleanly | — | DROP this window |

**The single most important unresolved question blocking Phase 1:** the Retter cycle hasn't closed. Twenty actions generated, none verified live yet. Until one real client implements one real action and the crawler verifies it, GEO Bot is still a hypothesis, three product holds stay frozen, and the graduation ladder hasn't started ticking. Every week of delay pushes the week-8–10 graduation estimate in §3 out one-for-one.

## 05 — Checkpoints — if you're re-reading this in…

**Week 3–4:** Retter cycle should be closed — if not, *that is the agenda*, everything else pauses. GBP API verdict likely in → item 3 either fires or reschedules. Scanner (1.1) should be spec'd or live. If the GEO Audit has produced its first inbound lead, note the conversion path — it recalibrates every magnet score above.

**Week 6–8:** Site Bot MVP should be demonstrable → unlocks the L2-4 CTA slide and the ₪9.90 trial. First tools approach graduation-ladder eligibility — check evidence counts, don't rush it. Two magnets should be live; measure shares/links, not just leads. Zero shares by now means the share-trigger hypothesis needs revisiting before building a third magnet.

**Week 10–12:** Decision point: does client #3 onboard on runbooks without Eitan as the bottleneck? Review the Ads Bot unhold. Check voice-demo (1.5) feasibility against the actual current TTS/STT state. Re-read §3 — the AI-curve claims are the most perishable content in this document; rewrite that section for next quarter.

**Standing check on every re-read:** has anything here started competing with "build the bot" for agent-hours without a funnel or capacity justification? If yes, it drifted — cut it, no matter how far along it is.

## 06 — Open questions for Eitan

1. **Ajudaica English:** bounded experiment, or a strategic front? Determines whether English-pipeline work gets any planned hours at all.
2. **Magnet lead capacity:** at WoZ delivery stage, what's the max inbound leads/week you can personally fulfill? This caps how hard to push magnets before automation catches up.
3. **AI-citation checker (1.4):** is a "sampled on date X" disclaimer for nondeterministic AI answers acceptable, or does that undercut the credibility bar this whole approach depends on?

---
*Prepared by Lior (Mission Planner), 2026-07-06, grounded in VISION.md and the shipped asset base as of this date (5 GEO dashboard tools, Instant GEO Audit, GEO Bot WoZ manual, course platform, 2 pilot clients). Linked from VISION.md, Phase 1 section.*
