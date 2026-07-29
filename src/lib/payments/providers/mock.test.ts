import test from 'node:test';
import assert from 'node:assert';
import { MockPaymentProvider } from './mock';

test('createTokenizationSession returns a fake redirect URL and sessionId', async () => {
  const provider = new MockPaymentProvider();
  const result = await provider.createTokenizationSession({
    customerId: 'cust_1',
    returnUrl: 'https://wao.co.il/subscriptions/return',
    initialAmount: 1,
    description: 'Trial charge',
  });
  assert.ok(result.sessionId.startsWith('mock_sess_'));
  assert.ok(result.redirectUrl.includes(result.sessionId));
});

test('verifyTokenizationCallback returns a usable token on success', async () => {
  const provider = new MockPaymentProvider();
  const result = await provider.verifyTokenizationCallback({
    sessionId: 'mock_sess_x',
    cardLast4: '1111',
    cardExpiry: '01/29',
  });
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.initialChargeSucceeded, true);
  assert.strictEqual(result.cardLast4, '1111');
  assert.ok(result.token);
});

test('verifyTokenizationCallback honors simulateFailure', async () => {
  const provider = new MockPaymentProvider();
  const result = await provider.verifyTokenizationCallback({ simulateFailure: true });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.initialChargeSucceeded, false);
});

test('chargeToken succeeds for a normal token', async () => {
  const provider = new MockPaymentProvider();
  const { token } = await provider.verifyTokenizationCallback({});
  const result = await provider.chargeToken({
    token: token!,
    amount: 99,
    description: 'Monthly renewal',
    idempotencyKey: 'sub-1:2026-08-01:1',
  });
  assert.strictEqual(result.success, true);
  assert.ok(result.providerTransactionId);
});

test('chargeToken fails non-retryably for the decline magic token', async () => {
  const provider = new MockPaymentProvider();
  const result = await provider.chargeToken({
    token: MockPaymentProvider.DECLINE_TOKEN,
    amount: 99,
    description: 'Monthly renewal',
    idempotencyKey: 'sub-2:2026-08-01:1',
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.errorCode, 'card_declined');
  assert.strictEqual(result.isRetryable, false);
});

test('chargeToken fails retryably for the insufficient-funds and network-error magic tokens', async () => {
  const provider = new MockPaymentProvider();
  const insufficientFunds = await provider.chargeToken({
    token: MockPaymentProvider.INSUFFICIENT_FUNDS_TOKEN,
    amount: 99,
    description: 'Monthly renewal',
    idempotencyKey: 'sub-3:2026-08-01:1',
  });
  assert.strictEqual(insufficientFunds.success, false);
  assert.strictEqual(insufficientFunds.isRetryable, true);

  const networkError = await provider.chargeToken({
    token: MockPaymentProvider.NETWORK_ERROR_TOKEN,
    amount: 99,
    description: 'Monthly renewal',
    idempotencyKey: 'sub-4:2026-08-01:1',
  });
  assert.strictEqual(networkError.success, false);
  assert.strictEqual(networkError.isRetryable, true);
});

test('chargeToken is idempotent: same idempotencyKey returns the same stored result', async () => {
  const provider = new MockPaymentProvider();
  const { token } = await provider.verifyTokenizationCallback({});
  const key = 'sub-5:2026-08-01:1';

  const first = await provider.chargeToken({ token: token!, amount: 99, description: 'x', idempotencyKey: key });
  const second = await provider.chargeToken({ token: token!, amount: 99, description: 'x', idempotencyKey: key });

  assert.deepStrictEqual(first, second);
});

test('refund succeeds for a real charged transaction, and rejects unknown/duplicate refunds', async () => {
  const provider = new MockPaymentProvider();
  const { token } = await provider.verifyTokenizationCallback({});
  const charge = await provider.chargeToken({
    token: token!,
    amount: 99,
    description: 'x',
    idempotencyKey: 'sub-6:2026-08-01:1',
  });
  assert.ok(charge.providerTransactionId);

  const refund = await provider.refund({ providerTransactionId: charge.providerTransactionId!, amount: 99 });
  assert.strictEqual(refund.success, true);
  assert.ok(refund.providerRefundId);

  const secondRefund = await provider.refund({ providerTransactionId: charge.providerTransactionId!, amount: 99 });
  assert.strictEqual(secondRefund.success, false);
  assert.strictEqual(secondRefund.errorCode, 'already_refunded');

  const unknownRefund = await provider.refund({ providerTransactionId: 'does-not-exist', amount: 1 });
  assert.strictEqual(unknownRefund.success, false);
  assert.strictEqual(unknownRefund.errorCode, 'transaction_not_found');
});

test('deleteToken makes subsequent charges on that token fail', async () => {
  const provider = new MockPaymentProvider();
  const { token } = await provider.verifyTokenizationCallback({});
  await provider.deleteToken!(token!);

  const result = await provider.chargeToken({
    token: token!,
    amount: 99,
    description: 'x',
    idempotencyKey: 'sub-7:2026-08-01:1',
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.errorCode, 'token_deleted');
  assert.strictEqual(result.isRetryable, false);
});
