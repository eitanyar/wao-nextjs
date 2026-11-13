# Site Bot Redesign item 6 (Google reviews block) + item 7 photo half (GBP photos): post-launch spec

Fable 5.2, read-only, 2026-11-13. No Hebrew is authored here. All Google facts were fetched today (table under Constraints).

## Outcome

A generated client site shows, **only when the owner has agreed and WAO's manager connection to their Google profile works**:

1. **Rating chip** in the homepage hero: score and review count, linking to `#reviews`.
2. **Reviews section** on the homepage: summary row, up to 6 of the latest reviews exactly as Google returns them, a visible "Google" source line, the "how these were picked" line, and a link to all reviews on Google.
3. **Hero photo** on the homepage: the owner's own GBP photo, beside the text on desktop and below the CTAs at 390px.
4. **Gallery** on the homepage: exactly 4 owner photos, only when 4 are available besides the hero.
5. **og:image and schema `image`** from the hero photo (Yonatan condition 9, owner-photo branch).

Without consent, connection or fresh data, none of this renders and the output is **byte-identical to today's**. Service pages do not change in v1.

### What exists today (read in code)

| Thing | State | Where |
|---|---|---|
| Hero photo slot | Renders `''` | `src/lib/lp/siteDesign.ts:278-280`; called at `researchedSite.ts:795`, `renderStaticHtml.ts:152` |
| Stock image guard | og/schema image dropped when it is Unsplash | `siteDesign.ts:94-108`; `renderSitePages.ts:395,421,465` |
| Hero image source | First owner upload, else stock | `src/app/api/site-bot/deploy/route.ts:323` |
| Review shown today | One owner-typed quote, no Google data | `researchedSite.ts:417-420, 654-668` |
| Legacy template | Hard-coded five-star row | `renderStaticHtml.ts:159-164, 186` |
| Rating schema | Absent, and a test asserts it | `renderSitePages.ts:312-315`; `siteDesign.test.ts:117-119` |
| Labels for both items | Approved by Noa, not wired | `docs/copy/site-bot-redesign-ui-labels-FINAL-2026-11-12.json`; exclusions listed at `siteDesignLabels.ts:7-8` |
| GBP review fetch | First page only, no parameters | `src/lib/gbp/client.ts:94-96` |
| GBP media fetch | Not built | No media call in `src/lib/gbp/` |
| Owner-authorised connection | Not built: OAuth returns 503, and the connect route stores whatever ID it is handed, with no login | `gbp/oauth/start/route.ts:3-7`, `callback/route.ts:3-7`; `connect-gbp/paid.ts:20-57` |
| Scheduled redeploy | None; deploy needs an admin cookie and still publishes to Pages | `deploy/route.ts:214-218, 450-455` |
| Shared Worker hosting | Design note only; no `workers/` directory | `docs/missions/site-bot-shared-worker-hosting-2026-11-12.md` |

### Prerequisites (not in this estimate)

- **P1. Manager-invite connection** (readiness build step 6, 2 days). The owner invites WAO's Google account as manager, and WAO accepts through `accounts.invitations` (list with filter `LOCATIONS_ONLY`, then accept). This spec consumes one function: `getVerifiedGbpBinding(slug)` → `{ accountId, locationId, placeId, verifiedAt } | null`.
- **P2. A non-interactive publish path.** Either the shared Worker (launch row 8) or today's Pages deploy works; images are ordinary files in both.
- **P3. Account-to-site mapping.** The owner's account page must know their site slug. I found no such mapping in `src/lib/payments` (grep for `siteSlug`); launch row 9 is expected to add it. If it does not, add 0.25 day.

### Data flow

