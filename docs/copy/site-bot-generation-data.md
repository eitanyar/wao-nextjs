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

Which labels are new: the planned `heroCta` label and "ספר לי מה אתה מתכנן" are new. Tamar authored them for M2a.5, and Noa proofed them in M2a.4. Every other string is verbatim from the eval copy.

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
      "heroCta": ["התקשר להצעת מחיר"],
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

## 20. voiceRules M2a.6 (Tamar, from the M2a.5 voice read; rules approved by Adam)

Same field scope as section 19: owner-voice fields only, never `reviewFeatured`, `reviewContext`, `serviceItems`, `serviceDetails[].name`, `servicesHeadline` or `faqHeadline`, unless a rule names its own fields. A **run** is one generated site (home plus its service pages). Repeats across different runs are not checked; each customer only ever sees his own site.

### 20.1 Signature variants and the site-wide hero cap (hard gates)

**Additions to section 19.3.** Append these variants to the existing `signatureWordTokens` groups, and add the new group `pointByPoint`. Matching works as in section 19.3, with one exception: `tilesBreakForms` are matched as whole words (rule below). Every variant also counts toward the per-page cap: 2 for the owner's differentiator group and 1 for every other group (M2a.7; see "Per-page cap" below).

Which group each new variant belongs to:
- `lineByLine`: "כל שורה", "שורה אחרי שורה".
- `tiles`: "להרים ריצוף", "מרימים ריצוף", "לגעת באריח", plus every entry of `tilesBreakForms`. The breaking-stem forms go into `tiles` (not `wrongPlace`), so a phrase like "בלי לשבור אריחים" that matches two tiles variants counts once, not twice. "לגעת באריח" also matches "לגעת באריחים" and "לגעת באריח אחד" as a substring.
- `pointByPoint` (new group): "נקודה־נקודה", "נקודה-נקודה", "נקודה נקודה", "נקודה אחר נקודה", "נקודה אחרי נקודה", "אחד־אחד". As with "שורה־שורה", the ASCII-hyphen and space variants ("נקודה-נקודה", "נקודה נקודה") are for matching only. They are never authored, never shown to the generator as examples, and never inserted into the prompt. Authored copy and the prompt always use the maqaf (U+05BE).

`tilesBreakForms` matching:
- Whole word. The prefixes ו, ש, ה, כ, ב, ל may appear before the word in any combination ("ששוברים", "וששוברים"). No Hebrew letter may follow.
- A hit is ignored when the word right before it is in `tilesBreakExclusionsPrecedingWord`. "צינור שבור" and "צנרת שבורה" describe the leak itself, which is a valid scene. The same holds for a broken water heater or toilet ("דוד שבור", "אסלה שבורה").
- Noa (QA): compare the preceding word after stripping the prefix letters ו, ב, ל, מ, ש, כ, so "מצינור שבור" and "בצנרת שבורה" are ignored as well.
- "שבר" (a crack, as in "שבר בצינור") and "נשבר" (it broke) are deliberately absent. Both are real plumbing scene words.

~~~json
{
  "signatureWordTokenAdditions": {
    "lineByLine": ["שורה אחרי שורה", "כל שורה"],
    "tiles": ["להרים ריצוף", "מרימים ריצוף", "לגעת באריח"],
    "pointByPoint": ["נקודה אחרי נקודה", "נקודה אחר נקודה", "נקודה־נקודה", "נקודה-נקודה", "נקודה נקודה", "אחד־אחד"]
  }
}
~~~

~~~json
{
  "tilesBreakForms": ["לשבור", "שובר", "שוברים", "שבירה", "שבירת", "שבור", "שבורה", "שבורים", "ישבור", "יישברו"],
  "tilesBreakExclusionsPrecedingWord": ["צינור", "הצינור", "צינורות", "הצינורות", "צנרת", "הצנרת", "ברז", "הברז", "דוד", "הדוד", "אסלה", "האסלה"]
}
~~~

**Site-wide hero cap (hard gate, no new Hebrew).** For each `signatureWordTokens` group (section 19.3 plus the additions above), count how many of the run's pages have at least one hit of that group in `heroHeadline`. If the count is above 2, every page after the second one with a hit fails, in route order (home first). The prompt tells the model to use the owner's differentiator on the home hero and on the one service it fits best.

On the M2a.5 evidence:
- The cap fails plumber-1, -2 and -3: all four heroes in each carry `tiles`.
- It fails electrician-4: all four heroes carry `noSurprises`.
- It fails split-hours-1: the home and leak heroes carry `wrongPlace`, and the drain hero adds a `tiles` hit. That makes `tiles` 3 of 3 once `tilesBreakForms` counts "לשבור".

**Hero-cap concept list (M2a.7, site-wide hero cap only).** The site-wide hero cap also counts the `heroCapConceptAdditions` below. A hero that contains any entry of a group counts as a hit for that group. The entries match as plain substrings on `heroHeadline` only. They never count toward the per-page cap, which keeps its narrower section 19.3 + 20.1 list.

These entries are the synonyms the model used on M2a.6 heroes to get past the cap:
- "כל סעיף": electrician-1, home.
- "הפתעות", "מהפתעות": electrician-1 panel and EV, electrician-2 home.
- "מחיר כפול": electrician-2, panel.
- "האריחים": "חושש על האריחים?", plumber-4, water heater.
- "בלי נזק": plumber-3, water heater.
- "פותח רק": split-hours-1, home.

Two matching notes:
- "אריח" matches every inflection as a substring (אריחים, האריחים, באריח), and "הפתעה" and "הפתעות" are listed separately because neither is a substring of the other.
- Inside a hero, these words are always the differentiator, so substring matching there doesn't overfire. It would overfire in body fields, which is why the list is hero-only.

Noa (QA, M2a.7), three matching rules plus two list changes, re-scored on the 48 M2a.6 heroHeadline lines:
- **Service-label exclusion**: before matching, mask the page's own pinned service label (`siteIdentity.services[].label`; on the homepage, every label in `serviceItems`) inside the hero. An entry that hits only inside the label never counts. A hero is never penalised for naming its own service (e.g. a future "איתור דליפות" or "מילוי גז" label).
- **AC only**: the `fromTheRoot` entries "דליפה", "ממלא גז", "ממלאים גז", "מילאו גז" and "מילאו לך גז" count only on pages of the AC vertical (section 20.6 detection). On a plumbing page "דליפה" is the pain itself ("דליפה מהתקרה?"), not the AC differentiator.
- "רצפה" is dropped: "מים על הרצפה?" is the real pain hook of a flood or leak page.
- "המקום הנכון" is replaced by "במקום הנכון": "הגעת למקום הנכון" is a generic ad opener, not the differentiator.
- **Result on M2a.6**: 21 true positives and 0 false positives. כל סעיף 1, הפתעות 4, מחיר כפול 1, אריח 6, בלי נזק 1, פותח רק 1, דליפה 3 (all AC), ממלאים גז 2, מילאו גז 1, מילאו לך גז 1. Every other entry has 0 hits.
- "הפתעה", "ממלא גז" and "מילאו גז" do not match inside "הפתעות", "ממלאים גז" or "מילאו לך גז". Each form is a separate entry on purpose.

~~~json
{
  "heroCapConceptAdditions": {
    "lineByLine": ["כל סעיף"],
    "noSurprises": ["הפתעות", "הפתעה", "מחיר כפול", "מכפיל"],
    "tiles": ["אריח", "ריצוף", "בלי נזק"],
    "wrongPlace": ["במקום הנכון", "הנקודה הנכונה", "פותח רק"],
    "fromTheRoot": ["דליפה", "התקלה האמיתית", "ממלא גז", "ממלאים גז", "מילאו גז", "מילאו לך גז"]
  }
}
~~~

`fromTheRoot` is the AC differentiator. With these entries, an AC run may put "doesn't just refill gas" in the home and repair heroes. It fails on a third. On M2a.6, ac-repair-3 and ac-repair-4 have it in exactly 2 heroes (home and repair), so they pass.

**Per-page cap for the owner's differentiator group (M2a.7, replaces the M2a.6 watch item).** The watch item triggered on M2a.6. There were 38 first-pass `tiles` hits on about 20 plumber and split-hours pages, and 38 `lineByLine` hits on about 16 electrician pages.
- The group or groups that hold the owner's differentiator get a per-page cap of 2. Every other group stays at 1. `exactly` ("בדיוק") is never a differentiator group.
- The site-wide hero cap is unchanged: at most 2 heroes per group.

Detecting the owner's group from `usp` (the `guarantee` field too, if it states a work method):
- **Hebrew `usp`** (the current behaviour): a group is the owner's when any of its section 19.3 or 20.1 variants appears in the usp.
- **English `usp`** (new): a group is the owner's when any of its `differentiatorUspKeywords` entries appears in the usp. Match case-insensitive substrings, after lower-casing the usp and turning every hyphen into a space ("line-by-line" becomes "line by line").
- A usp may match more than one group, and each group it matches gets the cap of 2. For example, "I explain every line of the quote, no surprises in the wall" matches `lineByLine` and `noSurprises`.

