## Outcome

On Wed 25 – Thu 26.11.2026, one person (Eitan, with his own card) goes through Site Bot in **production** exactly as a new client would, and every promise on the route is proven with saved evidence or logged as a named gap. The route is: landing → free audit → intake → Takbull checkout (one real ₪234.82 charge) → site built with Redesign A → live on a WAO sub-domain → moved to a hand-attached own domain → support message → staff queue → online cancel → refund. The result feeds a written go/no-go on Fri 27.11 and a launch on Sun 29.11 that opens by a switch, not by a deploy.

**State of the code today (working tree, 2026-11-13).** Six of the ten rehearsal steps cannot run yet.

| Step | Code today | Status |
|---|---|---|
| Landing `/site-bot`, free audit `/site-bot/audit` | Live. Stamp at `src/lib/site-bot/landingCopy.generated.ts:5`. | EXISTS |
| "Build my site" button on the audit result | Renders only off-production (`src/app/(app)/site-bot/audit/layout.tsx:14`, `paidBuyCta.tsx:24-26`). | GATED |
| Intake with owner contact and domain question | Built (`src/lib/site-bot/ownerIntake.ts:190-228`, re-validated at `src/app/api/site-bot/checkout/init/paid.ts:36`). Page 404s in production (`start/page.tsx:14`) and is redirected (`next.config.ts:396-400`). | GATED |
| Opening the paid flow in production | Nine places hard-code `NODE_ENV !== 'production'` (four `route.ts:7` files under `api/site-bot/checkout|connect-*|prefill`, two layouts, the start page, `next.config.ts:396`). No setting can open it. The `next.config.ts` redirect is baked in at build, so open/close would cost an 18-minute deploy. | **MISSING** |
| Takbull charge, callback, invoice, refund | Every call throws (`src/lib/payments/providers/takbull.ts:61-137`). Default provider is the mock (`get-provider.ts:25`). | **MISSING** |
| Real pay page | The page is a mock form with raw card fields (`src/components/site-bot/SiteBotPayClient.tsx:165-169`). Init drops the provider's `redirectUrl` (`checkout/init/paid.ts:43-56`). | **MISSING** |
| Online cancel | Built: end of paid month, no further charge (`subscriptions.ts:373-422`). The manage link is emailed after payment (`subscriptions.ts:727`). The account page is **English and left-to-right** (`src/app/(product)/account/subscription/page.tsx:29,123,177`). | EXISTS, wrong language |
| Refund | Amount is calculated (`refund.ts:86-115`) and can be recorded (`db.ts:403`). Nothing calls `provider.refund()` (`refund.ts:5-7`). | **MISSING** (execution) |
| Site generation, human check, Redesign A | Admin-only generate (`api/site-bot/generate/route.ts:102-106`), approved copy review required (`deploy/route.ts:302-305`), Redesign A in commits `e2d8c29`, `51e426c`. | EXISTS |
| Shared Worker hosting | Deploy still creates one Pages project per client (`deploy/route.ts:324, 449-460`). `workers/`, `scripts/site-hosting/`, `src/lib/site-hosting/` do not exist. | **MISSING** |
| Own-domain attach, lead form on owner domain | No attach script. Lead form accepts only `*.wao.co.il` origins (`src/app/api/lead/route.ts:5`). | **MISSING** |
| Paid-queue alert to staff | No code found in `src/`. | **MISSING** |
| Support / change-request box and staff queue for paying clients | None. Edit returns 503 (`api/site-bot/edit/route.ts:1-7`). Only the pre-sale help intake exists (`api/site-bot/help-request/route.ts:32`, `admin/site-bot-help/page.tsx`). | **MISSING** |
| Monthly charge job on the server | Script exists (`scripts/cron/charge-subscriptions.sh:12-15`). Whether it is installed in the server crontab is unverified. | UNVERIFIED |

## Files

Item 10 writes almost no product code. It needs these:

