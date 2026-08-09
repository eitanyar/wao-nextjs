# WAO — Vision Document
*Last updated: June 2026*

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
| **GEO Bot** | ₪199/mo | GSC → Pareto → AIO content → action page → verify loop — *for content-ready SMBs: accountants, coaches, clinics, lawyers, architects (30+ pages, existing GSC data)* |
| **Ads Bot** | ₪249/mo | Google Ads onboarding → campaign management → monthly recommendations |
| **Content Bot** | ₪490/mo | SEO content plan → keyword cluster → article pipeline → publish |
| **Site Bot** | ₪1,490–1,990 one-time | Domain → Next.js scaffold → deployed → SEO-ready — *the front door for micro-SMBs (plumbers, tutors, photographers)* |

Each bot is an agentic pipeline, not a human-delivered service. The LP markets the bot; the delivery IS the agent flow. Clients subscribe to individual bots or bundle (Organic Growth Stack: GEO + Content ~₪580/mo). The ₪9.90 trial is once per client, not per bot — **trial entry point is Site Bot, not GEO Bot.**

**Buyer routing (validated by Lior, July 2026 — updated upsell ladder confirmed July 2026):**
- **Micro-SMB** (plumber, tutor, photographer): Site Bot first → **GMB Bot ₪149 at month 1** (site completion) → Content Bot ₪490 at month 6 → GEO Bot ₪199 once ≥15 pages exist. GEO Bot is NOT the month-3 attach for 5-page Site Bot buyers — their transactional queries trigger Local Pack, not AI Overview; a 5-page site has no surface for GEO Bot to work on.
- **Content-ready SMB** (accountant, coach, clinic, lawyer, architect): GEO Bot directly. Informational search precedes their purchase decisions; AIO dominates their query space; 30+ pages give the pipeline real leverage.

### Client-Facing Orchestrator (decided Aug 2026 — Phase 2/3, build deferred)

The suite is sold modularly; the client experiences **one agent**. Bots are capabilities — the orchestrator is the product. There is deliberately no dashboard as the primary surface; the conversation is the unified surface, consistent with "the bot IS the CMS" (see Platform Scope below) and Voice First (§ Interaction Model).

- **Proactive by default, steerable by voice.** The orchestrator prioritizes across a client's owned bots in advance and brings recommendations to the client ("this month your money is better spent on reviews than ads — I've re-paced the budget, say yes"). Voice steering is the override path, not the required path. Zero decisions required, one "continue."
- **Cross-bot recommendations are the upsell path.** The orchestrator managing one bot surfaces the client's next bottleneck and offers the next bot as advice, not marketing — this is the mechanism behind the upsell ladder above (e.g. Site Bot → GMB Bot).
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
VISIBLE (Trust & Discovery):
  Courses → Blog → SEO content → Webinars → Brand authority

─────────────────────────────────────────────────────────────────

HIDDEN (The Real Product):
  Bot with full API execution access to all marketing platforms
  → Automated, supervised, and approved by the business owner
```

The courses are **not** the product. They are the **marketing** for the product.  
Their purpose: build enough trust that a small business owner hands over their accounts.

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

**Phase 2 pricing trigger — Site Bot subscription model (DEFERRED, decision July 2026):**
Site Bot is currently priced at ₪1,490 one-time (keep, confirmed July 2026 — supply-constrained at WoZ stage, cutting price buys nothing). The subscription model (₪249–299/mo, includes build + ongoing edit-via-chat + GSC/GMB health checks) is the right long-term frame but requires edit-via-chat to be bot-executed, not WoZ-manual. **Trigger to revisit:** when Eitan-Dev ships automated edit-via-chat (bot redeploys on client request without manual Eitan involvement). At that point, re-evaluate Option C as the primary Site Bot pricing model — it creates the strongest moat (churn requires actively cancelling ongoing value) and aligns with the "bot IS the CMS" vision above.

### Growth Model
```
SEO/Content traffic
       ↓
