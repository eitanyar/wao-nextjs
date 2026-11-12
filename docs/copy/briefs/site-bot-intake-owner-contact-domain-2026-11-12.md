# Site Bot sign-up chat: owner contact + domain question (2026-11-12)

Where it goes: two new steps in the Site Bot self-serve sign-up chat (/site-bot/start), right before payment. The reader is a one-man local business owner (plumber, electrician, beautician) signing up for the ₪199/month Site Bot subscription on his phone. These are short form and microcopy strings, not marketing. Singular male. Plain, warm, native spoken Hebrew. No jargon. Fixed facts:
- Support is written only and AI-first. Don't promise 24h, direct access or a call.
- The owner's mobile and email go to receipts, the cancel link, review-reply drafts and the monthly report. They are never shown on the website.
- An owner with a domain gets his site on www.{his domain}. An owner without one gets a free address under wao.co.il; the exact name can change if it's taken.
- "Not sure": we check it with him after sign-up. No time promise.

Keys (each has no variables; keep under the max length in characters):
| Key | What it must say | Max |
|---|---|---|
| contactTitle | Heading of the contact step: where we reach you | 40 |
| contactIntro | Why we ask: receipts, the cancel link, review drafts and the monthly report go here; not shown on the site. No 24h/direct promise | 140 |
| contactMobileLabel | Field label: your mobile | 25 |
| contactMobilePrefillNote | Under a pre-filled mobile: taken from your Google listing; fix it if it isn't your own mobile | 80 |
| contactMobileInvalid | Error: not an Israeli mobile; say what's expected (05X…) | 70 |
| contactEmailLabel | Field label: your email | 25 |
| contactEmailInvalid | Error: the email address doesn't look right | 60 |
| contactContinue | Button: continue | 20 |
| domainQuestion | Do you have a domain (your own web address)? Plain words | 60 |
| domainChoiceYes | Button: yes, I have one | 22 |
| domainChoiceNo | Button: no | 22 |
| domainChoiceNotSure | Button: not sure | 22 |
| domainNoNote | After "no": we give you a free address on wao.co.il; no promise of a specific name | 90 |
| domainNotSureNote | After "not sure": fine, we'll check it with you after sign-up; no time promise | 90 |
| domainInputLabel | Field label: your domain (the field's placeholder "example.co.il" stays in Latin) | 30 |
| domainInvalid | Error: this doesn't look like a domain address (e.g. example.co.il) | 70 |
| domainSubdomain | Error: enter the main domain only, without an extra prefix before it | 80 |
| domainContinue | Button: continue to payment | 24 |

Return JSON: {"labels": {"<key>": "<Hebrew>", ...}, "notes": "..."}. One pick per key.
