# Noa: Ads Bot terms

File read: /home/eitanya/wao/docs/legal/ads-bot-terms-of-use.waocopy.md, against the brief and /home/eitanya/wao/docs/legal/site-bot-terms-of-use.md.

## 1. Verdict
**Pass after fixes.** The structure, numbering and register match Site-Bot. Typography is clean: no ASCII quotes, no double spaces, and the dashes are correctly spaced. The voice is "we" throughout ("WAO" appears only in the title and the legal name).

All decided facts are present:
- ₪249 + VAT, billed at the start of the month, month to month, cancel online any time.
- The ₪1,500 minimum, described as a minimum and not a recommendation.
- Ad spend is never received by WAO and never refunded.
- The 30-day refund with its 3 conditions, the clock from the first live ad, the automatic refund, and "on top of the statutory right, not instead of it".
- The pages policy: 30 days, ₪900, free after 12 months.
- The cancel-day and 7-day warnings, with the pause/repoint offer.
- MCC access removed at the end.
- No results guarantee.

**Statutory rights are kept, never reduced:**
- §7 says "בכפוף לזכויותיך על פי דין", carries the Site-Bot statutory summary word for word (14 days proportional, 4-month extension), and says "בנוסף… ולא במקומה".
- §13 keeps the carve-out. §17 keeps the 30-day notice.

**Defects:**
- [RED] One factual contradiction: §8 says the pages stop when the cancellation takes effect.
- [RED] One liability clause that can be read the opposite way (§13).
- [ORANGE] Several term inconsistencies.
- Two drafting artifacts.

## 2. Fixes (byte-exact old → new)

**F1 [RED] §8: contradicts the 30-day pages policy.**
- old: `ביום הביטול נשלח אליך הודעה על כך שעמודי הנחיתה יפסיקו לפעול לאחר כניסת הביטול לתוקף. נשלח הודעה נוספת 7 ימים לפני הפסקת הפעילות.`
- new: `ביום הביטול נשלח אליך הודעה שמפרטת מתי עמודי הנחיתה יפסיקו להיות זמינים. נשלח הודעה נוספת 7 ימים לפני שעמודי הנחיתה יפסיקו להיות זמינים.`

**F2 [RED] §13: "אינם נכללים בתקרה זו" can be read as uncapped liability for ad spend.**
- old: `מובהר כי סכומים ששילמת ישירות ל-Google במסגרת תקציב הפרסום אינם נכללים בתקרה זו, ולא נחזיר אותם.`
- new: `מובהר כי לצורך חישוב התקרה, סכומים ששילמת ישירות ל-Google במסגרת תקציב הפרסום אינם נחשבים לתשלומים ששילמת לנו.`

**F3 [ORANGE] §2: "מסוג" treats a product name as a category. The weekly report (a decided fact) is missing.**
- old: `הפעלת כלי הגנה מפני הונאות קליקים מסוג Fraud Blocker, ומעקב אחר פעילות הקמפיינים.`
- new: `הגנה מפני הונאות קליקים באמצעות Fraud Blocker, מעקב אחר פעילות הקמפיינים ודוח שבועי.`

**F4 [ORANGE] §2: the participles don't match ("הרשום… ונמצא"), and "חשבון הניהול" differs from "חשבון מנהל" everywhere else.**
- old: `כל לקוח מקבל חשבון Google Ads משלו, הרשום על שמו ונמצא בבעלותו. החשבון מקושר לחשבון הניהול שלנו לצורך הפעלת השירות.`
- new: `כל לקוח מקבל חשבון Google Ads משלו, הרשום על שמו ובבעלותו. החשבון מקושר לחשבון המנהל שלנו (MCC) לצורך הפעלת השירות.`

**F5 [ORANGE] §2: same term.**
- old: `אנחנו ניגשים לחשבון דרך חשבון מנהל, ומסירים`
- new: `אנחנו ניגשים לחשבון דרך חשבון המנהל שלנו, ומסירים`

**F6 [ORANGE] §2: the placeholder `{slug}` would reach the reader verbatim.**
- old: `עמודי נחיתה שניצור עבורך יאוחסנו במערכת שלנו ויפורסמו בתת-דומיין ייעודי, בכתובת מהצורה {slug}.wao.co.il.`
- new: `עמודי נחיתה שניצור עבורך יאוחסנו במערכת שלנו ויפורסמו בתת-דומיין ייעודי תחת wao.co.il.`

