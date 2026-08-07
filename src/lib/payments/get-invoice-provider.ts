/**
 * Invoice-provider selection point — mirrors `get-provider.ts`'s role for
 * `PaymentProvider`. Nothing else should import a `providers/*-invoice`
 * class directly; call `getInvoiceProvider()` instead.
 *
 * Selection: `INVOICE_PROVIDER=mock|pending-queue|takbull`.
 *   - Non-production, unset  -> `mock` (easy local/dev testing).
 *   - Production, unset      -> `pending-queue` (the safe default: queue-
 *     and-issue-manually until Takbull's real invoicing API contract is
 *     confirmed — never silently fabricate a fake "issued" invoice in prod).
 *   - `takbull`              -> the decided, final provider
 *     (`docs/specs/subscription-billing-provider-decision.md`, 2026-08-07),
 *     but `TakbullInvoiceProvider` (`providers/takbull.ts`) still throws
 *     until its real API contract is confirmed — expected after Eitan's
 *     2026-08-10 meeting with Takbull. Don't set this in production before
 *     that guard is removed from the class.
 *   - Any value can be set explicitly regardless of NODE_ENV.
 */

import type { InvoiceProvider } from './invoice-provider';
import { MockInvoiceProvider } from './providers/mock-invoice';
import { PendingQueueInvoiceProvider } from './providers/pending-queue-invoice';
import { TakbullInvoiceProvider } from './providers/takbull';

let instance: InvoiceProvider | null = null;

function resolveProviderName(): 'mock' | 'pending-queue' | 'takbull' {
  const configured = process.env.INVOICE_PROVIDER;
  if (configured === 'mock' || configured === 'pending-queue' || configured === 'takbull') return configured;
  return process.env.NODE_ENV === 'production' ? 'pending-queue' : 'mock';
}

export function getInvoiceProvider(): InvoiceProvider {
  if (!instance) {
    const name = resolveProviderName();
    instance = name === 'mock' ? new MockInvoiceProvider() : name === 'takbull' ? new TakbullInvoiceProvider() : new PendingQueueInvoiceProvider();
  }
  return instance;
}

/** Test-only: forces a fresh provider instance to be selected next call. */
export function _resetInvoiceProviderForTests(): void {
  instance = null;
}
