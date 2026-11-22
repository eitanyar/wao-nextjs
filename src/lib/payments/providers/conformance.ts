/**
 * Payment-provider conformance suite: the behaviour the billing engine relies on, checked against ANY PaymentProvider.
 * Runs on the mock today (conformance.mock.test.ts); run the same checks on the Takbull sandbox once takbull.ts is
 * wired (with sandbox fixtures captured from real responses, never guessed). Provider-specific inputs come from
 * `fixtures`, so the checks themselves never encode one provider's shapes. Zero Hebrew.
 */
import type { PaymentProvider } from '../provider';

export interface ConformanceFixtures {
  /** A tokenization callback payload the provider accepts as genuine and that yields a chargeable token. */
  validCallback: unknown;
  /** A tokenization callback payload the provider must reject (tampered / abandoned). */
  invalidCallback: unknown;
  /** A token whose charge is declined, non-retryable. */
  declineToken: string;
  /** A token whose charge fails retryably (e.g. insufficient funds / timeout). */
  retryableFailureToken: string;
  amount: number;
}

export interface ConformanceCheck {
  name: string;
  run: () => Promise<void>;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`conformance: ${message}`);
}

export function paymentProviderConformanceChecks(provider: PaymentProvider, fixtures: ConformanceFixtures): ConformanceCheck[] {
  const key = (label: string) => `conformance:${label}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  return [
    {
      name: 'createTokenizationSession returns an absolute redirect URL and a session id',
      run: async () => {
        const session = await provider.createTokenizationSession({ customerId: 'conf-1', returnUrl: 'https://example.invalid/r', initialAmount: fixtures.amount, description: 'conformance' });
        assert(typeof session.sessionId === 'string' && session.sessionId.length > 0, 'sessionId');
        assert(/^https?:\/\//.test(new URL(session.redirectUrl).href), 'redirectUrl');
      },
    },
    {
      name: 'a genuine callback verifies and yields a token; a tampered one does not',
      run: async () => {
        const ok = await provider.verifyTokenizationCallback(fixtures.validCallback);
        assert(ok.valid === true && typeof ok.token === 'string' && ok.token.length > 0, 'valid callback');
        const bad = await provider.verifyTokenizationCallback(fixtures.invalidCallback);
        assert(bad.valid === false, 'invalid callback must not verify');
      },
    },
    {
      name: 'chargeToken succeeds with a transaction id, and the same idempotency key never charges twice',
      run: async () => {
        const { token } = await provider.verifyTokenizationCallback(fixtures.validCallback);
        const idempotencyKey = key('charge');
        const first = await provider.chargeToken({ token: token!, amount: fixtures.amount, description: 'conformance', idempotencyKey });
        assert(first.success === true && !!first.providerTransactionId, 'charge succeeds');
        const replay = await provider.chargeToken({ token: token!, amount: fixtures.amount, description: 'conformance', idempotencyKey });
        assert(replay.providerTransactionId === first.providerTransactionId, 'idempotent replay returns the same transaction');
      },
    },
    {
      name: 'a declined card fails non-retryably with an error code; a soft failure is retryable',
      run: async () => {
        const declined = await provider.chargeToken({ token: fixtures.declineToken, amount: fixtures.amount, description: 'conformance', idempotencyKey: key('decline') });
        assert(declined.success === false && !!declined.errorCode && declined.isRetryable === false, 'decline');
        const soft = await provider.chargeToken({ token: fixtures.retryableFailureToken, amount: fixtures.amount, description: 'conformance', idempotencyKey: key('soft') });
        assert(soft.success === false && !!soft.errorCode && soft.isRetryable === true, 'retryable failure');
      },
    },
    {
      name: 'refund of a successful charge succeeds once; an unknown transaction is refused',
      run: async () => {
        const { token } = await provider.verifyTokenizationCallback(fixtures.validCallback);
        const charge = await provider.chargeToken({ token: token!, amount: fixtures.amount, description: 'conformance', idempotencyKey: key('refund') });
        const refund = await provider.refund({ providerTransactionId: charge.providerTransactionId!, amount: fixtures.amount });
        assert(refund.success === true, 'refund succeeds');
        const again = await provider.refund({ providerTransactionId: charge.providerTransactionId!, amount: fixtures.amount });
        assert(again.success === false, 'double refund refused');
        const unknown = await provider.refund({ providerTransactionId: 'conformance-unknown-txn', amount: 1 });
        assert(unknown.success === false, 'unknown transaction refused');
      },
    },
    {
      name: 'a deleted token can no longer be charged (when the provider supports deleteToken)',
      run: async () => {
        if (!provider.deleteToken) return;
        const { token } = await provider.verifyTokenizationCallback(fixtures.validCallback);
        await provider.deleteToken(token!);
        const after = await provider.chargeToken({ token: token!, amount: fixtures.amount, description: 'conformance', idempotencyKey: key('deleted') });
        assert(after.success === false, 'deleted token charged');
      },
    },
  ];
}
