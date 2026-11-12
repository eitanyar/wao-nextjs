# Final round 3: ads-bot-voice-pron-test (2026-11-12)

This is the last polish. Your round-2 output is pasted below. Apply ONLY the remaining items that concern THIS file, from:
- Noa's final pass (exact replacements; binding on Hebrew)
- Dror's round-2 re-check (binding on facts)
- Yonatan's round-2 sign-off (binding on anchors and terms)

All three are pasted below, and Adam's rulings at the top of each override everything else. YELLOW items are your call. Keep every other line byte-for-byte. Return the COMPLETE output in the same JSON shape, plus "changes": [{"id": "...", "why": "..."}].

## ROUND 2 OUTPUT
Angle: n/a — this is a TTS pronunciation test, not a conversion slot; round 2 is surgery on the flagged items plus Noa's requested additions, inside Adam's rulings.

```json
{
  "angle": "n/a: pronunciation test",
  "items": [
    {
      "n": 1,
      "target": "Google company name in Hebrew letters (concept 1), plain",
      "voice": "אתמול חיפשתי את העסק שלי בגוגל.",
      "display": "אתמול חיפשתי את העסק שלי בגוגל.",
      "risk": "May say GO-gel or stress the second syllable instead of GOO-gul."
    },
    {
      "n": 2,
      "target": "Google (concept 1), niqqud variant on בגוגל",
      "voice": "אתמול חיפשתי את העסק שלי בְּגוּגֶל.",
      "display": "אתמול חיפשתי את העסק שלי בגוגל.",
      "risk": "Check the niqqud forces GOO-gel and does not spell out letters."
    },
    {
      "n": 3,
      "target": "Google Ads as said aloud in Israel, גוגל אדס (concept 2), plain",
      "voice": "אני משלם לגוגל אדס כל חודש.",
      "display": "אני משלם לגוגל אדס כל חודש.",
      "risk": "אדס may be read E-des or a-DES instead of ads."
    },
    {
      "n": 4,
      "target": "Google Ads (concept 2), niqqud variant on אדס",
      "voice": "אני משלם לגוגל אַדְס כל חודש.",
      "display": "אני משלם לגוגל אדס כל חודש.",
      "risk": "Check it reads ads as one short syllable, not Edess."
    },
    {
      "n": 5,
      "target": "Click singular, קליק (concept 3)",
      "voice": "קליק אחד יכול לעלות כמה שקלים.",
      "display": "קליק אחד יכול לעלות כמה שקלים.",
      "risk": "קליק may be read ka-LIK; check klik."
    },
    {
      "n": 6,
      "target": "Per click, על כל קליק (concept 3)",
      "voice": "כמה שקלים אתה משלם על כל קליק?",
      "display": "כמה שקלים אתה משלם על כל קליק?",
      "risk": "Check the per-click phrasing and klik stress inside a question."
    },
    {
      "n": 7,
      "target": "Enquiry singular, פנייה אמיתית (concept 4)",
      "voice": "אני מטפל בפנייה אמיתית בעצמי.",
      "display": "אני מטפל בפנייה אמיתית בעצמי.",
      "risk": "פנייה may be read pa-NEE-ya or pnuya; check pni-YA."
    },
    {
      "n": 8,
      "target": "Enquiries plural, פניות אמיתיות (concept 4), plain",
      "voice": "אני סופר פניות אמיתיות בסוף היום.",
      "display": "אני סופר פניות אמיתיות בסוף היום.",
      "risk": "Unvowelled פניות can flip to pnuyot (available) instead of pniyot (enquiries)."
    },
    {
      "n": 9,
      "target": "Enquiries plural (concept 4), niqqud variant on פניות",
      "voice": "אני סופר פְּנִיּוֹת אמיתיות בסוף היום.",
      "display": "אני סופר פניות אמיתיות בסוף היום.",
      "risk": "Check the niqqud forces pniyot."
    },
    {
      "n": 10,
      "target": "Click mode, מצב קליקים (concept 5)",
      "voice": "אני עובד במצב קליקים כבר שבוע.",
      "display": "אני עובד במצב קליקים כבר שבוע.",
      "risk": "Check matzav klikim reads as one phrase."
    },
    {
      "n": 11,
      "target": "Enquiry mode, מצב פניות (concept 5)",
      "voice": "אני בחרתי לעבוד במצב פניות מההתחלה.",
      "display": "אני בחרתי לעבוד במצב פניות מההתחלה.",
      "risk": "פניות inside the mode name may flip to pnuyot."
    },
    {
      "n": 12,
      "target": "Click price ceiling per trade, תקרה למחיר הקליק (concept 6), plain",
      "voice": "אני שם תקרה למחיר הקליק, לפי המקצוע שלי.",
      "display": "אני שם תקרה למחיר הקליק, לפי המקצוע שלי.",
      "risk": "שם may read sham (there) instead of sam (put)."
    },
    {
      "n": 13,
      "target": "Click price ceiling (concept 6), niqqud variant on שם",
      "voice": "אני שָׂם תקרה למחיר הקליק, לפי המקצוע שלי.",
      "display": "אני שם תקרה למחיר הקליק, לפי המקצוע שלי.",
      "risk": "Check שָׂם reads sam (put), not sham (there)."
    },
    {
      "n": 14,
      "target": "Condition line with digits and maqaf prefixes, כ־15 פניות ב־60 יום (concept 7), display form read aloud",
      "voice": "התנאי הוא כ־15 פניות אמיתיות ב־60 יום, ולפחות שתי עבודות שנסגרו.",
      "display": "התנאי הוא כ־15 פניות אמיתיות ב־60 יום, ולפחות שתי עבודות שנסגרו.",
      "risk": "כ־15 needs ke-khamesh-ESRE before feminine פניות; ב־60 needs be-shishim YOM; check no English fifteen or sixty."
    },
    {
      "n": 15,
      "target": "Condition line spelled out as words, בערך חמש עשרה … בשישים יום (concept 7), voice form",
      "voice": "התנאי הוא בערך חמש עשרה פניות אמיתיות בשישים יום, ולפחות שתי עבודות שנסגרו.",
      "display": "התנאי הוא בערך חמש עשרה פניות אמיתיות בשישים יום, ולפחות שתי עבודות שנסגרו.",
      "risk": "Check khamesh-ESRE agrees with feminine פניות; shishim YOM, not yamim; ve-lif-KHOT shtei avodot she-nis-ge-RU."
    },
    {
      "n": 16,
      "target": "Two to three months, חודשיים עד שלושה (concept 8)",
      "voice": "בדרך כלל זה לוקח חודשיים עד שלושה.",
      "display": "בדרך כלל זה לוקח חודשיים עד שלושה.",
      "risk": "Dual חודשיים may read khodashim or mis-stress; check khod-sha-YIM."
    },
    {
      "n": 17,
      "target": "A search someone typed (concept 9)",
      "voice": "אני רואה איזה חיפוש מישהו הקליד.",
      "display": "אני רואה איזה חיפוש מישהו הקליד.",
      "risk": "הקליד may mis-stress; check hik-LID."
    },
    {
      "n": 18,
      "target": "Negative keywords as blocked words, חוסם מילים (concept 10)",
      "voice": "אני חוסם מילים שלא קשורות לעבודה שלי.",
      "display": "אני חוסם מילים שלא קשורות לעבודה שלי.",
      "risk": "חוסם may read KHO-sem instead of kho-SEM."
    },
    {
      "n": 19,
      "target": "Ad headline, כותרת (concept 11)",
      "voice": "אני מחליף את הכותרת של המודעה.",
      "display": "אני מחליף את הכותרת של המודעה.",
      "risk": "כותרת may mis-stress; check ko-TE-ret."
    },
    {
      "n": 20,
      "target": "Ad description, תיאור (concept 11)",
      "voice": "אני כותב תיאור קצר לכל מודעה.",
      "display": "אני כותב תיאור קצר לכל מודעה.",
      "risk": "תיאור may read TI-ur instead of te-UR."
    },
    {
      "n": 21,
      "target": "Landing page, דף נחיתה (concept 12)",
      "voice": "בניתי דף נחיתה חדש לעסק שלי.",
      "display": "בניתי דף נחיתה חדש לעסק שלי.",
      "risk": "Check daf ne-khi-TA reads as one term, not word-by-word."
    },
    {
      "n": 22,
      "target": "WhatsApp in Hebrew letters (concept 13), plain",
      "voice": "הלקוח שולח לי וואטסאפ אחרי העבודה.",
      "display": "הלקוח שולח לי וואטסאפ אחרי העבודה.",
      "risk": "Double vav may read ve-VAT-sapp or WATS-app; check VAHT-sapp."
    },
    {
      "n": 23,
      "target": "WhatsApp (concept 13), niqqud variant on וואטסאפ",
      "voice": "הלקוח שולח לי וואַטְסְאַפּ אחרי העבודה.",
      "display": "הלקוח שולח לי וואטסאפ אחרי העבודה.",
      "risk": "Check the niqqud forces VAHT-sapp with no extra ve-."
    },
    {
      "n": 24,
      "target": "Tap on the call button, לחיצה על כפתור החיוג (concept 13)",
      "voice": "הלקוח נותן לחיצה על כפתור החיוג.",
      "display": "הלקוח נותן לחיצה על כפתור החיוג.",
      "risk": "החיוג may misread; check ha-khi-YUG and le-khi-TSA."
    },
    {
      "n": 25,
      "target": "Fake clicks, קליקים מזויפים (concept 14)",
      "voice": "ראיתי קליקים מזויפים בחשבון הישן שלי.",
      "display": "ראיתי קליקים מזויפים בחשבון הישן שלי.",
      "risk": "מזויפים may read me-ZU-yafim; check me-zu-ya-FIM."
    },
    {
      "n": 26,
      "target": "Daily budget, תקציב יומי (concept 15)",
      "voice": "אני קובע תקציב יומי קטן מאוד.",
      "display": "אני קובע תקציב יומי קטן מאוד.",
      "risk": "תקציב may stress TAK-tsiv instead of tak-TSIV."
    },
    {
      "n": 27,
      "target": "Monthly budget, תקציב חודשי (concept 15)",
      "voice": "אני סוגר תקציב חודשי קבוע מראש.",
      "display": "אני סוגר תקציב חודשי קבוע מראש.",
      "risk": "Same tak-TSIV stress check in the monthly phrase."
    },
    {
      "n": 28,
      "target": "Quality Score, Hebrew term ציון איכות (concept 16)",
      "voice": "אני בודק את ציון האיכות שלי.",
      "display": "אני בודק את ציון האיכות שלי.",
      "risk": "Check tsi-YUN ei-KHUT reads naturally."
    },
    {
      "n": 29,
      "target": "Quality Score, English term inside a Hebrew sentence (concept 16)",
      "voice": "אני בודק את ה-Quality Score שלי.",
      "display": "אני בודק את ה-Quality Score שלי.",
      "risk": "Latin words may be skipped, spelled out, or read with Hebrew phonetics; check the ה- prefix."
    },
    {
      "n": 30,
      "target": "Ad Rank, Hebrew term דירוג המודעה (concept 16)",
      "voice": "אני מסתכל על דירוג המודעה שלי.",
      "display": "אני מסתכל על דירוג המודעה שלי.",
      "risk": "דירוג may mis-stress; check di-RUG."
    },
    {
      "n": 31,
      "target": "Ad Rank, English term inside a Hebrew sentence (concept 16)",
      "voice": "אני מסתכל על ה-Ad Rank שלי.",
      "display": "אני מסתכל על ה-Ad Rank שלי.",
      "risk": "Latin Ad Rank may be read as Hebrew letters or skipped; check the ה- prefix."
    },
    {
      "n": 32,
      "target": "Full closing line with VAT, 249 ₪ + מע״מ (concept 17), [excited] directly before the brand",
      "voice": "[excited] WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
      "display": "WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.",
      "risk": "249 ₪ may read English or the wrong plural; + may read plus or ploos; מע״מ may spell mem-ayin-mem instead of ma'am; check the [excited] tag and WAO."
    },
    {
      "n": 33,
      "target": "Marking an enquiry as real, מסמן כאמיתית (concept 18)",
      "voice": "אני מסמן את הפנייה הזאת כאמיתית.",
      "display": "אני מסמן את הפנייה הזאת כאמיתית.",
      "risk": "כאמיתית may mis-stress; check ka-a-mi-TIT."
    },
    {
      "n": 34,
      "target": "Marking an enquiry as junk, פניית זבל (concept 18)",
      "voice": "אני מסמן פניית זבל ומוחק אותה.",
      "display": "אני מסמן פניית זבל ומוחק אותה.",
      "risk": "Construct פניית may read pa-NI-yat; check pni-YAT and ZE-vel."
    },
    {
      "n": 35,
      "target": "Google Ads (concept 2), niqqud variant אֶדְס (Noa's alternative to אַדְס)",
      "voice": "אני משלם לגוגל אֶדְס כל חודש.",
      "display": "אני משלם לגוגל אדס כל חודש.",
      "risk": "Check אֶדְס reads ads as one short syllable, not E-dess; compare with n4 (אַדְס)."
    },
    {
      "n": 36,
      "target": "Google aims at real enquiries, לפניות + masculine מכוון (E8-04)",
      "voice": "גוגל מכוון לפניות אמיתיות בלבד.",
      "display": "גוגל מכוון לפניות אמיתיות בלבד.",
      "risk": "לפניות may flip to la-pnu-YOT (available) instead of la-pni-YOT (enquiries); מכוון must stay masculine."
    },
    {
      "n": 37,
      "target": "Google masculine (E8-04), niqqud variant on מְכַוֵּן",
      "voice": "גוגל מְכַוֵּן לפניות אמיתיות בלבד.",
      "display": "גוגל מכוון לפניות אמיתיות בלבד.",
      "risk": "Check the niqqud forces masculine me-kha-VEN, not feminine me-kha-VE-net."
    },
    {
      "n": 38,
      "target": "Closed/fixed, סָגוּר (concept 15)",
      "voice": "התקציב החודשי סָגוּר מראש.",
      "display": "התקציב החודשי סגור מראש.",
      "risk": "סָגוּר may read SA-gur; check sa-GUR."
    },
    {
      "n": 39,
      "target": "That you closed, שֶׁסָּגַרְתָּ (E8-05 phrase)",
      "voice": "עבודה שֶׁסָּגַרְתָּ שווה יותר מקליק.",
      "display": "עבודה שסגרת שווה יותר מקליק.",
      "risk": "Check she-sa-GAR-ta; unvowelled שסגרת may mis-stress."
    },
    {
      "n": 40,
      "target": "Fewer than fifty times, words in voice vs digits in display (E7-03 phrase)",
      "voice": "המילה הזאת מופיעה פחות מחמישים פעם.",
      "display": "המילה הזאת מופיעה פחות מ־50 פעם.",
      "risk": "Voice: kha-mi-SHIM PA-am, not English fifty. Display: check how פחות מ־50 reads aloud."
    },
    {
      "n": 41,
      "target": "One-time, חד פעמי without maqaf in voice (E5-06/E7-07 phrase)",
      "voice": "האישור הוא חד פעמי.",
      "display": "האישור הוא חד־פעמי.",
      "risk": "Check khad pa-a-MI as two words with no maqaf pause; display keeps חד־פעמי."
    },
    {
      "n": 42,
      "target": "Tap, טאפ, with the marking labels (R02)",
      "voice": "טאפ אחד: אמיתית או זֶבֶל.",
      "display": "טאפ אחד: אמיתית או זבל.",
      "risk": "טאפ may read tah-PA; check tap. זֶבֶל check ZE-vel. Test only — production default is לחיצה per Adam's click/tap split."
    },
    {
      "n": 43,
      "target": "Selector joke, סלקטור and האגודל (R02 option, product named first)",
      "voice": "עם בוט מודעות, האגודל שלך סלקטור.",
      "display": "עם בוט מודעות, האגודל שלך סלקטור.",
      "risk": "Check se-lek-TOR and ha-a-GU-dal; the joke lands dry."
    },
    {
      "n": 44,
      "target": "Tourists, תיירים (R01/ad_6, Eitan's ear call)",
      "voice": "חלק מהקליקים הם תיירים, לא לקוחות.",
      "display": "חלק מהקליקים הם תיירים, לא לקוחות.",
      "risk": "Check ta-ya-RIM; Eitan's ear decides against the fallback."
    },
    {
      "n": 45,
      "target": "Curious browsers, סקרנים (fallback for תיירים)",
      "voice": "חלק מהקליקים הם סקרנים, לא לקוחות.",
      "display": "חלק מהקליקים הם סקרנים, לא לקוחות.",
      "risk": "Check sak-ra-NIM; compare with n44 for Eitan's ear."
    },
    {
      "n": 46,
      "target": "Demo, דמו (q15)",
      "voice": "בדמו אני רואה תוכנית מלאה על עסק לדוגמה.",
      "display": "בדמו אני רואה תוכנית מלאה על עסק לדוגמה.",
      "risk": "דמו may read de-MO; check DE-mo."
    },
    {
      "n": 47,
      "target": "Differentiator, מייחד",
      "voice": "אני כותב מה שמייחד את העסק שלי.",
      "display": "אני כותב מה שמייחד את העסק שלי.",
      "risk": "מייחד may read MEY-khad; check me-ya-KHED."
    },
    {
      "n": 48,
      "target": "Switch, מתג, in the designed-to frame (phase 2)",
      "voice": "המתג בין המצבים מתוכנן לפעול לבד.",
      "display": "המתג בין המצבים מתוכנן לפעול לבד.",
      "risk": "מתג may read MA-teg; check ME-teg. מתוכנן check me-tukh-NAN."
    },
    {
      "n": 49,
      "target": "Log/diary, יומן (neutral vehicle; the log beat is HOLD)",
      "voice": "אני כותב ביומן כל ערב.",
      "display": "אני כותב ביומן כל ערב.",
      "risk": "יומן may read YU-man; check yo-MAN."
    },
    {
      "n": 50,
      "target": "Lower the price, להוזיל (E4-05)",
      "voice": "מודעה טובה יכולה להוזיל את מחיר הקליק.",
      "display": "מודעה טובה יכולה להוזיל את מחיר הקליק.",
      "risk": "להוזיל may read le-HO-zil; check le-ho-ZIL."
    },
    {
      "n": 51,
      "target": "On/lit, דולק (neutral vehicle; the filter beat is HOLD)",
      "voice": "אני בודק שהאור דולק.",
      "display": "אני בודק שהאור דולק.",
      "risk": "דולק may read DO-lek; check do-LEK."
    },
    {
      "n": 52,
      "target": "Spoken gershayim quotes inside a headline (concept 11)",
      "voice": "הכותרת אומרת ״שירות מקצועי, מחיר הוגן״.",
      "display": "הכותרת אומרת ״שירות מקצועי, מחיר הוגן״.",
      "risk": "Check ״…״ reads as a quoted phrase with natural intonation, not spelled-out gershayim."
    },
    {
      "n": 53,
      "target": "Tag test [dry] on v4 (compare with [deadpan])",
      "voice": "[dry] קליק הוא לא לקוח.",
      "display": "קליק הוא לא לקוח.",
      "risk": "[dry] is unproven on v4; if it fails or reads cheerful, production uses [deadpan]."
    },
    {
      "n": 54,
      "target": "Tag test [deadpan] on v4 (compare with [dry])",
      "voice": "[deadpan] קליק הוא לא לקוח.",
      "display": "קליק הוא לא לקוח.",
      "risk": "Check flat, dry delivery; the proven fallback if [dry] fails."
    },
    {
      "n": 55,
      "target": "[excited] WAO mid-line (concept 17), compare with n32 and n56",
      "voice": "בוט מודעות של [excited] WAO.",
      "display": "בוט מודעות של WAO.",
      "risk": "Check the tag lifts WAO mid-sentence without breaking the line."
    },
    {
      "n": 56,
      "target": "[excited] WAO on its own line (concept 17), compare with n32 and n55",
      "voice": "בוט מודעות של\n[excited] WAO.",
      "display": "בוט מודעות של WAO.",
      "risk": "Check the tag applies across the line break; WAO stays excited, not reset."
    }
  ],
  "changes": [
    {
      "id": "n2",
      "why": "Noa's niqqud fix בְּגּוּגְל → בְּגוּגֶל, voice only; risk note updated GOO-gul → GOO-gel to match the segol."
    },
    {
      "id": "n7",
      "why": "Adam: no 'every enquiry' claims. Dropped כל from the owner-voice vehicle; the singular pni-YA test is unchanged. Owner-voice, not a coverage claim — aligned to be safe."
    },
    {
      "id": "n12",
      "why": "Adam: per-trade CPC cap, no ₪15 number. Removed 15 ₪, kept the שם sam/sham test, added לפי המקצוע שלי per Dror's 'set for your trade' intent. 8 words."
    },
    {
      "id": "n13",
      "why": "Same ruling as n12; niqqud kept on שָׂם, number removed from voice, display and risk."
    },
    {
      "id": "n14",
      "why": "Noa's digit-form replacement adopted, extended with ולפחות שתי עבודות שנסגרו: the line states the condition, and Adam requires the full plus-form everywhere (spec: 15 + at least 2). Digit form kept in voice deliberately — this item tests reading the display form aloud; n15 is the word form. 11 words."
    },
    {
      "id": "n15",
      "why": "Noa's word-form replacement adopted, extended with the same mandated closed-jobs clause so the spoken condition is complete. 13 words, within the voiced cap."
    },
    {
      "id": "n16",
      "why": "Noa's exact replacement; target shortened to match (dropped the duplicated חודשים). Dual khod-sha-YIM risk unchanged. 7 words."
    },
    {
      "id": "n35",
      "why": "Added Noa's low-priority גוגל אֶדְס variant; n3/n4 stay byte-for-byte."
    },
    {
      "id": "n36",
      "why": "Added לפניות on Noa's fixed E8-04 line, Google masculine per Adam."
    },
    {
      "id": "n37",
      "why": "Added מְכַוֵּן niqqud variant; checks the masculine form replaces the feminine מכוונת."
    },
    {
      "id": "n38",
      "why": "Added סָגוּר on the fixed-budget fact (matches n27)."
    },
    {
      "id": "n39",
      "why": "Added שֶׁסָּגַרְתָּ in a value line, so the condition lines keep Adam's exact שנסגרו wording while the niqqud word still gets tested."
    },
    {
      "id": "n40",
      "why": "Added פחות מחמישים פעם as words in voice vs digits in display, per Noa's E7-03 fix and the numbers-as-words upgrade."
    },
    {
      "id": "n41",
      "why": "Added חד פעמי without maqaf in voice (Noa E5-06/E7-07); display keeps חד־פעמי. Matches Dror's one-time-approval fact."
    },
    {
      "id": "n42",
      "why": "Added טאפ with the feminine אמיתית label (Noa R02). Test only: production default stays לחיצה per Adam's click/tap ruling; טאפ is my call pending the ear test."
    },
    {
      "id": "n43",
      "why": "Added the R02 selector option, product named first per Adam; covers סלקטור and האגודל in one line."
    },
    {
      "id": "n44",
      "why": "Added תיירים for Eitan's ear call."
    },
    {
      "id": "n45",
      "why": "Added the סקרנים fallback so Eitan can compare side by side."
    },
    {
      "id": "n46",
      "why": "Added דמו on Dror's q15 fact: a complete plan on a sample business."
    },
    {
      "id": "n47",
      "why": "Added מייחד test."
    },
    {
      "id": "n48",
      "why": "Added מתג inside the designed-to frame (מתוכנן) per Adam's phase-2 ruling; no present-tense switch claim."
    },
    {
      "id": "n49",
      "why": "Added יומן on a neutral diary vehicle because the switch/log beat is HOLD; no HOLD claim is voiced."
    },
    {
      "id": "n50",
      "why": "Added להוזיל on the Quality-Score mechanism, with Noa's מחיר הקליק form."
    },
    {
      "id": "n51",
      "why": "Added דולק on a neutral vehicle because the filter-check beat (E5-05) is HOLD."
    },
    {
      "id": "n52",
      "why": "Added spoken gershayim quotes with Noa's exact sample headline."
    },
    {
      "id": "n53",
      "why": "Added [dry] tag test; unproven on v4, compared against [deadpan]."
    },
    {
      "id": "n54",
      "why": "Added [deadpan] as the proven fallback comparison."
    },
    {
      "id": "n55",
      "why": "Added [excited] WAO mid-line, compared with n32 (line start) and n56 (own line)."
    },
    {
      "id": "n56",
      "why": "Added [excited] WAO on its own line per Noa's tag-placement option."
    },
    {
      "id": "dropped-addition: חמישה עשר שקל לקליק",
      "why": "Noa requested it, but Adam's no-₪15 ruling overrides: after the per-trade fix no script line says fifteen shekel per click, so the figure stays out of the suite. Number-words coverage lives in n15 and n40."
    },
    {
      "id": "n1, n3–n6, n8–n11, n17–n34",
      "why": "Kept byte-for-byte; no flagged item or ruling touches them. n32 already has the [excited] space Noa required, and its price matches the confirmed ₪249 + VAT."
    }
  ]
}
```

