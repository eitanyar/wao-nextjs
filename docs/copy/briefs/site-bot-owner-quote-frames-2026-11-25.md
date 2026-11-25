# Brief: Site Bot client home page: lead-in frames before the owner's own quote (2026-11-25)

**Where:** every Site Bot client home page (read by his customers), in the hero, right under the sub-headline. Code renders one line: `{frame} ״{quote}״`. The quote is the owner's own words from our interview, verbatim, first person, 4–12 words. The frame is short third-person narration in front of it that tells the reader who is speaking and what kind of statement it is. The quote alone often doesn't say it, for example a refusal quote can read as if he did the job. This replaces the plain signature in `docs/copy/site-bot-owner-quote-attribution-2026-11-25.waocopy.json` (keep that file's `OWNER_QUOTE_ARIA_LABEL`).

**Real examples of quotes (verbatim from a test owner):**
- refusal: ״מישהו רצה שאחבר לו את המטבח החדש בלי ברז ניתוק״ (he refused)
- job: ״פתחתי סתימה בבניין ישן ברחוב אחוזה עם מצלמה״
- number: ״ב־90 אחוז מהמקרים אני מגיע באותו יום״
- credential sentence: ״אני אינסטלטור מוסמך עם תעודה ממשרד העבודה״
- non-money price rule: ״ההגעה והצעת המחיר בחינם״

**Strings needed (key → string).** Each frame has a `{name}` slot, filled with either his first name or the fallback string below. Frames end right before the opening ״ (code adds a space and the quote):
- `QUOTE_FRAME_REFUSAL`: must state that this was a job he turned down (e.g. "{name} on a job he refused:").
- `QUOTE_FRAME_JOB`: also used for tool/method facts.
- `QUOTE_FRAME_NUMBER`
- `QUOTE_FRAME_CREDENTIAL`
- `QUOTE_FRAME_PRICE_RULE`
- `QUOTE_NAME_FALLBACK`: replaces `{name}` when we don't have a usable first name (e.g. "the business owner"). It must read naturally inside every frame above.

**Constraints:** third person, singular male; 2–6 words per frame; no praise words; never "customer review" wording; works for every trade; Hebrew gershayim are added by code, so don't include them; plain JSON, key → string.
