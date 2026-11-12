# Ads Bot 30-second ad on real footage: one connected story (2026-11-12)

For Tamar (waocopy). This is the first ad on the new "real" route: phone-shot footage of a real
tradesman's hands and day, his real phone showing the real product screen, Nimrod's voice, bold moving
captions. No cartoon, no actor talking to camera, no face needed. The story, the joke and the angle
are yours. The facts, the limits and the shot bank are fixed.

## Persona
A one-man business that works with its hands (plumber, electrician, AC technician). He paid for Google
ads once, or his friend did. Money out, clicks in, quiet phone. He is on YouTube or scrolling between
jobs. He will give you three seconds.

## Situation to write from (not an angle; choose yours)
He knows the feeling of paying for "clicks" and getting people who were never going to hire him. He
has no time to sit on a campaign, and he does not believe reports. What he would love is simple: tell
Google which calls were real, and have the money go after more of those.

## Founder rules for ads (binding)
- 30 seconds is ONE connected funny story that moves from the pain to the solution. Not a list of
  features, not separate chunks.
- It works with the screen off. Every line is understood on first hearing without the picture.
- The brand WAO is said upbeat: audio tag `[excited]` directly before the brand word.
- No person's name anywhere. No founder.
- The price is not spoken before the last line and appears on the end screen only.

## True facts you may build the solution on
- Ads Bot opens a new Google Ads account in his name and runs it for him. [`src/app/api/google-ads/create-campaign/route.ts:498-502`]
- At the start it puts a ceiling on the price of a click. [`create-campaign/route.ts:641`]
- Every enquiry lands in one list on his phone. He marks each with one tap: real or junk. [`src/components/crm/LeadsTable.tsx:81-117, 260`]
- Every enquiry he marks as real goes back to Google from day one. [`src/lib/crm/clientLeadsActions.js:55-61`] (removable line, see below)
- The bot blocks searches that burn money without bringing enquiries. [`src/lib/google-ads/search-term-scoring.ts:224-258`] (removable line, see below)
- The campaign is built to move by itself from chasing clicks to chasing real enquiries, once enough
  of his real marks have built up. [approved design; the automatic switch is not live yet, so the
  wording is "built to", as in the approved page headline: "פרסום בגוגל שבנוי לעבור מקליקים לפניות אמיתיות"]
- First step for him: a free demo on a sample business. [`src/app/(app)/google-ads/page.tsx:86`]
- Closing line, copy this pattern exactly: "WAO. בוט מודעות: 249 ₪ + מע״מ לחודש."
  The end screen carries the stamp (no commitment) and the button; you do not write those here.

## Must not be stated or implied (omit the subject; never announce the limit)
- Any result or promise: more calls, more jobs, a fuller diary, cheaper enquiries, savings.
- That Google already learns from his marks today, or that the switch already happens.
- That he stops paying for clicks. Google charges per click in every stage.
- That the bot answers his customers or catches calls he missed.
- That ads show only in his area or only when he is available.
- A customer, a review, a testimonial, "it worked for me", or anyone presented as a client.
- Any number other than the price in the last line.
- That Google endorses or recommends WAO.

## Shot bank (real footage; pick one ID per line, or describe a new shot in English)
- **B1** Work hands under a sink or in an electrical box, tool in hand. Real job sound.
- **B2** The same hands wiping on trousers, pulling a phone from a pocket.
- **B3** Close on the phone in his hand: the real enquiries list of the demo business (product screen, demo label on).
- **B4** His thumb taps one enquiry as real. One tap.
- **B5** His thumb taps another as junk.
- **B6** Van: sliding door shuts, or tools thrown in the back.
- **B7** Ladder or roof edge, feet and tool belt, sky behind. No face.
- **B8** Coffee on the tailgate, phone lying next to it.
- **B9** A plain card with moving text only (for the idea of clicks versus real enquiries).
- **E1** End screen: mark, product name, price, stamp, button.
Never shown: a face, a customer, a Google screen or logo, a ringing-phone graphic, a number that goes up.

## What to write
Three sections from the same story.
- `ad_30`: 6–7 lines, at most 62 words. Pain → turn → what he does (one tap) → what the campaign is
  built to do → free demo → closing line.
- `ad_15`: 3 lines, at most 26 words. The same story at its shortest, then the closing line.
- `ad_6`: 2 lines, at most 9 words. One idea, then product and brand (price shown, not spoken).

Removable lines: the line that says his mark goes back to Google, and any mention of blocked searches,
may be cut before the render. For each, give an `alt` that keeps the story whole without that claim
(for the first: his marks are what the campaign builds on).

## Voice rules
Singular male, spoken Israeli Hebrew, 12–15 words per sentence at most. Audio tags only where the
meaning of that line calls for one; say why. Where a word could be read two ways without vowels, add
niqqud on that word only.

## Output
One JSON object, no markdown:

    {
      "angle": "<two English sentences: the story you chose, where the laugh is, and why it fits him>",
      "story_in_one_line": "<English>",
      "ad_30": [ { "beat": "R01", "voice": "...", "display": "...", "caption": "<Hebrew, 4 words or fewer, the bold on-screen words for this beat>", "shot": "B1", "tag_why": "<English>", "removable": false, "alt": null } ],
      "ad_15": [ ... ],
      "ad_6": [ ... ],
      "new_shots": ["<English: any shot you need that is not in the bank>"],
      "flags": ["<English: a claim you wanted to make but the facts do not support>"]
    }

- `voice`: spoken line with tags and niqqud. `display`: full caption form, no tags, WAO in Latin, price
  in digits with the currency sign and the VAT term. `caption`: the few words that appear large.

→ Noa proofs every field. Dror checks each line against Google's misrepresentation policy and the
facts above. Then Eitan listens with his eyes closed before anything is filmed to it.

## FOUNDER RULE (added by Adam after this brief was written, overrides any length above)
"Less words, more punch." Explainers/YouTube: each episode stays well under 1 minute, and any series cut is ≤3–4 minutes total. Cut the word budget by about a third versus the numbers above: for a 45–55s explainer episode, aim for about 70–80 words, not 100–115. Let the real footage, the screen and short silences carry the rest. One idea per line, the shortest true sentence that lands. If a beat needs more words to be true, drop the beat, not the truth.