→ Noa to re-proof the changed and added strings. → Eitan's ear on תיירים/סקרנים, טאפ and [dry] once the suite runs on v4.

## NOA FINAL
# Noa: final pass on round 2 (2026-11-12)

Saved by Adam; replacement strings are copied verbatim. All earlier RED/ORANGE items are resolved. Remaining FIXes are below.

## Adam's rulings
- **q09 "חינם":** option A. Drop `חינם, ` from the list (true now and after the phrase change).
- **A3:** use Noa's line `[calm] עם בוט מודעות, פניות נוחתות ברשימה אחת בטלפון שלך, ואתה מסמן מה אמיתי.` It also satisfies Dror's "from your page" concern, since no "all" is implied. Tamar may add "מהדף" if it still reads naturally by ear.
- **Shared elements:** the "בקצרה" box and the glossary fixes come ONLY from the article file. The how-it-works file's `article_elements` and `glossary_fixes` are discarded.
- **The A1 voice line "המודעות עוברות"** stays as approved earlier: the scripts file holds Noa's final A1 lines.
- **The how-it-works ppc_cta_branch href** goes to DEMO_HREF to match its "דמו חינם" label.

## Explainer A
- E2-05 (both): `ומהיום הראשון יש רשימת חסימות: חינם, קורסים, יד שנייה, מחפשי עבודה.` → `ומהיום הראשון יש רשימת חסימות: קורסים, יד שנייה, מחפשי עבודה.` E2-01 screen: "free" → "free download".
- E2-07 (both): `גוגל חוסם רק מילים שברשימה, לא דומות. הבוט בוחר כל מילה בכוונה.` → `גוגל חוסם רק את המילים שברשימה, לא מילים דומות. הבוט בוחר כל מילה בכוונה.`
- E4-08 (voice only): `ולכל פנייה רשום הקליק שהביא אותה.` → `ולכל פנייה רָשׁוּם הקליק שהביא אותה.`
- E3-05 (Dror, low priority): `כל כותרת מציגה יתרון אחר` makes the "every headline" claim. Soften it.

