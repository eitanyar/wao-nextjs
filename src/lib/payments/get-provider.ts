/**
 * Payment-provider selection point for the signup/cancel flow built in this
 * step. `MockPaymentProvider` is the only implementation that exists so far
 * (see `providers/mock.ts`) — wiring a real processor (Yaad/Cardcom/etc.) is
 * explicitly a separate, still-open task. This module is the single place
 * that will need to change to select a real provider later (e.g. by
 * `process.env.BILLING_PROVIDER`), so nothing else in the signup/cancel flow
 * should import `MockPaymentProvider` directly.
 */

import type { PaymentProvider } from './provider';
import { MockPaymentProvider } from './providers/mock';

let instance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!instance) {
    instance = new MockPaymentProvider();
  }
  return instance;
}

/** Test-only: forces a fresh provider instance (the mock keeps in-memory state). */
export function _resetPaymentProviderForTests(): void {
  instance = null;
}
