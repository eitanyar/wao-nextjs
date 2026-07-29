/**
 * Invoice-provider abstraction, same "one interface, nothing else in the app
 * knows which invoicing service is in use" principle as `provider.ts`
 * (payment processing).
 *
 * ## Status: no real invoicing-service API is wired up yet
 *
 * There is no real integration here (no Green Invoice / EZcount / Hyp
 * invoicing-API call) — that's gated on a business decision (which service,
 * whether to reuse whatever the one-time-checkout flow uses) that hasn't
 * been made. A grep across the repo for "invoice"/"receipt"/"חשבונית" found
 * that the existing one-time-checkout flow (`src/app/api/checkout/*`,
 * Yaad/Hyp) does NOT issue any invoice/receipt document anywhere in this
 * codebase either — it only processes payment. So there is currently no
 * existing "the app already talks to invoicing service X" signal to follow;
 * this is a genuinely open choice for whoever picks the real provider later.
 *
 * Until that choice is made, `getInvoiceProvider()` (see `get-invoice-provider.ts`)
 * selects between:
 *   - `MockInvoiceProvider` — synchronous fake success, for tests/dev.
 *   - `PendingQueueInvoiceProvider` — the safe production-default fallback:
 *     queues a `pending_invoices` row for manual/back-office issuance rather
 *     than pretending to have issued a real invoice.
 *
 * Critical: invoice creation must NEVER block, roll back, or fail the
 * underlying charge. See `invoicing.ts`'s `issueInvoiceForCharge`, which is
 * the only place call sites should invoke this interface from — it wraps
 * `createInvoice` in a try/catch so a throwing provider can never affect the
 * charge's own success path.
 */

export interface InvoiceResult {
  invoiceId: string;
  pdfUrl?: string;
}

export interface InvoiceProvider {
  createInvoice(params: {
    customerName: string;
    customerEmail: string;
    amount: number;
    description: string;
    externalId: string; // charge.id
  }): Promise<InvoiceResult>;
}
