# Ads Bot — Phase-2 volume reality + Google new-advertiser credit (Israel)

Date: 2026-11-12 · Owner: Dror (ppc-strategist) · Read-only: no code, no `data/clients/` writes.
Amends: `docs/specs/ads-bot-phase2-auto-graduation-2026-11-12.md` (§3, §4, §5.1, §10 step 5/7).
(Saved by Adam from Dror's hand-back; his tools could not create files.)

**Verification status.** Sources marked "fetched 2026-11-12, this run" were read during this work.
Sources marked "carried, 2026-11-12" were verified earlier today (Dror credit review; Adam re-fetch)
but could not be re-fetched in this run because of a tool rate limit. **The Partner-offer page
(answer/15329625) must be re-fetched and quoted verbatim before Tamar writes the credit lines.**

---

## 1. Can a ₪1,500/month account reach the phase-2 thresholds?

### 1.1 Inputs

| Input | Value used | Source / status |
|---|---|---|
| Budget | ₪1,500/mo ≈ ₪50/day | Ads Bot minimum |
| Phase-1 CPC cap | ₪15 | `create-campaign/route.ts:591-597` |
| US home-services CPC | Plumbing $8.67, AC $8.94, heating $7.92, pest $6.55 (LocaliQ, data May 2020–Jun 2021, page updated 23 Feb 2026); home services $7.85, locksmith $6.20 (Webtonic citing LocaliQ, 2026); plumbing $9.39, HVAC $9.49 (Click Vision citing CallRail) | Fetched/searched 2026-11-12. Secondary, US-only |
| US cross-industry 2026 | Average CPC $5.42; CVR ~8.2% (WordStream/LocaliQ 2026 report, as summarised by Shopifreaks) | Search result 2026-11-12; full report not read |
| US home-services CVR | ~10% average; plumbing ~15.6%, HVAC ~15.1% (Click Vision/CallRail); 8–15% for good plumbing LPs (vendor) | Search 2026-11-12, secondary |
| US home-services CPL | Plumbing $48.91, AC $55.15 (LocaliQ); blended $30–120 by trade/market | Same |
| Israeli trade CPCs | **No credible published Israeli benchmark found** (Hebrew search 2026-11-12) | Gap; assumption below |
| WAO own data | Kosher catering ₪69.51 and NLP college ₪29.47 per Google Ads conversion (`all_conversions`, blended, 30 days to mid-Aug 2026) | `docs/reviews/google-ads-price-anchor-cpl-proof-dror-2026-11-12.md`. Not Ads Bot, not trades, not verified leads. No client digest files with lead counts exist in `data/clients/` |

**What our own data proves.** These CPLs count every primary conversion action (spec F7), and Eitan has disowned one of them. They are an upper bound on counted conversions, not a verified-lead rate, and not usable as a forecast.

**Assumptions (stated, not verified):**
- **A1 Israeli CPC:** effective average ₪6–15 (US trades ~$6–9.5; Israeli auctions thinner; Phase 1 caps bids at ₪15).
- **A2 Lead rate:** 8–15% of clicks produce a form, call tap or WhatsApp tap (taps overstate real contacts).
- **A3 Verified share:** owner marks 50–70% of leads GOOD; marking coverage ≥70% (G4).
- **A4 Recording:** 85–95% of GOOD leads reach Google as verified-lead conversions (G5).

### 1.2 Monthly volume at ₪1,500

| Scenario | Avg CPC | Clicks | Lead rate | Raw leads | GOOD share | Google-recorded verified | Verified CPL |
|---|---|---|---|---|---|---|---|
| Low (costly trade/area) | ₪15 | 100 | 8% | 8 | 50% | **~3–4** | ~₪400 |
| Typical | ₪10 | 150 | 11% | ~16 | 60% | **~8–9** | ~₪170–190 |
| High (cheap clicks, strong intent) | ₪6 | 250 | 15% | ~37 | 70% | **~20–24** | ~₪65–75 |

**Realistic range: 4–12 verified leads per 30 days, central about 8.**
**Closed jobs (G3):** at 8 verified/month and 20–30% close rate, about 3–5 closed jobs per 60 days if reported; 1–2 in the low case.

### 1.3 How long until 15?
- G2 as specced ("≥15 in trailing 30 days") is a rate gate: an account producing fewer than 15 a month never passes.
- Only the high scenario passes, around days 45–60 after launch.
- Cumulatively, 15 verified leads take about 2 months (typical) or 4 months (low).
- Budget for 15 in 30 days: about ₪2,600–2,900/mo typical, ₪6,000/mo low, ₪1,000–1,100/mo high.

**Eitan's challenge is correct.** At ₪1,500/mo the current G2 blocks most accounts permanently.

### 1.4 What Google says (fetched 2026-11-12)
- **Target CPA** (answer/6268632): "Advertisers can start using Target CPA with no conversion history…"; "For evaluation, we recommend you measure performance for the last 30 days, including at least 30 conversions."; recommended target = past-30-day CPA adjusted for conversion delays; spend up to 2× average daily budget. Dated notices: label change June 2026; from August 17, 2026 budget-limited Target CPA/ROAS campaigns perform toward the target rather than beating it (FAQ answer/17125145, via SERoundtable / Search Engine Land; FAQ not opened this run).
- **Maximize Conversions** (answer/7381968): only conversion tracking required; tries to fully spend the average daily budget; no minimum conversion count stated.
- **Bottom line:** no hard minimum to switch. Google's only number is 30 conversions in 30 days for evaluating Target CPA. Our "15" is a practitioner floor, never attributed to Google.

### 1.5 Options weighed

| Option | Verdict | Why |
|---|---|---|
| Longer window (60–90 d) | **Adopt (60 d)** | Typical account in range in 2–3 months; 90 d mixes stale seasonality |
| Lower bar + stronger safeguards | **Partly** (keep 15, lengthen window, keep rollback) | Below ~12 events baseline CPL is noise |
| Maximize Conversions without a target first | **Adopt as Phase 2** | At ₪50/day budget binds anyway; since 17 Aug 2026 budget-limited tCPA only aims at the target; no R3 loop, no baseline needed. Trade-off: no CPC cap → guard R6 |
| Graduate only when budget allows | **Adopt as Phase-3 gate (Target CPA)** and owner messaging | Target CPA only at ≥30 verified/30 d (≈₪4,500+/mo typical) |
| Tell the owner phase 2 may never trigger | **Adopt** | Honest, and a real upsell path |

### 1.6 Recommended revised design (replaces spec §4 G1–G3, §5.1, §5.2)

**Phase 1 (unchanged):** Maximize Clicks, ₪15 CPC ceiling; verified-lead goal primary from day 0.

**Phase 2: Maximize Conversions, no target** (`maximize_conversions` with `target_cpa_micros` unset; re-check pinned API).

| Gate | New threshold |
|---|---|
| G1 Age | ≥45 days since first impression; ≥14 d since `signalIntegritySince` and any goal change |
| G2 Volume | ≥15 Google-recorded verified-lead conversions in the trailing **60-day** delay-adjusted window |
| G2b Recency | ≥5 in the last 30 days and ≥2 in the last 14 |
| G3 Closed-job truth | ≥2 owner-marked closed jobs in the trailing **90** days |
| G4–G10 | Unchanged |

- Expected: typical ₪1,500 account graduates around day 60–90; low scenario does not without a budget increase.
- Rollback: R1 uses the CPL ceiling plus the 60-day baseline; R3 dropped for Phase 2; add **R6 click-price drift** (from day 10, average CPC > 2× Phase-1 30-day average **and** verified conversions over the last 14 days below baseline rate → roll back).
- **N4:** if G1 passed but G2 short at day 90, tell the owner the monthly budget that would reach 15 in 60 days: `ceil(15 × verifiedCpl / 2)`, rounded up to ₪100.

**Phase 3: Target CPA** — gates ≥30 verified in 30 days and ≥30 days in Phase 2; target = min(ceiling, 1.10 × Phase-2 30-day CPL). Not expected at ₪1,500; shadow-evaluate only for now.

**Spec text to align:** prompts.ts:403 and api/bot/route.ts:827 → "after about 15 verified leads, usually 2–3 months at the minimum budget", never "15+ conversions"; never cite Google for the 15.

### 1.7 /google-ads phases block: English wording intent (Tamar → Noa)
1. We start by buying clicks at a capped price, to learn which searches bring real enquiries without overpaying.
2. Every lead you mark as real teaches the system. Once enough real leads have come in — usually two to three months at the minimum budget — the system switches from chasing clicks to chasing leads.
3. At the minimum budget some trades and areas don't reach that point; then the campaign stays on the click mode, which keeps working, and we show you the budget that would unlock the switch.
4. If the new mode does worse, we switch back automatically.

**Must not say:** "after the first month" or any fixed date; "after 15 leads" as a promise; "Google requires X conversions"; "lower cost per lead guaranteed"; "learns from the jobs you closed" (bidding optimises to verified leads); that the switch happens for every client. Method puffery is fine; timing is a checkable claim.

---

## 2. Google's new-advertiser ad credit for Israel

### 2.1 What Google publishes

| Term | What Google says | Source (access date) |
|---|---|---|
| Amount in ILS | **Not published**; public Israel page shows tiers with blank amounts filled in per account | business.google.com/il/google-ads (carried, 2026-11-12) |
| Partner tiers | USD "or local equivalent": $500→$500, $680→$630, $1,400→$980, $3,200→$1,600, $4,500→$2,250, $10,000→$5,000, $12,000→$6,000 | answer/15329625 (carried; **re-fetch verbatim**) |
| Who redeems, when | The Partner picks a tier in the Partners Program tab within 20 days of the client account's creation; no other promotion on the account | answer/15329625 (carried) |
| Spend window | Spend must be reached within 60 days of redemption; taxes/fees don't count | answer/15329625 and google.com/intl/iw_il/ads/coupons/terms/cyoi (carried) |
| Eligibility | New advertisers only, one per business: "You cannot have advertised with Google Ads before using a different account for the same business"; eligibility check up to 35 days | answer/6388096 (Adam re-fetch 2026-11-12); answer/2393021 (carried) |
| When credit lands | After spend is reached and the new-customer check passes; self-signup terms: usually within 35 days, expires 60 days after it lands, future ad costs only, "while supplies last" | cyoi terms (carried); confirm it applies to the Partner route |
| Cap | WAO's monthly Partner credit pool is limited to 15% of WAO's rolling 90-day managed client spend; policy violations freeze the pool | answer/15329625 (carried) |
| Agency limits | Selling credits prohibited; one per customer; not on request; not retroactive | adspolicy/answer/1396257 (carried) |
| Israel on Partner country list | **Not confirmed publicly** | Eitan's MCC observation; needs a dated screenshot |

### 2.2 Facts the copy may state, attributed to Google
(Only after answer/15329625 is re-fetched and Eitan supplies a dated Partners-tab screenshot.)
1. This is Google's offer, not ours; Google gives it to businesses that have never advertised on Google Ads.
2. One offer per business; Google checks whether the business advertised before.
3. As a Google Partner, we activate the offer on your new account; Google sets a deadline, so we do it in your first weeks (internal: by day 15).
4. Google adds the credit after your ad spend reaches the threshold within 60 days and after its eligibility check (up to about a month).
5. The credit pays for future ads only; it isn't cash and doesn't reduce WAO's fee.
6. **Amount** ("Currently Google's offer is ₪X credit after ₪Y spend, as of <date>") only with Eitan reversing the "no amount" decision, a dated screenshot, and a named monthly re-checker. Otherwise "up to" with no number, or omit.
7. Google sets the terms and can change or end the offer at any time (link to Google's terms).

### 2.3 Must not say
- That it's a WAO discount or part of the ₪249.
- Guaranteed / "every new account gets it" / "your account qualifies".
- Any fixed shekel figure without date and screenshot (never the 2022 "₪1,500 voucher" blog figures).
- "Google matches your budget" / "double your budget" as certainty.
- That eligibility is WAO's decision.
- "We apply and Google decides" (the Partner redeems, Google verifies and pays).
- That it's always available (WAO's pool can run out; check before promising on a sales call).
- A timeline promise, refundable or transferable.
- Anything implying Google endorses WAO or the Ads Bot.

### 2.4 Interaction with Phase 2
- A credit landing in months 2–3 lowers out-of-pocket cost; it doesn't raise the daily budget by itself.
- Optional owner choice (never default): keep cash outlay at ₪1,500 but raise the campaign budget while the credit is live, moving toward the 15-in-60 gate sooner. Credit expiry (60 days) caps this.

---

## 3. Owners and next steps

| Step | Owner |
|---|---|
| Re-fetch answer/15329625 and FAQ 17125145; quote verbatim; confirm Israel country list | Dror |
| Dated screenshot of WAO Partners Program tab (tiers in ₪, monthly pool); decide whether an amount goes live | Eitan, then Adam |
| Amend graduation spec per §1.6 | Adam approves → nextjs-engineer |
| Hebrew for phases block (§1.7) and credit lines (§2.2) | Tamar → Noa |
| Prompt alignment (prompts.ts:403, api/bot/route.ts:827) | Tamar (Hebrew) → nextjs-engineer |
| Intake question "Has this business ever advertised on Google Ads?" + day-10/15 tier-assignment alert | nextjs-engineer |
| Runtime check of the amended evaluator | verifier |

## Sources
Fetched 2026-11-12:
- https://support.google.com/google-ads/answer/6268632?hl=en
- https://support.google.com/google-ads/answer/7381968?hl=en
- https://localiq.com/blog/home-services-advertising-benchmarks/
- Secondary (search-result level): shopifreaks.com (2025 CPC report summary), click-vision.com/?p=20676, webtonic.io locksmith and plumbing stats, seroundtable.com/google-ads-bidding-campaigns-limited-budget-41618.html, searchengineland.com/google-ads-updates-target-based-bidding-for-budget-limited-campaigns-480752, support.google.com/google-ads/answer/17125145

Carried from 2026-11-12 reviews (re-fetch before copy ships):
- https://support.google.com/google-ads/answer/15329625
- https://www.google.com/intl/iw_il/ads/coupons/terms/cyoi/
- https://business.google.com/il/google-ads/
- https://support.google.com/google-ads/answer/6388096
- https://support.google.com/google-ads/answer/2393021
- https://support.google.com/adspolicy/answer/1396257

Repo sources: docs/reviews/google-ads-new-advertiser-credit-dror-2026-11-12.md, docs/reviews/google-ads-payments-verification-dror-2026-11-12.md, docs/reviews/google-ads-price-anchor-cpl-proof-dror-2026-11-12.md, docs/missions/claims-ledger-2026-11-12.md

---
## Update 2026-11-12 (later): founder decisions
- §1.6 redesign **approved by Eitan** (Phase 2 = Maximize Conversions without target on 15 verified in 60 days; Phase 3 = Target CPA).
- **Credit amount:** Eitan confirms from WAO's Partners Program tab that the base tier ($500 spend → $500 credit) is currently **₪1,500 spend → ₪1,500 credit** in Israel. Adam re-fetched answer/15329625 (hl=iw) on 2026-11-12: tiers in USD "או סכום שווה ערך במטבע מקומי"; Partner redeems within 20 days of account creation; spend within 60 days of redemption; client account must have no other promotion; monthly pool = 15% of the partner's previous-90-day spend, resets on the 1st. Israel's presence on the country list is not stated on that page; founder evidence (MCC shows the offer) stands in. Copy may state the ₪1,500/₪1,500 tier as Google's current offer, dated, attributed to Google, with "Google sets and can change the terms". Monthly re-check owner: Adam.
