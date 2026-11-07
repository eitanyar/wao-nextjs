# Site Bot generation data (Noa, language-qa, 2026-11-08)

Source for scripted copying. Byte-exact. Do not retype; copy blocks programmatically.

## 1. dayLetters (index 0 = Sunday)

~~~json
{
  "dayLetters": ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"]
}
~~~

## 2. claimTokens

Reject a token unless the owner stated the claim. Matching is plain substring matching on final copy.
`fix_time` also needs this check: a sentence that contains a pinned service label (from `siteIdentity.services[].label`) and also the token "תוך" followed by a number is a `fix_time` hit. The exception is when the sentence's verb is arrival ("מגיע", "אני שם", "אני בדרך"). Even then, an arrival time inside a heading about installation should be flagged for human review.
`license_grade`: Israeli licence grades are חשמלאי עוזר / מעשי / מוסמך / ראשי / הנדסאי / מהנדס. "מאסטר" is not an Israeli grade. Block any grade the owner did not state in Hebrew or confirm.

~~~json
{
  "claimTokens": {
    "street_address": ["ברחוב", "רח׳", "שד׳"],
    "walk_in": ["קבלת קהל", "בלי תיאום מראש", "ללא תיאום מראש", "מוזמן לקפוץ", "בלי תור"],
    "written_guarantee": ["בכתב", "כתובה", "תעודת אחריות"],
    "parts_included": ["כולל חלקים", "חלקים ועבודה", "כולל חומרים", "כולל חלפים"],
    "no_extra_charge": ["בלי חיוב נוסף", "ללא חיוב נוסף", "על חשבוני", "בלי עלות נוספת", "ללא עלות נוספת"],
    "report_included": ["דוח ממצאים", "דוח מסודר", "דוח מפורט", "כולל דוח", "דו״ח"],
    "sealing_test": ["בדיקת איטום", "איטום הגג", "בדיקת לחץ"],
    "apprenticeship_bio": ["כשוליה", "כעוזר", "התחלתי לעבוד", "בגיל", "מגיל", "למדתי את המקצוע", "עבדתי אצל"],
    "solo_operator": ["עונה בעצמי", "עובד לבד", "מגיע לבד", "אני זה שעונה", "בלי קבלני משנה", "בלי מתווכים", "אין מתווכים", "בלי מוקד", "אין מוקד", "ישירות איתי", "מענה אישי"],
    "fix_time": ["מתקן תוך", "מתקין תוך", "תיקון תוך", "התקנה תוך", "פותח תוך", "מסיים תוך", "פותר תוך"],
    "license_grade": ["מאסטר", "חשמלאי ראשי", "חשמלאי מוסמך", "חשמלאי מעשי", "הנדסאי", "מהנדס חשמל"]
  }
}
~~~

## 3. serviceLabelPins

~~~json
{
  "serviceLabelPins": {
    "leak detection": { "label": "איתור נזילות", "status": "final" },
    "water heater install": { "label": "התקנת דוד מים", "status": "final (Yonatan 2026-11-08; M1 intake asks solar/electric/gas — single type → that specific label)" }
  }
}
~~~

Note: "התקנת דוד מים" stays true to the owner's "water heater" (it covers electric, gas and solar). "התקנת דוד שמש" is narrower and only correct if the owner installs solar heaters only. Yonatan decides on search-volume grounds.

## 4. typographyRule (full replacement for TYPOGRAPHY_RULE, escape-only, zero Hebrew bytes)

~~~json
{
  "typographyRule": "TYPOGRAPHY (binding): use gershayim (\\u05F4) in Hebrew acronyms and geresh (\\u05F3) in abbreviations and borrowed sounds; never an ASCII double quote (\") or apostrophe (') inside Hebrew text. An em-dash (—) has exactly one space on each side. A Hebrew prefix letter joins a following number or Latin word with a plain hyphen (-), not a maqaf, and no spaces (\\u05D1-2024, \\u05DC-SEO). Never insert a hyphen or maqaf inside Hebrew place names (\\u05D1\\u05EA \\u05D9\\u05DD, never \\u05D1\\u05EA\\u05BE\\u05D9\\u05DD). For quoted speech use a gershayim pair (\\u05F4...\\u05F4) or rephrase without quotes; never use a geresh as a quotation mark. A range after \\u05D1\\u05D9\\u05DF is written with a prefix, not a dash (\\u05D1\\u05D9\\u05DF 08:00 \\u05DC-18:00); any other range of numbers, times or days uses an en-dash (–) with no spaces (08:00–18:00). Never use double spaces."
}
~~~

The double backslashes are intentional: after JSON.parse the value contains literal `\u05F4`-style escape text. Pasted into the TS single-quoted literal (with the apostrophe escaped as `\'`), the source file keeps zero Hebrew bytes, and the prompt the model sees contains the real characters.

## 5. contactTitle (Yonatan 2026-11-08, signed off; prefix still needs Noa QA)

