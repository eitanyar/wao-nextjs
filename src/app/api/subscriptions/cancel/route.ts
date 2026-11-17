import { NextResponse } from 'next/server';
import { cancelSubscriptionByToken, getSubscriptionById } from '@/lib/payments/subscriptions';
import { SITE_BOT_PLAN } from '@/lib/payments/plans';
import { clientMessagesEnabled, createCancelNoticeItem, markStaffAlerted } from '@/lib/site-bot/clientMessages';
import { sendClientMessageStaffAlert } from '@/lib/site-bot/clientMessageEmail';
import { sendCancelConfirmation } from '@/lib/site-bot/cancelNotices';
import { withdrawShowcaseConsent } from '@/lib/showcase/consentStore';

/**
 * Site-Bot support queue (2026-11-13): when the client-message feature is on and the cancelled row is a Site-Bot plan,
 * add one "cancel notice due" item to the staff queue and alert staff. Never affects the cancel response: every failure
 * is caught and logged by id only.
 */
async function queueSiteBotCancelNotice(subscriptionId: string, effectiveAt: string | null | undefined, cancelAtPeriodEnd: boolean): Promise<void> {
  if (!clientMessagesEnabled(process.env)) return;
  try {
    const subscription = getSubscriptionById(subscriptionId);
    if (!subscription || subscription.plan !== SITE_BOT_PLAN.id) return;
    const now = new Date();
    const { row, created } = createCancelNoticeItem({ subscriptionId, effectiveAt: effectiveAt ?? null, cancelAtPeriodEnd, now });
    if (created && await sendClientMessageStaffAlert(row)) markStaffAlerted(row.id, new Date());
  } catch {
    console.error(`[subscriptions/cancel] site-bot cancel notice hook failed subscription=${subscriptionId}`);
  }
}

/**
 * Showcase consent (terms §10 showcase sub-clause 6, 2026-11-17): a cancellation withdraws the consent at receipt, for
 * every plan (a no-op when there is none). Never affects the cancel response.
 */
function withdrawShowcaseOnCancel(subscriptionId: string): void {
  try {
    withdrawShowcaseConsent({ accountId: subscriptionId, source: 'cancellation', reason: 'cancelled' });
  } catch {
    console.error(`[subscriptions/cancel] showcase consent withdraw failed subscription=${subscriptionId}`);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? '').trim();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing token.' }, { status: 400 });
    }

    const outcome = await cancelSubscriptionByToken(token);

    if (!outcome.ok) {
      const status = outcome.reason === 'invalid_token' ? 401 : 400;
      return NextResponse.json({ success: false, error: outcome.reason }, { status });
    }

    withdrawShowcaseOnCancel(outcome.subscriptionId);
    await queueSiteBotCancelNotice(outcome.subscriptionId, outcome.effectiveAt, outcome.cancelAtPeriodEnd === true);
    // Site-Bot cancel confirmation to the owner (cancelNotices.ts): Site-Bot rows only, copy-gated, one-time, never throws.
    await sendCancelConfirmation(outcome.subscriptionId);

    return NextResponse.json({
      success: true,
      subscriptionId: outcome.subscriptionId,
      cancelAtPeriodEnd: outcome.cancelAtPeriodEnd,
      effectiveAt: outcome.effectiveAt,
    });
  } catch (error: unknown) {
    console.error('[subscriptions/cancel] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel subscription.' }, { status: 500 });
  }
}
