# Weekend Site-Bot Launch Readiness — 2026-09-19

## Executive decision

Site-Bot is the first MVP. Do not launch Ads-Bot first.

A full public, self-serve Site-Bot launch is not feasible this weekend from the current repository state. A narrower operator-led pilot is feasible: select two or three real, permissioned businesses or rank-and-rent concepts; build local, non-public website previews; run human and independent QA; then let Eitan decide whether any single approved site may proceed through credentials, publication, and production gates.

The repository contains substantial Site-Bot research, rendering, audit, client-authentication, and deployment machinery, and the current worktree passes the canonical test and build gates. It does not contain a working customer journey from payment through researched generation to a rendered website. There are also no independently observed, approved real pilot input bundles or completed standalone site repositories. Therefore the weekend goal should be proof through a few real websites, not a public payment launch.

No new implementation handoff is authored with this assessment. The first website-build outcome is not immediately dependency-ready: Eitan must first name the pilot sites and approve business facts, media rights, contact/lead destinations, SEO anchors, privacy treatment, and whether each asset is a client showcase or a rank-and-rent property. Existing pending handoffs cannot safely substitute for those decisions.

## Evidence model

### Independently observed in this assessment

- Branch: `hermes-migration`; HEAD: `c78c9ce8107c21e38477da2702338cfa5f488cbc`.
- The worktree is deliberately dirty, with seven deployment-security paths staged and many unrelated modified/untracked paths. This assessment preserved every pre-existing worktree/index path and added only the two requested untracked documentation artifacts.
- `npm run test` passed: 600 compiled tests plus 51 source tests, zero failures.
- A fresh targeted research-tool check found a gap hidden by the canonical glob: Places, DataForSEO, and NeuronWriter compiled tests passed 17/17, and the mocked architecture comparison reached `architecture_ready`; however, `dist/lib/site-bot/research/runResearch.test.js` passed only 5/6 because the stale-demand refresh expected a second metrics call and observed one. `package.json:12` runs `dist/lib/site-bot/*.test.js`, not nested `dist/lib/site-bot/research/*.test.js`. Treat fresh one-shot research as evidenced, but do not claim resume/cache-refresh readiness.
- `npm run build` passed and generated 361 static pages. The build emitted the existing NFT tracing warning for `src/app/api/rank-rent/leads/route.ts` and the existing edge-runtime/static-generation warning.
- The App Router build exposes the relevant public routes: `/site-bot`, `/site-bot/audit`, `/site-bot/start`, `/site-bot/pay/[sessionId]`, `/privacy`, `/google-ads`, and `/google-ads/onboarding`.
- `handoff/pending/` contains 114 Markdown files, versus 198 in completed and 81 in failed. Pending is not an executable FIFO backlog.
- The current board contains 461 done tasks, 110 blocked tasks, three triage tasks, and this single running task. This is evidence of accumulated lineage and retries, not 461 production-ready outcomes.
- Site-Bot marketing is materially stale. `src/app/(app)/site-bot/page.tsx:26-79,252-287,439-457` still advertises a one-time ₪1,490 product and corresponding schema, while the later product decision is a ₪199/month retainer.
- Site-Bot checkout remains a one-time ₪9.90 flow. `src/app/api/site-bot/checkout/init/route.ts:8-14` explicitly describes one-time checkout, and `src/lib/payments/get-provider.ts:7-24` says the real Takbull adapter is not complete and defaults to a mock unless explicitly selected.
- The paid Site-Bot UI and callback contract do not match. `src/app/(product)/site-bot/pay/[sessionId]/page.tsx:24-27,46-63` requires `url`, `slug`, and collected data from checkout callback, but `src/lib/site-bot/checkout/researchCompletion.ts:20-30` returns research status fields and no `url` or `slug`. The page therefore treats a successful paid-research response as an error.
- No client UI calls `/api/site-bot/research/status`, `/api/site-bot/generate`, or `/api/site-bot/deploy`. Source search found no TSX caller. The status route can report `nextAction`, but there is no customer-facing continuation from research to generation or deployment.
- `src/app/api/site-bot/generate/route.ts:72-104` can persist only one approved `pageBrief` and basic copy. The deployment route requires `researchedPages` for a researched record (`src/app/api/site-bot/deploy/route.ts:137-146`), but no observed source seam writes `researchedPages` or `researchedGraphEdges` into a site record. A researched generated record therefore reaches `researched_site_pages_required` at deployment.
- Site-Bot deployment is now admin-only and protected before parsing (`src/app/api/site-bot/deploy/route.ts:72-83`). That is a good production boundary, but the checkout path has no accepted admin handoff to it.
- The rank-and-rent foundation is partial. Contracts/store, eligibility, authorization, proof, and lead ingestion modules exist under `src/lib/rank-rent/`; the expected `templates/rank-rent-site/` directory and repository-factory implementation do not exist. Pending task `2026-09-06_013` depends on a missing template and older lineage.
- Google Ads onboarding defaults to test mode and visibly locks Live (`src/app/(app)/google-ads/onboarding/page.tsx:80-106,555-638`). The create route applies authenticated sandbox/live separation and creates campaigns paused (`src/app/api/google-ads/create-campaign/route.ts:396-455,592-611`).
- The public Google Ads page links to `/google-ads/onboarding?demo=1&mode=test&clientId=google-ads-sandbox`, but onboarding source never consumes `demo`, `mode`, or `clientId` query parameters. Its only `URLSearchParams` use is the payment-success callback (`page.tsx:327-334`). `DEMO_PROFILE` is declared but never applied. The advertised demo does not currently preload a demo.
- Ads onboarding can still cross mutation boundaries after approval: it calls campaign creation, LP generation/deployment, and lead storage (`page.tsx:222-324`). Human QA must stop before payment/approval.

