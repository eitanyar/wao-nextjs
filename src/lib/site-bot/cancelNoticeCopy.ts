/**
 * Site-Bot cancellation notices to the client: the confirmation on cancel and the "offline soon" email 7 days before
 * the site goes offline. HEBREW-SAFETY: the engineer never authors Hebrew. Every key starts as a `__HE_TODO_<key>__`
 * placeholder (the clientMessageCopy.ts pattern). Approved values are applied later, byte-exact, by Python
 * str.replace, which also sets SITE_BOT_CANCEL_NOTICE_COPY_PENDING to false. cancelNotices.test.ts fails while the flag
 * disagrees with the values. While pending, neither email is sent (staff take-down reminders are unaffected).
 *
 * Variables: {businessName} {paidThrough} {offlineDate} {accountLink} (the plain /account/subscription URL, never a
 * token URL). Values may contain \n. The *NoDomain bodies are used when the client has no own domain (WAO sub-domain only).
 */
import { isFilledCopy } from './clientMessageCopy';

export const CANCEL_NOTICE_COPY_KEYS = [
  'cancelEmailSubject',
  'cancelEmailBody',
  'cancelEmailBodyNoDomain',
  'cancelEmailOutro',
  'offlineSoonSubject',
  'offlineSoonBody',
  'offlineSoonBodyNoDomain',
  'offlineSoonOutro',
] as const;
export type CancelNoticeCopyKey = (typeof CANCEL_NOTICE_COPY_KEYS)[number];

export const SITE_BOT_CANCEL_NOTICE_COPY: Readonly<Record<CancelNoticeCopyKey, string>> = {
  cancelEmailSubject: '__HE_TODO_cancelEmailSubject__',
  cancelEmailBody: '__HE_TODO_cancelEmailBody__',
  cancelEmailBodyNoDomain: '__HE_TODO_cancelEmailBodyNoDomain__',
  cancelEmailOutro: '__HE_TODO_cancelEmailOutro__',
  offlineSoonSubject: '__HE_TODO_offlineSoonSubject__',
  offlineSoonBody: '__HE_TODO_offlineSoonBody__',
  offlineSoonBodyNoDomain: '__HE_TODO_offlineSoonBodyNoDomain__',
  offlineSoonOutro: '__HE_TODO_offlineSoonOutro__',
};

/** True while any key above is still a placeholder. */
export const SITE_BOT_CANCEL_NOTICE_COPY_PENDING = true;

export const CANCEL_EMAIL_COPY_KEYS = ['cancelEmailSubject', 'cancelEmailBody', 'cancelEmailBodyNoDomain', 'cancelEmailOutro'] as const satisfies readonly CancelNoticeCopyKey[];
export const OFFLINE_SOON_COPY_KEYS = ['offlineSoonSubject', 'offlineSoonBody', 'offlineSoonBodyNoDomain', 'offlineSoonOutro'] as const satisfies readonly CancelNoticeCopyKey[];

/** True when the flag is off and every listed key is approved copy. */
export function cancelNoticeCopyReady(
  keys: readonly CancelNoticeCopyKey[],
  copy: Readonly<Record<string, string>> = SITE_BOT_CANCEL_NOTICE_COPY,
  pending: boolean = SITE_BOT_CANCEL_NOTICE_COPY_PENDING
): boolean {
  return !pending && keys.every((key) => isFilledCopy(copy[key]));
}
