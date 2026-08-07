/**
 * Real `PaymentProvider` + `InvoiceProvider` implementation for Takbull —
 * decided as the final processor for all payment channels, all bots
 * (`docs/specs/subscription-billing-provider-decision.md`, 2026-08-07).
 * Takbull is a reseller wrapping `icom.yaad.net` (Yaad/ICC) infrastructure
 * under its own API (`API_Key`/`API_Secret` auth), all-in-one on the
 * ₪99/month tier: `ChargeToken` for charging a stored token, and its own
 * document-generation feature (`CreateDocument`) for invoicing.
 *
 * ## What is and isn't confirmed
 *
 * Confirmed (via Takbull support, in writing, 2026-07-30 — see the decision
 * log): the auth model, the ₪99/month all-in-one tier, that tokenization is
 * hosted-page-only (no raw tokenize endpoint), and the method names
 * `ChargeToken`/`CreateDocument`. **Not confirmed:** the exact base API URL,
 * endpoint paths, and request/response JSON field names for any of these
 * calls — the sandbox test (task #13) kept declining with CCode=3 before a
 * real payload/response pair was ever inspected, so nothing below the
 * `TODO(takbull-api)` markers should be treated as verified against a real
 * response. Eitan is meeting Takbull 2026-08-10 to resolve this; fill in the
 * marked spots from their API docs/Postman collection at that point, then
 * remove this notice.
 *
 * Until wired with real, confirmed endpoint details, this class throws
 * `TakbullNotConfiguredError` rather than firing a best-guess request at a
 * live payment endpoint. It is NOT selected by default — see
 * `get-provider.ts` / `get-invoice-provider.ts`, which only choose Takbull
 * when `PAYMENT_PROVIDER=takbull` / `INVOICE_PROVIDER=takbull` is set.
 */

import type { ChargeResult, PaymentProvider, RefundResult } from '../provider';
import type { InvoiceProvider, InvoiceResult } from '../invoice-provider';

export class TakbullNotConfiguredError extends Error {
  constructor(operation: string) {
    super(
      `Takbull ${operation} is not wired yet — the real API base URL / endpoint paths / field ` +
        `names were never confirmed (blocked on the CCode=3 sandbox decline, see ` +
        `docs/specs/subscription-billing-provider-decision.md). Fill in the TODO(takbull-api) ` +
        `spots in src/lib/payments/providers/takbull.ts once Takbull's real API docs are in hand ` +
        `(expected after the 2026-08-10 meeting), then remove this guard.`
    );
    this.name = 'TakbullNotConfiguredError';
  }
}

interface TakbullCredentials {
  apiKey: string;
  apiSecret: string;
}

function getCredentials(): TakbullCredentials {
  const apiKey = process.env.TAKBULL_API_KEY;
  const apiSecret = process.env.TAKBULL_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new TakbullNotConfiguredError('authentication (TAKBULL_API_KEY / TAKBULL_API_SECRET missing)');
  }
  return { apiKey, apiSecret };
}

export class TakbullPaymentProvider implements PaymentProvider {
  async createTokenizationSession(params: {
    customerId: string;
    returnUrl: string;
    initialAmount: number;
    description: string;
  }): Promise<{ redirectUrl: string; sessionId: string }> {
    getCredentials();
    // TODO(takbull-api): hosted tokenization page URL + params (Masof-equivalent,
    // amount, description, success/error return URLs). Confirmed hosted-page-only
    // (no raw tokenize endpoint) but the exact URL/query shape was never captured —
    // source from Takbull's API docs, not by re-guessing the icom.yaad.net legacy
    // Yaad Sarig shape (src/app/api/checkout/route.ts) since Takbull wraps it under
    // its own contract.
    throw new TakbullNotConfiguredError('createTokenizationSession');
  }

  async verifyTokenizationCallback(payload: unknown): Promise<{
    valid: boolean;
    token?: string;
    cardLast4?: string;
    cardExpiry?: string;
    initialChargeSucceeded: boolean;
    providerTransactionId?: string;
  }> {
    getCredentials();
    // TODO(takbull-api): shape of the hosted-page return callback (query params or
    // POST body) and how to verify it's genuine (API round-trip, per the Hyp/Yaad
    // pattern in docs/specs/priority-4-live-payment-integration.md §1a — Takbull may
    // follow the same "send it back, they confirm" model since they wrap the same
    // underlying Yaad/ICC infra, but this was never confirmed for Takbull specifically).
    throw new TakbullNotConfiguredError('verifyTokenizationCallback');
  }

  async chargeToken(params: {
    token: string;
    amount: number;
    description: string;
    idempotencyKey: string;
  }): Promise<ChargeResult> {
    getCredentials();
    // TODO(takbull-api): ChargeToken endpoint URL + request field names (Token,
    // Amount, ...) + response shape (CCode, TransactionId, ...). This is exactly
    // what task #13's sandbox test was verifying when it declined with CCode=3 —
    // no successful response was ever observed, so map ChargeResult's success/
    // error/isRetryable fields from Takbull's real response once one exists,
    // don't assume the shape below the guard.
    throw new TakbullNotConfiguredError('chargeToken');
  }

  async refund(params: {
    providerTransactionId: string;
    amount: number;
    reason?: string;
  }): Promise<RefundResult> {
    getCredentials();
    // TODO(takbull-api): refund endpoint — existence and shape not documented
    // anywhere in the decision log; confirm with Takbull directly.
    throw new TakbullNotConfiguredError('refund');
  }
}

export class TakbullInvoiceProvider implements InvoiceProvider {
  async createInvoice(params: {
    customerName: string;
    customerEmail: string;
    amount: number;
    description: string;
    externalId: string;
  }): Promise<InvoiceResult> {
    getCredentials();
    // TODO(takbull-api): CreateDocument endpoint (the ₪99/month tier's document-
    // generation feature) — request field names + response (document id / PDF URL)
    // never confirmed. Per the decision log this only matters once a charge
    // succeeds, so this can be wired in the same pass as chargeToken.
    throw new TakbullNotConfiguredError('createInvoice');
  }
}
