/**
 * Takbull API field mapping: THE ONE FILE where Takbull's real endpoint paths and request / response field names will
 * be written once Takbull's API docs (or a real sandbox response) are in hand. Every value is null on purpose: NOTHING
 * here is guessed (the CCode=3 sandbox decline means no real payload/response pair was ever seen; see takbull.ts).
 * takbull.ts stays a stub that throws until each field it needs is filled from a confirmed source, and the provider
 * conformance suite (./conformance.ts) passes against the Takbull sandbox.
 *
 * Open questions this file is waiting on (Takbull email, mission 2026-11-22): 2 (endpoints / fields), 3 (hosted page +
 * verifying its return), 5 (ChargeToken on our schedule), 6 (idempotency field), 7 (refund by API), 8 (CreateDocument:
 * gross vs net + VAT; see planVatAmount in plans.ts), 10 (retryable decline codes).
 * Zero Hebrew in this module.
 */
export const TAKBULL_FIELD_MAP = {
  baseUrl: null,
  endpoints: {
    hostedPaymentPage: null,
    verifyReturn: null,
    chargeToken: null,
    refund: null,
    createDocument: null,
    deleteToken: null,
  },
  chargeTokenRequest: { token: null, amount: null, description: null, idempotencyKey: null },
  chargeTokenResponse: { successCode: null, transactionId: null, errorCode: null, retryableErrorCodes: null },
  refundRequest: { transactionId: null, amount: null },
  createDocumentRequest: { customerName: null, customerEmail: null, amount: null, amountIsGross: null, description: null },
} as const;

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends null ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TakbullField = Leaves<typeof TAKBULL_FIELD_MAP>;

/** Every field still unconfirmed (null). Today: all of them. */
export function unconfirmedTakbullFields(): string[] {
  const out: string[] = [];
  const walk = (node: unknown, prefix: string) => {
    if (node === null) {
      out.push(prefix.slice(0, -1));
      return;
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) walk(value, `${prefix}${key}.`);
  };
  walk(TAKBULL_FIELD_MAP, '');
  return out;
}
