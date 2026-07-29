/**
 * "Manual issuance" fallback `InvoiceProvider`. Used when no real
 * invoicing-service API is wired up yet (the current, default-in-production
 * state — see `get-invoice-provider.ts`). Instead of pretending to issue a
 * real invoice, it inserts a `pending_invoices` row with `status='pending'`
 * so billing/ops can issue the actual invoice manually (e.g. via whatever
 * bookkeeping tool WAO already uses) and later mark the row `issued`.
 *
 * The returned `invoiceId` is the `pending_invoices` row id itself — it's a
 * legitimate, stable identifier (usable to look the row back up), it is just
 * not (yet) a real invoicing-service invoice id.
 */

import crypto from 'crypto';
import { getDb, insertPendingInvoice } from '../db';
import type { InvoiceProvider, InvoiceResult } from '../invoice-provider';

export class PendingQueueInvoiceProvider implements InvoiceProvider {
  async createInvoice(params: {
    customerName: string;
    customerEmail: string;
    amount: number;
    description: string;
    externalId: string;
  }): Promise<InvoiceResult> {
    const db = getDb();
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    insertPendingInvoice(db, {
      id,
      charge_id: params.externalId,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      amount: params.amount,
      description: params.description,
      status: 'pending',
      provider_invoice_id: null,
      pdf_url: null,
      created_at: timestamp,
      issued_at: null,
    });

    return { invoiceId: id };
  }
}
