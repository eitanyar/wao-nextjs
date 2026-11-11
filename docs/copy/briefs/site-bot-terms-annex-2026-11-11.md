# Brief: revise the Site-Bot terms annex (legal register) — 2026-11-11

**This is legal text, not marketing.** Register: plain, precise Israeli legal Hebrew as in the existing file (no voice, no hype, no storytelling). Keep the existing structure, headings, table format and Markdown. Do not invent facts beyond the list below. Do not cite statutes or regulations.

**Source file (rewrite it in full):** `docs/legal/site-bot-permissions-draft.md` — current text below between the markers. Return the COMPLETE new file as Markdown inside JSON: {"file":"docs/legal/site-bot-permissions-draft.md","content":"<full new markdown>","changes":["one line per change, English"]}.

**Facts to reflect (all verified in the code, 2026-11-11):**
1. Services and access the system uses for Site Bot (replace the table):
   - Cloudflare Pages — hosting and deploying the site.
   - Cloudflare DNS — managing records for the site's address: a subdomain under wao.co.il, or a domain registered in the client's name when one is connected, with his approval.
   - Google Business Profile — manager access that the owner grants by invitation; updating business info, replying to reviews, publishing updates. The owner remains the profile's owner.
   - Language models: Alibaba Cloud (Qwen models, Singapore region) — writing and analysing site texts and review replies.
   - DataForSEO — search data (keywords, search volumes, local search results).
   - NeuronWriter — content analysis against search terms.
   - Google Places API — public business information, for the free audit and for research.
   - Plus the general payment-processing and email providers.
   REMOVE Google Gemini API from the Site-Bot lists (Site Bot no longer uses it).
2. Keep: no Google Ads access, no GitHub, no Google Search Console connection, no GCLID/offline conversions, no write access to advertising accounts.
3. Replace "the site is published under {slug}.wao.co.il; no external domain purchase" with: the site is published under a WAO subdomain or under a domain registered in the client's name.
4. Data collected specific to Site Bot (extend the list): business details the owner provides (business name, owner name, phone, email, address and service area, services, licence number where relevant, years in the field, warranty terms, what sets the business apart); content the system produces; public info about the business from Google and search results; Business Profile data (info, reviews) while WAO is a manager; inquiries left by the client's own customers through the site's lead form — WAO processes these on the client's behalf only, to deliver them to him.
5. New short section "העברת מידע אל מחוץ לישראל": some of the providers above process data outside Israel, including in Singapore and in the United States. Only the data needed for the task is sent. By signing up the client agrees to this transfer. The providers process the data under their commercial terms.
6. No-training commitment, rewritten: WAO does not use client data to train models; processing at the model providers is done on paid commercial plans and subject to their terms. (Do NOT claim the providers themselves never train.)
7. Approved sub-processors for Site Bot: the list in (1) — replace "Cloudflare and Gemini only".
8. End of service (replace the one-line cancellation sentence): cancellation online at any time takes effect at the end of the month already paid for. After it takes effect the site stays online 30 more days, then goes offline. The domain (if any) and the Business Profile stay the client's; WAO's manager access is removed. If a monthly charge fails and is not settled after retries over 7 days, the service is suspended: system services (updates, management, new pages, the bot) stop immediately; the public site stays online 30 more days and then goes offline. Paying the missed month restores the service on the same billing date.
9. Keep the third-party providers disclaimer paragraph, updated to name the providers generically ("ספקי הצד השלישי שלעיל").
10. Status section: keep the 2026-08-01 lawyer note as history, and add that this revision (2026-11-11) updates the provider list and the end-of-service terms and awaits the lawyer's re-approval.

**Current file:**
<<<
# נספח הרשאות ונתונים — Site Bot

**מסמך זה מחליף את סעיפי ההרשאות/נתונים במסמכים הבסיסיים (תנאי שימוש §4, מדיניות פרטיות §2, נספח עיבוד §5) עבור מוצר Site Bot בלבד.**

