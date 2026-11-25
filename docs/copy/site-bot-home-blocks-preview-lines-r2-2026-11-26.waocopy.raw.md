Angle: the preview lines answer a solution-aware owner's "what did you add and what does it do for me," and the visitor-facing H2s answer one question a customer really asks before he hires.

```json
{
  "BLOCK_QA_H2": "מה כדאי לשאול כשמזמינים {trade}",
  "BLOCK_QA_H2_PLAIN": "מה כדאי לשאול כשמזמינים {trade}",
  "BLOCK_OWNER_LEAD_NAMED": "{name} אומר:",
  "BLOCK_OWNER_LEAD": "מי שעושה את העבודה אומר:",
  "PREVIEW_ADDED_SERVICE_PAGES": "כל שירות שלך קיבל עמוד משלו. עבודה אחת לכל עמוד. העמוד מדבר בדיוק על מה שהלקוח צריך, ושום דבר בו לא שולח אותו לחפש אצל מישהו אחר.",
  "PREVIEW_ADDED_REVIEWS": "הביקורות שלך מגוגל עלו לאתר, עם הכוכבים. מי שנכנס רואה מה אומרים עליך אנשים שכבר עבדת אצלם, עוד לפני שהוא מרים אליך טלפון."
}
```

Notes:
- **QA pair:** I chose the meaning "what's worth asking when you hire." It covers both the call and the booking. It also mirrors `מה קובע את המחיר כשמזמינים {trade}`, so the three blocks read as a set. Both keys hold the same string because the brief asks for one meaning. If `_PLAIN` is meant to differ in form, such as markup or a screen-reader variant, tell me what changes and I'll adjust only that.
- **Owner lead:** `{name} אומר:` reads naturally with a first name and with "בעל העסק". The unnamed lead needs no antecedent and no name. Both end in a colon so they sit cleanly before `״{quote}״`.
- **No claim was shrunk.** The reviews line no longer depends on the score being good.

→ Noa for a fresh read.
