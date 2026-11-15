# Site Bot: "new lead" email to the business owner (2026-11-15)

**Reader:** the owner of a one-man trade business (plumber, electrician) who pays ₪199/month for his Site Bot site. He reads this on his phone, often between jobs, sometimes with dirty hands. Singular male.

**What happens:** a visitor filled the form on the owner's website (name + phone). The lead is already saved in his dashboard. This email tells him at once so he can call back while the customer is still hot. Sent from WAO (the site says "built with WAO"), to the email the owner gave when he signed up.

**Angle (yours to choose):** speed — whoever calls back first usually gets the job. Keep it short; the phone number and the call button are the whole point.

**Strings needed (placeholders stay exactly as written, in braces):**
- `subject` — email subject. Contains `{name}` (the visitor's name). Short, readable on a lock screen.
- `heading` — first line in the email body.
- `intro` — one sentence: someone left details on your site `{business}` (the business name) and is waiting for a call.
- `nameLabel` — label before the visitor's name.
- `phoneLabel` — label before the visitor's phone.
- `callButton` — label of a big tap-to-call button.
- `dashboardLink` — label of a link to all his leads in his WAO account area.
- `footer` — one sentence: why he got this email (a lead from his website, built by WAO). No unsubscribe promise.

**Hard rules:**
- No promised response time from WAO; no claims about results, conversions or money.
- Do not say "lead" in English letters; plain Sabra Hebrew a tradesman uses.
- No emoji. No exclamation-mark spam (max one in the whole email).
- The visitor's name and phone are shown only through the placeholders.

**Return JSON only:** {"strings":{"subject":"...","heading":"...","intro":"...","nameLabel":"...","phoneLabel":"...","callButton":"...","dashboardLink":"...","footer":"..."},"why":"..."}