| File | Change | Owner item |
|---|---|---|
| `src/lib/site-bot/paidFlowGate.ts` (new) + test | One runtime helper `paidFlowMode()` reading `SITE_BOT_PAID_FLOW` at request time: unset = closed, `rehearsal` = open only to a browser with a valid admin cookie (`verifyAdminToken`, as in `deploy/route.ts:214-215`), `open` = public. Replace the nine hard-coded checks with it. Remove the `next.config.ts:396-401` entry and redirect from the page/layout instead. Update `paidFlowGate.testkit.mjs` and the guard tests; do not delete them. | Item 7 ("open the flow in production"); prerequisite for item 10 |
| `scripts/rehearsal/evidence.mjs` (new) | Read-only. Takes `--slug`, `--domain`, `--out`. Saves status codes, headers, canonical, sitemap host, `x-wao-site`, certificate issuer, DoH MX/TXT, and the regression greps below into the evidence folder. No writes outside `--out`. | Item 10 |
| `docs/qa/rehearsal-2026-11-25/RUNLOG.md` (new) | One row per step: time, actor, result, evidence file, defect id. Commit the log only; screenshots stay uncommitted. | Roni |
| `docs/missions/go-no-go-2026-11-27.md` (new) | The filled checklist from the Acceptance section. | Adam |
| `src/app/(product)/account/subscription/*` | Hebrew, right-to-left labels applied as byte-exact patches once copy exists (brief below). | Engineer, 0.25 day |

Test identity for the run (the only names allowed to write data):
- Slug **`test-rehearsal-2511`**, passed explicitly to generate (`generate/route.ts:119-122`).
- The deploy creates `data/clients/test-rehearsal-2511/client.json` (`deploy/route.ts:494-504`). This is the one permitted write to `data/clients/`.
- Own domain: the founder's test `.co.il` (due Tue 17.11).
- Evidence folder: `docs/qa/rehearsal-2026-11-25/`.

**Copy briefs for waocopy (Tamar → Noa), needed by Sun 22.11.** No Hebrew is authored in this spec.
1. **Account page.** Persona: a tradesman who just paid, or wants out, on his phone. Angle: calm and factual; cancelling takes two taps and nothing is hidden. Where: every label and message in `account/subscription/page.tsx` (status names, amount, card, next charge, access-until, cancelled confirmations, expired or used link, request-a-new-link form) and the cancel and card-update buttons. Singular male.
2. **Post-payment email with the manage/cancel link** (`subscriptions.ts:727`, `email.ts:87`). Same persona. Angle: "you're in, here is what happens next, here is where you manage it". Noa checks the current text first; brief only if it is English or stale.
3. **Refund and cancel replies for staff** (two short templates sent from the support queue). Angle: confirm amount and date, no apology theatre.

## Constraints

- Production only for the charge. No real card on staging, no mock provider anywhere in the evidence.
- The public must not see the paid flow before Sun 29.11. Rehearsal mode shows it only to a browser with the admin cookie.
- `data/clients/`: only `test-rehearsal-2511`. After each day run `git diff --stat data/clients/` and `git status data/clients/`; anything else is a FAIL.
- One writer in the repo. Roni, Maya, Noa and Yonatan are read-only. Defects go to Adam, who batches them into one engineer run per half-day.
- No Hebrew typed by the engineer or by this runbook. Every new string arrives as a patch after Noa.
- Title, H1 and hero badge on `/site-bot` and on the generated site stay byte-identical unless Yonatan signs.
- The rehearsal site describes a real business. It is suspended (Worker `status: suspended`, hosting design step 4) or its DNS record is removed within 24 hours of the go/no-go, so Google does not index a test.
- We never touch the test domain's name servers, MX or TXT. The only owner-side record is `www CNAME sites.wao.co.il`.
- Build with `npm run build -- --webpack`; deploy with the command in `CLAUDE.md`; allow 18 minutes per deploy. Last deploy slot before launch: Thu 26.11 evening.
- **External facts, fetched 2026-11-13:**
  - Cloudflare, hostname validation (page dated 19.06.2026): a custom hostname is ready for production when it has `status: active`, `ssl.status: active` and DNS pointing at the SaaS target. https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/hostname-validation/
  - Cloudflare, HTTP certificate validation (page dated 15.10.2026): validation is automatic once the hostname points at the target, but "the hostname may route to Cloudflare before the certificate reaches `ssl.status: active`". No issuance time is stated, so the 2-hour limit below is ours. https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/validate-certificates/http/
  - Cloudflare for SaaS plans (page dated 14.08.2026): 100 hostnames included, $0.10 each after; apex proxying and wildcard hostnames are Enterprise only. https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/
  - Takbull: two web searches on 2026-11-13 found **no public API documentation**. Every Takbull statement here is unverified until the founder's documents arrive. Nothing in the rehearsal calls a Google or Meta API (profile work is by hand in pilot variant B2).

