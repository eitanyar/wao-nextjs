# Brief: two short lines on the Site-Bot pay page — 2026-11-11

**Reader:** Israeli hands-on trade owner (plumber, electrician, AC tech), singular male, about to pay ₪199 + VAT/month. The pay page already shows (approved, do not repeat): price, "+ מע״מ לחודש", total line, "מתחדש מחודש לחודש, בלי תקופת התחייבות.", "אפשר לבטל אונליין בכל עת. הביטול נכנס לתוקף בסוף החודש ששילמת עליו.", and the pay button.

**Write (keys → src/lib/site-bot/checkout/checkoutCopy.ts):**
1. `domainLine` — the one added line about the address: the site first goes live on a WAO address; after the second monthly payment he gets his own .co.il domain, registered in his name and paid by WAO while he stays. If he already has a domain, it gets connected. Calm fact, not a sales hook. One sentence if possible.
2. `termsConsent` — small print just above the pay button: paying means he agrees to the terms of use. The words that become the link to /site-bot/terms must be a separate key `termsLinkLabel` (code inserts it via the token {termsLink} inside `termsConsent`). Keep the token exactly.

**Rules:** native Sabra Hebrew, singular male, no "we" hype, gershayim/geresh not ASCII quotes, em-dash single-spaced. Return JSON: {"checkout":{"domainLine":"…","termsConsent":"…{termsLink}…","termsLinkLabel":"…"}}.