~~~json
{
  "differentiatorUspKeywords": {
    "lineByLine": ["line by line", "every line", "each line", "itemized", "itemised", "itemize", "itemise", "walk you through the quote", "explain the quote", "explain every item", "explain each item"],
    "noSurprises": ["no surprises", "no surprise", "no hidden", "hidden cost", "hidden fee", "no extra charges later", "price won't change"],
    "transparent": ["transparent", "transparency", "open quote"],
    "tiles": ["tile", "without breaking", "no breaking", "don't break", "dont break", "non destructive", "no demolition", "without demolition", "without opening walls", "without opening the wall", "no digging", "without digging"],
    "fromTheRoot": ["root cause", "real cause", "real fault", "actual fault", "find the fault", "not just refill", "not just gas", "not just top up", "find the gas leak", "fix it properly"],
    "noMess": ["no mess", "clean up", "cleanup", "leave it clean", "leave the place clean", "tidy"],
    "wrongPlace": ["wrong place", "wrong spot", "right spot", "exact spot", "pinpoint", "before opening", "acoustic", "thermal camera"],
    "pointByPoint": ["point by point", "step by step", "check every point", "every connection", "each connection"]
  }
}
~~~

Each English keyword is chosen so that it shows up only in a usp that states that method. "leak", "price", "clean" on its own, and "quality" are deliberately absent, because every trade's usp uses them.

**aboutPageHeadline duplicates (hard gate, no Hebrew).** If two pages of the same run have byte-identical `aboutPageHeadline` strings (after trimming whitespace), the later page fails. On M2a.5 this catches electrician-1, where home and emergency share "אני מסביר כל שורה בהצעה לפני שאני מתחיל". The near-duplicates in other runs (e.g. hebrew-plumber-3, home and leak) differ by a word. They are caught instead by the per-page and site-wide signature caps where they share a signature phrase.

### 20.2 Scene rules

**Invented customer story (hard gate).** On a real tradesman's site, a narrated past job ("לקוח ב… הזמין…") is a fabricated case study. No owner fact authorises it, because the intake has no field for a real job story. If one is added later, revisit this gate.

Fields: `aboutBlurb`, `aboutPageBody`, `heroSubheadline` and `serviceDetails[].description`.

Two patterns. A hit on either one rejects the page.
- **Pattern A: customer noun + past verb in one clause.**
  - Split the sentence into clauses as in section 17 (at period, comma, em-dash, colon, semicolon, question mark and exclamation mark).
  - A `storyCustomerNouns` entry must appear as a whole word, with no prefix or with only ו or ה. A `storyPastVerbs` entry must appear as a whole word later in the same clause, with no prefix or with only ש.
  - Not a hit when the word right before the noun is a `storyQuantifierExclusions` entry. "כל לקוח שפנה אליי" and "אף לקוח לא שילם על…" are generalisations, not stories. Noa (QA): the quantifier may carry the prefixes ו, ל, ב, מ, ש, כ ("לכל לקוח", "ובכל לקוח"), and "שום" ("שום לקוח לא שילם…") is added.
  - Noa (QA), homographs in `storyPastVerbs`: "התקשר", "פנה" and "קרא" are also imperatives, and "אמרה" is also the noun "a saying". They need the customer noun earlier in the same clause, and an imperative after "לקוח" is always split off by "?" or a comma ("לקוח חדש? התקשר"). So none fires on the M2a.5 copy. Present-tense forms (מזמין, מתקשר, פונה, מקבל) are spelled differently and never match.
  - Plural "לקוחות" is deliberately absent: "לקוחות שואלים אותי" is a present-tense generalisation.
  - "שכן" and "דייר" are deliberately absent: "השכן מלמטה כבר התקשר" is a valid second-person scene.
  - "שאלה" is deliberately absent from the verbs (it is also the noun "a question").
- **Pattern B: past-time anchor.** Plain substring, but only when the anchor starts a clause (a single vav prefix is allowed). The clause split is the same as in Pattern A.
  - This keeps the idiom "מודד פעמיים וקודח פעם אחת" (plumber-2, water-heater about headline) from firing, because there "פעם אחת" ends the clause.
  - "לפני חודש", "לפני שבוע" and "אתמול" are deliberately absent. They appear in valid second-person scenes ("מישהו כבר מילא לך גז לפני חודש", ac-repair-4).

On the M2a.5 evidence, Pattern A catches all four stories: "לקוח בראשון לציון הזמין…" in ac-repair-1, -2 and -3 (install page) and electrician-1 (EV page). It doesn't fire on any second-person scene in the 16 runs.

~~~json
{
  "storyCustomerNouns": ["לקוח", "לקוחה"],
  "storyPastVerbs": ["הזמין", "הזמינה", "התקשר", "התקשרה", "פנה", "פנתה", "סיפר", "סיפרה", "ביקש", "ביקשה", "קרא", "קראה", "גילה", "גילתה", "שילם", "שילמה", "קיבל", "קיבלה", "חיכה", "חיכתה", "ניסה", "ניסתה", "החליט", "החליטה", "הגיע", "הגיעה", "אמר", "אמרה"],
  "storyQuantifierExclusions": ["כל", "אף", "שום"],
  "storyTimeAnchors": ["פעם אחת", "בשבוע שעבר", "בחודש שעבר", "בשנה שעברה", "לא מזמן"]
}
~~~

**Second person, present tense (prompt-only).** The scene happens to "you", now: "אתה…", "המזגן שלך…". The owner may describe what other technicians usually do in the present tense ("רוב הטכנאים ממלאים גז והולכים"), never as a past event with a person in it. First-person past narration ("הגעתי לדירה ב…", "השבוע תיקנתי אצל…") is also off-rule. There is no gate for that yet, so the prompt carries it.

**Same opening across pages (M2a.7: downgraded to prompt-only; it was a hard gate in M2a.6).** It had 20 first-pass hits on M2a.6. The model passed it by changing the third word ("אתה עומד מול…" / "אתה עומד במטבח…" / "אתה עומד ליד…", electrician-1), or by rewording the same scene (hebrew-plumber-2: home "אתה מתעורר באמצע הלילה ושומע מים מטפטפים מהתקרה", leak "טפטוף מהתקרה מעיר אותך באמצע הלילה"). That is surface variety, not a new scene, and it used up repair budget. Prompt rule R2 now carries the requirement: a different scene on every page. The engineer may keep the three-token check as a warning in the run log only.

The old check, for reference: split `aboutPageBody` on whitespace and take the first three tokens, with punctuation stripped from the third. On M2a.5 it caught:
- hebrew-plumber-4, home and leak: "מים מטפטפים מהתקרה".
- plumber-2, home and leak: "מים מטפטפים מהתקרה,", which becomes "מהתקרה" after stripping.
- electrician-3, home and emergency: "אתה עומד במטבח,".

**Moral ending (hard gate).** Fields: `aboutBlurb` and `aboutPageBody`. Plain substring, anywhere in the field. The about body ends on a fact or on what the customer gets, never on a lesson.

On M2a.5 these catch:
- "למדתי שהדרך…" (electrician-1, panel page)
- "השטח לימד אותי…" (ac-repair-3, cleaning page)
- "ההסבר חשוב לי כמו החיבור עצמו" (electrician-3, home)
- "הדרך הכי טובה למנוע אי־הבנות…" (electrician-2, failed home)

The returning M2a.4 tag "העיקרון שלי פשוט" is caught by "העיקרון שלי".

Noa (QA), two exclusions so that bio facts don't trip the gate:
- A `moralEndingTokens` hit is ignored when the token is followed by a space and a `moralEndingFollowingExclusions` entry. "אבא שלי לימד אותי את המקצוע" is an apprenticeship fact (section 2), not a lesson.
- A "למדתי ש" hit is ignored when the whole word that starts at its ש is in `beforeTimeWordExclusions` (section 20.3). "למדתי שנתיים הנדסאות" is a fact.

~~~json
{
  "moralEndingFollowingExclusions": ["את המקצוע", "את העבודה"]
}
~~~

~~~json
{
  "moralEndingTokens": ["למדתי ש", "לימד אותי", "לימדה אותי", "לימדו אותי", "הדרך הכי טובה", "הדרך הטובה ביותר", "הדרך למנוע", "חשוב לי כמו", "זה כל הסוד", "הסוד הוא", "העיקרון שלי", "בשורה התחתונה"]
}
~~~

### 20.3 "Before" cap (hard gate, at most 3 per page; raised from 2 in M2a.7)

Count every hit of `beforeTokens` across the owner-voice fields of one page. The page fails above 3.
- On M2a.5 there were 117 hits in 58 pages, and 3–5 per page in electrician. On M2a.6, with the cap at 2, there were 38 hits in about 52 pages.
- The cap was raised because for an owner whose differentiator is "explain before I start", a cap of 2 failed valid lines. The electrician-4 failure was "אני בודק כל חיבור לפני שאני סוגר את הלוח" in the about headline, as the third hit.
- **Left edge**: the token must not have a Hebrew letter before it, except a single vav ("ולפני ש…" counts). "מלפני" is not a hit.
- **"לפני ש"**: plain substring after the left-edge check, so it matches "לפני שאני", "לפני שמתחילים", "לפני ששוברים" and so on. It is not a hit when the whole word that starts at its ש is in `beforeTimeWordExclusions`. "לפני שבוע" and "לפני שנים" are time phrases, not the crutch.
- **"לפני כל" and "לפני תחילת"**: plain substring after the left-edge check. They are the same crutch ("לפני כל עבודה", "לפני תחילת העבודה").

~~~json
{
  "beforeTokens": ["לפני ש", "לפני כל", "לפני תחילת"],
  "beforeTimeWordExclusions": ["שבוע", "שבועיים", "שבועות", "שנה", "שנתיים", "שנים", "שעה", "שעתיים", "שעות", "שנייה", "שתי", "שני", "שלוש", "שלושה", "שש", "שישה", "שבע", "שבעה", "שמונה", "שתיים", "שלושים"]
}
~~~

### 20.4 Sticky bar must name the problem or the service (hard gate)