### Prior worker claims, separately identified

These are board records and remain point-in-time claims unless corroborated above.

- `t_10dd883b` is formally done and reports an independent PASS for the seven-path staged deployment-security candidate: 600+51 tests, build PASS, and unauthenticated 401 probes. This assessment corroborated current test/build health, but did not rerun the loopback probes or reproduce its exact index hashes.
- `t_e4acbece` is formally done and reports independent structural PASS for the audit-only Site-Bot candidate.
- `t_9f0fdd27` is formally done with a visual FAIL: the mobile consent banner covered the audit submit control and GTM was attempted.
- `t_b44b9c88` is formally done and reports independent visual PASS for the subsequent mobile overlay correction: `/site-bot/audit` suppresses the consent dialog while `/privacy` retains it. This assessment did not recapture those screenshots.
- Historical Site-Bot handoffs claim research-first SEO, renderer, client dashboard, and live deployment work. Current source proves many components exist, but the current end-to-end paid journey remains disconnected as described above.

## Product readiness by product

### Site-Bot

What is credible now:

- Public marketing and free audit routes build and have recent independent structural/visual evidence.
- Business-name-only audit input, minimized audit storage, 30-day expiry, and privacy disclosure exist in the current candidate.
- Research adapters, dossier persistence, human gates, page opportunities, page briefs, content evaluation, and renderers exist and are covered by tests.
- Deployment security is substantially improved and staged, including admin authorization, safe slug validation, argument-vector Wrangler execution, owned temporary directories, and cleanup.
- Client authentication, first-change PIN scope, dashboard records, Fraud Blocker integration, lead capture, and rank-and-rent lead contracts exist in pieces.

Launch blockers:

1. No coherent product contract. The public Site-Bot page says ₪1,490 one-time; the strategy says ₪199/month; checkout charges ₪9.90 once; cancellation/export ownership is unresolved.
2. No working self-serve continuation after paid research. Callback/UI response shapes disagree, no UI orchestrates status → brief → generation → QA → deploy, and researched records lack the deployment page graph.
3. No real payment readiness. Takbull remains incomplete; mock payment is the default.
4. No real pilot artifact was independently observed. Existing source/test fixtures are not customer-ready showcase or rank-and-rent sites.
5. No rank-and-rent static template or repository factory exists at the paths assumed by the old queue.
6. Production release state is unresolved. Security and audit candidates are staged in a heavily dirty worktree; independent PASS is not the same as committed, pushed, deployed, or production-observed behavior.
7. Human and legal decisions remain: exact offer, cancellation/export policy, pilot identities, ownership, domain rights, media rights, provider facts, SEO anchors, lead recipients, privacy/consent, commercial agreement, and publication approval.

### Ads-Bot

What is credible now:

- Test/live access separation, visible Live lock, demand-readiness logic, paused campaign creation, autonomy-policy infrastructure, campaign-age logic, search-term harvesting, mutation routes, fraud protection, and extensive tests exist.
- Canonical tests and build pass.

