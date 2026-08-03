# Grade-A Prospect Outreach Playbook

**Author:** Amit (distribution-strategist), routed via Adam · **Date:** 2026-08-03
**Status:** Active — Tier 1 Week 1 cleared to start
**Origin:** Mission-planning session with Eitan ("lior-mission-doubts") — priorities reordered after
Retter's GEO cycle went on hold (~1 month, external, client-side CMS migration). Google Ads pilot
outreach promoted to the top founder-hours lane for this window.
**Related:** `VISION.md` (Gate 3 durability screen, 3-Month Foresight artifact, magnet 1.3),
`docs/specs/pilot-client-gating.md` (the 8-name shortlist this plan targets),
`data/batch/{plumber,electrician,locksmith,ac-repair,mechanic,physiotherapist,aesthetic-doctor}/`
(existing LP demo assets used as proof-of-work in outreach).

---

## 0. Grade-A prospect archetypes (Lior, mission-planner)

1. **Solo emergency-trade operator** — plumber/electrician/locksmith/AC-repair, 5–15 years, has a
   Google Business Profile with real reviews but no paid ads, decides alone, ₪2,000/month trial
   spend isn't a stretch. Highest-confidence archetype: buyer urgency on the client's own side means
   a fast trial-to-proof cycle.
2. **Independent auto-repair garage owner** — not a franchise, 1–2 mechanics, owner signs his own
   checks, urgent local demand.
3. **Independent clinic owner-practitioner** — physiotherapist, dentist, dermatologist,
   aesthetic-medicine doctor, single-location. Strongest margin/LTV of the three, slightly slower
   buyer cycle (on the practitioner's own patients' side, not the practitioner's decision speed).

Grade B (workable, real friction) and Grade C (avoid for now — thin-margin/high-failure-rate
businesses like catering, or multi-partner/franchise businesses with approval-layer friction) are
documented in session history, not repeated here — Grade A is the active target.

---

## 1. Channel map — Tier 1 (start now, zero list-building)

| Channel | Risk grade | Owner | Notes |
|---|---|---|---|
| **1a — Referral / own network** | None | Eitan | Direct ask to Eitan's network + existing WAO clients ("who do you know in [trade]"). Not "advertisement" under Communications Law §30A — personal/referred relationship, not unsolicited commercial messaging. |
| **1b — Vertical Facebook groups** | Low, conditional | Eitan | Join closed Israeli trade groups (אינסטלטורים ישראל, חשמלאים ישראל, מוסכניקים, clinic-practice groups). **Value-post only — never cold-DM.** Groups explicitly ban solicitation; violating this burns the channel. |
| **1c — In-person visit** | None | Eitan | Physical visit, GBP printout/screenshot in hand. Zero compliance risk, strongest close mechanism for a fast-deciding solo owner. |
| **1c — Phone call** | Medium | Eitan, gated | Israel's Do-Not-Call registry (2023 law, fines to ₪45,000) creates ambiguity when a tradesman's business line doubles as his personal mobile. **Gated behind articulation-trainer practice (see §4) — not started yet.** |

## Tier 2 (needs sign-off before building)

| Channel | Risk grade | Notes |
|---|---|---|
| **GBP-sourced list → cold B2B email** | Medium | Via official Google Places API only (never scrape Maps — ToS breach). Individual sends, business-only addresses, full sender ID, working unsubscribe, dedicated subdomain, ~30–50/day cap. Medium overall because sole-proprietor emails can count as personal data under PPL Amendment 13 (Aug 2025). **Needs Eitan's explicit sign-off before any list is built.** |

**Rejected outright, no ambiguity:** cold WhatsApp blasts (violates Business Platform opt-in policy),
bulk SMS (no B2B carve-out under §30A), purchased contact lists (no source-of-record), cold DMs into
FB groups (violates group rules, burns channel trust).

---

## 2. The free GBP review-comparison magnet — the opener

**Decision (Lior, 2026-08-03):** GMB Bot's paid product (₪149/mo) and any pricing-model change
(free-trial, one-time-annual) are **DEFERRED** — not offered until a real prospect asks for it.
Instead, WAO opens with a **free GBP review-comparison report** — magnet "1.3" from the 3-Month
Foresight doc (`VISION.md` line 254) — reusing the review-analysis capability already named there.

**Funnel ladder, as it actually exists today:**

> Free GBP magnet (opener, zero monetization) → live "what's next" conversation, decided
> per-prospect → **Ads ₪2,000 trial is the only live monetized offer right now.** If a prospect asks
> for review-management help specifically, the honest answer is "we're building that, let me come
> back to you" — not a pitch. GMB Bot pricing gets decided by the first prospect who actually asks
> for it, not guessed in advance.

**Cadence placement — upgrades Touch 1/2, does not add a touch:**

| Touch | Content |
|---|---|
| 1 | If the report is ready: hand over the actual comparison (rating/review-count/recent-pace vs. 3 named local competitors) as the opener. If not ready: the original verbal callout ("you've got X reviews, Y stars, no ads running") — zero build required, carries the touch either way. |
| 2 | Fallback slot for the report if it wasn't ready at Touch 1; otherwise collapses into the "what's next" conversation. |
| 3 | Concrete ask — Ads trial, if the report showed a genuine visibility/demand gap (not a reviews-only gap — mismatched pitch, undercuts credibility). |

### Build scope (nextjs-engineer, 2026-08-03) — approved field set

**Critical finding:** review-response-rate is **not buildable** from the public Places API — that
data only exists in the Google Business Profile (My Business) API, which requires OAuth ownership of
the specific listing. WAO cannot pull it for competitors it doesn't manage.

**Approved trimmed field set** (Eitan sign-off, 2026-08-03):
- Rating (1–5)
- Total review count
- "Recent review pace" proxy — count of the ≤5 visible reviews (Places API's cap) falling in the
  last 30/60/90 days, **explicitly labeled as a small-sample estimate, not true velocity**

Response-rate is cut from the comparison entirely — the outreach script must never claim it.

**Minimal generation path:**
1. Eitan enables Places API (New) on WAO's GCP project, issues/restricts an API key (~15 min,
   console/billing access, not code).
2. New script `scripts/gbp-comparison-report.mjs`: Text Search target business → Place Details for
   rating/count/reviews → Text Search `"{category} in {city}"` for top 3 competitors → Place Details
   each → compute recent-pace proxy → format as a Hebrew, RTL-safe, WhatsApp-ready text block.
3. No new route/component/dashboard — Eitan runs the script per-prospect and pastes into outreach.

**Effort:** ~2.5–3.5 hours net-new (first-time Places API client — no prior Places integration
exists in the codebase despite an earlier stale grep hit suggesting otherwise).

---

## 3. Cadence — Tier 1 detailed (Amit)

**Week 1:** 1a — 8 individual referral messages to the pilot shortlist (`pilot-client-gating.md`).
1b — join 3 FB groups, observe only, no posting. 1c — 2 in-person visits.
**Weeks 2–4:** ramp to steady-state — ~5 referral touches + 1–2 group posts + 2–3 visits/week.
**Week 4 checkpoint:** tally cumulative touches (~25–35) against trial signups.
**Week 5 gate — cold-calling:** does not start until the articulation trainer (§4) exists
(M1–M3 shipped, Roni-verified) **and** Eitan clears 10 T1-track practice sessions covering both the
cold-open (W1–2) and objection-handling (W8) curriculum. If unmet, phone waits; 1a/1b/1c-in-person
keep running regardless.

**Tier-1 "done" gate:** don't evaluate before 6–8 weeks of real execution (~50–70 cumulative
touches). Target: **2–4 admitted pilot clients** (cleared the scorecard, ₪49 paid, onboarding
booked); floor that still counts as "working": 1 fully onboarded + 1–2 in active pipeline. Zero
admitted after 50+ touches is the signal to re-diagnose the offer/channel, not push more volume.