This adds to the section 19.4 `stickyActionTokens` gate and the not-equal-to-heroCta check, which both still apply.
- **Bare-line fail**: trim whitespace and any trailing "!" or ".". If what's left is byte-identical to a `stickyBareForms` entry, the line fails.
- **Naming pass**: the line must also contain either the page's own service label or a `stickyProblemWords` entry from the page's vertical. The engineer has the service label in code (the homepage uses `serviceItems[0]`). Problem words match as plain substrings, except "מים", "גז" and "קצר". Those three match as whole words (prefixes ו, ה, ב, ל, מ, ש, כ allowed), because as substrings they pass "ימים", "מתאימים", "מגזין" and "בקצרה".
- **Vertical detection**:
  - `ac`: the slug matches section 20.6's `acVerticalSlugKeywords`.
  - `electric`: the slug contains "electric", "panel" or "charger".
  - `plumbing`: every other slug.
  - The `general` words count for every vertical.
- **"X? דבר איתי"**: passes when X contains a problem word or the service label ("נזילה? דבר איתי", "סתימה? דבר איתי"). It fails when X is neither (e.g. "שאלה? דבר איתי"). "ספר לי מה המזגן עושה" passes on "מזגן".

On M2a.5 this fails the bare "דבר איתי" and "דבר איתי עכשיו", which make up 24 of the 40 "דבר איתי" sticky lines. Of the other 16, the 14 "X? דבר איתי" lines pass.

Noa (QA), full count on the 58 M2a.5 sticky lines: 16 pass and 42 fail. The 42 failures are the 24 bare lines, plus 16 "ספר לי מה…" lines that name neither a problem nor the service ("ספר לי מה קורה", "ספר לי מה צריך", "ספר לי מה אתה צריך", "ספר לי מה אתה מתכנן", "ספר לי מה קרה"), plus 2 "דבר איתי, אני בדרך". The 16 that pass are the 15 "X? …" lines (including "נזילה? התקשר אליי") and "ספר לי מה המזגן עושה". The 19.4 labels "ספר לי מה אתה מתכנן" and "ספר לי מה צריך" stay valid as `formHeadline`, but fail as a sticky line.

~~~json
{
  "stickyBareForms": ["דבר איתי", "דבר איתי עכשיו", "דבר איתי היום", "התקשר", "התקשר עכשיו", "התקשר אליי", "חייג", "חייג עכשיו", "חייג אליי", "ספר לי", "כתוב לי", "השאר פרטים"],
  "stickyProblemWords": {
    "plumbing": ["נזילה", "נזילות", "סתימה", "סתימות", "הצפה", "טפטוף", "רטיבות", "דוד", "ביוב", "צנרת", "מים"],
    "electric": ["חשמל", "קצר", "לוח", "מפסק", "עמדת טעינה", "עמדה"],
    "ac": ["מזגן", "מזגנים", "מיזוג", "קירור", "גז"],
    "general": ["תקלה", "תקלות"]
  }
}
~~~

### 20.5 serviceDetails openings (M2a.7: downgraded to prompt-only; it was a hard gate in M2a.6)

The gate had 76 first-pass hits on M2a.6, the most of any gate, and it made the cards worse. To dodge "אני", the model mixed three shapes in one card set:
- a bare verb: "מאתר את התקלה, מסביר לך מה קרה ומה צריך לתקן" (electrician-1, home)
- a noun chain: "פתיחת היחידה, מדידת לחצים, איתור הדליפה ומילוי גז" (ac-repair-1, repair)
- a passive: "הלוח הישן מוחלף בלוח חדש…" (electrician-1, EV) and "עמדת טעינה לרכב חשמלי מותקנת ומחוברת ללוח הביתי" (electrician-4)

Prompt rule R5 replaces the gate: all service cards on a page share one shape. The engineer may keep the count below as a warning in the run log only.

The old check, for reference: count the `serviceDetails[].description` strings on a page whose first word is exactly "אני" (whole word, no prefix, followed by a space). It failed when the count was above half the number of descriptions, rounded down.
- "ואני", "שאני" and "כשאני" at the start don't count. They are rare openers, and they are already a different sentence shape.
- On M2a.5, electrician-1 fails on every page (3 of 3).

~~~json
{
  "serviceDetailsOpenerToken": "אני"
}
~~~

### 20.6 Trade terms and meaning errors

Same entry format as section 19.2. Types are `gate`, `spellingFix` (reject and regenerate, never auto-replace) and `promptOnly`. The `acOnly` gates apply only to pages of the AC vertical.

**AC vertical detection.** A page is AC when its slug matches. The homepage is AC when the slug of `serviceItems[0]` matches. A slug matches when any hyphen-separated segment equals "ac" (as in "ac-repair", "ac-cleaning", "central-ac"), or when the slug contains one of the other keywords as a substring. A bare "ac" substring is not enough ("vac" and "back" must not match).

~~~json
{
  "acVerticalSlugKeywords": ["ac", "air-condition", "aircon", "hvac", "mini-split"]
}
~~~

`wrong_arrive_locate` matching: a hit is a lead verb, then a space, then the whole word "לאתר", unless the word after "לאתר" is in `arriveLocateNextWordExclusions`. "מגיע לאתר הבנייה" (to the building site) is valid.
- Noa (QA): the lead verb may carry the prefixes ו, ש or כש ("ומגיע לאתר", "כשאני מגיע לאתר" already matches on "מגיע").
- "מגיע לאתר תקלה חשמלית" can be parsed as a construct ("to the site of a fault"), so it is not strictly ungrammatical. It is ambiguous and non-idiomatic though (natives say "למקום התקלה"), so the gate stands.

`ac_sewage`, Noa (QA): a hit is ignored when "ניקוז" appears earlier in the same clause (clauses as in section 17). Connecting the condensate drain to the sewer line ("מחבר את הניקוז לביוב") is real AC practice. None of the 4 M2a.5 hits has "ניקוז" before it in its clause, so all 4 still fire.

