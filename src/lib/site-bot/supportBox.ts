/**
 * Whether the account page shows the Site-Bot support box for a subscription: a Site-Bot plan row past checkout, the
 * SITE_BOT_CLIENT_MESSAGES_ENABLED flag on, the box copy approved. The single rule behind the page, its buttons' error
 * pointer and the manage-link email's "write to support" clause, so no surface points at a box that is not there.
 * Zero Hebrew in this module.
 */
import { SITE_BOT_PLAN } from '../payments/plans';
import { clientMessagesEnabled } from './clientMessages';
import { SITE_BOT_CLIENT_MESSAGE_COPY_PENDING } from './clientMessageCopy';

export function siteBotSupportBoxShown(
  row: { plan?: string | null; status: string },
  env: Record<string, string | undefined> = process.env
): boolean {
  return row.plan === SITE_BOT_PLAN.id && row.status !== 'pending' && clientMessagesEnabled(env) && !SITE_BOT_CLIENT_MESSAGE_COPY_PENDING;
}
