# Site Bot first-screen proof: Google rating in the hero, owner quote to about (Fable 5.2, 2026-11-26)

Trigger: Eitan on the live preview quote line (refusal frame): "I don't understand how [that line] will help my client (if he was real) get a job". Prompt: scratchpad fable-quote-prompt.md. Model confirmed claude-fable-5-2.

**Decision: C, with the refusal dropped for launch.** Eitan is right. The first screen should show the exact Google rating, and the owner quote moves down to the about section.

## Why
- **The caller's question is "can I trust this stranger?"** A rating from other customers answers it in a second. The owner talking about himself doesn't, and a refusal opens with "no" and needs trade knowledge to decode.
- **The rating is the one unfakeable fact every Site Bot client has.** The product only accepts businesses with a rated profile, and the approved Hebrew string already exists (`ratingWithCount`, 16.11), so no new copy is needed.
- **The quote still earns its place lower down.** A reader who scrolls to "about" is judging the person, and that is where his own words work.
- **Option A is the right fix for refusals, but not by 29.11.** It needs a new interview probe, new waocopy and a longer quote format. Until then a refusal is not shown anywhere.

## Changes to 2c
- **(b) becomes "Hero proof line".** Under the subheadline, code renders `ratingWithCountLine(rating, count)` from the Places data: plain text, no star icons, no link, so the hero keeps one action (call). Record `source: "google_rating"`.
- **Show it only when rating ≥ 4.5 and count ≥ 5.** Below that, the hero has no proof line and no placeholder, and code logs `first_screen_fact_missing`. The threshold is my call; eligibility today accepts any rating, so a 3.2 would otherwise land in the hero.
- **New (b2) "Owner quote line".** Same markup, frames, name rule and aria label, moved to the top of the about section. It never renders in the hero.
- **(c) is unchanged.**
- **(d) new priority:** number with its condition, non-money price_rule, job, tool, credential. Refusal is ineligible in v1 (`refusal_no_reason`); it stays stored and out of generation as today. `QUOTE_FRAME_REFUSAL` stays in the file, unused.
- **(e)** No eligible quote means no quote and no placeholder in about. The trust-bar credential no longer counts as the first-screen fact; the rating does.
- **(f) is unchanged.**
- **(g) add:** the rating line is in no JSON-LD (the existing no-AggregateRating rule).
- **(h) add:** Maya checks the decimal rating and the `·` separator at 390px, and that the call button stays in the first screen.

## Interview and waocopy
- **No changes before launch.** There is no new Hebrew.
- **Post-launch queue:** one waocopy follow-up question on a refusal ("what would have happened to the customer"). A refusal then becomes eligible in about only together with that reason, in a two-sentence format.

## Next engineer run
1. **Check the data path first.** I did not confirm that the Places rating and count reach the home-page render; the fixture preview shows none. If they stop at the audit or eligibility step, carry them onto the site record.
2. Render the hero rating line with the threshold; remove the quote figure from the hero.
3. Render the quote figure in the about section with the new priority and refusal ineligible. Update `FIRST_SCREEN_PRIORITY` and the tests in `step2cFactRules.test.ts` and `previewStep2c.test.ts`.
4. Check that no Hebrew is typed: only the existing strings are imported, and `git diff` shows no Hebrew changes.
5. Roni regenerates the live preview at 390px and 1440px with a rated fixture and with a below-threshold fixture. Maya does the (h) check. Yonatan gives a one-line sign-off that the hero change leaves title and H1 untouched.

**Next prompt to paste after /clear:** "Adam: apply the Fable 5.2 decision of 26.11 on the first-screen fact. Update 2c (b), (b2), (d), (e), (g), (h) in the step-2 mission file as decided, then brief the engineer: verify the Places rating reaches the home-page render, hero rating line with the ≥4.5 / ≥5 threshold, owner quote moved to the about section with priority number > price rule > job > tool > credential, refusal ineligible. Then Roni + Maya + Yonatan's one-line sign-off. Queue the refusal 'why' probe post-launch."
