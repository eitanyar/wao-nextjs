# Hebrew clarity pass: Site Bot, Ads Bot, generated client site

The marketing pages read well. The problems sit in the money and commitment fine print and in the audit-result screens. Quotes are copy-pasted; where a string is long I quote an exact excerpt.

| # | Where + current string | Problem | Sev | Direction for the copywriter |
|---|---|---|---|---|
| 1 | `/google-ads` refund small print: "ההחזר מותנה בתקציב של לפחות 1,500 ₪ בחודש, בבקשה עד 7 ימים מסוף 30 הימים הראשונים ובלי החזר קודם." | "בבקשה" reads as "please", not "by a request". "ובלי החזר קודם" is cryptic. Legal shorthand on a money promise. | P1 | Three plain conditions with verbs, e.g. "צריך לבקש תוך 7 ימים…". Say "once per customer" in plain words. |
| 2 | `/google-ads` FAQ: "את דמי הניהול, 249 ₪ + מע״מ, בלי סיבה. התנאים: המודעה הראשונה עלתה" and the promise "דמי הניהול חוזרים אליך בלי שנשאל למה." | "בלי סיבה" sounds like "for no reason". The headline promise reads unconditional, then four conditions appear elsewhere. | P1 | One sentence: you don't have to explain, but there are three conditions. Put them next to the promise as a short list. |
| 3 | Three places describe the no-domain case differently. Landing FAQ: "אם האתר על כתובת שלנו". Checkout: "הוא עולה קודם בכתובת זמנית של WAO". Intake: "תקבל מאיתנו כתובת חינם שמסתיימת ב־wao.co.il" | "Temporary" versus "free" versus "ours". The owner can't tell whether he must buy a domain later. | P1 | Pick one story and one term and use it in all three. If the WAO address can stay forever, drop "זמנית". |
| 4 | Checkout `domainLine`: "תוך שלושה ימי עסקים מרגע שנקבל גישה לדומיין" and "את הדומיין אתה קונה ומחדש בעצמך" | "גישה לדומיין" is jargon; he doesn't know what he must hand over. The extra domain cost appears only at checkout, not on the landing page. | P1 | Say what he actually does ("נשלח לך הסבר קצר מה לעשות"). Mention on the landing FAQ that a domain costs separately. |
| 5 | `/site-bot` FAQ: "האתר נשאר באוויר 30 ימים. אפשר לקנות עותק שלו, ואם שילמת 12 חודשים תקבל אותו חינם." | No price for the copy (the Ads page states 900 ₪). Unclear whether 30 days counts from the cancel click or from the end of the paid month. | P1 | State the price and the start point of the 30 days. |
| 6 | `/site-bot` FAQ: "האתר עולה ראשון, והפרופיל, הביקורות והדוח מצטרפים בחודשים הראשונים." | The hero sells all three together; this buried line says two of them come later, with no date. He pays 199 from day one. | P1 | Say plainly what he gets in week one and what arrives by when. Move it near the price. |
| 7 | How to request a change. Landing: "אם יש שינוי, שולחים הודעה לבוט." and "הודעה אחת, ואנחנו מעדכנים גם באתר וגם בפרופיל." Account box: "בן אדם מהצוות שלנו קורא כל הודעה." | Bot or person? A message where? He doesn't know what to do next. | P1 | Name the one channel (the box on his account page) and who reads it, the same way everywhere. |
| 8 | Free audit results: "אנחנו נכתוב את זה כמו שצריך — בדיוק בשביל זה אנחנו כאן." and "וזה מה שאנחנו מסדרים בשבילך." | On a free check this sounds like WAO will fix it for free. | P1 | Mark it as part of the paid service ("זה חלק מהשירות שלנו ב־199 ₪"), or point to the free self-fix. |
| 9 | Audit `SB_UNKNOWN_VERIFY`: "כדי לסגור ״לא ידוע״ צריך ביסוס מתאים: האישור שלך, מקור שתספק או בדיקה שאושרה בנפרד." | Bureaucratic and translated; an internal rule shown to the customer. Incomprehensible. | P1 | Delete, or one line: check in your profile, and tell us if it's there. |
| 10 | `/google-ads` FAQ: "התשלום מתחיל בהרשמה. ה־249 ₪ + מע״מ הם עבור הניהול, ותקציב הפרסום יורד ישירות לגוגל לפי הקמפיין." | "לפי הקמפיין" says nothing. Unclear when Google starts charging and who charges which card. | P1 | Two sentences: we charge 249 on sign-up; Google charges your card only once ads run. |
| 11 | `/google-ads`: "כשמצטברות בערך 15 פניות אמיתיות בתוך 60 ימים" then "בתקציב המינימום זה בדרך כלל לוקח חודשיים־שלושה." | Reads as a contradiction: 15 within 60 days, but it takes up to three months. | P1 | Explain the rolling window in plain words, or drop the "60 days" number. |
| 12 | `/account/subscription`, signed out: "העמוד הזה נפתח רק עם קישור תקף מהמייל ששלחנו לך. אם הקישור אבד, בקש קישור חדש בטופס למטה." | Someone who came to cancel isn't told this is the place. "קישור תקף" is formal. | P1 | Open with what the page is for (manage or cancel the subscription), then how to get in. |
| 13 | Sign-up research step: "כמה חיפושים יכולים להתאים לשני שירותים שונים — תגיד לי אם לחבר או לפצל לדפים." | Asks a plumber an SEO decision in SEO words. He can't answer. | P1 | Ask about the business, with his real example: "X ו-Y זה אצלך אותה עבודה או שתיים נפרדות?" |
| 14 | Audit uses two status sets. Journey copy: "מאושר, לא עבר או לא ידוע". Scorecard: "בסדר", "שווה תיקון", "לא ראינו". | Same thing, two vocabularies on one page. | P2 | Keep the scorecard set (it's spoken Hebrew); remove the other. |
| 15 | Audit: "לא עבר — הסעיף לא עמד בבדיקה, אבל המידע עדיין יכול להיות קיים" | Self-contradicting: it failed, but maybe it didn't. | P2 | "לא מצאנו את זה בפרופיל. אם זה שם, תגיד לנו." |
| 16 | Audit: "הנה פרטי הפרופיל הזמינים לבדיקה, עם סימון ברור לכל סעיף." and "לפי המידע שזמין לבדיקה" | Clerk register, translated-sounding ("available for review"). The whole `auditJourneyCopy.ts` file is in this voice. | P2 | Rewrite the file in the scorecard voice ("בדקנו שישה דברים. הנה מה שמצאנו."). |
| 17 | Audit no-match: "אנחנו לא מנחשים פרטים ולא ממציאים ממצאים." and "הבדיקה לא כותבת כלום בפרופיל שלך, וגם לא מבטיחה דירוג או חשיפה." | Internal QA rules leaking into customer copy; defensive. | P2 | Cut the first. Keep at most "אנחנו לא משנים כלום בפרופיל שלך." |
| 18 | Audit privacy note: "אנחנו לא משתמשים במידע לשום פנייה שלא קשורה לבדיקה." and "הבדיקה מתבססת על מידע מ-Google Places." | Legalese. "פנייה" here means "contacting you", while elsewhere it means a lead. "Google Places" is jargon. | P2 | "לא נפנה אליך בשום נושא אחר." and "המידע מגיע מגוגל." Keep the 30-day deletion fact. |
| 19 | Scorecard, six times: "זו לא תקלה — זה פשוט לא גלוי מכאן." with "מבחוץ" | "From outside" and "not visible from here" are unclear. | P2 | "את זה רואים רק מתוך החשבון שלך בגוגל." |
| 20 | Scorecard: "הפרופיל שלך עבר __PASSED__ מתוך __TOTAL__ בדיקות — נקודת פתיחה טובה, וכל השאר אפשר לתקן." | False praise when the score is 1 of 6; reads as automatic flattery. | P2 | Neutral line, or two variants by score. |
| 21 | Scorecard not-found: "ככה או ככה, זו תשובה חשובה. אם אין פרופיל — אין מה לתקן — יש מה לבנות. וזו בדיוק נקודת ההתחלה הנכונה." | Filler and slogan rhythm; double dash. Doesn't say what to do next. | P2 | Two short sentences: try another spelling; no profile yet means we open one for you. |
| 22 | Audit fix steps: "חזית העסק, פנים, מוצרים או צוות" | Written for a shop, not a tradesman. "פנים" also reads as "face". Contradicts the scorecard's "photos of your work". | P2 | Photos of finished jobs, the van, him at work. |
| 23 | Scorecard: "כמה קטגוריות לא ״מדללות״ אותך — זו אגדה." Audit page: "רואים אם הקטגוריות שלך מכניסות אותך לחיפושים הנכונים." | "קטגוריות" is never explained; "מדללות" is SEO insider talk. | P2 | Gloss once: "קטגוריות — סוגי העבודה שסימנת בגוגל". Drop the myth line. |
| 24 | `/google-ads`: "הקמפיין עובר לבד למצב פניות", "נשאר במצב קליקים", "איזה תקציב חודשי היה פותח את המעבר" | Invented product terms used before they're explained. "פותח את המעבר" is clumsy. | P2 | Define once in everyday words (pay for clicks versus chase real leads), then reuse. |
| 25 | `/google-ads`: "בקשה לקרדיט פרסום בחשבון החדש" | "קרדיט" is heard as credit/installments; could sound like a loan. | P2 | "כסף מתנה מגוגל לפרסום" or "זיכוי", with the caveat kept. |
| 26 | `/google-ads` jargon: "במקום ריטיינר של משרד", "מקושר לחשבון הניהול שלנו", "לחיצת וואטסאפ מדף הנחיתה" | Agency words. "דף נחיתה" is never glossed. | P2 | "תשלום חודשי קבוע למשרד"; "אנחנו מנהלים אותו, הוא שלך"; gloss the landing page once as the page the ad opens. |
| 27 | `/site-bot` sections 1–3, e.g. the block starting "הלקוח מקליד את הבעיה שלו, וגוגל מחפש לו עמוד שמדבר עליה." | About 90 words in one block on a phone. Good sentences, too many per block. | P2 | Cut each to 3–4 sentences, or break into two short paragraphs. |
| 28 | `/site-bot`: "לעסק של אדם אחד אין משהו טוב מזה." | Comes right after the "כלום" row, so "מזה" can point at "nothing". | P2 | Name the thing: "…אין משהו טוב יותר ממקום אחד שעושה את שלושתם." |
| 29 | `/site-bot` comparison: "מערכת בנייה עצמית" and "כלי בינה מלאכותית לבד" | Abstract category names; he knows these by brand. "לבד" is ambiguous. | P2 | "לבנות לבד בוויקס", "רק ChatGPT". |
| 30 | `/site-bot` FAQ: "להעביר הודעת ביקורת אחרי עבודה" | "הודעת ביקורת" isn't a thing people say. | P2 | "לשלוח ללקוח את ההודעה המוכנה שמבקשת ביקורת." |
| 31 | Footer on all pages: "סוכני AI עושים חלק גדול מהמחקר, מהכתיבה ומההקמה" | "סוכני AI" is tech jargon; the pages say "בינה מלאכותית". | P2 | "בינה מלאכותית עושה חלק גדול מ…". |
| 32 | Nav and footer: "אתר ונוכחות מקומית" | "נוכחות מקומית" is translated marketing-speak. **SEO anchor — needs Yonatan.** | P2 | If Yonatan agrees: "אתר וגוגל מפות" or similar. |
| 33 | Checkout: "שלם {total} והתחל מסלול חודשי", "אפשר לבטל אונליין בכל עת.", "החיוב בכרטיס מתבצע היום" | "מסלול" versus "מנוי" elsewhere. "בכל עת" and "מתבצע" are formal; the landing page says "בכל זמן". | P2 | "מנוי חודשי", "מתי שתרצה", "מחייבים את הכרטיס היום". |
| 34 | Sign-up progress lines: "רק כאלה שיכולים באמת לעמוד לבד.", "והוכחות אמיתיות מהשטח", "זה בדיוק הרגע הנכון לבנות." | Internal SEO reasoning shown as progress text; vague to the owner. | P2 | Say what's happening for him: "בודקים מה מחפשים באזור שלך", "בוחרים אילו עמודים לבנות". |
| 35 | Sign-up questions: "בוא נסגור גבולות: מה העסק שלך באמת עושה — ומה הוא לא עושה בשום מקרה?" and "לכל שירות יש משהו שהופך אותו לשונה — ספר לי איך כל אחד עובד אצלך בשטח." | Long and abstract; the second is unanswerable without an example. | P2 | One short question plus a trade example each. |
| 36 | Client-site form template: "תודה! נחזור אליך בהקדם." and "אני מסכים/ה ל" | Plural "we" on a site written as one man ("אני עונה בעצמי"). The slash form is office Hebrew. | P2 | "תודה! אחזור אליך בהקדם." chosen by site voice; consent as "קראתי ואני מאשר את…". |
| 37 | Generated client home: "מה אני מטפל" | Grammar: missing preposition. The generator's own test data has the correct form with "במה". | P2 | Fix at the generator-prompt level so every site gets "במה". |
| 38 | Generated service page: "מדובר בעבודה בשטח, לnot בחנות" — see note below; exact strings: "השירות ניתן אצלך בבית או בעסק, לא במשרד." and "פנה אלינו טלפונית ונחזור אליך בהקדם." | States the obvious; formal. The second is the wrong answer to "pipe burst at night". Test business, but this is the generator's pattern. | P2 | Generator rule: no "not a shop/office" lines; emergency answers say "call now" with the number. |
| 39 | Intake: "משהו קונקרטי, לא רק מקצועי ואמין." and "בוא נבין את אזור השירות — מאילו אזורים" | "קונקרטי" and "אזור השירות" are office words. | P3 | Give an example instead ("למשל: מגיע תוך שעה"). Drop the opening clause of the second. |
| 40 | Small ones: "התוצאה תוך שניות." versus "תוצאה תוך דקה"; "אימייל" versus "מייל"; lead email "והוא מחכה שתתקשר אליו עכשיו."; "02 תוכנית לפני עלייה"; "199 ₪ + מע״מ לחודש" versus "249 ₪ + מע״מ בחודש" | Inconsistent promise and terms; the lead may be a woman; "עלייה" is ambiguous. | P3 | One time promise; "מייל"; gender-neutral phrasing; "לפני שעולים לאוויר"; "לחודש" everywhere. |

Notes on the table:
- **Item 38:** the first quote was mangled by me in the table cell; the exact string is "מדובר בעבודה בשטח, לא בחנות".
- **Scorecard `FIX_*` strings** (e.g. "ברגע שנחבר את הפרופיל שלך"): I did not confirm they are rendered anywhere, so I left them out.
- **Spacing around Latin words** on `/google-ads` ("ב־ Google Ads ,", "Google Partner ,") may be an artifact of the text extraction. Worth one look on the live page.
- **The service-page title** uses a short dash ("–") where the house rule is the long one.

## Consistency

| Same thing, different words | Standardise on |
|---|---|
| "פרופיל גוגל" / "הפרופיל העסקי שלך בגוגל" / "פרופיל בגוגל" / "כרטיס עסקי במפה" | "הפרופיל העסקי בגוגל" at first mention, then "הפרופיל". The landing H1 and title use "פרופיל גוגל": SEO anchor — needs Yonatan. |
| "מנוי" / "מסלול חודשי" | "מנוי" |
| "דומיין" / "כתובת אתר משלך" / "כתובת שלנו" / "כתובת זמנית" / "כתובת חינם" | "דומיין (כתובת האתר)" once, then "דומיין"; one fixed name for the WAO address |
| "עמוד" (landing) / "דף" (sign-up) / "דף נחיתה" (Ads) | "עמוד" for site pages; "דף נחיתה" only on the Ads page, glossed once |
| "בינה מלאכותית" / "סוכני AI" / "הבוט" / "בוט מודעות" / "בוט גוגל לעסק שלי" | "בינה מלאכותית" in prose; one product name per product, the same in nav, footer and page |
| "איש צוות שלנו" / "בן אדם מהצוות שלנו" / "בדיקה אנושית" / "עין אנושית" | "בן אדם מהצוות" |
| "מאושר / לא עבר / לא ידוע" versus "בסדר / שווה תיקון / לא ראינו" | The second set |
| "בדיקה" / "דוח הבדיקה" / "תוצאת הבדיקה", next to "דוח חודשי" and "דוח שבועי" | "הבדיקה" for the free check; keep "דוח" for the recurring reports only |
| "מייל" / "אימייל"; "נייד" / "טלפון" | "מייל"; "נייד" for his own number, "טלפון" for the business line |
| "בכל זמן" / "בכל עת"; "30 ימים" | "מתי שתרצה"; "30 יום" (spoken form) |
| "פנייה" as a lead versus "פנייה" as us contacting him | "פנייה" only for a customer lead |
| "שרברב" / "אינסטלטור" on one generated site | One per site, the one people search. The H1 is an SEO anchor — needs Yonatan. |

## Verdict

- The marketing voice is launch-ready: `/site-bot`, `/google-ads`, the intake chat, the support box and the lead email sound like a real Israeli talking.
- The money and commitment lines and the audit-result screens are not ready: a customer can misread the refund, the domain, what he gets when, and what "לא עבר" means.
- Top 3 fixes: (1) rewrite the Ads refund terms and "when do I pay" (items 1, 2, 10, 11); (2) settle one Site Bot story for domain, after-cancel and what arrives when (items 3–7); (3) rewrite `auditJourneyCopy.ts` in the scorecard voice with one status set (items 8, 9, 14–17).

Next step: brief Tamar (waocopy) with items 1–13 first; items 32 and the profile term go to Yonatan before any change.