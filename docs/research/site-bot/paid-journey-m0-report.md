# Site Bot paid journey v2 — M0 dress rehearsal report

Date: 2026-11-07 · Engineer: Eitan-Dev (nextjs-engineer) · Brief: `docs/missions/site-bot-paid-journey-v2-2026-11-07.md`
Branch `hermes-migration`, base `76812c7`. Isolated dev server `127.0.0.1:4031`, dist `.next-m0`, flag `SITE_BOT_PAID_FLOW=1`.

Evidence (gitignored, `scratch/m0/`):
- Screenshots + per-walk JSON logs: `scratch/m0/shots/{a-mobile-run2,a-desktop-run1,b-mobile-run1,b-desktop-run1}/`
  (each has `walk-log.json` with every API call, status, chat question text as rendered, and visible page text).
- Outbound-call log (every server-side request attempted, blocked or allowed, with payload shape): `scratch/m0/logs/outbound.jsonl`
- Raw LLM outputs from the generate step: `scratch/m0/logs/generate-raw-{1..4}.json`
- Test research dossiers and audit fixtures (moved out of `data/` after the run): `scratch/m0/evidence/`
- Tools: `scratch/m0/tools/{start-server.sh,outbound-guard.cjs,walk.mjs}`

Test businesses (fictional, TEST-marked, fixture audit records; no Places/DataForSEO call):
- **A** `TEST M0 Nowebsite Plumbing`: no website, audit `7730478c-8e6d-46f8-9fdc-ab2598101ad6`.
- **B** `TEST M0 Weaksite Electric`: weak existing site on `m0-weaksite-electric.example`, audit `c6d411e5-3d68-4f91-8f91-aa26ddc9f26b`.
Chat answers were typed in Latin script (the engineer does not author Hebrew), so slugs, vertical detection and Hebrew-keyword parsing behave a little differently than they would for a real owner. Places where that matters are flagged.

---

## 1. Verdict

**Neither business can get from audit to a live site, or even to a preview, and neither path is close.** Both
A and B got through the same steps: audit result → (no buy button, so we typed the start URL directly) →
13-question chat (no pre-fill) → mock payment of **₪9.90 one-time** (not ₪199/mo) → a research question
shown to the customer, whose answer fails with a raw English `unauthorized` (HTTP 401). The customer
journey dead-ends there, **after money has been taken**. Playing the operator by hand got one step further:
research stops at the missing DataForSEO step (blocked by design here). With a hand-built fixture dossier and
brief, the generate step reached the real LLM, but **the copy failed the site-copy validator 4 times out of 4**,
so no site record was produced, so there was no preview to show and nothing to deploy. Deploy, GBP and domain
code exists only as an admin-only pipeline hard-wired to `${slug}.wao.co.il`. **Business B's existing-domain path
does not exist in code at all.** Nothing in the flow captures, uses or protects the client's domain, MX records or old URLs.
The order of the current pipeline is pay → research → (operator) → generate → (operator) review → deploy.
It is the reverse of the approved flow (pre-fill → 3 questions → preview → pay → GBP → human check → live).
M1–M4 are therefore mostly *new orchestration*, not re-enabling existing code.

## 2. Step-by-step

