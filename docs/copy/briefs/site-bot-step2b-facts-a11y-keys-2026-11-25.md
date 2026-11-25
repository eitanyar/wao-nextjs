# Brief: Site Bot step 2b: four small labels on the confirm-facts screen (2026-11-25)

**Where:** the confirm-facts screen in `docs/copy/site-bot-step2b-interview-facts-2026-11-25.waocopy.json` (FACTS_HEAD "רק מה שתאשר עולה לאתר"; per-fact buttons FACT_CONFIRM "נכון", FACT_FIX "לתקן", FACT_REMOVE "להוריד", FACT_FIX_SAVE "לשמור את התיקון"). Same voice. Accessibility review found two gaps.

**Strings needed (key → string), each 1–3 words:**
- `FACT_FIX_CANCEL`: button in edit mode to leave without saving. Same infinitive pattern as לתקן / להוריד.
- `FACT_STATUS_CONFIRMED`, `FACT_STATUS_EDITED`, `FACT_STATUS_REMOVED`: a status word read aloud by a screen reader (and possibly shown small) after he taps. It means "confirmed" / "fixed by you" / "won't go on the site".

Plain JSON, key → string. Singular male.
