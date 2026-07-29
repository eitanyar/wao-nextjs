/**
 * Invoice-provider selection point — mirrors `get-provider.ts`'s role for
 * `PaymentProvider`. Nothing else should import a `providers/*-invoice`
 * class directly; call `getInvoiceProvider()` instead.
 *
 * Selection: `INVOICE_PROVIDER=mock|pending-queue`.
 *   - Non-production, unset  -> `mock` (easy local/dev testing).
 *   - Production, unset      -> `pending-queue` (the safe default per the
 *     spec: queue-and-issue-manually until a real invoicing-service API is
 *     wired up — never silently fabricate a fake "issued" invoice in prod).
 *   - Either value can be set explicitly regardless of NODE_ENV.
 *
 * A future real provider (once the business picks one) slots in here as a
 * third case — this module is the single place that will need to change.
 */

import type { InvoiceProvider } from './invoice-provider';
import { MockInvoiceProvider } from './providers/mock-invoice';
import { PendingQueueInvoiceProvider } from './providers/pending-queue-invoice';

let instance: InvoiceProvider | null = null;

function resolveProviderName(): 'mock' | 'pending-queue' {
  const configured = process.env.INVOICE_PROVIDER;
  if (configured === 'mock' || configured === 'pending-queue') return configured;
  return process.env.NODE_ENV === 'production' ? 'pending-queue' : 'mock';
}

export function getInvoiceProvider(): InvoiceProvider {
  if (!instance) {
    instance = resolveProviderName() === 'mock' ? new MockInvoiceProvider() : new PendingQueueInvoiceProvider();
  }
  return instance;
}

/** Test-only: forces a fresh provider instance to be selected next call. */
export function _resetInvoiceProviderForTests(): void {
  instance = null;
}