**F7 [ORANGE] §3: align with the Site-Bot wording (the lawyer has already seen it), in the "we" voice.**
- old: `אם מצאת אי-דיוק או שגיאה, עליך לדווח לנו, ואנחנו נתקן.`
- new: `אם מצאת בהם אי-דיוק או שגיאה, עליך לדווח לנו על כך, ואנחנו נתקן.`

**F8 [ORANGE] §5: invented option.** The decisions put pages only on the subdomain. Repointing applies to the ads, not the pages.
- old: `- עמודי הנחיתה מתפרסמים בתת-דומיין תחת wao.co.il, אלא אם הופנית כתובת אחרת בהסכמתך.`
- new: `- עמודי הנחיתה מתפרסמים בתת-דומיין תחת wao.co.il.`

**F9 [YELLOW] §5: copy the Site-Bot wording.**
- old: `גישתנו לספקי צד שלישי כפופה לתנאיהם`
- new: `גישתנו לספקי הצד השלישי שלעיל כפופה לתנאיהם`

**F10 [ORANGE] §6: "they aren't a domain registered to you" is a non-sequitur. The decided fact is that the pages belong to the subscription.**
- old: `עמודי הנחיתה שנוצרים עבורך פועלים בתת-דומיין תחת wao.co.il כל עוד השירות פעיל. הם אינם דומיין רשום על שמך.`
- new: `עמודי הנחיתה שנוצרים עבורך הם חלק מהמנוי, ופועלים בתת-דומיין תחת wao.co.il כל עוד השירות פעיל. הם אינם בבעלותך, למעט עותק שתקבל לפי סעיף 8.`

**F11 [ORANGE] §7: "no trial" is decided and stated on the page, but missing here. Site-Bot has it.**
- old: `החיוב מתבצע בתחילת כל חודש. ההתקשרות`
- new: `החיוב מתבצע בתחילת כל חודש. אין תקופת ניסיון. ההתקשרות`

**F12 [ORANGE] §7: "בתוך 7 ימים מתום" can be read as "only during the 7 days after". The decision is a deadline.**
- old: `הבקשה נשלחת אלינו בתוך 7 ימים מתום 30 הימים.`
- new: `הבקשה נשלחת אלינו לא יאוחר מ-7 ימים לאחר תום 30 הימים.`

**F13 [ORANGE] §7: missing definite article.**
- old: `החזר אינו מהווה התחייבות לתוצאות`
- new: `ההחזר אינו מהווה התחייבות לתוצאות`

**F14 [ORANGE] §9: lists as "outside our control" things WAO itself makes or sets (content, landing page, bid).** "דף" also differs from "עמודי". The lawyer may want the list kept broader; this is the internally consistent version.
- old: `תוצאות מושפעות מגורמים שאינם בשליטתנו — תקציב הפרסום, תחרות, שינויי אלגוריתם, מדיניות Google, איכות התוכן, דף הנחיתה, הצעת המחיר ותנאי שוק.`
- new: `תוצאות מושפעות מגורמים שאינם בשליטתנו — היקף תקציב הפרסום, תחרות, שינויי אלגוריתם, מדיניות Google ותנאי שוק.`

**F15 [ORANGE] §10: contradicts the IP-address bullet just above it.** Fraud Blocker does process visitors' personal data.
- old: `- נתונים אישיים של לקוחותיך מעבר לפרטים הנדרשים להעברת פנייה אליך.`
- new: `- נתונים אישיים של לקוחותיך מעבר לפרטים הנדרשים להעברת פנייה אליך ולזיהוי תנועה חשודה, כמפורט לעיל.`

**F16 [ORANGE] §11: "מעבירים מידע מחוץ לישראל" changes the meaning. Copy the Site-Bot wording.**
- old: `חלק מהספקים המפורטים לעיל מעבירים מידע מחוץ לישראל`
- new: `חלק מהספקים המפורטים לעיל מעבדים מידע מחוץ לישראל`

**F17 [YELLOW] §15: adopt the Site-Bot outputs sentence, adapted to the weekly report.**
- old: `החשבון, הקמפיינים, המודעות, מילות המפתח והנתונים ב-Google Ads הם שלך. תכנים`
- new: `החשבון, הקמפיינים, המודעות, מילות המפתח והנתונים ב-Google Ads הם שלך. הפלטים שהופקו עבורך — דוחות, לרבות הדוח השבועי, ניתוחים והמלצות — ניתנים לשימושך העסקי החופשי. תכנים`

