# Site Bot launch-readiness assessment (Fable 5.2, 2026-11-12)

Read-only assessment. No code, copy, terms or data were changed. No Hebrew is authored here; page lines are
referenced by key and line number in `docs/copy/site-bot-r2-final-candidate-2026-11-12.txt` (`SB`), terms by line in
`docs/legal/site-bot-terms-of-use.md` (`TS`).

## Founder decisions, 2026-11-12

- Minimum launch **Sunday 29.11.2026**, variant **B2**, pilot cap **10 clients**.
- **Hosting:** one shared multi-tenant Worker serves every client site by hostname, with Cloudflare for SaaS
  custom hostnames for owner domains (owner adds one CNAME and keeps their DNS and email). This replaces one Pages
  project per client, because Pages allows 100 projects per account and does not routinely raise it (Cloudflare
  docs, checked 2026-11-12). Step 4 builds on this. Founder item 3 is replaced by whatever token permissions the
  engineer's spec names.
- **Site design (approved 2026-11-12):** Fable 5.2 redesign of the generated site, accepted with the mock-up's own
  flaw fixed (header call button hidden on mobile, per the spec). Review: `docs/design/site-bot-redesign-fable52-2026-11-12.md`;
  mock-up: `docs/design/site-bot-redesign-mockup-2026-11-12.html`. Items 1-8 of its top 10 ship before the 29.11
  rehearsal (about 2-3 engineer-days); items 9-10 follow. Gates: new UI labels via waocopy → Noa
  (`docs/copy/briefs/site-bot-redesign-ui-labels-2026-11-12.md`); Yonatan's SEO sign-off and Google review-display terms.

## Bottom line

| | Date | What it means |
|---|---|---|
| Stamp on the live page | 19.11.2026 | Not reachable. About 32 engineer-days of work are open and the payment provider still throws on every call. |
| **(b) Minimum launch** | **Sunday 29.11.2026** | Site, hosting (WAO address or own domain), profile link, review-request message, intake, checkout, cancel, written support. Profile sync, reply drafts and the monthly report are either taken off the page or delivered by hand for a capped pilot. |
| **(a) Full launch** | **Sunday 20.12.2026** | Everything the page and terms sell runs in code, proven once on a real paying client. Best case 13.12; slips into January if Takbull or the live Google tests stall. |

Both dates assume the founder items in "Needed from the founder" are delivered by **Tuesday 17.11**. Every day
Takbull slips past that moves the minimum launch by a day, unless the first clients are invoiced by hand.

**Throughput assumption:** one writer in the repo at a time (AGENTS.md), about 1.5 focused engineer-days of finished,
verified work per working day (Sun–Thu). The engineer is fast; the pace is set by the gates around it: verifier
runs, Tamar → Noa for every new Hebrew string, live tests against Google and DNS, and the founder's spot-checks.

## What I checked and what I did not

- Checked: the code paths listed per capability below, read on the working tree of 2026-11-12 (branch
  `hermes-migration`, many uncommitted changes in `src/lib/lp`).
- Not checked: runtime behaviour, production env values, whether the billing cron is installed on the server, git
  history (commit `7e2bac9` is said to hold fuller versions of the paid routes; I could not open it).
- Engineering estimates are in focused engineer-days and include tests and the verifier pass, not waiting time.

## Capability by capability

State key: **BUILT** (works in code) · **GATED** (built, switched off in production) · **PARTIAL** · **MISSING**.

### 1. Site generation on the service tree
- **Promise:** a page per service under one tree, built from local search research; hours, call button (SB 13–14, 48).
- **State: GATED.** The generator and renderer exist (`src/lib/lp/researchedSite.ts`, `src/lib/site-bot/research/runResearch.ts`).
  Generation is an admin-only action (`src/app/api/site-bot/generate/route.ts:102-106`); deploy needs an admin session
  and an approved copy review (`deploy/route.ts:213-214, 300-302`).
- **Left:** two open quality defects from the 11-11 MVP review. A same-day promise given for one service can leak to
  other service pages (`src/lib/lp/claimScope.ts:127-128` still returns early); the price-table and
  unverified-licence findings (review B3, B4) need a re-check on the current tree. Until fixed, the human check
  before go-live is the only safety net.
- **Depends on:** Qwen, DataForSEO, NeuronWriter, Places (all in use today).
- **Estimate:** 2 days. Confidence: medium.

### 2. Own-domain hosting from day one, within 3 business days
- **Promise:** if the owner has a domain, the site goes live on it from the start, within 3 business days of working
  access (SB 52, 68; TS 55). Founder decision B, 2026-11-12.
