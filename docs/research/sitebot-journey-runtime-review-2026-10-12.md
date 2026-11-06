# Site-Bot journey: independent runtime assessment — October 12, 2026

Task: t_26d80e23. Contract: 2026-10-12_007. Reviewer: waouxtester, GPT-6.1 Sol.

## Verdict

Assessment complete; focused_acceptance=true means assessment completeness only. Customer-journey acceptance=FAIL. Current final-preview delivery=FAIL from this browser. Owner-device access and founder voice approval=UNVERIFIED. release_health=false; no release recommendation.

The first customer outcome fails before business lookup: the existing private audit route shows no business-name form. The private app also loses styling and mobile layout because referenced CSS/JavaScript assets return 404. Separately, the preview renderer still selects obsolete October 5/6 drafts, not accepted V2. No working current rendered final preview was demonstrated.

Only passive browser navigation, viewport changes, DOM/resource observation, native source reads and authorized report/screenshots were used. No submission, audit-result request, lookup, SMTP send, credentials, commands, tests, builds, installs, configuration/service changes, activation or publication. No historical card was changed or successor dispatched.

## Fresh runtime evidence

Browser base: http://100.102.160.114:4017. Viewports: 1280x844, 390x844, 320x844, desktop-style emulation at each width (not a physical mobile-device test).

All three named routes loaded a document, not a browser navigation error. This is NOT an HTTP-200 assertion: document status was not captured. Screenshots show current rendered output, not intended JSX.

- /site-bot: old paid trial/package and 24-hour launch copy visible. Three primary links point to /site-bot/start. The secondary question link points correctly to /contact?ref=site-bot-offer#contact-form. No navigation to the paid/start route was performed.
- /site-bot/audit, without query parameters: header/footer and empty main area; input count zero. No audit entry, useful loading indicator or actionable error appeared. One bounded reload reproduced this. Source defines a form, but it is not rendered in this observed session.
- /contact?ref=site-bot-offer#contact-form: URL retains ref and anchor, form fields exist, and anchor scrolling reaches the form section. Idle submit is disabled with empty required fields; no claim that its event handler is hydrated or usable. Generic consultation, 24-hour response and pay-after-first-month claims remain visible. Service choices are generic, not Site-Bot-specific.
- CSS resource /_next/static/chunks/0z~f7~_xd_xx~.css returned 404 and its stylesheet has zero rules. JavaScript /_next/static/chunks/0dgh.pgw3a6-v.js and /_next/static/chunks/turbopack-0hkuttilqif7j.js returned 404. Audit-specific 029nnszc.a0~v.js and contact-specific 0btngl-vnpk3o.js also returned 404, with and without ?dpl=.
- Audit computed body font is Times New Roman and background transparent. Screenshots across routes show plain blue links, missing button styling and ineffective responsive classes. Actual serving/build/cache cause is not proven; do not diagnose it as a specific corrupt cache or prescribe restart from this assessment.
- Layout measurements on all routes: desktop clientWidth/scrollWidth 1265/1265; 390 viewport 375/603; 320 viewport 305/603. Horizontal scrolling is visibly present on narrow captures. Do not fix this with overflow hiding before restoring assets and rechecking.
- Contact at 390 retains two columns and name/phone controls around 78px wide; at 320 around 77px. Text/placeholder clipping, truncated left contact-info column, tall narrow consent and heavily wrapped submit label are visible. Source responsive collapse rules already exist in src/app/globals.css:602-604,653-657; missing CSS prevents judging whether additional layout changes are needed.
- RTL document flow exists, but mixed Latin/price runs and footer/link groups are poorly separated in this degraded presentation. No separate bidi algorithm defect established. No persistent sticky overlay obscured captured controls. Absence of hydrated widgets is not proof that healthy-runtime overlays work.
- Offer/contact DOM image lists were empty; neither captured page shows a broken image or leaked alt text. Existing offer hero uses decorative gradients, not a missing required photo (site-bot/page.tsx:132-136). CSS styling, not hero-photo authoring, is the observed asset failure.
- Resource timing showed same-origin app/static requests only in the observed sessions, with no external provider request. This is not a network-isolation guarantee: src/app/(app)/layout.tsx:143-149 contains afterInteractive Google Tag Manager. A repaired/hydrated runtime may load it; do not assume these observations authorize external tracking/provider activity.

