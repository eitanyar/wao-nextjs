/**
 * Account page (/account/subscription), its magic-link request API and the four client billing emails: customer copy.
 * HEBREW-SAFETY: the engineer never authors Hebrew. Every Hebrew value below was written into this file by a Python
 * script (docs-sourced, asserted counts) from docs/copy/site-bot-account-page-hebrew-2026-11-14.waocopy.json with the
 * byte-exact fixes in docs/copy/reviews/noa-site-bot-account-page-2026-11-14.md applied on top. Three values are pure
 * deletions of an approved string (marked DERIVED). Legacy trial-engine strings stay English in their own files.
 * This module is pure (no fs / db), so client components, the API route and email.ts can all import it.
 */

/** RLM-anchored brand suffix for a Hebrew <title> (bidi rule in CLAUDE.md). */
export const ACCOUNT_TITLE_SUFFIX = '\u200f | WAO';

export const ACCOUNT_PAGE_COPY = {
  metadataTitle: "ניהול המנוי",
  cardUpdateCallbackError: "לא הצלחנו לעדכן את הכרטיס. שום דבר לא השתנה. בקש קישור חדש ונסה שוב.",
  noTokenIntro: "העמוד הזה נפתח רק עם קישור תקף מהמייל ששלחנו לך. אם הקישור אבד, בקש קישור חדש בטופס למטה.",
  linkExpired: "הקישור הזה פג תוקף. קישורים תקפים ל־30 דקות. בקש קישור חדש בטופס למטה.",
  linkUsed: "כבר השתמשת בקישור הזה. בקש קישור חדש בטופס למטה.",
  linkInvalid: "הקישור הזה לא תקין. בקש קישור חדש בטופס למטה.",
  subscriptionNotFound: "לא מצאנו מנוי שמתאים לקישור הזה.",
  headerSubtitle: "ניהול המנוי שלך",
  noticeCardUpdated: "הכרטיס עודכן בהצלחה.",
  noticeCardUpdatedRecharged: "הכרטיס עודכן והמנוי שלך פעיל שוב.",
  noticePastDue: "לא הצלחנו לחייב את הכרטיס. עדכן את הכרטיס כדי שהמנוי יישאר פעיל.",
  rowStatus: "סטטוס",
  rowRecurringAmount: "חיוב חודשי",
  rowCard: "כרטיס",
  rowAccessUntil: "השירות פעיל עד",
  rowNextCharge: "החיוב הבא",
  stateAlreadyCanceled: "המנוי הזה כבר בוטל.",
  stateCancelScheduled: "המנוי שלך בוטל. לא נחייב אותך יותר.",
} as const;

/** Status chip values. Legacy-engine statuses (trialing, expired) are intentionally absent: the page keeps them English. */
export const ACCOUNT_STATUS_LABEL: Readonly<Record<string, string>> = {
  pending: "בהמתנה",
  active: "פעיל",
  past_due: "החיוב לא עבר",
  canceled: "בוטל",
  paused: "מושהה",
};

export const CANCEL_BUTTON_COPY = {
  idle: "ביטול המנוי",
  loading: "מבטלים…",
  errorInvalidToken: "הקישור הזה פג תוקף, או שכבר השתמשת בו. בקש קישור חדש כדי לבטל את המנוי.",
  /** Points at the support box ("above"): render only when that box is on the page. */
  errorGeneric: "משהו השתבש. נסה שוב, או כתוב לנו בתיבה ״בקשה או שאלה?״ למעלה.",
  errorGenericNoBox: "משהו השתבש. נסה שוב בעוד כמה דקות.",
  doneMessage: "המנוי שלך בוטל. לא נחייב אותך יותר.",
  doneAccessUntil: "השירות פעיל עד",
  /** {date} = the paid-through date, formatted with formatAccountDate. */
  confirmQuestion: "לבטל את המנוי? אחרי הביטול לא נחייב אותך יותר, והשירות ימשיך לפעול עד {date}.",
  /** DERIVED (deletion only): confirmQuestion without its ", ... {date}" clause, for a cancel that takes effect at once. */
  confirmQuestionNoDate: "לבטל את המנוי? אחרי הביטול לא נחייב אותך יותר.",
  confirmYes: "כן, לבטל את המנוי",
  confirmBack: "לא, להשאיר את המנוי",
} as const;

export const CARD_UPDATE_BUTTON_COPY = {
  idle: "עדכון כרטיס",
  loading: "מעבירים אותך…",
  errorInvalidToken: "הקישור הזה פג תוקף, או שכבר השתמשת בו. בקש קישור חדש כדי לעדכן את הכרטיס.",
  /** Points at the support box ("above"): render only when that box is on the page. */
  errorGeneric: "משהו השתבש. נסה שוב, או כתוב לנו בתיבה ״בקשה או שאלה?״ למעלה.",
  errorGenericNoBox: "משהו השתבש. נסה שוב בעוד כמה דקות.",
} as const;