- **State: MISSING.** The site address is hard-coded to `{slug}.wao.co.il` (`deploy/route.ts:318`), the only domain
  attached is that sub-domain (`deploy/route.ts:451-452`), and the fraud-tracker registration uses the same address
  (`:321`). There is no field for the owner's domain anywhere in intake or checkout. Never run end to end.
- **Left:** (1) ask "do you have a domain?" and capture it; (2) make the site address a per-client value so
  canonicals, sitemap and schema carry the owner's domain; (3) attach the domain on Cloudflare: an apex domain needs
  its name servers moved to Cloudflare, with every existing DNS record copied first so the owner's email keeps
  working (`docs/missions/site-bot-m4-site-migration-2026-11-11.md`, Step 5); (4) an operator checklist plus a scripted
  before/after DNS comparison; (5) one live rehearsal on a real domain.
- **Scope note:** this covers owners with a domain and no site worth keeping. Replacing an existing ranking site
  (redirect map, content parity) is the separate M4 mission and is not in either date.
- **Depends on:** a Cloudflare token allowed to add zones (today's config holds one zone id); registrar access from
  each owner; a test domain from the founder.
- **Estimate:** 4 days (2.5 for a hand-run first version). Confidence: medium-low.

### 3. WAO sub-domain within 1 business day
- **Promise:** live within one business day of payment when the owner has no domain (SB 52; TS 55).
- **State: BUILT, staff-triggered.** Deploy creates the Pages project, attaches the sub-domain and verifies the DNS
  record (`deploy/route.ts:442-485`). Unknown URLs now return a real 404 (`src/lib/lp/renderSitePages.ts:79`).
- **Left:** nothing alerts staff when a payment lands, so the one-day clock rests on someone noticing. Needs a
  "paid, waiting for build" queue with an alert, and one timed run from payment to live.
- **Estimate:** 0.5 day. Confidence: high.

### 4. Changes by message
- **Promise:** changes go through one message, no editor; "send a message to the bot" (SB 20, 60, 68; also the live
  page title).
- **State: MISSING.** `src/app/api/site-bot/edit/route.ts:1-7` returns 503. A paying client has no place to send the
  message.
- **Left, version 1 (2 days):** a written request box on the client's account page → operator queue → staff applies
  the change through the existing generate/review/deploy path → confirmation to the owner.
  **Version 2 (+3 days, after launch):** AI turns the message into a proposed patch that staff approves.
- **Depends on:** Tamar for the form and confirmation lines; a turnaround time the founder is willing to state.
- **Estimate:** 2 days for version 1. Confidence: medium.

### 5. Google profile management and alignment
- **Promise:** profile and site show the same services, areas and hours; WAO connects as a manager, the owner stays
  the owner (SB 15–16, 48; TS 15, 39).
- **State: PARTIAL, GATED.** The write engine handles categories, attributes, hours, website, phone and description
  (`src/lib/gbp/executePatch.ts:39-158`). It has no services write and no service-area write. Its entry point returns
  503 (`src/app/api/site-bot/fix-execute/route.ts:3-7`), as does the connect start
  (`gbp/oauth/start/route.ts:3-7`). The manager-invite flow is not built: the connect route only stores a value it is
  handed (`connect-gbp/paid.ts:49-57`). All live calls sit behind `GBP_INTEGRATION_ENABLED` (`src/lib/gbp/client.ts:50-52`).
- **Left:** (1) the invite flow: instructions for the owner, WAO's account accepts the invitation, the location is
  matched to the audited business; (2) services and service-area writes; (3) a "site vs profile" comparison that
  produces the patch; (4) read-back after each write; (5) staff approval screen; (6) per-client switch.
- **Depends on:** GBP API access (recorded as working); one WAO Google account that owners invite; a real profile
  for live write tests. Google can hold or reject edits; that part is outside our control.
- **Estimate:** 4.5 days. Confidence: medium.
- **By hand meanwhile:** once invited as manager, staff can make the same edits in Google's own screen, about
  30 minutes per client, with no code.

### 6. Review-request message
- **Promise:** after a job the owner forwards a ready message with his review link (SB 17–18, 60).
- **State: PARTIAL.** Builders exist but the file is marked placeholder, "Do not ship"
  (`src/lib/crm/reviewFlywheelCopy.ts:8-9`), and the trigger is a closed enquiry in the ads CRM, opt-in per client
  (`src/app/api/leads/route.ts:51`). A Site Bot client never reaches it. The review-link builder is ready (`:59-65`).
- **Left:** give every Site Bot client his message and link at go-live (welcome message and account page, with a
  one-tap share); approved Hebrew.
- **Depends on:** Tamar → Noa for the message.
- **Estimate:** 1 day. Confidence: high.

### 7. Reply drafts
- **Promise:** a draft reply to each new review, approved by the owner before it is published (SB 18, 60; TS 15).
- **State: PARTIAL, GATED.** Polling and drafting exist, but only for reviews of 3 stars or fewer
  (`src/lib/gbp/reviewPoll.ts:62`, `reviewResponder.ts:1-5`). Approval and posting are admin-only
  (`src/app/api/gbp/review-reply/route.ts:38`) and gated off (`:64-68`). The poller is a script
  (`scripts/review-poll.mjs`) with no scheduled job in `scripts/cron/`. Posting has never been exercised live
  (`src/lib/gbp/client.ts:164-170`).
- **Left:** drafts for every new review (a prompt for positive reviews); a scheduled poll per connected client; an
  approval link the owner himself opens; post, then confirm.
- **Depends on:** capability 5 (connection); a channel to reach the owner (email exists in
  `src/lib/notifications/resend-transactional.ts`; WhatsApp sending exists in `whatsapp-cloud.ts` but needs
  Meta-approved templates); Tamar for the prompt examples and notification lines.
- **Estimate:** 3 days. Confidence: medium.

### 8. Monthly report
- **Promise:** calls from the profile, direction requests, clicks to the site, new reviews, once a month
  (SB 20, 62; TS 15, 155).
- **State: MISSING.** No code calls Google's profile performance data anywhere in `src/` or `scripts/`.
- **Left:** fetch the three numbers plus the review count; a report template; a monthly scheduled send; Hebrew.
- **Depends on:** the Business Profile Performance API switched on in WAO's Google Cloud project (a separate switch
  from the one already working; not verified); capability 5; Tamar → Noa.
