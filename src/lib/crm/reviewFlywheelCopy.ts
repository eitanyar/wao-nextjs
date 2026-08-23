/**
 * Review-generation flywheel — WhatsApp copy builders.
 * Same wa.me pattern as src/lib/gmb/whatsapp.ts: WAO notifies the business owner when a lead
 * closes, and hands the owner a ready-to-forward review-request template for their own customer.
 * WAO never messages the end-customer directly (owner already holds that consent relationship —
 * see Israeli Privacy Protection Law Amendment 13 note in VISION.md Gate 1).
 *
 * PLACEHOLDER FILE — Hebrew strings below are English stand-ins pending copywriter pass
 * (handoff/pending/2026-08-22_006_copywriter_review-flywheel-whatsapp-copy.md). Do not ship.
 */

export interface ReviewFlywheelOwnerNotifyOptions {
  ownerName:     string;
  businessName:  string;
  customerName:  string;
  reviewLink:    string; // GBP short review link, e.g. g.page/r/.../review
}

export interface ReviewFlywheelForwardTemplateOptions {
  customerName: string;
  businessName: string;
  reviewLink:   string;
}

/** WAO bot -> business owner, sent when a lead is marked closed. */
export function buildReviewRequestOwnerNotification(opts: ReviewFlywheelOwnerNotifyOptions): string {
  const { ownerName, businessName, customerName, reviewLink } = opts;
  return [
    `היי ${ownerName}`,
    ``,
    `ראיתי שסגרת עכשיו עבודה מול ${customerName}`,
    ``,
    `זה הרגע המושלם לבקש ממנו ביקורת בגוגל — עכשיו הוא הכי מרוצה.`,
    ``,
    `הכנתי לך הודעה מוכנה, רק להעתיק ולשלוח לו:`,
    ``,
    buildReviewForwardTemplate({ customerName, businessName, reviewLink }),
  ].join('\n');
}

/** Ready-to-copy text the owner forwards to their own customer. */
export function buildReviewForwardTemplate(opts: ReviewFlywheelForwardTemplateOptions): string {
  const { customerName, businessName, reviewLink } = opts;
  return [
    `היי ${customerName},`,
    `שמחתי לעזור לך היום, כאן ${businessName}.`,
    `אם היית מרוצה, אשמח מאוד אם תשאיר לי ביקורת קצרה בגוגל:`,
    reviewLink,
    `זה ממש עוזר לעסק קטן כמו שלי. תודה רבה! 🙏`,
  ].join('\n');
}