## Explainer B
- E7-04 (voice + display): `הוא חוסם רק את הניסוח הזה — לא נושא שלם ולא מילה בודדת.` → `הוא חוסם רק את הניסוח הזה, לא נושא שלם ולא מילה בודדת.`
- E8-06:
  - voice `בתקציב המינימום זה בדרך כלל חודשיים עד שלושה, ולא כל עסק מגיע לזה.` → `בתקציב המינימום אנחנו מעריכים חודשיים עד שלושה, ולא כל עסק מגיע לזה.`
  - display `בתקציב המינימום זה בדרך כלל חודשיים־שלושה, ולא כל עסק מגיע לזה.` → `בתקציב המינימום אנחנו מעריכים חודשיים־שלושה, ולא כל עסק מגיע לזה.`
  - screen card `בתקציב המינימום: בדרך כלל חודשיים־שלושה` → `הערכה: חודשיים־שלושה בתקציב המינימום`
- E8-07 (both): `אם לא, הוא נשאר במצב קליקים וממשיך לעבוד.` → `אם לא, הקמפיין נשאר במצב קליקים וממשיך לעבוד.`
- E6-03 (both): `אתה מסמן כל אחת בלחיצה: אמיתית או זבל.` → `אתה מסמן כל אחת בלחיצה: אמיתית או לא.`; title `התפקיד שלך: אמיתית או זבל` → `התפקיד שלך: אמיתית או לא`
- E6-02 (both): `טופס, לחיצה על כפתור החיוג, או וואטסאפ.` → `טופס, לחיצה על כפתור החיוג או וואטסאפ.`
- E7-01 (Dror, soft): "sees in Google's report which searches brought the clicks".