## Acceptance

### A. Entry criteria (Tue 24.11 EOD). If one fails, that step runs its fallback.

| # | Must be true | If not |
|---|---|---|
| E1 | `PAYMENT_PROVIDER=takbull` and `INVOICE_PROVIDER=takbull` have produced one real successful charge and one invoice | Trip-wire branch (section C) |
| E2 | `paidFlowGate.ts` deployed; `SITE_BOT_PAID_FLOW=rehearsal` set on the server | Rehearse on a second production process on a hidden hostname; the open/close drill (S19) cannot pass |
| E3 | Worker provisioned; `zone-route-audit.mjs` passes; main site and mail hosts unchanged (hosting acceptance 1–2) | Sub-domain step runs on the old Pages path; own-domain step is BLOCKED |
| E4 | `attach-domain.mjs` exists; lead CORS accepts owner hosts; test `.co.il` and registrar login in hand | Own domain becomes a named launch gap (section D, gate G6) |
| E5 | Paid-queue alert and the support box + staff queue deployed | Fallbacks in S8 and S15 |
| E6 | Account-page Hebrew applied; Noa passed all new strings | Launch with the page as is only if the founder accepts it in writing |
| E7 | Monthly charge job installed: `crontab -l` on the server shows the line from `charge-subscriptions.sh:14-15` | Install it; not a rehearsal blocker, a launch blocker |
| E8 | `npm run test` and `npm run build -- --webpack` green on the commit to be rehearsed | No rehearsal on a red tree |

### B. The run

Owners: **Roni** runtime evidence, **Maya** phone/RTL/accessibility, **Noa** Hebrew, **Yonatan** search correctness, **Eitan** acts as the client and owns money and DNS. Adam keeps the log and routes defects.

