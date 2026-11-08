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

## 19. voiceRules (Tamar M2a.4 voice review, for M2a.5)

Source: Tamar's voice review of the 16 saved M2a.4 eval runs (`scratch/m2a4/eval/`). These lists and rules cover voice, not facts. They never authorise a claim; the section 2–18 fact gates still apply to every string here, including the CTA labels in 19.4.

Field scope used below:
- **Owner-voice fields**: `heroHeadline`, `heroSubheadline`, `trustBarItems`, `aboutBlurb`, `aboutPageHeadline`, `aboutPageBody`, `serviceDetails[].description`, `guaranteeBlock`, `responseTimeBadge`, `scarcityLine`, `formHeadline`, `stickyBarLine`.
- **Never checked by section 19**: `reviewFeatured` and `reviewContext` (the customer's words), `serviceItems` and `serviceDetails[].name` (pinned labels), `servicesHeadline`, `faqHeadline`.
- **Page**: one `===` block of a run (one route).

Note on quotes: as in sections 14–18, the English notes put Hebrew examples in ASCII quotes, and JSON uses ASCII quotes as syntax. No Hebrew string here contains an ASCII quote.

### 19.1 genericAdjectiveTokens (hard gate)

These are empty quality words: each claims quality without saying what the owner physically does. A hit in any owner-voice field rejects the page and triggers a regeneration. No owner fact authorises them, because the problem is the voice, not the claim. Before matching, mask the owner's `businessName` so a business called, say, "פתרונות אינסטלציה" never hits.

Two lists, two match rules:
- `genericAdjectiveWords`: whole word. No Hebrew letter may follow. Before the word, only the prefix letters ו, ה, ב, ל, ש, כ may appear, in any combination ("והמקצועי", "ביסודיות", "שמקצועית"). Every inflection is listed, because matching is whole-word. "מתמחה", "מדויק" and singular "פתרון" are deliberately absent. "אני מתמחה באיתור נזילות" names a real specialism, "איתור מדויק של מקור הנזילה" is a real method, and "הסבר על הבעיה והפתרון" is plain Hebrew. Their overuse in about headlines is covered by prompt rule P3.
- `genericAdjectivePhrases`: plain substring.

Noa (QA): before matching, also mask every `genericAdjectiveExemptPhrases` entry, the same way as `businessName`. "ניקוי יסודי" is the trade's name for a service level (a full clean, as opposed to a filter rinse). It is how customers search for it, and it says what is done. On the M2a.4 copy it is 8 of the 33 word hits (ac-repair-1 to -4, cleaning descriptions). The credential phrases are fact wording (training, certification, insurance), not quality claims. Tamar may veto "ניקוי יסודי"; if she does, drop that entry and the gate rejects those 8.

~~~json
{
  "genericAdjectiveExemptPhrases": ["ניקוי יסודי", "תעודה מקצועית", "הכשרה מקצועית", "השתלמות מקצועית", "ביטוח אחריות מקצועית"]
}
~~~

~~~json
{
  "genericAdjectiveWords": ["מקצועי", "מקצועית", "מקצועיים", "מקצועיות", "יסודי", "יסודית", "יסודיים", "יסודיות", "מיטבי", "מיטבית", "מיטביים", "מיטביות", "איכותי", "איכותית", "איכותיים", "איכותיות", "מומחה", "מומחית", "מומחים", "מומחיות", "מומחי", "פתרונות"]
}
~~~

~~~json
{
  "genericAdjectivePhrases": ["ניסיון רב", "ניסיון עשיר", "רב ניסיון", "ניסיון של שנים", "שנים של ניסיון", "שקיפות מלאה", "ציוד מתקדם", "טכנולוגיה מתקדמת", "המתאים ביותר", "הטוב ביותר", "הטובים ביותר", "ברמה הגבוהה", "ברמה גבוהה", "באיכות גבוהה", "בלי קיצורי דרך", "ללא קיצורי דרך", "בלי פשרות", "ללא פשרות"]
}
~~~

On the M2a.4 evidence these flag, among others: "מומחה במיזוג אוויר" (ac-repair-3 cleaning, about headline), "ניסיון רב בתיקון מזגנים" (ac-repair-3 home, about headline), "פתרונות אינסטלציה בשטח" (hebrew-plumber-1 and -2 home, about headline), "ביצועי קירור מיטביים" (ac-repair-3 repair, service details), "התקנה מקצועית" (ac-repair-1 and -3), "וניסיון של שנים בשטח" (electrician-1 panel page), "שקיפות מלאה מהשלב הראשון" (electrician-3 panel page) and "בציוד מתקדם" (plumber-1 home).

### 19.2 badIdiomTokens (meaning and spelling errors)

Each entry has the matched tokens, the match rule, what the model meant, the plain native replacement (for the prompt only; the engineer never auto-replaces), and its type:
- `gate`: reject and regenerate.
- `spellingFix`: a gate as well. Still reject and regenerate, never auto-replace, because the words around it (e.g. a feminine adjective) would keep the wrong agreement.
- `promptOnly`: no gate; the rule goes in the generation prompt.

Owner-voice fields only.

Correction to my M2a.4 review: I flagged "שובק חיים" too hard. Saying an appliance died ("המזגן שבק חיים", past tense) is common, native Israeli slang and is fine. Only the present participle used as an adjective ("מזגן שובק חיים") sounds stilted. That is why the entry is prompt-only, not a gate.

~~~json
{
  "badIdiomTokens": [
    {"id": "wont_recover", "tokens": ["לא יחזור לעצמו", "לא חוזר לעצמו", "לא תחזור לעצמה", "לא חוזרת לעצמה"], "match": "substring", "meant": "will not break again", "replacement": "לא יתקלקל שוב", "replacementFeminine": "לא תתקלקל שוב", "type": "gate"},
    {"id": "noun_and_forget", "tokens": ["ריסוס ושכחת", "ניקוי ושכחת", "מילוי ושכחת", "התקנה ושכחת"], "match": "substring", "meant": "does a quick surface job and leaves", "replacement": "לא מרסס והולך", "type": "gate"},
    {"id": "attributive_died", "tokens": ["שובק חיים"], "match": "substring", "meant": "an appliance that dies", "replacement": "מזגן שמת אחרי חודש", "type": "promptOnly"},
    {"id": "coils_spelling", "tokens": ["סלילות"], "match": "whole word; prefixes ו, ה, ב, ל in any combination", "meant": "coils", "replacement": "סלילים", "type": "spellingFix"},
    {"id": "sent_home", "tokens": ["שולחים אותך הביתה", "שולח אותך הביתה"], "match": "substring", "meant": "the other technician does the minimum and leaves (the customer is already at home)", "replacement": "ממלאים גז והולכים", "type": "gate"},
    {"id": "backed_by_calque", "tokens": ["מגובה באחריות", "מגובים באחריות", "מגובות באחריות"], "match": "substring", "meant": "comes with a warranty (calque of backed by)", "replacement": "עם אחריות", "type": "gate"}
  ]
}
~~~

The `sent_home` replacement is the AC wording. For other trades the prompt rule is the same idea: the other technician does the minimum and leaves.

The `noun_and_forget` replacement is the AC-cleaning wording. For the other tokens the prompt rule is the same pattern: the present-tense verb of that job, followed by "והולך". Never use "מרסס" on a page that is not about spraying.

### 19.3 signatureWordTokens (hard gate, count per page)

Each group is one signature phrase together with its spelling variants. Count non-overlapping plain-substring hits, longest variant first, across all owner-voice fields of one page. Add up the hits of every variant in a group. If any group's total is above 1, the page fails.

The hyphen and space variants of "שורה־שורה" ("שורה-שורה" with an ASCII hyphen, "שורה שורה" with a space) are there for matching only. They are never authored, never shown to the generator as examples, and never inserted into the prompt. Authored copy and the prompt always use the maqaf form (U+05BE).

A second check uses no Hebrew: if two pages of the same run have byte-identical `heroHeadline` strings, or byte-identical `heroHeadline` text before the first "?" or em-dash, the later page fails.

~~~json
{
  "signatureWordTokens": {
    "exactly": ["בדיוק"],
    "lineByLine": ["שורה אחר שורה", "שורה־שורה", "שורה-שורה", "שורה שורה"],
    "noSurprises": ["בלי הפתעות", "ללא הפתעות", "אין הפתעות", "בלי הפתעה"],
    "tiles": ["לשבור אריחים", "שבירת אריחים", "אריחים שבורים"],
    "fromTheRoot": ["מהשורש"],
    "noMess": ["בלי בלגן", "ללא בלגן"],
    "transparent": ["שקיפות", "שקופה", "שקופות", "שקוף"],
    "wrongPlace": ["במקום הלא נכון"]
  }
}
~~~

On the M2a.4 evidence: in electrician-1, "בדיוק" appears 9 times and "בלי הפתעות" up to 3 times on one page. In ac-repair-3, "מהשורש" appears up to 4 times on the repair page. In plumber-2, "לשבור אריחים" appears on all four pages, including water-heater install. Only pages where a phrase appears more than once fail.

### 19.4 Service stage and CTA labels (emergency vs planned)

The stage is chosen per page from the service slug, using lower-case substring match on the slug.
- A slug that matches both lists is `emergency`.
- A slug that matches neither list is `neutral`.
- The homepage takes the stage of `serviceItems[0]`.

On the M2a.4 slugs this gives:
- `emergency`: ac-repair, leak-detection, leak-repair, drain-unblocking, emergency-electrician.
- `planned`: ac-installation, ac-cleaning, water-heater-install, solar-heater-installation, electrical-panel-upgrade, ev-charger-install.

~~~json
{
  "emergencyServiceKinds": ["emergency", "urgent", "leak", "drain", "unblock", "blockage", "clog", "burst", "flood", "sewer", "outage", "short-circuit", "lockout", "locksmith", "repair"],
  "plannedServiceKinds": ["install", "upgrade", "replace", "cleaning", "maintenance", "renovation", "charger", "inspection"]
}
~~~

CTA label sets:
- `heroCta`: the generator picks one label from the page's stage set.
- `formHeadline.labels`: safe on any page of that stage.
- `formHeadline.examples`: prompt few-shot patterns taken word for word from the M2a.4 eval copy. Each example still passes through the fact gates (arrival in section 8, same-day in section 14).
- `formHeadlineFallback`: allowed only when no stage label or service-specific line fits.

Which labels are new: the planned `heroCta` labels and "ספר לי מה אתה מתכנן" are new. Tamar authored them for M2a.5, and Noa proofed them in M2a.4. Every other string is verbatim from the eval copy.

The `heroCta` button places a call, so every heroCta label is a call action.

~~~json
{
  "ctaLabelSets": {
    "emergency": {
      "heroCta": ["התקשר עכשיו"],
      "formHeadline": {
        "labels": ["ספר לי מה קרה", "ספר לי מה קורה"],
        "examples": ["ספר לי מה קרה עם המזגן", "ספר לי על הנזילה", "סתימה? דבר איתי", "ספר לי מה קרה, אני בדרך"]
      }
    },
    "planned": {
      "heroCta": ["התקשר להצעת מחיר", "דבר איתי על העבודה"],
      "formHeadline": {
        "labels": ["ספר לי מה צריך", "ספר לי מה אתה מתכנן"],
        "examples": ["רוצה התקנה? דבר איתי", "רוצה דוד חדש?", "רוצה הצעה לעמדת טעינה?", "רוצה ניקוי עמוק למזגן?"]
      }
    },
    "neutral": {
      "heroCta": ["התקשר עכשיו"],
      "formHeadline": {"labels": ["ספר לי מה צריך"], "examples": []}
    },
    "formHeadlineFallback": "השאר פרטים ואחזור אליך"
  }
}
~~~

`stickyActionTokens` is a hard gate on `stickyBarLine`, using plain substring match. The line must contain at least one of these tokens, and it must not be byte-identical to the page's `heroCta`.
- "אני בדרך" counts as an action, and it is also an arrival promise (section 8), so `responseTime` must authorise it.
- On the M2a.4 evidence this rejects lines such as "תיקון מזגנים היום", "מגיע באותו יום", "איתור נזילות בחולון" and "יוסי — אינסטלטור מורשה".
- It also rejects "התקשר עכשיו" when it duplicates the hero CTA (hebrew-plumber-1 and -2, solar page).

~~~json
{
  "stickyActionTokens": ["התקשר", "חייג", "דבר איתי", "ספר לי", "השאר פרטים", "כתוב לי", "אני בדרך"]
}
~~~

### 19.5 bareVerbSentenceOpeners (hard gate in two fields only)

A narrow list that should not overfire.
- **Fields**: `aboutBlurb` and `aboutPageBody` only. In headlines, subheadlines, trust bar, badges and sticky bar, short subject-less lines are normal ad style; there it is prompt rule P4 only.
- **Sentence start**: the start of the field, or the first word after ". ", "? " or "! ". Not after a comma, colon or em-dash.
- **Match**: the first word equals a list entry exactly (no prefix letters, no Hebrew letter after it).
- **Hit**: only when the previous sentence in the same field does not contain a `subjectCarryTokens` word as a whole word. The word may take the prefixes ו, ש or כש ("שאני", "כשאני", "ואני"). So "12 שנה שאני פותח סתימות. עובד בלי לשבור אריחים" passes (plumber-4). "אני מגיע באותו יום. מאתר תקלות…" is natural spoken Hebrew and passes. "עובד בתל אביב…" as the first sentence fails, and so does "בעל רישיון מס׳ 4821. מגיע מהר".
- **Exclusion**: a sentence that starts with a `bareVerbExclusions` phrase is never a hit. "מגיע לך מזגן שעובד" means "you deserve". In "בודק חשמל", "מתקן חשמלי" and "מתקן הטעינה" the first word is a noun (an electrical inspector; an installation or device).
- **Homographs removed (Noa QA)**: "מבצע" (a promotion), "עונה" (a season, common on AC pages) and "מפרט" (a specification) were dropped from the list. Their noun reading is natural at the start of a sentence in these trades. Low-risk homographs stay: "מאתר" (from a site), "מחבר" (a connector), "מתמחה" (an intern) and "מתחיל" (a beginner).
- **Known misses (prompt-only)**: a subject-less verb after a fronted phrase ("לפני כל עבודה מסביר…") and bare-noun fragments ("בעל רישיון.", "חשמלאי מורשה.").

~~~json
{
  "bareVerbSentenceOpeners": ["מגיע", "מאתר", "מסביר", "מתקן", "מתקין", "עובד", "נותן", "מפרק", "מנקה", "בודק", "מטפל", "פותח", "מחליף", "משדרג", "מחבר", "מוודא", "מציג", "מתמחה", "מסיים", "מתחיל", "דואג", "שומר", "משאיר"],
  "subjectCarryTokens": ["אני", "שמי"],
  "bareVerbExclusions": ["מגיע לך", "בודק חשמל", "מתקן חשמלי", "מתקן הטעינה"]
}
~~~

### 19.6 Prompt rules P1–P7 (ready to paste into the generation prompt)

The engineer pastes these as English. Where a rule needs a Hebrew word, it refers to a list above by name so the loader can insert the list.

- **P1 — One differentiator, said once.** State the owner's main differentiator in full once per page, in the hero or the about body, and at most once more anywhere else on that page. Every other field must add something new: a different owner fact, a consequence for the customer, or a concrete step of how the job is done. Use the differentiator on a service page only if it naturally applies to that service; if it doesn't, lead with the pain specific to that service. Each `signatureWordTokens` group may appear at most once per page. Never reuse a hero headline, or its opening hook, on another page of the same site.
- **P2 — One scene, then the difference.** Open `aboutPageBody` with one short, concrete scene of the customer's problem: a moment the reader recognises from his own home, with a specific detail (the time, the room, what broke, what happened a month later). Then show how this owner handles that moment differently. Don't restate the blurb, the trust bar or the guarantee. Each owner fact may appear at most twice per page, and the about body must contain at least one sentence that appears nowhere else on the page.
- **Example of the move (a description, not text to copy):** the strongest about body in the eval named the most common failure the owner sees from other technicians in his trade (a quick fix that skips the real cause, so the problem returns within weeks). It then said in one sentence what he does instead, and tied that to his warranty. Do the same with the failure specific to this owner's trade and his real facts. Write new words every time and never reuse the example's wording.
- **P3 — Say what the hands do.** Never use the words in `genericAdjectiveWords` or `genericAdjectivePhrases`. Replace each quality claim with the concrete physical action behind it: what the owner opens, checks, measures, takes apart, shows the customer or cleans up. Write in verbs, not chains of nouns. Every sentence should sound like the tradesman talking to a homeowner standing next to him. An about-page headline must say something only this owner could claim; a service category plus a quality adjective doesn't count.
- **P4 — Keep the subject.** In `aboutBlurb` and `aboutPageBody`, a sentence that starts with a first-person verb must contain "אני", unless the previous sentence already did. Never open a paragraph with a bare-noun fragment such as a licence or title alone. Telegraphic fragments are fine only in the trust bar, the sticky bar, badges and short subheadlines.
- **P5 — Native idioms only.** Use only idioms a native Israeli tradesman would say out loud. Never turn an English catchphrase into a Hebrew noun phrase. Check that each idiom's literal meaning matches the claim you intend. Prefer a plain verb to a clever coinage. Never use the tokens in `badIdiomTokens`; use the listed replacement idea instead.
- **P6 — Match the reader's stage.** Use the page's stage from 19.4. Emergency page: the hero names the moment of the crisis, the hero CTA is a call, and the form headline invites the customer to describe what happened. Planned page: the hero names the fear of a bad choice or a hidden cost, and the CTA and form ask for a quote or a description of the job. If an emergency page has no speed fact, lead with the pain and what the owner does when he arrives, not with a pricing tagline. Choose CTA labels from `ctaLabelSets`. Use `formHeadlineFallback` only when nothing more specific fits. The sticky bar always contains an action from `stickyActionTokens` and never repeats the hero CTA.
- **P7 — Trust bar = checkable facts.** Each trust-bar item must be a fact a customer could verify: years in the trade, licence number, warranty length, rating, or service area with the cities joined by "ו". Never put the service name, a vague adjective or a work-style claim there. Three strong items beat four items with filler.

Gates vs prompt-only in section 19:
- **Hard gates**: `genericAdjectiveWords`, `genericAdjectivePhrases`, the `gate` and `spellingFix` entries of `badIdiomTokens`, `signatureWordTokens`, the duplicate-hero check, `stickyActionTokens` with the not-equal-to-heroCta check, and `bareVerbSentenceOpeners` in `aboutBlurb`/`aboutPageBody` only.
- **Prompt-only**: P2, P3's verbs-not-nouns and about-headline rules, P4 outside the two gated fields, P5 in general, the `attributive_died` entry, the P6 stage logic (the stage lists only choose which CTA set the prompt offers), and P7.