| # | Step | What the persona sees / does | Result | Evidence |
|---|---|---|---|---|
| 1 | Audit result (A, B) | Confirms "that's my business", sees the 6-dimension scorecard, then a help form ("talk to Eitan") | Works (Half 1) | `b-mobile-run1/02-audit-result.png`, `a-desktop-run1/02-audit-result.png`; GET `/api/site-bot/audit-result` 200 |
| 2 | Buy | No buy/build button anywhere on the result. Only the contact/help form | **Break** (by design of the audit-only guard) | `walk-log.json` `audit_has_buy_link: false` |
| 3 | Offer page `/site-bot` | Three CTAs go to `/contact?ref=site-bot-build`, none to the flow; no price | **Break** for this journey | `*/03-offer-page.png` |
| 4 | Start chat `/site-bot/start?auditId=` (typed directly) | 13 questions, one per screen; no pre-fill from the audit | Works mechanically / **friction** | `*/04..07-start-*.png`; GET `audit-result?withPlace=1` 200 but returns no place |
| 5 | Chat → checkout init | The last answer triggers POST `/api/site-bot/checkout/init` → redirect to `/site-bot/pay/<uuid>` | Works | POST init 200 (4×) |
| 6 | Pay page (mock) | "Payment ₪9.90, one-time"; card form pre-filled with `4242…`, `12/30`, `123`; one "pay" button; no site header | **Break** (wrong price model) | `*/09-pay-form.png` |
| 7 | Mock charge → research | POST `/api/site-bot/checkout/callback` 200; mock charge OK, mock invoice issued; research runs; dossier `held` on 2 truth gaps | Works / held | callback 200; dossier `scratch/m0/evidence/site-research/*/dossier.json` |
| 8 | Post-pay research question | Six research-progress lines, then one question about the services | Shown | `*/10-after-pay.png` |
| 9 | Customer answers it | POST `/api/site-bot/research/gates` → **401**, page shows the raw English word `unauthorized`. Customer is stuck, already charged | **Break (dead end)** | `*/11-after-gate-answer.png`, `a-mobile-run2/10-after-gate-answer.png` |
| 10 | (Operator) resume research with full business facts | POST `/api/site-bot/research` (CRON bearer) 200 → `held: provider_outage` "DATAFORSEO_TOKEN is required" | Stopped (no SERP fixture mode) | dossier `62bdfc9f…` |
| 11 | (Operator) generate with fixture `copy_ready` dossier + 1 homepage brief | POST `/api/site-bot/generate` (admin) → **502** `research_generation_failed` after 46 s | **Break** | `outbound.jsonl`; offline repro 3 more attempts, all fail; raw outputs `generate-raw-*.json` |
| 12 | Preview | No customer-facing preview route exists. Nothing to preview because step 11 produced no record | **Break (missing)** | — |
| 13 | GBP connect (B) | POST `/api/site-bot/connect-gbp` with `manager_invite`, a made-up location ID, no auth → 200 `success`; status flips to `isConnected: true` | **Break** (no verification, no auth, no UI) | connect-gbp 200, connect-status 200 |
| 14 | Deploy | Public: 401. Admin: 404 `site_not_found` (no record). Code path would deploy to `${slug}.wao.co.il` only | Stopped / **break** for domain | deploy 401/404 |
| 15 | Existing domain (B): DNS/MX/301 | No field, question, code or document exists | **Break (missing)** | grep: no MX/301/custom-domain code in `src/lib/site-bot`, `src/app/api/site-bot`, renderers |

## 3. Breaks ranked by severity

Size: S ≈ < ½ day, M ≈ 1–3 days, L ≈ > 3 days.

**Blocking: the customer is charged and then stuck, or the flow cannot exist**

1. **Post-pay customer question calls an admin-only API → 401 dead end after charging.** The pay page posts
   to `/api/site-bot/research/gates`, but that route requires the `wao-admin` cookie and the raw `unauthorized`
   string is rendered to the customer. `src/app/(product)/site-bot/pay/[sessionId]/page.tsx:82,108`;
   `src/app/api/site-bot/research/gates/route.ts:58-60`. **M** (needs a customer-scoped token per checkout session).
2. **Order is pay-first; there is no preview-before-pay.** The chat goes straight to checkout init, and
   generation can only happen after a charge and research. `src/app/(app)/site-bot/start/StartPaidFlow.tsx:244-254`;
   `src/app/api/site-bot/checkout/callback/paid.ts` (research is triggered only inside the paid callback). **L** (re-sequencing + preview route).
3. **No orchestration from research to generate.** Nothing moves a dossier `architecture_ready → copy_ready`,
   and nothing compiles `PageBrief`s from a dossier. `generate` requires both from the caller.
   `src/app/api/site-bot/generate/route.ts:124-146`; `src/lib/site-bot/researchedSiteGeneration.ts:92-101`;
   `src/lib/site-bot/research/types.ts:135` (transition allowed, never performed);
   `src/lib/site-bot/research/pageBrief.ts:228` (`compilePageBrief` has no production caller). **L**.
