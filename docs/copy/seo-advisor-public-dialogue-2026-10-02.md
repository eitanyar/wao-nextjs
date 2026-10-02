# Public SEO Advisor — Conversational Funnel Copy (DRAFT ONLY)

**Author:** waocopy (Tamar/Gil) · **Date:** 2026-10-02 · **Task:** Kanban t_2d572e5d / handoff 2026-10-02_009
**Status:** Draft proposal for the PLANNED Phase 2 public `/seo-advisor` funnel. Nothing here is live.
**Gates before any use:** independent Hebrew QA (waohebrewqa), engineering safety implementation (budget ceiling, rate limiting, fraud blocker, cache), runtime/visual QA, and Eitan's explicit publication/spend decision.
**Engineer note:** when these strings are implemented, every bot-turn string must land in BOTH the simulation route and the live prompts lib, per the Bot Turns Rule.

---

## 1. Persona & Voice

- **Who:** Israeli hands-on / in-person microbusiness owner — plumber, electrician, photographer, therapist, trainer. Busy, outcome-focused, burned by agencies before.
- **Register:** native spoken Sabra Hebrew, singular male, warm-direct. Relief, never fear. Jargon always explained.
- **Asymmetry:** *his customer* is the one in a hurry (searching from the phone, taking whoever shows up first). The owner himself is never pressured.
- **Sentence rule:** every spoken Hebrew sentence ≤ 15 words (TTS-safe), singular male, no emoji in spoken beats.
- **Voice of the bot:** approval-gated advisor — explains what it will do, asks permission, runs only that, reports only real evidence.

**Offer woven in (truthful, grounded):** WAO's human-assisted organic SEO review. The existing consulting funnel already promises a first strategy conversation at no cost, month-to-month, no contract (`src/app/(app)/consulting/page.tsx`). The bot never invents a separate SEO price, a guarantee, a deadline, or a "free unlimited audit."

---

## 2. Keyword & Entity Rationale (compact)

**Researched:** 2026-10-02, live Hebrew SERP sampling + primary docs.

| Hebrew intent cluster | Representative query pattern | Why it anchors the copy | Source (accessed 2026-10-02) |
|---|---|---|---|
| Small-business organic SEO | "קידום אורגני לעסקים קטנים", "SEO לעסק קטן" | Highest-volume framing; every ranking guide opens with the small-vs-big underdog angle — the copy leans on "you can be found locally" not "beat the giants" | https://velolinx.co.il/seo/small-business/ · https://www.shmul.co.il/seo-לעסקים-קטנים-ישראל/ |
| Website SEO audit / check | "בדיקת אתר SEO", "אבחון דיגיטלי", "איך האתר שלי נראה בגוגל" | The funnel's core action = a bounded check; Hebrew searchers use "בדיקה/אבחון", not "audit" | https://sello.co.il/content/organic-seo-complete-guide · https://theseo.co.il/קידום-אתרים-לעסקים-קטנים/ |
| Local SEO advisor / service areas | "קידום מקומי", "עסק + עיר" (e.g. "נגריה ברמת גן") | Local intent is where microbusinesses can realistically rank; copy names אזור שירות explicitly | https://velolinx.co.il/blog/local-small-business-seo-guide-2026/ · https://avinu.co.il/seo-for-small-business/ |
| Google rankings / positions | "מיקומים בגוגל", "למה אני לא עולה בגוגל", "עמוד ראשון בגוגל" | The "striking distance" moment (positions 4–20) maps directly to the panel's real `get_ranked_keywords` evidence | https://support.google.com/webmasters/answer/9128668?hl=iw · https://searchcounselco.com/google-search-console-guide |
| SEO for trades / service businesses | "קידום אתרים לחשמלאי / אינסטלטור / מטפלת" | Persona-specific pages rank on trade+city long-tails; the copy speaks the trade owner directly | https://business.isracard.co.il/useful_information/Business_magazine/seo_for_small_businesses |

**Entities woven through the dialogue:** SEO / קידום אורגני · גוגל וחיפוש אורגני · Search Console (מוסבר בשפה פשוטה) · דומיין / כתובת האתר · מיקומים ודירוג · קישורים נכנסים (backlinks) · אזור שירות מקומי · יועץ ה-SEO של WAO.

