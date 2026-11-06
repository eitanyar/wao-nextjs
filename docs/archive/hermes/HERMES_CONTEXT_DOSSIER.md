# Hermes Context Dossier — Complete Work History & Current State

## Project Overview
WAO is an AI-powered Google Ads automation platform for Israeli small businesses.
Core product: AI bot suite that manages clients' entire digital presence — from domain purchase to ad campaign optimization.

**North Star:** 10,000 Israeli small business owners using WAO's AI bot to run digital marketing without needing technical knowledge.

## Product Architecture — The Google Bot Suite

| Bot | Price | Target |
|-----|-------|--------|
| **GEO Bot** | ₪199/mo | Content-ready SMBs (accountants, coaches, clinics, lawyers, architects) with 30+ pages |
| **Ads Bot** | ₪249/mo | Google Ads onboarding → campaign management → monthly recommendations |
| **Content Bot** | ₪490/mo | SEO content plan → keyword cluster → article pipeline |
| **Site Bot** | ₪1,490–1,990 one-time | Domain → Next.js scaffold → deployed → SEO-ready (plumbers, tutors, photographers) |

**Pricing Model:** ₪9.90 trial (once per client) → ₪249/month after month 1.

**Buyer Routing:**
- **Micro-SMB** (plumber, tutor, photographer): Site Bot → GMB Bot ₪149 (month 1) → Content Bot ₪490 (month 6) → GEO Bot ₪199 (when ≥15 pages)
- **Content-ready SMB**: GEO Bot directly

**Interaction Model:** Voice First — the bot is operated primarily by voice, keyboard is fallback only.

**Infrastructure:** WAO-Managed via Client OAuth — clients own their free-tier accounts (Cloudflare, GitHub, Google Ads, etc.), WAO operates via OAuth tokens. 10,000 clients = 10,000 separate accounts.

## Current State (as of 2026-08-11)
- ✅ Full onboarding UI restored with 4 delivery model cards
- ✅ Tightened Hebrew copy with pace→lead connection moments committed
- ✅ Build passes, ad preview works
- ✅ Tag: `stable-onboarding-copy` marks the stable checkpoint
- ✅ Branch: `hermes-migration` (ahead of origin by 2 commits)

## Recent Work Completed

### 2026-08-11 — Onboarding Copy Tightening (waocopy)
- Rewrote all Hebrew bot turns in `src/lib/bot/prompts.ts` and `src/app/api/bot/route.ts`
- Added pace→lead connection library (hands-on, creative, human-connection, emergency categories)
- All sentences ≤15 words, singular male, no emoji in speech
- Committed: `8000cac` — "Restore full onboarding UI + tightened pace→lead copy"

### 2026-08-10 — Audit and Rewrite Onboarding Bot Hebrew (waocopy)
- Task ID: 2026-08-10_001
- Rewrote onboarding flow to natural Israeli Hebrew
- Added listening moments after business name, service type, location
- Replaced robotic phrasing ("אנא הכנס" → "איך קוראים לעסק שלך?")
- Status: Completed and verified

### 2026-08-09 — DNI Add-on, Live-Call CTA, Mobile UX Audit
**DNI (desktop call-attribution) add-on — full decision chain closed:**
- Vendor: WhatConverts ($10/number + $0.045/min)
- Pricing: ₪49/month, capped at ~150 minutes, metered overage
- High-call-frequency verticals hard-excluded
- Upsell timing: free digest day-1, paid offer after month 1

**Live-call booking CTA shipped on `/geo/audit`:**
- `src/components/CallBookingCTA.tsx` config-driven off `NEXT_PUBLIC_CALENDLY_URL`
- Fires `call_scheduled` dataLayer event with full attribution
- Falls back to click-to-reveal phone if env var unset

**Meta cold-traffic campaign copy finalized:**
- 3 QA'd variants in `meta-ad-copy-final.md`
- NOT launched — Meta Pixel/Conversions API not wired yet
- Reminder set for 2026-08-10 09:00 to hand Eitan-Dev the Pixel ID

