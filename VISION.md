# WAO — Vision Document
*Last updated: 2026-08-23 (Purple-Cow amendments — see § Product Shape)*

---

## The North Star (1 Year from Now)

> **10,000 Israeli small business owners** are using WAO's AI bot to run their digital marketing — from scratch or on top of existing assets — without needing to understand how any of it works.
>
> The bot has full execution access. The business owner approves. The bot does the work.
>
> WAO is simultaneously opening to English-speaking markets and Eitan is operating as a Visionary, with agent teams advancing the product to its next phase.
>
> **Google first** — the go-to for businesses who want control of their Google exposure. Other platforms later.

---

## The Product

**WAO Bot = AI CMO for small businesses.**

It is not a chatbot that teaches. It is not a course. It is an AI agent that:

1. **Diagnoses** — Audits existing digital assets (website, ads, GMB, domain, social) OR starts from zero
2. **Educates simply** — Explains each decision in plain language a non-expert understands
3. **Gets approval** — Requires only a "continue" from the owner
4. **Executes fully** — Buys the domain, sets the DNS, launches the campaign, optimizes the ad

### Product Shape — the Google Bot Suite

Four independently sellable bots, one unified client portal (`/client/dashboard`):

| Bot | Price | What it does |
|-----|-------|-------------|
| **Site Bot** | ₪199/month retainer (locked Eitan, 2026-08-21 — supersedes the prior ₪1,490–1,990 one-time price; WoZ-invoiced at pilot) | Domain → ~30-page core local-SEO site (service × city) → GBP claim/optimize → deployed → SEO-ready, **plus an ongoing monthly bundle**: page growth/refresh batch (2-4 new or refreshed core-30 pages/month via the same engine, re-gated through `duplicateCheck.ts` each run — not a one-time cap), GBP monitoring/upkeep, and a client-dashboard monthly digest (leads + new pages) that also primes GSC-connection for the month-4 GEO Bot upgrade — **bundle fattened 2026-08-23, same price: Proof Engine + Reputation Loop + Local-Pack Sports Score added to the base rung (see § Purple-Cow amendments below)** — **the single MVP product; GBP/GMB is merged in as step one of delivery** (see Phase 1 wedge) |
| **Phone Bot** (NEW — product #2, 2026-08-23) | ₪149–249/mo range, add-on territory — Dror to price; anchor "one saved job pays the month" | Captured-demand rescue, staged: **v1** = missed-call WhatsApp rescue + photo-quote with owner approval (async, WoZ-friendly, no real-time infra); v2 = AI qualification dialogue; v3 = Hebrew voice receptionist (Phase-2/3 orchestrator's first customer-facing voice surface). **Gated on a missed-call-detection technical spike before any build commitment** — if the spike fails, v1 pivots to photo-quote-first (customer-initiated, no number plumbing) and rescue follows later. The ₪199 digest starts seeding Phone Bot now (the proven DNI digest-seeding pattern). |
| **Ads Bot** | ₪249/mo | Google Ads onboarding → campaign management → monthly recommendations (**demoted to product #3, 2026-08-23** — deferred behind Phone Bot: capture before amplification; arrives once the answer + attribution fabric can prove its ROI honestly, and it carries the roadmap's heaviest external gates — Developer Token production approval, RMF dashboard, billing isolation) |
| **Content Bot** | ₪490/mo | SEO content plan → keyword cluster → article pipeline → publish (later-stage upsell; front door pivoting toward the Proof Engine — jobs/photos/voice-notes as the content input, per PURPLE_COW_OFFER_STRATEGY.md Part A) |

Each bot is an agentic pipeline, not a human-delivered service. The LP markets the bot; the delivery IS the agent flow. **GEO Bot is retired as a separate acquisition channel (Eitan, 2026-08-21 — "kill it fully")** — WAO does not go to market for a second, content-ready-SMB buyer. Its content-authoring engine (`scripts/geo-generate-content.mjs` + `scripts/gsc-pareto.mjs`) is repurposed two ways: (1) core-30 page authorship under the Gate-1 content-safety rules, and (2) **restored as a late-stage upsell for WAO's own Site Bot clients** (Eitan, 2026-08-21) — see below. It is not sold to external content-ready SMBs. The single current *acquisition* product is Site Bot; **product #2 is Phone Bot (2026-08-23, supersedes Ads Bot's presumptive #2 slot)**; Ads Bot (#3) and Content Bot are deferred behind Phone Bot proof. The ₪9.90 trial is once per client, not per bot. **Pricing fork resolved (Eitan, 2026-08-21):** ₪9.90 trial → generate-only preview (cheap, ~₪2 LLM cost, no live deploy/GBP claim) → **₪199/month retainer unlocks the actual deploy** (live core-30 site + GBP claim + the recurring growth/GBP-monitoring/digest bundle, see Bots table above) → **₪299/month GEO Bot upgrade at month 4** once GSC has ≥90 days of real data. This replaces the old one-time ₪1,490–1,990 Site Bot price and the previously-deferred "Phase 2 pricing trigger" (see Monetization § below, now superseded) — it does not require bot-executed edit-via-chat, since the recurring value is the batch page-growth/GBP/digest bundle, not conversational editing.

**Buyer routing (superseded 2026-08-21 by the single-segment wedge — see Phase 1):**
- **Single target segment: no-website micro-business** (fixed-location plumber/electrician-class, in-home tutor, photographer). Enters via **Site Bot** (core-30 + GBP merged). Upsell ladder: **Content Bot once ≥15 pages exist → GEO Bot at ~month 4**, gated on (a) Google Search Console verified/installed on the client's own core-30 site at launch, and (b) ≥90 days of real GSC click/impression data accumulated (`gsc-pareto.mjs`'s hard data floor — confirmed earlier this session it cannot run without it) — ~4 months gives buffer past that floor. This is a same-client lifecycle upsell, not a re-opened acquisition channel — do not market GEO Bot externally or route new content-ready-SMB leads to it. Ads Bot deferred behind Site Bot proof.
- The prior content-ready-SMB branch (accountant/coach/clinic/lawyer/architect → GEO Bot directly as an acquisition path) and the GMB Bot ₪149 month-1 attach are **retired** — that segment is demoted out of the roadmap as an acquisition target and survives only as retter.co.il case study / referral lane (Phase 1 wedge).

### Purple-Cow amendments (2026-08-23 — three forks resolved by Lior-on-Fable, decision delegated by Eitan; full reasoning in `PURPLE_COW_OFFER_STRATEGY.md`)

1. **Product #2 = Phone Bot, not Ads Bot.** Capture before amplification: Site Bot makes the
   phone ring; Phone Bot makes ringing become jobs. Ads Bot moves to #3 (see Bots table).
   Escape hatch: if the missed-call-detection spike fails, v1 pivots to photo-quote-first.
2. **Fat ₪199 rung — over-deliver at the churn-critical rung, monetize at rungs 2+.** The base
   retainer now bundles, at the same price: **Proof Engine** (owner's job photos/voice-notes →
   authored pages, GBP posts, review-asks — replaces "2–4 refreshed pages/month" as the story
   and feeds Gate 1's facts-intake as a byproduct of working), **Reputation Loop** (review
   flywheel + bad-review first-responder; flywheel v1 shipped in git `828f45e`), and the
   **Local-Pack Sports Score** (weekly map-position league table as the digest's spine).
   Rationale: all three are near-pure plumbing reuse; à-la-carte pricing would capture little
   margin while adding cancellation decisions. Revisit only if pilot delivery cost per client
   proves not-near-zero. **Digest denomination rule:** every digest line is denominated in
   **calls, jobs, and shekels** (map positions allowed) — never impressions/clicks.
3. **Courses/webinars demoted to internal-capability status.** Existing course assets stay live
   (sunk, residual SEO); the course pipeline survives as the Phase-4 content-automation
   prototype; **no new course build; mass webinars are out of the growth model.** The funnel
   top becomes **receipts**: the ₪9.90 preview (+ AI-visibility snapshot per Card 9), live
   client case studies, and referrals. The Iceberg's "visible" layer and the Phase-1
   "Trust & Funnel" course mission below are superseded accordingly (kept for history).
4. Rung 0/2 packaging (from the same pass): the ₪9.90 preview additionally bundles a read-once
   **AI-visibility snapshot** ("here's what Google Maps + ChatGPT say about you today —
   nothing"); the month-4 ₪299 upgrade is sold as **"תופיע גם כשה-AI עונה"**, never as "GEO".

### Client-Facing Orchestrator (decided Aug 2026 — Phase 2/3, build deferred)

The suite is sold modularly; the client experiences **one agent**. Bots are capabilities — the orchestrator is the product. There is deliberately no dashboard as the primary surface; the conversation is the unified surface, consistent with "the bot IS the CMS" (see Platform Scope below) and Voice First (§ Interaction Model).

- **Proactive by default, steerable by voice.** The orchestrator prioritizes across a client's owned bots in advance and brings recommendations to the client ("this month your money is better spent on reviews than ads — I've re-paced the budget, say yes"). Voice steering is the override path, not the required path. Zero decisions required, one "continue."
- **Cross-bot recommendations are the upsell path.** The orchestrator managing one bot surfaces the client's next bottleneck and offers the next bot as advice, not marketing — this is the mechanism behind the upsell ladder above (e.g. Site Bot → Content Bot).
- **Build trigger: first client owning 2+ bots.** Until then, the orchestrator is Wizard-of-Oz — Eitan, on WhatsApp — and those conversations are the training data for what the real orchestrator should say. Building the conductor before the orchestra exists is premature.
- **International note:** the conversational orchestrator is the portable layer for later-stage markets; per-market localization applies to bot content pipelines, not to the product concept — a dashboard's information architecture would drag Hebrew-market assumptions with it in a way conversation doesn't.

## Infrastructure Model — WAO-Managed via Client OAuth

**The rule:** WAO operates everything. Clients own everything.

Each client goes through a **one-time onboarding session** (~10 minutes):
- Create their own accounts on each required service (bot guides, step by step)
- Authorize WAO via OAuth or API key (one click per service)
- Bot stores credentials securely and operates via API forever after
- Client never touches a technical interface again

**Why this works at 10,000 clients:**
- Each client's free tier is theirs — not WAO's
- 10,000 clients = 10,000 separate Cloudflare accounts, each with their own limits
- WAO's own accounts stay at near-zero usage
- No infrastructure cost for WAO at any scale

**The property manager model:**
> WAO holds the keys (OAuth tokens). Each client pays their own utilities (free tiers). WAO manages the property.

**What requires OAuth / API key (one-time setup):**
- Cloudflare Pages (site deployment)
- GitHub (version control)
- Resend / email provider (transactional email)
- Google Search Console + Analytics (SEO tracking)

**What requires human action (unavoidable, one-time):**
- Google My Business verification (Google mails a postcard or calls)
- Google Ads account (TOS agreement + billing)
- Meta Business account (ID verification for ads)
- Domain purchase (identity + payment — bot guides, client approves)

---

The interaction model is exactly like Antigravity: the owner says "yes" and things get done.

### Interaction Model — Voice First

> **הדרך המועדפת לדבר עם הסוכן החכם של WAO היא קולית.**
> הקלדה היא fallback — רק כשאין ברירה אחרת.

The WAO bot is designed to be operated primarily by voice. This is not a UX preference — it is a product principle:

- A small business owner driving between jobs, waiting in a clinic, or finishing a meeting should be able to say **"WAO, תבדוק לי את הקמפיין"** and get a spoken response.
- The orchestrator agent manages all sub-agents and executes the full digital stack — all of this should be triggerable and reviewable without the owner ever touching a keyboard.
- Voice removes the last friction point: even a non-technical owner can operate an AI CMO.

**Design constraint for Phase 1:**
Every bot flow must be completable end-to-end by voice. Text input is a valid fallback but must never be the only path.


### Platform Scope (Execution Layer)
- Domain registration & DNS management
- Website / hosting setup — **Next.js + Cloudflare Pages**
  - The bot generates the site from conversation (vibe coding)
  - GitHub = version control layer (bot handles all commits)
  - Cloudflare Pages = deployment layer (auto-deploys, free forever)
  - **The bot IS the CMS** — owner never logs into a dashboard; all updates through conversation
  - **Scales with subscription tier:** static export (Tier 1) → dynamic blog (Tier 2) → full Next.js app (Tier 3)
  - Same codebase, same repo — no rebuild needed when client upgrades
- Google Ads (Search, PMax, Shopping, Display)
- SEO (technical, on-page, content)
- Google My Business / GEO
- Meta Ads (Facebook & Instagram — campaigns, creative, targeting)
- Meta Business Suite (page, profile, organic posts)
- Google Analytics / Search Console
- Content distribution platforms (YouTube, Spotify, Apple Podcasts, TikTok)
- Future emerging AI marketing platforms

---

## The Business Model (Iceberg)

```
VISIBLE (Trust & Discovery — amended 2026-08-23):
  Receipts: ₪9.90 preview + AI-visibility snapshot → live client case studies → referrals

─────────────────────────────────────────────────────────────────

HIDDEN (The Real Product):
  Bot with full API execution access to all marketing platforms
  → Automated, supervised, and approved by the business owner
```

~~The courses are **not** the product. They are the **marketing** for the product.
Their purpose: build enough trust that a small business owner hands over their accounts.~~
**Superseded 2026-08-23 (Purple-Cow fork 3):** for the locked persona (near-zero time,
allergic to jargon), a course is homework — trust is built with **receipts**, not education.
Courses/webinars are internal capability only; existing assets stay live for residual SEO.

### Monetization

**Starting hypothesis (to be validated in Phase 2):**

| Stage | What client pays | What they get |
|-------|-----------------|---------------|
| **Setup** | ₪9.90 (one-time) | Onboarding session + campaign structure + landing page |
| **Month 1 (trial)** | ₪0 WAO fee | Bot monitors passively; Google new-account credit offsets most ad spend |
| **Month 2+ (subscription)** | ₪249/month | Proactive bot management: weekly digest, budget pacing, optimization alerts, retention nudges |

Client always pays their Google Ads budget directly to Google — WAO never touches ad spend.

**Why this structure:**
- ₪9.90 creates real commitment (billing info, psychological skin in the game) without feeling like a purchase
- Month 1 free aligns with the Google credit window — client sees results before paying subscription
- ₪249/month is anchored to demonstrated ROI, not a promise
- At 1,000 active subscribers: ₪249,000 MRR — viable without outside funding

**What must exist before Month 2 can be sold** → see Proactive Management Loop below.

**Open questions for Phase 2 validation:**
- What is the actual churn trigger? (price? lack of results? no communication from WAO?)
- Should there be a Tier 2 (₪499/month) for multi-channel or higher ad spend clients?
- Does the ₪9.90 need to be higher to filter unserious leads?

**Phase 2 pricing trigger — Site Bot subscription model (SUPERSEDED 2026-08-21 — locked, not deferred):**
~~Site Bot is currently priced at ₪1,490 one-time (keep, confirmed July 2026 — supply-constrained at WoZ stage, cutting price buys nothing). The subscription model (₪249–299/mo, includes build + ongoing edit-via-chat + GSC/GMB health checks) is the right long-term frame but requires edit-via-chat to be bot-executed, not WoZ-manual. **Trigger to revisit:** when Eitan-Dev ships automated edit-via-chat.~~ **Locked instead (Eitan, 2026-08-21): ₪199/month**, below the previously-floated ₪249–299/mo range, because the recurring deliverable that justifies "retainer" doesn't need edit-via-chat automation — it's the batch page-growth engine (already built this session) + GBP monitoring + a dashboard digest, all of which are batch/WoZ-executable today. Same moat logic applies (churn requires cancelling ongoing value, not just declining a rebuild), reached without waiting on the edit-via-chat trigger. See Bots table and Buyer routing § above for the full ladder.

### Growth Model (amended 2026-08-23 — mass webinars removed, Purple-Cow fork 3; a webinar funnel selects *against* the target owner)
```
Receipts (₪9.90 preview + AI-visibility snapshot, case studies, referrals)
       ↓
WhatsApp-native onboarding
       ↓
₪199/mo retainer (fat bundle)
       ↓
Phone Bot rung → month-4 ₪299 AI-visibility upgrade
       ↓
International (English-speaking markets)
```

---

## The Gap Analysis

| Gap | Status | Priority |
|-----|--------|----------|
| **The bot doesn't exist** | Current state | 🔴 BLOCKER |
| **No distribution pipeline to 10K SMBs** | Partially built (SEO, courses) | 🟡 Secondary |
| **Trust / brand authority** | In progress | 🟡 Secondary |
| **Agent team capacity** | Growing | 🟠 Ongoing |

> **E is the answer: The bot doesn't exist yet. Nothing else matters until there's something to show.**

---

## Immediate Priority Stack

### Phase 0 — Foundation (Now)
- [x] Build SEO authority and course content (trust layer)
- [x] Establish agent team (Tamar, Gil, Dror, Yonatan, Maya, Eitan-Dev)
- [ ] Define bot architecture and MVP scope

### Phase 1R — GEO/AIO: retired as a product, engine repurposed (superseded 2026-08-21, via Lior)

GEO Bot is **no longer a standalone revenue product** (Eitan, 2026-08-21 — "kill it fully"). The prior framing here — ₪199/590/1,290 self-serve/Managed/Pro tiers, content-ready-SMB buyer profile, done-for-you monthly service — is **retired in full**. What survives is the **engine and the execute-verify pattern**, repurposed for the single-segment Site Bot wedge (see Phase 1 — MVP Bot):

- **Content-authoring engine** — `scripts/geo-generate-content.mjs` + `scripts/gsc-pareto.mjs` — repurposed two ways: (1) core-30 Site Bot page authorship, now **bound by the Gate-1 content-safety rules** (per-page Hebrew authorship by Tamar, no `{service}×{city}` template substitution, facts-intake gate, Roni duplicate/near-duplicate check — see Phase 1 wedge); (2) **restored as a ~month-4 upsell for WAO's own Site Bot clients** (Eitan, 2026-08-21) once their own core-30 site has ≥90 days of real GSC data (`gsc-pareto.mjs`'s hard floor) — **not** re-opened as an external content-ready-SMB acquisition product. **Build implication: GSC verification/install must be part of Site Bot's own delivery checklist**, not an afterthought, or the month-4 clock never starts.
- **Reusable proven assets (keep):** Pareto engine + intent filter, Tamar→Noa two-pass Hebrew generation, immutable approval log (`data/geo-logs/{clientId}/log.jsonl`), verification crawler (fingerprint + JSON-LD), WhatsApp delivery (wa.me deep links), client action page (`/geo/action/[actionId]`).
- **retter.co.il** — the former pilot client — survives only as a **case study / quiet referral lane** (warm intros only, no further product build for that segment).
- **The execute-verify pattern this proved** (GSC → score → author → approve → verify → next action) remains the template every bot's loop follows.

---

### Foresight — 3-Month Ambitious Goals (living doc, re-read every 2-3 weeks)
Prepared by Lior 2026-07-06: generalized lead-magnet plays beyond the GEO Audit (AI-search-readiness scanner, GBP review-comparison, Ads-waste checker, AI-citation checker), what's beyond SEO/GEO/Ads scope (and what got cut and why), and where the AI capability curve actually flips something in this specific 90-day window. Includes a priority table and checkpoint schedule.
Artifact: https://claude.ai/code/artifact/a3b6983c-39bd-48bf-b4ca-480fa355c3a3

### Foresight — 1-Year Structural View (living doc, re-read quarterly)
Companion to the 3-month doc, different altitude: what has to be true each quarter (Q1 load-bearing facts → Q2 proof-driven positioning + the frozen specialist/agency fork decision point → Q3 scaling stress-test/WoZ ceiling → Q4 ARR-ceiling reality check + English go/no-go). Names the single-founder bottleneck bluntly, the 12-month AI-curve bet with an explicit fallback, and a 3-tier moat analysis (evidence base > Hebrew-native quality > switching costs — tools/content/pricing are NOT a moat).
Artifact: https://claude.ai/code/artifact/1dbfd8a3-4adf-4d0b-ae29-e00702723a09

### Phase 1 — MVP Bot (Next)

**Wedge decision (superseded 2026-08-21, via Lior — supersedes the locked 2026-08-08 two-branch decision below):** WAO commits to a **single target segment**: the micro-business with **no existing website**. The prior two-branch, risk-weighted wedge (content-ready/GEO branch run "first and harder," GBP branch as a 30%-odds probe) is **collapsed to one branch.** The content-ready segment (accountants, lawyers, clinics, coaches, architects) is **demoted out of the product roadmap** and survives only as:
- (a) a **reusable content-authoring engine** — `scripts/geo-generate-content.mjs` — repurposed to author the micro-business's pages, not sold as GEO Bot to content-ready SMBs; and
- (b) **retter.co.il as a case study / quiet referral lane** — one closed reference relationship, warm intros only, **no further product build for that segment.**

Rationale: the two-branch structure split a single founder's WoZ throughput across two buyer journeys, two diagnosis templates, and two acquisition lanes — the GEO branch was the easier proof but the wrong-volume segment; the no-website branch is the actual North-Star segment ("from scratch," 10,000-client target) but was being run as a thin probe. One segment, run to real depth, beats two run shallow.

**Product shape — core-30 is Site Bot's primary shape, not a deferred acquisition play:** the no-website micro-business's local visibility is won by a **~30-page core local-SEO site** (service × city coverage) that surfaces in the **Local Pack**, plus a claimed/optimized Google Business Profile. This is what Site Bot builds and is Site Bot's *first* delivery, not a Phase-2 volume play sequenced after some other proof flow. **GMB Bot is merged into Site Bot** — it is no longer a separate ₪149 SKU. Claiming/optimizing the GBP is step one of the Site Bot delivery, not a distinct product; the unified deliverable is "you go from invisible to found in the map + a real site behind it."

**Two binding content-safety gates (Yonatan, verified 2026-08-21 — verdict CAUTION→PROCEED, both gates are build constraints, not options):** the core-30 mechanism holds in Hebrew and GBP-dominance stats confirm at US-comparable magnitude, BUT Google's **June 2026 global spam update explicitly targets templated city/service doorway pages** — exactly what a naive `{service}×{city}` string-substitution generator produces. Therefore:
1. **Every core-30 page requires genuine per-page Hebrew authorship (Tamar), never template substitution.** This is doubly required: Hebrew construct-state phrasing does not token-swap cleanly (grammar), and per-page authorship is the doorway-page defense (policy). A generator that fills a template with `{service}`/`{city}` is a build failure, not a shortcut.
2. **"2 weeks to top-3" is an unproven hypothesis for Israel and stays out of all marketing copy** until measured. Track real before/after Local Pack position on the first 1–2 pilot clients; only a measured Israeli result may ever become a timeline claim.

**Gate 1 enforcement — per-page content minimums (Yonatan, spec dated 2026-08-21, binding build gate, not a checklist to skim):** the `geo-generate-content.mjs` core-30 fork must not run as a `{service}×{city}` matrix job. Every page requires: a locally-specific service narrative sourced from real client facts (not generated from a slot-fill prompt), a distinct FAQ (not a shared block reused across pages), a real client scenario per service page, a unique image per page (no reused stock hero), differentiated meta-description logic, an internal-linking pattern that varies by genuine local relevance (not a mechanically identical link graph), and honest physical/service-area transparency per page (no implied storefront in a city with no fixed base). A per-node facts-intake gate blocks generation when real local facts are missing — an empty node does not get a filler page. Roni (verifier) adds a same-tier duplicate/near-duplicate check (FAQ block, narrative, image) to the pre-deploy gate for this content type specifically. Owners: Tamar authors against the facts-intake template; Eitan-Dev builds the facts-intake gate + duplicate-check into the pipeline; Roni wires the pre-deploy similarity check. Full spec in session record — do not build the fork before this gate exists in the pipeline.

**Segment scope, resolved for launch (Yonatan + Gil, 2026-08-21):** GBP has a structural split — **fixed-location** listings (plumber, electrician: van/service-radius model) vs. **service-area** listings (behave differently for Local-Pack relevance). "Tutor" (מורה פרטי) is not one coherent persona under this product — it splits into in-home (plumber-shaped, fits core-30 cleanly), fixed-location/storefront (needs one location page, not N city pages), and online-only (no local relevance — core-30 would be wasted effort and reads as thin/spammy). Photographer is a hybrid (fixed studio + on-location shoots) that needs a `locationType` conditional per page (studio-vs-service-area framing) — a small template addition, not a redesign. **Launch scope, narrowed not deferred: fixed-location micro-business (plumber, electrician-class), in-home tutors, and photographer (with the `locationType` conditional built in)** — all structurally buildable off the core-30 template today. Storefront-tutor and online-only-tutor are **out of this wave** until their own page/GBP structure is designed — do not port the plumber template to them.

**Delivery is buildable now — payment is the only real blocker, and it does not block the pilot (verified against the codebase 2026-08-21, not from stale specs):** Site Bot's generate→deploy→edit pipeline is **actually built and testable** (`scripts/test-site-bot.mjs`; generate/deploy/checkout are wired in git history; Cloudflare deploy is live-credentialed). The one live gap is **payment**: checkout defaults to `MockPaymentProvider`, and `TakbullPaymentProvider` still throws pending real endpoint docs from Takbull post-meeting — Takbull is **not closed yet** (Eitan, 2026-08-21), everything else advances in the meantime. **Consequence for the pilot:** the first 1–2 pilot clients run **WoZ-invoiced (manual billing)**; live self-serve billing is not a prerequisite for delivering the pilot and must not be treated as one.

**Separately blocking, GBP-side (Eitan-Dev, verified live 2026-08-21):** `GBP_CLIENT_ID` / `GBP_CLIENT_SECRET` / `GBP_REFRESH_TOKEN` are **not present** in `.env.local` — the "just granted" access never made it into this environment (or exists only server-side and was never synced). `runGbpScopeSmokeTest()` already exists in `src/lib/gbp/client.ts` and is ready to run the moment credentials land; nothing GBP-write (categories, services, completeness scoring — the core of the merged Site Bot deliverable) can start until then. This is now the **critical-path blocker**, ahead of payment.

**Pricing/conversion fork — RESOLVED 2026-08-21 (Eitan):** ₪9.90 trial → generate-only preview → **₪199/month retainer unlocks deploy** (live site + GBP claim + recurring growth/GBP-monitoring/digest bundle) → ₪299/month GEO Bot upgrade at month 4. See Bots table (top of doc) and Buyer routing § for the full ladder and rationale. **Build implication, not yet done:** `checkout`/payment gating currently sits on `deploy/route.ts` per the pilot's WoZ-invoiced flow (see below) — it needs to reflect a recurring ₪199/mo charge, not a one-time ₪1,490–1,990 charge, before this is wired to real billing (Takbull, still not closed as of 2026-08-21).

- [ ] **Site Bot (core-30 + GBP) is the single MVP flow** — build and deliver it end-to-end to the first fixed-location micro-business (plumber/electrician-class) or in-home tutor.
  - Per-page Hebrew authored by Tamar (Gate 1) — no template substitution.
  - GBP claim/optimize is step one of delivery (GMB Bot merged in) — **blocked on GBP credentials, see above.**
  - **GSC verification/install is part of delivery, not an afterthought** — starts the clock toward the month-4 GEO Bot upsell (Product Shape, buyer routing).
  - First 1–2 clients: WoZ-invoiced, `MockPaymentProvider` acceptable until Takbull ships.
  - Before "done": `node scripts/test-site-bot.mjs` green, GBP smoke test (`runGbpScopeSmokeTest()`) green, and record real before/after Local Pack position (Gate 2).
- [ ] Build the approval/execution loop ("continue" UX) around the Site Bot delivery.
- [ ] Connect first platform integrations (Domain registrar + Cloudflare Pages deploy — already live-credentialed; Google Business Profile — blocked on credentials).
- [ ] **Next concrete mission:** get GBP credentials into `.env.local`/`.env.production` and re-run the smoke test; define the single Site-Bot delivery template (core-30 authored pages + GBP claim/optimize) for the fixed-location/in-home-tutor segment; run the first WoZ delivery — pending resolution of the pricing fork (item 5 above).

### Phase 1 — Trust & Funnel (Parallel to Bot Build)

> **SUPERSEDED 2026-08-23 (Purple-Cow fork 3):** the course mission below is demoted to
> internal-capability status — no new course build, no webinar funnel. The trust layer for the
> locked persona is receipts (preview + snapshot, case studies, referrals). The pipeline
> survives as the Phase-4 prototype. Section kept for history.

> **Priority course: "Agentic Website Building + SEO in the Age of AI"**
> This is the highest-priority content mission — even more foundational than the Google Ads course.
>
> **Why:** It targets the exact SMB audience the bot is built for. Someone who watches this course and builds their site with AI guidance is experiencing — manually — the exact flow the bot will automate for them. The course is simultaneously:
> - The trust layer (demonstrates WAO's expertise)
> - The funnel top (drives the right audience)
> - A live prototype of the Site Bot flow (domain → core-30 site → GBP → SEO)

- [ ] Design curriculum: Agentic Website Building + SEO (hands-on, AI-native, zero jargon)
- [ ] Produce course (Dror/Yonatan brief → Gil scripts → Noa QA → ElevenLabs → publish)
- [ ] Build course landing page on WAO


### Phase 1.5 — Proactive Management Loop (RETENTION PREREQUISITE)

> **Must exist before the ₪249/month subscription can be sold.**
> Without this, clients onboard and go dark. Churn after month 1 is near-certain.

The bot checks each active client's campaign weekly and sends a proactive message — no human involved. This is what justifies the ongoing subscription fee and is WAO's primary retention mechanism.

**Minimum viable management loop (what to build):**

| Trigger | Bot action |
|---------|-----------|
| Weekly (every Monday) | Send performance digest: impressions, clicks, leads this week vs last week |
| Budget pacing off (>20% over/under) | Alert: "הקמפיין שלך מוציא [יותר/פחות] ממה שציפינו — הנה מה שאני מציע" |
| Zero conversions in 7 days | Alert + diagnosis: check LP, check ad quality, check geo targeting |
| Lead closed (client logs it) | Celebrate + prompt: "כל הכבוד! כמה שווה היה הלקוח הזה? נעדכן את המודל" |
| 30 days without client login | Churn-risk flag → WAO internal alert (not bot message) |

**Implementation owners:**
- Bot monitoring logic → Eitan-Dev (`src/lib/crm/intelligence.ts`)
- Message channel → existing bot voice/text (no new UI)
- Weekly cron → already in VISION.md Phase 3.5; pull it forward to here
- Google Ads data source → Google Ads API reporting (requires Developer Token)

**Gate:** This loop must be working for at least 10 pilot clients before Phase 2 (mass onboarding) opens. Selling a subscription without delivering ongoing value is churn baked in.

---

### Phase 2 — Trial & Validation
- [ ] Launch free limited trial
- [ ] ~~Run mass webinar onboarding~~ (removed 2026-08-23, Purple-Cow fork 3 — WhatsApp-native onboarding + referrals instead)
- [ ] Identify the pricing trigger (what do users want unlocked?)
- [ ] Validate ₪249/month conversion rate from trial → subscription

#### Budget Estimation — Keyword Planner API (Option B)

The onboarding bot's current budget model uses industry cluster averages (CPC midpoints + CVR estimates). This is accurate enough for Phase 1, but the right long-term answer is live Keyword Planner data.

**Trigger:** First client completes Google Ads OAuth (grants WAO manager access via MCC).

**How it works:**
- At turn 0 (niche collection), the bot extracts 2–3 Hebrew keywords from the business niche + city
- Bot calls Google Ads Keyword Planner API (`GenerateKeywordIdeas`) with those terms, `geo_target = Israel`, `language = Hebrew`
- API returns live CPC estimates in ILS — no manual table needed, covers any niche, always current
- Result is injected into the budget hint as `cpc` → all downstream math uses real numbers

**Work when triggered (owner: Eitan-Dev):**
- `src/lib/ads/keywordPlanner.ts` — `getEstimatedCPC(keywords: string[], city: string): Promise<number>` using the Google Ads API client
- Call it in `/api/bot/route.ts` Azure path after niche is collected; inject result into `budgetHint`
- Cache results in `data/cpc-cache.json` keyed by `${niche}:${city}` with a 30-day TTL to avoid redundant API calls
- Simulation path continues using cluster table (no API call needed for simulation)

**Why this matters:** Replaces all manual CPC guesswork. A physiotherapist in Tel Aviv gets a different CPC than one in Dimona — Keyword Planner knows; our cluster table doesn't.

---

#### Google Ads API — Hard Gates Before Scaling (Developer Token Production Approval)

Google's ToS and Required Minimum Functionality (RMF) policy require these before WAO can hold a production Developer Token at scale:

- [ ] **Campaign dashboard** — every client must be able to see their own campaign structure, live spend, impressions, and conversions inside WAO's UI. Google may audit the interface at any time; "voice-only with no data visibility" fails RMF. **Note: `/client/dashboard` (already built for GEO Bot) serves double duty — client task portal AND this RMF compliance requirement. Two mandates, one build.**
- [ ] **Consent log** — every budget change, campaign toggle, or billing action taken by the bot on a client's behalf must write an immutable record (timestamp, client ID, action, approval method) to the CRM. Required for indemnification under API ToS §11.
- [ ] **Billing isolation** — each client sub-account under WAO's MCC must have its own billing linked (client owns the spend liability). WAO fronting all billing is fine for MVP/trial; it is a liability and ToS risk at scale.
- [ ] **Human TOS gate for each new account** — the bot can scaffold the Google Ads sub-account, but the client must manually accept Google's billing terms. This gate already exists in the payment flow; confirm it persists as account creation moves to the API.
- [ ] **Per-client OAuth audit trail** — WAO authenticates as manager (MCC model, single Developer Token + WAO OAuth). This is correct and compliant. Document explicitly in the codebase that WAO never impersonates the client's identity in API calls — WAO acts as authorized manager only.

### Phase 3 — Scale
- [ ] Open to English-speaking markets
- [ ] Eitan operates as Visionary only — agent teams run execution

#### Google Ads Conversion Pipeline — Pre-Ship Gates

These features are **built but intentionally incomplete** pending external gates. Each one has a clear trigger — when the trigger arrives, the work listed is what gets done.

---

**Gate 1 — Enhanced Conversions for Leads (ECL)**
*What it is:* Sends a hashed phone number to Google as a fallback match signal for iOS/Safari visitors who click an ad and call from a saved number days later on a different device. Recovers attribution that gclid/wbraid misses.
*Why it's blocked:* Israel's Privacy Protection Law Amendment 13 (in force Aug 14, 2025) requires **explicit, granular, unbundled consent** for sending online identifiers and hashed PII to third parties for direct marketing. The current LP consent checkbox is bundled ("I agree to marketing"). ECL is sending hashed phone → Google — that requires a specific consent statement.
*Trigger:* When you decide to add ECL to the LP.
*Work when triggered:*
- Tamar writes granular consent copy: "אני מסכים לקבל שיווק ישיר מ-[שם עסק] ולשיתוף פרטי קשר מוצפנים עם Google לצורך ייעול פרסום" — then Noa proofs it
- Eitan / legal signs off on the lawful-basis + opt-out/deletion path
- Eitan-Dev wires the ECL tag to the LP (hashed phone sent with form submit + click events)
- Note: ECL uses a 63-day attribution window vs 90 days for raw gclid

---

**Gate 2 — Primary/Secondary Conversion Action Flip**
*What it is:* When a client account accumulates enough "ליד מאומת" offline conversions to move from Phase A (bidding on expected-value verified leads) to Phase B (bidding on real closed-deal revenue), "עסקה סגורה" must become the **only primary** conversion action. If both "ליד מאומת" and "עסקה סגורה" are primary simultaneously, one ₪3,000 deal gets counted twice → tROAS becomes fiction.
*Trigger:* When you (WAO) decide a specific client is ready for Phase B — typically ~30+ closed deals logged in the CRM, stable revenue values.
*Work when triggered:*
- Build a WAO admin route: `POST /api/google-ads/set-primary-conversion` — takes `{ customerId, primaryAction: 'verified-lead' | 'closed-deal' }` and updates the campaign's conversion goals via the Google Ads API
- Add a Phase toggle to the WAO account-management dashboard (not the client-facing CRM)

---

**Gate 3 — Portfolio tROAS (Scale)**
*What it is:* A single local service client gets ~20–50 clicks/month, closing ~1–5 deals. Google needs ~50 valued conversions/month for tROAS to work reliably. Individual accounts will never reach this. The solution: group similar-vertical clients under a **shared MCC portfolio bid strategy** (e.g., all plumbers in the same budget tier share one tROAS strategy) so the collective signal is large enough.
*Trigger:* When WAO has 10+ clients in the same vertical active simultaneously.
*Durability screen (before scaling into a new vertical):* Physical/local/trust-based service verticals (plumbers, locksmiths, clinics) are structurally durable — proceed. A vertical that is software-only or commodity knowledge-work must pass a single trial-client validation cycle before WAO scales into it, since AI disruption can erode its lead economics faster than the portfolio pays back.
*Work when triggered:*
- Dror defines vertical groupings and target ROAS values per vertical
- Eitan-Dev builds the portfolio strategy creation route under the MCC
- Campaign creation route updated to attach new clients to the appropriate portfolio strategy instead of account-level bidding

---

**Gate — Desktop Call Attribution (DNI)**
*What it is:* Dynamic Number Insertion (DNI) / call-tracking for desktop paid traffic (e.g. CallRail-style swap numbers per session/campaign), to attribute desktop phone calls that currently leave no trackable trail. Mobile click-to-call is already natively trackable; desktop text-displayed numbers are not.
*Status:* **DEFERRED** (as of 2026-08-09, Lior's mission-planner assessment) — not a Phase 1 priority. Current wedge (Site Bot core-30 + GBP) doesn't depend on desktop call attribution; Ads Bot itself (the eventual consumer of this capability) is still deferred behind Site Bot proof.
*Trigger:* First call-dependent Ads Bot client who genuinely requires desktop targeting — i.e. whose core commercial queries skew desktop/considered rather than mobile/transactional. A per-vertical device-split check, separately commissioned to seo-strategist, determines this.
*Buy vs. build:* Buy only (e.g. CallRail or an Israeli equivalent) — never build in-house. This is a telephony/SIP/call-recording domain with zero strategic differentiation for WAO.
*Cost-model flag:* DNI is a recurring per-number cost that scales with client count — it breaks the near-zero-marginal-cost free-tier infrastructure model the rest of the stack (Cloudflare, GitHub, etc.) relies on. Must be factored into Ads Bot pricing before DNI is ever built, not discovered after.
*Compliance note:* Shares the same Israeli Privacy Protection Law Amendment 13 explicit-consent trigger as Gate 1 (Enhanced Conversions for Leads), since both involve sending identifiers to third parties — call recording and DNI sit in that same regime.

**Update 2026-08-09 (pricing decision)** — Lior (mission-planner), approved by Eitan:
- **Vendor:** No longer hypothetical — Eitan already holds an existing agency white-label WhatConverts account (confirmed to support real Israeli DNI numbers at entry tier, per earlier vendor research). Acquisition cost is sunk.
- **Product shape:** DNI will be an **opt-in paid add-on, available only to Google Ads clients**, priced on a budget-tier structure scaled to client ad spend (higher spend → more call volume → higher tier price; exact tiers pending Dror/ppc-strategist). Clients who don't opt in default to **mobile-first, scoped advertising** (narrower targeting that doesn't depend on desktop call attribution) — a deliberate, coherent product posture, not a degraded fallback.
- **Cost-model:** resolved in principle — the add-on is a variable cost attributed only to the opt-in client and passed through via WAO's own billing (Takbull, since WhatConverts white-label cannot bill the end-client directly), preserving the near-zero-marginal-cost model for the majority of clients who don't opt in. Still open until Dror's tier pricing confirms it clears worst-case cost with margin.
- **Technical constraint found:** WhatConverts' public API supports profile creation and pulling call-event/lead data programmatically, but does **not** support purchasing or assigning phone numbers via API (dashboard-only, per direct API-docs review) — full end-to-end automated per-client provisioning is not currently possible via public API alone. Recommended resolution: a 30–60 minute credentialed spike (log into the real account, check if number assignment is reachable outside the dashboard UI), deferred until Ads Bot reaches its onboarding-build stage — not needed now.
- **Scope:** this update records the product/pricing decision only. The actual API integration into the Ads Bot signup pipeline remains explicitly deferred — Ads Bot doesn't have a signup flow yet to hang this off, and speccing the integration now risks building against an interface that doesn't exist yet.
- **Pricing refinement (2026-08-09, later same day):** scope narrowed to **desktop-only** (mobile stays on the free zero-cost reveal-number click-tracker already shipped) — this lowers the variable/airtime cost enough to target **~49 ILS/month**, and the add-on is aimed at the smaller/lower-spend client tier, not the 7000+ ILS/month ad-spend accounts.
- **Upsell timing (2026-08-09, Lior, approved by Eitan):** not bundled at signup — month-1 retention is the current top priority, and a client who hasn't run ads yet hasn't felt the "untracked call" pain, so the value isn't legible. Instead: **seed it for free** from day one via the weekly digest (transparently show desktop calls as an untracked gap, no price attached), then **sell it after the client's first full paid month**, once the digest has made the gap visible and retention is already proven. A pre-renewal reminder email is a fallback re-touch only, not the primary trigger. Open question: if Ads Bot's base subscription has a free/discounted first month, "first full paid month" lands in month 3, not month 2 — anchor to the first genuinely-paid, results-visible cycle.
- **Pricing finalized (2026-08-09, Dror, real rates confirmed by Eitan):** real WhatConverts costs confirmed at **$10/number/month + $0.045/minute** (supersedes earlier $1.75–2.50 and $7 estimates). At those rates, a flat uncapped 49 ILS/month does NOT clear worst-case margin — a single high-volume month (~100 calls × 4 min) costs ~75 ILS against 49 ILS revenue. Resolution: **49 ILS/month, capped at ~150 included minutes, metered overage billed at cost + small margin beyond the cap**, and **naturally high-call-frequency verticals (emergency/urgent services — plumbers, locksmiths, urgent medical) are hard-excluded from this SKU** regardless of ad-spend tier, since their baseline call cadence alone can blow through the cap. This is now the final product/pricing shape pending only the still-deferred technical integration (see Technical constraint above).

---

**Standing rule:** Until Gate 2 is triggered, "ליד מאומת" is the primary bidding signal and "עסקה סגורה" is observation-only. This prevents double-counting and is the correct default for all new accounts.

### Phase 3.5 — CRM Intelligence & Proactive Bot

The architecture already supports this. Every lead has `slug`, `customerId`, `orderId`, `revenue`, `closedAt`, and a gclid linking back to a specific Google Ads click. The CRM is the signal source — the intelligence lives in the bot/orchestrator, not the CRM itself. This is also WAO's strongest retention mechanism: a client who sees their revenue history improving and gets proactive suggestions from the bot isn't going anywhere.

#### Automatic Triggers (no-brainer — implement when CRM has real data)

These fire from the bot when thresholds are crossed. No manual admin.

| Trigger | Bot message |
|---------|------------|
| Client closes 10 deals | "סגרת 10 עסקאות מהקמפיין — הגיע הזמן לשקול הגדלת תקציב" |
| Close rate exceeds 30% | "הקמפיין לא מספיק לך — כל ₪1 שתוסיף לתקציב אמור להחזיר ₪X לפי הנתונים שלך" |
| Attributed revenue hits ₪50K | "הגעת ל-₪50K הכנסה מהקמפיין — הגיע הזמן לשקול קמפיין שני לשירות נוסף" |
| Seasonality (pre-holiday period) | "לפני החגים — זה הזמן להגדיל תקציב. שרברבים ברמה שלך מכפילים הכנסות בתקופה הזו" |
| Client stops logging closes for 3+ weeks | Internal WAO flag → account manager follow-up (churn signal) |

#### Longer-Term Intelligence (Phase 3.5+)

- **Cross-client benchmarking** — "שרברבים דומים לך סוגרים 40% מהלידים — אתה על 22%. הנה מה שהם עושים אחרת." Requires 10+ clients in the same vertical with sufficient CRM data.
- **Lifetime value tracking per client** — cumulative revenue attributed via offline conversions, tracked per `customerId`.
- **Churn prediction** — client stops logging closes → flag to WAO account manager before they cancel.

#### What to build when ready
- `src/lib/crm/intelligence.ts` — pure functions: `checkTriggers(slug)`, `getCloseRate(slug)`, `getAttributedRevenue(slug)`, `detectSeasonality()`
- Bot/orchestrator calls `checkTriggers` after every `markClosed` and on a weekly cron
- Trigger messages route through the existing bot voice/text channel — no new UI needed
- Benchmarking requires an aggregation query across `data/leads.json` per vertical — straightforward once 10+ clients exist

### Phase 4 — Content Automation (2027)
- [ ] Business owner supplies raw material: voice note, photos, short phone video
- [ ] Bot generates a finished ad or organic post (script → voiceover → video → edit)
- [ ] Owner reviews and approves
- [ ] Bot publishes simultaneously across all connected platforms (YouTube, Meta, TikTok, Spotify)
- [ ] WAO's internal course pipeline (Gil → Noa → ElevenLabs → MoviePy → YouTube API) becomes the prototype for this — it already works for WAO's own content
- [ ] **Content Bot:** GEO Bot's Tamar→Noa content pipeline is the Content Bot prototype — extend, don't rebuild.

---

## Why WAO Can Win (Competitive Moat)

The big platforms (Google, Meta, TikTok) will **never** build the aggregator on top of themselves:

- **Google and Meta** profit from agencies managing creative — a bot that replaces agencies destroys their partner ecosystem
- **Each platform** built walled gardens — no incentive to connect the others
- **Enterprise bias** — big firms optimize for large clients and ignore the millions of SMBs
- **Liability fear** — big firms won't accept responsibility for autonomous spending on a client's behalf

> WAO doesn't own the platforms. WAO owns the **workflow and the trust** — which is more valuable to an SMB than owning six separate dashboards they don't understand.

The AI quality threshold (video, voice, creative) was crossed in 2024-2025. The window is open **now**.

---

## Decision Framework for All Missions

Before any task is approved, ask:

1. **Does this build the bot?** → If yes, top priority.
2. **Does this build trust/authority that fills the trial funnel?** → If yes, high priority.
3. **Does this improve agent capacity to build faster?** → If yes, medium priority.
4. **Does this do none of the above?** → Deprioritize or drop.

---

## Open Questions (To Resolve)
- What are the 3 MVP bot flows in detail?
- Which platform integrations are built first?
- What is the trial experience? (What's included, what's locked?)
- Who are the first 100 trial users and how do we reach them?
