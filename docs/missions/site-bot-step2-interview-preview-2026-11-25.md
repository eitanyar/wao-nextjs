# Mission: Site Bot step 2: interview, confirm facts and home-page preview, before payment (2026-11-25)

Source decisions: `docs/reviews/site-bot-ads-launch-decision-fable52-2026-11-25.md` (end section, Eitan's 2026-11-25 reversals); `docs/reviews/site-bot-agent-intake-uniqueness-lior-fable52-2026-11-25.md` §3 (interview design); Yonatan's 2026-11-25 sign-off on the trade allow-list (work-location question, photographer framing).

## Outcome
An eligible owner who holds a spot goes through these steps, with no human and no payment:
1. **Confirm card + 3 questions.** These already exist in `StartPaidFlow.tsx`.
2. **Work-location question.** This is new. For tutors, photographers and solar suppliers, it asks where the work happens: at the customer's place, at my place, online, or a mix. Studio-only or online-only answers exit to the waiting list (reason `location`), with no preview and no charge.
3. **Research starts in the background.** It already exists but runs only after payment today. It moves here, so it runs while he answers the interview.
4. **Interview v1.** This is new: five fixed questions with a typed answer, plus one vague-answer probe on each question (the probe exists today only for the differentiator, `StartPaidFlow.tsx:345`). The five questions:
   - a recent job
   - a job he turned down
   - the question every caller asks
   - how he handles prices (chips)
   - where he works most and what keeps coming up there
5. **Research questions for the owner.** These already exist (`ownerGates.ts`) but are asked on the pay page after the charge, and they move here.
6. **Confirm-facts screen.** This is new. Every fact taken from his answers is shown as a list (fact, type, service, his exact words), and he taps confirm or fix. That is his approval of the claims.
7. **Home-page preview.** This is new. Only the home page is generated, then shown in a sandboxed, noindex view that only his session can open. Nothing is deployed.
8. **Pay.** Checkout reuses the research and the confirmed facts. The callback generates the remaining pages, which then go to Eitan's review (step 4). Research never runs twice.

**Abandoned interviews.** If an interview is left unfinished, the spot is released after 3 days without payment (Eitan, 2026-11-25). One reminder email goes out at 24 hours.

## Engineer runs (one outcome each, in order)
- **2a: Pre-payment session and re-keying.**
  - An interview session is created at `interview-start`: an httpOnly cookie, bound to the placeId and the spot.
  - Research starts after the card and the 3 questions.
  - Owner gates are re-keyed from the checkout session to the interview session, keeping the server-side gate list rule (`ownerGates.ts` header).
  - `checkout/init` and the callback reuse the research; there is no second `runSiteResearch`.
  - The work-location question, with its exit to the waiting list (`offerState` gets a `location` reason).
  - Spot expiry and the 24-hour reminder.
  - Security tests: the audit-only release, cross-session access to gates and preview, and a crafted session.
- **2b: Interview v1 and facts.**
  - The five typed questions, plus the probe.
  - Fact extraction: one LLM call that turns the answers into facts `{id, type, serviceId?, quote, condition?}`. Types are job, refusal, price rule, local detail, tool or brand, number with its condition, and credential. Each quote must be a substring of his answer, or the fact is dropped.
  - The confirm-facts screen.
  - Storage in the research dossier.
  - This fact schema is what step 3 (the fact ledger) extends, so define it once, here.
- **2c: Home-page preview and the handoff to payment.**
  - Generate the home page only, from the dossier plus the confirmed facts.
  - A preview route that renders it in an iframe sandbox. It is noindex, no-store, and owner-only.
  - Generation is rate-limited to one per session, plus one regeneration after he fixes facts.
  - The callback generates the remaining pages after payment.
  - Photographers get studio vs on-location framing (VISION.md "locationType conditional"; it is missing today, so Yonatan flagged it): the work-location answer drives it.
  - The waiting screen copy while generation runs.
  - **First-screen fact** (Fable 5.2 on Koray K-01; Yonatan re-sign-off 2026-11-25 after Noa found the in-subheadline version unpublishable; replaces the earlier (a)–(e)). Home page only. Changed 2026-11-26 by Fable 5.2 (docs/reviews/site-bot-first-screen-rating-fable52-2026-11-26.md, with Adam's source correction): the hero proof is the Google rating, and the owner quote moves to the about section.
    - **(a) Subheadline.** A free USP sentence in the H1's grammatical person (third person about the business, no first- or second-person forms). At most 90 characters, one verb sentence, all truth gates in force. It doesn't repeat service and city together, and it must not quote or paraphrase an owner fact. Fact words in the title, H1 or subheadline never satisfy this rule. The title formula and H1 gate are unchanged.
    - **(b) Hero proof line.** Directly under the subheadline, code renders the approved rating string (`ratingWithCountLine(rating, count)`). Plain text: no star icons, no link, so the hero keeps one action (call). Record `firstScreen.source = "google_rating"`.
      - Source: the owner's own Google Business Profile through WAO's manager access only (reviews.list `averageRating` and `totalReviewCount`, one snapshot, at most 30 days old). Never Places data: Places content is never stored or republished on client sites (`placePrefill.ts` header).
      - Shown only when the rating is at least 4.5 and the count at least 5, with the average exactly as Google returns it, to one decimal. Otherwise there is no line and no placeholder, and code logs `first_screen_fact_missing` with the reason.
      - Before payment there is no manager access, so the pre-payment preview has no proof line (reason `no_gbp_rating`). That is expected.
      - If the trust bar would also show a rating, it is dropped from the trust bar, so the rating never appears twice.
    - **(b2) Owner quote line.** Rendered by code at the top of the about section, never in the hero: `{frame(type)} ״{quote}״`. If the page has no about section, there is no quote line.
      - Frames come from `docs/copy/site-bot-owner-quote-frames-2026-11-25.waocopy.json`, byte-exact, one per type: refusal, job/tool, number, credential, price_rule.
      - `{name}` is the owner's first name if it is all Hebrew letters and 2–15 characters long. Otherwise it is `QUOTE_NAME_FALLBACK`.
      - The aria label is `OWNER_QUOTE_ARIA_LABEL` from `docs/copy/site-bot-owner-quote-attribution-2026-11-25.waocopy.json`.
      - The LLM never writes, rewrites or picks wording for this line. Record `quoteFactId`.
    - **(c) Eligibility and cleanup.** Checked in order; record the first failing reason. The (d) type gate and check 8 run right after check 1 (Yonatan, 2026-11-25), so a trust-bar duplicate logs `trust_bar_duplicate`, not a length reason.
      1. Status is `confirmed`, or `edited` (then use `ownerText`), and the text is an exact substring of his answer or ownerText.
      2. Cleanup may only trim whitespace, collapse double spaces, strip trailing `.,;:!?`, and remove ASCII `"` and `'`. It never adds, swaps or re-spells a word.
      3. Relative time words come from a closed list in code (לפני חודש/שבוע/שנה/יומיים, שבוע שעבר, חודש שעבר, אתמול, השבוע, החודש, השנה, לאחרונה, עכשיו, היום; build it from existing code lists or as `\u` escapes, never by typing Hebrew). If the time phrase opens the quote, take the exact contiguous substring after it (and after a following comma or space) and re-run every check. A time word anywhere else rejects the fact (`time_word`).
      4. 4–12 words and at most 80 characters after cleanup. Never cut to fit (`too_long` / `too_short`).
      5. At least 85% of letters are Hebrew. No Latin letters in v1. No ₪, no digit group of 7 or more, no URL or @.
      6. Gibberish: a Hebrew token of 3+ letters with a final-form letter before its last letter, or a letter repeated 3+ times in a row (`gibberish`). (Yonatan, 2026-11-25: no vowel-letter condition, since English typed on a Hebrew keyboard often yields vowel letters.)
      7. A fact with a `condition` qualifies only if the condition is inside the quoted substring.
      8. Not a trust-bar duplicate: a number or credential the trust bar already shows is not eligible.
    - **(d) Priority** (owner quote, 2026-11-26).
      1. number with its condition
      2. non-money price_rule
      3. job (no serviceId, or the homepage trade or a homepage service)
      4. tool
      5. credential as a sentence

      A refusal is ineligible in v1 (`refusal_no_reason`). It stays stored and out of generation, and `QUOTE_FRAME_REFUSAL` stays in the copy file, unused. Post-launch: a follow-up question on the refusal's reason; a refusal then becomes eligible in about only together with that reason. `local` facts are never eligible here; they go to the service-area section. Ties go by answer order.
    - **(e) No-fact path.** If no quote passes, render no quote line and no placeholder in about; the preview still renders, and code logs `owner_quote_missing` with every candidate id and its reason. The trust-bar credential no longer counts as the first-screen fact; the rating does. The pre-payment preview is the owner's consent gate for his words.
    - **(f) Meta description.** Homepage meta description and og:description = `pageNameWithCity(trade, city) + " — " + heroSubheadline`. If the subheadline already contains both service and city, use it alone. Cap 155 (`META_DESCRIPTION_MAX_CHARS`), target 120 or under. If it's over 155, use the subheadline alone, never cut mid-word. The quote line is never included. `Service.description` stays `heroSubheadline`. Other page types are unchanged.
    - **(g) Structured data.** The quote line is in no JSON-LD or microdata: not Review, not Quotation, not LocalBusiness.description, not Person. Mark it up as `<figure><blockquote>` + `<figcaption>`, or `<p><q>`. No itemprop, no rating, no stars. The hero rating line is in no JSON-LD either (the existing no-AggregateRating rule).
    - **(h) Bidi.** The line inherits rtl. The quote marks are always U+05F4 ״, never ASCII or «». Maya checks:
      - digits at the quote's edges, digit ranges and decimals
      - mobile wrapping: frame and name never alone on a line, and the closing ״ never alone
      - contrast over the hero photo
      - the name fallback
      - bdi bracket grep = 0
      - the hero rating line: the decimal rating and the `·` separator at 390px, and that the call button stays in the first screen

## Constraints
- All new Hebrew comes from waocopy and is applied byte-exact. One waocopy brief per run, written before the engineer starts. The briefs cover:
  - the location question and the exit line
  - the five interview questions, the probe and the facts screen
  - the preview screen, the waiting screen and the 24-hour reminder email
- The prod default stays closed (`SITE_BOT_PAID_FLOW`): every new pre-payment route sits behind the same gate as `interview-start`.
- The pre-payment cost of about $2–4 per interviewee (Lior's estimate) is bounded by the 3-a-week start cap and one spot per placeId. Record actual per-session cost in `providerUsage`.
- No demo labels or placeholders. The preview is real data, framed as "your home page, before it goes live".
- The landing page and terms copy that describe the old pay-then-interview order are changed in step 6, not here. The title and H1 are untouched.
- Never write to `data/clients/`.

## Out of scope for step 2
- GBP manager sign-in: after payment, its own step (was step 5).
- Photos: after payment, before go-live (decision 2).
- The fact ledger's sentence-to-fact links and the publish/shrink gate: step 3. Step 3 also adds a same-trade comparison of the code-built fields (FAQ questions, service items), which `reviewPreflight.ts:126-131` skips today (Koray K-01 review).
- Eitan's review screen: step 4.
- Real voice recording: after launch (decision 1).
- Adaptive per-service questions: cut for v1 (Fable 5.2).

## Acceptance
- Focused tests per run, then `npm run test`, then `npm run build -- --webpack`, serially.
- Dev run, gate open, fixture business: start → card → location → interview → gates → facts → preview → mock pay. The research runs once (check the dossier and `providerUsage`).
- The preview is refused for another session.
- In the fixture run, the about section opens with the quote line `{frame} ״{quote}״` from an eligible fact (on the 2026-11-25 synthetic plumber: a1-2 is a refusal, so ineligible as `refusal_no_reason`; a1-1 and a1-4 rejected; cred-years excluded as a trust-bar duplicate; with no other eligible fact, no quote line). The hero shows the rating line only from a GBP manager-access rating of at least 4.5 with at least 5 reviews; the pre-payment preview and a below-threshold rating show no proof line, with `first_screen_fact_missing` logged. No JSON-LD contains the quote or the rating. The meta description equals rule (f). The subheadline has no first- or second-person forms. The title and H1 are byte-identical to a run without facts. A no-fact preview renders with `first_screen_fact_missing` logged.
- An abandoned session releases its spot after the expiry (time is injected).
- Screenshots on desktop and mobile of the interview, facts and preview screens.

## Verifier
Roni runs the full start-to-preview-to-mock-pay journey after each run. Maya (ux) checks the interview and facts screens for a11y and RTL, and the preview iframe on mobile. Yonatan checks that the photographer framing and the location exit match his sign-off.

## Eitan's decisions (2026-11-25)
1. **Voice:** v1 is typed answers; the phone keyboard's microphone dictates for free. Real voice recording comes after launch.
2. **Photos:** asked after payment, before go-live. The preview uses Google profile photos and the trade image library.
3. **Spot expiry:** an unfinished, unpaid interview releases its spot after **3 days**, with one reminder at 24 hours.
