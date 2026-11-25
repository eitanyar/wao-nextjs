# Site Bot ranking content: launch plan (Fable 5.2, 2026-11-26)

Inputs: Eitan's objection to the 210-word preview; docs/reviews/site-bot-ranking-content-yonatan-2026-11-26.md. Model confirmed claude-fable-5-2. Prompt: scratchpad fable-rank-prompt.md.

**Decision: launch on 29.11, but only for plumbers and electricians, and only if a richer home-page preview passes a go/no-go check on Saturday night.** If it fails, ads start the day it passes; I would not go past Wed 2.12. Ads must not send owners to the 210-word preview.

Two things I did not verify: whether steps 3–7 (ledger, your review screen, Google sign-in, terms, Takbull) are ready, and Google's current terms on showing Places ratings. If payment isn't open on Sunday, ads go to the waiting list and this plan gains days.

## 1. Launch and the pre-payment preview

Yonatan's diagnosis is right, but two of his "cheap fixes" don't hold up against the code:

- **Showing the hidden pitch: rejected.** Every visible field is cut from the pitch (`researchPageCopy.ts:903-906`), so rendering it repeats the page in other words. In the live run it is 132 words of second-person scene writing that Noa never read. It would also fight the page-wide repeat lint now in flight.
- **Google reviews on the home preview: not before payment.** `placePrefill.ts:22` forbids storing or republishing Places reviews and ratings on client sites. The allowed source is the owner's own profile after the Google sign-in, which comes after payment. Reviews join the live site then, not the preview.

The preview is the sales page for ₪199 a month, so it must sell. It needs:

- His name, phone, hours and services exactly right.
- His own words visible (the quote in "about").
- Three helpful blocks: when to call, what affects the price, and 4–6 questions with answers.
- Each served city with one true line.
- Outside the frame, a short list of what gets added after he joins: a page per named service, his Google reviews, his photos. No placeholders inside the page.

Target is 450–600 words on home. Without trade knowledge the honest ceiling is about 300, so question 2 decides the launch.

## 2. Trade-knowledge layer

A small version ships before launch; the full layer is December. I amend Yonatan's spec in three places:

- **No per-client rewrite.** Paraphrasing the same facts to pass a similarity score is cosmetic and invites invention. Entries are reviewed, fixed Hebrew text, selected per client by his confirmed services.
- **Cap 30% of page words, not 40%.** At 30% verbatim, same-trade similarity stays near 0.18, under his 0.25 line.
- **Position rule.** Trade knowledge never appears in the hero, about, title or meta. It sits only in labelled blocks, with his own fact leading the block when one exists (his price rule above the price drivers).

The launch library covers plumber and electrician only, about 50 entries per trade:

- **In:** symptoms ("when to call"), price drivers with no numbers, and neutral answers to common questions.
- **Out:** methods and equipment, do-it-yourself instructions, regulations, insurance, prices, durations.

Yonatan specifies the entries from real question pools and checks each against two ranking pages. waocopy writes them, Noa reads once, and Eitan reads the whole library once (about 15 minutes). No licensed tradesman reviews it, so entries stay at the level a homeowner would recognise.

A trade or service with no library gets no blocks and no ads. The owner confirm card and the second and third wording variants are December.

## 3. Hero

Yonatan's 6a is confirmed, with these amendments:

- **Subheadline:** stays one free sentence.
- **Service chips:** code renders them under the subheadline from the existing labels. No new Hebrew, no model.
- **Hours:** the existing hours line stays; no "today" variant.
- **Price rule:** moves down to the pricing block, not the hero.
- **Rating line:** my morning decision stands for the live site, sourced from his profile after sign-in. Before payment it shows only if the in-flight run finds a source the Places rule allows; otherwise the preview hero has no proof line.
- **Refusals and scenes:** no refusal anywhere. The story section renders only when built on a confirmed job; invented customer scenes are cut.
- **About headline:** it stops carrying a second-city head term (the live preview had "אינסטלטור בכפר סבא" as an H2 on home).

## 4. Publish gate

A failing service page is noindexed and left out of the sitemap. A failing home page means the site does not go live and goes to Eitan.

| Blocks at launch | Warns at launch |
|---|---|
| 1 words (home 500, service 350) | 1 for about pages |
| 2 at least 3 distinct owner, Google or intake facts | 2 "one fact unique to this page" |
| 5 one page per anchor, no `/services/{trade}` | 3 Q&A count |
| 6 no Latin in title or H1 | 4 reviews (no allowed source before sign-in) |
| 7 similarity, same-site and cross-client, with library text masked | 8 inbound links |
| 9 schema: name and phone byte-equal, no AggregateRating | 10 photos |
| 11 indexability, no fixture or demo strings | 11 subdomain |
| New 12: library share ≤30%, no first person or digits in library text | |

A thin preview is never blocked for the buyer. It is logged and lands on Eitan's exception list.

## 5. Runs, in order

The in-flight run stays as it is. On its return, apply the rating-source rule from section 3.

1. **Home structure (Fri).** Q&A block on home with fact-cited answers, areas with one true line each, story only from a job fact, hero chips, about-headline fix, drop the trade duplicate page. No new Hebrew.
2. **Trade library on home (Sat).** Generated module from the waocopy JSON, service matcher, three blocks, library entries as a fact type in the trace gate, the 30% cap and gate 12.
3. **Publish gate and service-page blocks.** Due before the first site goes live, not by Sunday. Reviews from the profile go here if the sign-in step is live.
4. **Promise truth pass** on `/site-bot` and the ads. Remove only ranking and timeframe claims; the copy keeps selling.

**waocopy briefs:** plumber library, electrician library, block headlines plus the "what gets added" preview lines, and the truth pass.

**Verifiers:**
- Roni: live-model preview at 390px and 1440px for both trades, with word counts.
- Maya: chips and bidi.
- Yonatan: library substance and a one-line anchor sign-off.
- Noa: the library.

Yonatan's five-query DataForSEO check runs after launch.

## 6. What Adam tells Eitan

1. You were right: the preview was thin, and the page spent its few words on stories instead of answers.
2. The cause is like a CV with five lines: we only wrote what the owner told us, and he tells us four or five things.
3. By Sunday the home page gets three helpful blocks (when to call, what affects the price, common questions) from a small checked library for plumbers and electricians, with his own facts on top and nothing invented about him.
4. We launch Sunday for those two trades only if the new preview passes on Saturday night; otherwise ads start a day or three later. His Google reviews join after he connects his profile.
5. I need 15 minutes from you on Saturday to read the two libraries, because that text will appear on every site.

**Next prompt to paste after /clear:** "Adam: apply the Fable 5.2 decision of 26.11 on Site Bot ranking content. Let the in-flight run finish, then apply the rating-source rule (no stored Places rating or reviews; web-verify Google's terms). Have Yonatan spec the plumber and electrician library entries, run the four waocopy briefs, then brief engineer run 1 (home structure) and run 2 (library on home, 30% cap, gate 12). Roni, Maya, Yonatan and Noa verify; go/no-go Saturday night; schedule Eitan's 15-minute library read."