4. **Generated copy fails validation 4/4. There is no repair or retry, and the error is swallowed.** Every
   qwen3.8-max output broke the hard limits: `stickyBarLine` 33–51 chars vs max 25; `trustBarItems` > 20;
   `serviceItems` > 25; `servicesHeadline` 54 > 35; and `reviewFeatured` was set while `reviewContext` was null
   (the validator requires both or neither). The prompt does not state these limits. Limits:
   `src/lib/lp/researchPageCopy.ts:27-33,104-112`; single pass, no retry: `:169-182`; generic 502 hides the cause:
   `src/app/api/site-bot/generate/route.ts:191-193`. **M** (put the limits in the prompt, run a bounded repair
   pass, log the reason).
5. **Research has a hard dependency on live DataForSEO + NeuronWriter, with no fixture or cache mode.** With no
   token, every paid order goes to `held: provider_outage`. `src/lib/site-bot/research/runResearch.ts:51-56`
   (`defaultProviders`), `src/lib/site-bot/research/dataForSeoResearch.ts:120-124`. Also: the chat does not
   collect `priorityServices`/`travelBoundary`, so every order first lands on `truth_missing_serviceability`
   and `truth_missing_priority`. Built in `src/app/api/site-bot/checkout/callback/paid.ts` `researchInput()`. **M**.
6. **Price model is wrong: ₪9.90 one-time, not ₪199/mo recurring.** `checkout/init/paid.ts:14,38`,
   `checkout/callback/paid.ts:12,81,99`; pay page copy and button `pay/[sessionId]/page.tsx:117,134`.
   The recurring engine already exists separately (`src/lib/payments/subscriptions.ts`, `cron-charge.ts`,
   `/api/subscriptions/{create,cancel,magic-link}`, `/account/subscription`) but is not wired to Site Bot. **M**.
7. **Existing-domain path is absent.** There is no domain field or question. The audit store drops the website
   URL (it keeps only `hasWebsite: boolean`, `src/lib/site-bot/auditStore.ts:27`). There is no 301 map, no
   `_redirects` emission, no MX/TXT preservation and no access guide. Hard-coded host:
   `src/app/api/site-bot/generate/route.ts:174`, `src/app/api/site-bot/deploy/route.ts:303,306,308,401,404,436-457`. **L**.
8. **GBP "connect" is an unauthenticated write with no verification.** Anyone with an `auditId` can bind it to
   any location ID and flip `isConnected: true`. Nothing confirms with Google that WAO was actually added as a
   manager. `src/app/api/site-bot/connect-gbp/paid.ts:13-68` → `src/lib/site-bot/gbpConnect.ts:54`.
   No customer UI calls it. **M**.

**High: wrong outcome or silent failure**

9. **A failed charge shows as success.** `pay()` never checks `res.ok`. A 402/500 from the callback falls through to `setPhase("done")`. `pay/[sessionId]/page.tsx:53-66`. **S**.
10. **A failed checkout init navigates to `/site-bot/pay/undefined`.** `StartPaidFlow.tsx:252-253` does not check `res.ok`. **S**.
11. **No pre-fill.** The chat asks `audit-result?withPlace=1`, but the audit-only release made that route return only the redacted scorecard. The audit store has no phone, hours, categories or URL to seed from. `StartPaidFlow.tsx:217`; `src/app/api/site-bot/audit-result/route.ts` (guard test forbids `withPlace`); `src/lib/site-bot/auditStore.ts:19-33`. **M** (M1 needs a consented, minimal place snapshot or a fresh GBP read).
12. **No staging/noindex preview host.** The researched renderer emits no `noindex`, and `siteUrl` is always the production subdomain. `src/lib/lp/researchedSite.ts` (no robots meta), `generate/route.ts:174`. **M**.
13. **Deploy step 4 writes `data/clients/{slug}/` with a hard-coded root** (`src/lib/geo/client.ts:76` `CLIENTS_DIR = cwd/data/clients`). No env override, so a rehearsal or staging deploy cannot avoid live client data. It was not reached in M0 (deploy stopped earlier), so nothing was written. **S** (add `WAO_CLIENTS_DIR`, default unchanged).
14. **Test and staging data land in tracked or unignored dirs.** `generate` writes `data/sites/` (tracked) at `generate/route.ts:155`. Research writes `data/site-research/` (not gitignored) via `researchStore.ts:10`. **S**.
15. **`preferredSlug` is collected (question 13) but ignored.** `generate` uses `body.slug` or `slugify(businessName)`, and a Hebrew business name falls back to `wao-client-<last4 phone>`. `StartPaidFlow.tsx:164-166`, `generate/route.ts:24-35,106-109`. **S**.

