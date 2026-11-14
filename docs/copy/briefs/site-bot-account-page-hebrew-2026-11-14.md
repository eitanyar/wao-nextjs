# Site Bot account page + client emails: Hebrew (2026-11-14)

**Persona:** a Site Bot client — a one-man service business (plumber, mover, locksmith) paying ₪199 + VAT a month. He lands on this page from an email link to see his subscription, update his card, write to support, or cancel. Busy, on his phone, slightly suspicious of subscriptions.

**Job of this copy:** calm, plain, trustworthy account microcopy. Not marketing. No selling, no exclamation marks, no jokes. Singular male. Short lines.

**Facts (use only these):**
- Price is shown as the actual monthly charge, VAT included (e.g. "234.82 ₪ כולל מע״מ" — the number is filled in by code).
- Cancelling stops future charges. Access continues until the end of the period already paid for (date filled in by code). Cancelling is done only with the button on this page, never by message.
- Links in emails are valid for 30 minutes; a new one can be requested on the account page with the client's email.
- Support is in writing: the message box on this same account page, or a reply to the support email. Wherever the English says "contact us", point him to the message box on this page instead. No phone, no hour/day promises, no founder name.
- Card number shows only the last 4 digits.

**NEW strings to add (decided by the owner today):** cancel is now two steps.
- `cancelConfirm.question` — shown after he taps the cancel button: asks him to confirm, and states plainly what happens (no more charges, access until {date}).
- `cancelConfirm.yes` — the button that really cancels.
- `cancelConfirm.back` — the button that keeps the subscription and closes the question.

**Fix while translating:**
- `route.ts:success.message` says "a cancel link has been sent" — the link actually opens the full account page (manage, card, support, cancel). Say that.
- `email.ts:magicLink.subject` / body: same — it is the account-page link, not a cancel link.
- `page.tsx:metadata.title`: Hebrew page title; code appends "‏ | WAO", so give only the part before it, and it must not end in a Latin token.

**Placeholders** `{amount}`, `{currency}`, `{cardLast4}`, `{cardExpiry}`, `{date}`, URLs: keep them exactly, in braces. For the amount, the code will render one formatted price string, so write `{price}` instead of `{amount} {currency}`.