## 30s / 15s
- ad_30 R07 and ad_15 R03 (voice): `[excited] WAO. בוט מודעות: 249 ₪ + מע״מ לחודש.` → `[excited] WAO. בוט מודעות, מאתיים ארבעים ותשעה שקל פלוס מע״מ לחודש.` Display unchanged. The WAO tag waits on Eitan's tone test.
- YELLOW: "זבל" in R03 / ad_15 R02 vs the screen's "לא אמיתית" (Tamar).

## A3
See Adam's ruling (both cuts). Display: `עם בוט מודעות, פניות נוחתות ברשימה אחת בטלפון שלך, ואתה מסמן מה אמיתי.`

## Situation shorts
- S1-05 / S2-05 / S3-05 alt closings:
  - voice `[excited] WAO. בוט מודעות — הדמו פתוח על עסק לדוגמה.` → `[excited] WAO. בוט מודעות. דמו חינם, על עסק לדוגמה.`
  - display `WAO. בוט מודעות — הדמו פתוח על עסק לדוגמה` → `WAO. בוט מודעות. דמו חינם, על עסק לדוגמה`
  - caption `הדמו פתוח` → `דמו חינם`
- S1-03 (both): `אתה מסמן לא אמיתית, והיא לא נספרת.` → `אתה מסמן לא אמיתית, והפנייה לא נספרת.`
- YELLOW S1-02 direction: `דרושים וקורס? חסומים מראש.`