**Medium / hygiene**

16. **The pay page is reachable in prod today** (`/site-bot/pay/<anything>` renders the mock card form with `4242…` pre-filled; the pay button then gets 503). It is not covered by the audit-only guard. `src/app/(product)/site-bot/pay/[sessionId]/page.tsx:127`. **S**.
17. **Stale shell `QWEN_BASE_URL`/`QWEN_API_KEY` (dashscope-intl) override `.env.local` in `next dev`**, because @next/env never overrides already-set vars. The first generate attempt was blocked going to `dashscope-intl`. Prod uses `.env.production`, so this is a local trap only. Launcher fixed with `env -u`. **S** (document, or unset in shell profile).
18. **The last full checkout callback still returned `statusUrl`**, against the contract from c760095. Removed in the restore and covered by the extended test. Logged as a fix (see section 7).

## 4. Friction ranked by likely drop-off (the persona's own words)

1. *"I saw my score. Where do I click to fix it?"* There is no build/buy button on the result, only a help form. (Audit result.)
2. *"I paid and now it says 'unauthorized'. Did I just get scammed?"* (Pay page, after the charge.)
3. *"Thirteen questions on my phone? I'm on a job."* 13 single-question screens; the cookie banner covers the input and the latest bubble on mobile (`a-mobile-run2/04-start-turn3.png`); the chat window is capped at 480px, so on mobile the input sits below the fold.
4. *"Why are you asking my business name, phone and hours? Google already has them."* There is no pre-fill (M1 target is ≤ 3 questions).
5. *"₪9.90 one-time? Then what, a surprise charge?"* The price on the pay page doesn't match the approved offer, and there's no mention of monthly, VAT, cancel-anytime or hosting.
6. *"I have to pay before I even see what I'm getting?"* There's no preview.
7. *"Card fields already have numbers in them, is this real?"* The test card is pre-filled; there's no site header or logo on the pay page, and no Takbull/secure-payment badge.
8. *"It said 'built in real time', where's my site?"* The final chat message and the pay-page subtitle promise an automatic, instant build. The real flow is research → human review → days. **Copy needed:** an honest timeline line for both spots, for waocopy.
9. *"Questions about 'what customers fear' and 'paste a review'. That's homework."* Questions 6, 7 and 10 are the high-effort ones. They are candidates for voice notes (M5) or for skipping when GBP reviews exist.
10. *(B) "I already have a site and email on my domain. Will you break my email?"* Nothing asks about it or reassures. **Copy needed:** domain/email reassurance plus a "what we'll need from you" step.
11. *(B) "How do I give you access to Google?"* There's no screen that explains the "add manager" invite. **Copy needed:** a 3-step add-manager guide.
12. After paying, the six research-progress lines read as a status checklist, but nothing moves. There's no "we'll message you on WhatsApp" moment and no account/status page link.

## 5. Mapping to milestones

