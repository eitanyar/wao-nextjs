# Ads Bot FAQ: the questions a burned tradesman actually asks (2026-11-12)

For Tamar (waocopy). One bank of questions and answers that will be reused in three places: the FAQ of
the "how it works" page, written support replies, and the sales call. The angle and the voice are
yours. You also choose which questions lead and how many there are (aim for 14–18). The facts and the
limits are fixed.

## Persona
A one-man business that works with its hands. He already lost money on Google ads, or heard the
stories. He asks short, suspicious questions, the way he would ask a supplier. He wants a straight
answer in two or three sentences, and he can smell a dodge.

## Situation
He is close to trying it and is looking for the catch. Each answer must give him the real mechanism in
plain words, and where the honest answer is "not always" or "not yet", say what does happen instead.
On this page the hero already sold him; here the job is trust through precision.

## Offer facts
- ₪249 + VAT a month for management. No commitment; he can leave any month. [`src/lib/payments/plans.ts:59`; Ads Bot terms §7]
- The ad budget is separate and is his: minimum ₪1,500 a month, about ₪50 a day. [Ads Bot terms §2]
- A new account, opened in his name, built from scratch. We do not repair an existing account. [`src/app/api/google-ads/create-campaign/route.ts:498-502`; Ads Bot terms §2]
- A free demo on a sample plumbing business shows the plan before he pays anything. [`src/app/(app)/google-ads/page.tsx:86`]
- 30-day refund of the management fee under the conditions in the terms. [Ads Bot terms §7]
- Support is in writing. Most questions are answered by the system; a person steps in when needed.

## True mechanisms to answer from (each with its source)
**Before launch**
- The system checks real search volume and click prices for his service before a live campaign is
  created; if too few people search or the expected cost per enquiry is more than his job value can
  carry, it is not created. [`src/lib/google-ads/demand-readiness.ts:83-109`; `create-campaign/route.ts:460-487`]
- The campaign is created paused; nothing runs before he saw the plan. [`create-campaign/route.ts:639`]

**How the campaign is built**
- One main service, 3–5 search phrases for it, one group. [`src/lib/bot/prompts.ts:400`; `create-campaign/route.ts:672-686`]
- A block-list of 10–15 words from day one (job seekers, free, courses, how-to, second-hand, what he
  does not do). [`prompts.ts:402-403`; `create-campaign/route.ts:688-693`]
- Google search only, no banners on other sites. [`create-campaign/route.ts:643-648`]
- An ad with up to 15 headlines and 4 descriptions built from his real selling points; call button,
  proof lines, service list, links and his photos under it where his details allow. [`prompts.ts:436-443`; `create-campaign/route.ts:246-396, 698-721`]
- A landing page for that service whose headline area must contain the exact service name; form, call
  button and WhatsApp button, each recorded with the click that brought the person. [`src/lib/lp/lpCopyPrompt.ts:191-192`; `src/components/lp/LandingPage.tsx:64-68, 83`]

**While it runs**
- Stage one: buys clicks with a ₪15 ceiling on the price of a click. [`create-campaign/route.ts:641`]
- A fake-click filter on the landing page, checked daily. [`src/lib/fraud-blocker/tracker.ts:5-6`; `src/lib/google-ads/autonomous-cycle.ts:248-256`]
- The bot never raises his daily budget above what he set. [`src/lib/google-ads/autonomy-consent.ts:44`]
- It blocks searches that took at least five clicks, cost more than a set bar and brought nothing; it
  promotes searches that brought at least two real enquiries within his cost limit to keywords. [`src/lib/google-ads/search-term-scoring.ts:44-57, 224-258`; `src/lib/google-ads/searchTermHarvest.ts:34-48`]
- All of this runs after his one-time approval, inside visible limits, with a stop switch and an
  activity log. [`src/lib/google-ads/autonomyCopy.ts:5-8`]

**His part and the switch**
- All enquiries in one list; one tap marks real or junk; a closed job is marked with its amount. [`src/components/crm/LeadsTable.tsx:81-117`]
- Each enquiry marked real goes back to Google from day one, tied to its click; it is the only thing
  the account counts as a result. A failed send is saved and retried. [`src/lib/crm/clientLeadsActions.js:55-82`; `src/lib/google-ads/conversion-goals.js:28-29`]
- The campaign is built to move by itself from click mode to enquiry mode after about 15 real
  enquiries within 60 days plus at least two closed jobs; at the minimum budget usually two to three
  months; not every trade and area gets there at the minimum budget, and then he is shown the budget
  that would; if enquiry mode does worse it goes back by itself. [`docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md` §1.6; "built to" because the automatic switch is scheduled, not live]

**Google's own statements (Google Ads Help, read 2026-11-12; attribute to Google when used)**
- Six things set an ad's rank: the bid, the quality of the ads and landing page, rank thresholds, how
  competitive the auction is, the context of the search, and the expected impact of the ad's extra
  lines and formats. Google says higher quality ads can often lead to lower click prices. [support.google.com/google-ads/answer/1722122]
- Quality Score is a 1–10 diagnostic per keyword with three parts (expected click rate, ad relevance,
  landing page experience); Google says it is not itself an input in the auction. [support.google.com/google-ads/answer/6167118]
- Google's new-advertiser offer in Israel today, as seen in our Partner account on 2026-11-12: spend
  ₪1,500, get ₪1,500 in ad credit. It is Google's offer for businesses that never advertised on Google
  Ads; Google checks eligibility, sets the terms and can change or end it. [`docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md`, update of 2026-11-12]

## Questions that must be covered (word them the way he would)
What do you do that the last guy didn't · Whose account is it · Where does my money go · What if only
junk calls · What stops the price of a click from running away · What do I have to do myself and how
long does it take · What happens if I don't mark · When does it start chasing real enquiries and what
if it never gets there · Do you promise me calls · Do my ads show for all my services · What about
fake clicks · Can I stop it · What does it cost in total · Why a new account and not my old one · What
is that credit from Google · Can I see it before I pay.

## Must not be stated or implied (omit the subject; never announce the limit)
- A promise of enquiries, calls, jobs, cost per enquiry or payback. Where he asks for a promise, the
  answer is the refund terms and what he can see himself.
- That ads show only in his town or only in his working hours.
- That calls are recorded, or that the bot answers or calls back his customers.
- A weekly report as an automatic message.
- That Google already bids on his marks in stage one; that the switch has happened for anyone.
- A Quality Score number or a promised rank or position.
- That the Google credit is ours, guaranteed, or part of the fee.
- That Google endorses WAO. A person's name; a phone call with anyone; a response time.
- Nothing about a competitor by name.

## Entity anchors
Product "בוט מודעות"; brand WAO; Google and Google Ads named plainly. Keep the page's approved terms:
"פניות אמיתיות", "מצב קליקים", "מצב פניות", "תקרה של 15 ₪". The secondary SEO anchor
"ניהול קמפיינים בגוגל" may appear naturally in one question if it reads well; do not force it.

## Where it goes
Not voiced. Page FAQ (with FAQ structured data), support macros, sales call notes.

## Output
One JSON object, no markdown:

    {
      "angle": "<two English sentences>",
      "faq": [ { "id": "q01", "q": "<Hebrew>", "a": "<Hebrew, 2–4 sentences>", "facts_used": ["<English: which fact above>"], "short": "<Hebrew, one sentence, for a WhatsApp reply>" } ],
      "flags": ["<English: a question he would ask that the facts above cannot answer honestly yet>"]
    }

→ Noa proofs. Dror checks every answer against its source. Yonatan signs off before any of it goes
on a public page. `flags` go to Adam as product gaps.
