/**
 * The pay page's card fields. The mock provider's test card is pre-filled ONLY on a dev server (`next dev`) using the
 * mock provider; anywhere else (a production build, PAYMENT_PROVIDER=takbull) the fields start empty.
 * HEBREW-SAFETY: zero Hebrew bytes.
 */

import { paymentProviderKind } from '../../payments/get-provider';

export interface CardFieldDefaults {
  number: string;
  expiry: string;
  cvc: string;
}

const EMPTY: CardFieldDefaults = Object.freeze({ number: '', expiry: '', cvc: '' });
const MOCK_TEST_CARD: CardFieldDefaults = Object.freeze({ number: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' });

export function cardFieldDefaults(env: Readonly<Record<string, string | undefined>>): CardFieldDefaults {
  return env.NODE_ENV === 'development' && paymentProviderKind(env) === 'mock' ? MOCK_TEST_CARD : EMPTY;
}