| Item | Milestone |
|---|---|
| F1 no buy CTA on result; F3/F4 13 questions, no pre-fill; B11 pre-fill; B5 truth-gap fields not asked; B15 slug | **M1** (pre-fill + ≤ 3 questions) |
| B2 pay-first order; B3 research→generate orchestration; B4 copy validator 4/4 fail; B12 noindex staging; F6 no preview | **M2** (preview before pay) — the largest item; B3+B4 are prerequisites |
| B6 ₪9.90 → ₪199/mo; B9 fail shown as success; B10 `/pay/undefined`; B16 pay page live in prod; F5/F7 pay-page trust; F12 status page; magic-link/WhatsApp login | **M3** (Takbull, cancel, status page, login) |
| B1 customer-facing gate 401 (needs customer session) | **M3** (session) + **M2** (questions belong before pay) |
| B8 GBP connect unauthenticated/unverified, no UI; F11 add-manager guide | **M4** |
| B7 existing-domain path; F10 email/domain reassurance; deploy hard-coded host; 301 map; MX untouched | **M4** |
| F9 high-effort questions → voice | **M5** |
| Walkthrough video needs a flow with no dead ends: blocked on M1–M4 | **M6** |
| **No milestone:** B5 research depends on live DataForSEO/NeuronWriter, no fixture/cache mode (cost + testability); B13 `WAO_CLIENTS_DIR`; B14 test data in tracked dirs; B17 stale shell Qwen env; generate error swallowing (part of B4) | Proposed **M0.5 "pipeline plumbing"** before M2 |
| F8 "real-time" promise vs human review | Copy fix (waocopy → Noa), can ship with M2 |

## 6. Outbound side effects: what fired and what would have fired

Guard: `scratch/m0/tools/outbound-guard.cjs` was preloaded into the dev server. It logs every non-loopback fetch, http(s) request and child process, and blocks everything except the two LLM hosts. All side-effect credentials were blanked (empty string beats `.env.local`).

**Actually sent (all allowed, all LLM):** 5 × POST `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions`,
model `qwen3.8-max`, body `{model, temperature: 0.7, response_format: json_object, thinking_budget: 1500, messages:[system "Tamar…", user brief+schema]}`.
1 through the generate route, 4 through the offline repro.

**Blocked by the guard:** 3 × POST `dashscope-intl.aliyuncs.com/.../chat/completions` (the stale-env attempt, same payload, B17); 1 × GET `registry.npmjs.org/-/package/next/dist-tags` (Next dev update check).

**Browser side:** GTM `GTM-PQP3PVB` was requested on every page and aborted by the walker. With the flag on a real browser, GA/GTM would fire on `/site-bot/start` and `/site-bot/pay`.

**Would have fired in a real run (from code, in flow order):**

| Step | Target | Payload shape |
|---|---|---|
| checkout init | `PaymentProvider.createTokenizationSession` (mock here; Takbull would be its hosted page) | `{customerId: sessionId, returnUrl: <origin>/site-bot/pay/<id>, initialAmount: 9.9, description}` |
| checkout callback | `verifyTokenizationCallback({sessionId})`, then `chargeToken` | `{token, amount: 9.9, description, idempotencyKey: sessionId}` |
| checkout callback | `InvoiceProvider.createInvoice` (mock here; prod default is `pending-queue`) | `{customerName, customerEmail (often ''), amount, description, externalId}` |
| research | DataForSEO POST `https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live`, `/keywords_data/google/search_volume/live`, `/dataforseo_labs/google/search_intent/live`, `/serp/google/organic/live/advanced` | seeds = owner services; then up to 10 shortlisted keywords for SERPs |
| research | NeuronWriter `https://api.neuronwriter.com/neuron-api/0.5/writer/new-query` and `/get-query` | `{serviceKeyword, intentCluster, pageClass: 'service'}` per shortlisted keyword |
| generate | Qwen × 2 per page (Tamar, then Noa QA) | as above |
| deploy | Fraud Blocker `https://backend.fraudblocker.com/api` provision | `{clientId: slug, domain: <slug>.wao.co.il}` |
| deploy | `wrangler pages project create <slug> --production-branch main`, then `wrangler pages deploy <tmp> --project-name <slug> --branch main` | rendered HTML pages + sitemap |
| deploy | CF POST `/client/v4/accounts/{acct}/pages/projects/{slug}/domains` | `{name: "<slug>.wao.co.il"}` |
| deploy | CF POST `/client/v4/zones/{zone}/dns_records` | `{type: "CNAME", name: "<slug>.wao.co.il", content: "<slug>.pages.dev", proxied: true, ttl: 1}` |
| deploy | local write `data/clients/<slug>/client.json` + client-auth PIN + `wao-client` session cookie | business niche, location, USP, WhatsApp |
| GBP connect | **none to Google**: local write of the binding into `data/audits/<id>.json` | `{gbpAccountId, gbpLocationId, connectedAt, connectionMethod, connectedByEmail}` |
| GBP fixes (still stubbed) | `fix-execute` would PATCH the live GBP location via the GBP API | — |