Launch blockers:

1. The advertised sandbox demo query is not consumed, so the public demo route is misleading and not actually prefilled.
2. Full onboarding still exposes approval/payment paths that can create a Google Ads sub-account/campaign, deploy an LP, and write a lead. Human QA cannot safely complete it without a separately controlled sandbox authorization.
3. Sandbox verification requires an authenticated sandbox client session and existing campaign binding; an anonymous visitor receives 401.
4. Live mode remains intentionally locked, and real client-owned account/payment/MCC setup still requires external human/account gates.
5. Payment and pricing surfaces remain split between Yaad sandbox behavior and the product's subscription intent.
6. Marketing claims and benchmark claims on `/google-ads` need dated evidence and claim review before launch.

Decision: keep Ads-Bot in sandbox/internal-validation mode. It is a second MVP after Site-Bot proves website delivery, lead capture, and a repeatable owner-controlled launch process.

## Queue assessment

The queued work is not ordered or focused enough for weekend execution.

- The 114 pending Markdown files mix current candidates, superseded predecessors, already-completed work left in pending, blocked dependency chains, and pre-Contract-v3 exact-once commands.
- `handoff/pending/2026-09-18_004_waoengineer_converge-audit-only-candidate.md` is already represented by formally done implementation and verifier cards; it is reconciliation drift, not new work.
- The September 6 rank-and-rent chain is strategically aligned with the desired showcase-first approach, but its literal order is stale. `2026-09-06_013` expects `templates/rank-rent-site/`, which is absent; `2026-09-06_031` waits for research, routing, copy QA, founder approvals, and that factory.
- The September 9 queue audit counted 90 executable pending specs and classified only one as runnable; pending has since grown to 114 files while current product decisions changed again. Filename order is unsafe.
- Recent board activity prioritized release-candidate isolation, email recovery, client login, audit-only release, and deployment security. That produced useful safety work but did not close the Site-Bot website-delivery journey.
- 110 board tasks remain blocked. Repeated recovery cards show that broad queue execution would spend the weekend on lineage mechanics rather than proving product value.

Queue decision:

- Freeze the pending queue as `REVIEW_REQUIRED`.
- Do not run any pending file by filename order.
- Do not revive the old Hogegim chain until pilot inputs are re-approved and the current Site-Bot rendering path is selected.
- Create new Contract v3 work only after each outcome's human dependencies are explicit and present.

## Research-tool launch-scope inventory

Decision: this weekend's research lane is the existing Places → DataForSEO → NeuronWriter → persisted Site-Bot dossier stack, exercised first with mocked fixtures and then only in an explicitly budgeted operator run for approved pilots. Expired-domain tooling is not on the critical path for the first two or three sites. It is useful due-diligence infrastructure, but it has no runnable live operator surface and would add domain, legal, provider, and acquisition work before a website exists.

