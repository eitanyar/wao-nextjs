# Site Bot visual upgrades: implementation plan

Read-only; nothing was changed or run. Launch-build status is read from git history, not checked at runtime.

## Three conflicts with approved decisions

1. **Reviews have no source before launch.** Yonatan's condition 4 allows reviews only from the owner-authorised GBP API. That connection (build step 6) is not built: `listReviews` reads the first page only, there is no media call, and `getVerifiedGbpBinding` does not exist.
2. **Matched or "best" reviews reverse the 13.11 spec.** That spec says "first 6 in API order, no star filter, ever" and treats picking good reviews as not allowed. The brief needs a founder decision plus a legal and policy read.
3. **A photo behind the hero replaces approved item 7** (solid hero, photo beside the text). The photo becomes the largest paint, against Yonatan's "the H1 stays the LCP", so he must sign off.

## 1. Where each piece plugs in

All data arrives as one optional `look` param on `RenderResearchedSitePagesParams`. It is read from a new `data/site-proof/{slug}/` root, never `data/sites/` (those bytes are matched to the approved copy packet) and never `data/clients/`. Without `look`, output is byte-identical to today.

| Piece | Plug-in point |
|---|---|
| Hero photo | `heroPhotoSlot()` in `siteDesign.ts` becomes a backdrop: an absolutely positioned `<img>` plus a gradient overlay in `siteCss()` `.hero`. The solid colour stays underneath as the fallback. Called from `buildPageHtml` in `researchedSite.ts` and from `renderStaticHtml.ts`. |
| Preload | New optional field on `pageHead()` in `renderSitePages.ts`, emitted before `siteFontHead()`. |
| og / schema image | Existing `heroImageUrl` → `ownerImageUrl()` path; no new code path. |
| Service-page reviews | New `matchedReviews()` in `siteDesign.ts`, a sibling section straight after the hero and before `trustBar()` in `buildPageHtml`. The mobile action bar keeps the call button beside it. The owner-typed quote (`reviewSection`, `proofSection`) stays. |
| Logo | `siteHeader()` `.brand` in `siteDesign.ts`; `assembleDocument()` passes it through. |
| Work photos | New `gallerySection()` on service pages after `processSection`; homepage gallery as in the 13.11 spec. |
| Files | Image files join the upload set next to `siteFontFiles()` in `deploy/route.ts`. Add a long-cache rule for `/img/` in `workers/wao-sites/src/router.ts`. |
| Fetch, store, refresh | As in the 13.11 spec: `gbp/client.ts` extensions, `siteProof.ts`, `siteProofImages.ts`, the daily job. |

- **Core-30 pages** (`renderCoreThirtyPages.ts`) still use the old inline hero, so they wait for a later pass.
- **Existing defect:** `renderStaticHtml.ts:47` draws five hard-coded stars. That is an implied rating and breaks the no-invented-ratings rule; removal needs Yonatan's confirmation.

## 2. How photos are chosen

- **Deterministic first (`sharp`, no model):**
  - Landscape, at least 1200px wide.
  - Sharpness score above a threshold.
  - Low detail in the zone where the text sits.
  - Computed contrast of white text over the gradient of at least 4.5:1.
  - No photo passes → solid hero.
- **Model veto, post-launch:** Gemini vision rejects screenshots, watermarks, text-heavy images and identifiable faces, and tags each photo to a service ID for the galleries. Results are cached per photo.
- **Cost:** about 25 images per site, once. I expect cents per site, but the price was not verified today.
- **Never Qwen:** client photos must not go to the token plan. That also rules out the usual Qwen vision second opinion on real client screenshots; use fixture photos for that check.
- **Sources:** owner-supplied files (no Google terms involved) or `media.list` owner uploads. Never customer-contributed photos.
- **Galleries:** 3–6 photos per service. Fewer than 3 → no section.
- **AI images:** never in the hero. A zero-photo site keeps the solid hero.

## 3. How reviews are matched

- **Model picks IDs only.** Gemini text receives the review texts and the list of service pages, and returns review IDs per page. The renderer pulls the text from the snapshot by ID, so the model can never edit or invent a review.
- **Code enforces the rest:**
  - IDs must exist in the snapshot.
  - At most 3 per page.
  - One review appears on one service page only.
  - Results are cached on a hash of reviews, services and prompt version, so identical data means no model call and no redeploy.
- **Fallback:** the most recent eligible general reviews, or none. Businesses with fewer than 3 text reviews show nothing.
- **Display:** full text in the HTML with a visual clamp, `dir="auto"`, `data-nosnippet`, month and year, and no `Review` or `AggregateRating` schema.
- **Cost:** roughly 10–15K input tokens per site per change, a fraction of a cent (price unverified).
- **Provider:** a new `LLM_PROVIDER_REVIEW_MATCH` switch, defaulting to Gemini.
- **Customers:** nothing here contacts reviewers.

## 4. Logo

- **Owner's logo:** uploaded or sent through the message box. It is rasterised (an SVG upload is never served as-is), trimmed and sized for the 56px header. Alt text is the business name.
- **Generated logo:** deterministic, no AI model. Three variants: a monogram tile plus the name, the trade icon plus the name, and the name alone, in Heebo 800 and the theme colour. The name comes from the record, so no Hebrew is authored.
- **Until approved:** the header shows today's text name, which is the current production state and not a placeholder.
- **What the owner approves:** one screen on the account page covers the logo choice, the hero photo and the photo sets, with a "these photos are mine" statement. It is stored with who, when, IP and text version.
- **Pilot fallback:** staff send the preview and record the owner's written yes through the existing message queue.