**Truthfulness anchors (primary docs, checked 2026-10-02):**
- Google's own SEO Starter Guide describes how Search finds, crawls and serves pages, and never promises positions — https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google's June 2026 guidance on third-party SEO tools/services: tools can't guarantee performance; be skeptical of anyone implying Google endorsement (covered 2026-06-07 by Search Engine Land; summary at https://claudio-novaglio.com/en/blog/news-updates/google-authority-seo-tools-aeo-geo). → The copy below contains zero ranking guarantees and zero "approved by Google" claims.
- Search Console is free and first-party — https://support.google.com/webmasters/answer/9128668?hl=iw

**Scope note:** this is classic SEO only. No AIO/GEO service pitch; no AI-answer citations promise.

---

## 3. What Is True Today vs. Planned (copy must never blur this)

| Capability | State today | Copy rule |
|---|---|---|
| Operator-only advisor panel (admin-gated) | Exists, QA-passed | Never mentioned to prospects |
| Public conversational `/seo-advisor` bot | Planned Phase 2, NOT live | This whole doc is a proposal for it |
| Bounded mini-diagnosis with cache/budget/rate limits | Planned, gated by spend decision | Copy never promises unlimited or anonymous repeat checks |
| GSC connection for client sites | Planned Phase 3 | Never implied as available |
| Automatic on-site edits / execution | Not built; advisor is advisory-only | Copy states plainly: nothing gets changed on your site |
| Guaranteed rankings | Never, by anyone — Google says so explicitly | Zero guarantee language anywhere |
| Human SEO review conversation (no cost, no contract) | Exists via `/consulting` offer | The only thing the CTA sells |

---

## 4. Dialogue States

Slot conventions (proposals for engineering; not a production schema): `{domain}`, `{keyword}`, `{position}`, `{page}`, `{evidence_date}`, `{phone}`.

### S1 — Domain Invitation (entry state)

**Purpose:** open on the owner's findability, invite the domain, set calm. One pace→lead beat maximum here.

**Beat A (opening):**
- ״אהלן, אני יועץ ה-SEO של WAO.״
- ״אני בודק איך עסקים נמצאים בגוגל, בלי קישוטים.״
- ״מה הכתובת של האתר שלך?״

**Beat B (demand-side truth — his customer is in a hurry; he is not):**
- ״הלקוחות שלך מחפשים שירות בגוגל, מהטלפון, עכשיו.״
- ״הם מתקשרים למי שמופיע להם ראשון.״
- ״בדיקה קצרה מראה איפה אתה עומד היום.״

**Beat C (pace→lead, hands-on archetype — use once, only when true for the trade):**
- ״את מה שאתה עושה במו ידיים, שום AI לא יחליף.״
- ״אבל את החיפוש בגוגל כן אפשר לסדר נכון.״
- ״זה בדיוק מה שאני בודק כאן.״

**If he hesitates / asks "what do you do with it":**
- ״שאלה מצוינת.״
- ״הבדיקה מסתכלת על נתוני חיפוש גלויים של האתר.״
- ״אף אחד לא נכנס לך למערכות.״
- ״ואף אחד לא משנה לך כלום באתר.״

### S2 — Bounded Diagnosis Consent (approval gate)

**Purpose:** explain why, state the bounds honestly, ask explicit approval before running. Never imply unrestricted anonymous checks.

- ״רגע לפני שאני בודק — הסבר קצר.״
- ״אני מסתכל על נתוני החיפוש האורגני של {domain}.״
- ״הבדיקה מוגבלת, ורצה פעם אחת על האתר שלך.״
- ״היא ללא עלות וללא התחייבות — ובלי שיחת מכירה.״
- ״אם אשתמש במידע שכבר נאסף — אגיד לך מאיזה תאריך.״
- ״מתאים לך שאתחיל?״

**Approval received →** run the check, show a brief waiting line:
- ״יוצא לדרך, זה לוקח כמה רגעים.״

**Declined →** respect it, no pressure loop (S5 soft exit).

### S3 — Evidence-Backed Result

**Rule:** only real panel evidence is spoken; every number arrives in a slot, never invented. One finding at a time, best finding first. Freshness stated whenever the evidence is cached.

**S3a — Striking-distance keyword (panel: positions 4–20):**
- ״יש לי ממצא אמיתי וחשוב.״
- ״העמוד {page} מופיע בגוגל על הביטוי ׳{keyword}׳.״
- ״המיקום שלך היום: {position}.״
- **אם {position} הוא 11–20:** ״אתה במרחק נגיעה מעמוד התוצאות הראשון.״
- **אם {position} הוא 4–10:** ״אתה כבר בעמוד הראשון בגוגל — עכשיו מטפסים לראש.״
- ״חיפוש כזה הוא לקוח שכמעט התקשר אליך.״
- ״שיפור ממוקד בעמוד הזה הוא הצעד הכי משתלם שלך.״