1. **Daily job** (system crontab → `POST /api/site-bot/cron/proof-refresh` with the `CRON_SECRET` bearer, same pattern as `scripts/cron/charge-subscriptions.sh:93-96`). It loops over sites that have consent and a verified binding, one at a time.
2. **Proof of authorisation on every run.** Read the location through the Business Information API with WAO's manager token and compare its place ID to the site's `collectedData.placeId`. A mismatch, 403 or 404 means not authorised. The self-reported binding in `connect-gbp/paid.ts` is never accepted as proof.
3. **Reviews.** One call: `reviews.list`, `pageSize=50`, `orderBy=updateTime desc`. Keep `averageRating`, `totalReviewCount` and the reviews in the returned order.
4. **Photos.** `media.list`, then keep only the media keys staff selected and the owner approved (see Consent). Download each one fresh and process it (see Image processing).
5. **Store** the snapshot in `data/site-proof/{slug}/snapshot.json` plus `photos/`. This is a new data root, gitignored, and never under `data/clients/`.
6. **Change check.** Hash what would be displayed: the 6 shown reviews (id, name, stars, text, createTime), average, count, and photo file hashes. Redeploy that one site only when the hash differs from the deployed one. An unchanged day just updates `fetchedAt`.
7. **Publish** through a shared `deploySite(slug, { trigger })` function extracted from `deploy/route.ts:225-493`. All existing gates stay: deploy-ready, the approved copy-review packet match (`:302-303`), and claim blockers (`:308`).

### Display rules (reviews)

- **Selection:** the first 6 reviews in API order that have a non-empty `comment`. No star filter, ever. Fewer than 3 text reviews → no reviews section and no chip.
- **Text:** `comment` verbatim, HTML-escaped, `dir="auto"`. It never passes through a copy step, a model or a trim.
- **Long text:** the full text is always in the HTML. A small inline script adds a visual 8-line clamp and a `<button aria-expanded>` toggle; without JS the full text shows.
- **Name:** `reviewer.displayName` as returned, `dir="auto"`. If empty, the name line is omitted. No reviewer photos.
- **Date:** month and year from `createTime` in Asia/Jerusalem, using `review.date` and `review.date.months`. Never relative.
- **Stars per review:** N filled and 5−N outline icons, `aria-hidden`, plus `.sr-only` text from `review.stars.aria`.
- **Summary and chip:** `averageRating` to one decimal, and `totalReviewCount` through `hero.rating.count`. One star icon beside the number, not a five-star row, so nothing is rounded visually. `hero.rating.aria` goes on the chip.
- **Credit:** `reviews.source` with "Google" wrapped in `<bdi>`, `reviews.selection`, and `reviews.seeAll` linking to the business's Google profile (`googleProfileUrl`, the same source as the existing profile link at `researchedSite.ts:112-115`). No Google logo, and no copy of Google's card design.
- **Headings:** `reviews.heading` and `gallery.heading` are `<h2>`. Cards are `<li>` items with no headings. The chip is an `<a>`, placed above the `<h1>` and never inside it.
- **Existing owner-typed quote** (`reviewSection` / `proofSection`) keeps rendering unchanged (Yonatan condition 2).

### Layout

| | 390px | Desktop (≥900px, the existing breakpoint `siteDesign.ts:32`) |
|---|---|---|
| Chip | Above the H1, 44px tall. The H1 stays on the first screen. | Same |
| Hero photo | Below the CTAs and hours line, full width, 4:3, 16px radius | Second grid column (`1.1fr .9fr`), 4:3, vertically centred |
| Reviews | Horizontal snap row, cards 84% wide so the next card peeks. `role="region"`, `tabindex="0"`, labelled by `reviews.list.label`. | 3-column grid, no scrolling |
| Gallery | 2×2, square | 4 across, square |

- **Section order on the homepage:** the reviews section, then the gallery, both inserted after `serviceDetailsSection` and before `aboutSection` (`researchedSite.ts:798-799`).
- **RTL:** logical properties only (`margin-inline`, `padding-inline`, `scroll-padding-inline`). The snap row starts at the right edge. The score, count and dates are isolated with `<bdi>` where they sit inside Hebrew text.
- **CSS** goes into `siteCss()` as classes (`.chip`, `.rv-*`, `.gal`, `.hero-photo`), with no inline styles. The star colour stays decorative and the number is always present as text.

### Image processing