## FAQ
- q08 q: `מה המודעה שלי תגיד, ולאן מי שלוחץ מגיע?` → `מה המודעה שלי תגיד, ולאן מגיע מי שמקליק עליה?`
- q08 a: `מי שלוחץ מגיע לדף נחיתה` → `מי שמקליק מגיע לדף נחיתה`
- q11 q: `מישהו יכול ללחוץ לי על המודעה כל היום.` → `מישהו יכול להקליק לי על המודעה כל היום.`
- q09: `ופנייה שסימנת כזבל לא נספרת כתוצאה.` → `ופנייה שסימנת ״לא אמיתית״ לא נספרת כתוצאה.`
- q12: `לחיצה אחת מסמנת פנייה כאמיתית או כזבל,` → `לחיצה אחת מסמנת פנייה: אמיתית או לא,`
- q09 (a + short): `באישור החד פעמי שלך` → `באישור החד־פעמי שלך`
- q03: `מעל הסכום שאתה קבעת` → `מעל הסכום שקבעת`
- q14:
  - a `בתקציב המינימלי זה בדרך כלל לוקח חודשיים עד שלושה.` → `בתקציב המינימלי אנחנו מעריכים חודשיים עד שלושה.`
  - short `ובתקציב המינימלי זה בדרך כלל חודשיים־שלושה.` → `ובתקציב המינימלי אנחנו מעריכים חודשיים־שלושה.`
  - Dror: the "we then show you the budget" line is the planned frame (phase 2).
