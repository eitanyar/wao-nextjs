/**
 * In-memory mock `PaymentProvider`. Lets the rest of the billing engine
 * (signup flow, cron, cancel flow — built in later steps) be developed and
 * tested with zero real payment-provider integration.
 *
 * ## Deterministic test hooks (token-keyed)
 *
 * `chargeToken`'s behavior is driven entirely by the **token value**, so
 * tests can force a specific outcome deterministically without relying on
 * amounts (which are real business data and shouldn't double as test
 * signals):
 *
 *   - `MockPaymentProvider.DECLINE_TOKEN`             ("tok_mock_decline")
 *       → charge fails, `errorCode: 'card_declined'`, `isRetryable: false`.
 *   - `MockPaymentProvider.INSUFFICIENT_FUNDS_TOKEN`  ("tok_mock_insufficient_funds")
 *       → charge fails, `errorCode: 'insufficient_funds'`, `isRetryable: true`.
 *   - `MockPaymentProvider.NETWORK_ERROR_TOKEN`       ("tok_mock_network_error")
 *       → charge fails, `errorCode: 'network_error'`, `isRetryable: true`.
 *   - any other (real-looking) token → charge succeeds.
 *
 * Tokens are minted by `verifyTokenizationCallback`; pass one of the magic
 * values above as `payload.token` in tests to force that token to be
 * returned instead of a randomly generated one.
 *
 * `chargeToken` also enforces idempotency itself (mirroring how a real
 * provider's idempotency-key support behaves): calling it twice with the
 * same `idempotencyKey` returns the same stored result instead of charging
 * twice.
 *
 * `payload.simulateFailure: true` makes `verifyTokenizationCallback` report
 * `valid: false` (e.g. to simulate a user abandoning/failing the hosted
 * tokenization page).
 */

import crypto from 'crypto';
import type { ChargeResult, PaymentProvider, RefundResult } from '../provider';

interface MockTokenRecord {
  cardLast4: string;
  cardExpiry: string;
  deleted: boolean;
}

interface MockChargeRecord {
  token: string;
  amount: number;
  refunded: boolean;
}

export class MockPaymentProvider implements PaymentProvider {
  static readonly DECLINE_TOKEN = 'tok_mock_decline';
  static readonly INSUFFICIENT_FUNDS_TOKEN = 'tok_mock_insufficient_funds';
  static readonly NETWORK_ERROR_TOKEN = 'tok_mock_network_error';

  private tokens = new Map<string, MockTokenRecord>();
  private chargesByIdempotencyKey = new Map<string, ChargeResult>();
  private chargesByTransactionId = new Map<string, MockChargeRecord>();

  async createTokenizationSession(params: {
    customerId: string;
    returnUrl: string;
    initialAmount: number;
    description: string;
  }): Promise<{ redirectUrl: string; sessionId: string }> {
    const sessionId = `mock_sess_${crypto.randomUUID()}`;
    const redirectUrl = `https://mock-payment-provider.test/tokenize/${sessionId}?returnUrl=${encodeURIComponent(
      params.returnUrl
    )}&amount=${params.initialAmount}`;
    return { redirectUrl, sessionId };
  }

  async verifyTokenizationCallback(payload: unknown): Promise<{
    valid: boolean;
    token?: string;
    cardLast4?: string;
    cardExpiry?: string;
    initialChargeSucceeded: boolean;
    providerTransactionId?: string;
  }> {
    const p = (payload ?? {}) as {
      sessionId?: string;
      token?: string;
      cardLast4?: string;
      cardExpiry?: string;
      simulateFailure?: boolean;
    };

    if (p.simulateFailure) {
      return { valid: false, initialChargeSucceeded: false };
    }

    const token = p.token ?? `tok_mock_${crypto.randomUUID()}`;
    const cardLast4 = p.cardLast4 ?? '4242';
    const cardExpiry = p.cardExpiry ?? '12/30';

    this.tokens.set(token, { cardLast4, cardExpiry, deleted: false });

    return {
      valid: true,
      token,
      cardLast4,
      cardExpiry,
      initialChargeSucceeded: true,
      providerTransactionId: `mock_txn_${crypto.randomUUID()}`,
    };
  }

  async chargeToken(params: {
    token: string;
    amount: number;
    description: string;
    idempotencyKey: string;
  }): Promise<ChargeResult> {
    const existing = this.chargesByIdempotencyKey.get(params.idempotencyKey);
    if (existing) return existing;

    const result = this.computeChargeResult(params.token, params.amount);
    this.chargesByIdempotencyKey.set(params.idempotencyKey, result);

    if (result.success && result.providerTransactionId) {
      this.chargesByTransactionId.set(result.providerTransactionId, {
        token: params.token,
        amount: params.amount,
        refunded: false,
      });
    }

    return result;
  }

  private computeChargeResult(token: string, amount: number): ChargeResult {
    const record = this.tokens.get(token);
    if (record?.deleted) {
      return { success: false, errorCode: 'token_deleted', errorMessage: 'Token has been deleted.', isRetryable: false };
    }

    switch (token) {
      case MockPaymentProvider.DECLINE_TOKEN:
        return { success: false, errorCode: 'card_declined', errorMessage: 'Card declined.', isRetryable: false };
      case MockPaymentProvider.INSUFFICIENT_FUNDS_TOKEN:
        return {
          success: false,
          errorCode: 'insufficient_funds',
          errorMessage: 'Insufficient funds.',
          isRetryable: true,
        };
      case MockPaymentProvider.NETWORK_ERROR_TOKEN:
        return {
          success: false,
          errorCode: 'network_error',
          errorMessage: 'Simulated network/provider timeout.',
          isRetryable: true,
        };
      default:
        // amount isn't part of the mock's success/failure decision (see doc comment above).
        return { success: true, providerTransactionId: `mock_txn_${crypto.randomUUID()}`, isRetryable: false };
    }
  }

  async refund(params: {
    providerTransactionId: string;
    amount: number;
    reason?: string;
  }): Promise<RefundResult> {
    const charge = this.chargesByTransactionId.get(params.providerTransactionId);
    if (!charge) {
      return {
        success: false,
        errorCode: 'transaction_not_found',
        errorMessage: `No charge found for transaction ${params.providerTransactionId}.`,
      };
    }
    if (charge.refunded) {
      return { success: false, errorCode: 'already_refunded', errorMessage: 'Transaction already refunded.' };
    }
    charge.refunded = true;
    return { success: true, providerRefundId: `mock_refund_${crypto.randomUUID()}` };
  }

  async deleteToken(token: string): Promise<void> {
    const record = this.tokens.get(token);
    if (record) record.deleted = true;
  }
}
