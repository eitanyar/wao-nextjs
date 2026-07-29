/**
 * Payment-provider abstraction. Nothing outside `src/lib/payments/providers/*`
 * should know which processor (Yaad/Cardcom/PayPlus/mock/...) is in use — all
 * call sites (signup flow, cron, cancel flow — built in later steps) code
 * against this interface only.
 */

export interface ChargeResult {
  success: boolean;
  providerTransactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  isRetryable: boolean;
}

export interface RefundResult {
  success: boolean;
  providerRefundId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PaymentProvider {
  createTokenizationSession(params: {
    customerId: string;
    returnUrl: string;
    initialAmount: number;
    description: string;
  }): Promise<{ redirectUrl: string; sessionId: string }>;

  verifyTokenizationCallback(payload: unknown): Promise<{
    valid: boolean;
    token?: string;
    cardLast4?: string;
    cardExpiry?: string;
    initialChargeSucceeded: boolean;
    providerTransactionId?: string;
  }>;

  chargeToken(params: {
    token: string;
    amount: number;
    description: string;
    idempotencyKey: string;
  }): Promise<ChargeResult>;

  refund(params: {
    providerTransactionId: string;
    amount: number;
    reason?: string;
  }): Promise<RefundResult>;

  deleteToken?(token: string): Promise<void>;
}
