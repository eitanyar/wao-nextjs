/**
 * Site-Bot review-request kit: Hebrew for the account-page card and the one-time go-live email.
 * HEBREW-SAFETY: the engineer never authors Hebrew. Every key starts as a `__HE_TODO_<key>__` placeholder (the
 * clientMessageCopy.ts pattern). Approved values are applied later, byte-exact, by Python str.replace, which also sets
 * SITE_BOT_REVIEW_KIT_COPY_PENDING to false. reviewKit.test.ts fails while the flag disagrees with the values.
 * While pending: the account page does not render the card and the go-live email is not sent.
 *
 * Variables: reviewMessage {businessName} {reviewLink}; reviewEmailIntro / reviewEmailOutro may use {businessName}.
 * Values may contain \n (rendered as line breaks; a blank line starts a new paragraph in email).
 * Rendering rule (reviewKit.ts fillReviewMessage): when {businessName} directly follows a Hebrew prefix letter (e.g. the
 * prefix bet, no maqaf in the copy) and the name starts with a Latin letter or digit, a maqaf (U+05BE) is inserted.
 */
import { isFilledCopy } from './clientMessageCopy';

export const REVIEW_KIT_COPY_KEYS = [
  'reviewCardHeading',
  'reviewCardIntro',
  'reviewMessage',
  'copyButton',
  'copiedToast',
  'whatsappButton',
  'reviewSenderNote',
  'reviewEmailSubject',
  'reviewEmailIntro',
  'reviewEmailMessageLabel',
  'reviewEmailOutro',
] as const;
export type ReviewKitCopyKey = (typeof REVIEW_KIT_COPY_KEYS)[number];

export const SITE_BOT_REVIEW_KIT_COPY: Readonly<Record<ReviewKitCopyKey, string>> = {
  reviewCardHeading: 'מעבודה טובה לביקורת בגוגל',
  reviewCardIntro: 'סיימת עבודה והלקוח מרוצה? תשלח לו את ההודעה הזאת.\n10 שניות. זהו.',
  reviewMessage: 'היי, תודה שבחרת ב{businessName} 🙏\nאם היית מרוצה מהעבודה, אשמח מאוד לכמה מילים בגוגל. זה לוקח דקה ועוזר לי המון.\n{reviewLink}',
  copyButton: 'העתק הודעה',
  copiedToast: 'הועתק. עכשיו רק להדביק בצ׳אט עם הלקוח.',
  whatsappButton: 'שלח בוואטסאפ',
  reviewSenderNote: 'אתה שולח אותה מהטלפון שלך, ורק ללקוחות שאתה בוחר.',
  reviewEmailSubject: 'האתר שלך עלה. וגם הודעה מוכנה לביקורות בגוגל',
  reviewEmailIntro: 'מזל טוב. האתר שלך באוויר.\nהכנו לך קישור ישיר לכתיבת ביקורת על העסק שלך בגוגל, והודעה קצרה ששולחים ללקוח בסוף עבודה. כל ביקורת חדשה עוזרת ללקוח הבא למצוא אותך ולבחור בך.',
  reviewEmailMessageLabel: 'ההודעה שתשלח ללקוחות:',
  reviewEmailOutro: 'הקישור וההודעה מחכים לך תמיד בעמוד החשבון שלך ב־WAO, עם כפתור העתקה ושליחה בוואטסאפ.',
};

/** True while any key above is still a placeholder. */
export const SITE_BOT_REVIEW_KIT_COPY_PENDING = false;

export const REVIEW_CARD_COPY_KEYS = [
  'reviewCardHeading', 'reviewCardIntro', 'reviewMessage', 'copyButton', 'copiedToast', 'whatsappButton', 'reviewSenderNote',
] as const satisfies readonly ReviewKitCopyKey[];
export const REVIEW_EMAIL_COPY_KEYS = [
  'reviewMessage', 'reviewEmailSubject', 'reviewEmailIntro', 'reviewEmailMessageLabel', 'reviewEmailOutro',
] as const satisfies readonly ReviewKitCopyKey[];

/** True when the flag is off and every listed key is approved copy. */
export function reviewKitCopyReady(
  keys: readonly ReviewKitCopyKey[],
  copy: Readonly<Record<string, string>> = SITE_BOT_REVIEW_KIT_COPY,
  pending: boolean = SITE_BOT_REVIEW_KIT_COPY_PENDING
): boolean {
  return !pending && keys.every((key) => isFilledCopy(copy[key]));
}