**Strings (51):**
- `page.tsx:metadata.title` — EN: Manage subscription | WAO — WHERE: <title> of every account-page state (robots noindex)
- `page.tsx:cardUpdate.callbackError` — EN: We couldn't update your card. Nothing was changed. Please request a new link and try again. — WHERE: ?cardUpdate=error landing (no token): card-update callback failed
- `page.tsx:noToken.intro` — EN: This page needs a valid link from an email we sent you. Request a new one if you've lost it. — WHERE: No token in the URL; shown above the request-link form
- `page.tsx:link.expired` — EN: This link has expired. Please request a new one. — WHERE: Token expired (30-minute links); above the request-link form
- `page.tsx:link.used` — EN: This link has already been used. — WHERE: Token already consumed (e.g. after a cancel or card update); above the request-link form
- `page.tsx:link.invalid` — EN: This link is invalid. — WHERE: Unknown token; above the request-link form
- `page.tsx:subscription.notFound` — EN: We couldn't find that subscription. — WHERE: Valid token but no subscription row
- `page.tsx:header.subtitle` — EN: Manage your subscription — WHERE: Subtitle under the logo on the main account view
- `page.tsx:notice.cardUpdated` — EN: Your card was updated successfully. — WHERE: Banner after ?cardUpdate=success
- `page.tsx:notice.cardUpdatedRecharged` — EN: Your card was updated and your subscription is active again. — WHERE: Banner after ?cardUpdate=success-recharged (past-due recovered)
- `page.tsx:notice.pastDue` — EN: We couldn't charge your card. Please update your payment method to keep your subscription active. — WHERE: Amber banner when status = past_due
- `page.tsx:row.status` — EN: Status — WHERE: Label, subscription card row 1
- `page.tsx:status.pending` — EN: Pending — WHERE: Value of the Status row when subscription.status = pending
- `page.tsx:status.active` — EN: Active — WHERE: Value of the Status row when subscription.status = active
- `page.tsx:status.past_due` — EN: Past due — WHERE: Value of the Status row when subscription.status = past_due
- `page.tsx:status.canceled` — EN: Canceled — WHERE: Value of the Status row when subscription.status = canceled
- `page.tsx:status.paused` — EN: Paused — WHERE: Value of the Status row when subscription.status = paused
- `page.tsx:row.recurringAmount` — EN: Recurring amount — WHERE: Label, subscription card row 2
- `page.tsx:row.card` — EN: Card — WHERE: Label, row shown when card_last4 is set
- `page.tsx:row.accessUntil` — EN: Access until — WHERE: Label, row shown after a cancel at period end
- `page.tsx:row.nextCharge` — EN: Next charge — WHERE: Label, row shown when next_charge_at is set
- `page.tsx:state.alreadyCanceled` — EN: This subscription is already canceled. — WHERE: Instead of the buttons when status = canceled
- `page.tsx:state.cancelScheduled` — EN: Your subscription has been canceled. You will not be charged again. — WHERE: Instead of the buttons when a cancel at period end is scheduled
- `CancelSubscriptionButton.tsx:button.idle` — EN: Cancel subscription — WHERE: The single red cancel button (one click cancels; there is NO confirm dialog)
- `CancelSubscriptionButton.tsx:button.loading` — EN: Canceling… — WHERE: Cancel button while the request runs
- `CancelSubscriptionButton.tsx:error.invalidToken` — EN: This link has expired or was already used. Request a new one to cancel. — WHERE: Under the button when the cancel API says invalid_token
- `CancelSubscriptionButton.tsx:error.generic` — EN: Something went wrong. Please try again or contact us. — WHERE: Under the button on any other failure
- `CancelSubscriptionButton.tsx:done.message` — EN: Your subscription has been canceled. You will not be charged again. — WHERE: Replaces the button after a successful cancel
- `CancelSubscriptionButton.tsx:done.accessUntil` — EN: Access until — WHERE: Row under the done message when cancelled at period end
- `CardUpdateButton.tsx:button.idle` — EN: Update payment method — WHERE: Card-update button (amber when past_due, outlined otherwise)
- `CardUpdateButton.tsx:button.loading` — EN: Redirecting… — WHERE: While fetching the hosted tokenization URL
- `CardUpdateButton.tsx:error.invalidToken` — EN: This link has expired or was already used. Request a new one to update your card. — WHERE: Under the button on invalid_token
- `CardUpdateButton.tsx:error.generic` — EN: Something went wrong. Please try again or contact us. — WHERE: Under the button on any other failure
- `RequestLinkForm.tsx:label.email` — EN: Email — WHERE: Visible <label> of the email field
- `RequestLinkForm.tsx:button.submit` — EN: Email me a new link — WHERE: Submit button
- `RequestLinkForm.tsx:error.generic` — EN: Something went wrong. Please try again or contact us. — WHERE: Fallback when the API gives no error string, or the network fails
- `route.ts:error.invalidEmail` — EN: A valid email is required. — WHERE: Shown under the request-link form (400)
- `route.ts:error.rateLimited` — EN: Too many requests. Please try again later. — WHERE: Shown under the request-link form (429)
- `route.ts:success.message` — EN: If an account exists for that email, a cancel link has been sent. — WHERE: Replaces the form after a successful request (same reply whether or not the email exists)
- `route.ts:error.server` — EN: Failed to process request. — WHERE: Shown under the request-link form (500)
- `email.ts:magicLink.subject` — EN: WAO — Manage your subscription — WHERE: Subject: manage/cancel link email. Sent at Site Bot sign-up (activatePlanSubscription) and on every "Email me a new link" request
- `email.ts:magicLink.body` — EN: Use this link to view your subscription and cancel it if you want to (valid for 30 minutes): — WHERE: Body line 1, followed by the link on its own line
- `email.ts:renewal.subject` — EN: WAO — Your subscription renewal receipt — WHERE: Subject: monthly renewal receipt (cron, every successful charge incl. Site Bot plan rows)
- `email.ts:renewal.body` — EN: Your WAO subscription renewal charge of {amount} {currency} on card ending {cardLast4} was processed successfully. — WHERE: Body line 1
- `email.ts:renewal.cancelLine` — EN: Want to cancel? Use this link any time (valid for 30 minutes from now, generate a new one from the cancel page if it expires): — WHERE: Body line 3, followed by {cancelUrl}
- `email.ts:cardUpdateNeeded.subject` — EN: WAO — We could not process your subscription charge — WHERE: Subject: hard (non-retryable) decline
- `email.ts:cardUpdateNeeded.body1` — EN: We tried to charge your card for your WAO subscription and it was declined. — WHERE: Body line 1
- `email.ts:cardUpdateNeeded.body2` — EN: This charge will not be retried automatically. Please update your card or manage your subscription here: — WHERE: Body line 2, followed by {manageUrl}
- `email.ts:cardExpiring.subject` — EN: WAO — Your card on file is expiring soon — WHERE: Subject: proactive card-expiry notice (cron-card-expiry, once per month)
- `email.ts:cardExpiring.body1` — EN: Heads up: the card on file for your WAO subscription (ending {cardLast4}) expires {cardExpiry}. — WHERE: Body line 1
- `email.ts:cardExpiring.body2` — EN: To avoid an interruption to your subscription, please update your card here: — WHERE: Body line 2, followed by {updateCardUrl}

**Return JSON only:** {"strings": {"<id>": "<Hebrew>", ...}, "new": {"cancelConfirm.question": "...", "cancelConfirm.yes": "...", "cancelConfirm.back": "..."}, "notes": ["anything the engineer or QA must know"]}. Every id above must appear in "strings".