| # | When | Action | Evidence | PASS when | Owner | Fallback |
|---|---|---|---|---|---|---|
| S0 | Wed 08:30 | Record baseline: commit hash, server env names (not values), `curl -sI` of `wao.co.il`, `www`, `mail.wao.co.il`; `git status data/clients/` | `00-baseline.txt` | Clean tree, env set, baseline saved | Roni | Fix before starting |
| S1 | Wed 09:00 | On a phone, signed out, open `/site-bot`. Read the page top to bottom. | Screenshots at 390px and desktop; HTML saved; title and H1 strings | 200; ₪199 shown; stamp says 29.11 pilot; no placeholder text; title/H1 byte-identical to Yonatan's sign-off; no CJK/Cyrillic/Arabic characters | Maya, Noa, Yonatan | Copy defects → patch; anchor change → stop, Yonatan |
| S2 | 09:10 | Run the free audit with the rehearsal business name | Screenshot of result; time to result; audit id | Result in under 15 s; "build my site" button visible **only** in the admin-cookie browser, absent in a clean browser | Roni | Button missing → E2 failed; enter `/site-bot/start?auditId=…&placeId=…` by hand and log a defect |
| S3 | 09:20 | Intake chat: answer every question; give Eitan's own mobile and email; choose "I have a domain" and type the test domain with `https://www.` and a path, to exercise clean-up | Screenshots of each step; `data/sites-pending/{session}.json` (redact contact) | Record holds `ownerContact` in E.164 + email, `domainChoice: has_domain`, `ownerDomain` bare (`ownerIntake.ts:136-155`); owner's private contact appears on no public page later (grep in S9) | Roni, Maya, Noa | Field missing → engineer fix same day; do not continue to payment with a wrong record |
| S4 | 09:40 | Pay page: read price, VAT line, terms link, domain line. Then pay with Eitan's real card on Takbull's page. Start a stopwatch at the pay tap. | Screenshot before paying; Takbull transaction id; card statement line; time from tap to success screen; server log lines for the callback | Charge = ₪234.82 once; success screen in Hebrew; no raw card field on a WAO page; callback answered before any proxy timeout. Watch point: research runs inside the callback request (`checkout/callback/paid.ts:71-78`) | Eitan, Roni, Noa | Screen hangs → do **not** tap again; reload once (replay is safe: `callback/paid.ts:39-47`, `subscriptions.ts:616-618`). Double charge → refund in Takbull's dashboard at once, NO-GO for checkout |
| S5 | 09:50 | Check the database row and events for the subscription | `sqlite` dump of the row, `charges`, events (token redacted) | Status `active`, `periods_paid = 1`, next charge 25.12, provider `takbull`, token stored encrypted | Roni | Mismatch → engineer; charge already taken, so continue the run |
| S6 | 10:00 | Check Eitan's inbox: tax invoice and the manage/cancel email | Both emails saved as PDF; headers | Invoice arrives within 15 min with ₪199 + ₪35.82 VAT and WAO's legal details; manage email is correct Hebrew, link opens the account page | Eitan, Noa | No invoice → `INVOICE_PROVIDER=pending-queue` (`get-invoice-provider.ts:27-36`) and staff issue it from Takbull's back office the same day; terms line TS 65 then needs the founder's call (gate G3) |
| S7 | 10:05 | Answer the research questions shown after payment, if any | Screenshots | Each answer saves; final message shown; manage link visible (`SiteBotPayClient.tsx:251-257`) | Roni, Noa | Gate error → retry once, then staff complete from the admin side |
| S8 | 10:10 | Staff side: did the "paid, waiting for build" alert arrive? Note the time. | Alert screenshot with timestamp | Alert within 5 min of payment, naming the business and the planned host | Roni | No alert code → pilot rule: Adam checks the subscriptions table at 09:00, 13:00 and 17:00 on business days; log as a gap |
| S9 | Wed by 15:00 | Staff generate with slug `test-rehearsal-2511`, review copy at `/admin/site-bot-copy-review`, approve, deploy | Generate and deploy responses; R2 object count; time stamps | Deploy 200; site record bound to the dossier; no unverified-claim blocker (`deploy/route.ts:308-309`) | Roni; Noa reads the generated copy | Generation fails → rerun once; second failure is a defect, clock keeps running |
| S10 | Wed by 17:00 | Open `https://test-rehearsal-2511.wao.co.il` on a phone and desktop | `evidence.mjs` output; screenshots; Lighthouse mobile; bidi grep from `CLAUDE.md` | 200 with `x-wao-site`; unknown path → 404 page; `/about.html` → 301; `http` → 301; Redesign A visible (solid hero, header call button hidden on mobile, visible profile link); bidi grep = 0; no foreign-script characters; **payment → live under one business day** | Roni, Maya, Noa, Yonatan | Worker not ready → deploy on Pages (current path) and mark hosting as gap G5 |
| S11 | Wed 17:00 | Submit the lead form and tap the call button on the sub-domain site | Lead row in the client dashboard; screenshot | Lead appears within 1 min under `test-rehearsal-2511` | Roni | Lead lost → launch blocker; fix before anything else |
| S12 | Wed 12:00, parallel | Own domain: run `attach-domain.mjs --precheck`; Eitan adds the one `www` CNAME at the registrar; staff create the custom hostname | Precheck output; registrar screenshot; MX/TXT snapshot before | Precheck clean or findings understood; snapshot saved | Eitan, Roni | Registrar refuses the CNAME → record the registrar name and stop; own domain = gap G6 |
| S13 | Wed–Thu | Poll until live, then redeploy with the owner domain as canonical | Hostname JSON; `/__wao/health`; certificate issuer; MX/TXT after; canonical, sitemap, schema hosts | `status: active` and `ssl.status: active`; health returns the slug over a valid certificate; MX/TXT byte-identical; canonical, `og:url`, sitemap and schema carry `https://www.{domain}`; sub-domain now 301s to it; time from CNAME to live recorded | Roni, Yonatan | Not active after 2 h → one no-change PATCH (hosting design, owner flow step 2); not active by Thu 12:00 → gap G6 |
| S14 | Thu 10:00 | Lead form from a phone on `www.{domain}`; also try the bare domain and note what happens | Lead row; screenshot of the bare-domain result | Lead arrives (CORS fix proven); bare-domain behaviour written down for the owner instructions | Roni, Maya | Lead blocked → own domain is NO-GO for launch even if DNS passed |
| S15 | Thu 10:30 | As the client, send one support question and one change request ("change the opening hours") through the message box | Screenshots of form and confirmation; queue entry; time stamps | Both appear in the staff queue within 1 min with client, slug and text; confirmation is correct Hebrew and promises no response time the founder has not approved | Roni, Noa, Maya | Box not built → interim: the manage email carries a support address the founder names; requests logged by hand; page line "changes by one message" becomes gap G7 |
| S16 | Thu 11:00 | Staff apply the change through generate → review → deploy and reply | New version id; live page; reply text | Change live within 60 s of deploy; other tenants' objects untouched; reply sent | Roni, Noa | Redeploy fails → pointer back to the previous version (hosting acceptance 7) |
| S17 | Thu 13:00 | Cancel online from the manage link on a phone | Screenshots; row dump; cancel event | Two taps; page shows access until 25.12 and "no further charge"; row has `cancel_at_period_end = 1`, `next_charge_at` empty (`subscriptions.ts:396-421`); site still up | Eitan, Maya, Noa | Link expired → request a new one by email (`RequestLinkForm`); if that fails, launch blocker |
| S18 | Thu 13:15 | Ask for the 14-day pro-rata refund through the support box; staff issue it | Refund request in queue; Takbull refund id; credit document; `recordChargeRefund` row; statement line | Amount equals `calculateRefundableAmount` for the elapsed time (about ₪226 after 28 hours); refund and credit invoice reach Eitan; charge row marked refunded | Eitan, Roni | Refund API not wired → staff refund in Takbull's dashboard and record it with `recordChargeRefund` (`db.ts:403`); acceptable for a pilot of 10, listed as gap G4 |
| S19 | Thu 15:00 | Switch drill: set `SITE_BOT_PAID_FLOW` unset → restart → check; then `rehearsal` again | Times; curl of `/site-bot/start` and `POST /api/site-bot/checkout/init` in each state | Closed state: page redirects, API 503, audit page has no buy button; each switch under 2 min, no deploy | Roni | Switch needs a deploy → rollback level 1 costs 18 min; founder told before go/no-go |
| S20 | Thu 16:00 | Rollback drill on hosting: flip the tenant pointer back and forward | Before/after ETag and time | Old page back within 60 s; forward again within 60 s | Roni | Fails → no tenant redeploys during launch week without Adam |
| S21 | Thu 17:00 | Close-out: `git diff --stat data/clients/`, defect list, full test and build on the launch commit, launch deploy with the flow closed | Outputs in the log | Only `test-rehearsal-2511` written; tests and build green; deploy healthy | Adam, Roni | Red build → no deploy; previous release stays |

