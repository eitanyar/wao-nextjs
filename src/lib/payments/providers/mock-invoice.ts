/**
 * In-memory mock `InvoiceProvider`. Behaves like a real synchronous-success
 * provider (returns a fake `invoiceId`/`pdfUrl` immediately) so the
 * "real provider" code path is exercisable in tests without needing a real
 * invoicing-service integration — mirrors `providers/mock.ts`'s role for
 * `PaymentProvider`.
 */

import crypto from 'crypto';
import type { InvoiceProvider, InvoiceResult } from '../invoice-provider';

export class MockInvoiceProvider implements InvoiceProvider {
  async createInvoice(params: {
    customerName: string;
    customerEmail: string;
    amount: number;
    description: string;
    externalId: string;
  }): Promise<InvoiceResult> {
    const invoiceId = `mock_inv_${crypto.randomUUID()}`;
    return {
      invoiceId,
      pdfUrl: `https://mock-invoice-provider.test/invoices/${invoiceId}.pdf`,
    };
  }
}
