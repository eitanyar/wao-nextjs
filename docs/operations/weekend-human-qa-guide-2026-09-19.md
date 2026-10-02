# Weekend Human QA Guide — Site-Bot First, Ads-Bot Sandbox Only

Date: 2026-09-19

## Purpose

This guide lets Eitan physically inspect the launch-critical public surfaces without creating live ads, charging a card, sending messages, writing to a client account, or deploying anything.

Use the current local WAO build. Do not use production for these checks. Do not click a control when the guide says stop.

## Prerequisites

1. Work in `/home/eitanya/wao` on branch `hermes-migration`.
2. Preserve the existing dirty worktree and staged index. Do not stage, unstage, reset, clean, commit, push, or deploy.
3. Install nothing. Existing dependencies are sufficient.
4. Run the canonical read-only gates:
   - `npm run test`
   - `npm run build`
5. Start one local server only after the build:
   - `npm run start -- --hostname 127.0.0.1 --port 3199`
6. Open `http://127.0.0.1:3199` in a private browser window.
7. Open browser DevTools Console and Network. Record unexpected console errors, local 4xx/5xx responses, and external requests.
8. Use no real customer phone, email, lead, revenue, card, OAuth credential, or account identifier.
9. Do not enter passwords, API keys, PINs, or payment-card data.
10. Stop the server when finished.

Current independent baseline from this assessment:

- `npm run test`: PASS, 600 compiled plus 51 source tests, zero failures.
- `npm run build`: PASS, 361 generated static pages; existing rank-and-rent NFT tracing warning remains.

## Safety boundaries

Allowed:

- GET public pages.
- Inspect layout, links, copy consistency, RTL behavior, keyboard focus, mobile overflow, and browser errors.
- Type temporary fictional text into client-side fields when the guide says not to submit.
- Submit the free audit only with a public business name that Eitan is authorized to test. This invokes Places lookup and writes a minimized, expiring local audit record.
- Use an existing authenticated Google Ads sandbox client session only for the read-only sandbox verification button, if Eitan intentionally chooses that optional test.

Forbidden in this guide:

- Any payment or checkout confirmation.
- The Site-Bot payment callback.
- Site-Bot deployment, Cloudflare, DNS, Wrangler, Fraud Blocker provisioning, or GBP OAuth/write.
- Google Ads campaign creation, budget/status/keyword mutation, payment profile linkage, or Live mode.
- LP deployment.
- Form submission that sends a lead, email, WhatsApp, or other message.
- Production deployment or `deploy.sh`.

## Route discovery verified from source

The current Next.js build lists these routes:

- Site-Bot marketing: `/site-bot`
- Site-Bot free audit: `/site-bot/audit`
- Site-Bot intake: `/site-bot/start`
- Site-Bot payment: `/site-bot/pay/[sessionId]`
- Privacy: `/privacy`
- Google Ads marketing: `/google-ads`
- Google Ads onboarding: `/google-ads/onboarding`
- Client login/dashboard: `/client/login`, `/client/dashboard`

API routes exist for audit, checkout, research, generation, deployment, sandbox verification, and campaign creation. This guide does not authorize direct API calls.

## Test 1 — Site-Bot marketing truth and navigation

Route:

`http://127.0.0.1:3199/site-bot`

Steps:

1. Inspect desktop at approximately 1440×900.
2. Inspect mobile at 390×844.
3. Check title/H1, offer, price, FAQ, structured-data-visible claims, CTA, images, RTL, and horizontal overflow.
4. Click only normal navigation links that stay on public GET pages.
5. Do not start checkout.

Expected result:

- Page loads HTTP 200.
- RTL text is readable; controls are visible; no horizontal scrolling or leaked alt text.
- Both CTAs reach `/site-bot/start`.

Known product failure to record:

- The page still presents ₪1,490 one-time pricing and corresponding schema, while the current strategy says ₪199/month with a ₪9.90 credited deposit. Mark product truth FAIL until reconciled.

Failure signals:

- Missing images, visible alt text, clipping, overlap, wrong route, console exception, local 4xx/5xx, or any production/payment request.

