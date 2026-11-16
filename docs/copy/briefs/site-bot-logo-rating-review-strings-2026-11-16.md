# Brief: Site Bot logo rule words, rating line, Google review strings (2026-11-16)

**Persona:** visitors to a one-man trade business's site (plumber, electrician, locksmith, cleaner), who are mostly on a phone. Part E is read by the owner himself: singular male, plain and short.

**Where it goes:** client sites built by Site Bot. These are product strings, not ads. Facts only, no hype, no promises.

## A. Generic first words (not displayed; a code list)
The logo makes the first word of the business name big **only when it is a real name** (יוסי, כהן, a brand word). It must never enlarge a generic opener such as "שירותי". Give a list of about 10–14 Hebrew words that commonly open Israeli small-trade business names without being a name or a trade. Trade words are already detected separately. Examples of the type: service/services, company, group, house-of, centre, workshop, "the" forms. Give singular and plural or construct forms where both occur, with no prefix letters. Key: `genericLeads` (array of strings).

## B. Rating line (shown on the site when the owner gave a rating)
Today the line shows the rating alone ("4.9 stars on Google"). New rule: a rating is never shown without the number of reviews. Template with `{rating}` and `{count}`, short, one line. Key: `ratingWithCount`.

## C. Google reviews on the site (shown after the owner connects his Google profile)
Facts: we show selected 4–5 star Google reviews, word for word, always beside the real Google score and count, with a link to all reviews.
1. `reviewsSelected`: a visible line saying these are selected reviews from Google (truthful: selected, not "latest" or "all").
2. `serviceReviewsHeading`: heading of the reviews block on a service page, with `{service}`. It must not repeat the page's main headline wording.
3. `serviceRatingRow`: one line with `{rating}` and `{count}` for a service page without matching reviews, plus where to read all reviews.
4. `reviewsUpdated`: "updated on {date}" for the homepage summary.
5. `reviewExpand`, `reviewCollapse`: button labels for long reviews.
6. `seeAllReviews`: link text to all his reviews on Google.

## D. Connection lost (email to the owner)
`connectionLostSubject`, `connectionLostBody` (2–3 lines): the Google reviews were taken off his site because the connection to his Google profile stopped. Reconnect from the account page with `{accountLink}` on its own line. No blame, no alarm.

## E. Owner consent (account page, founder-facing)
`consentReviewsTitle`, `consentReviewsBody` (2–3 lines): when on, his site shows selected 4–5 star reviews from his Google profile, always with the real Google score and the number of reviews, and a link to all of them. He can switch it off anytime. `consentReviewsToggleOn`, `consentReviewsToggleOff`.

**Deliver JSON:** a flat object with exactly these keys: `genericLeads, ratingWithCount, reviewsSelected, serviceReviewsHeading, serviceRatingRow, reviewsUpdated, reviewExpand, reviewCollapse, seeAllReviews, connectionLostSubject, connectionLostBody, consentReviewsTitle, consentReviewsBody, consentReviewsToggleOn, consentReviewsToggleOff`, plus `why`. Keep every `{variable}` exactly as written. Use `\n` for line breaks. Use the Hebrew maqaf (־) before digits or Latin, and gershayim, not ASCII quotes.
