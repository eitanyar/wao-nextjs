# Noa — Dash video scripts r4, blind X/Y comparison + final candidate (2026-11-12)

Inputs: `blind-X.json`, `blind-Y.json` (scratchpad). Brief: `docs/copy/briefs/video-dash-scripts-r4-eyes-closed-2026-11-12.md`. I did not open the blind key, any r4 file or the waocopy logs.
Output: `/tmp/claude-1000/-home-eitanya-wao/b54f02ca-de18-44f0-a601-52c8604ea2cd/scratchpad/final-candidate.json` (Y plus the fixes below).

Hero test: N/A. This is a video script, not a marketing page. The eyes-closed test per episode replaces it.

## Verdict: Y wins

| Ep | X | Y | Why |
|---|---|---|---|
| A1 | 6 | 8.5 | Y says the plain fact the way he'd say it ("you pay for every click", "you paid for three clicks, not one ring"). X repeats "the money goes out" and "no enquiries" until they blur. |
| A2 | 5.5 | 8 | Y keeps the jokes in words: a click "looks innocent", the clicks "are finishing off your budget", "click, click, click. Not one ring." X goes flat ("unnecessary clicks take the budget again") and has a translated word order in hook 3. |
| A3 | 5 | 8 | The r3 lines already worked by ear ("a shiny report, customer? none", "graphs go up, customers don't"), and Y kept them. X rewrote them and lost the punch. "The clicks get compliments" is a calque and reads oddly. |
| S1 | 6.5 | 8 | Y speaks to him ("she didn't find you", "on Google you don't exist", "they go to the competitor"). It names the real loss and keeps "every service", the positioning anchor. X's "we" is consistent, but it uses "find us" four times. |
| S2 | 5 | 8.5 | "Google has no ears" is a verbal joke and it survives with eyes closed. Y keeps it and sets it up ("you hear the thanks, Google doesn't"). X deleted the episode's best joke. |
| S3 | 6.5 | 7.5 | Y's opener "every place names a different trade" is concrete. X's "the details don't add up" is abstract. X's hook 3 is the better standalone line, so I took it (see below). |
| **Overall** | **5.75** | **8.1** | |

Brief compliance:
- **X broke the price display.** In 18 `display` lines it replaced `249 ₪ + מע״מ לחודש` / `199 ₪ + מע״מ לחודש` with the price spelled out in words.
- **X stripped the approved niqqud from the spoken price** and wrote the VAT acronym with gershayim inside `voice`. Round 1 fixed exactly that risk.
- **Y kept the price, the closing structure and the display convention intact.**
- **Neither version made a forbidden claim.** No results, no call counts, no credit amount, no clients, no builder framing. Reviews stay at "we help customers leave one".
- **Y's one compliance slip:** it wrote the brand as its post-swap TTS spelling instead of the plain form. Fixed.

Strongest reasons for Y:
1. Every changed line names the money or work fact in his words, so it lands on first hearing.
2. It kept the r3 lines that already worked by ear instead of rewriting for the sake of change.
3. Its deadpan comes from the situation, so it survives without the picture ("looks innocent", "you hear the thanks, Google doesn't", "click, click, click").
4. Direct singular-male address ("you paid", "on Google you don't exist") sells harder than X's "we".
5. The price voice/display convention is untouched. X damaged it in 36 places.

Line taken from the loser: **S3 hooks[2]** from X (`הלקוח לא מבין מה אתה עושה. אוי.`). As a standalone hook, Y's "the customer describes a third trade" has no first and second trade, so it fails with eyes closed.

## Fixes applied to the final candidate (old → new, voice unless noted)

Fixes 1, 2, 4, 5 and 6 add male-form niqqud or swap a two-way word. 6 and 8 also change display.

