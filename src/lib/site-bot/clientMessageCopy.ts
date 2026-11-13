/**
 * Site-Bot client message box: Hebrew labels for the account-page box and the client confirmation email.
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
  boxHeading: '__HE_TODO_boxHeading__',
  boxIntro: '__HE_TODO_boxIntro__',
  textareaLabel: '__HE_TODO_textareaLabel__',
  textareaHint: '__HE_TODO_textareaHint__',
  submit: '__HE_TODO_submit__',
  sending: '__HE_TODO_sending__',
  sentHeading: '__HE_TODO_sentHeading__',
  sentBody: '__HE_TODO_sentBody__',
  sendAnother: '__HE_TODO_sendAnother__',
  errorRetry: '__HE_TODO_errorRetry__',
  errorTooLong: '__HE_TODO_errorTooLong__',
  errorRateLimited: '__HE_TODO_errorRateLimited__',
  errorLinkExpired: '__HE_TODO_errorLinkExpired__',
  cancelPointer: '__HE_TODO_cancelPointer__',
  emailSubject: '__HE_TODO_emailSubject__',
  emailBodyIntro: '__HE_TODO_emailBodyIntro__',
  emailQuotedLabel: '__HE_TODO_emailQuotedLabel__',
  emailBodyOutro: '__HE_TODO_emailBodyOutro__',
  // Optional; empty = not rendered (founder decision 2).
  turnaroundLine: '',
};

/** True while any required key above is still a placeholder. */
export const SITE_BOT_CLIENT_MESSAGE_COPY_PENDING = true;

export const EMAIL_COPY_KEYS = ['emailSubject', 'emailBodyIntro', 'emailQuotedLabel', 'emailBodyOutro'] as const satisfies readonly ClientMessageCopyKey[];

/** True when a value is real, approved copy (non-empty, not a placeholder). */
export function isFilledCopy(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim() !== '' && !value.includes(HE_TODO_PREFIX);
}

/** True when every listed key is filled. */
export function copyReady(keys: readonly ClientMessageCopyKey[], copy: Readonly<Record<string, string>> = SITE_BOT_CLIENT_MESSAGE_COPY): boolean {
  return keys.every((key) => isFilledCopy(copy[key]));
}
