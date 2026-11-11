# Brief: Site-Bot "manage or cancel" link on the pay-success screen (2026-11-11)

**Reader:** an Israeli hands-on micro-business owner (plumber, electrician, AC tech…), singular male. He has just paid ₪234.82 (₪199 + VAT) for the Site-Bot monthly plan. The success screen above says the payment went through and the WAO team is building his site.

**Where it goes:** `src/lib/site-bot/checkout/accountCopy.ts` key `manageLink` — the label of an outline button under the success message. It opens his account page, where he can see the plan and cancel online (cancellation takes effect at the end of the month already paid for).

**Job of the string:** a calm, low-key exit that proves the "cancel online anytime" promise is real — not a push to cancel, not a sales line. Must fit a mobile button (short).

**Rules:** native Sabra Hebrew, singular male, no "we", no hype, gershayim/geresh not ASCII quotes. Return JSON: {"account": {"manageLink": string}}.