## 5. Google terms check

Facts below were fetched on 13.11 for the spec. Re-fetch them before the first client.

| Point | Status |
|---|---|
| Stored API content at most 30 days; attribution unaltered; no copy of Google's card look | Known; the daily refresh covers it |
| Showing API content on the owner's own site | Policy is silent; the residual risk is already accepted, with a kill switch |
| Selecting reviews by topic or stars: is it "manipulation"? | **Needs web check and lawyer** |
| First name only: is it "altering attribution"? | **Open since 12.11; lawyer or Amit** |
| Sending review text and photos to Gemini for classification | **Needs web check** |
| `media.list` returning owner uploads only, and whether it has a logo category | **Check on WAO's own profile** |
| Israeli law: selective reviews as misleading, reviewer names, people in work photos | **Lawyer** |

## 6. Before and after 29.11

Takbull (4 days, still unwired) and the rehearsal (2 days) stay first. Nothing below may displace them.

| When | Work | Days |
|---|---|---|
| Before, only with slack; verified by Tue 24.11 | Image pipeline and hero scorer | 0.75 |
| | Hero backdrop, preload, mobile-short CSS, tests | 0.75 |
| | Logo slot and generated name logo | 0.5 |
| | Staff CLI for owner-supplied files, data root, upload set, Worker cache rule | 0.5 |
| After, behind step 6 and Ads Bot phase 2 | 13.11 spec baseline, minus the pieces above | about 5.25 |
| | Review matching and service-page strips | 1.25 |
| | Photo grouping and service galleries | 1.0 |
| | Automatic GBP hero pick with model veto | 0.5 |
| | Owner approval screen | 0.5 |

The pre-launch pack is 2.5 days and the post-launch work is about 8.5 days, landing in mid-to-late December.

## 7. Checks

- **Unit tests:**
  - Golden byte-identical output with `look` off.
  - Title, H1, meta description and canonical identical with it on.
  - Scorer fixtures: portrait, blurry and busy-text-zone photos rejected; none pass → solid hero.
  - Review fixture with Hebrew, emoji, `<script>` and 1,500 characters appears verbatim and escaped.
  - Unknown review IDs rejected; cap of 3; no rating schema.
  - Second run with identical data makes zero model calls.
  - Unapproved logo or photo never renders.
  - Gallery of 2 → no section; gallery of 9 → 6.
  - Images carry width and height, meet weight budgets, and have no EXIF.
- **Roni:**
  - Home and one service page at 390px and 1440px, with and without a photo.
  - Headline and call button on the first screen at 360×640.
  - Mobile Lighthouse before and after: LCP ≤ 2.5s, CLS < 0.1.
  - Image URLs return 200; bidi grep returns 0.
- **Maya:** contrast over the photo, focus rings, the clamp button.
- **Yonatan:** the LCP change and reviews on service pages.
- **Noa:** the new strings.
- **Suite:** `npm run test`, then `npm run build -- --webpack`, then a standalone boot (`sharp`).

## 8. Hebrew strings for waocopy

- Service-page review heading.
- A truthful selection line (matched and general variants). The approved `reviews.selection` says "latest" and would be false.
- The name plus "from Google" pattern.
- Expand and collapse labels.
- Gallery heading and alt templates with a service slot.
- Approval screen: title, explanation, photo-ownership statement, logo choice, buttons, upload prompts and errors.
- The approval-request email.
- Revised consent text for reviews.
- A terms clause, with the lawyer.

## 9. Decisions for Eitan

1. **Hero.** Approve the photo as a full background with a gradient, replacing "photo beside the text", subject to Yonatan's speed sign-off.
2. **Review selection.** Approve matching by topic from 4–5 star reviews, labelled as selected, with the real score, count and a link to all reviews beside them. This is subject to the lawyer and the policy check; if either objects, fall back to the latest reviews, unfiltered.
3. **Reviewer name.** Show the name as Google returns it until the lawyer clears first-name-only.
4. **Scope.** Before launch, ship only the hero photo and logo from owner-supplied files, staff-run. Everything Google-sourced ships after step 6.
5. **Approval.** The system ranks, staff confirm with one click during the pilot, and the owner approves once for logo, hero and photos.
6. **Logo.** The generated name logo belongs to the owner and is never uploaded to their Google profile.

**Next prompt to paste after /clear:** "Adam: take the Site Bot visual-upgrades plan (16.11). Get Yonatan's sign-off on the hero-photo LCP change and reviews on service pages, send the lawyer the three questions (selective reviews, first names, people in photos), and brief waocopy on the string list. Then, only if Takbull is not waiting on the engineer, dispatch the 2.5-day pre-launch pack to nextjs-engineer."
## Decisions (Eitan, 2026-11-16)

- All six Fable recommendations in section 9 are approved.
- **No lawyer for now: ship only the safe version.**
  - Reviews are quoted verbatim, with the reviewer name exactly as Google returns it (no first-name truncation).
  - A selected set is labelled as selected, with a link to all reviews on Google.
  - No `Review` or `AggregateRating` schema.
  - Anything that needs a legal read waits.
- **Average score must match Google exactly.** If the profile shows 4.8, the site shows 4.8 with the real review count, taken from the same snapshot. No rounding up, no own calculation, no stars without a real rating behind them.
- **Placement rules for the average, and the rules for showing a review on a service page, are Fable's call** (follow-up below).
- **Pre-launch scope:**
  - Hero photo and generated or owner logo, from owner-supplied files, run by staff.
  - Remove the five hard-coded stars in `renderStaticHtml.ts`.
  - Everything sourced from Google ships after build step 6.
