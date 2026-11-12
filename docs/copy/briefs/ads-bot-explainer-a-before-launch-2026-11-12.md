# Ads Bot explainer series, part A: "before the first shekel is spent" (episodes 1–4) (2026-11-12)

For Tamar (waocopy). Part B (episodes 5–8) is a separate brief and runs in parallel:
`ads-bot-explainer-b-running-2026-11-12.md`. The angle, the wording, the analogies and the rhythm are
yours. The facts and the limits are fixed.

## Persona
A one-man business that works with its hands: plumber, electrician, AC technician, beautician. Smart,
busy, ROI-minded. He has paid for Google ads before, or knows someone who did: money out, clicks in,
quiet phone. He trusts nobody who says "leave it to us". He does not know the trade words of
advertising and should not need them.

## Situation
He is on `/google-ads`, or he got a link on WhatsApp after the free demo. He is not asking "what is
it" any more. He is asking "what exactly do you do with my money, step by step, that the last guy
didn't". The series answers that, one mechanism per episode, in one calm voice (Nimrod) over real
product screens. It is an explanation, not an ad. He may listen with the phone in his pocket.

## Offer
Ads Bot: Google Ads management for one-man businesses, built from scratch in a new account, for a
monthly fee. Approved closing line pattern (copy it exactly when a closing line is asked for):
"WAO. בוט מודעות: 249 ₪ + מע״מ לחודש."

## What each episode must get across
One episode = one mechanism. Each is 45–55 seconds: 6–8 lines, about 100–115 words. You decide the
hook, the order inside the episode and the analogy. Each episode must stand alone (he may see only one).

### E1: The check before launch
True facts:
- Before a live campaign is created, the system pulls real data on how many people search for his main
  service and what a click costs there. [`src/lib/google-ads/demand-readiness.ts:83-109`; called at `src/app/api/google-ads/create-campaign/route.ts:460-487`]
- If too few people search, or the expected cost of an enquiry is higher than what his average job and
  his closing rate can carry, the campaign is not created. [`demand-readiness.ts:98-108`; the ceiling is 30% of average job value × closing rate, never under ₪45: `src/lib/crm/intelligence.ts:222-226`]
- In the opening chat the bot asks what a job is worth to him and how many enquiries he closes, and
  shows him the expected number of enquiries for a budget and how long until the ad spend pays back.
  It says plainly that the first month roughly breaks even. [`src/lib/bot/prompts.ts:353-362`]
- Nothing runs until he has seen the plan: the campaign is created paused. [`create-campaign/route.ts:639`]

### E2: One service, and the words we refuse to pay for
True facts:
- The campaign is built around ONE service: his main, most profitable one. Three to five search
  phrases, all for that service, in one group. No mixing of services. [`prompts.ts:400`; one ad group: `create-campaign/route.ts:672-678`]
- The phrases are matched as phrases, not loosely: Google may add words before or after, but the
  phrase has to be there. [`create-campaign/route.ts:686`]
- From day one there is a block-list of 10–15 words: job seekers, "free", courses and studies,
  how-to guides, second-hand, plus whatever he told the bot he does not do. [`prompts.ts:402-403, 423`; applied at `create-campaign/route.ts:688-693`]
