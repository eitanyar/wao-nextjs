/**
 * Payment-provider selection point — single place every payment channel
 * (Site Bot checkout, the recurring subscription engine, Google Ads
 * onboarding) resolves its `PaymentProvider` from, so nothing else should
 * import a `providers/*` class directly.
 *
 * Takbull is the decided, final processor for all channels
 * (`docs/specs/subscription-billing-provider-decision.md`, 2026-08-07), but
 * `TakbullPaymentProvider` (`providers/takbull.ts`) still throws until its
 * real API contract (endpoint URLs, field names) is confirmed — expected
 * after Eitan's 2026-08-10 meeting with Takbull. Until then, and unless
 * `PAYMENT_PROVIDER=takbull` is explicitly set, this defaults to the mock.
 */

import type { PaymentProvider } from './provider';
import { MockPaymentProvider } from './providers/mock';
import { TakbullPaymentProvider } from './providers/takbull';

let instance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!instance) {
    instance = process.env.PAYMENT_PROVIDER === 'takbull' ? new TakbullPaymentProvider() : new MockPaymentProvider();
  }
  return instance;
}

/** Test-only: forces a fresh provider instance (the mock keeps in-memory state). */
export function _resetPaymentProviderForTests(): void {
  instance = null;
}
