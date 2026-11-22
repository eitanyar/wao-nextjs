# Mission: Ads Bot, path to the first paying client (pilot)

Created 2026-11-22. Sources: read-only readiness audit of the Ads Bot against HEAD 6eff1db (re-run of
`claims-ledger-2026-11-12.md` section A), two Fable 5.2 consults (account verification, then this path).
Fable's picks below are PROPOSALS until Eitan confirms; items marked DECISION need his yes.
Full Fable answers: scratchpad files fable-answer2.md, fable-answer3.md (session-local; the content is below).

## Outcome

A hand-held pilot of 1-3 Ads Bot clients, launched from the admin side by Adam/Eitan. Not an open launch.
Before client #1 pays, three things must be true: (1) live mode is locked per client, (2) the client really owns
the Google account (admin invite, own payments profile, verification tracked), (3) the Ads Bot terms are published.
Payment for the pilot is taken by hand through Takbull's own back office (no API wiring needed), pending Takbull's answer to question 9.

Open launch (self-serve checkout, automatic billing, phase-2 auto-switch) is explicitly out of scope; it is weeks of work.

Key facts the work rests on:
- The payment gateway is NOT the only gap. Takbull adapter is a stub (every method throws), mock provider is default,
  `/api/checkout` and `/api/subscriptions/create` return 503, `plans.ts` has only `site-bot`, `BillingPlan.id` is typed `'site-bot'`.
- Google Advertiser Verification follows the CLIENT's payments profile, not WAO's manager account (Fable, Google pages fetched 2026-11-22).
  Founder living abroad is irrelevant to client verification. Verification will reach every client account eventually; a missed deadline pauses the account.
- Nothing submits a business name or logo to Google. Google-side logo/name is DROPPED (new accounts are ineligible anyway).
- Nothing in production calls `create-campaign`; a new sign-up has no client record or session. The pilot provisions by hand from the admin side.

## Files

Engineer batches, strictly serial (one writer at a time):

