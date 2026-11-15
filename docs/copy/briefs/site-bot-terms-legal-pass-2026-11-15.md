# Site Bot terms: interim legal pass (2026-11-15)

**Who decided what:** Fable 5.2, acting as WAO's interim lawyer in the founder's seat, decided the legal content below (full reasoning: docs/legal/fable52-legal-pass-2026-11-15.md). You write the Hebrew. Register: the existing terms file `docs/legal/site-bot-terms-of-use.md` — plain legal Hebrew, same style and structure as the lines around each change. Change only what is listed; keep table syntax (`|` cells) and markdown exactly.

**Changes (facts to state exactly):**
A. §8 copy: after 12 paid months (cumulative) as a client, one static copy of the site is free. Before that: a one-time 900 ₪ + VAT, paid in advance, against a tax invoice. Requested in writing, while a client or until the site goes offline.
B. §8 30 days: the site stays online 30 days from the end of the last paid month, then goes offline. Exception: on a 14-day cancellation with a pro-rata refund (§7), the 30 days run from the cancellation date.
C. §16 support: support is in writing only — through the message box in the personal area (account page) or by email to eitan@wao.co.il. No response time and no "we do not commit" sentence. (A 14.11 draft exists in docs/copy/site-bot-terms-s16-support-2026-11-14.waocopy.json — reuse it if it says exactly this.)
D. §6: insert BEFORE the line "הדומיין ופרופיל העסק..." a sentence: the free address ending in wao.co.il belongs to WAO; the client may use it free of charge for as long as they are a client; it ends with the site and cannot be transferred. And make clear that "the domain" in the following line means a domain registered in the client's name.
E. Processors (§5 table, §10 table, §12 list): add Google (Gemini API) as the main language-processing provider — site texts, the bot's conversation, review-reply suggestions — processing outside Israel including the US. Narrow the Alibaba Cloud (Qwen) rows to "backup language processing". Name Resend as the email-sending provider (US), including lead notifications to the client. Generalise the Cloudflare rows to hosting, deployment, file storage and DNS (and the matching §10 Cloudflare closing line). Keep the payment provider generic.
F. §10 enquiries line: WAO stores the enquiries in the client's account and passes them to the client, including by email to the address given at sign-up; the client is the owner of this data and responsible for its use; WAO acts on the client's behalf only.
G. §18 termination: "your data" means the details the client supplied and their enquiries; the site copy is governed by §8.
H. Version + date: add "version 1.1" next to the last-updated line and set the date to 15.11.2026.

**Current lines (copied byte-exact from the file):**
- line 79:לאחר 12 חודשים שבהם היית לקוח בשירות, תוכל לקבל עותק סטטי של האתר שלך ללא תשלום; לפני כן — בתשלום חד-פעמי.
- line 71:לאחר כניסת הביטול לתוקף, האתר נשאר זמין 30 ימים נוספים, ולאחר מכן מפסיק להיות זמין.
- line 161:תמיכה: בדוא״ל, בכתובת eitan@wao.co.il. זמן מענה משוער: עד 24 שעות בימי עסקים.
- line 57:הדומיין ופרופיל העסק ב-Google נשארים שלך בכל מקרה.
- line 40:| Alibaba Cloud (מודלי Qwen, אזור סינגפור) | עיבוד שפה | כתיבה וניתוח של טקסטים לאתר ושל תגובות לביקורות |
- line 114:| Alibaba Cloud (מודלי Qwen, אזור סינגפור) | עיבוד שפה לכתיבה וניתוח | תנאי השירות של הספק |
- line 44:| ספקי סליקה ודוא״ל כלליים | חיוב ושליחת הודעות | עיבוד תשלום ושליחת הודעות שירות |
- line 94:- פניות שלקוחות שלך משאירים דרך טופס יצירת הקשר באתר; WAO מעבדת פניות אלה מטעמך, אך ורק לשם העברתן אליך.
- line 169:כל צד רשאי לסיים את ההתקשרות. עם הסיום: תיפסק גישתך לשירות בהתאם לסעיף 8; גישת הניהול של WAO לפרופיל העסק ב-Google תוסר; ונתוניך יימחקו או יימסרו לך, לפי בחירתך, בתוך 30 ימים, למעט מה שנדרש לשמור על פי דין ונתוני תוצאות ללא פרטים מזהים כמפורט בסעיף 10.
- line 3:עודכן לאחרונה: 11.11.2026
- line 37:| Cloudflare Pages | אירוח ופריסה | פרסום האתר על תשתית Cloudflare Pages |
- line 37:| Cloudflare Pages | אירוח ופריסה | פרסום האתר על תשתית Cloudflare Pages |
- line 38:| Cloudflare DNS | ניהול רשומות | ניהול רשומות לכתובת האתר: תת-דומיין תחת wao.co.il, או דומיין הרשום על שם הלקוח, כאשר דומיין כזה מחובר בהסכמתו |
- line 111:| Cloudflare Pages | אירוח ופריסת האתר | תנאי השירות של הספק |
- line 112:| Cloudflare DNS | ניהול רשומות DNS | תנאי השירות של הספק |
- line 120:עיבוד באמצעות Cloudflare מתבצע בהתאם ל-Data Processing Addendum של Cloudflare ולתנאי השירות שלה.
- line 135:**ספקי משנה מאושרים ל-Site Bot:** Cloudflare Pages, Cloudflare DNS, Google Business Profile, Alibaba Cloud (מודלי Qwen, אזור סינגפור), DataForSEO, NeuronWriter ו-Google Places API, וכן ספקי הסליקה והדוא״ל הכלליים.

(Read the whole file for §12's processor list and any other Cloudflare/Alibaba mention, and patch them consistently.)

**Return JSON only:** {"patches":[{"file":"docs/legal/site-bot-terms-of-use.md","old":"<exact full current line, unique>","new":"<new line(s); use \n for an inserted extra line>","why":"..."}]}
