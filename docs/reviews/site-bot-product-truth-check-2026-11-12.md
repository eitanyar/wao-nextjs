# Site Bot product-truth check for round-2 copy (Explore, read-only, 2026-11-12)

| Claim | Status | Evidence |
|---|---|---|
| Free check needs only the business name, no signup | LIVE | audit/page.tsx:527-534, :200; scorecardCopy.ts:6 (name kept 30 days) |
| Free check returns in seconds (15s client ceiling per call) | LIVE | page.tsx:28; one Places text search, audit-lookup/route.ts:108 |
| Buy CTA after the check | OFF in prod | audit/layout.tsx:14 (SITE_BOT_PAID_FLOW + non-prod) |
| Generated site: click-to-call | YES | researchedSite.ts:492-498; renderSitePages.ts:147-148 |
| Generated site: page per service (service tree) | YES | researchedSite.ts:45-46,124,263 |
| Generated site: opening hours (prefilled from Google) | YES | renderSitePages.ts:666-682; placePrefill.ts:118,137 |
| Generated site: review quotes | PARTIAL | up to 2 quotes the OWNER typed into the bot, not pulled from Google (placePrefill.ts:8-9) |
| Generated site: visible link to the Google profile | NO | only JSON-LD sameAs (renderSitePages.ts:317,328) |
| GBP management (hours, categories, description, website, phone) | CODE EXISTS, OFF in prod | executePatch.ts:39-135; fix-execute 503; gbp/oauth/start 503 |
| GBP services / posts writes | NO | — |
| WAO added as manager, owner stays owner | PLAN only, not built | connect-gbp/paid.ts:11 records the value only |
| Owner gets a ready review-request message to forward | PARTIAL: queued wa.me link on a staff dashboard, opt-in per client, placeholder copy "do not ship", keyed to campaign leads not Site Bot | leads/route.ts:39-79,226; reviewFlywheelCopy.ts:8-9 |
| WAO drafts replies to Google reviews | Drafts for human approval exist; posting OFF in prod | review-poll.mjs; reviewResponder.ts:1-5; gbp/review-reply 503 |
| Monthly report (calls, directions, reviews) | NOT BUILT (promised in terms) | site-bot-paid-journey-v2 :56-64; siteBotTerms.ts:57 |
