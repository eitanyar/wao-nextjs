# Ads Bot explainer series, part B: "once it is running" (episodes 5–8) (2026-11-12)

For Tamar (waocopy). Part A (episodes 1–4) is a separate brief and runs in parallel:
`ads-bot-explainer-a-before-launch-2026-11-12.md`. The angle, the wording, the analogies and the
rhythm are yours. The facts and the limits are fixed.

## Persona
A one-man business that works with its hands: plumber, electrician, AC technician, beautician. Smart,
busy, ROI-minded. He has paid for Google ads before, or knows someone who did: money out, clicks in,
quiet phone. He trusts nobody who says "leave it to us". He does not know the trade words of
advertising and should not need them.

## Situation
He is on `/google-ads`, or he got a link on WhatsApp after the free demo. He wants to know what
happens to his money every day after the ads go live, and what his own part is. One mechanism per
episode, one calm voice (Nimrod) over real product screens. An explanation, not an ad. He may listen
with the phone in his pocket.

## Offer
Ads Bot: Google Ads management for one-man businesses, in a new account opened in his name, for a
monthly fee. Approved closing line pattern (copy it exactly when a closing line is asked for):
"WAO. בוט מודעות: 249 ₪ + מע״מ לחודש."

## What each episode must get across
One episode = one mechanism. Each is 45–55 seconds: 6–8 lines, about 100–115 words. You decide the
hook, the order inside the episode and the analogy. Each episode must stand alone.

### E5: What guards his money from the first day
True facts:
- A new account knows nothing yet. So at the start the campaign buys clicks, with a ceiling of ₪15 on
  the price of one click. [`src/app/api/google-ads/create-campaign/route.ts:636-641`]
  (Google Ads Help, read 2026-11-12: this bidding mode gets as many clicks as the budget allows, and a
  maximum price per click can be set as a cap. [support.google.com/google-ads/answer/6268626])
- The bot never raises his daily budget above the amount he set himself. [`src/lib/google-ads/autonomy-consent.ts:44`; `src/lib/google-ads/autonomy.ts:214`]
- It also does not ask for more budget while a real enquiry costs him more than the limit worked out
  from his own job value. [`src/lib/google-ads/executor.ts:208-218`; `src/lib/google-ads/autonomous-cycle.ts:119-133, 264-268`]
- A fake-click filter sits on his landing page, and the bot checks every day that it is on. If the
  protection is not confirmed, the bot stops making changes in the account until it is. [`src/lib/fraud-blocker/tracker.ts:5-6`; `autonomous-cycle.ts:248-256`; `autonomy.ts:217-223`]
- Everything the bot does on its own happens only after his one-time approval, inside limits he can
  see, with a stop switch, and every action is written to an activity log. [`src/lib/google-ads/autonomyCopy.ts:5-8`; `autonomy.ts:197-226`]

### E6: His one-second job: real or junk
True facts:
- Every enquiry lands in one list: a form, a tap on the call button, a tap on WhatsApp. [`src/lib/crm/lead-capture.ts:50-82`; `src/app/(product)/client/leads/page.tsx`]
- He marks each one with a tap: real or junk. When a job closes, he marks it closed and types what it
  was worth. [`src/components/crm/LeadsTable.tsx:81-117, 260`]
- Every enquiry he marks as real is sent back to Google from day one, tied to the click that brought
  it. A closed job is sent too, with its amount. Junk is not sent; it only cleans his list. [`src/lib/crm/clientLeadsActions.js:55-61`; `src/lib/google-ads/conversion-upload.ts:119-254`]
- In the account, the ONLY thing counted as a result is an enquiry he marked as real. Clicks, call-button
  taps and WhatsApp taps are recorded but are not the goal. [`src/lib/google-ads/conversion-goals.js:28-29, 66-68`; `create-campaign/route.ts:519-577, 657-662`]
- If a send to Google fails, the result is saved and the bot tries again in its next daily run. [`clientLeadsActions.js:69-82`; `autonomous-cycle.ts:238-245`]
- An enquiry that did not come from an ad click has nothing to tie it to, so it stays in his list only. [`conversion-upload.ts:149-155`]
- If he does not mark, the campaign has nothing to build on. His marks are the fuel.

### E7: Cutting the searches that burn money, keeping the ones that bring work
True facts:
- The bot reads the list of what people actually typed before they clicked his ad.
- A search that got at least five clicks, cost more than a set bar (twice his usual cost per real
  enquiry, or 15% of his average job, whichever is higher) and brought nothing is blocked. [`src/lib/google-ads/search-term-scoring.ts:44-57, 224-258`]
- It does not judge on thin data: under 20 showings a search is ignored, and under 50 it is only
  watched, never blocked. [`search-term-scoring.ts:28-36, 279-330`]
- When it blocks, it blocks that phrase precisely, never a loose block that could also hide good
  searches. [`search-term-scoring.ts:100-101, 168-173`]
