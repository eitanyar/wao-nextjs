# Mission: Site Bot full system live by 2026-11-19

Eitan, 2026-11-12: "Write it now as if it already exists. Add a stamp (product is in the build, 7 days to takeoff). Let's make it happen." The /site-bot round-2 copy sells the full system and carries a launch stamp for 19.11.2026. This mission makes every sold piece real by then. Gap table: docs/reviews/site-bot-product-truth-check-2026-11-12.md.

## Outcome
A paying Site Bot client gets everything /site-bot sells:
1. **Site:** a service-tree site with hours, a call button, a VISIBLE link to his Google profile, and reviews he picks. Built already, except the visible profile link.
2. **Google profile:**
   - WAO connects as a manager while he stays the owner;
   - his services, areas, hours and description are synced to the site, using the existing executePatch engine (enabled in prod) plus a new services write.
3. **Reviews:**
   - after a job, he gets a ready-to-forward review-request message with his review link (Hebrew via Tamar, Site Bot clients included);
   - when a new review lands, he gets a draft reply to approve, then it's posted. GBP_INTEGRATION_ENABLED goes on for Site Bot clients.
4. **Monthly report:** calls, direction requests and website clicks from the GBP Performance API, plus new reviews, sent to him monthly. The terms already promise it.
5. **Purchase path:** after the free check, a working path to start, with the buy CTA enabled in prod. Manual invoicing counts until Takbull ₪199 is live.

## Files
- src/lib/gbp/*;
- src/app/api/site-bot/{fix-execute, gbp/oauth/*, connect-gbp};
- src/app/api/leads/route.ts;
- src/lib/crm/reviewFlywheelCopy.ts;
- src/lib/lp/renderSitePages.ts;
- src/app/(app)/site-bot/audit/layout.tsx;
- a new monthly-report job.

## Constraints
- data/clients/ is never written, except for named test clients (test-plumber-tlv, test-core30-verify).
- WAO never messages the end customer.
- All new Hebrew comes from Tamar → Noa.
- Feature flags stay per client.

## Acceptance
- On test-plumber-tlv, end to end:
  - connect as manager;
  - a profile patch applies and is read back;
  - the review message is queued to the owner;
  - a draft reply is approved and posted;
  - the monthly report renders with real Performance API numbers;
  - the site shows the visible profile link.
- npm test and build (--webpack) pass.

## Verifier
Roni runs the acceptance flow on the test client and confirms the live /site-bot page and the generated site.

## Decision needed on 2026-11-19
If any piece isn't live, either the stamp date moves or that line comes off the page. Never ship copy for a piece that isn't live once the stamp is gone.