Defect rule: **P1** = money, lost lead, wrong or leaked data, broken Hebrew on a paid screen, main site or mail affected. P1 must be fixed and its step re-run before go. **P2** = everything else; listed in the go/no-go with an owner and date.

> **Adam review note (2026-11-13):** E7 conflicts with the founder update in `docs/missions/execution-order-fable52-2026-11-12.md` ("WAO never charges on a schedule"; Takbull bills the recurring subscription). Resolve during item 7: either the cron job is the engine Takbull recurring calls into, or it must stay uninstalled. Do not install it from this runbook alone.

### C. Takbull trip-wire, Mon 23.11 EOD

Trigger: no real successful charge and callback through our code by Mon 23.11 18:00. Hand invoicing is rejected, so these are the real choices:

| Option | What the client experiences | Cost and risk |
|---|---|---|
| **1. Open without checkout** (recommended default) | On 29.11 the landing, audit and intake are public. At the pay step he sees "your place in the pilot is saved; we'll send the payment link when it opens", and nothing is charged or built. | Date holds, no false promise, no money handled by hand. About 0.5 engineer-day plus one waocopy brief (persona: owner who just finished intake; angle: your place is held, no card needed yet; where: the pay step and one email). Revenue starts later. |
| **2. Takbull's own hosted subscription page** | He pays himself on a Takbull-hosted recurring page that Takbull bills and invoices; we link to it and staff confirm the payment in the queue. Cancel is requested online and staff stop it in Takbull. | Self-serve and not a hand invoice. **Unverified that Takbull offers this**; the founder must ask Takbull by Tue 17.11. "Cancel online" becomes "request online", which needs the founder's approval. About 1 day. Only valid if it can be rehearsed on 25.11. |
| **3. Slip checkout day for day** | Launch moves to the first Sunday after a successful rehearsal charge. | Cleanest product, loses the date. The stamp must change again. |
| 4. Another provider | — | Closed by the standing decision that Takbull is final; only the founder can reopen it, and no provider could be wired and rehearsed in three days. |