1. 🟠 TTS (A1 hooks[0], script_30[0], script_15[0]; A2 hooks[1]): `עולה כסף` → `עוֹלֶה כסף`. Without vowels it can be read as the feminine or "goes up" form. (4 lines)
2. 🟠 TTS gender (A2 hooks[2]): `גומרים לך` → `גומרים לְךָ`.
3. 🟠 TTS gender (S1 hooks[0], script_30[0], script_15[0]): `לא מצאה אותך` → `לא מצאה אוֹתְךָ`. (3 lines)
4. 🟠 TTS gender (S1 script_30[1], script_15[1]): `עוברים לידך` → `עוברים לְיָדְךָ`. (2 lines)
5. 🟠 TTS gender (S1 script_30[4]; S2 script_30[4], script_15[3]): `שלך` → `שֶׁלְּךָ`. (3 lines)
6. 🟠 TTS two-way word (A3 script_30[3], script_15[2]; voice + display): `הטלפון שקט` / `טלפון שקט` → `הטלפון שותק` / `טלפון שותק`. The adjective can be read as the noun "silence". (2 lines)
7. 🔴 Eyes-closed (S3 hooks[2]; voice + display): `הלקוח מתאר מקצוע שלישי. אוי.` → `הלקוח לא מבין מה אתה עושה. אוי.` (taken from X)
8. 🟠 Eyes-closed + TTS (S3 script_15[2]; voice + display): `שלושה סיפורים. בלי אמון.` → `שלושה סיפורים. אף אחד לא מאמין.` The old line is abstract, and the trust noun has a second reading without vowels.
9. 🟠 Plain-form rule (all 12 closing voice lines): `איתן מוואו.` → `איתן מ-WAO.` `מוואו` is the lexicon's TTS output written back into copy, which the lexicon forbids. The plain form matches the display and the brief. (12 lines)

Total: 9 fixes across 29 lines. `changes` was rewritten to match the final text: 57 entries, including the new lines and corrected brand notes. `screen`, `tag_why`, titles and the order of keys are untouched. Every tag still matches its line.

Style notes for Tamar (🟡, not applied):
- S3 `אתה מיישר מדף. את זה לא.`: only half-clear with eyes closed. "This" refers back to the mismatch list, so it works in the 30s cut and would fail as a standalone line. It's fine where it is. Don't promote it to a hook.
- A1 uses `הכסף יורד על קליקים` in both hook 3 and 15s line 2. These are separate cuts, so it's acceptable. A third use would read as a template.

## Eyes-closed check per episode (final candidate)

- **A1: PASS.** Every line is money, clicks and a silent phone. No meter, no coins.
- **A2: PASS.** No flies or jar in the voice. Blocking clicks is a real thing he has tried.
- **A3: PASS.** "Shiny report", "graphs go up", "a celebration over clicks". The listener doesn't need the picture. "Which line is a customer?" follows "a shiny report" in the same cut, so the report gives it its referent.
- **S1: PASS.** The ghost van is gone from the voice. She searched, didn't find you and went to someone else.
- **S2: PASS.** No jar, no stars. Happy customers, no Google reviews, and Google has no ears, set up by "you hear the thanks".
- **S3: PASS.** Hook 3 fixed. The level and the bubble are only on screen. Note for Tamar: the shelf line works only in context.

## Word-card list (listen-test, then add to `data/voice/pronunciation-lexicon.json`)

1. `מ-WAO` with the hyphen. The lexicon resolves it to `מ-וואו`, but the A1 sample was heard as `מוואו` with no hyphen. Confirm the hyphen adds no pause and doesn't make the voice say the letter name. If it does, have the lexicon drop the hyphen. That's a lexicon fix for Eitan-Dev, not a copy change.
2. `עוֹלֶה` (oleh, "costs").
3. `אוֹתְךָ` (otkha).
4. `לְיָדְךָ` (leyadkha).
5. `שֶׁלְּךָ` (shelkha).
6. `לְךָ` (lekha).

Items 2–6 are author-vowelized, so the checker reports them as info only. They have not been heard yet.

Not word-card items: `voice-check.mjs` will flag the mem-initial words `מישהו`, `מבריק`, `מקצוע`, `מיישר`, `מתבלבל`, `מחמאות`, `מרוצים` and `מיזוג` as "unvowelized prefix cluster". In these words the mem is part of the root, not a prefix, and each has one everyday reading. These are false positives.

## Handoffs
- **Adam / Eitan:** approve the final candidate as text, then listen-test word cards 1–6 before batch render.
- **Eitan-Dev:** word card 1 (hyphen handling for prefix + brand), and lexicon entries for 2–6 after the listen test.
- **Tamar:** the two 🟡 notes above.

## Writing upgrades
One PROPOSED craft rule, added to `docs/copy/writing-upgrades.md` under "Proposed rules". It merges into the existing spoken-voice craft rule, so the count stays 35.