export const REQUEST_LINK_COPY = {
  emailLabel: "אימייל",
  submit: "שליחת קישור חדש למייל",
  errorGeneric: "משהו השתבש ולא הצלחנו לשלוח את הקישור. נסה שוב בעוד כמה דקות.",
} as const;

/** Replies of POST /api/subscriptions/magic-link/request; RequestLinkForm shows them verbatim. */
export const MAGIC_LINK_REQUEST_COPY = {
  invalidEmail: "צריך להזין כתובת אימייל תקינה.",
  rateLimited: "יותר מדי בקשות. נסה שוב מאוחר יותר.",
  /** DERIVED (deletion only): the approved line without the support clause; the API has no plan context. */
  success: "אם הכתובת הזאת רשומה אצלנו, שלחנו אליה קישור לעמוד החשבון. שם אפשר לנהל את המנוי, לעדכן כרטיס ולבטל.",
  serverError: "לא הצלחנו לשלוח את הקישור. נסה שוב בעוד כמה דקות.",
} as const;

export const BILLING_EMAIL_COPY = {
  magicLinkSubject: "WAO — ניהול המנוי שלך",
  /** Mentions writing to support: only for a subscription whose account page shows the support box. */
  magicLinkBodyWithSupport: "הקישור הזה פותח את עמוד החשבון שלך. שם אפשר לראות את פרטי המנוי, לעדכן כרטיס, לכתוב לתמיכה ולבטל. הקישור תקף ל־30 דקות:",
  /** DERIVED (deletion only): magicLinkBodyWithSupport without the support clause. */
  magicLinkBody: "הקישור הזה פותח את עמוד החשבון שלך. שם אפשר לראות את פרטי המנוי, לעדכן כרטיס ולבטל. הקישור תקף ל־30 דקות:",
  renewalSubject: "WAO — אישור על חידוש המנוי",
  /** {price} = formatAccountPrice(amount, currency), {cardLast4}. */
  renewalBody: "חידשנו את המנוי שלך ב־WAO וחייבנו {price} בכרטיס שמסתיים ב־{cardLast4}.",
  renewalCancelLine: "רוצה לבטל? מבטלים בלחיצה על כפתור בעמוד החשבון. הקישור למטה תקף ל־30 דקות, ואם התוקף שלו פג, אפשר לבקש שם קישור חדש:",
  cardUpdateNeededSubject: "WAO — החיוב על המנוי לא עבר",
  cardUpdateNeededBody1: "ניסינו לחייב את הכרטיס שלך על המנוי ב־WAO, והחיוב נדחה.",
  cardUpdateNeededBody2: "לא ננסה לחייב את הכרטיס הזה שוב אוטומטית. עדכן את הכרטיס או נהל את המנוי כאן:",
  cardExpiringSubject: "WAO — תוקף הכרטיס שלך מסתיים בקרוב",
  /** {cardExpiry} (MM/YY as stored), {cardLast4}. */
  cardExpiringBody1: "שים לב: תוקף הכרטיס שלך למנוי ב־WAO יפוג ב־{cardExpiry}. זה הכרטיס שמסתיים ב־{cardLast4}.",
  cardExpiringBody2: "כדי שהמנוי ימשיך לפעול בלי הפרעה, עדכן את הכרטיס כאן:",
} as const;

const ACCOUNT_LOCALE = 'he-IL';
const ACCOUNT_TIME_ZONE = 'Asia/Jerusalem';

/** The VAT-inclusive amount as he-IL currency (number + shekel sign). Render it inside LTR isolation. */
export function formatAccountPrice(amount: number, currency: string | null | undefined = 'ILS'): string {
  return new Intl.NumberFormat(ACCOUNT_LOCALE, { style: 'currency', currency: currency || 'ILS' }).format(amount);
}

/** A stored ISO timestamp as an Israeli calendar date (fixed time zone, so server and browser agree on the day). */
export function formatAccountDate(iso: string): string {
  return new Date(iso).toLocaleDateString(ACCOUNT_LOCALE, { timeZone: ACCOUNT_TIME_ZONE });
}

/** Replaces {name} placeholders; throws on a placeholder with no value so a template can never ship half-filled. */
export function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, name: string) => {
    if (!Object.hasOwn(values, name)) throw new Error(`fillTemplate: missing value for {${name}}`);
    return values[name];
  });
}