**S3b — Authority gap (panel: referring domains below the constraint threshold):**
- ״עוד ממצא — הפעם על קישורים.״
- ״מעט מאוד אתרים אחרים מקשרים אליך.״
- ״גוגל קורא קישורים כהמלצות אמון.״
- ״כשאין המלצות — קשה לעלות במיקומים.״
- ״חיזוק סמכות הוא המנוע הבא של האתר שלך.״

**S3c — Baseline only (no ranked-keyword rows; organic presence exists or is new):**
- ״הנה התמונה האמיתית, בלי איפור.״
- ״האתר שלך בתחילת הדרך האורגנית.״
- ״יש בסיס — ועכשיו בונים עליו בשיטה.״
- ״קודם תשתית ודפים ברורים, אחר כך מיקומים.״

**S3-close (freshness label, always when evidence is cached):**
- ״הנתונים האלה מבוססים על מידע מתאריך {evidence_date}.״
- ״גוגל משתנה כל הזמן; זו תמונת מצב, לא נבואה.״

**Anti-guarantee line (usable in any variant if he asks "so I'll be first?"):**
- ״אף אחד בעולם לא יכול להבטיח לך מקום בגוגל.״
- ״גוגל עצמו אומר את זה במפורש.״
- ״מה שכן אפשר — לעבוד בשיטה ולמדוד.״

### S4 — Fallback States (insufficient / unavailable / stale / invalid)

**S4a — Insufficient evidence:**
- ״הסתכלתי, ואין לי עדיין מספיק נתונים על {domain}.״
- ״יכול להיות שהאתר חדש, או שהמידע עוד לא הצטבר.״
- ״אני לא ממציא מספרים — רק מוסר מה שיש.״
- ״שווה לחזור לבדוק בהמשך.״

**S4b — Service unavailable:**
- ״הבדיקה לא הצליחה להשלים עכשיו.״
- ״זה לא קשור לאתר שלך — זה אצלי בצד.״
- ״אפשר לנסות שוב מאוחר יותר.״

**S4c — Stale evidence (explicit freshness label):**
- ״יש לי מידע על האתר, אבל הוא מתאריך {evidence_date}.״
- ״דברים השתנו מאז — אצלי או אצלך.״
- ״קח את זה ככיוון, לא כמצב עדכני.״

**S4d — Unsupported market:**
- ״הבדיקה הזאת עובדת היום על אתרים בישראל ובארה״ב.״
- ״לשאר השווקים עוד אין לי כיסוי אמין.״

**S4e — Invalid domain:**
- ״לא הצלחתי לזהות את הכתובת הזאת.״
- ״תן לי דומיין מלא — למשל, yoursite.co.il.״

### S5 — Non-Pushy Contact CTA (exit states)

**S5a — Warm close (after a real finding):**
- ״עד כאן מה שבדקתי לך היום.״
- ״יש כאן כיוון פעולה אמיתי, לא סיסמה.״
- ״אם תרצה — איש SEO אמיתי מ-WAO יעבור איתך על הממצאים.״
- ״שיחת ייעוץ ראשונה, ללא עלות וללא התחייבות.״
- ״בלי חוזה ובלי שיחות מכירה אגרסיביות. אנחנו לא כאלה.״
- ״תשאיר טלפון, ונדבר כשנוח לך.״

**S5b — He declines / not now (soft exit, door stays open):**
- ״בסדר גמור, באמת.״
- ״הממצאים שלך נשארים פה.״
- ״תחזור מתי שבא לך — אני לא הולך לשום מקום.״

**S5c — No contact details wanted:**
- ״לא צריך פרטים כדי לקרוא את הבדיקה.״
- ״רק אם תרצה שיחה עם בן אדם — אז נשמח.״

---

## 5. Copy Guardrails (binding for whoever implements)

1. No price, no package, no deadline, no guarantee, no "free unlimited audit" — anywhere in spoken beats.
2. No credit amounts, raw provider payloads, account emails, or internal statuses leak into prospect-facing text.
3. The diagnosis is presented as bounded and honest about staleness — never as unlimited anonymous checking.
4. No GSC connection, automatic edits, or public bot claimed as existing until engineering ships them behind their gates.
5. Classic SEO only — no AIO/GEO promises in this funnel.
6. Urgency belongs to his customer, never to him: zero pressure language toward the owner.
7. Every spoken sentence: singular male, ≤ 15 words.

**Escalation:** independent Hebrew QA pending (waostrategy dispatches waohebrewqa; waocopy does not self-QA).