---

### הרשאות וחיבורים (מחליף תנאי שימוש §4)

בחיבור ושימוש ב-Site Bot אתה מצהיר שאתה מורשה להפעיל את השירות עבור העסק שלך.

ההרשאות והחיבורים שהמערכת משתמשת בהם:

| שירות | סוג גישה | מה זה מאפשר |
|---|---|---|
| Cloudflare Pages | פריסה (Deploy) | פרסום האתר על תשתית Cloudflare Pages |
| Cloudflare DNS | ניהול רשומות | יצירת וניהול תת-דומיין תחת `*.wao.co.il` |
| Google Gemini API | קריאה/כתיבה (עיבוד) | הפקת תוכן וטקסטים לאתר |

**הערות חשובות:**
- האתר מפורסם תחת כתובת `{slug}.wao.co.il`. בשלב זה **אין** רכישת דומיין חיצוני או חיבור ל-registrar.
- אין חיבור ל-Google Ads, Google Search Console, GitHub או לכל פלטפורמת פרסום אחרת.
- אין הרשאות כתיבה לחשבונות פרסום או לדומיינים חיצוניים של הלקוח.

באפשרותך לבטל את השימוש בשירות בכל עת. עם הביטול תוסר הגישה לפריסה ולניהול התת-דומיין בהתאם למדיניות הסיום.

Cloudflare ו-Google הם ספקי צד שלישי. גישתנו אליהם כפופה לתנאיהם, והם רשאים לשנותה או להפסיקה. לא נישא באחריות להפסקה או שינוי כאמור, ובלבד שנפעל באופן סביר להודיע לך.

---

### מידע שנאסף ומעובד (מחליף מדיניות פרטיות §2 + חלקים רלוונטיים)

**מידע הרשמה וחיוב** — כמפורט במדיניות הפרטיות הבסיסית.

**מידע ספציפי ל-Site Bot:**
- תוכן וטקסטים שאתה מזין או שהמערכת מפיקה עבור האתר.
- הגדרות האתר, מבנה העמודים ונתוני פריסה.
- מזהה התת-דומיין (`{slug}.wao.co.il`) ורשומות DNS הקשורות אליו.

**אין איסוף או עיבוד של:**
- נתוני Google Ads / קמפיינים / תקציבים.
- נתוני Google Search Console.
- מזהי קליק (GCLID) או המרות אופליין.
- תוכן מחשבונות צד שלישי אחרים.

**ספקי משנה רלוונטיים:**

| ספק | תפקיד | בסיס |
|---|---|---|
| Cloudflare (Pages + DNS) | אירוח ופריסת האתר, ניהול DNS | תנאי השירות של Cloudflare |
| Google Gemini API | הפקת תוכן | תנאי השירות בתשלום; DPA של Google Cloud |

עיבוד באמצעות Cloudflare מתבצע בהתאם ל-Data Processing Addendum של Cloudflare ולתנאי השירות שלה.

---

### התחייבויות עיבוד (מחליף נספח עיבוד §4–§5)

חלות כל חמש ההתחייבויות של המחזיק כמפורט בנספח העיבוד הבסיסי, כולל:
- עיבוד לפי הוראה בלבד.
- בידוד מלא בין לקוחות.
- איסור אימון (עיבוד Gemini במסלול בתשלום).
- סודיות.
- אבטחה סבירה.

**ספקי משנה מאושרים ל-Site Bot:** Cloudflare ו-Google Gemini API בלבד (בנוסף לספקי הסליקה והדוא"ל הכלליים).

---

### סטטוס

**אושר על ידי עו"ד (2026-08-01):** אין צורך ב-DPA חתום בנפרד עם Cloudflare בשלב זה. המשפט שנוסף לעיל בטבלת ספקי המשנה מספיק. יש לבחון מחדש רק אם Cloudflare תדרוש הסכם נפרד בעתיד בהיקפים גדולים יותר.
>>>
