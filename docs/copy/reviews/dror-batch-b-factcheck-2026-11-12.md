# Dror: PPC fact-check of waocopy batch B (2026-11-12)

Saved by Adam from Dror's hand-back. Google Help was re-read on 2026-11-12. Batch A rulings carry over (docs/copy/reviews/dror-batch-a-factcheck-2026-11-12.md).

## Adam's rulings (new)
- **Situation shorts, first person:** the pain beats stay first person; the SOLUTION beats move to the product as subject ("בבוט מודעות…"). In an ad, "I mark, my list" reads as a client testimonial, and we have none. That avoids needing a "dramatisation" label. Amit confirms whether any label is still needed.
- **"Your daily budget is a ceiling" is FALSE.** Google may spend up to 2× the average daily budget on a given day; the monthly cap is 30.4×. Intent: "your daily budget is an average Google works to over the month; the bot never raises it above what you set."
- **"Usually two to three months" → "we estimate two to three months for a typical trade at the minimum budget"**, because nobody has made the switch yet.
- **The "חינם" negative (product):** move from the bare word to free-intent PHRASES (free download, free course…), so "free quote" buyers aren't blocked. The phrase list comes from Tamar and Dror, then the engineer changes prompts.ts. Queued after the current Ads Bot fixes.
- **HOLD:** price in paid shorts; the stop switch / activity log; "a failed send is saved and retried" (until Roni verifies step 0's persisted outcomes on deploy).

## FIX rows (English intent; Tamar writes the Hebrew)
**Situation shorts**
- S1-04: use the alt line ("גם מה שאני לא עושה — חסום מראש"), which passes.
- S2-04: no "every". Intent: "the headlines are reasons to choose me."
- S3-02: "today the enquiries from my page sit in one list on my phone" (then the product-as-subject ruling).
- Price lines S1-05 / S2-05 / S3-05: HOLD for paid.

**How-it-works page**
- Meta 2 and 6 ¶1: no "15 ₪". Intent: "a ceiling on one click's price, set for your trade."
- 1 ¶1: "Google's estimates" of searches and click cost.
- 1 ¶3: "the first month is a learning month, not a profit month", not "roughly breaks even".
- 2 ¶2: phrase match means the MEANING of the service (as batch A E2-04).
- 3 ¶3: "a text ad in search results, no banners on websites" (Search Partners is on).
- 4 ¶3 (optional): new accounts often aren't eligible for image assets in the first weeks.
- 5 ¶2: "each form, call tap or WhatsApp tap on the page is recorded with the click that brought it."
- 5 ¶4: "steps 2–5 are built around these three parts."
- 6 ¶1: lead with Google's invalid-click filtering (42995), then "our page runs its own filter"; no "daily".
- 6 ¶2: imply no daily cap (2× rule).
- 7 ¶1: "the enquiries from your page sit in one list."
- 7 ¶2: no "every"; tied to its click; removable behind GA1.
- 7 ¶3: with one-time approval; ≥5 clicks; above the bar; no real enquiry; that search wording only; drop "never on too little data".
- 7 ¶4: promotion is conditional (≥2 real enquiries within the limit, after the first two weeks).
- 8 (h2, ¶1, ¶2, ¶3, you_see): "designed to" (מתוכנן); "we estimate two to three months"; no area; never attribute the 15 to Google.

**Nurture**
- Msg 1: "Google won't block these searches for you. A blocked word also doesn't cover its look-alikes (plural, singular, synonyms), so the list is built on purpose."
- Msg 2: "Google's estimates."
- Msg 3: "a good page opens on the exact service; in our build the page headline carries your service's name"; "written around your service's search phrases."
- Msg 4: the daily-budget fix (above); no "15 ₪".
- Msg 5: "enquiries from your page land in one list"; no "every"; tied to its click; removable behind GA1.
- opt_out: Amit.

**Quality Score article**
- Meta 1: "the reason isn't ONLY who pays more."
- S1 ¶3: "a lower BID can still show above a higher one when the ad and page are better, because the bid is only one of the factors." Say bid, not pay.
- S3 "one of six": the bid still counts.
- S3 two-plumbers close: "same search, the price per click can differ" (an illustration).
- S5 b1: "some of the headlines repeat the words people type" (no fixed main headline). Add: he must add the negative variants himself.
- FAQ 3: "—" means not enough searches yet to get a score.
- FAQ 5: a blocked word stops the ad on every search containing it, including good ones (Google warns about over-blocking).
- FAQ 6: one campaign can hold several services, each in its own keyword group with its own ad and page; what hurts is mixing them in one group.
- Re-read every Google statement on the day of publishing (Dror).

Sources: Google Help 6167118, 1722122, 9921843, 2453972, 7684791, 2375423 (+ batch A list), all read 2026-11-12.
