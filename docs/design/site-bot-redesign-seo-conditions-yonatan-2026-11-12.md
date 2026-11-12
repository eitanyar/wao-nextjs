# Site Bot redesign: SEO/GEO sign-off (Yonatan, 2026-11-12)

**Verdict: CONDITIONS.** The visual direction is approved. Conditions 2 and 4 are must-haves.

## Conditions for the engineer
1. **Anchors unchanged.** The title comes from `researchedPageTitle()`, the H1 from `researchedPageH1()`, and the meta description from `heroSubheadline`. Each page has exactly one `<h1>`. On service pages the breadcrumb sits right before the H1. The rating chip and the header name are never headings and never go inside the H1. The H1 is visible on the first 390px screen. Never copy the mock-up's `<title>`.
2. **Same content, new look.** Every section rendered today keeps rendering: story, service areas (including their links to city pages; the mock-up's unlinked chips are not acceptable), related links, the price-promise line, the process/price/proof/Q&A blocks on service pages, and the service-card descriptions. Dropping anything goes back to Yonatan.
3. **Service card links.** Markup is `<h3><a href=…>{service name}</a></h3><p>{description}</p>`, and the whole card is clickable through CSS. Link text is `anchorText(target)` (= `seo.name`). A card links only when it exactly matches a selected service page's real URL; otherwise it has no link. On the home page, drop the related-links entries the cards already cover. The `/services` placeholder never ships.
4. **Reviews and the chip come only from the GBP API (owner-authorised).** No Places content in the HTML. Show text, stars, average and count exactly as returned; no cutting or recalculating. Show the reviewer's display name as returned, until there is a legal answer on first names only. Show the date as month and year from `createTime`, never relative. Put `dir="auto"` on each review body. Review text never goes through any copy step.
5. **Refresh within 30 days, or hide.** Re-render the reviews block and the chip at least every 30 days (weekly suggested). If the last good GBP fetch is more than 30 days old, leave both out of the build.
6. **Credit Google.** Show a visible "Google" source label in `<bdi>` with a link to the business's Google reviews, plus a line saying how the reviews were picked. Don't use the Google logo unless the API supplies it. Don't copy the GBP review-card look.
7. **No rating schema.** No `AggregateRating` or `Review` in the JSON-LD. A test asserts that they are absent.
8. **FAQ.** Use native `<details>` with the answers in the server HTML. The FAQPage JSON-LD must match the visible text exactly.
9. **og:image and schema image.** One function, in this order: an owner-uploaded GBP photo, then a generated 1200×630 theme card. Absolute URL, plus width, height and alt. The stock image is never used.
10. **Footer NAP and hours.** Use the same strings as the LocalBusiness schema. Show the street address only if the owner gave it and the GBP shows it. Hours come from the same parsed source as `openingHoursSpecification`. No "open now" text anywhere.
11. **Verification (Roni).** Re-render test-core30-verify before and after, and check:
    - titles, H1s and meta descriptions are byte-identical
    - each page has one H1
    - card links return 200 and are in the sitemap
    - no Review or AggregateRating in the JSON-LD
    - the FAQ answers are in the raw HTML
    - og:image returns 200 and is not Unsplash
    - the bidi regression grep returns 0

## Open questions
- **Amit or the lawyer:** does showing first names only count as "altering attribution"? And what are our rights to the owner's GBP photos for og:image?
- **Copy needed (waocopy → Noa):** the "Google" source label, the review-selection line, the chip count text, the review and hours headings, and the text on the og fallback card.

## Sources (fetched 2026-11-12)
- https://developers.google.com/my-business/content/policies (30-day storage, no manipulation, attribution as provided, no copying the GBP look)
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://developers.google.com/search/docs/appearance/structured-data/review-snippet (self-controlled reviews are not eligible for stars)
- https://developers.google.com/search/docs/appearance/structured-data/faqpage (FAQ rich results ended 2026-05-07)
