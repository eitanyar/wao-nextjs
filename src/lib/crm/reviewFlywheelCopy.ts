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
  const thankYouLine = `שמחתי לעזור לך היום, כאן ${businessName}.`;
  return [
    `היי ${customerName},`,
    thankYouLine,
    `אם היית מרוצה, אשמח מאוד אם תשאיר לי ביקורת קצרה בגוגל:`,
    reviewLink,
    `זה ממש עוזר לעסק קטן כמו שלי. תודה רבה! 🙏`,
  ].join('\n');
}

/**
 * Resolve a Google "Write a review" deep link.
 * Pre-formatted shortlinks / URLs (http://, https://, g.page/) pass through untouched;
 * a raw Google Place ID (e.g. ChIJ...) becomes the canonical writereview URL.
 */
export function buildGoogleWriteReviewUrl(placeIdOrShortLink: string): string {
  const value = placeIdOrShortLink.trim();
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('g.page/')) {
    return value;
  }
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(value)}`;
}

/**
 * Clean an Israeli phone number for wa.me: strip non-digits and the leading trunk
 * zero, then prefix the 972 country code. Same strip logic as
 * src/lib/geo/whatsapp.ts buildWaLink (phone.replace(/\D/g, '')), extended with
 * leading-zero handling per spec 2026-08-27_006.
 */
function cleanIsraeliPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `972${digits.replace(/^0+/, '')}`;
}

/**
 * One-tap WhatsApp deep link for the owner to send the ready-made review request
 * straight to their customer (pre-filled message). WAO never messages the
 * end-customer directly — the owner holds that consent relationship (see
 * file-header note re: Privacy Protection Law Amendment 13).
 */
export function buildCustomerReviewWaLink(customerPhone: string, opts: ReviewFlywheelForwardTemplateOptions): string {
  const message = buildReviewForwardTemplate(opts);
  return `https://wa.me/${cleanIsraeliPhone(customerPhone)}?text=${encodeURIComponent(message)}`;
}