| Tool/capability | Classification | Source evidence | Value to the first two or three sites | Risk/distraction | Credential or human-approval boundary |
|---|---|---|---|---|---|
| Google Places lookup and free Site-Bot audit | **KEEP THIS WEEKEND** | `src/lib/places/client.ts:23-31,122-199`; called by `src/app/api/site-bot/audit-lookup/route.ts:43-45` | Confirms public listing identity, category/type, address, hours, rating, website, and candidate selection before owner confirmation. | Google terms restrict caching; the photo path uses the deprecated legacy endpoint. Public data is not proof of ownership or permission. | Requires `PLACES_API_KEY`, provider spend, and an authorized business name. Owner must confirm every fact and media right; no GBP write is authorized. |
| Site-Bot DataForSEO demand/SERP adapter | **KEEP THIS WEEKEND** | `src/lib/site-bot/research/dataForSeoResearch.ts:6-13,18-38,120-123,221-295,301-385` | Expands service seeds, measures Israeli/Hebrew demand and trends, classifies intent, and inspects local-pack/organic composition so only defensible page targets are selected. | Live calls cost money; sparse Hebrew zero volume is explicitly uncertain. In-memory cache and default runner behavior are not a substitute for an approved per-pilot budget. | Requires `DATAFORSEO_TOKEN`. Eitan approves calls/USD and title/H1 anchors; provider output is evidence, not publication approval. |
| NeuronWriter service-cluster adapter | **KEEP THIS WEEKEND** | `src/lib/site-bot/research/neuronWriter.ts:6-17,90-100,196-225,237-259` | Supplies competitor-informed terms, entities, questions, and post-draft evaluation for a small number of shortlisted service intents. | The adapter supports service pages only, and each new query may consume quota. Running every city permutation would delay the pilot and encourage term stuffing. | Requires `NEURONWRITER_API_KEY` and `NEURONWRITER_PROJECT_ID`; the project must be Hebrew on `google.co.il`. Eitan approves a bounded cluster set and any paid query/evaluation. |
| Site-Bot research orchestrator, dossier store, and authenticated research API | **KEEP THIS WEEKEND** | `src/lib/site-bot/research/runResearch.ts:17-31,99-112,171-238`; `src/app/api/site-bot/research/route.ts:8-13,36-58` | Joins owner truth, demand, intent, SERPs, semantic enrichment, provenance, costs, page opportunities, and holds into one architecture decision for a fresh pilot. | The default run enriches up to ten shortlisted keywords and writes a dossier. The targeted stale-demand refresh test currently fails, so resume/cache-refresh readiness is not proven. There is no customer UI caller, and this does not build the complete preview. | API requires `CRON_SECRET`; live providers require their credentials and approved budgets. This weekend permits only a fresh, separately approved pilot run; do not rely on stale-cache refresh. Human gates remain for facts, anchors, content, and publication. |
| Mocked architecture-comparison CLI | **KEEP THIS WEEKEND** | `scripts/compare-site-bot-architectures.mjs:9-23,25-49,52-107` | Proves field, fixed-location, and hybrid research/portfolio behavior without provider spend or production-data writes before a real pilot run. | It proves contracts with synthetic ASCII fixtures, not real demand, Hebrew quality, or production readiness. | No credentials. It uses mocked providers and a temporary OS directory that it removes; human review must not mislabel fixture output as market evidence. |
| Wayback discovery/history plus DNS, RDAP, and HTTP status probes | **DEFER** | `src/lib/expired-domain-research/wayback.ts:4-10,146-190,195-231`; `src/lib/expired-domain-research/domainStatus.ts:5-10,150-171` | Can screen a named expired-domain candidate for historical continuity, redirects, abuse, registration signals, and current reachability. | The Wayback keyword endpoint is undocumented; status is never purchase certainty. It adds acquisition/legal work and does not help build Hogegim or a clean-domain showcase faster. | Read-only network access still requires a named candidate and Eitan's due-diligence approval. Registrar confirmation, ownership, trademark, and purchase remain human gates. |
| OpenSEO MCP domain/keyword/backlink enrichment | **DEFER** | `src/lib/expired-domain-research/openSeoMcp.ts:7-29,36-60,72-100,113-126`; `docs/tools/expired-domain-openseo-local-setup.md:5-14` | Could enrich a maximum-three expired-domain shortlist with keyword, domain, and backlink evidence. | Local mode is unauthenticated and must stay loopback-only; metered tools consume credits. The shipped CLI is offline-fixture only and explicitly refuses live execution (`scripts/expired-domain-openseo-preflight.mjs:7-12`). | Requires separate pinned Docker setup plus `DATAFORSEO_API_KEY`, or explicit hosted bearer authorization. Eitan must approve the candidate set and credit cap. |
| Moz Data API V3 authority metrics | **DEFER** | `src/lib/expired-domain-research/mozMetrics.ts:4-28,100-114,145-180,192-215` | Corroborates PA, DA, spam score, link counts, and crawl provenance for an already-shortlisted domain. | Authority metrics cannot clear abuse, ownership, topical, or legal risk; calls are quota-bounded and can fail on auth/rate limits. | Requires a Moz token and explicit approval for 1–10 calls. Human due diligence remains mandatory. |
| GSC Pareto opportunity script | **DEFER** | `scripts/gsc-pareto.mjs:1-15,74-115,118-164` | Useful after a site is verified and has impressions, queries, and ranking URLs to prioritize expansion. | New local previews have no GSC history; OAuth setup and model classification do not help the initial architecture. | Requires verified-property OAuth, refresh-token handling, and owner authorization. Do not connect GSC for a non-public preview. |
| Readiness Gate and shallow site crawler | **REMOVE FROM LAUNCH PATH** | `scripts/readiness-gate.mjs:24-39,162-176,252-276`; `scripts/lib/site-crawl.mjs:10-23,153-171` | Useful for prospect routing and existing-site page counts, not for researching or building the selected pilot sites. | Direct CLI execution writes `data/prospects/.../readiness-gate.json` and produces prospect-facing material, expanding scope into sales routing. | Requires `GOOGLE_MAPS_API_KEY`, a real target, and human approval for prospect-facing use. It is excluded from weekend pilot research and QA. |
| Ads Keyword Planner and podcast-title DataForSEO utilities | **REMOVE FROM LAUNCH PATH** | `src/lib/ads/keywordPlanner.ts`; `src/lib/podcast-title/dataForSeo.ts` | None for the Site-Bot pilot: their contracts serve ad forecasting and podcast-title research, not local-site architecture. | Reusing adjacent provider code would create conflicting evidence formats and distract from the dedicated Site-Bot adapter. | Keep their credentials, spend, and outputs outside this pilot. |
| Runnable live expired-domain operator surface | **MISSING** | The intended `/admin/expired-domain-research` is described in `docs/missions/expired-domain-research-tool-2026-09-05.md:3-24`; current `src/app/api/rank-rent/` contains only the leads route, and the only preflight CLI refuses live mode. | Would make the implemented adapters safely usable as one bounded evidence run. | Building it now would consume the weekend before the first site preview. | Future surface must be local/admin-only, persist immutable evidence, require explicit call/credit caps, and never expose purchase/deploy actions. |
| Sourced city-fact research adapter | **MISSING** | `src/lib/site-bot/research/runResearch.ts:142-153,226-229` compiles city evidence only from owner-supplied served-area/base facts; no observed provider adapter collects dated service-relevant municipal facts. | Needed before asserting differentiated city-page facts without inventing local relevance. | Without it, broad city-page generation risks thin doorway pages. | This weekend, withhold unsupported city pages or use manually sourced, dated, Eitan-approved facts; no model hypothesis may become a published fact. |
| Standalone static-site template and repository factory | **MISSING** | `docs/research/rank-and-rent-portfolio-operating-system-2026-09-06.md:26-32,56-62`; current source has no `templates/rank-rent-site/` directory or repository-factory implementation. | Would turn an approved dossier/content bundle into an independently owned, repeatable local preview repository. | Its absence means research readiness is not website-delivery readiness; ad hoc repository creation would undermine isolation and ownership. | Remote creation, repository ownership, Cloudflare connection, domain, push, and publication all require separate Eitan approval. Local preview creation must precede them. |