## Test 2 — Site-Bot free audit first-load UX

Routes:

- `http://127.0.0.1:3199/site-bot/audit`
- `http://127.0.0.1:3199/privacy`

Steps:

1. Clear local storage key `wao-privacy-consent` before each route.
2. At 390×844, open `/site-bot/audit`.
3. Confirm the business-name field and submit button are fully visible and tappable.
4. Confirm no fixed cookie dialog covers the audit form.
5. Open `/privacy` at 390×844 and confirm the privacy page still shows the consent dialog.
6. Inspect desktop versions for hierarchy and RTL.
7. Do not submit yet.

Expected result:

- Both routes return HTTP 200.
- `/site-bot/audit` has no consent overlay and its submit button is visible.
- `/privacy` retains the consent dialog.
- No horizontal overflow or material RTL defect.

Failure signals:

- Overlay intersection, hidden submit button, broken hit target, overflow, console/page error, or unexpected external request other than the known GTM attempt.

Evidence note:

- Board task `t_b44b9c88` previously reported independent PASS at 390×844. This human check confirms the current browser state, not the old screenshot.

## Test 3 — Optional free-audit submission

Route:

`http://127.0.0.1:3199/site-bot/audit`

Prerequisite:

Use only a public business name Eitan owns or is explicitly authorized to test. Do not enter a phone, email, private contact, or invented review.

Steps:

1. Enter the authorized public business name.
2. Submit once.
3. If multiple candidates appear, select the correct public listing.
4. Inspect the six score dimensions and disclosure/privacy link.
5. Do not continue to fix, GBP connect, paid Site-Bot, contact submission, or outbound sharing.

Expected result:

- The UI reaches candidate selection, a six-dimension scorecard, or a clear not-found state.
- Only business-name/public listing data is displayed.
- The disclosure and privacy link are visible.

Failure signals:

- Request hangs longer than 15 seconds, generic error, phone requested, private/provider payload exposed, wrong business selected without confirmation, malformed deep link, or any outbound message.

Side-effect disclosure:

- This test calls the Places provider and writes a minimized local audit record with a 30-day expiry. Skip this test if provider use or local persistence is not desired.

## Test 3A — Kept research tools, offline contract check

This check covers only the tools classified **KEEP THIS WEEKEND** in the launch-readiness inventory. It does not call Places, DataForSEO, NeuronWriter, or the authenticated research API; does not read credentials; and does not write to repository or production data paths.

Steps:

1. From the repository root, run the compiled mocked adapter tests:
   - `node --test dist/lib/places/client.test.js dist/lib/site-bot/research/dataForSeoResearch.test.js dist/lib/site-bot/research/neuronWriter.test.js`
2. Run the mocked architecture comparison for one representative service model:
   - `node scripts/compare-site-bot-architectures.mjs --fixture field`
3. Confirm the report says all providers are mocked, shows provenance and call/cost accounting, reports `readiness: architecture_ready`, and exits without leaving a `site-bot-cohort-*` directory in the repository.
4. Treat Test 3 above as the only optional physical Places check. Do not add a live DataForSEO or NeuronWriter probe merely to test credentials.
5. Do not call `/api/site-bot/research`; it requires `CRON_SECRET`, writes a dossier, and may consume provider quota.

Expected result:

- All three mocked adapter test files pass.
- The comparison returns a selected/backlog/rejected or held portfolio, provenance, budget accounting, link reachability, and `architecture_ready` using fixture data only.
- No credential value is displayed and `git status --porcelain` is unchanged by these commands.

Failure signals:

- Any real provider request, credential prompt/output, repository data write, missing provenance/budget accounting, failed mock, or fixture output presented as real market evidence.
- Do not add `dist/lib/site-bot/research/runResearch.test.js` to this PASS check: its stale-demand refresh case currently fails (5/6 pass), so resume/cache-refresh readiness must remain unclaimed and outside the weekend QA lane.

Hard stop:

- Live DataForSEO, NeuronWriter, or Site-Bot research runs are operator actions, not QA checks. They require approved pilot facts, explicit provider budgets, credentials already configured outside this guide, and a separately authorized run.