- q09: drop `חינם, ` (option A).
- q06: `המערכת מסתכלת על כמה אנשים באמת מחפשים את השירות שלך ומה עולה קליק בביטויים האלה.` → `המערכת בודקת את ההערכות של גוגל: כמה אנשים מחפשים את השירות שלך ומה עולה קליק בביטויים האלה.`; short `נפח חיפוש אמיתי` → `את הערכות החיפוש של גוגל`
- q01: `אנחנו בודקים ביקוש אמיתי ומחירי קליקים לפני ההשקה` → `אנחנו בודקים את הביקוש ואת מחירי הקליקים לפני ההשקה`. Dror: "the only thing the account counts AS A RESULT is an enquiry you marked real."
- q07 (Dror, soft): "at the minimum budget, splitting it across every service leaves each too few clicks to learn what works".

## How-it-works page
- Answer block: `העיקרון שלו: כל שקל עובד בתוך תקרה, וכל פעולה אוטומטית מחכה לאישור שלך.` → `העיקרון שלו: כל שקל עובד בתוך תקרה, והבוט פועל רק אחרי שאישרת.`
- Step 6 H2: `התקציב שלך נשמר בתקרות, וכל פעולה מחכה לאישור שלך` → `התקציב שלך נשמר בתקרות, והבוט פועל רק אחרי שאישרת`
- Step 5: `שיעור הקליקים הצפוי, התאמת המודעה, חוויית העמוד.` → `שיעור הקליקים הצפוי, רלוונטיות המודעה וחוויית המשתמש בדף הנחיתה.`
- Step 7: `החסימה היא על אותו ניסוח חיפוש בלבד, ואף פעם לא בחסימה גורפת.` → `החסימה היא רק על אותו ניסוח חיפוש, אף פעם לא על נושא שלם.`
- Dror:
  - Intro: "AS A RESULT".
  - Step 3 ¶2: "and, with your one-time approval, adds wasteful searches it finds later (step 7)".
  - Step 6: add Google's invalid-click billing fact.
  - Step 7 ¶2: no "each/every".
  - Step 8 ¶2 tail and you_see: "the plan is that you'll see the budget…".