`services_headline_preposition` (M2a.7: promoted from prompt-only to a gate, because the prompt rule didn't hold. "מה אני מטפל" came back in electrician-4, emergency servicesHeadline, failed sample.)
- **Fields**: every owner-voice field, plus `servicesHeadline`. This gate names its own field, and `servicesHeadline` is where both hits appeared.
- **"מה אני מטפל"**: plain substring, but only when no Hebrew letter comes right before "מה". So "במה אני מטפל", the correct form, never hits.
- **"מתקין ומטפל"**: plain substring, but only when it is not followed by a space and a word that starts with ב. So "אני מתקין ומטפל במזגנים" (correct) passes, and "מה אני מתקין ומטפל" (M2a.5 electrician-4, EV servicesHeadline) fails.
- Noa (QA): before the ב check, skip one `prepositionSkipAdverbs` word. So "מתקין ומטפל גם במזגנים" and "מתקין ומטפל אישית בכל עבודה" pass.
- Noa (QA): "מה אני מטפל" with the not-after-a-Hebrew-letter check is sound. "במה" and "למה" never hit. No overfire on the M2a.6 copy.

~~~json
{
  "prepositionSkipAdverbs": ["גם", "רק", "אישית"]
}
~~~
- **Replacements**: `replacement` is for the single-verb hit, `replacementPair` for the two-verb hit.

`water_flows_again` (M2a.7: promoted from prompt-only to a gate, because the prompt rule didn't hold. "מוציא את הגורם ומזרים" came back in plumber-4, drain hero.)
- **"ומזרים"**: whole word, with no other prefix and no Hebrew letter after it.
- **"מזרים את"**: plain substring. The only letter allowed right before "מזרים" is a vav, which is already covered by "ומזרים".
- **No overfire on the M2a.6 copy.** The homograph מ+זרים ("from strangers") is not used in trade copy.
- **Replacement idea**: the prompt tells the model to make the water the subject ("המים זורמים שוב"), not the owner.
- The noun "הזרמת המים" (plumber-3, drain card) isn't gated. It falls under R5's one-shape rule.

~~~json
{
  "tradeTermTokens": [
    {"id": "ac_sewage", "tokens": ["ביוב"], "match": "whole word; prefixes ו, ה, ב, ל, מ, ש in any combination (e.g. ולביוב)", "meant": "the AC condensate drain", "replacement": "ניקוז", "type": "gate", "acOnly": true},
    {"id": "evaporator_spelling", "tokens": ["מאיידה"], "match": "whole word; prefixes ו, ה, ב, ל, מ in any combination", "meant": "evaporator", "replacement": "המאייד", "type": "spellingFix", "acOnly": false},
    {"id": "load_bearing", "tokens": ["לא עומס מספיק"], "match": "substring", "meant": "the panel cannot carry the load", "replacement": "לא עומד בעומס", "type": "gate", "acOnly": false},
    {"id": "wrong_arrive_locate", "leadVerbs": ["מגיע", "אגיע", "מגיעה"], "tokens": ["לאתר"], "match": "a leadVerbs word, one space, then the whole word לאתר", "meant": "I arrive and locate the fault", "replacement": "אני מגיע ומאתר", "type": "gate", "acOnly": false},
    {"id": "main_valve", "tokens": [], "match": "none (prompt-only)", "meant": "in a flood or a leak scene, the owner or the customer closes the main water valve, never opens it; opening it is only for testing after the repair", "replacement": "לסגור את הברז הראשי", "type": "promptOnly", "acOnly": false},
    {"id": "services_headline_preposition", "tokens": ["מה אני מטפל", "מתקין ומטפל"], "match": "see services_headline_preposition note", "meant": "two verbs that share one object must take the same preposition; מטפל needs ב", "replacement": "במה אני מטפל", "replacementPair": "מה אני מתקין ובמה אני מטפל", "type": "gate", "acOnly": false},
    {"id": "water_flows_again", "tokens": ["ומזרים", "מזרים את"], "match": "see water_flows_again note", "meant": "the water drains again after unblocking; the transitive מזרים sounds stiff", "replacement": "המים זורמים שוב", "type": "gate", "acOnly": false}
  ],
  "arriveLocateNextWordExclusions": ["הבנייה", "בנייה", "העבודה", "עבודה"]
}
~~~

**Typo gates (Noa, M2a.7).** These cover owner-voice fields plus `servicesHeadline`. Both are reject-and-regenerate, never auto-replace.
- **`tripled_letter`** (no Hebrew data): a hit is any Hebrew letter (U+05D0–U+05EA) three or more times in a row, except vav. For vav, a hit is four or more in a row. Three vavs are legal when the vav prefix meets a word that starts with וו ("ווילון" → "וווילון", "וואטסאפ" → "ווואטסאפ"). Three of any other letter never occur in correct Hebrew. It catches "ויייעלם" (plumber-2, leak about body).
- **`wrongPrepositionTokens`**: a token must have no Hebrew letter before it or after it, so "חושש עליו" and "חושב על" never hit. Fear takes ל or מ ("חושש לאריחים", "חושש מהפתעות"), not על. It catches "חושש על האריחים?" (plumber-4, water-heater hero).
- **Re-scored on all saved eval copy (M2a.3 to M2a.6)**: 1 true positive each, 0 false positives.

~~~json
{
  "wrongPrepositionTokens": ["חושש על", "חוששת על", "חוששים על"]
}
~~~

Prompt-only (no cheap generic gate without overfire):
- **"מחובר ובודק"** (plumber-2, water-heater about headline): passive and active participles are mixed; the intended form is "מחובר ונבדק". A passive + "ו" + active gate overfires on correct sentences such as "מוודא שהכול מחובר ובודק את הלחץ".
- **"אני לא מתקין על מערכות…"** (hebrew-plumber-2, solar about body): the exclusion fact's verb was swapped (the intake says "לא עובד על"). "מתקין על" is correct in "מתקין על הגג", which is common on solar pages.
- **"ואת מצנרת המים"** (same page): a one-off garbled word. The intended text is "את צנרת המים" or "את מצב הצנרת". There is no generic pattern to gate.
- **Prompt line**: "Re-read every exclusion and fact sentence: keep the owner's verb, and make sure each verb takes its correct preposition."

On M2a.5:
- `ac_sewage` catches "מגיע לסלילים ולביוב" and its repeats (ac-repair-1, cleaning page: subheadline, blurb, about body and details).
- `load_bearing` catches electrician-1 (EV about body).
- `wrong_arrive_locate` catches "אני מגיע לאתר תקלה חשמלית" (electrician-1 panel and EV, electrician-2).
- `evaporator_spelling` catches ac-repair-1 (install details).
- `main_valve` would have prevented "אם לפתוח את הברז הראשי" (hebrew-plumber-1, home about body).

### 20.7 heroCta by contact method (planned stage)

`heroCta` stays system-set from the contact method, with one override. On a `planned`-stage page (section 19.4) of a phone site, the label is "התקשר להצעת מחיר". WhatsApp-only and form-only sites keep their system label on every page, because the button must say what it opens. Emergency and neutral pages keep the system label too. "דבר איתי על העבודה" has been removed from section 19.4.

~~~json
{
  "heroCtaOverride": {
    "planned": {"phone": "התקשר להצעת מחיר"}
  }
}
~~~

### 20.8 Prompt rules for M2a.6 (ready to paste)

- **R1 — Differentiator across the site.** Put the owner's differentiator in the home hero and in the hero of the one service it fits best, and nowhere else in a hero. Every other hero leads with the pain of that specific service. Don't use synonyms or paraphrases to repeat it; any phrasing of the same idea counts as a repeat.
- **R2 — Scene.** Write the about-body scene in the second person, present tense: the reader, in his home, now. Never narrate a past job, a named or unnamed past customer, or something the owner did on a specific past occasion. Every page of the site gets a different scene: a different room, moment or failure that belongs to that page's service. The same scene in new words doesn't count. Don't open two pages with the same "you are standing in…" frame. End on a fact or on what the customer gets, never on a lesson, a motto or a principle.
- **R3 — "Before" crutch.** Use "before I start / before I touch / before every job" constructions at most three times per page. Show the order of the work with a concrete sequence instead.
- **R4 — Sticky bar.** The sticky bar names the customer's problem or the service, plus an action: problem-word question plus action, or "tell me what the [appliance] is doing". Never a bare action on its own.
- **R5 — Service cards (M2a.7).** Write all service cards in one shape: short first-person action phrases. That means present-tense verbs of what the owner does, in order, on every card of the page. Don't mix in noun chains (a list of verbal nouns) or passive phrasing. Don't start more than one card with the same three words.
- **R6 — Trade accuracy.** Use the correct trade term and the correct safety action. An AC unit has a condensate drain, never sewage. In a flood the main water valve is closed, not opened. When two verbs share one object, check that both take the same preposition.
- **R7 — Hero anchor (from Yonatan's H1 anchor rule; he owns the gate).** The hero headline opens with the pain hook. The next clause carries the exact service label and the city, as written in the owner's facts. Never drop the service label or the city to make room for the hook.
- **R8 — Hero hook shape (M2a.7).**
  - The hook is at most 4 words, and it is a question the reader asks himself at that moment, in his own words.
  - On a planned-stage page (section 19.4), the hook may be the decision question the reader is weighing, instead of a failure. Example of the move, not text to copy: asking whether the home's panel can carry a new charger.
  - Never invent an abstract failure noun to fill the hook slot, such as an adjective about how hastily something was installed.
  - After the hook and the anchor clause (R7), a third clause is optional. If used, it is at most 4 words and carries one fact or one action, never a list.
  - Drop the third clause if the full hero would run past about 60 characters.

Gates vs prompt-only in section 20 (as of M2a.7):
- **Hard gates**:
  - the `signatureWordTokenAdditions` and `tilesBreakForms` (per-page cap: 2 for the owner's differentiator group, detected from the Hebrew or English usp with `differentiatorUspKeywords`; 1 for every other group)
  - the site-wide hero cap, counting `heroCapConceptAdditions` as well
  - the `aboutPageHeadline` duplicate check
  - `storyCustomerNouns` with `storyPastVerbs`, and `storyTimeAnchors`
  - `moralEndingTokens`
  - the `beforeTokens` cap (3 per page)
  - `stickyBareForms` with the `stickyProblemWords` naming check
  - the `gate` and `spellingFix` entries of `tradeTermTokens`, now including `services_headline_preposition` and `water_flows_again`
- **System mapping, not a gate**: `heroCtaOverride`.
- **Warning only (run log), formerly gates**: the same-opening check (20.2) and the `serviceDetailsOpenerToken` half cap (20.5).
- **Prompt-only**:
  - R1–R8 as wording
  - the second-person / present-tense rule and first-person past narration (no gate)
  - the `main_valve` entry
  - R7, whose gate is Yonatan's

M2b note: until M2b renders the trust bar, about section, service cards and hero call button on research sites, a gate hit in a field that isn't rendered is logged as a warning and doesn't fail the page. Every rule above still applies to the copy, and the gates become blocking for those fields from M2b.

## 21. nameIntroRule (Noa M2a.6)

`gate_name_spelling` checks the word after the name opener against the owner's first name. The opener is a homograph: "שמי" is "my name", but also ש + מי ("that whoever"), as in "אתה חושש שמי שיגיע ישבור אריחים". So the gate fires only when the opener starts a sentence: the start of the field, or the first word after ". ", "? " or "! ". It also fires when the opener comes right after a `nameIntroLeadIns` entry followed by a comma and a space ("שלום, שמי יוסי"). Anywhere else it is not a name intro and is never checked. Whole word, no prefix letters ("ושמי" is not matched). Do not use a next-word exclusion list: many owner names start with ש ("שמי שלומי", "שמי שרון").

The same position rule applies to "שמי" as a section 19.5 `subjectCarryTokens` word. It carries the subject only at sentence start or after a lead-in plus ", ". "אתה חושש שמי שיגיע…" carries nothing. "אני" keeps the 19.5 rule as it is (whole word, prefixes ו, ש, כש allowed).

On M2a.6 this clears both false failures (plumber-1 leak-detection and split-hours-2 drain, both "אתה חושש שמי שיגיע…"). It keeps all 13 real "שמי <name>," intros, which each open their aboutBlurb.

~~~json
{
  "nameIntroToken": "שמי",
  "nameIntroLeadIns": ["שלום", "היי", "הי", "נעים מאוד", "נעים להכיר"]
}
~~~

## 22. voiceRules M2b (Tamar, from the M2b.1b read of the five newly rendered fields)

Source: the 17 saved M2a.7 site records in `scratch/m2a7/eval/` (electrician-1 saved none), read as the homeowner sees them on a phone, plus the M2b.1 and M2b.1b re-scores. Field scope is the same as section 20. Rendering since M2b.1b: `trustBarItems` on every page. `servicesHeadline`, `serviceDetails`, `aboutPageHeadline` and `aboutPageBody` render on the homepage and the services hub only. The same quote convention as sections 14–21 applies.

### 22.1 The read: what a homeowner sees on one scroll

- **The about section repeats the hero instead of proving it.** On the plumber-1 homepage, the tiles promise appears 5 times: the hero ("אריחים שבורים?"), the about headline ("מאתר את הנזילה בלי לגעת באריח"), the about body twice ("אריחים שבורים", "בלי לשבור אריח אחד") and the first card ("בלי לשבור אריחים"). The reader got the promise in the first line. By the fifth time it sounds like a tic, not a commitment.
- **The proof is missing.** All four plumber runs have the usp "camera inspection". The camera appears 0 times in their copy, on any page. The model replaced the owner's method with the answer to his customer's fear. A homeowner believes "no broken tiles" when he hears how it's done. Split-hours, whose usp names acoustic equipment, did use it, and that gives the strongest about body in the set (split-hours-2 home: "מצמיד ציוד אקוסטי לקיר ומקשיב עד שאני מוצא את הנקודה").
- **Electricians use up the cap in the hero.** electrician-2 and -3 put `lineByLine` in both the hero headline and the subheadline. Any mention in the about section is then the third.
- **About headlines repeat the differentiator.** 14 of 17 homepage about headlines carry a signature group, a hero-cap concept or a "before" construction (6 are "…לפני שאני…"). Only split-hours-2, ac-repair-2 and hebrew-plumber-4 carry none.
- **The trust bar mostly works.** Almost every set is years, then warranty or licence, then area, in 3 items ("15 שנה בשטח", "רישיון מס׳ 4821", "אחריות שנה לעבודה"). The misses:
  - the prefix on the first city only: "בראשון לציון וחולון" (ac-repair-3, install)
  - a missing ו: "ראשון לציון נס ציונה" (electrician-2, EV)
  - a filler set: "שירות מהיר", "מחיר הוגן" (ac-repair-2, failed install sample)
  - 4 items (hebrew-plumber-2, home)
  - an arrival promise in a fact slot: "מגיע היום בחולון" (plumber-1, home), right under a hero that already says "מגיע היום"
- **The services headline is a signpost, and it is mostly right.** "במה אני מטפל" and "מה אני עושה" read naturally. The 4 hits are real errors:
  - "מה אני מטפל": hebrew-plumber-1 home, plumber-4 leak.
  - "מה אני מתקין ומטפל": hebrew-plumber-3 solar, ac-repair-4 install.
- **The cards kept R5's one shape.** Every card is "אני" plus present-tense verbs. The weak spots:
  - card 1 copies the about-body sentence word for word (plumber-1 and plumber-3 home: "…בלי לשבור אריחים ומראה לך בדיוק איפה הבעיה")
  - the warranty is tacked onto the repair card (ac-repair-1, -3 and -4 home)
  - literary register: "ומחזיר את זרימת המים לקדמותה" (plumber-1 home, drain card)

### 22.2 Gate rulings

**`signature_repeat` (per-page cap): the cap is right; the differentiator detection is wrong.** One homepage with the promise in the hero and once in the about body is exactly where the promise belongs, and cap 2 allows it. That is not too strict, and the cap stays as it is.

The detection is what's wrong. `DIFFERENTIATOR_SOURCE_FIELDS` reads only `usp` and `guarantee`. The plumber's tiles promise comes from `idealClientFear` ("breaks the bathroom tiles"), so `tiles` runs at cap 1. Even a correct page, with the hero plus one about mention, fails. The fix is to add `idealClientFear` as a source:
- **Hebrew fear**: as for a Hebrew usp (the section 19.3 and 20.1 variants).
- **English fear**: lower-case it and turn every hyphen into a space. Then match plain substrings against `differentiatorUspKeywords` and the `differentiatorFearKeywords` below.
- **On the M2a.7 fears**:
  - plumber: `tiles` and `noMess`
  - AC: `fromTheRoot`
  - electrician: `noSurprises`
  - split-hours: `tiles`, `wrongPlace` and `noMess`
  - the Hebrew fear "הצפה בבית באמצע הלילה": none
- **Deliberately absent**: "dust" (it matches "industrial"), "floor" (a flood fear is not the tiles promise) and "comes back" (a tradesman who never comes back is not a root-cause fear). `exactly` is still never a differentiator group.
- **What it does**: this alone does not rescue the plumber-1 homepage (5 hits); rules B1, B4 and B5 do that. What it does is stop the gate from failing a correct page.

~~~json
{
  "differentiatorSourceFieldsAdd": ["idealClientFear"],
  "differentiatorFearKeywords": {
    "tiles": ["tile", "opens the wall", "open the wall", "breaks the wall", "break the wall", "demolition", "digs up", "dig up"],
    "noSurprises": ["surprise", "doubles the price", "double the price", "price goes up", "hidden cost", "hidden fee", "extra charge"],
    "fromTheRoot": ["refills the gas", "refill the gas", "without finding", "breaks again", "same problem"],
    "wrongPlace": ["wrong place", "wrong spot"],
    "noMess": ["mess", "dirty"]
  }
}
~~~

**New hard gate `aboutHeadlineNoPromise` (no new Hebrew).** The about headline fails when it contains any of these:
- a hit of any signature group (sections 19.3 and 20.1, including `tilesBreakForms`)
- a `heroCapConceptAdditions` entry, with the section 20.1 service-label mask and the AC-only rule
- a `beforeTokens` hit, with the section 20.3 left-edge rule and time exclusions

It applies only on pages that render the about section. It replaces a rule the model ignores with one it can follow (rule B5).

On M2a.7 it fails the 14 homepage headlines listed in 22.1 and passes the other 3.

~~~json
{
  "aboutHeadlineNoPromise": {
    "field": "aboutPageHeadline",
    "forbidLists": ["signatureWordTokens", "signatureWordTokenAdditions", "tilesBreakForms", "heroCapConceptAdditions", "beforeTokens"],
    "matching": "each list as defined in sections 19.3, 20.1 and 20.3"
  }
}
~~~

**`services_headline_preposition`: a real error, so keep it, and close the field.** "מה אני מטפל" is wrong in Hebrew: מטפל takes ב, so the correct form is "במה אני מטפל". "מה אני מתקין ומטפל" makes two verbs share one object with different prepositions. Any native editor would fix both. This H2 sits right below the hero, and a grammar slip there costs trust with exactly the reader who notices.

The H2 is a signpost, and a model can't do that job better than a fixed line. Free generation produced 4 errors in 63 pages. So the field becomes a closed set:
- **Gate**: the trimmed value must be byte-identical to one entry of `servicesHeadlineOptions`.
- **Who sets it**: the model may pick an entry, or the engineer may system-set the first one. Either is fine.
- **Backup**: the preposition gate stays as a backup for every other field.
- **Not in the set**: "מה אני מתקין ובמה אני מטפל" (the M2a.7 `replacementPair`) is correct, but too heavy for an H2.
- **Flag for Yonatan**: if he wants a head term in this H2, he supplies the formula and the set changes. Until then the H2 carries no keyword.

~~~json
{
  "servicesHeadlineOptions": ["במה אני מטפל", "מה אני עושה"]
}
~~~

**Trust bar: keep `city_prefix`, and add a filler list plus a size cap.**
- **`city_prefix`**: a real error ("בראשון לציון וחולון"). Rule B2 also drops the prefix from the trust bar altogether, so the case stops arising.
- **`trustBarFillerPhrases`** (new): plain substring, `trustBarItems` only. A hit fails the page. These phrases claim something a customer can't check. They stay out of `genericAdjectivePhrases` because a body-wide list needs its own overfire check first.
- **`trustBarMaxItems`** (no Hebrew): more than 3 items fails.
- **`trustBarMaxChars`** (no Hebrew): any item over 24 characters fails. Count Unicode code points, including spaces and punctuation. The longest valid M2a.7 items are 20 characters, and 24 still fits the full three-city list "תל אביב, גבעתיים ורמת גן". Maya to confirm the width on a 360 px screen.

~~~json
{
  "trustBarFillerPhrases": ["שירות מהיר", "שירות אמין", "שירות אישי", "יחס אישי", "מחיר הוגן", "מחירים הוגנים", "מחיר משתלם", "מחירים משתלמים", "זמינות גבוהה", "לקוחות מרוצים", "אמינות"],
  "trustBarMaxItems": 3,
  "trustBarMaxChars": 24
}
~~~

**`duplicate_about_headline`: keep it, but compare only pages that render the about section.** Both M2a.7 hits were on money-service pages (electrician-4 EV and hebrew-plumber-3 leak), where nobody sees the about section. The check matters only between the homepage and the services hub.

**Run-log warnings to delete:**
- **`service_details_opener` (106)**: R5 makes "אני" plus a verb the shape on purpose, so the warning counts the rule being followed.
- **`duplicate_about_opening` (25)**: at most two about bodies render per site, so keep the check only for the homepage against the hub.

**`before_cap`: keep it at 3, with no new exclusion.** The two hits are real crutches. One example is ac-repair-2's repair page: "לפני שאני ממלא גז" on a card, then "לפני שאני נוגע בגז" in both the about headline and the about body. "לפני שאני עוזב" is not excluded either. It ends a card on the owner's habit, not on what the customer gets, and B4 moves the card ending to the result.

**These rulings stand as they are: `fact_repeat`, `moral_ending`, `bare_verb_opener`, `water_flows_again`.** Each hit is real:
- **`fact_repeat`**: "15 שנה" appears in the trust bar, the about headline and the about body (hebrew-plumber-4 home).
- **`moral_ending`**: "12 שנה בשטח לימדו אותי ש…" is a lesson ending (plumber-3 drain).
- **`bare_verb_opener`**: three subject-less sentences in a row (plumber-4 water heater, "מנקה את הרצפה…").
- **`water_flows_again`**: "ומזרים את המים בחזרה לזרימה מלאה" (plumber-1 water heater card).

**Note for Adam (cost, not voice).** Money-service pages still generate the about and card fields, which nobody sees. Dropping them from money-service generation would save tokens and repair calls.

### 22.3 Prompt rules for M2b (ready to paste)

These apply on pages that render the about section and the service cards (the homepage and the services hub). B2 applies on every page. Sections 19 and 20 still apply.

- **B1 — Promise twice, proof once.**
  - The owner's differentiator comes from his usp, or from the answer to his customer's fear.
  - It appears exactly twice on the page: once in the hero (the headline or the subheadline, never both) and once in the about body.
  - It never appears, in any wording or synonym, in the trust bar, the services headline, a service card or the about headline.
  - Never use the `exactly` group in any field.
- **B2 — Trust bar: who is coming into my home.**
  - At most 3 items. Each is at most 24 characters and is a noun phrase with no verb.
  - Choose from these kinds, one item per kind:
    - years in the trade
    - a credential (licence number, licence or certification)
    - warranty length
    - the service area: the cities as written in the owner facts, joined with ו, with no locative prefix
    - response time, only if neither the hero headline nor the subheadline states it
  - Never use the service name, an adjective, a price word, a work-style claim, the differentiator, or anything in `trustBarFillerPhrases`.
  - If the owner gave only two facts, write two items.
- **B3 — Services headline.** Use one entry of `servicesHeadlineOptions`, word for word.
- **B4 — Service cards: what will happen in his home.**
  - One card per service, 8 to 14 words, in the R5 shape: first person, present-tense verbs, in the order the owner works.
  - Give two or three steps. Include one physical detail that belongs only to that service: the tool, the part or the measurement.
  - End on a result the homeowner can check himself once the job is done (the water drains, the unit blows cold, the breaker holds). Never end on the owner's habit or on him leaving.
  - Never use the differentiator, the warranty, a price, a "before" construction or the `exactly` group.
  - Use plain spoken words, never a literary or formal register. No card repeats a sentence from the about body.
- **B5 — About headline: the man, not the promise.**
  - The hero sold the promise. This line introduces the person who will knock on the door.
  - At most 7 words, built from one of:
    - years in the trade, with the trade or the city
    - the owner's first name with his trade (only when the name is written in Hebrew)
    - the tool or method from his usp that makes the promise possible, said as a plain first-person fact
  - Never use a signature phrase or its synonyms, a "before" construction, or a quality adjective.
- **B6 — About body: scene, proof, result.** Three or four sentences, 12 to 15 words each, in the singular male voice.
  1. One scene in the second person and present tense, of the problem itself: what the reader sees, hears or smells in his home right now. It is not his fear of the tradesman, because the hero already named that.
  2. What the owner physically does when he arrives, naming the tool or method from his usp. This is the proof behind the hero's promise, and the only place on the page where the promise may come back, once.
  3. End on something the reader can check after the owner leaves, or on one owner fact the page hasn't used yet.
  - Each owner fact appears at most twice on the page, and the trust bar counts. Before you use years, warranty or area here, check how many times the hero, the subheadline and the trust bar have already used it.
  - R2 (no past story, no lesson) and P4 (keep the subject) still apply.
  - **Example of the move (a description, not text to copy):** the strongest body in the eval opens on a damp patch on a kitchen wall and not knowing where the water comes from. The owner presses his acoustic equipment to the wall and listens until he finds the spot, explains the options, and only then starts. The tool makes "I won't open the wall in the wrong place" believable without saying it. Do the same with this owner's own tool and facts, in new words every time.

### 22.4 Hard gate or warn-only, per field

- **`trustBarItems`: hard gate now.** The only hits were real errors (one city prefix, plus the always-blocking service-area fact gate). The new filler list and size caps are mechanical checks with no judgment calls. A wrong trust bar shows on every page, so it should never ship.
- **`servicesHeadline`: hard gate now, with the closed set.** The closed set means a valid run can't fail it. Every M2a.7 hit was a real grammar error in the first H2 under the hero.
- **`serviceDetails`: hard gate once B1 and B4 land.**
  - Its blocking hits were the differentiator in card 1 (signature), `exactly`, the "before" crutch and one `water_flows_again`. All of them are real.
  - B1 and B4 take the differentiator out of the cards, so a correct card set passes by construction.
  - The opener warning is deleted, so R5's shape no longer counts against it.
- **`aboutPageHeadline`: hard gate once B5 and `aboutHeadlineNoPromise` land.** Today it repeats the hero in 14 of 17 homepages, which is the reader's most visible repetition. The new gate is mechanical and comes with a clear alternative job in the prompt.
- **`aboutPageBody`: hard gate once B1, B6 and the `idealClientFear` source land.**
  - With the fear source, a body that says the promise once next to the hero passes.
  - What still fails is the promise said twice inside the body, a repeated fact or a lesson ending. All of these are things the reader actually sees.

Acceptance for the flip: re-run the 18 evals with all five fields blocking, scored by page type. At least 16 of 18 runs must be valid (today's baseline, with these fields warn-only, is 17 of 18). If one field alone costs more than one run, keep only that field warn-only for one more round, and send its copy back to me. Don't loosen the rule instead.

Gates vs prompt-only in section 22:
- **Hard gates**: the `idealClientFear` differentiator source (it changes the existing cap), `aboutHeadlineNoPromise`, the `servicesHeadlineOptions` closed set, `trustBarFillerPhrases`, `trustBarMaxItems`, `trustBarMaxChars`, and the scope fix for `duplicate_about_headline`.
- **Deleted run-log warnings**: `service_details_opener`; `duplicate_about_opening`, except homepage against hub.
- **Prompt-only**: B1–B6 as wording.
- **Handoffs**: Noa to proof `servicesHeadlineOptions` and `trustBarFillerPhrases`. Yonatan to confirm that the services H2 carries no keyword. Maya to confirm the 24-character trust-bar item on a 360 px screen.

## 23. voiceRules M2b.2 (Tamar, from the M2b.1d eval read; scope approved by Adam; Noa's eval slips folded in)

Source: the 18 saved M2b.1d site records in `scratch/m2b1d/eval/` (all five section 22 fields blocking, 18 of 18 valid), their `pages.json` warnings, and the M2a.7 records for comparison. Rendered fields are as in `RESEARCHED_RENDERED_FIELDS` (M2b.1f): `aboutBlurb`, `guaranteeBlock`, `responseTimeBadge`, `stickyBarLine` and `serviceItems` do **not** render. The same quote convention as sections 14–22 applies.

### 23.1 The read: what changed, what didn't

- **Fixed: the hero promise no longer echoes through the page.** In M2a.7 plumber-1 the tiles promise was rendered 5 times. In M2b.1d plumber-1 it is in the hero only ("נזילה בבית? אינסטלטור בחולון — בלי לשבור אריחים"). The about headline is now "12 שנה מאתר נזילות בחולון", and each card describes its own job.
- **Correction to my first M2b.1d read.** I counted the warranty "about 5 times" on plumber-1, which included `aboutBlurb` and `guaranteeBlock`. Neither renders. The rendered count is 3: the hero subheadline, the trust bar and the about body. All 24 `fact_repeat` warnings and both `city_prefix` warnings are in unrendered fields (`aboutBlurb` and `responseTimeBadge`). The homeowner sees none of them.
- **Not fixed: the owner's tool.** All four plumber usps name a camera inspection. The camera appears in 1 of 4 about bodies:
  - plumber-3 (the target): "אני מגיע עם מצלמה, סורק את הצנרת ומראה לך על המסך איפה הנקודה"
  - plumber-1 and plumber-4 invent a vague method: "עובר קיר־קיר עד שאני מוצא את הנקודה"
  - **plumber-2 states a false fact:** "מצמיד ציוד אקוסטי לקיר ומקשיב עד שאני מוצא את הנקודה". This owner uses a camera. The acoustic scene is the section 22.3 B6 example, copied into the wrong owner. My example caused it.
- **New: the about headline repeats trust tile 1.** 16 of 18 homepage about headlines start with the years in the trade, and the years are already in the first trust tile. The worst case is ac-repair-1: the tile "10 שנים בתחום", then the headline "10 שנים בתחום, בראשון לציון". Most of the rest are the same move in different words: "12 שנה מאתר נזילות", "9 שנות איתור נזילות ברחובות", "יוסי כהן, 15 שנה בשטח". The two that don't do it read better: "פותח לוח, בודק כל מעגל" (electrician-4) and "יוסי כהן, אינסטלטור בתל אביב" (hebrew-plumber-4).
- **New: the explaining sentence moved into card 1.**
  - plumber-2: card 1 "מאתר את מקור הנזילה, מסביר לך מה מצאתי ורק אז מתחיל לתקן"; about body "מסביר לך מה מצאתי ורק אז מתחיל לעבוד".
  - plumber-1: card 1 "אני עובר קיר־קיר עד שאני מוצא את מקור הנזילה, ומסביר לך מה מצאתי לפני שאני מתחיל"; about body "אני מגיע, עובר קיר־קיר עד שאני מוצא את הנקודה, ומסביר לך מה מצאתי."
- **New: one phrase repeated across the card set.** electrician-2 card 1 "…הלוח מחזיק עומס בלי קפיצות"; card 3 "…הרכב נטען בלי קפיצות." The about body ends "…לוח שמחזיק עומס בלי קפיצות." (Noa)
- **Hebrew slips (Noa, confirmed):**
  - warranty plus a bare duration, with the article: hebrew-plumber-1 about body "אתה רואה את התיקון ואת האחריות שנה." It is ungrammatical, and a warranty is received, not seen. The fix is "אתה רואה את התיקון ומקבל עליו אחריות לשנה."
  - preposition on the first town only: "הגעה באותו יום בחולון ובת ים" (plumber-1 and plumber-3, `responseTimeBadge`, not rendered). The fix is "בחולון ובבת ים".
  - card punctuation: electrician-2 cards 2 and 3 end with "." and card 1 doesn't.
- **Visible across runs, not inside one site: the about body template.** About 12 of 18 bodies open "אתה עומד ב…", then "אני מגיע, … עד שאני מוצא את הנקודה", then the warranty. A homeowner sees one site, so this isn't a gate. It is noted for the day two clients in the same trade compare their sites.

### 23.2 Gate rulings

**(a) `uspToolRequired` and `foreignTool`: new hard gates.** The tool is the proof behind the promise (section 22.1), and naming the wrong tool is a false claim about the owner.
- **Tool groups**: an owner's usp matches a group when it contains one of the group's `uspKeywords` (English: lower-case it, then plain substring) or one of its `he` stems (Hebrew usp: plain substring).
- **`uspToolRequired`**: on a page that renders the about section, when the usp matches a group, `aboutPageBody` must contain one of that group's `he` stems. A usp can match two groups (a "thermal camera" matches `camera` and `thermal`), and "מצלמה תרמית" satisfies both.
- **`foreignTool`**: any rendered field that contains a `he` stem of a group the usp does not match fails. It goes into `ALWAYS_BLOCKING_RULES` (it's in the same class as `claim`). A hit inside an owner-confirmed service label is exempt, so a security-camera installer can name his service.
- **Deliberately absent**: the pressure gauge and the meter. They are every technician's ordinary tools, not a differentiator. The AC bodies' "מחבר את מד הלחץ" stays allowed.
- **`thermal`** has its own `he` list, narrower than the section 12 `thermalTokens` (Noa M2b.2). The bare stem "תרמי" also matches "בידוד תרמי" (AC pipe insulation) and "מפסק תרמי" / "ממסר תרמי" (electrical protection), which are ordinary trade words. As an always-blocking `foreignTool` stem it would fail AC and electrician pages. The list keeps the feminine forms that go with a camera or a scan ("מצלמה תרמית", "סריקה תרמית", "מצלמות תרמיות"), plus "צילום תרמי" and "תרמוגרפ".
- **A thermal match also counts as a camera match.** A usp that matches `thermal` only ("thermal imaging", "תרמוגרפיה") would otherwise fail `foreignTool` on its own "מצלמה תרמית", because "מצלמ" is a camera stem.
- **On M2b.1d**: `uspToolRequired` fails plumber-1, -2 and -4; plumber-3 and split-hours-1 and -2 pass. `foreignTool` fails plumber-2. The other niches name no tool in their usp, so they get no requirement.

~~~json
{
  "uspToolGroups": {
    "camera": { "uspKeywords": ["camera", "endoscope", "borescope"], "he": ["מצלמ", "אנדוסקופ", "צילום צנרת", "צילום הצנרת", "צילום ביוב"] },
    "acoustic": { "uspKeywords": ["acoustic", "listening device", "geophone"], "he": ["אקוסט", "גיאופון", "גאופון", "האזנה"] },
    "thermal": { "uspKeywords": ["thermal", "infrared", "thermograph"], "he": ["תרמית", "תרמיות", "צילום תרמי", "תרמוגרפ"] }
  },
  "uspToolRequired": { "field": "aboutPageBody", "scope": "pages that render the about section" },
  "foreignTool": { "fields": "every rendered field", "blocking": "always", "exempt": "a stem hit inside an owner-confirmed service label" }
}
~~~

**(b) `aboutHeadlineNoTrustRepeat`: new hard gate, no new Hebrew.** On a page that renders the about section, `aboutPageHeadline` fails when either of these holds:
- it shares a digit run with any `trustBarItems` entry on the same page
- it contains any trimmed `trustBarItems` entry verbatim

The prompt side is C2 below, which replaces the option list of B5. Years are no longer an option, and the headline leads with the method or the place.
- **On M2b.1d**: it fails about 16 of 18 homepages, every headline that starts with the years. That is expected. The rescore only confirms it fires where designed, and C2 is the fix.

~~~json
{
  "aboutHeadlineNoTrustRepeat": {
    "field": "aboutPageHeadline",
    "failWhen": ["shares a digit run with any trustBarItems entry on the page", "contains any trimmed trustBarItems entry verbatim"],
    "scope": "pages that render the about section"
  }
}
~~~

**(c) `aboutCardEcho`: new hard gate, no Hebrew.** On a page that renders the about section, `aboutPageBody` and any `serviceDetails[].description` fail when they share a run of 4 or more consecutive words.
- **Tokenizing**: remove , . ; : ! ? and the em-dash, then split on whitespace. A maqaf, geresh or gershayim stays inside its word. Before comparing, turn an ASCII hyphen inside a word into a maqaf, and remove one leading ו from every token (Noa M2b.2: "ומסביר" and "מסביר" are the same words, and the conjunction is the only clitic safe to strip). Tokens must then match exactly. The other prefixes (ה, ב, ל, מ, ש) stay, because they change the meaning.
- **`aboutBlurb`**: it doesn't render, so it doesn't count.
- **On M2b.1d**: it fails plumber-2 ("מסביר לך מה מצאתי ורק אז מתחיל", 7 words) and plumber-1 ("עובר קיר־קיר עד שאני מוצא את", 6 words; "ומסביר לך מה מצאתי", 4 words). electrician-2 passes, because "מחזיק" and "שמחזיק" are different tokens, so its "בלי קפיצות" echo between card and body is left to the prompt (C3).
- **Why not 3 words**: at 3, "אני פותח את" (electrician-2, card 1 and body) would fail, and a shared opening verb is not an echo.

~~~json
{
  "aboutCardEcho": {
    "fields": ["aboutPageBody", "serviceDetails[].description"],
    "minSharedWords": 4,
    "tokenize": "remove , . ; : ! ? and the em-dash; split on whitespace; maqaf, geresh and gershayim stay inside the word; ASCII hyphen inside a word becomes maqaf; strip one leading vav from every token; then exact token match",
    "scope": "pages that render the about section"
  }
}
~~~

**`cardPhraseEcho` (Noa's in-set repetition): warn-only for the rescore, then a hard gate if every hit is a real echo.** Two `serviceDetails[].description` entries on one page fail when they share two adjacent words, each of 3 or more Hebrew letters, with the same tokenizing as `aboutCardEcho`. On M2b.1d it catches electrician-2 ("בלי קפיצות"). A two-word window can overfire on trade vocabulary shared by two services, which is why the rescore decides. If it overfires, raise it to 3 words. Don't drop it.

~~~json
{
  "cardPhraseEcho": {
    "field": "serviceDetails[].description",
    "minSharedWords": 2,
    "minHebrewLettersPerWord": 3,
    "tokenize": "as aboutCardEcho",
    "severity": "warn for the rescore; hard gate if every rescore hit is a real echo"
  }
}
~~~

**(d) Warranty at the end of the about body: prompt-only.** `guaranteeBlock` renders on no page today, so the condition "close on the warranty only when the guarantee block isn't rendered" is always met. The real limit is the fact cap in (f). Write C4 conditionally anyway, so the rule holds the day the guarantee block starts rendering. The engineer passes `guaranteeBlockRendered` into the prompt.

**(e) `city_prefix`: it is already a hard gate in every rendered field; extend it to ל and מ, and build the place phrases in code.**
- **Today**: `cityPrefixHit` runs on every field, and any hit in a rendered field blocks. Both M2b.1d hits were in `responseTimeBadge`, which doesn't render, so they were correctly warnings. Don't add `city_prefix` to `ALWAYS_BLOCKING_RULES`. Blocking invisible text spends repair budget on nothing the reader sees.
- **Why it is a real error**: a locative list repeats its preposition on every town. "בחולון ובת ים" reads as "in Holon, and Bat Yam", and ב-initial towns hide the missing letter. The forms are "בחולון ובבת ים", "לבני ברק", "מבאר שבע".
- **Extension (Noa)**: the same rule for ל and מ. The first place's locative letter is the last letter of its prefix (ב, ל or מ), and every later place in the same list needs that same letter as the last letter of its prefix.
- **List joins only**: a later place belongs to the list only when the text between it and the previous place is ", " or a single space with the place's prefix starting with ו. This keeps "מחולון ועד בת ים" and "מחולון לבת ים" correct (neither is a list). The current ב check has no join condition. Applying the join condition to ב as well loses no M2b.1d hit, since both were list joins.
- **Build in code (Noa's proposal, agreed)**: wherever a field is a fixed template over the owner's area, build it from the area array instead of letting the model type it:
  - the trust-bar area tile: no prefix, joined with ", " and a final ו ("חולון ובת ים"; "תל אביב, גבעתיים ורמת גן")
  - the place part of `responseTimeBadge`: the preposition on every town ("בחולון ובבת ים")
  - Plain concatenation is correct for every town, including the ב-initial ones (ב + "בת ים" = "בבת ים"; ו + ב + "בת ים" = "ובבת ים"). No town needs a special case.
- **`bInitialPlaces`**: needed only for C5 (the model writes free-prose lists itself) and for the engineer's tests. It is not a gate input. It lists ב-initial municipalities and large towns. Hyphenated names (Noa ruling): write them with the maqaf (U+05BE), never an ASCII hyphen, and list them under the name owners actually type. So "באקה אל־גרביה" is added (a city), while "בנימינה" stays as typed instead of the official "בנימינה־גבעת עדה". Tests should treat a space, an ASCII hyphen and a maqaf as the same separator, as the existing place-hyphen check (`placeHyphenHit`) already does.

~~~json
{
  "cityPrefixLetters": ["ב", "ל", "מ"],
  "cityPrefixListJoins": [", ", " ו"],
  "placeListBuild": { "separator": ", ", "lastJoin": "ו", "trustTilePrefix": "", "badgePrefixOnEveryPlace": true },
  "bInitialPlaces": ["בת ים", "בני ברק", "באר שבע", "בית שמש", "בית שאן", "ביתר עילית", "בית דגן", "באר יעקב", "בנימינה", "בני עי״ש", "בסמת טבעון", "בית אל", "בית ג׳ן", "באקה אל־גרביה"]
}
~~~

**(f) Fact cap on one scroll: a hard gate, by fixing the counting scope of the existing `fact_repeat`.** Both counters exist already. What's wrong is what they count:
- **Scope**: count only the page's rendered fields. Today the counters also run over `aboutBlurb` and `responseTimeBadge`, which is the source of all 24 warnings. Field order then decides which field gets blamed, and invisible text uses up the reader's budget.
- **Phrase facts** (warranty, licence and other worded proof points): at most 3 rendered fields per page, and **the trust bar counts as one** on research sites. The reader sees the tile, and the old reason for exempting it was a generation detail, not a reading one. `guaranteeBlock` and `responseTimeBadge` stay exempt (they don't render).
- **Digit facts** (years, months of warranty, licence number, minutes): keep `FACT_REPEAT_MAX` at 2. It is already within the cap of 3, and a number said three times is louder than a phrase said three times. If Adam wants one uniform 3, raising it is a one-line change, and I wouldn't object.
- **On M2b.1d**: plumber-1's warranty is in 3 rendered fields (hero subheadline, trust bar, about body), so it passes. The rescore gives the full count.

~~~json
{
  "factCountScope": "rendered fields of the page only",
  "factRepeatMax": 2,
  "factPhraseRepeatMax": 3,
  "factPhraseExemptFieldsResearch": ["guaranteeBlock", "responseTimeBadge"]
}
~~~

**`warrantyDefiniteBareDuration` (Noa's slip 1): a hard gate, narrowed from Noa's pattern.** Noa proposed failing every "אחריות" plus a bare duration without ל or של. Bare indefinite "אחריות שנה", "אחריות שנתיים" and "אחריות 6 חודשים" are standard trade Hebrew, and the hebrew-plumber owner wrote "אחריות שנה על כל עבודה" himself. As a gate it would fail most trust bars and the owner's own words. The real error is the definite form: "האחריות שנה" is a broken construct. So the gate fails the definite form only, in every rendered field. The indefinite stays allowed, and the ל form is preferred in running sentences (C4).

~~~json
{
  "warrantyDefiniteBareDuration": {
    "pattern": "(?<![\\u05D0-\\u05EA])[ובלמכש]{0,2}ה(?:אחריות|ערבות)\\s+(?:שנה|שנתיים|חודש|חודשיים|חצי שנה|\\d+\\s*(?:שנים|שנה|חודשים))(?![\\u05D0-\\u05EA])",
    "flags": "u",
    "fields": "every rendered field"
  }
}
~~~

**Sentence-final period (Noa's slip 3): a code fix plus an assertion, no gate.**
- **Sentence fields**: each `serviceDetails[].description` and `aboutPageBody` ends with "." when it doesn't already end with . ! or ?. Code appends it.
- **Label fields** never end with ".". Code strips a trailing ".". The label fields are `heroHeadline`, `heroCta`, `trustBarItems[]`, `servicesHeadline`, `serviceDetails[].name`, `aboutPageHeadline`, `formHeadline`, `stickyBarLine`, `responseTimeBadge` and `guaranteeBlock`.
- **`heroSubheadline` is untouched.** It is sometimes two sentences (electrician-2), and Noa owns that case.
- **Assertion**: after the fix, every sentence field ends in . ! or ?, and no label field ends in ".".
- This is punctuation only. The engineer adds no Hebrew.

~~~json
{
  "sentenceFinalPeriodFields": ["serviceDetails[].description", "aboutPageBody"],
  "noFinalPeriodFields": ["heroHeadline", "heroCta", "trustBarItems[]", "servicesHeadline", "serviceDetails[].name", "aboutPageHeadline", "formHeadline", "stickyBarLine", "responseTimeBadge", "guaranteeBlock"]
}
~~~

**Remaining warnings, and whether the reader sees them:**
- **`fact_repeat` (24)**: all in unrendered fields. They disappear with the (f) scope fix.
- **`city_prefix` (2)**: both in the unrendered badge. They disappear with the (e) code build.
- **`signature_repeat:lineByLine` (7, electricians)**: a reader-visible tic only when it is three in a row. In electrician-2, the hero "שורה־שורה" and the subheadline "מסביר כל שורה בהצעה" are 2 of the allowed 2. The third, word for word, is in `aboutBlurb`, which doesn't render. No change.
- **`sticky_naming:unnamed` (2)**: `stickyBarLine` doesn't render, and a homeowner doesn't need the business name in "נזילה? דבר איתי". No change.

### 23.3 Prompt rules for M2b.2 (ready to paste)

These apply on pages that render the about section and the service cards (the homepage and the services hub), except C4 and C5, which apply on every page. Sections 19, 20 and 22 still apply. C1 replaces the example at the end of B6. C2 replaces the option list in B5.

- **C1 — His tool, not a tool.**
  - If his usp names a tool (a camera, acoustic equipment, a thermal camera), the about body names that tool and what he does with it, in his trade's plain words.
  - If his usp names no tool, describe the check he does with his hands and eyes. Never add equipment he didn't name.
  - Never name a tool from another trade or another owner. Never copy a scene from these instructions.
- **C2 — About headline: the method or the place, never a number.**
  - The trust bar already gave the years and the warranty. This headline must not repeat any number or any item from the trust bar.
  - Build it from one of:
    - what he does with his tool or his hands, in the first person, at most 6 words
    - one town from his area with his trade, never the full list of towns
  - His first name may come first (only when it is written in Hebrew), followed by one of the above.
  - At most 7 words. B5's bans still apply.
- **C3 — Say the explanation once.**
  - The sentence that explains how he works ("explains what he found, and only then starts") appears once on the page: in the about body, or in card 1, never both.
  - No card repeats a phrase of the about body, and no two cards share a phrase. Each card ends on its own result, in its own words.
- **C4 — Warranty: once in prose, said correctly.**
  - Count before you write: the warranty may appear at most 3 times on the page, and the hero subheadline and the trust bar count.
  - If the guarantee block is rendered on this page, don't end the about body on the warranty.
  - In a full sentence, write the duration with ל: "אחריות לשנה", "אחריות לשנתיים", "אחריות לשישה חודשים". Never "האחריות שנה".
  - A warranty is received, never seen: "ומקבל אחריות לשנה", not "רואה את האחריות".
  - In the trust bar, the bare form is fine: "אחריות שנה".
- **C5 — Towns: the preposition on every town.**
  - In any sentence that lists his towns, repeat the preposition (ב, ל or מ) on every town: "בחולון ובבת ים", "לרמת גן ולגבעתיים".
  - A town that starts with ב still takes the preposition: "בבת ים", "בבני ברק", "מבאר שבע".
  - The trust-bar area tile is built for you. Don't write it.
- **C6 — Card punctuation.** Every card description is one full sentence ending with ".". Labels and headlines never end with ".".

### 23.4 Gate or prompt, and the eval

Gates vs prompt-only in section 23:
- **New hard gates**:
  - `uspToolRequired`
  - `foreignTool` (always blocking)
  - `aboutHeadlineNoTrustRepeat`
  - `aboutCardEcho`
  - `warrantyDefiniteBareDuration`
  - the ל and מ extension of `city_prefix` with the list-join condition
  - the rendered-fields scope for both `fact_repeat` counters, with the trust bar counted in the phrase cap
- **Warn-only, then decide**: `cardPhraseEcho`.
- **Code, no gate**: the place-list build (trust tile and badge) and the sentence-final period with its assertion.
- **Prompt-only**: C1–C6, and condition (d).

The eval: a free rescore first, then a targeted run of 8, not the full 18.
1. **Rescore the 18 saved M2b.1d records with the new gates (zero cost).**
   - Expected: `uspToolRequired` on plumber-1, -2 and -4; `foreignTool` on plumber-2; `aboutCardEcho` on plumber-1 and -2; `aboutHeadlineNoTrustRepeat` on about 16 homepages; `warrantyDefiniteBareDuration` on hebrew-plumber-1; zero `fact_repeat` and zero `city_prefix`.
   - Any hit outside these is an overfire. Send it back to me before the paid run. Also check every `cardPhraseEcho` hit by hand.
2. **Targeted generation run (about US$1.41 at the M2b.1d rate of US$0.177 a run).**
   - plumber-1 to -4 (C1 and C3), split-hours-1 (acoustic still required, no camera), electrician-2 (C2 without a tool; the "בלי קפיצות" set), and hebrew-plumber-1 and -2 (C2 with a Hebrew name, C4).
   - Four plumbers alone (about US$0.71) would not test C2, which changes every niche's headline, or the Hebrew-name case.
   - Acceptance: 8 of 8 valid; the camera named in all four plumber about bodies; no acoustic stem outside split-hours.
3. **A full 18-run eval only if a targeted run fails**, or if `cardPhraseEcho` is promoted to a hard gate.
4. The code changes (place build, periods, scope fix) are deterministic. Unit tests prove them, and they need no eval.

Handoffs:
- **Noa**: proof the `he` tool stems, `bInitialPlaces`, the C4 and C5 example forms, and the narrowed warranty pattern.
- **Yonatan**: no keyword anchor is touched. The about headline was never an anchor, but confirm C2's single-town option is welcome.
- **Engineer**: everything above is data, punctuation or counting scope. There is no new Hebrew to author outside the JSON blocks and the C rules quoted here.
