# "How Ads Bot works, step by step": deep-dive page copy (2026-11-12)

For Tamar (waocopy). A long-form explanation that sits behind `/google-ads` for the reader who wants
the whole plan, from the search someone types to a real enquiry in his list. Yonatan decides whether
it ships as its own page or as sections on `/google-ads`, so write it as self-contained sections. The
angle, the structure inside each section and the analogies are yours. The facts and limits are fixed.

## Persona
A one-man business that works with its hands. Burned by Google ads before, or wary. This is the reader
who clicks "how exactly does it work" because he wants to catch us being vague. He reads on his phone,
between jobs, and skims headings first.

## Situation
The main page already made the promise (approved H1: "פרסום בגוגל שבנוי לעבור מקליקים לפניות אמיתיות").
This page is the proof by detail: eight steps, each one a real thing the system does, each explained
with one everyday picture from his world. The effect to aim for is "these people actually thought
about where every shekel goes". Analogy first, mechanism second, what he sees or does third.

## The eight steps and their true facts
1. **The check before the first shekel.** Real search-volume and click-price data for his service is
   pulled before a live campaign is created; if too few people search, or the expected cost per enquiry
   is above what his job value and closing rate can carry (30% of job value × closing rate, never under
   ₪45), it is not created. The opening chat shows expected enquiries and payback, and says the first
   month roughly breaks even. The campaign is created paused. [`src/lib/google-ads/demand-readiness.ts:83-109`; `src/lib/crm/intelligence.ts:222-226`; `src/lib/bot/prompts.ts:353-362`; `src/app/api/google-ads/create-campaign/route.ts:460-487, 639`]
2. **One service first.** The campaign is built on his main service only: 3–5 search phrases, one
   group, matched as phrases. [`prompts.ts:400`; `create-campaign/route.ts:672-686`]
3. **The words we refuse to pay for.** 10–15 blocked words from day one: job seekers, free, courses,
   how-to guides, second-hand, and what he said he does not do. Google's rule: a blocked word stops the
   ad only when the search contains it, and look-alike words are not blocked automatically, so the list
   is built on purpose and kept up. Google search only, no banners. [`prompts.ts:402-403`; `create-campaign/route.ts:643-648, 688-693`; support.google.com/google-ads/answer/2453972, read 2026-11-12]
4. **An ad made of what is true about him.** Guarantee, years, licence, rating, arrival time and his
   customer's fear are collected in the chat and become up to 15 headlines and 4 descriptions, each a
   different selling point; Google assembles and tests combinations. Under the ad: call button, proof
   lines, service list, four links into his page, his own photos, where his details allow; Google
   chooses what to show per search. [`prompts.ts:395, 433-443`; `create-campaign/route.ts:246-396, 698-721`; support.google.com/google-ads/answer/7684791, read 2026-11-12]
5. **A page that says what he searched for.** A landing page per campaign; its headline area must
   contain the exact service name; form, call button and WhatsApp button, each recorded together with
   the click that brought the person. Google: the quality of the ad and of the landing page is one of
   six things that set an ad's rank, and higher quality ads can often lead to lower click prices.
   [`src/lib/lp/lpCopyPrompt.ts:191-192`; `src/components/lp/LandingPage.tsx:64-68, 83`; support.google.com/google-ads/answer/1722122, read 2026-11-12]
6. **Guards on the money.** Stage one buys clicks under a ₪15 ceiling per click; a fake-click filter on
   the page, checked daily; the bot never raises the daily budget above what he set, and does not ask
   for more while a real enquiry costs more than his limit; everything automatic runs after his
   one-time approval, with a stop switch and an activity log. [`create-campaign/route.ts:641`; `src/lib/fraud-blocker/tracker.ts:5-6`; `src/lib/google-ads/autonomy-consent.ts:36-55`; `src/lib/google-ads/executor.ts:208-218`; `src/lib/google-ads/autonomyCopy.ts:5-8`]