## Current final preview: distinct gates

1. Source selection: scripts/render-founder-copy-preview.mjs:9-13 selects October 5 Site-Bot offer, October 6 contact bridge, and October 6 quick contact. loadDrafts:77-85 validates those pins and row counts; it does not discover/select newer drafts.
2. V2: docs/copy/site-bot-offer-conversion-redraft-2026-10-08-v2.md:49-65 describes free name-only available-profile-data checking, conditional selection/results, supported self-fix and optional agreed help. Paired application is required (:24-30). Existing app source and runtime remain the older journey.
3. A path-only swap is insufficient: renderer extractDraftRows:51-66 accepts limited key flags; V2 has NEW/FLAGGED/supplemental rows (:174-176,283-286) outside that grammar. Existing canonical engineer must reconcile exact accepted inventory/flags, not silently omit them. Source observation only; parser was not executed.
4. renderFounderCopyPreview:88-95 produces replacement-row review cards, not the finished application journey. createPreviewServer:114-135 checks served HTML against selected inputs and serves an immutable root-only snapshot. No serving/output inspection or new hashes were measured here. Historical hash strings are attribution only.
5. HTTPS https://msi-1.tailc496b2.ts.net:8443/: first attempt DNS_PROBE_STARTED; bounded retry DNS_PROBE_FINISHED_NXDOMAIN. Browser error page, not TLS bypass. HTTP http://100.102.160.114:8766/: ERR_EMPTY_RESPONSE on both attempts. Private failure screenshots retained. Neither root delivered review content from this browser.
6. Owner-device DNS/trusted TLS and founder voice approval were not tested. Historical preview implementation DONE is not current delivery. Do not ask Eitan to approve obsolete rows, these broken app pages, or Markdown as the final preview.

## Contact-to-follow-up seam: source only

- Input/consent: ContactForm.tsx:53-69 requires name, phone and consent; posts /api/lead with source prop plus ref/UTM. Contact page supplies source=contact-page (:168-170); useLeadTracking.ts:13-23,41-43 reads current URL once. Ref is preserved in observed URL, but outgoing attribution was not exercised. Client-side navigation reuse could merit later tests; no loss demonstrated here.
- Transport acknowledgement: ContactForm.tsx:71-78 requires HTTP OK plus parsed ok:true before success/dataLayer event. lead/route.ts:96-119 validates consent/fields, :122-128 fails closed for missing SMTP configuration, :130-134 awaits sending. sendLeadEmail:86-93 checks exact recipient accepted and not rejected. No actual SMTP availability or successful send verified.
- Stored record: inspected lead route has no database/file insertion, durable request ID, queue or persistence step. An SMTP acceptance is not a persistent CRM record. Audit snapshot storage referenced by audit-result/route.ts:33 is a different record, not an inquiry/follow-up record.
- Operator visibility: email payload includes source/ref/UTM at lead/route.ts:70-84 and sends to configured notify recipient. A notification mechanism exists in source; recipient identity/configuration, mailbox arrival, inbox visibility and operator reading are unverified. No credentials or customer records inspected.
- Follow-up ownership: no assigned operator, tracked state, retry/dead-letter queue, response deadline enforcement or completed follow-up is established by this path. Source/UI names a human and times, but that is a claim, not evidence of ownership or receipt.
- Human receipt: UNVERIFIED. Current success copy ContactForm.tsx:104-116 says received and promises a callback within 24 business hours, stronger than SMTP acknowledgement. Success state was not triggered. V2 replacement keys at :275-279 correctly target this distinction; founder voice remains separate.

## Prioritized repair matrix