- Runs in the refresh job with `sharp` (already a dependency, `package.json:29`), not at render time.
- Per source photo: download, apply EXIF rotation, strip all metadata (including GPS), crop with `fit: cover` and attention positioning, never upscale.
- **Hero:** 4:3 WebP at 480, 800 and 1200 px wide. Source must be at least 800px wide.
- **Gallery:** 1:1 WebP at 320 and 640. Source must be at least 480px.
- **og:image:** 1200×630 JPEG.
- **Budgets:** hero 800w ≤ 90 KB, gallery 640 ≤ 70 KB each.
- **Files:** content-hashed names under `/img/` (for example `/img/ab12cd34-hero-800.webp`), cached long.
- **Markup:** `<img>` with `src`, `srcset`, `sizes`, `width`, `height`, `alt` and `decoding="async"`. Gallery images are `loading="lazy"`. The hero image gets a `<link rel="preload" as="image" imagesrcset media="(min-width:900px)">` so it is prioritised only where it is above the fold.
- **Alt text:** from the role staff tagged (`job`, `owner`, `van`) → `photo.alt.job`, `photo.alt.owner`, `photo.alt.van`, with the business name. og:image alt uses `og.alt`.
- **Photo counts:** 0 approved → nothing renders. 1–4 → hero only. 5 or more → hero plus a gallery of exactly 4.

### Consent

- **Two separate opt-ins** on the owner's account page: "show my Google reviews" and "use my Google photos".
- **Stored** in `data/site-proof/{slug}/consent.json`: who, when, IP, and the version of the consent text.
- **Never** in `data/sites/{slug}.json`. That file's bytes are matched against the approved copy-review packet (`deploy/route.ts:302-303`), and any write there would void the approval.
- **Photos:** staff pick the hero and gallery photos from the owner's GBP media in an admin screen and tag each role. The owner sees the picks and approves them. The approval includes a statement that the photos are theirs to use.
- **Off switch:** either toggle off → the next job run redeploys without that block and deletes the stored content. Staff have a per-site kill switch that does the same immediately.

### Removal and failure rules

| Event | Action |
|---|---|
| A review is deleted or edited on Google | Google sends no deletion notice, so the daily fetch is the only detector. The next run sees a different set, the hash changes, and the site redeploys. Worst case 24 hours. |
| A photo is removed from the profile | Its media key is missing from `media.list` → dropped at the next run; the hero falls back to the solid hero. |
| 403/404 or place-ID mismatch (owner removed WAO) | Redeploy without both blocks at that run, delete the snapshot and photos, alert staff. |
| Fetch errors (5xx, timeout) | Keep serving. Alert staff after 3 failed days. At 21 days since the last good fetch, redeploy without the blocks. |
| Render time, snapshot older than 30 days | The renderer itself refuses to emit the blocks (second guard, Yonatan condition 5). |
| Subscription cancelled | Blocks removed and stored content deleted at the next run; WAO's manager access is removed by hand within 7 business days. |

### Rollout to the pilot sites

1. Ship with `SITE_PROOF_ENABLED` unset. Roni confirms every pilot site's HTML is byte-identical before and after the code deploy.
2. Rehearse end to end on WAO's own Google profile with a test site.
3. Per client, after P1 connects them: owner consents → staff pick photos → owner approves → first manual deploy → Roni checks → the daily job takes over.
4. There are no pilot clients yet (10 is a cap), so this is a per-client switch-on, not a batch migration.

## Files