Weekend scope rule: a KEEP tool may support only the approved two-or-three-site pilot and must fail closed on missing facts, credentials, budget, or evidence. DEFER tools may not consume weekend time unless Eitan replaces the pilot priority with one named expired-domain due-diligence decision. REMOVE tools are not substitutes. MISSING capabilities are blockers or explicit manual holds, not invitations to improvise.

## Maximum-three-outcome launch path

### Outcome 1 — Build two or three real local website previews first

Goal: produce two or three complete, local, non-public websites through one selected Site-Bot rendering path. At least one should be a WAO showcase and at least one should be a rank-and-rent asset. Hogegim remains the preferred first rank-and-rent concept only if Eitan confirms the participating businesses and rights.

Required inputs before implementation:

- Site identity and lane: customer-owned showcase or WAO-owned rank-and-rent.
- Verified business/provider facts and service areas.
- Media ownership/licence and approved hero assets.
- Contact and lead recipient; consent language and retention policy.
- Approved SEO title/H1 anchors and canonical domain intent.
- Approved Hebrew content or a waocopy → waohebrewqa artifact.
- For rank-and-rent: ownership/commercial agreement, deterministic recipient routing, domain status/rights, and no unsupported location/provider pages.

Acceptance:

- Each site renders locally with complete navigation, reliable images, privacy/consent, forms aimed only at a local mock receiver, canonical/sitemap/robots/schema, no external mutation, and no secrets.
- Canonical tests/build plus independent structural and serious RTL/mobile visual QA pass.
- Eitan physically reviews every site. No site is public yet.

### Outcome 2 — Close the operator-led Site-Bot production path

Only after Outcome 1 passes, connect the selected approved site record to the current research/generation/rendering state machine and admin-only deployment boundary. Resolve callback/status/generate/page-graph contract gaps and the offer/pricing/cancellation policy. Keep payment disabled until Takbull and recurring subscription behavior are real.

Acceptance:

- One approved pilot can move from signed input bundle to generated preview, human approval, deploy-ready record, and admin-authorized deployment without hidden fallback or manual file surgery.
- No customer payment is accepted until the offer and processor are truthful.
- Independent runtime, privacy, and visual verification passes before Eitan decides on commit/push/deploy.

### Outcome 3 — Keep Ads-Bot sandbox-only and make the demo truthful

After Site-Bot delivery is proven, repair the advertised demo so query parameters actually preload the sandbox profile and make every mutation boundary explicit. Permit only authenticated, bound test-account validation; do not enable Live.

Acceptance:

- Public demo is genuinely prefilled and cannot mutate an account.
- Authenticated sandbox verification is read-only and identifies the bound customer/campaign.
- Any create/modify operation remains behind the sandbox session, autonomy policy, paused status, and explicit operator test gate.
- Live mode, payments, client account linking, and production LP deployment remain separate human gates.

## Weekend feasibility

Feasible this weekend:

- Human selection and approval of two or three pilot input bundles.
- Building local, non-public website previews if those inputs and Hebrew content gates are supplied early.
- Canonical tests/build, local HTTP checks, screenshot/RTL QA, form-to-local-mock testing, and an owner decision on one best candidate.
- Public audit-page review and internal Ads onboarding review that stop before side effects.

Not feasible or not responsible to promise this weekend:

- A truthful self-serve paid Site-Bot launch.
- Real recurring Takbull billing.
- Automatic customer journey from payment to researched generation to deployment.
- Multiple public domain launches without rights, DNS, Cloudflare, privacy, lead routing, and production approval.
- Live Ads-Bot account creation or autonomous spending.

Bottom line: a convincing pilot/demo weekend is feasible; a production self-serve launch is not.

## Explicit freeze list

Freeze until the three outcomes above are accepted:

- GEO feature expansion and month-four upgrades.
- Email/PIN recovery refinements unrelated to pilot access.
- Podcast tooling.
- Expired-domain automation beyond a named pilot domain.
- Broad portfolio admin UI, reporting, anomaly monitoring, sales kits, and owner manuals.
- Additional rank-and-rent niches beyond the selected two or three pilots.
- Ads-Bot live mode, autonomous cycles against real accounts, payment, messaging, weekly digests, and live LP deployment.
- Site-Bot GBP writes, fix execution, grid scans, edit/redeploy automation, and generalized self-serve payment.
- Repository-wide lint cleanup and unrelated refactors.
- Any commit, push, release, remote creation, DNS change, Cloudflare project/domain change, or production deployment not separately approved by Eitan.

## Human, privacy, credential, and production gates

Human/product gates:

- Select the exact pilot sites and ownership lane.
- Approve Site-Bot offer, ₪199/month treatment, ₪9.90 deposit wording, cancellation/export/buyout policy, and lead-routing commercial terms.
- Approve each business fact, provider, service area, SEO anchor, canonical domain, content, and final visual result.
- Approve Ads-Bot claim language and dated evidence.

Privacy/legal gates:

- Establish controller/processor roles, privacy notice, retention/deletion rules, consent evidence, and recipient disclosure per site.
- Keep real leads, phones, emails, and revenue out of Git and screenshots.
- Obtain written rights for logos, photos, testimonials, reviews, domains, and provider profiles.
- Obtain trademark/name and domain clearance for rank-and-rent assets.

Credential/external gates:

- Takbull contract/API and recurring billing credentials.
- Cloudflare account/project/domain/DNS authorization.
- Git remote creation and ownership.
- Google Ads test/live OAuth, MCC, developer-token, account ownership, payer profile, and sandbox binding.
- Places/DataForSEO/NeuronWriter/Gemini/Qwen use within approved budget and data policy.
- Fraud Blocker domain provisioning.
- Any GBP OAuth or write.

Production gates:

- Resolve staged-candidate release scope in the dirty worktree.
- Independent verifier PASS for exact release bytes, canonical tests/build, runtime, privacy, and serious visual/mobile QA.
- Eitan's explicit commit/push/deploy authorization and exact target.
- Production smoke, rollback anchor, observability, and lead-delivery test using non-customer test data.
- No `deploy.sh` execution by waostrategy.

## Immediate decision required from Eitan

Provide one signed pilot-input manifest for each of two or three sites. Without those manifests, the first website-build outcome is blocked by human facts/rights/offer decisions and no implementation handoff should be dispatched.