Formula: `<prefix> <trade> ב<city> | <brand>`, ≤ ~60 chars, RLM before " | " only for a Latin brand; never reuses the form headline; no em-dash.

~~~json
{"contactTitlePrefix": "יצירת קשר:"}
~~~

## 6. claimTokenWordEnd (Noa 2026-11-08)

Claim tokens in this list match only when no Hebrew letter follows them (right word boundary), so "ברחוב" does not match "ברחובות" (Rehovot), "בגיל" does not match "בגילוי" and "מגיל" does not match "מגילה". All other claim tokens stay plain substring matches. `solo_operator` is authorised only by an owner fact (e.g. answer myself, personally, work alone, solo, no subcontractors).

~~~json
{
  "claimTokenWordEnd": ["ברחוב", "בגיל", "מגיל"]
}
~~~

## 7. fixTimeWithinWords and fixTimeLeadTokens (Noa 2026-11-08)

A lead token followed by optional spaces and then a digit, or a word that starts with one of the within-words, is a time promise for the `fix_time` sentence check. "כדי", "שמירה" and "שימוש" are deliberately absent ("תוך כדי", "תוך שמירה" mean "while").

~~~json
{
  "fixTimeLeadTokens": ["תוך", "בתוך"],
  "fixTimeWithinWords": ["שעה", "שעתיים", "שעות", "דקה", "דקות", "יום", "יומיים", "ימים", "שבוע", "חצי", "רבע", "כמה", "פחות מ", "שתי", "שני", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע", "עשר", "עשרים", "שלושים", "ארבעים", "חמישים", "שישים"]
}
~~~

## 8. arrivalTokens (Noa 2026-11-08, replaces the arrival list in section 2's note)

~~~json
{
  "arrivalTokens": ["מגיע", "אני שם", "אני בדרך", "הגעה", "אגיע", "אצלך"]
}
~~~

## 9. paraphraseGuard (Noa 2026-11-08)

A sentence that contains a customer stem and a speech verb is a customer-attribution hit. Speech verbs are third-person or plural only, so the owner's own "אמרתי ללקוח" or "אני ממליץ ללקוח" never hits.

~~~json
{
  "paraphraseGuard": {
    "customerStems": ["לקוח", "דייר", "בעל הבית", "בעלת הבית"],
    "speechVerbs": ["סיפר", "אומרים", "אומרת", "אמרו", "אמרה", "אמר לי", "ממליצים", "ממליצה", "המליץ", "כותבים", "כתבו", "כתבה", "מעידים", "משבחים"]
  }
}
~~~

## 10. pluralAddressTokens and weTokens (Noa 2026-11-08, additions only)

Add these to the existing lists in copyGates.config.ts. The `-י` forms are feminine singular, which is also off-rule. "פנו" and "צוות" are deliberately left out ("הלקוחות פנו אליי", "בלי צוות").
Note: every weTokens entry is `allowPrefix: true`.

~~~json
{
  "pluralAddressTokens": ["אתכם", "בשבילכם", "עבורכם", "אצלכם", "מכם", "תתקשרו", "השאירו", "תשאירו", "צרו", "שלחו", "קבלו", "תגידו", "תספרו", "תדעו", "תראו", "הזמינו", "תזמינו", "חייגו", "התקשרי", "השאירי", "שלחי", "תשאירי"],
  "weTokens": ["אנו", "לנו", "אצלנו", "איתנו", "אלינו", "אותנו", "בשבילנו", "נחזור", "נשמח", "נגיע"]
}
~~~

## 11. waoServiceTerms (Noa 2026-11-08, additions only; substring match)

~~~json
{
  "waoServiceTerms": ["דפי נחיתה", "דף נחיתה", "קידום אתרים", "בניית אתרים", "ניהול קמפיינים", "שיווק דיגיטלי", "קופירייטינג", "קידום בגוגל", "ניהול רשתות חברתיות"]
}
~~~

## 12. thermalTokens (Noa 2026-11-08, replaces the single token "תרמית")

"תרמי" also matches "תרמית" and "תרמיים" as a substring.

~~~json
{
  "thermalTokens": ["תרמי", "תרמוגרפ"]
}
~~~

## 13. templateStrings (Noa 2026-11-08, system HTML on client sites)

`formSubmitLabel` replaces the heroCta text on the lead-form submit button (the button sends the form, it does not place a call). `formThanks` replaces the form-success message (solo operator, first-person singular).

Prefix rule for template text (privacy and accessibility pages): a Hebrew prefix letter before a name or term that starts with a Latin letter or a digit takes a plain hyphen (ל-WCAG 2.0, ל-Test Owner A). Before a name that starts with a Hebrew letter, the prefix attaches directly with no hyphen (ליוסי כהן, never ל-יוסי כהן).

~~~json
{
  "templateStrings": {
    "formSubmitLabel": "שלח",
    "formThanks": "✅ תודה! אחזור אליך בהקדם."
  }
}
~~~
