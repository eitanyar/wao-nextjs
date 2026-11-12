# Claims ledger: Dash ads, Site Bot intro, /site-bot and /google-ads round 2, terms (Fable 5.2, 2026-11-12)

Flag-only. No copy is changed here and no Hebrew is authored here; claims are described in English and
pointed to by file and line. Checked against the working tree and the live site on 2026-11-12.

## How to read it

| Status | Meaning |
|---|---|
| **PROVEN** | Backed by code, a terms section, or a dated web source. "Proven in code" is not the same as live; see the "Today" column. |
| **NEEDS-PROOF** | Not contradicted, but nothing proves it yet: the feature is not built, is switched off in production, runs by hand, or no source exists. |
| **FALSE** | Contradicted by the code, the terms or a Google source as the line is worded today. |
| **FOUNDER-CONFIRM** | Only Eitan can confirm (a fact about WAO, or a promise about his time). |

**Source keys**
- `SB` = `docs/copy/site-bot-r2-final-candidate-2026-11-12.txt` (line)
- `GA` = `docs/copy/google-ads-r2-final-candidate-2026-11-12.txt` (line)
- `D2` = `docs/copy/video-dash-v2-scripts-2026-11-12.json` (episode, line index)
- `D1` = `docs/copy/video-dash-scripts-r4-final-candidate-2026-11-12.json` (v1 final candidate)
- `ST` = `docs/missions/video-intro-site-bot-2026-11-12.md` (storyboard beat)
- `TS` / `TA` = `docs/legal/site-bot-terms-of-use.md` / `docs/legal/ads-bot-terms-of-use.md` (line)
- `CC` = `src/app/api/google-ads/create-campaign/route.ts`
- `SPEC` = `docs/specs/ads-bot-phase2-auto-graduation-2026-11-12.md` (Dror's code findings F1–F10)
- `TRUTH` = `docs/reviews/site-bot-product-truth-check-2026-11-12.md` (I spot-checked four of its references; the rest are quoted as written)

**Web sources (all fetched 2026-11-12)**
- W1 Google Ads Help, Partner badge requirements: https://support.google.com/google-ads/answer/9702452
- W2 Google Business Profile Help, local ranking tips: https://support.google.com/business/answer/7091
- W3 Google Ads Help, Google Partners promotional offers (current model): https://support.google.com/google-ads/answer/15329625
- W4 Google Ads Help, Target CPA bidding: https://support.google.com/google-ads/answer/6268632

**State of the pages:** the round-2 copy is wired into the working tree (`src/lib/site-bot/landingCopy.ts`,
`src/lib/google-ads/landingCopy.ts`, uncommitted) but is **not deployed**. Live `/site-bot` shows no ₪199; live
`/google-ads` still sells management "from ₪1,500" and shows "400%" three times.

## The items that matter most

| # | Finding | Status |
|---|---|---|
| 1 | Dash v2 A1 says the Ads Bot learns **only** from closed jobs. A new account bids for clicks (Maximize Clicks), all five conversion actions are primary including phone and WhatsApp taps, and "relevant" marks are uploaded too. | FALSE |
| 2 | /google-ads says Google moves budget to the searches that bring better enquiries. In phase 1 Google is not bidding on enquiries at all. | FALSE (until phase 2) |
| 3 | /google-ads says the bot moves to a target cost per enquiry after about 15–30 closed jobs. No code does this; it is a manual team step and a spec. The number also disagrees with the spec (15 verified enquiries plus 2 closed jobs). | FALSE as worded |
| 4 | Marking an enquiry **is** sent to Google as an offline conversion (code confirmed). Whether Google accepts it is unproven: the timestamp is about 3 hours early and failures are reported as success. | PROVEN in code / NEEDS-PROOF at Google |
| 5 | Site Bot on the client's own domain within 3 business days: the deploy code only attaches `{slug}.wao.co.il`. My storyboard called this "built"; that was wrong. | NEEDS-PROOF |
| 6 | "Changes go through one message": the edit endpoint returns 503. The **live** page title already promises this. | NEEDS-PROOF |
| 7 | Site Bot profile management, review message, reply drafts, monthly report, visible profile link: not live. Sold under the 19.11 stamp. | NEEDS-PROOF by 19.11 |
| 8 | Terms promise no model training and paid commercial processing; our note on the Qwen token plan says its terms allow input use for model improvement. Gemini is used by the bot chat but is not listed as a sub-processor in either product's terms. | NEEDS-PROOF (lawyer) |
| 9 | Google Partner badge active; credit offer available for Israel-billed accounts. | FOUNDER-CONFIRM |
| 10 | "Brings you more jobs / buyers / more reviews" (all six Dash v2 solution lines) against "no commitment to enquiries or calls" in both terms §9. | NEEDS-PROOF |

## A. Ads Bot

Covers `GA`, Dash v2 A1–A3, Dash v1 A1–A3 and `TA`.

| # | Claim | Where | Proof | Status | Today |
|---|---|---|---|---|---|
| A1 | ₪249 + VAT a month | GA 2, 33–34, 49–50, 74–77; D1 end cards; TA 72 | `src/lib/payments/plans.ts:59`; TA §7 | PROVEN | Not on the live page. No Ads Bot checkout (`plans.ts:55-57`). |
| A2 | Your mark goes back to Google | GA 14; TA 25, 114, 144 | `src/lib/crm/clientLeadsActions.js:43-49,58-61` → `src/lib/google-ads/conversion-upload.ts:119-254` (Data Manager `events:ingest`). "Relevant" uploads `verified-lead`; "closed" uploads `closed-deal`. | PROVEN (code) | An enquiry with no click ID is skipped (`conversion-upload.ts:149-155`). |
| A3 | Google receives and uses that mark | GA 1, 2, 10, 14, 64; D1 A1–A3 | Timestamp is UTC clock time stamped `+03:00`, so about 3h early (`data-manager-events.js:163-168`, SPEC F4); the upload result is discarded and reported as "ok" (`clientLeadsActions.js:57-68`, F5). No upload diagnostics on file. | NEEDS-PROOF | Spec step 0 fixes this; not built. |
| A4 | Learns from closed jobs, not clicks (headline idea) | GA 1, 68; D1 A1/A3 solution lines | Launch bidding is Maximize Clicks with a click-price ceiling (`CC:591-597`), which does not use conversions. All five conversion actions are primary (`CC:489-539`, F3). | NEEDS-PROOF | True only as the phase-2 design. |
| A5 | Learns **only** from closed jobs | D2 A1 script_30[4] | As A4, plus "relevant" marks are uploaded as well (A2). | FALSE | — |
| A6 | Google spots which searches bring better enquiries and moves budget there | GA 16, 64 | Phase 1 is Maximize Clicks (A4). What does cut waste today is the bot's own search-term clean-up (A9). | FALSE until phase 2 | — |
| A7 | The **bot** moves to a target cost per enquiry once enough closed jobs are marked | GA 21 (last sentence), 71, 73 | No code. "15–30" exists only as prompt text (`src/lib/bot/prompts.ts:403`; F10). SPEC §1 is the plan to automate it. | FALSE as worded (manual today) | Team step. |
| A8 | The trigger is about 15–30 **closed jobs** | GA 73 | SPEC §4 gates on 15 owner-verified enquiries in 30 days plus at least 2 closed jobs; SPEC §3 estimates 2–5 closed jobs a month at the minimum budget. W4: Target CPA has no minimum; Google evaluates on 30 conversions in 30 days. | FOUNDER-CONFIRM (pick the number) | — |
| A9 | Blocks searches that burn money | GA 21 | `src/lib/google-ads/autonomous-cycle.ts:24` (`search_term_cleanup`) | PROVEN (code) | Runs only with the owner's autonomy consent. |
| A10 | Filters fake clicks | GA 21; TA 15, 46 | Fraud Blocker tracker on landing pages (`src/lib/lp/renderStaticHtml.ts:100`, `src/lib/fraud-blocker/tracker.ts`), health sync in the cycle | PROVEN (code) | Confirm on the first live account that blocking, not only tracking, is on. |
| A11 | At the start it caps the click price | GA 21, 72 | `CC:596` (₪15 ceiling) | PROVEN | The prompt describes a different cap formula (`prompts.ts:401`). |
| A12 | No budget increase while an enquiry costs more than your target | GA 21 | `src/lib/google-ads/executor.ts:211-216` | PROVEN (code) | Cost per enquiry is understated because it counts all conversion actions (F7), so the gate is lenient. |
| A13 | Form, call and WhatsApp tap all land in one list | GA 12; TA 25 | `src/lib/crm/lead-capture.ts:50`; `src/components/lp/LandingPage.tsx:83`; list at `src/app/(product)/client/dashboard/page.tsx:378` | PROVEN | "Call" is a tap on the call button, not a completed call. |
| A14 | Weekly report with three numbers: enquiries, real enquiries, cost of each | GA 23, 52; TA 15 | The message has enquiries, closed deals and alerts (`src/lib/google-ads/whatsapp-digest.ts:16-17`); it is sent by staff through a link on an internal dashboard (`src/app/(product)/geo/dashboard/page.tsx:166`). No automatic send found. | NEEDS-PROOF | — |
| A15 | New account, built from scratch, in your name | GA 3, 19, 48, 60; TA 15, 17 | `CC:462-470` creates the account under WAO's manager account, named after the business | PROVEN (created and named) | — |
| A16 | The account is **yours**: you own it, your payment profile, you can leave with it | GA 39–41, 58, 76; D1 end-card direction; TA 17, 23, 64 | No code invites the owner as admin or sets up his billing; ownership items are a manual checklist (`src/lib/google-ads/live-readiness.js:7-9`). | NEEDS-PROOF (show one real account) | — |
| A17 | Ad budget goes straight to Google; none of it reaches WAO | GA 34, 50, 66; TA 19, 21 | TA §2. Depends on A16. | NEEDS-PROOF | — |
| A18 | You see clicks and cost at any moment | GA 39; TA 17 | Depends on A16 (owner login to the account). | NEEDS-PROOF | — |
| A19 | Minimum ad budget ₪1,500 a month, about ₪50 a day | GA 33–34, 50; TA 21 | TA §2; 1,500 ÷ 30 = 50 | PROVEN | — |
| A20 | Agency management usually starts around ₪1,500 + VAT a month; about six times ours | GA 35 | 1,500 ÷ 249 = 6.02. No Israeli market source found (search 2026-11-12). The only repo source is WAO's own old price. | NEEDS-PROOF | — |
| A21 | WAO is a Google Partner | GA 29; TA 74 | No badge or link in the page code. | FOUNDER-CONFIRM | Policy note: the badge must link to WAO's public Partner profile (`docs/reviews/ads-bot-guarantee-lockin-fable52-2026-11-11.md:71`). |
| A22 | Google re-checks us every day: performance, ad spend, certification | GA 30 | W1: 70% optimisation score, USD 10,000 spend over 90 days, 50% certified; "checked on a daily basis". | PROVEN (mechanism) | Holds only while A21 holds. |
| A23 | We apply for an ad credit for businesses new to Google Ads; Google decides | GA 36, 62; TA 74 | W3: the Partner picks and redeems the offer itself within 20 days of account creation; monthly cap of 15% of rolling 90-day spend; credit lands after the spend requirement and a new-customer check; supported billing countries are on a separate list (Israel not confirmed). | FOUNDER-CONFIRM | "Apply and Google decides" is not how W3 describes it. |
| A24 | 30-day refund of the management fee, with the listed conditions; automatic refund if no ad ever goes live | GA 37–38, 56, 75 | TA 78 | PROVEN (terms) | Manual. Lawyer question open on when "never went live" is decided (`docs/legal/legal-package-cover-note.md:53`). |
| A25 | Full refund if Google's checks are not done within 21 days of payment | GA 54 | TA 80 | PROVEN (terms) | — |
| A26 | After cancelling: pages stay 30 days, copy for ₪900 + VAT, free after 12 paid months | GA 58 | TA 90, 92 | PROVEN (terms) | No code. |
| A27 | No commitment; leave any month; written agreement | GA 6, 41, 58 | TA 9, 72 | PROVEN (terms) | No online cancel exists for Ads Bot (no billing plan in code). |
| A28 | Payment starts at sign-up | GA 66 | TA 72 says the charge is at the start of each month. | NEEDS-PROOF (wording differs; no checkout) | — |
| A29 | We do not repair an existing account | GA 60 | TA 15 | PROVEN (terms) | — |
| A30 | Ads go live only after you saw the plan | GA 46, 48 | Campaign is created paused (`CC:594`) | PROVEN (code) | — |
| A31 | Free demo on a sample plumbing business: area, budget, search terms, sample ad, page preview | GA 5, 28 | `src/app/(app)/google-ads/page.tsx:86`; live route returned 200 | PROVEN (route) | Roni to confirm all five items show. |
| A32 | Free 30-minute call with Eitan; urgent matters go to Eitan, not a call centre | GA 4, 25, 44; TA 183 | — | FOUNDER-CONFIRM (capacity) | — |
| A33 | Eitan has been in digital marketing since 2006 | GA 32 | Repeated on the site (`src/components/WhyWao.tsx:5`); no external proof in the repo | FOUNDER-CONFIRM | — |
| A34 | "Brings you paying passengers / buyers, your till fattens / answers in closed jobs" | D2 A1[4], A1 15s[2], A2[5], A2 15s[2], A3[5] | TA 102 (no commitment to enquiries). No Ads Bot client results on file. | NEEDS-PROOF | Dror to check against Google's misrepresentation policy. |
| A35 | "You stop paying for every question" | D2 A1 script_15[2] | Google still bills per click. | FALSE (literal reading) | — |
| A36 | Screen direction: a "learning line" updates when a job is marked; panel shows the campaign running | D2 A1[4], A2[5], A3[5] | No such element found in `src/app/(product)/client/dashboard/page.tsx`. | NEEDS-PROOF (the screen must exist to be shown as real) | — |
| A37 | We send Google the click ID, time and status: relevant **or not relevant**, and whether closed | TA 25, 114, 144 | "Not relevant" is never sent (`clientLeadsActions.js:43-45`). A money value **is** sent (expected value, or the revenue the owner typed: `conversion-upload.ts:173-181`) and the product terms do not mention it. | NEEDS-PROOF (lawyer: terms and code differ) | — |
| A38 | Notices on the day of cancelling and 7 days before pages go offline | TA 88 | No code found. | NEEDS-PROOF | — |

## B. Site Bot

Covers `SB`, Dash v2 S1–S3, Dash v1 S1–S3, `ST` and `TS`.

| # | Claim | Where | Proof | Status | Today |
|---|---|---|---|---|---|
| B1 | ₪199 + VAT a month, no commitment, no trial | SB 5, 39, 50, 68; D1 end cards; ST B13; TS 61 | `src/lib/payments/plans.ts:41,47-48`; TS §7 | PROVEN | Not on the live page; checkout is off in production. |
| B2 | Opens 19.11.2026 | SB 1 | `docs/missions/site-bot-full-system-launch-2026-11-19.md` | NEEDS-PROOF (decision due 19.11) | B8–B15 open. |
| B3 | Free check works now: business name only, no sign-up, result in seconds | SB 2, 8, 42; ST B12 | TRUTH rows 1–2 (`audit/page.tsx:28`, 15s ceiling); live `/site-bot/audit` returned 200 | PROVEN | Live. |
| B4 | A page for every service, under one service tree | SB 13–14, 48; ST B05 | TRUTH (`researchedSite.ts:45-46,124,263`) | PROVEN (code) | Generated sites. |
| B5 | The tree is built from checking what people search near you | SB 14 | `src/lib/site-bot/research/dataForSeoResearch.ts`, `runResearch.ts` | PROVEN (code) | — |
| B6 | Site shows opening hours and a call button | SB 14; ST B06 | TRUTH (`renderSitePages.ts:666-682`, `:147-148`) | PROVEN (code) | — |
| B7 | We pull the details Google already has | SB 14 | `src/lib/site-bot/placePrefill.ts:1-10` | PROVEN (code) | Inside the paid flow, which is off in production. |
| B8 | Site shows a link to the Google profile | SB 14 | Only hidden structured data (`src/lib/lp/renderSitePages.ts:317,328`) | NEEDS-PROOF by 19.11 | Not built. |
| B9 | Site shows reviews you picked | SB 14 | TRUTH: up to two quotes the owner types; nothing from Google | NEEDS-PROOF | Partial. |
| B10 | It starts with a few questions in a chat; your part is to tell and approve | SB 14; ST B10 | `src/app/(app)/site-bot/start/page.tsx:14-17` (off in production; the live URL redirects) | NEEDS-PROOF (gate G4) | Off. |
| B11 | Profile and site show the same services, areas and hours | SB 15–16, 48; ST B07; D2 S1[4], S3[4–5]; D1 S1/S3 15s | TRUTH: patch engine exists, off in production (`fix-execute` returns 503); services write not built | NEEDS-PROOF (gate G1) | Off. |
| B12 | We connect as managers; you stay the owner | SB 16; TS 39 | TRUTH: plan only (`connect-gbp/paid.ts:11`) | NEEDS-PROOF | Not built. |
| B13 | A ready review message to forward after a job | SB 17–18, 60; ST B08; D2 S2[5]; D1 S2 15s | Placeholder copy marked "Do not ship" (`src/lib/crm/reviewFlywheelCopy.ts:8-9`); tied to campaign enquiries, not Site Bot | NEEDS-PROOF (gate G2) | Not live. |
| B14 | A draft reply to each new review, for your approval before it is published | SB 18, 60; TS 15 | Drafts exist; posting is off (`src/lib/gbp/client.ts:51`; `src/app/api/gbp/review-reply/route.ts:66`) | NEEDS-PROOF | Off. |
| B15 | Monthly report: calls from the profile, direction requests, clicks to the site, new reviews | SB 20, 62; ST B09; TS 15, 155 | No report code found | NEEDS-PROOF (gate G3) | Not built; already promised in the terms. |
| B16 | Hosting included | SB 20; TS 15 | `src/app/api/site-bot/deploy/route.ts:442-446` | PROVEN (code) | — |
| B17 | Changes go through one message, no editor | SB 20, 60, 68; live page title | `src/app/api/site-bot/edit/route.ts:1-6` returns 503 | NEEDS-PROOF | Claimed on the live page today. |
| B18 | A person on the team checks every site before it goes live | SB 46, 58; TS 17 | Deploy needs an admin session and an approved copy review (`deploy/route.ts:213-214, 300-302`) | PROVEN (code) | — |
| B19 | AI takes part in the writing | SB 58; TS 17, 23 | TS §2–3 | PROVEN | — |
| B20 | On a WAO address: live within 1 business day of payment | SB 52, 68; TS 55 | TS §6 (commitment). Deploy is a staff action. | NEEDS-PROOF (no timed run on file) | — |
| B21 | On your own domain: live within 3 business days of access, from day one | SB 52, 68; ST B11; TS 55 | TS §6 (commitment). Deploy attaches only `{slug}.wao.co.il` (`deploy/route.ts:450-452`; `src/app/api/cloudflare-pages/deploy/route.ts:163`). A root domain needs its name servers moved to Cloudflare (`docs/missions/site-bot-m4-site-migration-2026-11-11.md`, platform facts). | NEEDS-PROOF | Manual; never run end to end. |
| B22 | The domain and the Google profile stay yours | SB 54; ST B11; TS 57, 77 | TS §6, §8 | PROVEN (terms) | — |
| B23 | Cancel online at any time; takes effect at the end of the paid month | SB 50; TS 69 | `plans.ts:49`; `src/lib/payments/subscriptions.ts:418-421`; `src/app/api/subscriptions/cancel/route.ts`; `src/app/(product)/account/subscription/CancelSubscriptionButton.tsx` | PROVEN (code + terms) | Not usable until checkout is live. |
| B24 | After cancelling: site stays 30 days; you can buy a copy; free if you paid 12 months | SB 56; TS 71, 79 | TS §8. No price for the copy in `TS`; `TS` says "12 months as a customer", the page says "paid 12 months". No code. | PROVEN (terms), wording differs | — |
| B25 | We never contact your customers | SB 60; ST constraints | Design rule (`reviewFlywheelCopy.ts:5-6`). `TS` 15 says the service includes "requests to leave a review" without saying who sends them. | PROVEN (design); terms unclear | — |
| B26 | Google recommends complete, accurate details and more reviews | SB 48 | W2 | PROVEN | — |
| B27 | A page per service helps Google understand and show you for each service | SB 48 | Not in W2. | NEEDS-PROOF (Yonatan to source) | — |
| B28 | Eitan, founder, in digital marketing since 2006; you can talk to him before you start | SB 43–44 | — | FOUNDER-CONFIRM | — |
| B29 | "Brings you more jobs and more reviews from Google" | D2 S1[4], S1 15s[2], S2[5], S2 15s[2], S3[4], S3 15s[2] | TS 83 (no commitment to calls or enquiries). The review part depends on B13. | NEEDS-PROOF | — |
| B30 | Screen direction: a real Site Bot screen with the site and the Google profile side by side; a phone showing a Google search | D2 S1[3–4], S3[4–5] | Depends on B11. Also against the standing "no Google interface" guardrail (ST constraints). | NEEDS-PROOF | — |
| B31 | Screen direction: a review request "reaches his customer" | D2 S2[5], S2 15s[2] | Must be shown as the owner forwarding it (B25); depends on B13. | NEEDS-PROOF | — |
| B32 | Storyboard table: own-domain hosting is "Built (commit `9f391b9`)" | ST "What is live today", row 3 | That commit only makes the `wao.co.il` sub-domain attach repeatable. | FALSE (my error) | See B21. |

## C. End screen, stamp and landing

| # | Claim | Where | Proof | Status |
|---|---|---|---|---|
| C1 | Stamp: no commitment, cancel online (Site Bot) | D2 `end_screen.pick`; ST B13 | TS 61, 69; B23 | PROVEN; wording awaits Noa; `data/video/config.json` still holds `STAMP_TEXT_PENDING` |
| C2 | Same stamp on Ads Bot ads | D2 A1–A3 end cards | TA 72 says so; no online cancel exists in code for Ads Bot | NEEDS-PROOF |
| C3 | The stamp wording drops "anytime" from your decision ("cancel anytime, no commitment") | D2 `end_screen.options` | Option 2 keeps it; option 1 was picked | FOUNDER-CONFIRM |
| C4 | Price on the end screen | `data/video/config.json` | Site Bot is checked against `plans.ts`; Ads Bot has `pageSource: null`, so nothing checks 249 against `plans.ts:59`. The Dash v2 end-card directions list mark, name, stamp and button, and no price. | NEEDS-PROOF |
| C5 | Button: see a free demo (Ads) / check your business free (Site) | `docs/copy/video-end-screen-cta-2026-11-12.waocopy.json` | A31, B3 | PROVEN |
| C6 | The page the ad lands on shows the same price | — | Live pages do not (see "State of the pages") | FALSE until round 2 is deployed |

## D. Terms and legal base documents

| # | Claim | Where | Proof | Status |
|---|---|---|---|---|
| D1 | No training on client data; model providers process on paid commercial tracks | TS 131; TA 151 | Our note on the Qwen token plan (memory `reference_alibaba_token_plan_video`, 2026-11-12) records that its terms limit it to interactive use and allow input use for model improvement. Re-check the plan page. | NEEDS-PROOF |
| D2 | Sub-processor list is complete | TS 109–118, 135; TA 127–138, 155 | Gemini is called by the bot chat and page generation (`src/app/api/bot/route.ts:860`; `src/app/api/lp-generate/route.ts`) and is not listed. | NEEDS-PROOF |
| D3 | Full separation between clients, no pooled learning; no use of data for marketing | `docs/legal/privacy-policy.md` 42–44, 52; `terms-of-service.md` 57; `data-processing-addendum.md` 30 | The product terms now allow pooled, de-identified results in marketing (TS 98; TA 118). The base documents were not updated and still name Gemini, Search Console and EU/US only. | NEEDS-PROOF (lawyer: which document governs) |
| D4 | Tax invoice sent automatically for every charge | TS 65; TA 82 | Depends on the payment provider; Site Bot checkout is a mock in production and Ads Bot has none. | NEEDS-PROOF |
| D5 | Pro-rata refund within 14 days; four-month window for the listed groups | TS 63; TA 76; `subscription-legal-copy-final.md` | Columns exist (`src/lib/payments/db.ts:123-127`); refund calculation not checked. | NEEDS-PROOF |
| D6 | Support answers within 24 hours on business days | TS 161; TA 183 | — | FOUNDER-CONFIRM |
| D7 | Site Bot terms "last updated 11.11.2026" | TS 3 | §6 (own domain) was rewritten on 2026-11-12. | FALSE (stale date) |
| D8 | Site Bot collects no Google Ads, Search Console or click-ID data | TS 100–105 | Not checked in code. | NEEDS-PROOF |
| D9 | Cover note: Site Bot uses Gemini for copy and has no custom domain | `legal-package-cover-note.md` 15 | Superseded by TS §5–6. | FALSE (stale) |

Ads Bot terms rows A37, A38 and Site Bot rows B12, B14, B15, B21 above are terms claims as well.

## E. Dash v1 final candidate (`D1`), where it differs from v2

| Claim | Status |
|---|---|
| Price spoken and shown in solution lines and 15s cuts (₪249 / ₪199 + VAT) | PROVEN as a number (A1, B1), but against your "price only on the end screen" decision |
| "Learns from the enquiries you closed, not from clicks" | NEEDS-PROOF (A4) |
| "Mark real jobs; the bot learns from that" | PROVEN in code, NEEDS-PROOF at Google (A2, A3) |
| "Site and profile that say the same thing" | NEEDS-PROOF (B11) |
| "Helps your customers leave a review" | NEEDS-PROOF (B13) |
| End card "account in his name" | NEEDS-PROOF (A16) |
| An `eitan_close` line per episode | Against your "no founder name in ads" decision if it is voiced by or names Eitan |

## Not ledgered as fact

Scene-setting and opinion, covered by your 12 November rule that puffery is fine: the fictional scenes
(SB 10; GA 8; all Dash set-ups), the comparison table and its verdict (SB 21–37), "three jobs for the price
of a small one" (SB 38), "we have to earn next month" (GA 41), and the closing sections.

## Not checked

- Runtime behaviour of any screen (this ledger reads code, terms and the live HTML only).
- Whether Israel is on Google's list of countries for Partner credit offers.
- Security claims in `privacy-policy.md` §8.
- Whether Fraud Blocker actively excludes IPs in a live account.