| Priority/class | Issue and evidence | Business impact | Smallest repair / specialist | Evidence limit |
|---|---|---|---|---|
| P0 functional/runtime | CSS and route JS 404; audit has zero inputs; audit-1280-entry.png, audit-390-entry.png, audit-320-entry.png | Customer cannot begin the promised useful outcome | waoengineer: restore matching document/static-asset delivery in an explicitly authorized local lane; preserve source, then rerun passive checks | Underlying serving cause unknown; no service/build authority in this task |
| P0 final-preview/capability | Obsolete renderer inputs :9-13; both review roots unreachable; preview-https-attempt-2.png, preview-http-attempt-2.png | No current rendered owner checkpoint | SAME canonical engineer t_2b583188: stage accepted paired V2 with inventory/flag coverage under legitimate command capability; activation/access separately gated | Blocked card is not reopened; no current candidate/readable final preview proven |
| P1 stale copy/destination | Offer price/time claims and primary /start links; page.tsx:152-170,261-271,445-460; offer screenshots | Paid/automated promise competes with audit-first MVP | waoengineer: apply already accepted paired V2 structural/copy changes only after founder/SEO/scope gates; waocopy/waohebrewqa only for material new wording | Checkout availability is historical/source attribution, not freshly exercised |
| P1 mobile UX | All routes scrollWidth603 at390/320; contact controls77-78px and clipped columns; contact narrow captures | Consent/help request difficult to read and use | waoengineer: first restore CSS, then verify existing responsive rules; adjust only residual failures | Do not treat degraded CSS as proof of faulty intended design |
| P1 acknowledgement/follow-up | Generic SLA/consultation/payment claims visible; success source stronger than transport; ContactForm:104-116,258-270; contact/page:60-98 | Customer expects human response/terms not evidenced | Existing paired V2 first; strategist chooses minimal explicit assisted follow-up ownership, engineer implements only scoped seam if needed | No CRM/operator/human receipt or submission PASS |
| P2 accessibility, source-only | audit/page.tsx:372-391 label has no htmlFor and input no id | Accessible business-name input may lack programmatic name | waoengineer: associate existing label/input when touching this form | Not a live accessibility tree finding: audit form currently absent |

Detailed terms should live on Terms; keep material offer/price/authorization truth beside the relevant choice. No legal rewrite or legal acceptance recommended here. No reason established to replace accepted V2 with another copy drafting cycle: the current failure is selection, delivery and runtime, not freshly observed V2 whole-page craft.

## First repair and practical continuation

First incomplete customer outcome: reach a styled audit entry and begin the honest free check, followed by a truthful consented help-request seam. Highest-impact runtime repair is matching app static-asset delivery, not a new slogan, CRM rebuild or GEO/test-runner rewrite.

Next owner-facing checkpoint remains a working CURRENT rendered V2 preview. waostrategy owns continuation: preserve t_2b583188 as canonical preview implementation, resolve only its concrete command-capability prerequisite in the legitimate attended lane, and route that existing work when genuinely runnable. Do not bypass safeguards, revive denied commands, manufacture planning descendants or ask routine product choices. If command execution remains unavailable, state that gate promptly; this read-only run cannot turn source approval into execution consent. Asset repair/service/build and preview activation require their own exact authorized scope, not implied permission from this report.

Board readback at inspection: t_2b583188 blocked (persisted first-line metadata recovered; entire oversized comment thread not recovered); t_708b08a0 blocked, with source-preparation claims and unresolved complete test/lint runtime descriptor/one-time invocation consent. Neither was altered. Current assessment card was the assigned running inspector; no exhaustive board-wide duplicate census was available from the exposed native tools.

## Evidence inventory and acceptance mapping

Private screenshot root: /home/eitanya/.hermes/profiles/waouxtester/cache/scratch/sitebot-journey-2026-10-12/
Native file inventory verified 19 PNGs:
- offer-{1280,390,320}-{hero,closing}.png
- audit-{1280,390,320}-entry.png
- contact-{1280,390,320}-form.png
- contact-320-hero.png; contact-{390,320}-submit.png
- preview-{https,http}-attempt-{1,2}.png

Screenshots were inspected natively; no customer data or entered form values. Retain privately, not publication assets. The report is the only repository write. CSS/layout reads were supplementary investigation, not edits.

Acceptance: required route/viewports and failure retries observed; current preview input/reachability/founder gates separated; acknowledgement/persistence/operator/follow-up mapped; prioritized repair matrix supplied; runtime/source/history distinctions maintained. All assessment criteria complete. Product acceptance remains FAIL/UNVERIFIED as above. Canonical tests/build N/A and prohibited for this assessment.

Telemetry: elapsed, model/API call count, slowest model call and aggregate tool count unknown (not exposed without additional execution). Independent reads/checks batched=yes. Browser capture call labels/timestamps are not an implementation-speed benchmark.