7. **His one-second job, and the clean-up behind it.** One list; one tap for real or junk; a closed job
   with its amount. Each enquiry marked real goes back to Google from day one, tied to its click, and is
   the only thing the account counts as a result; a failed send is saved and retried. Behind the
   scenes: a search with at least five clicks, cost above a set bar and nothing to show is blocked
   (never on thin data, never with a loose block); a search that brought at least two real enquiries
   within his limit is promoted to a keyword after the first two weeks. [`src/components/crm/LeadsTable.tsx:81-117`; `src/lib/crm/clientLeadsActions.js:55-82`; `src/lib/google-ads/conversion-goals.js:28-29`; `src/lib/google-ads/search-term-scoring.ts:28-57, 224-258`; `src/lib/google-ads/searchTermHarvest.ts:34-48`]
8. **From clicks to real enquiries.** The campaign is built to move by itself from click mode to
   enquiry mode after about 15 real enquiries within 60 days plus at least two closed jobs; usually two
   to three months at the minimum budget; not every trade and area gets there at the minimum budget,
   and then it stays in click mode and he is shown the budget that would open the switch; if enquiry
   mode does worse, it goes back by itself. ["built to": approved design, `docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md` §1.6; the automatic switch is scheduled, not live]

Also true and usable where it helps:
- Quality Score, in Google's words: a 1–10 diagnostic per keyword with three parts (expected click
  rate, ad relevance, landing page experience); not itself an input in the auction. Steps 2–5 are the
  three parts, done on purpose. [support.google.com/google-ads/answer/6167118, read 2026-11-12]
- ₪249 + VAT a month, no commitment; ad budget separate, minimum ₪1,500 a month, paid by him. Free demo
  on a sample business. [`src/lib/payments/plans.ts:59`; Ads Bot terms §2, §7; `src/app/(app)/google-ads/page.tsx:86`]

## Must not be stated or implied (omit the subject; never announce the limit)
- Any promised result: enquiries, calls, jobs, cost per enquiry, rank, position, a Quality Score number.
- That ads show only in his town or only in his working hours.
- That calls are recorded or that the bot replies to his customers or catches missed calls.
- An automatic weekly report.
- Present-tense "Google learns from his marks" in stage one; that the switch has happened for anyone,
  happens for all, or by a date; that the trigger is a number of closed jobs; that Google requires a number.
- That Google endorses, certifies or recommends WAO or the bot. A person's name.
- Words that sell nothing: "smart", "advanced", "AI-powered", "algorithm". Say what it does.

## SEO anchors (Yonatan owns these; give options, do not decide)
- Head terms in play: "פרסום בגוגל" (primary on `/google-ads`) and "ניהול קמפיינים בגוגל" (secondary).
  This page must not compete with `/google-ads` for the primary term. Give three H1 options and three
  title options built on a "how it works" intent, and say which term each leans on.
- Title rule: a Hebrew title must not end in a Latin word (the site adds "| WAO" after it).

## Where it goes
Public page or sections (Yonatan), linked from the mechanism block on `/google-ads`. Each step later
gets its explainer audio/video next to it. Not voiced from this text.

## Output
One JSON object, no markdown:

    {
      "angle": "<two English sentences>",
      "h1_options": ["...", "...", "..."],
      "title_options": ["...", "...", "..."],
      "meta_description_options": ["...", "..."],
      "intro": "<Hebrew, 2–3 short paragraphs>",
      "steps": [ { "n": 1, "h2": "<Hebrew>", "analogy": "<Hebrew, 1–2 sentences>", "body": "<Hebrew, 2–4 short paragraphs>", "you_see": "<Hebrew, one line: what he sees or does at this step>" } ],
      "closing": { "h2": "<Hebrew>", "body": "<Hebrew>", "cta": "<Hebrew button, free demo>" },
      "flags": ["<English: a claim you wanted to make but the facts do not support>"]
    }

→ Noa proofs. Dror checks every step against its sources. Yonatan picks H1/title, decides page versus
sections and the internal links. Nothing here ships before all three pass.
