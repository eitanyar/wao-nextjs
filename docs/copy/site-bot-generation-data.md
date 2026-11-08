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
Prefix note for pluralAddressTokens (Noa M2a.3, applies to the existing config tokens and to the additions):
- Imperatives that are also past-tense third-person plural ("התקשרו", "ספרו", "דברו", "צרו", "שלחו", "השאירו", "קבלו", "הזמינו", "חייגו") and "בואו": allow a vav prefix only. Never allow shin ("לקוחות שהתקשרו" means "customers who called").
- Feminine-singular imperatives ("התקשרי", "השאירי", "שלחי"): allow a vav prefix only.
- Second-person-plural future forms ("תקבלו", "תתקשרו", "תשאירו", "תגידו", "תספרו", "תדעו", "תראו", "תזמינו", "תשאירי"): allow the full prefix set (vav, shin, and kaf+shin).
- Pronoun and suffix forms ("אתם", "לכם", "שלכם", "אליכם", "אתכם", "בשבילכם", "עבורכם", "אצלכם", "מכם"): allow the full prefix set, as today.

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

## 14. sameDayTokens (Noa M2a.3)

A sentence with a same-day token is a same-day promise. With an arrival token (section 8) it is an arrival promise, which the owner's `responseTime` authorises. With one of `sameDayFinishVerbs` it is a promise to finish the job that day, which only an owner-stated same-day fix authorises (`usp`/`guarantee`, e.g. "same-day leak fixes"), and only for the service the owner named. Plain substring matching. Bare "היום" is deliberately absent (it is too broad).

~~~json
{
  "sameDayTokens": ["אותו יום", "אותו היום", "עוד היום", "מגיע היום", "הגעה היום", "מסיים היום", "מתקן היום", "מתקין היום", "פותח היום", "— היום"],
  "sameDayFinishVerbs": ["מסיים", "סיום", "מתקן", "תיקון", "מתקין", "התקנה", "פותח", "פותר", "סוגר"]
}
~~~

## 15. priceLockTokens (Noa M2a.3)