If the trip-wire fires: S4–S7, S17 and S18 are marked BLOCKED, every other step still runs on 25–26.11 with the subscription row created by a seeded script on the test slug, and the checkout rehearsal repeats in full on the first day Takbull works.

### D. Go/no-go, Fri 27.11, 10:00 (Adam presents, Eitan decides)

| Gate | GO requires | If not met |
|---|---|---|
| G1 Charge | S4, S5 PASS with a real card | Trip-wire option in force |
| G2 Cancel | S17 PASS | NO-GO for checkout |
| G3 Invoice | S6 PASS, or pending-queue fallback accepted in writing | NO-GO for checkout |
| G4 Refund | S18 PASS by API or by dashboard, amount correct | NO-GO for checkout |
| G5 Sub-domain hosting | S10, S11, S20 PASS; main site and mail unchanged | Launch on the Pages path for the pilot of 10 (14 of 100 projects used) |
| G6 Own domain | S13, S14 PASS | Launch with own domain delivered by hand inside the 3-business-day promise; if S14 failed, intake answer "I have a domain" routes to staff follow-up |
| G7 Support and changes | S15, S16 PASS | Interim address in the manage email; founder accepts the gap |
| G8 Language and layout | Noa and Maya: zero P1 on S1–S17 screens and emails | Fix and re-check before Sunday |
| G9 Search | Yonatan: anchors intact, canonical and 301 correct | Fix before any real client site is deployed |
| G10 Operations | Charge job installed (E7); S8 alert or the three-times-a-day check; S19 switch under 2 min; who is on call 29.11–3.12 | NO-GO |
| G11 Data | `data/clients/` diff shows only the test slug; rehearsal site suspended | Fix |
| G12 Build | Launch commit: tests and webpack build green, deployed Thu, healthy | NO-GO |

Decision recorded in `docs/missions/go-no-go-2026-11-27.md` as GO, GO with named gaps, or NO-GO with the new date. On GO, Sunday 29.11 08:00: set `SITE_BOT_PAID_FLOW=open`, restart, Roni repeats S2 and a `checkout/init` call from a clean browser, then the stamp patch goes live.

### E. Rollback plan