- The other direction: a search that brought at least two real enquiries at a cost within his limit is
  promoted to a keyword of its own, so the campaign goes after it on purpose. This starts after the
  campaign's first two weeks. [`src/lib/google-ads/searchTermHarvest.ts:34-48`; `src/lib/google-ads/operator.ts:552-565, 614-625`]
- These run with his one-time approval, at most once a day. [`autonomy-consent.ts:36-55`]

### E8: From clicks to real enquiries
This is the founder's headline point. Sell it with confidence; every sentence must stay true as written.
True facts:
- Stage one, today: the campaign buys clicks under the price ceiling, and every enquiry he marks as
  real goes back to Google from day one.
- The campaign is BUILT TO move by itself from click mode to enquiry mode: once about 15 real enquiries
  have built up within 60 days, with at least two closed jobs. At the minimum budget that usually takes
  two to three months. No phone call to us, no waiting for approval. [approved design: `docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md` §1.6; the automatic switch itself is scheduled to be built 30.11–3.12, so use "built to" / "is designed to", never "already switches"]
- From that moment Google aims at real enquiries only, not at clicks.
- Honest part: at the minimum budget, not every trade and area gets there. Then the campaign stays in
  click mode, which keeps working, and he is shown the monthly budget that would open the switch.
- Safety net: if enquiry mode does worse, the campaign goes back to click mode by itself.
- Approved page wording for this idea, for consistency (do not copy whole sentences, keep the terms):
  "פניות אמיתיות", "מצב קליקים", "מצב פניות", "תקרה של 15 ₪".

## Must not be stated or implied (omit the subject; never announce the limit)
- Any result: more calls, more jobs, cheaper enquiries, a number of enquiries, a saving.
- Present-tense "Google learns from his marks" or "Google moves the budget to better searches" as a
  description of stage one. In stage one Google bids for clicks.
- That the switch has already happened for anyone, happens for everyone, or happens by a date.
- That the trigger is a number of closed jobs, or that Google requires any number.
- A cap or guarantee on what an enquiry costs. The ceiling is on the price of a click.
- That Google itself never spends above the daily amount on a given day.
- That the bot answers customers, replies to enquiries, or catches missed calls.
- That every call is recorded. What is recorded is a tap on the call button.
- A weekly report, the refund, the ad credit, the Partner badge, payment or checkout.
- That Google endorses, certifies or recommends WAO or the bot.
- A person's name. No founder. Our price or any ad-budget amount inside an episode, except the ₪15
  click ceiling and the figures 15 / 60 days / two to three months in E8.

## Entity anchors
- Product: "בוט מודעות". Brand: WAO, with the audio tag `[excited]` directly before the brand word,
  once per episode, in the line that names the product. Every other line is a straight, calm register.
- Google is named in speech freely. No Google screens or logos are shown.

## Voice rules
- Singular male, spoken Israeli Hebrew, 12–15 words per sentence at most, one idea per line.
- Eyes-closed rule: every line is understood on first hearing with the screen off.
- No advertising jargon without a five-word plain explanation the first time. Prefer the plain word.
- Where a word could be read two ways without vowels, add niqqud on that word only.
- Removable lines: in E5 the fake-click line, and in E6 the "sent back to Google" lines, may be
  removed before the render if a check fails. Write so each episode still flows without them, and give
  an `alt` for the E6 line that says only that his marks are what the next stage is built on.

## Where it goes
Voiced by Nimrod over screen recordings of the demo plumber business; embedded in a "how it works"
block on `/google-ads`, sent as a WhatsApp link after the free demo, and uploaded as a playlist.

## Output
One JSON object, no markdown:

    {
      "angle": "<two English sentences: the through-line you chose for the four episodes and why>",
      "episodes": {
        "E5": { "title": "<Hebrew, 6 words or fewer>", "lines": [ { "beat": "E5-01", "voice": "...", "display": "...", "screen": "<English: what real product screen or plain card should be visible>", "tag_why": "<English>", "removable": false, "alt": null } ] },
        "E6": { ... }, "E7": { ... }, "E8": { ... }
      },
      "flags": ["<English: a claim you wanted to make but the facts above do not support>"]
    }

- `voice`: the spoken line with any audio tag or niqqud. `display`: the caption form, no tags, no
  niqqud, WAO in Latin, numbers in digits with the currency sign.

→ Noa proofs every line and every `alt`. Dror checks every Google statement and every product
statement against its source, and E8 against the phase-2 spec. Then Eitan's ear before voicing the batch.

## FOUNDER RULE (added by Adam after this brief was written, overrides any length above)
"Less words, more punch." Explainers/YouTube: each episode stays well under 1 minute, and any series cut is ≤3–4 minutes total. Cut the word budget by about a third versus the numbers above: for a 45–55s explainer episode, aim for about 70–80 words, not 100–115. Let the real footage, the screen and short silences carry the rest. One idea per line, the shortest true sentence that lands. If a beat needs more words to be true, drop the beat, not the truth.