**Existing-domain path (B): what we would have to ask and do. None of it exists in code.**
- Ask: the domain, the registrar/DNS host, and either delegated DNS access or a "WAO adds these records" consent. Confirm who hosts email.
- Read before touching anything: current NS, A/AAAA/CNAME for apex and `www`, **MX, SPF/DKIM/DMARC TXT** (copy them unchanged), and any verification TXT records.
- Crawl the old site (sitemap + internal links) → old-URL list → 301 map to new paths (Pages `_redirects`), with content-reuse consent.
- Then write: Pages custom-domain bind for apex + `www` (instead of `<slug>.wao.co.il`), and change only the web records. TLS via Cloudflare.
- Keep `<slug>.wao.co.il` (noindex) as preview/staging only.

## 7. Spend, tests, build, commit

- **LLM spend:** 5 calls × qwen3.8-max (3,117 in / ~2,200 out tokens each, 1,500 of them reasoning) ≈ **US$0.10 total** at $2/$6 per M tokens. Cap was $1. No Gemini calls.
- **DataForSEO / NeuronWriter / Takbull / GBP / Cloudflare / Fraud Blocker calls: 0.**
- **`git diff data/clients/`: empty.** All test data was moved out of `data/` to `scratch/m0/evidence/`.
- **Fixes made to reach the next step** (each one is also logged as a break above):
  - Flag-gated restore of `checkout/{init,callback}`, `connect-gbp`, `connect-status` and `/site-bot/start` (the full handlers from `fdd6f7d^`, now in `paid.ts` / `StartPaidFlow.tsx`). Applies to B1–B6 and B8.
  - The `/site-bot/start` 307 is skipped only with the flag set and NODE_ENV not production.
  - `statusUrl` removed from the restored callback (B18).
  - The rehearsal launcher unsets the stale Qwen env (B17).
  - Admin/operator steps (research resume, generate) were driven by hand with a locally minted 3-hour admin cookie and a fixture dossier (`m0-fixture-a`) plus one homepage brief.
- **Prod default unchanged:** the gate is `SITE_BOT_PAID_FLOW === '1' && NODE_ENV !== 'production'`, so it cannot open in a prod build even if the variable is set. Unset, every stub returns the same 503 body and headers, and the start page 404s behind the same 307.
- **Guard:** `audit-only-release.security.test.mjs` was updated, not deleted. It pins the exact gated stub source and executes each stub in a sandbox for every closed-gate env (unset, `'true'`, `'0'`, `''`, `' 1'`, and `'1'` in production). Each must return the exact 503, touch no request, import, network, clock or console, and read only the two gate env keys. The only effect allowed with the gate open is loading `./paid`. It also asserts that nothing else imports `paid.ts`/`StartPaidFlow`, and that `next.config` keeps the 307 for every closed env. Per-route stub tests now run across the same closed envs. Shared fixtures: `src/app/api/site-bot/paidFlowGate.testkit.mjs`.
- **Tests:** `npm run test`: 1,402 pass / 0 fail.
- **Build:** `WAO_DEPLOY_DIST_DIR=.next-m0 npm run build -- --webpack` exits 0 (`/site-bot/start` prerendered static, i.e. the 404). **Prod-mode boot check** (`next start` on that build **with `SITE_BOT_PAID_FLOW=1` deliberately set**): `/site-bot/start` 307 → `/site-bot`; checkout init/callback 503 `checkout_unavailable`; connect-gbp 503 `gbp_connect_disabled`; connect-status 503 `gbp_status_disabled`. The gate stays closed in production.
