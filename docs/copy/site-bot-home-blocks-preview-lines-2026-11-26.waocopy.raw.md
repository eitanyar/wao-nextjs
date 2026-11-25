Angle: the homeowner is problem-aware and mid-decision, so the H2s speak in his words about his symptom, his bill and his questions, while the owner is product-aware at the payment moment, so each preview line ends on what that addition does for his phone.

```json
{
  "BLOCK_WHEN_TO_CALL_H2": "סימנים שאתה צריך {trade}",
  "BLOCK_WHEN_TO_CALL_H2_PLAIN": "סימנים שהגיע הזמן לקרוא לאיש מקצוע",
  "BLOCK_PRICE_DRIVERS_H2": "מה קובע את המחיר כשמזמינים {trade}",
  "BLOCK_PRICE_DRIVERS_H2_PLAIN": "מה קובע כמה תשלם על העבודה",
  "BLOCK_QA_H2": "מה שואלים {trade} לפני שהוא מגיע",
  "BLOCK_QA_H2_PLAIN": "מה שואלים לפני שמתקשרים",
  "BLOCK_OWNER_LEAD": "הוא אומר על זה:",
  "PREVIEW_ADDED_AFTER_TITLE": "מה עוד נכנס לאתר כשאתה מצטרף",
  "PREVIEW_ADDED_SERVICE_PAGES": "עמוד משלו לכל שירות שציינת. מי שצריך בדיוק את השירות הזה מוצא עמוד שמדבר רק עליו, ולא ממשיך לחפש אצל אחרים.",
  "PREVIEW_ADDED_REVIEWS": "הביקורות והדירוג שלך בגוגל, מרגע שתחבר את הפרופיל. לקוח חדש קורא מה אחרים כתבו עליך ומתקשר אליך כבר רגוע.",
  "PREVIEW_ADDED_PHOTOS": "תמונות מעבודות שעשית. מי שנכנס לאתר רואה מה הידיים שלך יודעות לעשות עוד לפני שהוא מדבר איתך.",
  "PREVIEW_ILLUSTRATION_NOTE": "תמונת הרקע בראש העמוד היא להמחשה. תשלח תמונה משלך, והיא תיכנס במקומה."
}
```

**Notes for engineering**

- **The `{trade}` slot.** These lines assume the slot holds the bare singular noun without ה, for example אינסטלטור or חשמלאי. I placed it so it never takes a prefix letter. If the site renders it with the article, use the `_PLAIN` versions.
- **`BLOCK_OWNER_LEAD`.** The phrase "על זה" points back to each block's topic. That makes the same lead work above symptoms, price drivers and Q&A.

**Handoffs**

- The preview lines are founder-facing, so they go to Noa for a fresh read.
- None of these strings touch an SEO anchor.