- **Timing fact:** no client is owed a report until about 30 days after his first payment.
- **Estimate:** 3 days. Confidence: medium.

### 9. Profile link on the site
- **Promise:** the site shows a link to the Google profile (SB 14).
- **State: MISSING as a visible link.** The address appears only in hidden structured data
  (`src/lib/lp/renderSitePages.ts:317, 328`).
- **Left:** render it in the page; one Hebrew label from Tamar.
- **Estimate:** 0.5 day. Confidence: high.

### 10. Intake chat (`/site-bot/start`)
- **Promise:** it starts with a few questions in a chat; details are pulled from Google (SB 14).
- **State: GATED.** Built (`src/app/(app)/site-bot/start/StartPaidFlow.tsx`), shown only off-production
  (`start/page.tsx:14`), and production redirects the URL to `/site-bot` (`next.config.ts:396-400`).
- **Left:** (1) the owner's own email and mobile are never asked; the phone comes from the Google listing only
  (`src/lib/site-bot/startIntake.ts:159`), so receipts, the cancel link, review drafts and the report have nowhere to
  go; (2) the domain question (capability 2); (3) a confirmation step for licence claims; (4) production switch and
  the guard tests updated, not deleted.
- **Estimate:** 1.5 days. Confidence: medium-high.

### 11. Checkout and recurring billing (Takbull)
- **Promise:** ₪199 + VAT a month, charged at sign-up and monthly on the same date, automatic tax invoice
  (SB 5, 39, 50; TS 61, 65).
- **State: engine BUILT, provider MISSING.** The plan, the monthly charge run, the retry schedule and the pause are
  in code (`src/lib/payments/plans.ts:39-52`, `cron-charge.ts:371-436`). Every Takbull call throws
  (`src/lib/payments/providers/takbull.ts:61-137`); production falls back to a mock provider
  (`get-provider.ts:25`); checkout returns 503 in production (`checkout/init/route.ts:7`). The VAT rate is marked
  unconfirmed (`plans.ts:22-24`).
- **Left:** wire five calls from Takbull's real documentation (payment page, callback check, charge a saved card,
  refund, invoice); replace the mock card form; confirm the charge job is installed on the server; one real ₪ charge
  and one real renewal.
- **Depends on:** the founder. Takbull documentation, test and live keys, and the old "CCode=3" decline resolved.
  This is the single largest external dependency.
- **Estimate:** 3 days after the documents arrive, plus 1 day to open the flow in production. Confidence: low on
  the date, medium on the effort.

### 12. Cancellation and copy buyout
- **Promise:** cancel online any time, effective at the end of the paid month; site stays 30 days; buy a copy, free
  after 12 months (SB 50, 56; TS 63, 69–79).