Free Trial (limited bot)
       ↓
Mass Webinar Onboarding
       ↓
Paid Subscription
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

### Phase 1R — GEO/AIO Managed Service (Standalone Revenue Product)

> **A growing need for any business owner who cares about their organic presence.**
> As Google shifts to AI Overviews and answer-engine results, ranking alone is not enough — the business must *be the answer*. This is WAO's managed service for that gap.

**What it is:** A done-for-you monthly service. WAO pulls the client's Google Search Console data, identifies the top keyword opportunities that are one content addition away from being cited in AI Overviews, writes the Hebrew content (FAQ blocks, definition boxes, schema), sends it to the client for approval via WhatsApp, and verifies it landed on the site.

**The loop (continuous):**
```
GSC data → Pareto scoring + intent filter → Hebrew content (Tamar→Noa pipeline)
  → WhatsApp approval link → client action page (copy + paste instructions)
  → client marks done → automated verification crawler → next action surfaced
```

**Pricing tiers:**
| Tier | Price | Scope | Who implements |
|------|-------|-------|----------------|
| GEO Bot | ₪199/month | Automated loop: content written, action page, verify | You (self-serve) |
| Managed | ₪590/month | Full loop + WAO oversight, 1 revision per action, personal WhatsApp | You, guided by WAO |
| Pro | ₪1,290/month | Full loop + WAO implements directly (WordPress API / CMS access) | WAO |

*(Radar tier retired — GEO Bot replaces it at a lower price point with full automation.)*

**Right buyer:** content-ready SMBs with 30+ pages and existing GSC data (accountants, coaches, clinics, lawyers, architects). GEO Bot is NOT the right product for micro-SMBs on 5-page sites — Local Pack, not AI Overview, answers their queries. Micro-SMBs enter via Site Bot and add GEO Bot in month 3.

**Delivery model (first 5 clients — Wizard of Oz):**
- Manual GSC pull via `node scripts/gsc-pareto.mjs`
- Manual content generation via `node scripts/geo-generate-content.mjs`
- Manual WhatsApp send via Eitan's dashboard (`/geo/dashboard`)
- Automated from client's side: action page, copy buttons, mark-done, verification

**What's built (as of July 2026):**
- [x] Pareto engine with intent filter (positions 4–25, LLM scoring)
- [x] Tamar→Noa two-pass Hebrew content generation
- [x] Immutable approval log (`data/geo-logs/{clientId}/log.jsonl`)
- [x] Verification crawler (content fingerprint + JSON-LD schema check)
- [x] WhatsApp delivery (wa.me deep links, no Business API needed)
- [x] Eitan's send dashboard (`/geo/dashboard`)
- [x] Client-facing action page (`/geo/action/[actionId]`) — copy, placement, mark-done
- [x] Pilot client: retter.co.il (20 actions generated, pending first send)
- [ ] First complete cycle: send → client implements → verified
- [ ] Auth on dashboard + action pages before public deploy
- [ ] Genderized copy (currently hardcoded feminine for Hadas/retter)
- [ ] Self-serve GSC OAuth (for clients post-payment)

**Relationship to the bot:** Phase 1R IS GEO Bot v1, delivered Wizard-of-Oz. It proves the execute-verify pattern for the full suite. Every other bot follows the same loop.

---

### Foresight — 3-Month Ambitious Goals (living doc, re-read every 2-3 weeks)
Prepared by Lior 2026-07-06: generalized lead-magnet plays beyond the GEO Audit (AI-search-readiness scanner, GBP review-comparison, Ads-waste checker, AI-citation checker), what's beyond SEO/GEO/Ads scope (and what got cut and why), and where the AI capability curve actually flips something in this specific 90-day window. Includes a priority table and checkpoint schedule.
Artifact: https://claude.ai/code/artifact/a3b6983c-39bd-48bf-b4ca-480fa355c3a3

