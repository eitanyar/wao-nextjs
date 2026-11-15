# /google-ads: money and commitment lines in plain Hebrew (2026-11-15)

**Why:** Fable 5.2's clarity review (docs/copy/reviews/fable52-hebrew-clarity-2026-11-15.md, items 1, 2, 10, 11) found that a customer can misread the refund promise, when he pays, and the 15-leads/60-days line. Facts stay exactly the same; only the wording changes.

**Reader:** Israeli one-man trade business owner, busy, on a phone, allergic to legal shorthand. Singular male.

**The facts (do not change any of them):**
- Management fee {net} ₪ + VAT per month, charged on sign-up. The ad budget is paid by the client straight to Google, on his own card, only when ads run.
- Refund of the management fee: he does not have to give a reason, but three conditions apply exactly as the current lines state them (budget of at least 1,500 ₪ a month; request within 7 days after the first 30 days end; once per customer, i.e. no earlier refund). Keep the conditions next to the promise, as a short list.
- The switch to chasing real leads happens when about 15 real leads build up within a rolling 60-day window; at the minimum budget this usually takes two to three months. Explain it so the two numbers don't read as a contradiction.

**Current lines to replace (copied byte-exact from `docs/copy/google-ads-r2-final-candidate-2026-11-12.txt`):**
- line 37:offer.refund :: אם אחרי 30 הימים הראשונים לא תרצה להמשיך, דמי הניהול חוזרים אליך בלי שנשאל למה. ואם המודעה בכלל לא עולה, ההחזר מגיע בלי שתבקש.
- line 38:offer.refund_terms :: ההחזר מותנה בתקציב של לפחות 1,500 ₪ בחודש, בבקשה עד 7 ימים מסוף 30 הימים הראשונים ובלי החזר קודם.
- line 56:faq[3].a :: את דמי הניהול, 249 ₪ + מע״מ, בלי סיבה. התנאים: המודעה הראשונה עלתה, במשך 30 הימים הראשונים אחריה הוצאת לפחות 1,500 ₪ על פרסום, לא קיבלת את ההחזר הזה קודם וביקשת תוך 7 ימים מסוף התקופה. ימים שגוגל מעכב את החשבון לבדיקות לא נספרים. ההחזר הוא על דמי הניהול בלבד. אם המודעה בכלל לא עולה, הכסף חוזר בלי שתבקש.
- line 66:faq[8].a :: התשלום מתחיל בהרשמה. ה־249 ₪ + מע״מ הם עבור הניהול, ותקציב הפרסום יורד ישירות לגוגל לפי הקמפיין.
- line 73:phases.items[1] :: כשמצטברות בערך 15 פניות אמיתיות בתוך 60 ימים, הקמפיין עובר לבד למצב פניות ורודף אחרי פניות אמיתיות, לא אחרי קליקים. בתקציב המינימום זה בדרך כלל לוקח חודשיים־שלושה.

**Rules:** keep the `{net}` token exactly; numbers stay identical; no new promises; plain verbs instead of legal shorthand ("צריך לבקש תוך 7 ימים…"); "לחודש" for monthly prices.

**Return JSON only:** {"patches":[{"file":"docs/copy/google-ads-r2-final-candidate-2026-11-12.txt","old":"<exact full current line>","new":"<new line>","why":"..."}]}  — each `old` must be the complete current line copied byte-exact, so a str.replace finds it exactly once.