- **State: cancel BUILT, the rest MISSING.** Self-serve cancel works in code (`src/lib/payments/subscriptions.ts:373-450`,
  finalised at `:478-507`). The pro-rata refund is calculated (`refund.ts:110-111`) but never sent to a provider.
  Nothing takes a site down after 30 days, nothing exports a copy, no notices are sent, and the terms give no price
  for the copy.
- **Left:** a dated take-down reminder for staff; a "download the site" export (the deploy already renders the
  files); notices on cancel day and before take-down; removal of WAO's manager access (manual).
- **Depends on:** the founder for the copy price; the lawyer for "12 months as a customer" (TS 79) against "paid 12
  months" (SB 56).
- **Estimate:** 1.5 days (0.5 if take-down and export stay manual at first). Confidence: medium-high.

### 13. Written support, AI-first
- **Promise:** terms give an email address and an estimated answer within 24 hours on business days (TS 161). The
  page offers a talk with the founder before starting (SB 7, 44, 66).
- **State: PARTIAL.** A pre-sale help intake exists behind its own switch
  (`src/app/api/site-bot/help-request/route.ts:32`). There is no support channel for paying clients and no AI triage.
- **Left:** a support box on the account page; AI drafts the answer from a product fact sheet; staff approves at
  first, with automatic sending for routine questions later; escalation to the founder only when needed.
- **Conflict to settle:** the founder's rule (written only, no 24-hour or direct-access promise) against TS 161,
  which names his personal address and a 24-hour estimate.
- **Estimate:** 2 days (1 for inbox plus AI draft only). Confidence: medium.

### Integration and proof
End-to-end rehearsal on the test client, one real profile, one real domain; verifier, UX and Noa passes; deploys.
**3 days** for the full launch, **2** for the minimum.

### Totals

| | Engineer-days |
|---|---|
| Full launch: capabilities 1–13 plus integration | about 32 |
| Minimum launch: 1, 2 (hand-run), 3, 4 (v1), 6, 9, 10, 11, 12 (manual parts), 13 (inbox), integration | about 15 |

## (a) Realistic full-launch date: Sunday 20.12.2026

- 32 engineer-days ÷ 1.5 a day ≈ 21–22 working days from Sunday 15.11 → Monday 14.12.
- Plus about one week for the first real client to pass through every step once, including a 3-business-day domain
  move and a live reply post.
- Confidence: medium-low. The estimate is sound for the code; the date is hostage to Takbull and to how Google
  treats live profile edits.

## (b) Minimum launch: Sunday 29.11.2026

**Scope:** service-tree site with human check; WAO address in one business day or own domain in three; visible
profile link; review-request message; intake; ₪199 checkout; online cancel; written support box; change requests by
message (handled by staff).

Two ways to handle what is not automated yet. Same date for both.

**Variant B1, lines come off the page until the full launch:**

| Key in `SB` | Line | What comes off |
|---|---|---|
| `parts.reviews.body` | 18 | The sentence about receiving a draft reply for approval. |
| `faq[6].a` | 60 | The second "small action" (approving a draft reply). |
| `monthly.body` | 20 | The opening sentence about the monthly report. |
| `faq[7]` | 61–62 | The whole question and answer about the report. |
| `parts.profile.body` | 16 | The claim of identical services, areas and hours, unless staff aligns each profile by hand at onboarding. |
| `faq[0].a` | 48 | "Updated Google profile with full details", on the same condition. |

Cost of B1: the terms promise reply suggestions and a monthly report as well (TS 15, 155), so the terms would need
a matching change through the lawyer. The H1, title and hero badge are SEO anchors and stay; any change there needs
Yonatan's sign-off.

**Variant B2, nothing comes off; a capped pilot delivered partly by hand (recommended):**
- Cap the first intake at about 10 clients.
- Staff, invited as manager, aligns each profile in Google's own screen (about 30 minutes each), drafts replies with
  AI when Google's notification arrives, and sends them to the owner for approval.
- The first monthly report is not owed until about 29.12, after the automation is due.
- The page and the terms stay true as written, and the automation is built behind real clients instead of guesses.
- Cost: roughly 1.5 hours of staff time per client at onboarding and half an hour a month, until 20.12.

**If Takbull is not ready by 24.11:** the mission brief already allows hand invoicing for the first clients. Then
"cancel online" (SB 50) and "automatic tax invoice" (TS 65) are not true for those clients and must be handled with
them in writing. The alternative is to move the minimum launch day for day with Takbull.

**The stamp:** it reads 19.11 on the live page today. It should change before that date. Recommended: set it to the
minimum-launch date only once Takbull has taken one real charge. The change is a Tamar → Noa patch, not an engineer
edit.

## (c) Build order