## Test 4 — Site-Bot intake UX without checkout

Route:

`http://127.0.0.1:3199/site-bot/start`

Safe data:

Use clearly fictional values, for example a fictional business name and non-routable contact text. Do not use a real phone, email, review, address, testimonial, or client fact.

Steps:

1. Answer enough questions to inspect single-question progression, progress indicator, keyboard Enter behavior, scroll behavior, and one anti-generic follow-up.
2. Test field-service and fixed-location branching in separate private windows if desired.
3. Stop before the final question is submitted.
4. Close the tab; do not create a checkout session.

Expected result:

- One question is active at a time.
- Progress does not jump during a follow-up probe.
- Fixed-location flow asks for an address; field-service flow skips it.
- Mobile input/send controls remain visible.

Failure signals:

- Repeated/redundant labels, wrong branch, lost answers, broken scroll, inaccessible input, overflow, or automatic checkout before final submission.

Hard stop:

- Submitting the last answer calls `/api/site-bot/checkout/init`, writes a pending checkout file, and creates a tokenization session through the configured payment provider. Do not submit the last answer in this guide.

## Test 5 — Site-Bot payment and researched-generation gap

Route pattern:

`/site-bot/pay/[sessionId]`

Do not open or test this route with a real or newly created session.

Source-verified expected failure:

- The page requires callback fields including `url` and `slug`.
- The callback currently returns research status fields and no `url` or `slug`.
- A successful paid-research response therefore enters the page's error branch.

Record this test as BLOCKED, not PASS, until a corrected implementation has independent verification. Do not try to prove the defect by charging or using the callback.

## Test 6 — Local website-preview proof

Discovery method:

There is no currently verified public/admin route that safely builds a complete researched website preview without payment/provider/deployment side effects. No TSX caller was found for `/api/site-bot/research/status`, `/api/site-bot/generate`, or `/api/site-bot/deploy`.

Human action:

1. Ask for the approved local output directory or preview route from the future pilot build contract.
2. For each of two or three pilot sites, inspect:
   - Home, service, location/profile, about/trust, contact, privacy, sitemap, and robots surfaces.
   - Real licensed hero image and no alt-text leakage.
   - Correct business facts, service area, contact recipient, and ownership disclosure.
   - Form action aimed only at a local mock receiver.
   - Canonical, metadata, schema, internal links, mobile overflow, and RTL.
3. Do not publish or deploy.

Expected result:

- A complete local website exists and is independently testable.

Current result:

- BLOCKED pending Eitan's pilot manifests and a new outcome-owned build contract.

## Test 7 — Google Ads marketing and demo-link truth

Route:

`http://127.0.0.1:3199/google-ads`

Steps:

1. Inspect desktop/mobile layout, claims, prices, phone CTA, and both onboarding links.
2. Click `Sandbox` demo only in a private local window.
3. Observe whether the onboarding is visibly demo-prefilled.
4. Do not call the phone CTA, submit a contact form, or reach payment.

Expected result for a truthful demo:

- `/google-ads/onboarding?demo=1&mode=test&clientId=google-ads-sandbox` should show a prefilled fictional profile and explicit sandbox state.

Current source-verified failure:

- Onboarding does not consume those query parameters and does not apply `DEMO_PROFILE`. Expect the route to be sandbox-labeled but not demo-prefilled. Record FAIL.

Additional claim-review failure signals:

- Unsupported ROI/CPA/ROAS claims, stale pricing, promise-like language, broken phone link, or mixed RTL layout.

## Test 8 — Google Ads onboarding, safe front half only

Route:

`http://127.0.0.1:3199/google-ads/onboarding?demo=1&mode=test&clientId=google-ads-sandbox`

Safe data:

Use fictional business information only. Do not upload images, screenshots, phone numbers, emails, or client facts.

Steps:

