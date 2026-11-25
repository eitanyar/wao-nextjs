# Brief: Site Bot client home page: three helpful-block headlines + preview-screen lines (2026-11-26)

**Persona:** the reader of the blocks is a homeowner in Ra'anana / Kfar Saba with a plumbing or electrical problem, on his phone, deciding whom to call. The reader of the preview lines is the business owner (one-man plumber/electrician) looking at his home page before he pays ₪199/month.

**Where 1: home-page block headlines (H2), on every plumber and electrician client site.** Below the hero, the home page gets three labelled blocks filled from a fixed, reviewed trade library (general knowledge, neutral voice, never a claim about this owner) with the owner's own fact on top when he gave one:
- `BLOCK_WHEN_TO_CALL_H2`: signs it's time to call a pro (symptoms the homeowner sees).
- `BLOCK_PRICE_DRIVERS_H2`: what the price of the job depends on (no numbers on the page).
- `BLOCK_QA_H2`: common questions people ask before calling.
Each H2 may take a `{trade}` slot (e.g. plumber/electrician noun as it appears on the site) if that reads better; give a version without the slot too (`..._PLAIN`). They are not SEO anchors; no city names. Customer-facing, plain spoken Hebrew, not marketing slogans.
- `BLOCK_OWNER_LEAD`: a 2–4-word lead-in shown before the owner's own words when his fact leads a block (code renders `{lead} ״{quote}״`), e.g. "In his words:". Must work in all three blocks; third person, singular male.

**Where 2: preview screen, owner-facing, outside the home-page frame** (the screen that shows him his home page before payment). Strings:
- `PREVIEW_ADDED_AFTER_TITLE`: a short title for a list of what is added once he joins.
- `PREVIEW_ADDED_SERVICE_PAGES`: a page for each service he named.
- `PREVIEW_ADDED_REVIEWS`: his Google reviews and rating, once he connects his Google profile.
- `PREVIEW_ADDED_PHOTOS`: his own work photos.
- `PREVIEW_ILLUSTRATION_NOTE`: one line saying the background image in the top of the page is an illustration, replaced by his own photo once he sends one. (Fable 5.2, 25.11.)
These must sell (this is the moment before he pays), stay true (no promise of Google rankings, positions, traffic or a timeframe), and never sound like a placeholder or demo.

**Constraints:** singular male; no praise words; no ranking or "first page" promises anywhere; works for plumbers and electricians; plain JSON, key → string.