### Foresight — 1-Year Structural View (living doc, re-read quarterly)
Companion to the 3-month doc, different altitude: what has to be true each quarter (Q1 load-bearing facts → Q2 proof-driven positioning + the frozen specialist/agency fork decision point → Q3 scaling stress-test/WoZ ceiling → Q4 ARR-ceiling reality check + English go/no-go). Names the single-founder bottleneck bluntly, the 12-month AI-curve bet with an explicit fallback, and a 3-tier moat analysis (evidence base > Hebrew-native quality > switching costs — tools/content/pricing are NOT a moat).
Artifact: https://claude.ai/code/artifact/1dbfd8a3-4adf-4d0b-ae29-e00702723a09

### Phase 1 — MVP Bot (Next)

**Wedge decision (locked 2026-08-08, via Lior + Grok cross-check):** the first end-to-end flow built is **Flow B — the diagnosis→prioritized-plan→"continue"→execute loop** — not Site Bot, not Ads Bot. Rationale: it proves the core diagnose→approve→execute pattern every other bot inherits, at the lowest WoZ risk (no big-bang delivery to fail loudly on), and it's the cheapest way to grow the evidence-base moat. Site Bot and Ads Bot are **acquisition/volume** plays — sequenced *after* the loop is proven (trigger: 8–12 successful WoZ diagnosis loops), not proof plays. Do not conflate proof-flow with acquisition-flow.