1. Confirm the `Sandbox / demo` badge is visible and `Live` is disabled.
2. Confirm text says no live advertising, charge, or client-account access.
3. Select a delivery model.
4. Answer only the first three or four fictional questions.
5. Inspect progress, chat scrolling, helper text, and mobile layout.
6. Stop before strategy completion, consent, payment, LP generation, or campaign launch.

Expected result:

- Live remains locked.
- Early chat works in test/simulation mode.
- No approval/payment control is used.
- No account, campaign, LP, lead, or message is created.

Failure signals:

- Live can be selected, sandbox label disappears, query claims demo but no prefill, unexpected file upload, external mutation request, or user is advanced into payment without explicit action.

## Test 9 — Optional read-only sandbox binding check

Route/control:

`/google-ads/onboarding` → `Sandbox connection check`

Prerequisites:

- An existing authenticated client session for the configured sandbox client.
- Existing test-MCC credentials and a bound test campaign.
- Eitan explicitly chooses to perform a read-only GAQL verification.

Steps:

1. Verify the page still says Sandbox.
2. Click the connection-check button once.
3. Confirm a test account and test campaign name are returned.
4. Do nothing else.

Expected result:

- Read-only success for the bound sandbox account/campaign.

Acceptable blocked result:

- Anonymous/no sandbox session returns 401.
- Missing binding returns 409.

Forbidden:

- Do not create a campaign, change status/budget/keywords, link a live client, or enable Live.

## Test 10 — Client routes, only with an existing sanctioned test account

Routes:

- `http://127.0.0.1:3199/client/login`
- `http://127.0.0.1:3199/client/dashboard`

Prerequisite:

Use only an existing sanctioned disposable test account and its already-known PIN. Do not reset or recover credentials during this guide.

Steps:

1. Log in to the sanctioned test account.
2. Confirm forced PIN-change or dashboard behavior matches the account state.
3. Inspect Site-Bot URL, task state, and GSC/Google Ads sections without taking action.
4. Log out or close the private window.

Expected result:

- Session is scoped to the test client.
- No other client's data is visible.

Failure signals:

- Cross-client data, stale unauthorized session, missing forced-change gate, or any action that writes external state.

If no sanctioned account/PIN is available, record BLOCKED. Do not create one manually.

## Simple pass/fail record

| ID | Surface | Result (PASS/FAIL/BLOCKED) | Evidence / screenshot | Failure signal | Follow-up owner |
|---|---|---|---|---|---|
| 1 | Site-Bot marketing |  |  |  | waostrategy / waocopy |
| 2 | Audit first-load UX |  |  |  | waoengineer / waouxtester |
| 3 | Optional audit submit |  |  |  | waoengineer / waoverifier |
| 3A | Kept research tools, offline contracts |  |  |  | waostrategy / waoengineer |
| 4 | Intake before checkout |  |  |  | waoengineer / waohebrewqa |
| 5 | Payment/research continuation | BLOCKED | Source contract mismatch | Callback has no URL/slug | waostrategy → waoengineer after offer decision |
| 6 | Two or three local website previews | BLOCKED | Pilot manifests absent | No complete safe preview lane | Eitan → waostrategy |
| 7 | Ads marketing/demo truth |  |  |  | waostrategy / waoengineer |
| 8 | Ads onboarding front half |  |  |  | waoengineer / waouxtester |
| 9 | Optional sandbox binding |  |  |  | waoengineer / waoverifier |
| 10 | Existing test-client routes |  |  |  | waoengineer / waoverifier |

## Stop conditions

Stop immediately and record BLOCKED if any step requests or exposes:

- A real card charge or payment profile.
- A real Google Ads account mutation or live budget.
- Cloudflare, DNS, Wrangler, Git remote, or deployment authorization.
- GBP OAuth/write.
- A real customer's phone, email, lead, revenue, credential, or private media.
- A message send, call, email, or WhatsApp action.
- Production access or `deploy.sh`.

## Exit checklist

- Stop the local server.
- Confirm no payment, message, provider mutation, deployment, commit, push, stage, or unstage occurred.
- Save only screenshots and the table; remove fictional browser input/session state if needed.
- Send the completed table to waostrategy before authorizing a pilot build or release action.
