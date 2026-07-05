---
author: Gil (instructional-designer)
date: 2026-07-03
status: locked-for-future-scripting
purpose: >
  Fact-check constraints to apply when Module 4 (4.1–4.4) and Module 5 (5.1–5.5)
  lesson scripts are actually written. Neither module has a full narration script
  yet — only lesson titles (docs/course-marketing/lesson-titles.md) and, for
  Module 4, one teaser line inside the Module 2 finale script. This file exists
  so these two corrections aren't lost between sessions.
---

## Fix 1 — Module 4: FAQ rich results are deprecated (as of May 7, 2026)

**Status when checked (2026-07-03): no violation found — already correctly framed.**

Searched the full repo for any Module 4 script content. Found only:
- `docs/scripts/website-course/L2-4-five-pages.md`, slide 9 (lines 269–296) — a
  one-line preview/teaser of what Module 4 covers, inside the Module 2 finale script.
  Bullet (line 271): "מודול 4: שאלות ותשובות — כדי שמנועי AI יצטטו אותך"
  Narration (lines 285–286): "במודול ארבע נוסיף שאלות ותשובות. כדי שגם מנועי ה-AI יצטטו אותך."
  → Already the correct AEO/GEO framing (AI engines quote you). Does **not** claim
  SERP FAQ dropdowns. **No edit needed.**
- `docs/course-marketing/lesson-titles.md` — Tamar's draft titles for 4.1–4.4 (e.g.
  4.2 "שאלות ותשובות: הבלוק שה-AI של גוגל מצטט הכי הרבה"). Also already AEO-framed,
  not rich-snippet-framed. Owned by Tamar; no edit made (not my lane).
- No full Module 4 lesson script (4.1, 4.2, 4.3, 4.4) exists yet in the repo.

**Binding constraint for whoever scripts Module 4 (Gil, when the strategist brief
lands):**
Do NOT say or imply "Google will show your FAQ in the search results" —
FAQPage rich results were fully deprecated by Google on May 7, 2026 and no longer
appear in the SERP for anyone. The correct one-line framing to teach the "why" of
FAQPage schema:
> FAQPage JSON-LD is a clean machine-readable signal that tells AI Overviews,
> Google AI Mode, ChatGPT Search, and Perplexity exactly how to cite your page as
> the answer. It's an AEO/GEO play — being the answer AI search engines quote —
> not a classic rich-snippet play.
The schema-writing instruction itself is untouched — only the "why" narration
changes. Keep it to one short sentence; don't over-explain.

## Fix 2 — Module 5: two honest timing caveats (module not yet scripted)

Save for when Lesson 5.2 ("האתר באוויר תוך עשר דקות") and Lesson 5.3
("לחבר את הדומיין... לוקח חמש דקות") are actually written.

**Lesson 5.2 — "10 minutes live":**
The 10-minute claim covers deploy mechanics only (Cloudflare Pages drag-and-drop
is genuinely that fast). Account creation + email verification adds 3–5 minutes
and must be framed as *prep before the lesson*, not inside the clock:
> "לפני שמתחילים — תפתח חשבון חינמי ב-Cloudflare Pages. זה לוקח שלוש דקות ונעשה
> פעם אחת."

**Lesson 5.3 — "5 minutes domain":**
The clicks inside Cloudflare take 5 minutes. DNS propagation (nameserver change
at the registrar) is outside anyone's control — minutes to hours. Narration must
say:
> "השינוי עצמו לוקח חמש דקות. אחרי זה — ממתינים. לפעמים הדומיין חי תוך כמה דקות,
> לפעמים כמה שעות. זה נורמלי לגמרי."

No other Module 5 script changes implied by this note — just these two timing
caveats, to be built into the narration when Module 5 is scripted.
