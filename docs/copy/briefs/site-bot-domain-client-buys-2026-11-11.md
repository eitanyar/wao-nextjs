# Brief: domain policy changed — client buys his own domain, WAO connects it (2026-11-11)

**Eitan's decision (2026-11-11), replaces the earlier "WAO registers and pays after the 2nd payment":** month 1 the site runs on a temporary WAO address. Whenever the client wants his own address (recommended from month 2), he buys a domain himself, in his own name, from any registration company (a co.il costs roughly ₪90 a year; do NOT state a price in the copy). A WAO person can help him on a short call. WAO connects the domain to his site. The domain is his from day one: he pays for it and renews it; WAO never holds or pays for it. A client who already owns a domain gets it connected.

Return JSON with two byte-exact patches: {"patches":[{"file","old","new","why"}]}. `old` must be copied exactly as given.

**1. Terms of use (legal register, same style as the document; Hebrew "we" voice as in the surrounding text; keep "co.il" without a leading dot):**
- file: docs/legal/site-bot-terms-of-use.md
- old: "בחודש הראשון האתר פועל תחת תת-דומיין של WAO. לאחר שהחיוב החודשי השני מתקבל, נרשום דומיין מסוג .co.il על שמך ונשלם על חידושו רק כל עוד אתה מנוי לשירות. לאחר סיום השירות, חידוש הדומיין הוא באחריותך, ולבקשתך נעביר את הדומיין מחשבוננו לכל יעד שתבחר. אם יש לך דומיין קיים, ניתן לחבר אותו לשירות."
- new: must say: first month on a temporary WAO subdomain; the client may buy a domain in his own name, at his own cost, from a registrar of his choice, and we will connect it to the site (we may assist him); registration, payment and renewal of the domain are his responsibility; an existing domain can be connected.

**2. Pay-page line (marketing register, singular male, short; sits under the price and terms lines):**
- file: src/lib/site-bot/checkout/checkoutCopy.ts (key domainLine)
- old: "האתר עולה קודם בכתובת זמנית של WAO. אחרי התשלום החודשי השני תקבל דומיין co.il על שמך, ואנחנו משלמים עליו כל עוד אתה מנוי. כבר יש לך דומיין? נחבר אותו."
- new: same facts, calm: starts on a temporary WAO address; when he wants his own address he buys a domain in his name and we connect it (we help); already has one? we connect it.

Rules: native Hebrew, gershayim/geresh not ASCII quotes, em-dash single-spaced, no prices.