A price-lock claim (the price will not change, nothing gets added later) is rejected unless the owner stated it (e.g. fixed price, final price, price won't change, no extras). A customer's review never authorises it (`reviewQuote` stays excluded). Reflecting the fear ("בלי הפתעות בקיר") stays allowed. Plain substring matching.

~~~json
{
  "priceLockTokens": ["המחיר לא משתנה", "המחיר לא ישתנה", "המחיר נשאר", "בלי שינויי מחיר", "ללא שינויי מחיר", "אין שינויי מחיר", "בלי שינוי מחיר", "אין שינוי מחיר", "שינויים במחיר", "שינוי במחיר", "מחיר סופי", "מחיר קבוע", "בלי תוספות", "ללא תוספות", "אין תוספות", "תוספות מחיר", "תוספת מחיר", "בלי הפתעות במחיר", "בלי הפתעות בחשבון", "ולא בחשבון", "בלי כפל מחיר", "בלי הכפלת מחיר", "בשקל אחד"]
}
~~~

## 16. serviceAreaWideningTokens (Noa M2a.4)

A widening phrase makes the service area larger than the places the owner named. Place names are the owner's cities (`targetLocation` and `specificCities`, each also with a Hebrew prefix letter) plus the region tokens below. Before matching, mask every owner-named city string, so a region token inside a city name ("הוד השרון", "רמת השרון") is never a hit.

Four lists, four match rules:
- `serviceAreaTailTokens`: whole word (no Hebrew letter on either side; the token already carries its vav). A hit only when it comes right after a place name, with one space or a comma and a space between them ("ראשון לציון והסביבה", "ברחובות והסביבה"). After any other word it is not a hit ("האריחים והסביבה" means the tiles' surroundings).
- `serviceAreaHeadTokens`: whole word. It may take the prefix letters ו, ב, ל, מ, ש, כ in any combination, but never ה ("השארת האזור נקי" is the work area). A hit only when the next word is a place name. After "סמוך" and "קרוב" the place takes a lamed ("סמוך לחולון"); after the other heads it follows directly ("אזור ראשון לציון", "באזור המרכז", "ליד רחובות"). "סביב" is deliberately absent ("סביב האריחים").
- `serviceAreaRegionTokens`: the prefix letters ו, ב, ל, מ, ש, כ may precede in any combination ("והמרכז", "ובשרון"), and no Hebrew letter may follow ("המרכזי" is not a hit). A hit anywhere in the copy. Bare "במרכז", "בצפון" and "בדרום" are deliberately absent ("במרכז העיר", "בצפון העיר").
- `serviceAreaNearbyTokens`: plain substring, a hit anywhere. The ישובים forms are spelled without the double yod on purpose, so one token matches both "ישובים" and "יישובים".

Authorisation: only an explicitly named place or wording authorises a widening phrase. A region token is allowed only if the owner named that region. A tail, head or nearby phrase is allowed only if the owner's own area answer already says it ("and surroundings", "the X area", "nearby towns", "nationwide"), and only for the place the owner attached it to. A travel distance (`travelBoundary`, e.g. "Up to 15 km from Rehovot") never authorises any of them. "Surroundings" has no edge, so a reader 30 km away reads it as covering his town. The copy may state the distance itself as a number (e.g. "עד 15 ק״מ מרחובות"); it may not turn it into "והסביבה". `responseTime` and `reviewQuote` never authorise a wider area.

On the M2a.3 evidence this flags 15 of the 19 script hits: all 12 "והסביבה" cases except plumber-1's "האריחים והסביבה", plus "אזור ראשון לציון", "באזור המרכז" (twice) and "באזור תל אביב והמרכז". The 4 non-hits are "האריחים והסביבה", "סביב האריחים" (twice) and "השארת האזור נקי".

~~~json
{
  "serviceAreaTailTokens": ["והסביבה", "ובסביבה", "וסביבה", "וסביבתה", "ובסביבתה", "וסביבותיה", "והסביבות", "והאזור", "ובאזור", "ומסביב", "ומחוצה לה"]
}
~~~

~~~json
{
  "serviceAreaHeadTokens": ["אזור", "סביבת", "בקרבת", "ליד", "סמוך", "קרוב"]
}
~~~

~~~json
{
  "serviceAreaRegionTokens": ["המרכז", "מרכז הארץ", "גוש דן", "השרון", "בשרון", "השפלה", "בשפלה", "הצפון", "צפון הארץ", "הדרום", "דרום הארץ", "הגליל", "בגליל", "הנגב", "בנגב", "הקריות", "בקריות", "יהודה ושומרון"]
}
~~~

~~~json
{
  "serviceAreaNearbyTokens": ["ערים הסמוכות", "ערים סמוכות", "ערים השכנות", "ערים שכנות", "ישובים הסמוכים", "ישובים סמוכים", "ישובים השכנים", "ישובים שכנים", "ערי הסביבה", "ערי האזור", "ישובי הסביבה", "ישובי האזור", "כל הארץ", "רחבי הארץ", "רחבי האזור", "פריסה ארצית"]
}
~~~

## 17. freeTokens (Noa M2a.4)

A free claim is always free *of something*. Each claim's scope is a class from `freeScopeNouns`, and the owner must have said "free" for that same class. A free quote does not authorise a free inspection, and the reverse holds too.

Matching:
- `freeTokens`: plain substring ("חינם" also matches "בחינם"; "חינמי" also matches "חינמית" and "חינמיים"). Exclusion: when the token is followed by "נוסף", "נוספת", "נוספים", "נוספות" or "יותר", it is not a free hit. That is no-extra-charge or price-lock territory (sections 2 and 15). So "ללא עלות נוספת" stays a `no_extra_charge` hit only, as today.
- `freeCalloutTokens`: plain substring. These are free claims whose scope is built in, and it is always `callout`.
- Scope of a `freeTokens` hit: split the sentence into clauses at period, comma, em-dash, colon, semicolon, question mark and exclamation mark. In the hit's clause, take the nearest `freeScopeNouns` entry *before* the token (Hebrew puts the noun first: "הצעת מחיר חינם"). If there is none before it, take the nearest one after it. Use longest match first, so "ביקור חוזר" is `warranty_return`, not `callout`, and "תיקון חוזר" is not `work`. "בדיק" is a stem (it matches בדיקה, בדיקת, בדיקות). "יעוץ" also matches "ייעוץ". A free hit with no scope noun in its clause ("הכול בחינם!") is rejected.

Authorisation: an owner fact (any intake field except `reviewQuote`) authorises class C only when the same clause holds both a free word and a scope noun of class C. Free words are the Hebrew `freeTokens` and `freeCalloutTokens`, or English free, for free, free of charge, at no cost, no charge, complimentary, waived, no call-out fee or no visit fee. Scope nouns are the Hebrew `freeScopeNouns`, or English quote, estimate or pricing (`quote`); call-out, visit, travel or arrival (`callout`); inspection, check, diagnosis, detection or camera (`inspection`); consultation or advice (`consultation`); return visit or re-fix (`warranty_return`); labour, work, repair, install or parts (`work`). A bare "free" with no scope in the owner's fact authorises nothing.

On the M2a.3 evidence: hebrew-plumber's `pricingNotes` is "הצעת מחיר חינם, אין דמי הגעה", which authorises `quote` and `callout`. 33 of the 34 free hits are scoped to "הצעת מחיר" or "הצעת המחיר" and pass. "כולל בדיקה מקדימה ללא עלות" (hebrew-plumber-1, solar-heater page) is scoped `inspection` and is rejected. Every "בלי / אין / ללא דמי הגעה" is `callout` and passes for this owner. For an owner who never said no call-out fee, it would be rejected.

~~~json
{
  "freeTokens": ["חינם", "חינמי", "גרטיס", "ללא עלות", "בלי עלות", "ללא כל עלות", "בלי שום עלות", "ללא תשלום", "בלי תשלום", "ללא כל תשלום", "בלי שום תשלום", "ללא חיוב", "בלי חיוב", "לא עולה כלום", "לא עולה שקל", "לא עולה לך כלום", "לא עולה לך שקל", "לא תשלם שקל", "לא תשלם כלום", "במתנה", "על חשבון הבית", "ללא תמורה"]
}
~~~

~~~json
{
  "freeCalloutTokens": ["בלי דמי הגעה", "ללא דמי הגעה", "אין דמי הגעה", "בלי דמי ביקור", "ללא דמי ביקור", "אין דמי ביקור", "בלי דמי נסיעה", "ללא דמי נסיעה", "אין דמי נסיעה"]
}
~~~

~~~json
{
  "freeScopeNouns": {
    "quote": ["הצעת מחיר", "הצעת המחיר", "הצעה", "הערכת מחיר", "אומדן", "תמחור"],
    "callout": ["הגעה", "ביקור", "נסיעה"],
    "inspection": ["בדיק", "אבחון", "איתור", "סריקה", "צילום"],
    "consultation": ["יעוץ", "התייעצות"],
    "warranty_return": ["ביקור חוזר", "תיקון חוזר", "טיפול חוזר"],
    "work": ["עבודה", "עבודת", "תיקון", "התקנה", "התקנת", "החלפה", "החלפת", "חלקים", "חלפים", "חומרים"]
  }
}
~~~

## 18. weFormRule (Noa M2a.4)

Option (b): an explicit list. A general -נו suffix rule has too many false positives in this copy, because many of them are exact homographs. They include third-person possessives ("זמנו", "ניסיונו", "רישיונו", "חשבונו") and third-plural forms of nun-final verbs ("התקינו", "הבינו", "הכינו"). Some words are the same spelling for "we" and "they" ("תיקנו", "נתנו"), and some are common words ("ממנו" is "from him", "בנו" is "his son"). The list covers the past and future we-form verbs the generator writes in trade verticals, plus formal possessive and prepositional forms that the section 10 `weTokens` list does not already cover.

Matching is the same as `weTokens`: allowPrefix true ("שהתחלנו", "וסיימנו", "כשהגענו"), and no Hebrew letter may follow. These are deliberately absent: "תיקנו" and "נתנו" (identical to "they fixed" and "they gave", as in "טכנאים קודמים לא תיקנו"), "ממנו" and "בנו" (him or his), "בנינו" (our sons), "נמצא", "נשלח", "נעשה" and "נענה" (identical to present or passive forms, as in "הטופס נשלח"), and "מאיתנו" (already caught by "איתנו" with a mem prefix). The known miss "שהתחלנו" (electrician-6, EV-charger page) is caught.

~~~json
{
  "weFormVerbs": ["התחלנו", "סיימנו", "הגענו", "התקנו", "החלפנו", "בדקנו", "פתחנו", "טיפלנו", "עבדנו", "ביצענו", "מצאנו", "איתרנו", "חיברנו", "שדרגנו", "ניקינו", "השארנו", "סגרנו", "פתרנו", "דאגנו", "הבטחנו", "הספקנו", "הצלחנו", "חזרנו", "קיבלנו", "צברנו", "הקמנו", "למדנו", "ראינו", "איטמנו", "הרכבנו", "פירקנו", "הסברנו", "המלצנו", "תיאמנו", "דיברנו", "נתקן", "נתקין", "נבדוק", "נסיים", "נתחיל", "נטפל", "נפתור", "נדאג", "נתאם", "נדבר", "נחליף", "נסביר", "נוודא", "נשאיר", "ננקה", "נציע", "ניצור", "נבוא", "נעבור", "נאתר", "נחבר", "עלינו", "עבורנו", "כמונו", "לקוחותינו", "צוותנו", "ניסיוננו", "עבודתנו", "שירותינו"]
}
~~~