**Mobile UX audit (Maya's 5-item list) — built, Roni verifying:**
- `LandingPage.tsx` — old dual-CTA replaced with one fixed minimal header
- Route-group split — new `src/app/(product)/layout.tsx`
- Two `decodeURIComponent` bugs fixed in `ActionHeader.tsx` and `PlacementBlock.tsx`
- `StickyActionIndicator.tsx` added (mobile scroll-triggered CTA)
- `/geo/signup` inline validation
- `.next` cache-corruption fix (two concurrent dev servers)

### 2026-08-07 — Bot-suite Dev-Parity Sprint (commits `56ee16f`..`ce6119a`)
**Goal:** Every lead magnet self-serve, zero Eitan in the loop.

- **Ads Bot fail-closed fix** (`56ee16f`) — `GET /api/checkout/callback` signature verification now unconditional in live mode
- **GEO Bot self-serve signup + checkout + GSC OAuth** (`d92cf2f`) — New `/geo/signup` → mock checkout → self-serve GSC OAuth
- **GMB Bot built, gate overridden** (`4862f53`) — Full WoZ approval pipeline, read-only NAP diagnostics, GBP API client built
- **Build blocker fixed** (`ce6119a`) — Turbopack workspace root issue, `turbopack.root` pinned, `venv/` relocated

### 2026-08-05 — Campaign Enumeration Fix + Search-Term Cleanup
**Campaign enumeration fix** (`213c926`):
- Replaced single-campaign binding with `enumerateEnabledCampaigns(customerId)`
- Blended CPL is display-only; gating fires per-campaign
- Wired into operator-task route, weekly-digest-batch, admin/review UI

**Search-term cleanup scoring engine** (`a695066`):
- Intent-classification dictionaries, scoring logic, GAQL fetch layer
- **Live rollout explicitly frozen** — needs reconciliation pass signed off by Eitan

## Open Tasks & Blocked Items

### 1. Reconciliation Pass (BLOCKING — needs Eitan sign-off)
**Location:** `docs/specs/priority-3-search-term-cleanup-scoring.md` §8.6

Before search-term cleanup can execute live mutations, Eitan must:
1. **AAAsada** — re-run digest/CPL across all 5 enumerated campaigns, confirm blended ~₪70/lead
2. **Retter** — confirm which campaign is bound (expected: brand), enumerate rest, confirm true blended CPL is higher than dashboard shows
3. Both reconciliations reviewed and signed off before priority-3 goes live

### 2. Payment Provider Decision (OPEN)
**Status:** Outreach to Payme.io and Grow (Meshulam) sent on 2026-08-08
**Action:** Check first thing if either replied
**Reference:** `docs/specs/subscription-billing-provider-decision.md`

### 3. GrooveFunnels/Nurture-Email Evaluation (BLOCKED — needs Eitan)
**Three account-level checks only Eitan can do:**
1. BYO-SMTP tier availability
2. Real API vs. Zapier-only
3. DPA availability

**Status:** Not actioned since 2026-08-09

### 4. Meta Pixel/Conversions API Wiring (OPEN)
**Reminder set:** 2026-08-10 09:00 to hand Eitan-Dev the Pixel ID
**Action needed:** Decide consent-mode/CookieBanner gating approach

### 5. GBP API Credentials (OPEN)
**Status:** Smoke test reports every scope `skipped-no-credentials`
**Action:** Source live credentials from Google

### 6. GSC OAuth Redirect URI (OPEN)
**Manual step needed:** Register `{origin}/api/geo/gsc/oauth/callback` as Authorized redirect URI in Google Cloud Console (localhost + prod)

### 7. YAAD_PASSP (OPEN)
**Status:** Still unset, needs sourcing from Hyp support
**Reference:** `docs/specs/priority-4-live-payment-integration.md` §1a

### 8. Task 002 v2 — waocopy: Pace→Lead Leadership Pass (PENDING)
**Location:** `handoff/pending/2026-08-11_002_waocopy_joining-leadership-pass.md`
**Goal:** Higher-quality pass adding deeper pace→lead connection layer
**Priority:** High

## Strategic Decisions Made

### Pricing & Chargeback Defense (2026-08-07)
**Verdict:** DROP pursuing 3DS, DEFER flat-₪99 alternative
- 3DS doesn't cover recurring charges regardless of price structure
- Flat ₪99 cuts ARPU ~60% vs ₪249 anchor, raises entry friction 10x
- Real chargeback defense: expectation-consistency (month-2 reminder email, "WAO" statement descriptor, immutable consent log)

**Recommended path:** Ship ₪9.90→₪249 to pilot cohort only
- Instrument per-user variable cost P95 before scaling
- Instrument month-2 dispute/decline rate
- Pre-commit dispute-rate switch threshold before pilot runs

### Retter GEO Cycle (2026-08-03)
**Status:** On hold ~1 month — Retter migrating to different CMS on their own timeline
**Re-check:** Around 2026-09-03
**Impact:** Freezes 3-Month Foresight priority-#1 (close Retter's send→implement→verify cycle)

### Google Ads Pilot Outreach (2026-08-03)
**Status:** Active top founder-hours lane
**Plan:** `docs/specs/grade-a-outreach-playbook.md` (Grade-A archetypes, Tier 1/2 channel map, cadence, free GBP review-comparison magnet as opener)
**Tier-1 Week 1:** Cleared to start — no remaining gate

## Scored & Gated Feature Backlog (2026-08-07)
Three-bot brainstorm (Site 25 / Ads 21 / GEO 14 ideas) scored `(Impact×Urgency)÷Effort`
**Full board:** https://claude.ai/code/artifact/ad18631f-d8e1-40c8-b31e-c713cdf5c72f

**Protected window:** Pilot outreach + AAAsada/Retter reconciliation own the window
**Top synthesized idea:** Readiness Gate (scores prospect for right bot AND refuses onboarding until lead-tracking provable)
**SHIPPED 2026-08-07:** Places-client refactor, Phase 1 routing CLI, Phase 2 LTPC admin gate, Priority-3 Part A (commits `ab5d4ad`, `9504688`, `3b6da2b`)

## Agent Architecture

1. **waostrategy** (Claude Opus 4.8) — Plans, specs, architecture. Does NOT write code.
2. **waoengineer** (Qwen Coder Next) — Executes code implementation, tests, builds.
3. **waocopy** (Qwen 3.8 Max) — Content: landing pages, bot scripts, voiceover.
4. **waoverifier-app** (Qwen 3 VL Plus) — Runtime QA, returns PASS/FAIL/BLOCKED.
5. **waoverifier-media** (Qwen 3.5 Omni Plus) — Video/audio QA, returns PASS/FAIL/BLOCKED.

## Key Files
- `src/lib/bot/prompts.ts` — Live path system prompt + question library
- `src/app/api/bot/route.ts` — Simulation path + turn logic
- `src/lib/bot/delivery-model.ts` — 4 delivery model cards
- `src/app/(app)/google-ads/onboarding/page.tsx` — Full UI
- `AGENTS.md` — Agent configuration and model configs
- `CLAUDE_TO_HERMES_HANDOFF.md` — Handoff protocol
- `STATUS.md` — Detailed work history and open loops
- `VISION.md` — Product vision and architecture

## Hard Rules
- All agent responses MUST be in English (Hebrew only in content being created)
- Bot turns must update BOTH prompts.ts AND route.ts
- Sentences ≤15 words for TTS compatibility
- Singular male address always
- No emoji in spoken text
- Never push/deploy directly — Eitan triggers deploy.sh manually

## Git State
- Branch: `hermes-migration`
- Latest commit: `8000cac` — Restore full onboarding UI + tightened pace→lead copy
- Stable tag: `stable-onboarding-copy`
- Remote: origin/hermes-migration (not yet pushed)

## Next Steps
1. Execute Task 002 v2 (waocopy leadership pass)
2. Verify build passes
3. Move handoff file to completed/
4. Address reconciliation pass (needs Eitan sign-off)
5. Check payment provider responses
6. Push branch to origin
