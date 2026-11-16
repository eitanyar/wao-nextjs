# Site Bot: final display rules for the Google rating and reviews

Read-only; nothing was changed or run. These rules replace the 13.11 "first 6 in API order, no star filter" rule, per your 16.11 approval. Everything here ships after build step 6; the only pre-launch item is removing the hard-coded stars in `renderStaticHtml.ts`.

**One open point decides whether the 4.8 rule can be kept automatically.** Google's docs do not say how many decimals the API's `averageRating` carries or how Google rounds for display. Until the rehearsal on WAO's own profile answers that, the renderer shows the score only when the API value is already at one decimal, and hides it otherwise.

## 0. Google facts these rules depend on (fetched 2026-11-16; none of the pages carries a last-updated date)

| Fact | Source |
|---|---|
| Stored API content: at most 30 calendar days, and it "cannot be manipulated or aggregated in any way". | [Business Profile API policies](https://developers.google.com/my-business/content/policies) |
| Attribution must be displayed as provided and not deleted or altered. | Same page |
| The policy page says nothing about displaying, filtering or selecting reviews on the owner's site, and nothing about AI processing. | Same page |
| `reviews.list` returns `averageRating` (number, 1–5) and `totalReviewCount` (integer) in the same response as the reviews; max `pageSize` 50; verified locations only. | [reviews.list](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list) |
| `displayName` holds the real name only when `isAnonymous` is false; `starRating` is an enum ONE–FIVE; the review has `createTime`, `updateTime`, `reviewReply`. | [Review resource](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews) |
| Pages where the business controls reviews about itself are ineligible for review stars, including through an embedded Google reviews widget; violations risk a manual action. | [Review snippet guidelines](https://developers.google.com/search/docs/appearance/structured-data/review-snippet) |
| Google's review-content policy bans discouraging negative reviews and selectively soliciting positive ones. It covers solicitation and is silent on what a business shows on its own site. | [Maps contribution policy](https://support.google.com/contributionpolicy/answer/7400114) |

The only rounding claim I found is a vendor help article, not Google ([reviewflowz](https://help.reviewflowz.com/en/articles/15646229-google-review-history-how-to-see-your-rating-over-time)).

## 1. Average score and count

### Where it appears

| Surface | Rule |
|---|---|
| Home hero | Chip above the `<h1>`, never inside it. An `<a>` to `#reviews`, 44px tall. |
| Home reviews section | Summary row at the top of the section. |
| Service pages | One rating row in a sibling section straight after the hero and before `trustBar()`. It renders even when the page has no matched review. It is not in the hero, because the breadcrumb must stay directly before the H1. |
| Header, trust bar, footer, mobile action bar | Never. The trust bar is approved owner copy and stays free of Google data. |
| Contact, legal, Core-30 and legacy `renderStaticHtml` pages | Never in v1. |
| `<title>`, `<h1>`, meta description, og tags, JSON-LD | Never. |

### Data rules

- **Source:** `averageRating` and `totalReviewCount` from page 1 of `reviews.list`, through WAO's manager access. Both are stored in `snapshot.json` with one `fetchedAt`.
- **Same snapshot:** every page in a deploy reads the score, count and reviews from one snapshot file. A test asserts that all pages show the same pair.
- **No own calculation:** the average is never computed from the review list and never taken from Places, scraping or owner input.
- **Age:** the job refreshes daily. The renderer emits nothing Google-sourced when `fetchedAt` is more than 30 days old; the job strips the blocks after 21 days of failed fetches.
- **Score format:** exactly one decimal with a dot (`4.8`, `5.0`), wrapped in `<bdi>`.
- **Precision guard:** render the score only if `abs(v*10 - round(v*10)) < 0.001` and `1 <= v <= 5`. Otherwise hide every rating surface and alert staff. If the rehearsal shows the API returns more decimals, you choose the rounding rule then.
- **Count format:** the exact integer with `he-IL` grouping. Never "100+" or "about".
- **Minimum:** score and count show only when `totalReviewCount >= 3`. Below that, or with no `averageRating`, no rating appears anywhere.
- **No score floor:** a 3.9 shows as 3.9. The owner's only control is the single reviews on/off switch.
- **Coupling:** selected reviews never render without the score, count and all-reviews link in the same section. If the rating is hidden, the reviews are hidden too.

### Stars graphic

- The average gets one filled star icon beside the number. There is never a five-star row for the average, so nothing is rounded visually.
- The star is `aria-hidden`; the number is always present as text, with `hero.rating.aria` on the chip.
- Per-review stars are N filled and 5−N outline, from the `starRating` enum. `STAR_RATING_UNSPECIFIED` makes the review ineligible.

### Link to all reviews

- `reviews.seeAll` links to `googleProfileUrl(data)` with `rel="noopener"`.
- It appears in the home section and in every service-page rating row. The hero chip links to `#reviews`.

### Never shown

- A rounded-up, recomputed or blended score, or a score from a different snapshot than the count.
- Stars with no number, or a rating for a business without consent and a verified connection.
- The Google logo, Google's colours or a copy of its review card.
- Reviewer photos, review media and owner replies.
- `Review` or `AggregateRating` schema, or an embedded Google widget.
- A numeric rating in owner copy that disagrees with the snapshot. When a snapshot exists, a rating-like number in `reviewContext`, `reviewFeatured` or the trust items that differs from it becomes a deploy blocker.

## 2. Reviews on a service page

### Eligibility (code, before any model call)

| Check | Rule |
|---|---|
| Stars | `FOUR` or `FIVE` |
| Text | `comment` length 40–600 characters after trimming |
| Age | `createTime` within the last 24 months |
| Presence | In the latest snapshot (the 200 most recently updated reviews, 4 pages) |
| Language | At least 60% of letters are Hebrew, and no "(Translated by Google)" marker |
| Reviewer | `isAnonymous` is false and `displayName` is non-empty |
| Contact details | No phone number, email, URL or street-address pattern |
| Price | No currency sign, shekel word or number-plus-currency pattern |
| Profanity | No hit on a staff-owned denylist file |
| Owner reply | Never displayed. A reply does not affect eligibility. |

The model additionally returns a per-review exclusion flag for another business being named, third-party personal or health details, and insults. A flagged review is ineligible. During the pilot, staff confirm each new selection with one click.

### Match test

- **Input:** eligible review IDs with text, plus the service pages (ID, service name, H1).
- **Output:** `{ pageId, reviewId, confidence, evidenceStart, evidenceEnd }` and the exclusion flags. The model returns no text.
- **"About a service" means** the review names the service, or describes the job that service page sells. General praise such as "great, fast, fair" is not a match.
- **Threshold:** `confidence >= 0.8`.
- **Code checks:**
  - The review ID exists in the snapshot and is eligible.
  - The evidence offsets fall inside the comment and span at least 3 characters.
  - The page ID exists.
- **Rendering:** the renderer pulls text, name, stars and date from the snapshot by ID.
- **Provider:** `LLM_PROVIDER_REVIEW_MATCH`, default Gemini, never the Qwen token plan.
- **Cache:** keyed on a hash of eligible reviews, services and prompt version. Identical data means no model call and no redeploy.

### Count, ordering, de-duplication

- 0–3 reviews per service page, newest `createTime` first.
- A review appears on at most one service page. It goes to the page with the highest confidence; ties go to the page with fewer reviews, then to page order.
- Selections are sticky: a shown review stays until it becomes ineligible, unmatched or absent. This avoids daily churn.

### Placement

- A section directly after the hero and before `trustBar()`. It holds the rating row, the "selected" label, the cards and the all-reviews link.
- It is never inside the hero. At 360×640 the H1 and the call button stay on the first screen.
- The mobile action bar is unchanged. The section's bottom padding keeps the last card clear of it.
- 390px: horizontal snap row with 84%-wide cards. Desktop: up to 3 columns.
- The owner-typed quote (`reviewSection` / `proofSection`) stays where it is.

### Card content

- **Text:** `comment` verbatim, escaped, `dir="auto"`, full text in the HTML with a visual clamp and an expand button. `data-nosnippet` on the list.
- **Name:** `reviewer.displayName` exactly as returned, `dir="auto"`. No truncation, initials or photo.
- **Date:** month and year of `createTime` in Asia/Jerusalem. Never relative.
- **Label:** a visible text line stating that these are selected reviews, wherever reviews appear. It is never a tooltip or screen-reader-only text.
- **Source:** the existing source line with "Google" in `<bdi>`.

### Refresh and removal

| Event | Action |
|---|---|
| Review missing from the daily fetch (deleted, or out of the 200 window) | Removed at that run's redeploy; worst case 24 hours |
| Text or stars edited | Re-run eligibility and matching; below 4 stars → removed |
| Snapshot older than 30 days | Renderer emits no Google-sourced block |
| Access lost (403, 404, place-ID mismatch) | Strip blocks, delete stored content, alert staff |
| Consent switched off | Strip and delete at the next run |

### Fallback when nothing matches

The service page shows the rating row and all-reviews link only. No general reviews are borrowed, so the page never implies a review is about that service.

## 3. Homepage reviews section

- **Pool:** the same eligibility as section 2, without the match test.
- **Count:** up to 6. Fewer than 3 eligible → no review cards, but the chip and summary row still show if the count rule in section 1 passes.
- **Ordering:** newest `createTime` first.
- **De-duplication:** reviews not used on a service page come first. Reviews already on a service page fill in only when that is needed to reach 3.
- **Section content:** summary row (score, count), the "selected" label, source line, cards, all-reviews link.
- **Position:** after `serviceDetailsSection`, before `aboutSection`.
- **Retired string:** `reviews.selection` ("the latest reviews") is not used; it would be false.

## 4. The "safe without lawyer" line

### In

- Verbatim review text, with the name exactly as Google returns it.
- Selection from 4–5 star reviews, always labelled as selected, always beside the real score, count and all-reviews link.
- The exact Google score and count from one snapshot, shown without a score floor.
- Daily refresh, the 30-day render guard, owner opt-in with an off switch, and a staff kill switch.
- No review schema, no widget, no Google branding.
- Model matching that returns IDs only, with Gemini as provider.
- Staff one-click confirmation of selections during the pilot.

### Deferred until a legal read

- First-name-only or initials for reviewers.
- Reviewer photos and photos attached to reviews.
- Owner replies on the site.
- Trimmed excerpts or highlighted phrases.
- Translated reviews.
- Reviews from anonymous reviewers.
- Reviews in ads, emails, og images or WAO's own marketing.
- Phrases such as "top rated" or "best in the city" derived from the score.
- Hiding the score while showing reviews, or a score floor.
- The terms clause on review display and the Israeli-law questions (selective reviews, reviewer names).

### Residual risk accepted without a lawyer

- Google's policy is silent on display and on selection, and its "cannot be manipulated" wording is untested against a selected set. The kill switch is the answer if Google objects.
- Review text goes to Gemini for matching. The policy does not address this.

## 5. Tests and strings

### Fixtures

| Fixture | Content |
|---|---|
| `rating-4.8` | Average 4.8, count 127, 12 mixed reviews |
| `rating-5.0` | Average 5, count 3 |
| `rating-low` | Average 3.9, count 40 |
| `rating-odd` | Average 4.75 |
| `rating-few` | Count 2 |
| `rating-none` | No `averageRating` |
| `stale` | `fetchedAt` 31 days old |
| `hygiene` | One review per exclusion: phone, email, URL, price, profanity, anonymous, 3 stars, 39 characters, 601 characters, 25 months old, English only, translated marker |
| `match` | 3 services; reviews clearly about each, general praise, one matching two services |
| `verbatim` | Hebrew, English, emoji and `<script>` in one review; a name with Latin and Hebrew |
| `owner-copy-conflict` | `reviewContext` states 4.9 while the snapshot says 4.8 |

### Assertions

1. `rating-4.8`: every rating surface shows `4.8` and `127`, and all pages show the same pair.
2. `rating-5.0` shows `5.0`. `rating-low` shows `3.9` together with its selected reviews.
3. `rating-odd`, `rating-few`, `rating-none` and `stale`: no score, no stars and no review cards on any page.
4. The average has exactly one star icon. No element holds five average stars.
5. The chip is outside the `<h1>`. On service pages the breadcrumb is still directly before the `<h1>`.
6. Title, H1, meta description and canonical are byte-identical with and without the snapshot. No rating digits appear in the title or meta description.
7. No `Review` or `AggregateRating` in any JSON-LD. No `googleusercontent` URL.
8. Each `hygiene` review is absent from every page.
9. Model output with an unknown ID, confidence 0.79 or out-of-range evidence offsets is rejected.
10. At most 3 cards per service page. No review ID appears on two service pages.
11. A service page with no match has the rating row and link and zero cards.
12. Wherever a card renders, the "selected" label, score, count and all-reviews link are in the same section.
13. `verbatim` appears complete and escaped, with `dir="auto"`. The name equals the fixture bytes.
14. The date is month and year, with a Jerusalem-timezone edge case at a month boundary.
15. Removing a review from the fetch fixture changes the hash, triggers one redeploy, and the review is gone.
16. Editing a shown review to 3 stars removes it.
17. A second run with identical data makes zero model calls and zero deploys.
18. Home shows at most 6, newest first, and prefers reviews not used on service pages.
19. `owner-copy-conflict` blocks the deploy.
20. With no snapshot or consent, output is byte-identical to today's.
21. Legacy `renderStaticHtml` output contains no star icons (pre-launch).

Roni's runtime check on the rehearsal site: the score and count on the site equal what WAO's Google profile shows that day, and he records the raw API `averageRating` value.

### Strings for waocopy

| Key | Purpose |
|---|---|
| `reviews.selected` | The visible "selected reviews" line; replaces `reviews.selection` |
| `service.reviews.heading` | Heading of the service-page section, with a service slot |
| `service.rating.row` | Rating row for a service page with no cards |
| `reviews.updated` | "Updated on {date}" line for the home summary row |
| `review.expand`, `review.collapse` | Long-review button |
| `consent.reviews.*` | Revised owner consent: the site shows selected 4–5 star reviews and always the real Google score, on or off as one switch |
| `notice.connectionLost` | Email when the reviews come off the site |

Already approved and reused as they are: `hero.rating`, `hero.rating.aria`, `hero.rating.count`, `reviews.heading`, `reviews.source`, `reviews.list.label`, `reviews.seeAll`, `review.date`, `review.date.months`, `review.stars.aria`. The consent text is founder-facing, so it goes through Noa and then your spot-check.

**Next prompt to paste after /clear:** "Adam: take the Site Bot rating and review display rules (16.11 follow-up). Save them to docs/specs, brief waocopy on the seven string keys, get Yonatan's sign-off on the service-page rating row and the homepage change from 'latest' to 'selected', and dispatch only the pre-launch item to nextjs-engineer: remove the hard-coded stars in renderStaticHtml.ts with assertion 21."