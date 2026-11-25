# Brief: Site Bot step 2c: generating screen, home-page preview screen, and the step into payment (2026-11-25)

**Where:** /site-bot/start, the sign-up flow, right after the confirm-facts screen (its button `FACTS_DONE` "לבנות את דף הבית שלי" in `docs/copy/site-bot-step2b-interview-facts-2026-11-25.waocopy.json`). Same persona and voice as that file and as the holding screen file (`docs/copy/site-bot-step2a-holding-expired-2026-11-25.waocopy.json`). He's a one-man tradesman on a phone. He has confirmed his facts and holds one of 10 launch spots. This is THE sales moment: he sees his real home page, built from his own words and his Google data, before paying anything.

**What is true (only promise this):**
- The preview is his real home page, not a demo. Only the home page is built now. The rest (a page per main service, area pages where real facts support them) is built after he pays.
- After payment: a person on our team reads every page before anything goes live. The site goes live within 2 business days of payment (it may be smaller where facts are thin; never filler). We connect to his Google profile as a manager through Google sign-in, so we can keep the site and the profile in line every month. He gets a monthly report.
- Price: ₪199 + VAT a month, from day one. No trial. Cancel online any time, with 30 days' notice. He owns his domain and Google profile.
- He can fix a fact once before paying (one regeneration). After that, changes are made after payment by writing to us.
- The preview isn't public and isn't on Google until he pays and we approve it.

**Strings needed (key → string):**
1. `GENERATING_HEAD` + `GENERATING_BODY`: shown 1–3 minutes while the home page is written. What's happening, in one or two lines: we're writing from his answers and what people in his area search. He can close; we email him when it's ready.
2. `GENERATING_EMAIL_SUBJECT` + `GENERATING_EMAIL_BODY` + `GENERATING_EMAIL_CTA`: a short transactional email, "your home page is ready to view". `{businessName}`, `{previewUrl}` placeholders exactly as written.
3. `PREVIEW_HEAD` + `PREVIEW_BODY`: above the preview frame. This is your home page, from your words. Not public yet.
4. `PREVIEW_FRAME_LABEL`: the accessible name for the preview frame.
5. `PREVIEW_FIX_LINK`: something to fix? Go back to the facts (one more round).
6. `PREVIEW_FIX_USED`: shown instead once the regeneration is used: further changes are made after payment by writing to us.
7. `PREVIEW_NEXT_HEAD` + `PREVIEW_NEXT_LIST`: what happens after he pays, as 3–4 short lines (newline-separated): rest of the site built → a person reads every page → live within 2 business days → we connect to your Google profile and keep it in line.
8. `PAY_CTA`: the main button to go to payment. `PAY_CTA_SUB`: one line under it with the price, VAT, cancel-online, 30 days' notice.
9. `PREVIEW_FAILED`: generation failed twice. Honest, no blame. We've been alerted and we'll email him when it's ready. His spot stays held.

**Constraints:** singular male; the only price is in `PAY_CTA_SUB`; no ranking or result promises, no dates other than "2 business days"; "Google" by name; plain JSON, key → string.