- YELLOW: Step 5 `שלושה כפתורים: טופס` → `שלוש דרכים לפנות אליך: טופס, חיוג, וואטסאפ`; keep one "principle" line (answer block vs intro); step 7's analogy mixes "בראש" and "פנקס".

## Nurture (PARKED; copy only)
- M1: `גוגל לא יחסום אותם בשבילך.` → `גוגל לא יחסום את החיפושים האלה בשבילך.`
- M3: `יכולים להוזיל את הקליק.` → `יכולים להוזיל את מחיר הקליק.`; `ושם השירות בכותרת.` → `ושם השירות מופיע בכותרת.`
- M5: cut `אתה סופר פניות שאישרת בעצמך. `
- sender_footer: `WAO, {{company_address}}. ליצירת קשר: {{contact_link}}` → `שולח: WAO, {{company_address}}. ליצירת קשר: {{contact_link}}`
- YELLOW: M1 and M5 share an ending; M5 subject direction `אצל בוט מודעות, הפניות מהדף…`; M4 `גם אם תנהל את הקמפיין לבד`.

## Quality Score article
- Box row 2: `כן — זה המכרז` → `כן, הוא מה שמכריע`
- Row 3 and FAQ 4: `משוב על מגוון הטקסטים והקשר שלהם למילות המפתח` → `משוב על מגוון הטקסטים ועד כמה הם קשורים למילות המפתח`
- FAQ 5: `למשל ״לבד״, אם אתה לא עובד ככה.` → `למשל ״קורס״, אם אתה לא מלמד את המקצוע.`
- S5 bullet 1: `קבוצת מילות מפתח אחת לכל שירות` → `קבוצת מודעות אחת לכל שירות`; FAQ 6: `כל שירות בקבוצת מילות מפתח משלו` → `כל שירות בקבוצת מודעות משלו`
- Glossary 334: `הקשר החיפוש והנכסים.` → `הקשר החיפוש וההשפעה הצפויה של נכסי המודעה.`
- Glossary 329: `שמשווה את איכות המודעה שלך למפרסמים אחרים` → `שמשווה את איכות המודעה שלך לזו של מפרסמים אחרים`; `יכולים להוזיל קליקים` → `יכולים להוזיל את מחיר הקליק`
- Yonatan A1: Ad Strength = `חוזק המודעה` everywhere (H2 head `חוזק המודעה: …`), scale "מנמוך עד מצוין". Dror's optimization-score note and sources line. Yonatan A2: the CTA text must not be `איך בוט מודעות עובד` / `פרסום בגוגל`; use a demo-led label (href /google-ads).
- YELLOW: `במילים שלך:` → `בתכל׳ס:`; `הרחבות` means nothing to the owner.

## Pronunciation test
- Add the production lines: the price in words; `אתה מסמן לא אמיתית, והפנייה לא נספרת.`; the A3 line; הַקּוּפָּה. Swap n34 (`פניית זבל ומוחק אותה`) for the לא אמיתית line; n24 `נותן לחיצה` → `לוחץ`.
- Round-5 risk list (Noa): WAO with [excited] at line start, mid-line and on its own line; גוגל/בְּגוּגֶל; גוגל אדס/אֶדְס; Quality Score; Ad Rank; וואטסאפ; קליק; פנייה; פְּנִיּוֹת; לפניות; מצב קליקים/פניות; כפתור החיוג; כאמיתית; לא אמיתית; זֶבֶל; נִסְפֶּרֶת; הַקּוּפָּה; שָׂם; סָגוּר; חָסוּם; רָשׁוּם; מְרַכֵּז; מְכַוֵּן; שֶׁסָּגַרְתָּ; שנסגרו; מתג; מתוכנן; יומן; דולק; כבוי; מערבב; מייחד; להוזיל; חוסם; מחפשי עבודה; הַדּוּחַ; וּכמה; numbers as words (חמש עשרה, שישים, שתי, חמישים, חמישה, חודשיים עד שלושה, מאתיים ארבעים ותשעה שקל פלוס מע״מ); חד פעמי; יד שנייה; דמו חינם; spoken quotes; תיירים vs סקרנים; [dry] vs [deadpan]; avoid ותק in voice.

## Leads-page subtitles (Adam adds; Tamar → Noa)
- src/app/(app)/leads/page.tsx:30: `סמן ליד איכותי, ועדכן הכנסה כשסוגרים עסקה — זה מאמן את גוגל לשלוח לידים טובים יותר.` must use the new labels (אמיתית / לא אמיתית) and drop the false "trains Google" claim.
- src/app/(product)/client/leads/page.tsx:44: `…סמן ליד איכותי, ועדכן כשסגרת עסקה.` must use the new labels.

## Writing upgrades proposed (Adam decides)
1. After a rewrite changes a subject or number, re-check every later pronoun that referred to it.
2. In voiced lines, a pronoun's antecedent sits in the same short and is the nearest noun of matching gender.
3. After a word swap, re-read the rest of the clause.
4. In voiced lines, a verb that's also a common noun gets niqqud or is replaced (this replaces batch A #3).
5. A shared element is authored in exactly one deliverable.

## DROR ROUND 2
# Dror: round-2 fact re-check (2026-11-12)

Saved by Adam. Verdicts: SHIP — real-30s-story, situation-shorts, nurture (still parked), voice-pron-test. FIX — explainer A, explainer B, FAQ, how-it-works page, Quality Score article, A3 ear fix.

## FIX intents (English; Tamar writes the Hebrew)
- **Explainer A, E2-05:** drop the bare חינם from the blocked list; keep job seekers, courses, second hand, and what you don't do.
- **Explainer B:**
  - E8-06: "we estimate two to three months for a typical trade at the minimum budget, and not every business gets there".
  - E7-01 (soft): "sees in Google's report which searches brought the clicks".