**Pricing override — pilot-only (Lior, 2026-08-03):** this batch charges **₪49** for the first
month, not VISION.md's standing ₪9.90 setup fee. Rationale: the free GBP magnet already crosses the
$0→paid threshold before this ask lands, both numbers are rounding error against the client's
₪2,000/month media spend, and ₪49 doubles as a stronger unserious-lead filter for a warm, referred
shortlist (VISION.md's ₪9.90 was tuned for cold self-serve traffic, where "feels like not a
purchase" is the goal — wrong context here). **Scope: this Tier-1 warm-shortlist batch only** —
VISION.md's ₪9.90→₪249 model is unchanged for cold/self-serve traffic. Whether ₪49 becomes the new
standing number, or stays a pilot-only override, is an open decision to revisit after cohort 1 —
not decided yet.

**Tier 2 go/no-go:** only greenlit if Tier 1 hits its personal touch-ceiling and is still short on
volume — not if leads come in but don't convert (that's a funnel/pricing problem, not a Tier-2
volume problem).

---

## 4. Articulation-trainer dependency (cold-calling gate)

Eitan is not comfortable cold-calling yet. He will practice via WAO's own articulation-training bot
(`docs/specs/articulation-trainer.md` — currently SPEC only, zero code) before dialing live. Track
T1 ("WAO funnel selling") is designed exactly for this: discovery, objection-handling, pricing,
close, referral conversations.

**Sequencing call:** don't block Tier-1 launch on the trainer — 1a/1b/1c-in-person need none of it.
Trainer build (M1–M3) slots onto Eitan-Dev's queue in parallel, targeted for completion by end of
Week 4 so the Week 5 phone gate is reachable on schedule. If the trainer build slips, cold-calling
slips with it; everything else keeps moving.

---

## 5. Open items

- **Tier 2 build**, if greenlit at the Week 6–8 checkpoint: Amit finalizes the compliance spec →
  Eitan sign-off on medium-risk parts → Tamar writes copy → Eitan-Dev builds with caps/logging
  hard-coded → Roni verifies enforcement at runtime → list built, sequence armed.
- **GMB Bot pricing** (₪149/mo vs. free-trial vs. one-time-annual): parked until a real prospect
  asks "what's next" after the free magnet. Not to be decided speculatively — same category of
  decision as the ₪9.90→₪249 trial-jump model, belongs in a dedicated monetization pass if pursued.
- **Dentist-specific LP asset**: doesn't exist yet — `aesthetic-doctor` is the closest built asset
  for the clinic archetype. Add to Tamar's backlog if the clinic sub-track scales past a pilot
  handful.