| Step | Work | Days | Running total |
|---|---|---|---|
| 0 | Founder items below, in parallel with step 1 | — | — |
| 1 | Intake: owner contact, domain question, licence confirmation (cap. 10) | 1.5 | 1.5 |
| 2 | Site truth: scoped-promise fix, re-check price table and licence; visible profile link (cap. 1, 9) | 2.5 | 4 |
| 3 | Takbull wiring, real pay page, one live charge and renewal; open the flow in production (cap. 11) | 4 | 8 |
| 4 | Hosting: per-client site address, own-domain attach (hand-run), timed sub-domain run, paid-queue alert (cap. 2, 3) | 3 | 11 |
| 5 | Review-request kit; support box with AI draft; change requests by message v1; cancel notices (cap. 4, 6, 12, 13) | 4 | 15 |
| | **Minimum launch: rehearsal, verifier, Noa, deploy → 29.11** | 2 | 17 |
| 6 | Manager-invite connection and location match (cap. 5) | 2 | 19 |
| 7 | Site-to-profile sync: services, areas, hours, read-back, approval screen (cap. 5) | 2.5 | 21.5 |
| 8 | Review poll on a schedule, drafts for all reviews, owner approval link, live post (cap. 7) | 3 | 24.5 |
| 9 | Monthly report (cap. 8) | 3 | 27.5 |
| 10 | Own-domain automation, take-down timer, site export, refund through Takbull (cap. 2, 12) | 3 | 30.5 |
| 11 | Support auto-answers for routine questions (cap. 13) | 1 | 31.5 |
| | **Full launch: first real client through every step → 20.12** | 1 | 32.5 |

Step 3 can only start when Takbull's documents arrive; steps 1, 2 and 4 do not wait for it. AI patching of change
requests (capability 4, version 2, 3 days) is after the full launch.

**Critical path, minimum:** Takbull documents and keys → provider wiring → one real charge → production switch.
**Critical path, full:** WAO manager account → invite flow → live profile write → reply posting → report.

## Needed from the founder

**Accounts and credentials (by 17.11 to hold the dates)**
1. Takbull: API documentation, test and live keys, confirmation that saved-card charging is enabled and the old
   decline is resolved, and whether Takbull calculates VAT itself (rate in code: 18%, marked unconfirmed).
2. Google: the Business Profile Performance API switched on in the Cloud project; the one WAO Google account that
   owners will invite as manager; approval to switch live profile calls on in production; one real profile for live
   write tests (WAO's own is the safe choice).
3. Cloudflare: an API token that may add new domains, not only records under `wao.co.il`.
4. A real `.co.il` test domain with registrar access, for the own-domain rehearsal.
5. If owners are to be notified by WhatsApp: Meta-approved message templates. Otherwise decide "email only".

**Decisions**
6. The new stamp date, and variant B1 or B2.
7. The pilot cap.
8. The price of the site copy before 12 months (the terms have none).
9. Support: the address clients write to, and whether "talk to Eitan" stays as a pre-sale button under the
   written-only rule.
10. The turnaround time to state for change requests.
11. Hand invoicing for the first clients if Takbull is late: yes or no.

**Legal (lawyer)**
12. TS 131 promises no model training on paid commercial tracks; our note on the Qwen plan says its terms allow
    input use for model improvement.
13. Gemini is called in the pipeline but is not in the sub-processor list (TS 109–118, 135).
14. TS 161 support wording against the written-only, no-24-hour rule.
15. TS 79 "12 months as a customer" against the page's "paid 12 months"; no price for the copy.
16. TS 15 "requests to leave a review" does not say the owner sends them; the product rule is that WAO never
    contacts the owner's customers.
17. TS 3 "last updated 11.11.2026" is stale; §6 changed on 12.11.

**Copy needed (briefs for Tamar, not written in this read-only task)**
Stamp date; profile-link label; review-request message; reply-draft prompt examples for positive reviews and the
owner notification; monthly report template; intake lines for contact, domain and licence confirmation; support and
change-request box lines; cancel and take-down notices; the B1 line removals if that variant is chosen.

## Top risks

1. **Takbull.** The integration has never produced one successful response; every call throws today. It depends on
   a third party and on the founder's time. It gates both dates.
2. **Own domain.** Never run end to end, and a mistake in the DNS move breaks the owner's email, which is worse
   than no site. The 3-business-day promise is live on the page now.
3. **Live Google writes and manual load.** Reply posting and profile edits have never been exercised on a real
   profile, the invite flow is unbuilt, and Google may hold edits. Meanwhile the one-business-day promise, the
   human check on every site and the by-hand pilot work all draw on the same few staff hours.
