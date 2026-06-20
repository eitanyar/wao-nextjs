# WAO — Vision Document
*Last updated: June 2026*

---

## The North Star (1 Year from Now)

> **10,000 Israeli small business owners** are using WAO's AI bot to run their digital marketing — from scratch or on top of existing assets — without needing to understand how any of it works.
>
> The bot has full execution access. The business owner approves. The bot does the work.
>
> WAO is simultaneously opening to English-speaking markets and Eitan is operating as a Visionary, with agent teams advancing the product to its next phase.

---

## The Product

**WAO Bot = AI CMO for small businesses.**

It is not a chatbot that teaches. It is not a course. It is an AI agent that:

1. **Diagnoses** — Audits existing digital assets (website, ads, GMB, domain, social) OR starts from zero
2. **Educates simply** — Explains each decision in plain language a non-expert understands
3. **Gets approval** — Requires only a "continue" from the owner
4. **Executes fully** — Buys the domain, sets the DNS, launches the campaign, optimizes the ad
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
- **Not decided yet — by design.**
- A free/limited Trial will be used to discover what users desperately want unlocked.
- That friction point becomes the pricing model.
- Goal for Year 1: reach break-even, then grow.
- Likely direction: subscription (SaaS) + tiered access by capability.

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

### Phase 1 — MVP Bot (Next)
- [ ] Define the bot's first 3 "complete flows" end-to-end
  - Flow A: New business onboarding (domain → website → GMB → first ad)
  - Flow B: Existing business audit → priority action plan
  - Flow C: Google Ads setup and first campaign launch
- [ ] Build the approval/execution loop ("continue" UX)
- [ ] Connect first platform integrations (Domain registrar + Google Ads API)

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


### Phase 2 — Trial & Validation
- [ ] Launch free limited trial
- [ ] Run mass webinar onboarding
- [ ] Identify the pricing trigger (what do users want unlocked?)

### Phase 3 — Scale
- [ ] Open to English-speaking markets
- [ ] Eitan operates as Visionary only — agent teams run execution

### Phase 4 — Content Automation (2027)
- [ ] Business owner supplies raw material: voice note, photos, short phone video
- [ ] Bot generates a finished ad or organic post (script → voiceover → video → edit)
- [ ] Owner reviews and approves
- [ ] Bot publishes simultaneously across all connected platforms (YouTube, Meta, TikTok, Spotify)
- [ ] WAO's internal course pipeline (Gil → Noa → ElevenLabs → MoviePy → YouTube API) becomes the prototype for this — it already works for WAO's own content

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