| File | Change |
|---|---|
| `src/lib/gbp/client.ts` | `listReviews` takes `pageSize`, `orderBy`, `pageToken`; new `listMedia`; add `metadata` to the `getLocation` read mask (`:89-91`) for the place ID. |
| `src/lib/site-bot/siteProof.ts` (new) + test | Snapshot and consent types, read/write, display selection, display hash, the 30-day and 21-day rules. Pure functions; the fetcher is injected, as in `reviewPoll.ts:64-67`. |
| `src/lib/site-bot/siteProofImages.ts` (new) + test | Download and `sharp` processing; size and weight checks. |
| `src/lib/dataRoots.ts` | New root kind `siteProof` (`WAO_SITE_PROOF_DIR`, default `data/site-proof`), written as a literal join like the others (`:51-55`). |
| `.gitignore`, `next.config.ts` | Ignore `data/site-proof/`; add it to the tracing excludes alongside the other data roots. |
| `src/lib/lp/siteDesignLabels.ts` | Add the `hero.rating*`, `reviews.*`, `review.*`, `gallery.heading`, `photo.alt.*`, `og.alt` keys. Written by script from the FINAL JSON bytes as `\u` escapes, never typed (the file's rule, `:4-9`). |
| `src/lib/lp/siteDesign.ts` | `heroPhotoSlot(photo?)` renders the image; new `ratingChip`, `reviewsSection`, `gallerySection`; CSS classes in `siteCss()`. |
| `src/lib/lp/researchedSite.ts` | Optional `proof` param on `RenderResearchedSitePagesParams`; chip, sections and hero photo on the homepage only (`:795-799`); og and schema image from the hero photo. |
| `src/lib/lp/renderStaticHtml.ts` | Pass the photo to `heroPhotoSlot` (`:152`). Remove the hard-coded star rows (`:159-164, 186`) after Yonatan confirms (Noa fix 6). |
| `src/lib/site-bot/deploySite.ts` (new) | Render and publish core extracted from `deploy/route.ts`; adds image files to the upload set next to the font files (`:433`). |
| `src/app/api/site-bot/deploy/route.ts` | Becomes a thin admin wrapper around `deploySite`. |
| `src/app/api/site-bot/cron/proof-refresh/route.ts` (new) + test | Bearer-protected daily job. |
| `scripts/cron/site-proof-refresh.sh` (new) | Crontab entry script, `flock` guarded. |
| `src/app/(product)/account/…` | Consent section with two toggles and the photo approval. |
| Admin photo picker + kill switch | New admin page and route, behind the existing admin cookie check. |
| `src/lib/lp/siteDesign.test.ts`, `researchedSite.test.ts` | New fixtures with proof data; assertions listed under Acceptance. |

Not changed: `data/sites/*.json` records, `researchedPageTitle()`, `researchedPageH1()`, `src/lib/gbp/reviewPoll.ts` and its store under `data/clients/`.

## Constraints

### Google facts (all fetched 2026-11-13; none of these pages shows a last-updated date)

| Fact | Source |
|---|---|
| Stored API content: "no more than 30 calendar days", stored securely, "cannot be manipulated or aggregated in any way". Only "limited amounts" may be stored, to improve performance. | developers.google.com/my-business/content/policies (Content storage) |
| Attribution must be shown as provided and not altered; the Business Profile interface's look and feel must not be replicated. | Same page (Unauthorized use of branding) |
| An end client must be able to disconnect within 7 business days, and our permissions must then be removed. | Same page; support.google.com/business/answer/7353941 |
| The client keeps ownership and invites the third party as manager, not owner. | support.google.com/business/answer/7353941 |
| **The policy page neither permits nor forbids showing API content on the business's own site.** | Same policy page: no section addresses display |
| `reviews.list`: max `pageSize` 50; default order `updateTime desc`; other orders `rating`, `rating desc`; returns `averageRating` and `totalReviewCount`; "only valid if the specified location is verified"; scope `business.manage`. | …/rest/v4/accounts.locations.reviews/list |
| Review fields: `reviewId`, `reviewer.displayName`, `reviewer.isAnonymous`, `reviewer.profilePhotoUrl`, `starRating` (ONE–FIVE), `comment`, `createTime`, `updateTime`, `reviewReply`. | …/rest/v4/accounts.locations.reviews |
| `media.list`: default page 100, max 2500. `googleUrl` "may change over time". Categories include COVER, PROFILE, EXTERIOR, INTERIOR, AT_WORK, TEAMS, ADDITIONAL. Customer attribution must be shown unaltered. | …/rest/v4/accounts.locations.media and /list |
| Customer-contributed photos have their own endpoint (`media.customers.list`, max 200). | …/accounts.locations.media.customers/list |
| Notification types: NEW_REVIEW, UPDATED_REVIEW, NEW_CUSTOMER_MEDIA and others. **No type for a deleted review or deleted media.** | …/notifications/rest/v1/NotificationSetting |
| Invitations: `accounts.invitations.list` with filter `ACCOUNTS_ONLY` / `LOCATIONS_ONLY`, plus accept and decline. | …/accountmanagement/rest/v1/accounts.invitations/list |
| Limits: 300 requests a minute per API on the listed APIs; the v4 reviews/media limit is not listed. | developers.google.com/my-business/content/limits |
| No retirement date is published for v4 reviews or media. | developers.google.com/my-business/content/sunset-dates |
| Review stars in search: when the business controls reviews about itself, `LocalBusiness`/`Organization` pages are ineligible, "either directly in their structured data or through an embedded third-party widget". Violations can lead to a manual action. | developers.google.com/search/docs/appearance/structured-data/review-snippet |

**Not confirmed by today's docs, so the engineer checks on WAO's own profile before the first client:**
- Whether `media.list` returns only owner uploads. Rule until proven: use an item only if it has no `attribution` and its key is absent from `media.customers.list`.
- Whether `comment` can carry "(Translated by Google)" text. Show it as returned either way.
- What `displayName` holds when `isAnonymous` is true.

### Rules

1. **Source:** reviews, average and count come only from the GBP API through WAO's manager access. No Places content and no scraping (Yonatan condition 4).
2. **No editing:** no cutting, reordering, star filtering, recalculating or translating. Selection is "first 6 with text in API order" and nothing else.
3. **No rating schema:** no `AggregateRating` and no `Review` in any JSON-LD.
4. **SEO anchors:** `<title>`, `<h1>`, meta description and canonical are byte-identical with and without the blocks, on every page. One `<h1>` per page.
5. **Hebrew:** the engineer types none. Labels come from the FINAL JSON by script. Review text is user content and is never retyped or normalised.
6. **Stock:** no stock image anywhere; no customer-contributed photo.
7. **Data:** nothing writes to `data/clients/` or `data/sites/`. Check `git diff data/clients/ data/sites/` after every run.
8. **Next.js:** read the relevant guide in `node_modules/next/dist/docs/` before writing the routes (AGENTS.md).
9. **Build:** `sharp` must not break the standalone build. Boot the standalone server locally before deploy.
10. **Token:** one WAO manager token (`client.ts:35-41`); all calls stay behind `isGbpLive()` (`:50-52`).

### Policy risk, stated plainly

Google's API policy is silent on showing this content on the owner's site and allows storage only in "limited amounts" for performance. Yonatan's reading on 12.11 is that display is acceptable with a refresh inside 30 days. This spec follows that reading and goes further with a daily refresh. The fallback, if Google objects, is the kill switch: the chip and section come off and only the existing profile link remains.

### Copy still needed (waocopy briefs; Tamar → Noa)

| Brief | Persona | Angle | Where |
|---|---|---|---|
| Consent, reviews | Site Bot client, one-person trade, not technical | Honest and short: the site shows the latest Google reviews as they are, including bad ones; they cannot pick; they can switch it off any time | Account page toggle, helper line, confirmation |
| Consent, photos | Same | We use photos they uploaded to Google; they confirm the photos are theirs; they approve the picks; off any time | Account page |
| Long-review toggle | Site visitor | Two tiny labels: expand and collapse | Review card button |
| Connection-lost notice | Same client | Reviews came off the site because the Google connection stopped; how to restore | Email |

Two wording checks for Noa and Yonatan, no new copy unless they say so:
- `reviews.selection` says "the latest reviews". Actual behaviour is "latest written or edited, with text".
- The sales page says the site shows reviews "you picked" (ledger B9). That stays true only for the existing owner-typed quote.

## Acceptance

1. **Byte-identical when off.** With no snapshot or no consent, every file from the researched fixture and from `renderCore30Verify()` equals today's output byte for byte (golden test).
2. **Anchors.** With a proof fixture, `<title>`, `<h1>`, meta description and canonical on every page equal the no-proof render. `<h1>` count is 1. The chip is not inside the `<h1>`.
3. **No rating schema.** The existing assertion (`siteDesign.test.ts:117-119`) runs on the proof fixture and passes.
4. **Verbatim.** A fixture review with Hebrew, English, emoji, `<script>` and 1,500 characters appears escaped and complete in the HTML, with `dir="auto"`.
5. **Selection.** A fixture with a 1-star review first shows it first. Rating-only reviews are skipped. Two text reviews → no section and no chip.
6. **Freshness.** A snapshot with `fetchedAt` 31 days old renders no blocks. The job redeploys without blocks at 21 days of failures.
7. **Deletion.** Remove a review from the fetch fixture → the hash changes → one redeploy → the review is absent from the HTML.
8. **Revocation.** A 403 fixture → blocks removed, snapshot and photos deleted, alert raised.
9. **No needless deploys.** Two runs with identical data produce zero deploys on the second.
10. **Images.** Every `<img>` has `width`, `height` and non-empty `alt`. Files meet the weight budgets. No EXIF in outputs. No `unsplash` and no `googleusercontent` URL in any page.
11. **Consent isolation.** `data/sites/{slug}.json` bytes are unchanged after consent, photo picks and ten job runs.
12. **Cron route.** Returns 401 without the bearer.
13. `npm run test`, then `npm run build -- --webpack`, serially; scoped lint; standalone boot.
14. Served HTML has no CJK, Cyrillic or Arabic characters introduced by our own templates; `git diff` shows no unintended Hebrew changes. Review text itself is exempt, as it is shown as written.

## Verifier

**Roni (runtime, on the rehearsal site connected to WAO's own profile):**
- Before and after the code deploy with the flag off: fetch every page and diff; expect zero bytes changed.
- Flag on: home page returns 200 with the chip, section, hero photo and gallery. Score and count match what the Google profile shows that day.
- `curl` each image URL: 200, correct content type, under budget. og:image returns 200 and is 1200×630.
- Title, H1 and meta description diff against the "before" capture: identical. One H1 per page. No `Review` or `AggregateRating` in the JSON-LD. Bidi regression grep returns 0.
- Screenshots at 390px and 1440px, home page, top and reviews section.
- Turn consent off → after one job run the blocks are gone and `data/site-proof/{slug}/` holds no review text or photos.
- Run the job twice with no change: no second deploy.

**Maya:** at 390px the H1 is on the first screen with the chip above it; the review row is reachable and scrollable by keyboard, with a visible focus ring; the long-review button announces its state; no horizontal page overflow; gallery alt text is acceptable when repeated (her call); `<bdi>` around "Google", the score and dates.

**Yonatan:** sign off on (a) `data-nosnippet` on the review list, which I recommend so a reviewer's sentence or name never becomes the search snippet; (b) removing the legacy hard-coded star rows; (c) keeping the owner-typed quote next to the Google block.

**Noa:** the two wording checks above, and the four new briefs before they ship.

**Eitan:** spot-check of the consent text (founder-facing Hebrew).

## Engineer-days estimate

| Work | Days |
|---|---|
| GBP client extensions, snapshot store, selection, hash, age rules, tests | 1.0 |
| Image pipeline with `sharp`, budgets, tests | 1.0 |
| Renderers: chip, reviews section, hero photo, gallery, og/schema image, CSS, labels by script, tests | 1.5 |
| `deploySite` extraction, cron route and script, change detection, removal and purge | 1.0 |
| Consent on the account page, admin photo picker, kill switch | 1.25 |
| Rehearsal on WAO's profile, verifier, Maya, Yonatan and Noa rounds, first client switch-on | 0.75 |
| **Total** | **6.5** |

Not included: P1 manager-invite connection (2 days, already planned as step 6), shared Worker hosting (launch row 8), and P3 if missing (0.25). The generated og fallback card for sites without a photo (condition 9's second branch) is left out; about 0.5 day if wanted.

## Open founder decisions (with my recommendation)

1. **Bad reviews show automatically.** The block shows the latest reviews with no filter, so a 1-star review appears on the client's site within a day. Recommend: accept this, make the block opt-in per owner with an off switch, and say so in the consent text. Picking only good reviews is not an option under Google's rules.
2. **Minimum to show.** Recommend at least 3 reviews with text; below that, no block and no chip.
3. **Who picks photos.** Recommend staff pick and tag, the owner approves. It is about 10 minutes per client and avoids wrong alt text.
4. **Reviewer names.** Recommend showing the name as Google returns it and asking the lawyer two questions: reviewer names on a client's site under Israeli privacy law, and WAO's right to use owner photos. Add a terms clause on displaying reviews and photos and on removal at cancellation.
5. **The "reviews you picked" line on /site-bot.** Recommend keeping it, because the owner-typed quote stays, and having Noa confirm the wording once the Google block is live.
6. **Queue position.** Recommend after Ads Bot phase 2 (30.11–3.12) and straight after step 6, since it cannot start earlier. Realistic slot: mid-December.
7. **Rehearsal profile.** Recommend WAO's own Google profile, which the readiness note already asks for.
8. **Residual Google policy risk** (see "Policy risk"). Recommend proceeding on Yonatan's reading with the daily refresh and kill switch, and having Amit or the lawyer read the policy page once before the first client goes live.