| # | Work | Size | Owner | Depends on |
|---|---|---|---|---|
| 0 | Clean the working tree: commit or stash the dormant logo/gallery build (untracked/dirty: `intakeUploads.ts`, `intakeUploadStrings.json`, `adsLpUploads.ts`, `adsLpImages.ts`, tests, edits to `bot/route.ts`, `create-campaign/route.ts`, onboarding page, `renderStaticHtml.ts`, `LandingPage.tsx`, `lp/[slug]/page.tsx`, `cloudflare-pages/deploy/route.ts`, `next.config.ts`, `tsconfig.test.json`). Explain `data/clients/aasada/google-ads/brand-cpl-baselines.json` (emptied to `{}`, live data, restore blocked earlier; restore only with Eitan's go). | S | Adam | - |
| 1 | Live gate (see Decision D) with tests for all six routes | M | Engineer | 0 |
| 2 | Safety batch: sanitize AND authenticate `/api/upload` (sessionId path traversal, currently unauthenticated, writes into `public/uploads`); remove screenshot fallback in `adImageSourceUrls` (`src/lib/google-ads/intakeUploads.ts:187`, and the inline copy in `create-campaign/route.ts`); delete false onboarding banners (`onboarding/page.tsx:1164` "page built automatically after payment", `:1177/:1196` "campaign is live, check your email" in COMPLETED, reachable via the "fully booked" branch `bot/route.ts:684-690`); apply Tamar's Arabic-letter patch at `bot/route.ts:621` | S | Engineer | 1, P1 |
| 3 | Billing behind `ADS_BOT_CHECKOUT_ENABLED`, mock provider: widen `BillingPlan.id`, `ads-bot` plan (249 net, sign-up anchor, Site Bot dunning), checkout route/callback/page (price, VAT, total, terms link, consent checkbox), pay link in the post-approval email, Ads Bot cancel hooks (staff alert to pause, 30-day LP date, MCC unlink reminder), provider conformance suite run on mock now / Takbull sandbox later, Takbull field mapping isolated in one file (no guessed fixtures) | L | Engineer | 2 |
| 4 | Ownership: send `email_address` + `access_role: ADMIN` in `createCustomerClient` (`create-campaign/route.ts:576`), store invitation, poll job + admin view (see Decision D) | M | Engineer | 3, P4 |
| 5 | `/google-ads/terms` page mirroring `src/lib/legal/siteBotTerms.ts` from `docs/legal/ads-bot-terms-of-use.md`, built unpublished | S | Engineer | P1 |
| 6 | Budget floor: code table in `bot/route.ts:104-124` to 1,500 (prompt table `prompts.ts:351-363` already says 1,500) | S | Engineer | P2 |
| 7 | Verify each batch; one sandbox read-back and one accepted verified-lead upload | S each | Roni | each batch, P4 |

Parallel, non-repo or copy work:

| # | Work | Owner |
|---|---|---|
| P1 | Copy patches via waocopy: terms section 7 sentence, replacement banners, Arabic-letter fix, checkout + consent strings, pay-link email, Hebrew written verification guide (client completes Google's task from a link we send) | Tamar |
| P2 | Confirm 1,500 floors and raised budgets, web-verified and dated | Dror |
| P3 | Google Cloud: check Data Manager OAuth client publishing status; if "Testing" with External user type, refresh tokens last 7 days and uploads die silently; switch to Production | Eitan |
| P4 | Create a Google Ads test manager account and refresh token (`GOOGLE_DATAMANAGER_TEST_REFRESH_TOKEN`, free) | Eitan |
| P5 | Send the Takbull email (12 questions below) | Eitan |
| P6 | Name 1-3 pilot candidates; say go on publishing terms | Eitan |

Defer until after client #1: Takbull API wiring, in-bot checkout link, phase-2 auto-switch (do by hand; must exist before any client reaches the threshold ~day 45 and needs the bidding consent clause first), logo/gallery go-live, landing-page copy purchase, automatic 21/30-day refund triggers (admin reminder at day 14 is enough), Data Manager automation beyond the one proven upload.

## Constraints

- One writer at a time in `/home/eitanya/wao`. Read-only agents may run in parallel.
- NEVER run `npx vitest` (it emptied live client data). Tests are `npm run test` only; build is `npm run build -- --webpack` (use `WAO_DEPLOY_DIST_DIR=.next-<name>`), serially.
- `data/clients/` is live production data: no writes. Check `git diff data/clients/` after any run that could touch it.
- Hebrew is never authored by the engineer: byte-exact `old -> new` patches from waocopy (default Opus 5.5), Python `str.replace` with asserted counts. Check served HTML for no CJK/Cyrillic/Arabic. The existing Arabic-letter bug at `bot/route.ts:621` (`אני אشرح`) is fixed by Tamar's patch.
- `knowledge.ts`: surgical Python only. SEO anchors need Yonatan sign-off.
- Deploy only after verifier PASS; commit and push first. Batch small fixes with the next milestone.
- Written support only, no calls, no 24h promises. Terms line ~201 ("chat with Eitan, reply within 24h") conflicts and needs a wording fix.
- Do NOT use Google's "complete the task for your client" option (client documents never reach WAO).
- Dirty-tree rule: Adam resolves item 0 BEFORE the engineer starts item 1.

### Decisions (Fable's proposals, Eitan to confirm)

**DECISION C, charge anchor: charge at sign-up, monthly on the same calendar day; the 30-day guarantee clock still starts at first impression.**
The engine supports only this anchor, terms section 7 (21-day refund from fee-paid date) and the page FAQ already assume it, and the 21-day full refund covers Google delays. Intent for waocopy: terms section 7 replace "the charge is made at the start of each month" with "the first charge is made on the day you sign up, then every month on the same day of the month"; checkout page gets one line saying the 30-day money-back period starts when the first ad goes on air, not at payment. Page FAQ unchanged.

**DECISION D, live gate: both layers, plus admin-only creation.**
1. `GOOGLE_ADS_ENABLE_LIVE_MODE` stays as the global kill switch.
2. `resolveGoogleAdsMutationAccess` (`src/lib/google-ads/access-policy.js:29`) additionally requires the client's readiness record to be complete, else 403 (covers all six mutation routes at once). Today the record is written admin-only but never read by any mutation route.
3. Live `create-campaign` also requires the admin cookie. Budget, status, negatives stay open to the client's own session once the record is complete.

**DECISION D2, ownership model: WAO creates the account under its MCC and invites the client as ADMIN; change the readiness model to match** (today it assumes the client creates the account and invites WAO, which contradicts `createCustomerClient`). Readiness keys become:
- polled automatically: account created with client admin, invite accepted, billing approved (client adds his own card in Google's screen; the API cannot), verification status via `getIdentityVerification` (google-ads-api 24.1.0 has it; cache, rate-limited; empty response = no mandatory verification),
- set by the system: fee paid, terms + autonomy consent recorded (checkbox + terms version + timestamp),
- ticked by admin: approval contact confirmed.
Admin page shows these plus a day-14 warning when Google checks are still open; first-impression date is recorded by the poll. Whether the verification call also reflects payments-profile checks is unproven; billing-setup status is the fallback signal.

**Pilot payment without the API:** Eitan sets up a monthly charge per pilot client in Takbull's own back office (invoice issued there); the subscription is recorded in our DB by an admin action so cancel, dates and refunds are tracked. Depends on Takbull question 9.

**VAT:** code value 18% is right (statutory since 2025-01-01); charge = 293.82 (249 + 44.82). Remaining open point is Takbull question 8 (gross vs net+VAT in `CreateDocument`); get a one-line accountant confirmation, then close the OPEN note in `plans.ts`.

**Refunds (by hand in Takbull during the pilot, recorded through `refund.ts`):** 14-day pro-rata (needs sign-up date); 21-day Google-checks refund (needs fee-paid date + verification status; admin reminder at day 14); 30-day guarantee (needs first-impression date from the poll).

**Cancellation:** online cancel stops future charges at once; service ends at the end of the paid month. In the pilot the standing charge is stopped by hand the same day.

**Prospect meanwhile (waterproofing, Tel Aviv):** business name appears in ad text and landing page from day one; no Google logo/name badge promised; Google will ask him to confirm his card, and possibly ID, directly; his legal name shows publicly as the advertiser (not yet in the terms, add it).

### Takbull email, 12 questions (exact list, Eitan sends)
1. What caused CCode=3 on the test terminal, is it resolved? Please send a test card that completes a charge.
2. API docs or Postman collection: base URL, endpoint paths, request/response fields.
3. Hosted payment page: how to create it, return parameters, how to verify the return is genuine.
4. Can the hosted page save a card without charging, or with a first charge only?
5. Does `ChargeToken` work on our own schedule, independent of `DealType`/`RecuringInterval`?
6. Idempotency or unique-reference field to prevent double charges?
7. Refund by API: full and partial, against which transaction ID?
8. `CreateDocument`: tax invoice per charge automatically, emailed to the client, gross amount or net plus VAT?
9. Can we create a monthly standing charge and a payment link from the back office today, with automatic invoices?
10. Card expiry and declines: which codes are retryable, and is there a webhook?
11. Separate keys/terminals for test and live? Is the 99-shekel tier's 200-document cap per month?
12. Can a token be deleted on request?

## Acceptance

Per batch: focused tests, then `npm run test`, then `npm run build -- --webpack` (serially), scoped lint on changed files, `git diff` shows no unintended Hebrew changes and none of CJK/Cyrillic/Arabic, `git status data/` shows no changes from the run.

Pilot-ready checklist (all must be true before the first client pays):
- [ ] Live mutation routes return 403 unless the client's readiness record is complete; live `create-campaign` requires admin (tests cover all six routes).
- [ ] Admin invite sent at account creation; invite/billing/verification status polled and visible to admin.
- [ ] `/google-ads/terms` published (Eitan's go), section 7 sentence fixed, legal name shown publicly as advertiser line added.
- [ ] Autonomy consent recorded (checkbox, terms version, timestamp).
- [ ] False banners removed; Arabic letters fixed; `/api/upload` sanitized and authenticated; no screenshots as ad images.
- [ ] Budget floor aligned to 1,500, Dror confirmed raised budgets.
- [ ] One sandbox create-campaign read-back (locations + PRESENCE, AI Max off, Search Partners off, CPC cap, call reporting, keyword match types, verified-lead as the only primary goal; unknown city returns 422) and one accepted verified-lead upload confirmed by `scripts/google-ads-upload-diagnostics.mjs --request-id`.
- [ ] OAuth app in Production status; token confirmed not 7-day.
- [ ] Pilot payment path confirmed with Takbull (question 9) or a documented manual alternative.

Only a real end-to-end run proves the rest (Eitan with Roni watching): sandbox campaign + upload; real first client through admin invite, own payments profile (Individual vs Organization, name exactly as on ID, own card, payment-confirmation code), verification task, record which tasks Google opened and which Israeli documents it accepted; real Takbull charge + real tax invoice + refund test; deploy the LP, make a test lead from a real ad click with gclid, mark it real, confirm the conversion in Google Ads in 1-3 days; Fraud Blocker excluding IPs in the live account; auto-tagging on, ad approved, campaign serving, first-impression date recorded; Partner credit eligibility for Israel (assign tier within 20 days); first weekly digest checked against Google Ads.

## Verifier

Roni verifies at runtime after each engineer batch (PASS / FAIL / BLOCKED):
- Live gate: 403 with incomplete readiness, 200 with complete, `create-campaign` 403 without admin cookie (flag off and on, test client only; never against real client data).
- `/api/upload`: traversal attempt in sessionId rejected, unauthenticated call rejected.
- Onboarding: COMPLETED after the "fully booked" answer shows no false banner; no Arabic characters in bot replies when the fallback path is forced; `/google-ads`, `/google-ads/how-it-works`, `/google-ads/onboarding` return 200; the five demo items show.
- Terms page renders, unpublished until Eitan's go.
- Checkout (flag on, mock provider): price, VAT, total, consent checkbox, callback records subscription; flag off returns today's behavior.
- Logo/gallery build stays dormant (strings empty) and pages without new data are byte-identical.

## Audit ledger snapshot (2026-11-22, HEAD 6eff1db) for reference

Fixed since 11-12: offline-conversion timestamp is true UTC; upload outcomes saved and retried; only the verified lead is a primary goal (phase 1 still Maximize Clicks); weekly-digest content (three numbers + 7-day spend), staff-sent; "since 2006"; campaign is created PAUSED; landing-page Fraud Blocker deploys.
Still open or risky wording (all via waocopy, files `docs/copy/google-ads-r2-final-candidate-2026-11-12.txt` -> `landingCopy.generated.ts` / `howItWorksCopy.generated.ts`, terms `docs/legal/ads-bot-terms-of-use.md`):
- "switches by itself" (phase 2) promised on page and how-it-works; evaluator `bidding-graduation.ts` has no caller; page omits the 2-closed-jobs and 45-day-account-age gates;
- flat 15 shekel click cap vs per-trade caps (`cpc-cap.ts`: 20 for locksmiths/dentists, 28/35 lawyers);
- agency "~1,500, six times ours" has no Israeli source; ad-credit "we apply, Google decides" mismatch and nothing tracks credit tier;
- payment timing sentence (terms 72); relevant/not-relevant: "not relevant" is never sent, a money value is (terms 25/114);
- terms 201 support promise (24h, chat with Eitan); terms section 5 lists Qwen/Alibaba but production chat runs on Gemini (not listed); terms 82 promises an automatic tax invoice per charge but invoicing is mock/pending queue; terms section 1 says a business number is collected at sign-up, none is;
- phase-2 bidding-consent clause missing from terms and `AUTONOMY_SCOPE_SUMMARY` (`autonomy-consent.ts:14-18`), pending Eitan's legal decision;
- executor CPL gate uses `all_conversions` (`executor.ts:44,50`), lenient;
- weekly digest cron returns disabled, staff-sent; no Ads Bot cancel notices; no MCC access removal on cancel; no first-impression tracking; no credit-tier alerts; Dror's pre-call intake fields (legal type, name as on ID, own card, own Google account, prior Ads history) not collected;
- A10 fraud blocker inside the Google Ads account unproven; A13 "call" means a tap on the call button.
Post-launch priority queue (memory): after 29.11 phase-2 auto-switch, parked WhatsApp nurture, auto-reply, Ads Bot later items.