**F18 [YELLOW] §7: smoother construct state.**
- old: `ממועד העלייה של המודעה הראשונה לאוויר`
- new: `ממועד עליית המודעה הראשונה לאוויר`

**F19 [ORANGE] Drafting artifacts. Delete both lines before publishing:**
- line 1: `Angle = product-aware business owner reviewing terms. Keep Site-Bot clarity, separate service fee from Google spend, spell out ownership, refund, pages, and no results.`
- line 199: `→ Noa להגהה`

**F20 [YELLOW] Product name. Adam decides.** The page says "Ads Bot". The terms say "בוט הפרסום בגוגל". If Adam picks Ads Bot as the one name, define it once:
- old: `ברוכים הבאים לבוט הפרסום בגוגל, שירות מבית`
- new: `ברוכים הבאים ל-Ads Bot, בוט הפרסום בגוגל, שירות מבית`

**Other notes, no fix needed:**
- §2, §5, §7 and §13 repeat "ad spend goes to Google, we don't refund it" five times. That's acceptable in a legal text; the lawyer may consolidate.
- §7's first paragraph repeats §8's cancellation sentence. Site-Bot has it only in §8.
- **§5 table:** Google Business Profile is listed in §10 and §12 (per the brief) but not here. The lawyer should ask whether Ads Bot touches it at all.
- **§5 table:** "הצעות מחיר" means a quote to a customer in this reader's world. "הצעות מחיר לקליק" is clearer.

## 3. Fact mismatches with the page (Adam)
- **Support:** §16 says email only. The page says Eitan is available in chat.
- **Automatic refund:** §7 limits it to "בשל סיבה התלויה בנו". The decision and the page have no such qualifier.
- **VAT:** the terms say + VAT. The page shows ₪249 with no VAT note.

## 4. Gaps a lawyer will ask about (listed, not filled)
1. **Budget authority.** The MCC lets WAO change his budgets and bids. Does it need his consent to raise spend? Is there a spend cap? Who is liable for ad spend wasted by a bot or WAO error? (The cap clause excludes ad spend, which leaves this open.)
2. **Ad approval and policy responsibility.** Does the client approve the AI-written ads before launch? The onboarding has a review stage. §4 and §14 make him solely responsible for Google-policy compliance of ads WAO wrote.
3. **Refund definitions:**
   - What exactly is "first ad live": served, or approved?
   - How is the "₪1,500 pace" measured, and is it prorated?
   - What counts as "one business": the same ח.פ, owner, or location?
   - Through which channel does he send the request?
   - What if the 30 days span two monthly charges?
   - Can he stack the refund with the statutory proportional refund?
   - By what deadline must WAO launch before the refund is automatic?
   - Mechanics through Takbull: credit invoice, VAT, and how many days until the refund is paid.
4. **Whether business customers count as "consumers"** for the 14-day right, and whether "takes effect at the end of the paid month" fits the statutory timing for cancelling continuous transactions. The same question applies to the Site-Bot terms.
5. **Billing date.** "Start of each month": does a mid-month signup get prorated, or charged on the 1st? Site-Bot bills on the signup anniversary.
6. **Existing accounts.** What if the client brings an existing Google Ads account with history? Who creates the payment profile, and in whose name?
7. **The pages copy:**
   - What license comes with it, given that §15 keeps the code and templates as WAO's?
   - Its format.
   - Is there a deadline to buy (the text says "before the pages go offline")?
   - Do the 12 paid months have to be consecutive, or do they add up?
   - Pages during suspension.
8. **Data deletion vs the pages window.** §18 deletes data within 30 days of termination, which can collide with the 30-day pages window and the buyout window.
9. **MCC unlink.** Exact timing. Who pauses the campaigns once WAO's access is gone?
10. **Privacy on client landing pages.** Fraud Blocker processes visitors' IP addresses, and the form leads come from his customers. Who is the controller, what notice appears on the {slug}.wao.co.il pages, how long are leads kept, and what about current Israeli data-security duties?
11. **Termination by WAO.** On what grounds, and with how much notice? ("כל צד רשאי לסיים" is open-ended, as in Site-Bot.)
12. **Changes to the ₪1,500 minimum.** Is it covered by the §17 30-day-notice rule?
13. **Google's third-party partner policy.** Does it require any client disclosures in the agreement itself (cost transparency, account ownership)? This one is Dror's call, alongside the lawyer.
