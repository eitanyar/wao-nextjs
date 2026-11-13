/**
 * Site-Bot client message box: Hebrew labels for the account-page box and the client confirmation email.
 * Values applied 2026-11-13 byte-exact by Python str.replace from the waocopy -> Noa-gated copy (support/copy-final.json).
 * HEBREW-SAFETY: the engineer never authors Hebrew. Every key starts as a `__HE_TODO_<key>__` placeholder (the
 * accountCopy.ts / researchedSiteLabels.ts pattern). Values are applied later, byte-exact, by Python str.replace from a
 * Tamar -> Noa patch (spec briefs A and B), which also sets SITE_BOT_CLIENT_MESSAGE_COPY_PENDING to false.
 * clientMessageCopy.test.ts fails while the flag disagrees with the values.
 * While pending: the account page does not render the box, and the confirmation email is not sent.
 *
 * `turnaroundLine` is optional and empty on purpose (founder decision 2: no reply-time promise). It renders only when
 * filled with approved copy.
 */
import { HE_TODO_PREFIX } from '../lp/researchedSiteLabels';

export const CLIENT_MESSAGE_COPY_KEYS = [
  'boxHeading',
  'boxIntro',
  'textareaLabel',
  'textareaHint',
  'submit',
  'sending',
  'sentHeading',
  'sentBody',
  'sendAnother',
  'errorRetry',
  'errorTooLong',
  'errorRateLimited',
  'errorLinkExpired',
  'cancelPointer',
  'emailSubject',
  'emailBodyIntro',
  'emailQuotedLabel',
  'emailBodyOutro',
] as const;
export type ClientMessageCopyKey = (typeof CLIENT_MESSAGE_COPY_KEYS)[number];

export const SITE_BOT_CLIENT_MESSAGE_COPY: Readonly<Record<ClientMessageCopyKey, string> & { turnaroundLine: string }> = {
  boxHeading: 'בקשה או שאלה?',
  boxIntro: 'כתוב מה תרצה לשנות באתר או בפרופיל בגוגל, או כל שאלה שיש לך. בן אדם מהצוות שלנו קורא כל הודעה.',
  textareaLabel: 'ההודעה שלך',
  textareaHint: 'למשל: לשנות שעות פתיחה או לעדכן מספר טלפון. אפשר עד 2,000 תווים.',
  submit: 'שלח הודעה',
  sending: 'ההודעה בדרך…',
  sentHeading: 'קיבלנו את ההודעה',
  sentBody: 'שלחנו לך מייל אישור עם ההודעה שלך. נחזור אליך.',
  sendAnother: 'שלח הודעה נוספת',
  errorRetry: 'השליחה לא עברה. נסה שוב.',
  errorTooLong: 'ההודעה ארוכה מדי. אפשר עד 2,000 תווים, קצר אותה ושלח שוב.',
  errorRateLimited: 'שלחת יותר מדי הודעות בזמן קצר. נסה שוב בעוד כמה דקות.',
  errorLinkExpired: 'קישור הכניסה פג תוקף או שכבר השתמשת בו. בקש קישור חדש בעמוד הזה.',
  cancelPointer: 'לביטול המנוי, לחץ על כפתור הביטול בעמוד הזה.',
  emailSubject: 'קיבלנו את ההודעה שלך',
  emailBodyIntro: 'תודה שכתבת לנו. ההודעה שלך אצלנו.',
  emailQuotedLabel: 'מה שכתבת:',
  emailBodyOutro: 'בן אדם מהצוות שלנו יקרא את ההודעה ויחזור אליך. לא צריך לשלוח שוב.',
  // Optional; empty = not rendered (founder decision 2).
  turnaroundLine: '',
};

/** True while any required key above is still a placeholder. */
export const SITE_BOT_CLIENT_MESSAGE_COPY_PENDING = false;

export const EMAIL_COPY_KEYS = ['emailSubject', 'emailBodyIntro', 'emailQuotedLabel', 'emailBodyOutro'] as const satisfies readonly ClientMessageCopyKey[];

/** True when a value is real, approved copy (non-empty, not a placeholder). */
export function isFilledCopy(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim() !== '' && !value.includes(HE_TODO_PREFIX);
}

/** True when every listed key is filled. */
export function copyReady(keys: readonly ClientMessageCopyKey[], copy: Readonly<Record<string, string>> = SITE_BOT_CLIENT_MESSAGE_COPY): boolean {
  return keys.every((key) => isFilledCopy(copy[key]));
}
