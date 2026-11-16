# Brief: Site Bot review-request kit + cancel notices (2026-11-16)

**Persona:** a paying Site Bot client (₪199/mo): a one-man trade business (plumber, electrician, locksmith, cleaner) who lives on his phone. Singular male for anything addressed to him.

**Where it goes:** his private account page on wao.co.il and transactional emails from WAO. Not ads. Plain, warm, short. These are product strings, not sales copy: no promises of results, no reply-time promises, no prices.

## A. Review-request kit (go-live)
Fact base: when his site goes live he gets his Google "write a review" link and a ready message he forwards to his own customers after a job. **He sends it, not WAO** — WAO never contacts his customers. More fresh Google reviews help him show up and get chosen on Google.

1. `reviewCardHeading`: account-page card heading.
2. `reviewCardIntro`: one or two lines: after a job, send this to the customer; it takes him 10 seconds.
3. `reviewMessage`: the message HE forwards to HIS customer, on WhatsApp or SMS. Variables `{businessName}` and `{reviewLink}` (the link on its own line). The customer's gender is unknown: address the customer without gendered verb forms (or a natural neutral form). Short, personal, sounds like the owner wrote it himself, not like a corporation. No emoji overload (max one).
4. `copyButton`, `copiedToast`, `whatsappButton`: button labels and the "copied" confirmation.
5. `reviewSenderNote`: one small line under the buttons: he sends it himself, from his phone, to customers he chooses.
6. Go-live email section (sent once when the site goes live): `reviewEmailSubject`, `reviewEmailIntro` (the link and message are ready), `reviewEmailMessageLabel` (label above the quoted message), `reviewEmailOutro` (where he finds it later: his account page).

## B. Cancel notices
Facts (terms v1.1): cancel online anytime; the subscription ends at the end of the paid month (`{paidThrough}`); the site stays up 30 days after that (`{offlineDate}`); the domain and the Google profile are his and stay his. Do NOT mention a site-copy buyout or a price (undecided). Do NOT promise he can undo the cancel online; he can write to us in the box on his account page.

7. Cancel-confirmation email (on cancel day): `cancelEmailSubject`, `cancelEmailBody` (2–4 short lines: cancel received, paid until `{paidThrough}`, site stays up until `{offlineDate}`, the domain and Google profile stay his), `cancelEmailOutro` (changed his mind or a question → the message box on the account page; `{accountLink}` on its own line).
8. Pre-take-down email (7 days before `{offlineDate}`): `offlineSoonSubject`, `offlineSoonBody` (2–3 lines: on `{offlineDate}` the site goes offline; the Google profile and domain stay his), `offlineSoonOutro` (same box pointer, `{accountLink}`).

**Deliver JSON:** a flat object with exactly these keys: `reviewCardHeading, reviewCardIntro, reviewMessage, copyButton, copiedToast, whatsappButton, reviewSenderNote, reviewEmailSubject, reviewEmailIntro, reviewEmailMessageLabel, reviewEmailOutro, cancelEmailSubject, cancelEmailBody, cancelEmailOutro, offlineSoonSubject, offlineSoonBody, offlineSoonOutro`, plus `why`. Use `\n` for line breaks inside a value. Keep every `{variable}` exactly as written. Hebrew maqaf (־) before digits or Latin; gershayim, not ASCII quotes.