- **FAQ:**
  - q14: "we estimate…"; "the plan is to then show you the budget that would get you there" (phase 2, N4).
  - q01: "the only thing the account counts AS A RESULT is an enquiry you marked real" (secondary actions incl. ad calls are now recorded).
  - q06: "Google's estimate of how many people search" (fix facts_used too).
  - q09: drop bare חינם.
  - q07 (soft): "at the minimum budget, splitting it across every service leaves each too few clicks to learn what works".
- **How-it-works page:**
  - Answer block: "automatic actions run only after your one-time approval".
  - Intro: add "as a result".
  - Step 3 ¶2: "and, with your one-time approval, adds wasteful searches it finds later (step 7)".
  - Step 6: add "Google filters the invalid clicks it detects out of your reports and your bill" (42995).
  - Step 7 ¶2: "an enquiry you marked real goes back to Google, tied to the click that brought it" (no "each/every").
  - Step 8 ¶2 tail and you_see: "the plan is that you'll see the budget…" (phase 2).
  - The article_elements / glossary blocks in this file are IGNORED (Yonatan); the article file is the only source.
- **Quality Score article:**
  - Ad Strength = חוזק המודעה (Google's Hebrew term) everywhere; scale "מנמוך עד מצוין".
  - Box, Ad Rank cell: "yes, it's the value the auction compares".
  - Optimization Score note: "Optimization score (0–100%) is Google's estimate of how well the account is set up to perform, by Google's own recommendations. Applying or dismissing one changes it. Google says Quality Score doesn't use it, and it says nothing about your ad versus competitors." (closes B4(iii))
  - Sources line: 6167118, 1722122, 9921843, 9061546, 6297, 2453972, 7684791.
  - Glossary/course 980: "Google doesn't publish a number of seconds…".
- **A3 ear fix:** "the ads bot gathers the enquiries FROM YOUR PAGE into one list on your phone, and you mark what's real" (both cuts).

## Product items (→ engineer, via Adam)
- Add both spellings יד שנייה / יד שניה to the live negatives.
- Free-intent phrase negatives instead of bare חינם, incl. ב- forms: הורדה בחינם, להוריד בחינם, קורס בחינם, מדריך בחינם, תוכנה בחינם, אפליקציה בחינם (+ non-ב forms), phrase match. Never block bare חינם, הצעת מחיר (בחינם), בדיקה/ייעוץ חינם. Align intent-dictionaries.ts:30. The phrase list is Dror's; Noa proofs the spelling before the engineer applies it.
- Confirm the live negatives list is safe to record for the E2-05 screen.

Sources: Google Help 6297, 9921843, 9061546, 6167118 (en+iw), plus the batch A/B lists. Publish-day re-read of every Google statement in the page and the article.

## YONATAN ROUND 2
# Yonatan: round-2 anchor sign-off (2026-11-12)

Saved by Adam from Yonatan's hand-back.

## How-it-works page: PASS
- **H1** `איך בוט מודעות עובד: שמונה צעדים מהחיפוש ועד הפנייה`; **title** `איך בוט מודעות עובד: 8 צעדים מהחיפוש בגוגל ועד הפנייה` + template `‏ | WAO`. Product-name swap confirmed.
- **Hub mechanism → page:** anchor `איך בוט מודעות עובד` (reserved for /google-ads/how-it-works only).
- **Step 5 → article:** `ציון איכות` → /knowledge/google-ads-quality-score.
- **Closing → hub:** `פרסום בגוגל` → /google-ads, once.
- **Closing button:** `דמו חינם על עסק לדוגמה` → DEMO_HREF.
- **Schema:** Breadcrumb דף הבית › פרסום בגוגל › איך זה עובד; WebPage about /google-ads#service; no HowTo, FAQPage or Offer; sitemap entry; SiloNav "פרסום בגוגל" silo (hub + 2 spokes). Meta: option 1.
- **Housekeeping:** this file's `article_elements` and `glossary_fixes` blocks are IGNORED. The article file is the only source for the article, and Noa/Dror pick ONE glossary-fix draft before the engineer applies B5.
- **Maya:** check how `WAO (Ads Bot)` renders in the answer block (.tsx, no renderMixed).

## Quality Score article: CONDITIONS
Slug, H1, metaTitle (with the literal `‏ | WAO`; page.tsx renders it as absolute), titleShort, summary, B3, B4 (i), (ii), (iv), B5 (glossaryTerms off), B6 and B7 all PASS.
- **A1:** Ad Strength's Hebrew term is `חוזק המודעה` (Google Help 9921843 iw: "מדד חוזק המודעה"; labels נמוך / ממוצע / טוב / מצוין). Replace "עוצמת מודעה" everywhere (section 4 H2 and definition, box row, FAQ 4). Approved H2 head: `חוזק המודעה: פתק מהעורך, לא ציון במכרז` (the wording after the colon may change; the head term stays). Tamar → Noa.
- **A2:** the CTA button text must NOT be `איך בוט מודעות עובד` or `פרסום בגוגל`. The href stays /google-ads. Use a demo-led label. Tamar → Noa.
- **A3:** the breadcrumb follows the template: `ראשי › מאגר ידע › ציון איכות ודירוג מודעה` (engineer; no code change).
- **A4:** the sources line must link all 4 topics. Dror adds Ad Strength (9921843) and negative keywords (2453972), and sources the Optimization Score note against Help 9061546 ("ציון האופטימיזציה", 0–100%: how well the account settings support its performance potential). Dror → Tamar if the wording changes.
- **B8** (not blocking): DataForSEO volume/AIO check later.
- **Publish day:** Dror re-reads every Google statement; updatedDate = publish day.