| Level | Trigger | Action | Time | Effect |
|---|---|---|---|---|
| 1 Close the flow | Any P1 in checkout or intake after opening | Unset `SITE_BOT_PAID_FLOW`, restart | 2 min | Landing and audit stay; nobody new can pay. Existing subscribers keep access; cancel and the charge job keep working. |
| 2 Stop charging | Wrong amounts or double charges | Level 1, then disable the crontab line; refund affected charges in Takbull; record each with `recordChargeRefund` | 15 min | No money moves until fixed |
| 3 One client site | Bad deploy of one tenant | Rewrite that tenant's pointer to the previous version | 1 min | Only that site changes |
| 4 The Worker | A Worker bug affecting all sites | `wrangler rollback` to the previous Worker version; smoke every tenant's `/__wao/health` | 5 min | All sites back on the old router |
| 5 Hosting route | Main site or mail hosts affected | Remove the `*/*` Worker route; tenant sub-domains fall through to their DNS targets; run `zone-route-audit.mjs` | 5 min | Client sites may go down; `wao.co.il` and mail are safe. Keep the two test Pages projects for 7 days for this reason. |
| 6 The app | Launch deploy unhealthy | `deploy.sh` restores the previous release on failed activation (`deploy.sh:273`); two releases are kept (`deploy.sh:158-168`) | Automatic, or 18 min for a redeploy | Previous build serves |
| 7 Own domain | Owner's site or mail affected | Owner removes the `www` CNAME (or restores the old value from the precheck snapshot); we delete the custom hostname | Minutes plus DNS TTL | Domain back to its prior state; MX/TXT were never changed |

Customer message for levels 1–2 comes from a waocopy brief prepared in advance (persona: an owner mid-sign-up; angle: sign-up is paused for a short fix, nothing was charged, we'll write when it reopens; where: the pay step and the audit CTA slot).

## Verifier

Roni runs S0–S21 from outside the app (curl, a real phone, the database read-only) and reports PASS / FAIL / BLOCKED per step with the evidence file name. He does not fix. A step with a fallback in use is reported as "PASS (fallback)" and never as a plain PASS.

- **Maya:** S1, S3, S4, S10, S14, S15, S17 at 390px and desktop. Touch targets, focus order under the sticky bar, right-to-left layout of the Takbull return screen and the account page, no horizontal scroll.
- **Noa:** every Hebrew string a client sees on S1–S18, including the two emails, the invoice description and the generated site. Zero placeholders, correct typography.
- **Yonatan:** S1 anchors; S10 and S13 titles, H1s, canonical, sitemap, schema host, the 301 from the sub-domain, and that the suspended test site returns 410 or is gone.
- **Eitan:** pays, edits DNS, reads the emails, and spot-checks the generated Hebrew before it is called launch-ready.
- **Adam:** reports verified evidence separately from the engineer's self-report and signs the go/no-go file.

## Engineer-days estimate

| Work | Days |
|---|---|
| `paidFlowGate.ts`, nine call sites, `next.config.ts` entry, guard tests (if item 7 has not delivered it) | 0.5 |
| `scripts/rehearsal/evidence.mjs` | 0.25 |
| Account page Hebrew patches | 0.25 |
| Fix buffer during the two days | 0.75 |
| Launch deploy, switch drill, Sunday opening | 0.25 |
| **Total** | **2.0** (matches row 10; zero slack if the gate helper lands here instead of in item 7) |

Trip-wire option 1 adds 0.5 day; option 2 adds about 1 day.

## Open founder decisions (with my recommendation)

1. **Trip-wire choice, due Tue 17.11.** Recommend option 1 (open without checkout) as the default, and ask Takbull this week whether option 2 exists. Do not slip the date.
2. **Which business is the rehearsal client.** The audit needs a real Google listing. Recommend a consenting tradesman you know (a real case for the persona); otherwise WAO's own listing. Either way the site is suspended after the go/no-go.
3. **Account page in English at launch.** Recommend fixing it before 29.11 (0.25 day plus one brief); it is the screen behind the "cancel online" promise.
4. **Refund by dashboard for the pilot.** Recommend accepting it for the first 10 clients if Takbull's refund call is not wired by 24.11; build the API call in the first week of December.
5. **If own domain fails the rehearsal.** Recommend launching anyway and routing "I have a domain" answers to staff follow-up, with the 3-business-day promise kept by hand.
6. **Support address and stated turnaround** (already due Thu 19.11). The S15 confirmation cannot be written or checked without it.
7. **Who is on call 29.11–3.12** for the paid queue and rollback levels 1–2. Recommend you and Adam, with the three daily checks as the floor.