- Why it matters (Google's own rule, Google Ads Help, read 2026-11-12): a blocked word stops the ad only
  when the search contains it; Google does not block look-alike words by itself, so the list has to be
  built deliberately and kept up. [support.google.com/google-ads/answer/2453972]
- The ads run on Google search only. No banners on other websites. [`create-campaign/route.ts:643-648`]

### E3: The ad itself, built from what is true about him
True facts:
- In the opening chat the bot collects what makes him different: his guarantee, years in the trade,
  licence, rating, how fast he arrives, what his customer is afraid of. [`prompts.ts:395, 433`]
- The ad is built from those: up to 15 headlines and 4 descriptions, each a different selling point,
  not the same sentence reworded. His main service is in the first headline. [`prompts.ts:436-443`; `create-campaign/route.ts:698-706`]
- Google's rule (Google Ads Help, read 2026-11-12): an ad of this type holds up to 15 headlines and 4
  descriptions; Google assembles combinations and over time tests the most promising ones. [support.google.com/google-ads/answer/7684791]
- Under the ad, extra lines are added where his details allow: a call button with his number, short
  proof points (guarantee, experience, licence), a list of his services, four links into his page, and
  his own photos. [`create-campaign/route.ts:246-396, 714-721`]
- Google decides in each search which of these to show. Google lists "the expected impact from your ad
  assets" as one of the six things that set an ad's rank. [support.google.com/google-ads/answer/1722122, read 2026-11-12]

### E4: The page he lands on says the same thing he searched for
True facts:
- Each campaign gets its own landing page, built for that one service. [`create-campaign/route.ts:697`; `src/app/api/lp-generate/route.ts`]
- The headline area of the page must contain the exact name of the service he searched for. This is a
  hard rule in the page builder. [`src/lib/lp/lpCopyPrompt.ts:191-192`]
- Why (Google Ads Help, read 2026-11-12): Google rates the quality of the ad AND of the landing page;
  that quality is one of the six things that set an ad's rank, and Google says higher quality ads can
  often lead to lower click prices. [support.google.com/google-ads/answer/1722122]
- The page has three ways to reach him: a form, a call button, a WhatsApp button. Each one is
  recorded, together with the click that brought the person. [`src/components/lp/LandingPage.tsx:64-68, 83, 222-229`; `src/lib/crm/lead-capture.ts:50-82`]
- All three land in one list on his phone. [`src/app/(product)/client/leads/page.tsx`]

## Must not be stated or implied (omit the subject; never announce the limit)
- Any result: more calls, more jobs, cheaper enquiries, a number of enquiries, a saving.
- That the check before launch guarantees demand or profit.
- That ads appear only in his town or service area, or only at hours he works.
- That every call is recorded or tracked. What is recorded is a tap on the call button.
- That every ad shows the extra lines, the photos or the links. Google chooses.
- A Quality Score number, or that a score "lowers his price". Only Google's own wording above.
- That Google endorses, certifies or recommends WAO or the bot.
- "Exact match", "smart", "AI-powered", "algorithm" as selling words. Say what it does.
- The weekly report, the refund, the ad credit, the Partner badge, payment or checkout.
- A person's name. No "we'll call you". No founder.
- Our price or any ad-budget amount inside an episode. (The end card shows the price; it is not spoken.)

## Entity anchors
- Product: "בוט מודעות". Brand: WAO, with the audio tag `[excited]` directly before the brand word,
  once per episode, in the line that names the product. Every other line is a straight, calm register.
- Google is named in speech freely. No Google screens or logos are shown.
- Approved page vocabulary for consistency: "פניות אמיתיות".

## Voice rules
- Singular male, spoken Israeli Hebrew, 12–15 words per sentence at most, one idea per line.
- Eyes-closed rule: every line is understood on first hearing with the screen off.
- No advertising jargon without a five-word plain explanation the first time. Prefer the plain word.
- Where a word could be read two ways without vowels, add niqqud on that word only.

## Where it goes
Voiced by Nimrod over screen recordings of the demo plumber business; embedded in a "how it works"
block on `/google-ads`, sent as a WhatsApp link after the free demo, and uploaded as a playlist.

## Output
One JSON object, no markdown:

    {
      "angle": "<two English sentences: the through-line you chose for the four episodes and why>",
      "series_title": "<Hebrew, 6 words or fewer>",
      "episodes": {
        "E1": { "title": "<Hebrew, 6 words or fewer>", "lines": [ { "beat": "E1-01", "voice": "...", "display": "...", "screen": "<English: what real product screen or plain card should be visible>", "tag_why": "<English>" } ] },
        "E2": { ... }, "E3": { ... }, "E4": { ... }
      },
      "flags": ["<English: a claim you wanted to make but the facts above do not support>"]
    }

- `voice`: the spoken line with any audio tag or niqqud. `display`: the caption form, no tags, no
  niqqud, WAO in Latin.

→ Noa proofs every line. Dror checks every Google statement against the cited help page and every
product statement against the cited code line. Then Eitan's ear on E1 before the rest are voiced.

## FOUNDER RULE (added by Adam after this brief was written, overrides any length above)
"Less words, more punch." Explainers/YouTube: each episode stays well under 1 minute, and any series cut is ≤3–4 minutes total. Cut the word budget by about a third versus the numbers above: for a 45–55s explainer episode, aim for about 70–80 words, not 100–115. Let the real footage, the screen and short silences carry the rest. One idea per line, the shortest true sentence that lands. If a beat needs more words to be true, drop the beat, not the truth.
