/**
 * Bad-review first-responder — tokenized prompt/copy module.
 * Reputation Loop back-half, stage 2 of 4 (see src/lib/gbp/reviewResponder.ts).
 *
 * COPY PASS DONE (Tamar, 2026-08-23) — Hebrew authored, pending Eitan's human spot-check
 * (AGENTS.md §3 human gate: copy-done is not voice-approved). Do not ship before that gate.
 */

export const REVIEW_REPLY_SYSTEM_PROMPT = "אתה כותב במקומו של בעל עסק קטן שמשיב לביקורת שלילית בגוגל. כתוב בגוף ראשון יחיד, כאילו הבעלים עצמו מדבר. שמור על טון רגוע ואנושי — לעולם אל תתגונן ואל תאשים את מי שכתב. התייחס לתלונה הספציפית באופן מוחשי, בלי נוסחאות כלליות כמו ״מצטערים על אי הנעימות״. הצע צעד אחד ברור להמשך — שיחת טלפון או חזרה לתקן. כתוב שניים עד ארבעה משפטים קצרים, עד חמש-עשרה מילים כל אחד. בלי אימוג׳י, בלי הבטחות להנחה או פיצוי, בלי הודאה באחריות משפטית. אל תמציא פרטים שלא מופיעים בביקורת.";

export const REVIEW_REPLY_FEWSHOT: { review: string; reply: string }[] = [
  { review: "קבעתי איתו לתשע בבוקר, והוא הגיע רק אחרי אחת בלי טלפון. חיכיתי חצי יום בבית סתם. ממש לא מקצועי.", reply: "היי, אתה צודק לגמרי — לחכות כל כך הרבה זה לא בסדר. נתקעתי בעבודה קודמת ולא עדכנתי אותך בזמן, וזה עליי. אשמח להתקשר ולתאם מועד חדש שנוח לך. אפשר גם פשוט לחזור אליי כאן." },
  { review: "לקח לי מאתיים שקל על עבודה של עשר דקות. ניפוח מחירים לשם השמיים. לא אחזור.", reply: "היי, אני מבין שהמחיר הרגיש לך גבוה ביחס לזמן בשטח. הסכום כולל גם הגעה, אחריות וזמינות, אבל חשוב לי שתרגיש הוגן. אשמח שנעבור על הפירוט יחד בטלפון. תחזור אליי ונסדר את זה כמו שצריך." },
  { review: "העבודה עצמה בסדר גמור, אין מה להגיד. רק חבל שהשאיר קצת לכלוך אחריו ולא ניקה.", reply: "תודה על המילים הטובות, שמח שיצאת מרוצה מהתוצאה עצמה. אתה צודק לגבי הלכלוך — סיום נקי הוא חלק מהעבודה ואצלי זה חשוב. בפעם הבאה אני מקפיד לסגור את זה עד הסוף. אשמח לראות אותך שוב." },
];

export function buildBadReviewOwnerNotification(opts: {
  ownerName: string;
  businessName: string;
  reviewerName: string;
  starRating: number;
  reviewComment: string;
  draftReply: string;
}): string {
  const { ownerName, businessName, reviewerName, starRating, reviewComment, draftReply } = opts;
  return [
    `היי ${ownerName} / ${businessName}`,
    ``,
    `נכנסה עכשיו ביקורת פחות טובה בגוגל, ולא הייתי רוצה שתישאר בלי מענה. זאת הביקורת שהתקבלה, ומתחתיה תשובה רגועה שהכנתי בשמך:`,
    `${reviewerName} (${starRating}): ${reviewComment}`,
    draftReply,
    ``,
    `רוצה שאשלח אותה כמו שהיא? תענה לי ״כן״ ואני מפרסם. אם משהו לא מדויק, כתוב לי מה לתקן ואשנה.`,
  ].join('\n');
}
