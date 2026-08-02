# Pilot Client Gating — Phase 1.5 Admission Framework

**Origin:** Lior (mission-planner), 2026-08-01 reassessment — the Phase 1.5 pilot cohort gate
(`PROGRESS.md`, still 0/10) is the single blocker between Phase 1 and Phase 2. Worst outcome:
filling those 10 slots with clients who structurally can't win, falsifying the ₪249/mo
hypothesis for the wrong reason. This scorecard admits only candidates where campaign success
is mostly a function of WAO's execution quality, not the client's structural position.

Signal #3 (budget floor) revised 2026-08-01 by Dror after Eitan flagged that a flat ₪1,500/mo
floor wrongly excludes legitimate high-CPC-niche candidates — replaced with a CPC-relative rule.

## The 8 signals — score 0/1/2 each unless marked hard-fail

1. **Demand exists** — combined monthly Hebrew search volume for core query × service area
   (Keyword Planner). 0 = &lt;200/mo, 1 = 200-500, 2 = &gt;500.
2. **Unit economics clear the bar** — expected CPA (estimated CPC ÷ ~5% LP conversion) vs.
   average job/client value. 2 = CPA ≤ 1/5 of job value, 1 = ≤ 1/3, 0 = worse.
3. **Budget floor (CPC-relative) — HARD FAIL if below.** See procedure below. Replaces the
   original flat ₪1,500/mo rule.
4. **Reputation floor** — GMB rating ≥4.0 with ≥10 reviews (2), 4.0+ with fewer (1), below 4.0
   or no profile (0). A 0 isn't permanent — route to a GMB/review push before ads, a real
   upsell path, not a decline.
5. **Capacity to absorb leads** — answers same-day, can take new work within ~2 weeks. **HARD
   FAIL if no** — leads to voicemail become "the ads don't work."
6. **Auction sanity** — manual SERP check on the core query: local competitors (2) or
   national-aggregator-dominated (0)?
7. **Defined service radius** — tight geo (2) vs. nationwide-generic (0).
8. **AI-resistance tier** — Tier 1 (physical/licensed trades) = 2, Tier 2 (GEO Bot content-ready
   verticals) = 1, Tier 3 (coaches/generic consultants/tutors, deprioritized) = 0.

**Admission rule:** ≥12/16 with zero hard-fails → pilot cohort. 9-11 → conditional (fix the
weak signal first, usually reviews or budget). Below 9 → decline or route to Site Bot only.

---

## Signal #3 detail — CPC-relative budget floor

**Rule:** the proposed monthly budget must buy roughly **50-75 clicks in month one** at the
candidate's actual niche CPC — a viability screen (catches a fatal zero-lead/broken-LP miss),
not a claim of statistical significance or Smart-Bidding readiness (Google's own Target CPA
bar needs 15 conversions/30 days minimum, 30+ recommended — a separate, later gate, not this
one; don't conflate the two).

### Procedure (&lt;15 min/candidate, no live API needed)
1. Identify the candidate's single core commercial query (e.g. "אינסטלטור בתל אביב", not
   long-tail).
2. Look up estimated CPC in Google Keyword Planner (free, no spend required), or fall back to
   the band table below if unavailable.
3. Multiply that CPC by 50 and by 75 → soft floor / comfortable floor.
4. Compare to proposed budget: ≥75-click number = pass; between soft/comfortable = conditional
   (flag for narrower scope or longer ramp); &lt;50-click number = **hard fail**.
5. If using the band table instead of a live Keyword Planner check, flag the candidate file as
   "band estimate, not live check" for revisit before Phase 2.

### Per-vertical / per-band CPC (Israel, ₪ — verified 2026-08-01 against Israeli PPC-agency
2026 publications; no authoritative Israel-localized Keyword-Planner-grade benchmark is
public — re-verify every 2-3 months, and always prefer a live per-candidate check over this
table when they disagree)

| Band | CPC (₪) | Tier 1 | Tier 2 |
|---|---|---|---|
| A — lower-competition local | 8-15 | pest control, gardeners, appliance repair | — |
| B — standard urgent/home-service | 15-25 | plumbers, electricians, locksmiths (routine), garage/auto repair, HVAC/aircon | accountants, architects |
| C — high-ticket/competitive | 25-40 | movers, renovation contractors & handymen | dental/medical/physio (up to ₪100 on implant/ortho/cosmetic) |
| D — high-competition professional | — | — | lawyers (₪35-70 general; PI/criminal ₪70-90+) |

### Monthly budget floors (band midpoint × 50 / 75 clicks)

| Band | Soft floor (50 clicks) | Comfortable floor (75 clicks) |
|---|---|---|
| A | ₪550 | ₪825 |
| B | ₪1,000 | ₪1,500 |
| C | ₪1,600 | ₪2,400 |
| Dental/medical | ₪1,750 | ₪2,625 |
| Lawyers (general) | ₪2,500 | ₪3,750 |
| Lawyers (PI/criminal) | ₪3,750+ | ₪6,000+ |

Note: Google's new-account credit threshold (~₪1,500 spend) is a coincidental promotional
number, unrelated to this floor — do not conflate the two.

### Verticals flagged as impractical for the pilot cohort right now
- **PI/criminal-defense lawyers** — ₪3,750-6,000+/mo floor is unrealistic for a first-time
  pilot client with no case studies yet (chicken-and-egg). Keep general-practice lawyers
  (family/civil/contracts, lower end of the ₪35-70 range) active in Tier 2; de-prioritize
  PI/criminal specifically until WAO has proof points that shorten the trust gap.
- **Cosmetic/implant dental & orthodontics** — same risk (up to ₪100/click). Keep general
  dental/physio in the pool; flag high-ticket cosmetic-dental candidates the same way.
- Everything else in Tier 1 and the rest of Tier 2 clears the floor within WAO's expected pilot
  budget range (₪550-2,625/mo) — no further exclusions on CPC grounds.

---

## Open items
- Re-score the existing `data/clients/` candidates (aasada, ajudaica, merlo) against this full
  8-signal framework — not yet done.
- Decide whether to formalize a separate later "Smart-Bidding-ready" gate (30-conversion
  Google bar), distinct from this admission-viability screen, so the two never get conflated
  when scoring a candidate.
- No named candidate yet exists for pilot client #1 — this framework makes acquisition a
  checklist, not an intuition call, but doesn't answer who to run it against first.
