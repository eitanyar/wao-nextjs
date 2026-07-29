/**
 * Single shared call site for "issue an invoice for a just-succeeded charge",
 * invoked from both charge-success points (`cron-charge.ts`'s renewal charge,
 * `subscriptions.ts`'s `applyTokenizationCallback` trial charge).
 *
 * Critical invariant: invoice creation must NEVER block, roll back, or fail
 * the underlying charge. The charge is already committed (its `charges` row
 * already inserted with `status='succeeded'`) by the time this is called —
 * this function only ever attempts a best-effort `UPDATE ... SET invoice_id`
 * on top of that, and swallows any provider exception. On failure, the
 * charge's `invoice_id` is simply left `null` (a pending_invoices row with
 * `status='failed'` is written instead, when the provider itself is
 * queue-backed and its own DB write is what failed — see inline comment).
 */

import { getDb, setChargeInvoiceId, type ChargeRow, type SubscriptionRow } from './db';
import { getInvoiceProvider } from './get-invoice-provider';

/**
 * Attempts to issue an invoice for `charge` and, on success, writes the
 * resulting `invoiceId` back onto `charges.invoice_id`. Never throws.
 */
export async function issueInvoiceForCharge(charge: ChargeRow, subscription: SubscriptionRow): Promise<void> {
  try {
    const provider = getInvoiceProvider();
    const result = await provider.createInvoice({
      customerName: subscription.user_id,
      customerEmail: subscription.user_id,
      amount: charge.amount,
      description: 'WAO subscription charge',
      externalId: charge.id,
    });

    setChargeInvoiceId(getDb(), charge.id, result.invoiceId);
  } catch (err) {
    // Invoice issuance failing must never affect the already-succeeded
    // charge — log clearly and move on. charges.invoice_id stays null; if
    // the pending-queue provider is in use and it's *its own* DB write that
    // threw, there's no pending_invoices row to mark 'failed' (the insert
    // itself is what failed) — this is a genuine gap that would need
    // dedicated alerting/retry if it becomes a real recurring problem, but
    // is out of scope for this task per the "never block the charge" spec.
    console.error(
      `[invoicing] Failed to issue invoice for charge=${charge.id} (subscription=${subscription.id}):`,
      err
    );
  }
}
