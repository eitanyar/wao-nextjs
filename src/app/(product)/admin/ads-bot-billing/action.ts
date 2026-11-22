'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { buildAdsBotPayLinkMessage, recordManualAdsBotCharge } from '@/lib/google-ads/billing/adsBotBilling';
import { adsBotCheckoutEnabled } from '@/lib/google-ads/billing/adsBotCheckoutFlag';
import { sendAdsBotPayLinkEmail } from '@/lib/payments/email';

const PAGE = '/admin/ads-bot-billing';

async function requireAdmin(): Promise<void> {
  const jar = await cookies();
  if (!(await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? ''))) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(PAGE)}`);
  }
}

function field(formData: FormData, name: string): string {
  return (formData.get(name) ?? '').toString().trim();
}

/**
 * Records one Ads Bot charge taken by hand in Takbull's back office (pilot). Admin-only; NOT behind
 * ADS_BOT_CHECKOUT_ENABLED. Also sets the client's readiness feePaid (recordManualAdsBotCharge).
 */
export async function recordManualChargeAction(formData: FormData) {
  await requireAdmin();
  const result = recordManualAdsBotCharge({
    clientId: field(formData, 'clientId'),
    email: field(formData, 'email'),
    chargeDate: field(formData, 'chargeDate'),
    amount: Number(field(formData, 'amount')),
    takbullReference: field(formData, 'takbullReference'),
  });
  if (!result.ok) redirect(`${PAGE}?error=${result.error}`);
  redirect(`${PAGE}?recorded=${encodeURIComponent(result.subscriptionId)}${result.amountMatchesPlan ? '' : '&amountWarning=1'}`);
}

/** Emails the signed pay link to the owner (post-approval). Behind ADS_BOT_CHECKOUT_ENABLED. */
export async function sendPayLinkAction(formData: FormData) {
  await requireAdmin();
  if (!adsBotCheckoutEnabled()) redirect(`${PAGE}?error=checkout_disabled`);
  const email = field(formData, 'email');
  let message: { subject: string; text: string };
  try {
    const h = await headers();
    const origin = process.env.NEXT_PUBLIC_BASE_URL || `https://${h.get('host') ?? 'www.wao.co.il'}`;
    message = buildAdsBotPayLinkMessage({ clientId: field(formData, 'clientId'), email, firstName: field(formData, 'firstName'), origin });
  } catch {
    redirect(`${PAGE}?error=pay_link_invalid`);
  }
  await sendAdsBotPayLinkEmail({ to: email, subject: message.subject, text: message.text });
  redirect(`${PAGE}?sent=1`);
}
