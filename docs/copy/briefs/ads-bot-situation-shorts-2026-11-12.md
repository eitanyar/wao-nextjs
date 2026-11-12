# Ads Bot "one-man-show situations": three short ads on real footage (2026-11-12)

For Tamar (waocopy). Three stand-alone shorts, 15–20 seconds each, same real-footage route as the
30-second ad (real hands, real phone with the real product screen, Nimrod's voice, bold captions).
Each one is a small story from his day that ends on what the product really does about it. The story,
the joke and the angle are yours. The facts and limits are fixed.

## Persona
A one-man business that works with its hands. No office, no secretary, no marketing person. Every
shekel of advertising comes out of his own pocket, and every wasted call costs him time on a job.

## Founder rules for ads (binding)
- Each short is one connected, funny story: pain → solution. Works with the screen off.
- WAO said upbeat: `[excited]` directly before the brand word. No person's name. No founder.
- The price is spoken only in the last line. Closing line pattern, copy exactly:
  "WAO. בוט מודעות: 249 ₪ + מע״מ לחודש."

## Situation 1: the junk enquiry
What happens to him: he pays for an ad, and the people who click are looking for a job, a course, a
free tip, or something he does not do at all.
What the product truly does:
- From day one the campaign carries a block-list of 10–15 words: job seekers, free, courses, how-to
  guides, second-hand, and the things he told the bot he does not do. [`src/lib/bot/prompts.ts:402-403, 423`; `src/app/api/google-ads/create-campaign/route.ts:688-693`]
- He marks a bad enquiry as junk with one tap, and it leaves his real list. [`src/components/crm/LeadsTable.tsx:81-85, 260`]
- A search that keeps taking clicks and brings nothing gets blocked by the bot. [`src/lib/google-ads/search-term-scoring.ts:224-258`] (removable; give an `alt` without it)

## Situation 2: the cheap competitor
What happens to him: someone in his town advertises a price no honest tradesman can work for. He
cannot win on price and does not want to.
What the product truly does:
- In the opening chat the bot collects what is true and different about him: his guarantee, years in
  the trade, licence, how fast he arrives. [`prompts.ts:395, 433`]
- His ad is built from those: up to 15 headlines and 4 descriptions, each a different reason to choose
  him, plus short proof lines under the ad. [`prompts.ts:436-443`; `create-campaign/route.ts:276-309, 698-706`]
- Enquiries from price-only shoppers he marks as junk; enquiries he marks as real are what the
  campaign is built to chase. [`LeadsTable.tsx:81-85`; approved "built to" wording, as in the page
  headline: "פרסום בגוגל שבנוי לעבור מקליקים לפניות אמיתיות"]

## Situation 3: "I pay every month and see nothing"
What happens to him: he once paid someone to run his ads. He got a report full of clicks and never
knew where the money went.
What the product truly does:
- Every enquiry is in one list on his phone: who left details, who tapped to call, who tapped
  WhatsApp. [`src/lib/crm/lead-capture.ts:50-82`; `src/app/(product)/client/leads/page.tsx`]
- He is the one who says which were real. In the account, an enquiry he marked as real is the only
  thing counted as a result. [`src/lib/google-ads/conversion-goals.js:28-29`]
- Every change the bot makes is written to an activity log he can open. [`src/lib/google-ads/autonomyCopy.ts:8`]
- The account is opened in his name. [`create-campaign/route.ts:498-502`]

## Must not be stated or implied (omit the subject; never announce the limit)
- Any result or promise: more calls, more jobs, beating the competitor, cheaper enquiries, savings.
- Anything negative about a named or recognisable competitor, or that cheap tradesmen are crooks.
- That price-shoppers never see his ad, or that junk enquiries stop.
- That the bot answers customers, replies for him, or catches missed calls.
- That every phone call is recorded. What is recorded is a tap on the call button.
- A weekly report sent to him. Ownership of the account beyond "opened in his name".
- That Google already learns from his marks today, or that the switch to chasing enquiries already happens.
- A customer, a review, a testimonial, or anyone presented as a client.
- Any number other than the price in the last line. That Google endorses WAO.

## Shot bank (pick one ID per line, or describe a new shot in English)
B1 work hands on a job · B2 hands wiped, phone out of the pocket · B3 phone in hand with the real
enquiries list (demo business, demo label) · B4 thumb marks real · B5 thumb marks junk · B6 van door ·
B7 ladder or roof, no face · B8 coffee on the tailgate · B9 plain card with moving text · E1 end screen.
Never shown: a face, a customer, a competitor's ad, a Google screen or logo.

## What to write
For each situation: 4–5 lines, at most 40 words, the last line being the closing line.

## Voice rules
Singular male, spoken Israeli Hebrew, 12–15 words per sentence at most. Tags only where the line's
meaning calls for one. Niqqud only on a word a voice could misread.

## Output
One JSON object, no markdown:

    {
      "angle": "<two English sentences: what ties the three together and why>",
      "shorts": {
        "S1_junk": [ { "beat": "S1-01", "voice": "...", "display": "...", "caption": "<Hebrew, 4 words or fewer>", "shot": "B1", "tag_why": "<English>", "removable": false, "alt": null } ],
        "S2_cheap_competitor": [ ... ],
        "S3_see_nothing": [ ... ]
      },
      "new_shots": ["<English>"],
      "flags": ["<English: a claim you wanted to make but the facts do not support>"]
    }

→ Noa proofs every field. Dror checks each line against Google's misrepresentation policy (no
improbable result as the likely outcome; nothing about competitors that cannot be shown). Then
Eitan's ear.

## FOUNDER RULE (added by Adam after this brief was written, overrides any length above)
"Less words, more punch." Explainers/YouTube: each episode stays well under 1 minute, and any series cut is ≤3–4 minutes total. Cut the word budget by about a third versus the numbers above: for a 45–55s explainer episode, aim for about 70–80 words, not 100–115. Let the real footage, the screen and short silences carry the rest. One idea per line, the shortest true sentence that lands. If a beat needs more words to be true, drop the beat, not the truth.
