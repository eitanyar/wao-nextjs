# Noa QA — Dash video scripts r1 (2026-11-12)

Source: `docs/copy/video-dash-scripts-r1-2026-11-12.waocopy.md`. Brief: `docs/copy/briefs/video-dash-scripts-r1-2026-11-12.md`. No source file edited.

## Verdicts

| Ep | Verdict | Blocking items |
|---|---|---|
| A1 | FIX | global price/VAT voice fix (G1–G3); end card says he opens the account; long headline 1 grammar |
| A2 | FIX | G1–G3; homograph imperative סמן; "בלי קליקים ריקים" promises a result; "שבועית" misuse |
| A3 | FIX | G1–G3; description 2 grammar ("customers that closed") |
| S1 | FIX | G1–G3; "אבל שקוף" agreement; "המכסה" ambiguous; hook 3 and a banner don't work |
| S2 | FIX | G1–G3; close "ביקורות נכתבות: 199 ₪" reads like a counter of 199 reviews, and promises reviews get written |
| S3 | FIX | G1–G3; "ביקורות מסודרות" reads as arranged reviews (Google review policy) |

Most of it is clean. Hooks are all 6 words or fewer (cap 8). Every Dash line is 7 words or fewer (cap 12). Address is singular male throughout. Display typography is clean: ״ in מע״מ, em-dashes have single spaces, no ASCII quotes, no double spaces. Text assets all fit: the longest headline is 27/40 ("עבודה טובה. אף אחד לא רואה."), the longest long headline is 62/90 (A2 #1), the longest description is 64/90 (A1 #1). No first place, lead counter, ringing finale, credit amount, real client or ₪1,500 comparison anywhere. No banner text copies system notification wording; whether the banner *looks* like a real notification is a design check (Maya/Dana).

## Global fixes (apply everywhere they occur)

**G1 🟠 TTS / spelling: the VAT word ends in a non-final mem, and וָ forces a formal "va-".** "מַעֲמ" ends in a regular מ, which is a spelling error and a TTS risk. "וָתֵשַׁע" with kamatz will be read "va-tesha". A Sabra says "ve-tesha".
- `מָאתַיִם אַרְבָּעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ` → `מָאתַיִם אַרְבָּעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש` (all 8 voice occurrences, A1–A3)
- `מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ` → `מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש` (all 8 voice occurrences, S1–S3)
- Keep "שקל", not "שקלים". It is the spoken form.

**G2 ⚖️ The price is said without "a month".** Spoken "249 שקל" sounds like a one-time price, but both bots are monthly retainers. G1 adds "לחודש" to the voice lines. The matching display fix:
- `249 ₪ + מע״מ.` → `249 ₪ + מע״מ לחודש.` (display lines only; the end cards and text assets already say לחודש and won't match)
- `199 ₪ + מע״מ.` → `199 ₪ + מע״מ לחודש.` (same)
- This puts Eitan's close at 11 words against "about 6–10". It's acceptable, and the fact matters more.

**G3 🔴 The brand token in the voice lines.** `איתן מ-WAO` is the only Latin token in the voice lines. ElevenLabs may spell it W-A-O or say "wow". Adam/Eitan: confirm how the brand is said. If it's "וואו", the voice line needs a Hebrew spelling with nikud, e.g. `איתן מִ-וָואוֹ`. That spelling is a placeholder until Eitan decides, so do a listen test before batch render. If Eitan records his close himself, this item drops.

**G4 🟡 Product name consistency (route to Adam).** The site uses Latin "Site Bot" / "Ads Bot". The scripts use "סייט בוט" / "בוט מודעות". Hebrew is right for TTS. For captions and end cards, decide whether they match the landing page. Separately, "סַיְיט בּוֹט" with a doubled yod is untested. Listen-test it against `סַייט בּוֹט` before rendering.

## Per-episode fixes (`old → new`, old is byte-exact)

### A1
- 🟠/⚖️ end card (A1 and A2): we open the account, not him. `פתח חשבון חדש על שמך.` → `נפתח לך חשבון חדש על שמך.` Tamar may want a stronger CTA verb. This fixes the fact only.
- 🟠 long headline 1: customers aren't "a job that closed"; enquiries are. `הבוט לומד מלקוחות שאתה מסמן כעבודה אמיתית שנסגרה, לא מקליקים.` → `הבוט לומד מפניות שאתה מסמן כעבודה אמיתית שנסגרה, לא מקליקים.` (62 chars)
- 🟡 Tamar: the 20–27 Eitan line drops the punch, "not from clicks". "כאמיתיים" also reads translated. `בוט מודעות לומד מלקוחות שאתה מסמן כאמיתיים.` → suggested `בוט מודעות לומד מהפניות שסגרת, לא מקליקים.` (it sells the contrast the whole episode set up)
- 🤖 "הטלפון שותק / שקט" appears 3 times in the 30s cut. The repetition reads mechanical. Tamar: vary one.
- 🟡 banner `מונה רץ. כיס מדמם.`: "a bleeding pocket" is a calque. The native idiom is "מדמם כסף".

### A2
- 🟠 TTS homograph: bare imperative סמן can be read as past tense. `סמן לקוחות אמיתיים. הבוט לומד מזה.` → `תסמן לקוחות אמיתיים. הבוט לומד מזה.` (voice and display both, to keep them identical)
- ⚖️ description 2 promises zero wasted clicks. `בלי קליקים ריקים: תקציב מודעות מכוון לפי לקוחות.` → `תקציב מודעות שמכוון לפי לקוחות, לא לפי קליקים.`
- 🟠 description 3: "שבועית" is an adjective used as an adverb. `מופיעות שבועית.` → `מופיעות כל שבוע.`
- 🟡 15s `אחד, שניים, שלושה. בלי טלפון.`: "בלי טלפון" is limp. Tamar: try "אף צלצול".

### A3
- 🟠 description 2: customers don't "close". `הבוט לומד מלקוחות שאתה מסמן כאמיתיים שנסגרו, לא מקליקים.` → `הבוט לומד מפניות שסימנת כעבודה שנסגרה, לא מקליקים.`
- 🟡 headline 1 `דוח יפה. אף לקוח?` is half a phrase. Tamar: echo the hook, `דוח יפה. לקוח? אין.` (18 chars)
- 🟡 hook 3 `הדוח הזה הפוך. כמו המספרים?` is confusing. Drop it (see "die" list).

### S1
- 🟠 agreement: "שקוף" has no subject. It can't agree with עבודה (feminine), and the scene uses "we" (עברה דרכנו). This also restores the brief's "years" beat. `עבודה טובה. אבל שקוף.` → `שנים של עבודה טובה. ואנחנו שקופים.` (30s and 15s, voice and display)
- 🟠 TTS / clarity: "המכסה" is ambiguous (mikhse/mekhase, and which lid?). `שמו קפה על המכסה. הוא נפל.` → `שמו קפה על מִכְסֵה המנוע. הוא נפל.` (display without nikud: `שמו קפה על מכסה המנוע. הוא נפל.`)
- 🟡 banner `הקפה נפל. התיאבון נשאר.` makes no sense. Tamar: suggested `אפילו הקפה עבר דרכנו.`
- 🟡 hook 3 `לקוחה עברה דרך הדלת. שוב.`: in Hebrew, walking through the door just means she came in, so the joke inverts. Suggested `עוד לקוחה עברה דרכנו. שוב.`
- 🟡 Eitan 20–27 `אתר עץ שירותים, פרופיל תואם, עזרה בביקורות.`: a reflexive list of three, and "עץ שירותים" is our jargon, not his. Tamar: say what it is in his words (a site built around every service he does, with a Google profile that matches it). Keep the positioning: never a builder, never a small site.
- 🟡 long headline 1 `סייט בוט בונה נוכחות שלמה` puts "בונה" next to the product name, which edges toward builder framing. Tamar: consider "מסדר לך".

### S2
- ⚖️/🔴 meaning: `ביקורות נכתבות: 199 ₪` reads as "reviews written: 199". That looks like a counter, it promises reviews, and it doesn't name the product. `איתן מ-WAO. ביקורות נכתבות: 199 ₪ + מע״מ.` → `איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ לחודש.`. The matching voice line: `איתן מ-WAO. ביקורות נכתבות. מֵאָה תִּשְׁעִים וָתֵשַׁע שֶׁקֶל פלוס מַעֲמ.` → `איתן מ-WAO. סַיְיט בּוֹט: מֵאָה תִּשְׁעִים וְתֵשַׁע שֶׁקֶל פלוס מַעַם לחודש.` (script_30 and eitan_close)
- 🟡 turn `גוגל לא שומע מחמאות.`: the brief's intent "Google has no ears" is funnier in native Hebrew. Tamar: `לגוגל אין אוזניים.`
- 🟡 long headline 1 `במקום שבו מחפשים אותך` is formal. Spoken: `איפה שמחפשים אותך`.
- 🟡 banners `בלי מיקרופון.` / `בלי קול.` are weak and don't earn a read on mute.

### S3
- ⚖️ Google review policy: "ביקורות מסודרות" reads as arranged or managed reviews. `וביקורות מסודרות.` → `ועזרה בביקורות.`
- ⚖️ (Yonatan) long headline 2 `כשהאתר, הפרופיל והלקוחות מספרים אותו דבר, גוגל מבין.` implies we steer what customers write. Suggested `כשהאתר והפרופיל מספרים אותו סיפור, גוגל מבין.`
- 🟡 close `סיפור אחד: 199 ₪` doesn't name the product. Same fix as S2: `איתן מ-WAO. סיפור אחד: 199 ₪ + מע״מ.` → `איתן מ-WAO. סייט בוט: 199 ₪ + מע״מ לחודש.` (and the matching voice line, with G1 applied)

## Comedy

The voice is mostly native, dry and spoken. "Dash says the true thing plainly" works.

**Funniest 3**
1. A2 hook — `שמעתי זמזום. זה התקציב שלך.`
2. A2 30s — `כמעט מתקשר. בעצם לא.` + banner `הזבוב התחרט.`
3. A3 30s — `שאלת על לקוחות? שקט.` + banner `צרצר אחד.`
(Runners-up: `הקליק השלישי: הסתכל והלך.`, `אתה מיישר מדף. את זה לא.`, `גוגל מרים גבה.`)

**3 that die**
1. S1 banner `הקפה נפל. התיאבון נשאר.` — nonsense.
2. A3 hook 3 `הדוח הזה הפוך. כמו המספרים?` — the reader has to work to get it.
3. S1 hook 3 `לקוחה עברה דרך הדלת. שוב.` — the literal Hebrew means she came in.

The joke is never on the tradesman. "אתה שקוף" and "אתה מיישר מדף" are on his side, because "שקוף" as overlooked-person slang is native and sympathetic.

## Dash's Hebrew name

Of Tamar's three, **דַּשׁוֹנִי**. The -וני ending is native affectionate (חמודוני). Reject **פְּלָאפֹונִי**: it's built on Pelephone's registered brand, so it's a legal risk. Reject bare **דַּשׁ**: without nikud it reads as ד״ש. Option for Tamar: **צִלְצוּל**, a phone named "Ring" that never rings, which carries the whole concept in one word. If it stays דשוני, the display spelling is דשוני.

## Handoffs
- Tamar: all 🟡 / 🤖 items above.
- Adam/Eitan: G3 brand pronunciation; G4 product-name convention; listen test of the nikud lines (סייט בוט, מעם, מכסה) before batch render.
- Yonatan: S3 long headline 2 and the S2/S3 review wording.
- Maya/Dana: banner visual must not mimic real OS notifications.

## Writing upgrades (for waocopy, abstract)
1. A price spoken aloud always carries its billing period. (Can't make a page worse; it's a fact.)
2. In a list of benefits for a lead-learning product, the object marked is the enquiry/job, not the customer. Keep the noun the user actually acts on.
