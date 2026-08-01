# Payment/Invoicing Provider Decision Log — Recurring Subscription Billing Engine

Status: **REOPENED (2026-08-01)** — Eitan is now weighing **Payme.io** and **Grow (Meshulam)**
against the prior Takbull pick; nothing below should be treated as final. The Takbull decision
was never fully unblocked in the first place (task #13's `ChargeToken` test kept declining with
CCode=3 — see below), so this reopening isn't a reversal of a working integration, it's widening
the search before committing engineering time to any one provider's real (non-mock) wiring. Do
not build further against Takbull specifically until a provider is re-selected. The
provider-agnostic `PaymentProvider`/`InvoiceProvider` interfaces already in `src/lib/payments/`
mean none of the engine code built so far needs to change regardless of which provider wins.

---

### Prior status (superseded by the reopening above, kept for history)

Status: DECIDED (provisional pending task #13's sandbox verification) — **Takbull for both
charging and invoicing, all-in-one (₪99/month tier)**, decided by Eitan 2026-07-30, superseding
the earlier "Takbull charges + Hyp invoices" plan. Reason: the current invoicing system
(iFreelance) has too limited a basic API to build the auto-invoice-per-charge flow against, so
there's no reason to keep Hyp in the loop for invoicing either — Takbull's own document-generation
feature covers it in one provider. Task #3 (asking Hyp about their invoice API) is now moot for
this engine. Only remaining blocker is task #13 (empirical ChargeToken verification), for which
Takbull has now supplied a live test card. See `src/lib/payments/` for the built, provider-agnostic
engine itself — `PaymentProvider` / `InvoiceProvider` interfaces in `provider.ts` /
`invoice-provider.ts` mean this decision does not block or reshape the code already built; it only
selects which concrete provider module(s) get wired in.

## Takbull — findings so far

- Reseller wrapping `icom.yaad.net` (Yaad/ICC) infrastructure under their own API
  (`API_Key`/`API_Secret` auth). Tokenization only via a hosted payment-page redirect flow (no raw
  tokenize endpoint).
- **2026-07-30, via their support (Hebrew, in writing):** confirmed you can charge via their
  token-based API with **no per-transaction fee at 69 ₪/month, as long as you don't use their
  document (invoice/receipt) generation feature.** Using documents moves you to their ₪99/month
  tier (includes ~200 documents), which also issues invoices automatically.
- **Confirmed 2026-07-30, in writing:** both the 69₪ and 99₪ tiers are genuinely unlimited by
  API-call/charge volume — no fair-use ceiling on either. The tier choice is purely about whether
  document generation is used, not transaction count.
- **Decided 2026-07-30 (Eitan):** since document generation is now in scope (iFreelance's API is
  too limited to build the invoicing flow against — see Hyp/iFreelance section below), whether a
  given charge triggers document creation **no longer matters** — go straight to the ₪99/month
  all-in-one tier and use Takbull for invoicing too. This eliminates the need for
  `invoice-provider.ts`'s pending-queue/external-provider abstraction as a *cross-vendor* seam —
  it can still be kept structurally (in case of a future provider swap) but the fallback path is
  now the primary path.
- **Test card supplied by Takbull rep (Shahar), 2026-07-30, sandbox/test terminal only:** card
  `5326105300985960`, exp `12/26`, ID `890108566`, CVV `168`. Works only on the test terminal, max
  charge amount ~$5.
- **Re-tested 2026-07-30 with this card, via a fresh API-created order + headless run of Takbull's
  own hosted payment page (`icom.yaad.net`, reusing the prior session's Playwright automation):**
  progress over the prior attempt — the card now passes validation (correct BIN `532610`/last-4
  `5960` echoed back, no more "card not valid"), but the transaction is declined with **CCode=3
  ("התקשר לחברת האשראי" — call the credit card company)** before a token is ever issued. Different
  failure mode than the earlier CCode=15, but still blocked — `ChargeToken`'s independence from
  `DealType`/`RecuringInterval` remains unconfirmed since no token was produced either time.
  Open question for Shahar: does this specific test card need an OTP/3DS step-up we're not
  completing headlessly, or is there a card/terminal mismatch?
  **Ruled out 2026-07-30:** re-ran the identical flow with `Currency: 'USD'` instead of `ILS`
  (same amount, both well under the $5 cap Shahar mentioned) — got the exact same CCode=3 decline.
  Amount/currency is not the cause; the decline is at the card/terminal/acquirer level.
- **Reframed 2026-07-30 (Eitan):** task #13 originally bundled two questions — (a) does a charge
  without `CreateDocument` avoid the document-tier cap, and (b) does `ChargeToken` actually work
  and issue a token, independent of Takbull's own `DealType`/`RecuringInterval` subscription
  engine. **(a) is now moot** — we're intentionally on the ₪99/month tier and want documents
  generated for invoicing, so whether an un-flagged charge burns a document credit no longer
  matters. **(b) is still essential and unrelated to invoicing** — it's the basic proof that
  Takbull can charge a stored token at all, on our own schedule, before it can replace the mock
  `PaymentProvider`. Task #13 remains open, scoped to (b) only.
- **Token portability, confirmed by their own support: tokens cannot be exported/transferred to
  another provider.** Decided 2026-07-30 (Eitan): accept this as a known constraint rather than a
  Takbull-specific negative — Israeli processors generally don't offer cross-provider token
  portability, so this isn't a real differentiator against alternatives. Not weighed further in
  this decision.

| Subscribers | Monthly revenue (example) | Takbull cost (69₪ tier) | Effective rate |
|---|---|---|---|
| 20  | 5,980 ₪  | 153 ₪ | 2.6% |
| 50  | 14,950 ₪ | 278 ₪ | 1.9% |
| 200 | 59,800 ₪ | 906 ₪ | 1.5% |

## Hyp / iFreelance — superseded, out of scope for this engine

Task #3 (asking Hyp about a callable invoice-issuance API) is **no longer needed for the recurring
engine.** Eitan confirmed 2026-07-30: iFreelance is the current invoicing software, but its API is
too limited/basic to build an auto-invoice-per-charge flow against. Rather than route invoicing
through a second vendor (Hyp) whose invoice-API status was still unconfirmed, the decision is to
consolidate charging + invoicing onto Takbull's own ₪99/month all-in-one tier (see above).

This does **not** affect the existing one-time-checkout subsystem
(`src/app/api/checkout/*`, `src/lib/checkout/yaad-verify.js`,
`docs/specs/priority-4-live-payment-integration.md`), which stays on Hyp/Yaad Sarig untouched —
this decision is scoped to the new recurring-subscription engine only.

## Decision (2026-07-30) — superseded by the reopening banner at the top of this file

**Takbull, all-in-one: `ChargeToken` for recurring charges + Takbull's native document generation
for invoicing, on the ₪99/month tier.** This replaces the earlier "Takbull charges + Hyp invoices"
split. Rationale: iFreelance's API can't support per-charge auto-invoicing, and there's no
compelling reason to bring in Hyp as a second vendor for invoicing when Takbull already does both
under one API/contract. `invoice-provider.ts`'s `InvoiceProvider` interface stays in place as an
abstraction (so a future provider swap is still just a config/module change), but Takbull is now
both the `PaymentProvider` and `InvoiceProvider` implementation being wired in.

Still blocking before wiring the real (non-mock) providers: task #13's tokenize+charge test
passing on Takbull's side — now unblocked by the test card Takbull's rep supplied (see above),
re-run needed. **This never got resolved — see below, this is the actual reason the decision
reopened, not a change of heart.**

## Reopening detail (2026-08-01)

Task #13 was re-run and the tokenize+charge test **still failed** — declined with CCode=3
("call the credit card company") before a token was ever issued, on both the original attempt
and a currency-variant re-test (ILS vs. USD, ruling out amount/currency as the cause). Open
question sent to Shahar (Takbull rep): OTP/3DS step-up not completed headlessly, or a
card/terminal mismatch — unanswered as of this writing. Given the engine still can't
demonstrably charge a stored token on Takbull, Eitan opened evaluation of two alternatives:

**Payme.io** — outreach sent (4 questions: token-charge API, pricing, invoice-per-charge API,
sandbox availability), awaiting reply.

**Grow (Meshulam)** — developer docs (`developers.grow.business`) assessed by Eitan-Dev,
2026-08-01:
- **Charging: looks better than Takbull.** `POST /api/light/server/1.0/createTransactionWithToken`
  is a direct server-to-server call with a synchronous JSON response (`status`/`err`/
  `transactionId`) — no customer redirect, no stall. This is the exact capability Takbull's
  CCode=3 never demonstrated. Worth a real sandbox test (3 documented test cards available,
  e.g. `4580458045804580`).
- **Invoicing: does NOT meet the bar, disqualifying for Grow-as-all-in-one.** No callable
  "create invoice for this charge" endpoint exists. Invoice generation is only a side effect of
  the hosted-page `createPaymentProcess` flow (the initial signup redirect), delivered async via
  webhook — the recurring-charge endpoint above has no invoice-triggering fields at all, and
  webhook registration itself requires contacting Grow support (no self-service). This is
  structurally the same problem that ruled out iFreelance, not solved by paying for a higher
  tier — no pricing/tier information exists in the developer docs to even confirm a paid tier
  changes this.
- **Net:** if Grow is picked, it would be a **charging-only provider** — invoicing would need to
  stay on `PendingQueueInvoiceProvider` (manual/back-office) or bring back a second invoicing
  vendor, reopening exactly the two-vendor question the ₪99 Takbull tier was meant to close.
- Full technical fit-check against `PaymentProvider`/`InvoiceProvider`: auth model maps cleanly
  (userId/pageCode, comparable to Takbull's API_Key/API_Secret); webhooks need Grow support
  contact to enable and have no documented signature verification; tokenization is still a
  hosted-page redirect (same shape as Takbull, no regression/improvement there).

**Status: genuinely undecided.** No provider has a demonstrated working token-charge yet — that
remains the single hard gate before any real (non-mock) `PaymentProvider` gets wired in,
regardless of which vendor wins.