**Flow B is segment-agnostic — two branches, not one:**
- **Content-ready SMB branch** (accountant, coach, clinic, lawyer, architect — existing site + GSC): GSC/GEO audit → Pareto content gaps → prioritized plan. ~80% built already; retter.co.il is the live pilot (20 actions generated, pending first send). **Immediate next action: close this loop before starting new ones** — one finished end-to-end cycle is worth more than five new starts.
- **No-website micro-SMB branch** (plumber, tutor, photographer — WAO's actual North-Star volume, per the 10,000-client target "from scratch or on top of existing assets"): anchor the diagnosis on **Google Business Profile / local presence**, not site+GSC (they have nothing to audit there). Diagnose GBP completeness, review gap vs. local competitors, Local Pack position → prioritized plan → "continue" → WAO executes step one manually. This branch is what keeps the evidence base built on the segment WAO actually needs to scale to, not just the segment that's easiest to prove on.

Both branches stay inside single-founder WoZ throughput — diagnosis + a plan, not autonomous execution.

**Risk-weighted sequencing within the wedge (added 2026-08-08, Lior + business-risk review):** the two branches carry very different risk. The content-ready/GEO branch is the strong bet (~70%+ odds as a proof vehicle — nearly built, retter.co.il is one closed loop from being real evidence) and should be run first and harder: close retter, then run 3–4 more GEO diagnoses. The no-website/GBP branch is a **probe, not a commitment** (~30% odds as a volume engine this quarter) — its diagnosis payload is thin (a business owner with no site usually already knows they're invisible; low information asymmetry means low perceived value), and it naturally funnels toward the exact big-bang Site Bot delivery already deferred as too risky in WoZ. Run it as 1–2 test clients only, with the first delivered step kept deliberately tiny (claim/optimize the GMB profile — never "here's your finished site"), to test whether the diagnosis creates real perceived value before scaling it. Do not let the no-website volume opportunity (real, but a Phase 2 question) preempt banking Phase 1 proof on the path that's already built.

**Competitive note:** aggressive GEO/AIO market hype threatens content-ready branch **acquisition cost only** (competing for the same keywords/attention) — not product quality, delivery, or the retter.co.il relationship. Read on the hype itself (Lior, 2026-08-08): a solo founder cannot out-spend or out-shout a hyped category, so treat it as **crowded/noisy, not a closing window** — the correct response is not to retreat from GEO, but to stop contesting it *publicly*.

**Resulting acquisition-channel split:** market the **GBP/no-website branch publicly** as WAO's first-touch face — it's the uncontested lane, hype doesn't touch it. Pursue the **GEO/content-ready branch quietly** — warm intros, direct outreach, referral, the retter.co.il case study — never public ad/content spend competing on "GEO"/"AI Overview optimization" keywords, where funded players will always outbid a single founder. This is an acquisition-channel decision only; it does not change proof sequencing — retter still closes first, GEO diagnoses still run before GBP scales, per above.

**Unresolved design fork, flagged as decisive (Lior):** conversion odds for this wedge (~45–55%, vs. ~80% for proving the loop as a demonstration) hinge almost entirely on one unanswered question — what does the client pay the moment a diagnosis lands and they feel the value, not on diagnosis quality. Resolve this pricing/conversion mechanic before the 5–7 WoZ pilots start.

**Israeli-market verification (Yonatan, web-verified 2026-08-08):** confirmed — GEO/AIO is a real, current, dated Hebrew-language agency trend (8–10+ established Israeli SEO agencies now run live GEO service pages, mainstream press coverage e.g. Maariv). But it sharpens the read favorably: visible competitors are priced ₪3,000–9,500/mo (full-service agency model, sales-call-driven) — 15–48x WAO's ₪199/mo — a different buyer journey than a self-serve diagnosis product, and likely a different customer (WAO's content-ready SMB target is too small for these agencies to bother quoting). Hebrew AI Overviews independently confirmed live since Google I/O May 2025 (~15 months runway), so the GEO premise holds in Hebrew search. **Two open follow-ups, medium priority, not blocking:** (1) ppc-strategist (Dror) to check actual CPC data on GEO-related Hebrew keywords before assuming paid-search cannibalization is a real cost, not just theoretical; (2) a GSC/manual AI-Overview trigger-rate sample across the five target verticals' local-intent queries — Hebrew AI Overviews are confirmed to *exist*, but how often they actually *fire* for WAO's target query types is still unverified and is the number that would validate near-term GEO-branch ROI.

- [ ] Define the bot's first 3 "complete flows" end-to-end
  - **Site Bot MVP** *(was Flow A)*: New business onboarding (domain → website → GMB → first ad) — **deferred to acquisition-scale, after Flow B is proven**
  - **Flow B (the wedge): existing-business audit OR no-website visibility diagnosis → priority action plan** — build this first
  - **Ads Bot MVP** *(was Flow C)*: Google Ads setup and first campaign launch ← **before marking done: run `node scripts/test-cf-deploy.mjs` to verify Cloudflare Pages deploy + subdomain DNS end-to-end** — deferred, same reason as Site Bot
- [ ] Build the approval/execution loop ("continue" UX)
- [ ] Connect first platform integrations (Domain registrar + Google Ads API)
- [ ] **Next concrete mission:** define the two-branch diagnosis template (GSC/GEO branch + GBP/local-presence branch), then run 5–7 WoZ diagnoses over 3–4 weeks to seed the evidence base. Open forks to decide before routing: diagnosis pricing (free lead-magnet vs. paid vs. bundled into GEO Bot's first month) and the segment split of the first cohort.

### Phase 1 — Trust & Funnel (Parallel to Bot Build)

> **Priority course: "Agentic Website Building + SEO in the Age of AI"**
> This is the highest-priority content mission — even more foundational than the Google Ads course.
>
> **Why:** It targets the exact SMB audience the bot is built for. Someone who watches this course and builds their site with AI guidance is experiencing — manually — the exact flow the bot will automate for them. The course is simultaneously:
> - The trust layer (demonstrates WAO's expertise)
> - The funnel top (drives the right audience)
> - A live prototype of Bot Flow A (domain → website → SEO)

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
- [ ] Run mass webinar onboarding
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
*Status:* **DEFERRED** (as of 2026-08-09, Lior's mission-planner assessment) — not a Phase 1 priority. Current wedge (GEO Bot, retter loop, Meta cold-traffic test) doesn't depend on desktop call attribution; Ads Bot itself (the eventual consumer of this capability) is still deferred behind Flow-B proof.
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
