# Ads Bot nurture: five short WhatsApp messages after the free demo (2026-11-12)

For Tamar (waocopy). A sequence for a tradesman who ran the free demo on the sample business, left
his number and agreed to hear from us, and did not sign up. The angle of each message, the order and
the voice are yours. The facts and limits are fixed. Nothing is sent until Amit clears the sending
rules and Noa passes the Hebrew.

## Persona
A one-man business that works with its hands. He looked at the demo between two jobs, thought "maybe",
and went back to work. He reads WhatsApp on a ladder. He deletes anything that smells like a sales
funnel, and answers anything that sounds like a person who knows his trade.

## Situation
Five messages over about two weeks. Each one gives him ONE useful thing he did not know about how his
ad money gets wasted or protected, and shows the piece of the product that handles it. A message must
be worth reading even if he never buys. Short enough to read without scrolling: 40–70 words each.

## Offer
Ads Bot, ₪249 + VAT a month, no commitment; his ad budget is separate (minimum ₪1,500 a month) and is
paid by him. The next step in every message is small: look at the demo again, read the step-by-step
page, or reply with a question. Support is written; a reply gets a written answer.

## True facts to draw from (one main fact per message; you choose which five and in what order)
- Before a live campaign is created, real search-volume and click-price data for his service is
  checked; if the numbers cannot work for his job value, it is not created. [`src/lib/google-ads/demand-readiness.ts:83-109`]
- The campaign is built on one main service with 3–5 search phrases, not on everything he does. [`src/lib/bot/prompts.ts:400`]
- From day one, 10–15 words are blocked: job seekers, free, courses, how-to guides, second-hand, and
  what he does not do. Google does not block look-alike words by itself. [`prompts.ts:402-403`; support.google.com/google-ads/answer/2453972, read 2026-11-12]
- His ad is built from what is true about him (guarantee, years, licence, arrival time): up to 15
  headlines and 4 descriptions, each a different reason to choose him. [`prompts.ts:433-443`]
- His landing page must carry the exact service name the person searched for; Google rates the quality
  of the ad and the page, and says higher quality ads can often lead to lower click prices. [`src/lib/lp/lpCopyPrompt.ts:191-192`; support.google.com/google-ads/answer/1722122, read 2026-11-12]
- At the start there is a ₪15 ceiling on the price of a click, and the bot never raises his daily
  budget above what he set. [`src/app/api/google-ads/create-campaign/route.ts:641`; `src/lib/google-ads/autonomy-consent.ts:44`]
- Every enquiry lands in one list; one tap marks it real or junk; each one marked real goes back to
  Google from day one and is the only thing the account counts as a result. [`src/components/crm/LeadsTable.tsx:81-117`; `src/lib/crm/clientLeadsActions.js:55-61`; `src/lib/google-ads/conversion-goals.js:28-29`]
- A search that took at least five clicks, cost more than a set bar and brought nothing gets blocked. [`src/lib/google-ads/search-term-scoring.ts:224-258`]
- The campaign is built to move by itself from click mode to enquiry mode after about 15 real
  enquiries within 60 days; usually two to three months at the minimum budget; not every business
  gets there at the minimum budget. ["built to": approved design, not live yet]
- Google's current new-advertiser offer in Israel, as seen in our Partner account on 2026-11-12: spend
  ₪1,500, get ₪1,500 ad credit; Google's offer, for businesses that never advertised on Google Ads;
  Google checks eligibility and can change or end it.

## Must not be stated or implied (omit the subject; never announce the limit)
- Any promised result: enquiries, calls, jobs, a cost per enquiry, payback.
- Urgency that is not real: "last places", "today only", a deadline. (The pilot size is not a fact for this sequence.)
- That ads show only in his town or hours; that calls are recorded; that the bot answers his customers.
- That Google already bids on his marks in stage one, or that the switch has happened for anyone.
- That the Google credit is ours, guaranteed, or part of the fee. That Google endorses WAO.
- A person's name as sender, "I'll call you", a phone call offer, a response time.
- A customer story, a review or a testimonial.

## Entity anchors
Product "בוט מודעות"; brand WAO in Latin; Google named plainly. Page terms for consistency:
"פניות אמיתיות", "מצב קליקים", "מצב פניות".

## Format rules
- WhatsApp, not email: no subject line, no greeting formula, no signature block. First line carries the point.
- One link at most per message; mark it as `{{demo_link}}` or `{{how_it_works_link}}`.
- Every message ends with a natural one-line way to stop receiving them; write it once as `opt_out`
  and we append it. (Amit and the lawyer may replace this line.)
- Singular male. Not voiced.

## Output
One JSON object, no markdown:

    {
      "angle": "<two English sentences: the arc across the five and why>",
      "opt_out": "<Hebrew, one short line>",
      "messages": [ { "n": 1, "day": 0, "fact_used": "<English>", "text": "<Hebrew>", "link": "{{demo_link}}" } ],
      "flags": ["<English>"]
    }

→ Noa proofs. Dror checks the facts. Amit grades the sending rules (consent wording at the demo, the
opt-out line, WhatsApp template category) before anything is sent.
