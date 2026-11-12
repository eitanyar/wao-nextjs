# Google Ads payments + advertiser verification for new Ads Bot accounts (Dror, web-checked 2026-11-12)

Saved by Adam from Dror's hand-back.

**Brief: Google Ads payments-profile and advertiser verification for new Israeli Ads Bot accounts (Dror, web-checked 2026-11-12)**

**Bottom line:** Google now runs two separate checks. Both can be passed easily by a one-man tradesman if three things line up exactly: the name on his payments profile, the name on his ID, and the name on his card. The work has to be done by him, live, with WAO guiding him. WAO may legitimately create the account from our manager account (MCC) and guide him through it. WAO may not enter his card, upload his ID or do his selfie. That is the client's job under Google's rules. The Google step that eats time is a review of up to 5 business days (rarely up to 30). That review can collide with the credit windows. So: don't create the account until the client is on a call ready to enter billing, and launch only after any verification task that carries a deadline is cleared.

---

**1. What Google requires today (as of Nov 2026)**

There are two different checks. Don't mix them up in copy or in the chat.

**A. Payment-method confirmation and billing checks**
- Since Feb 2026 this sits in the same place in Google Ads as advertiser verification, called "Account" under Policy (ppcnewsfeed, 2026-02-08). Don't hard-code that click path anywhere permanent.
- How it works: Google makes a small temporary charge (at most $1.95). The code is the last 6 digits of the charge description. It shows within about 5 minutes on the card, and the refund arrives within 14 days.
- Google may also ask: "Who pays for ads?" (agencies must name the client's profile), payment-history questions, or "make a payment" (Google adspolicy/15577076).
- If Google suspects a billing issue, it can ask for: legal name, address, date of birth, a photo of the ID, proof of address, and a photo of the card. A suspended account cannot run any ads (google-ads/13704200).

**B. Advertiser (identity) verification**
- **When it starts:** whenever Google asks, by in-account notice or email. Google says "all advertisers will eventually be required", rolled out gradually. Changing the legal name on the payments profile triggers it again immediately (adspolicy/9703665).
- I found no Google statement that every new account must verify at signup or at first charge. Eitan's experience that "Google insists on every profile" fits the gradual rollout, but it is field experience, not documented policy.
- **With a deadline:** if verification isn't done by the deadline, the account is paused, and deadlines can't be extended. Google's FAQ (fetched via search; the page now returns 404) gives 30 days to start and another 30 to finish.
- **No deadline:** ads keep running, but Google may limit serving until the client verifies (adspolicy/15588490).
- **Individual tasks:** government photo ID with the name matching the payments profile. Phone confirmation using a number with the profile's country code (5 failed tries means ID is required). Possibly a video selfie, which must be done by an admin on the payments profile.
- **Organization tasks:** a registration document (certificate of incorporation or a commercial-register extract) plus the photo ID of an authorized representative. The representative must be an admin of the account or of the payments profile.
- **ID photo rules:** valid, in colour, taken with the phone's native camera. No photocopies, screenshots or photos taken through third-party apps. Front and back uploaded separately, through the Google Ads interface only (adspolicy/9872280).
- **Review time:** up to 5 business days, rarely up to 30 (adspolicy/15588490).
- **Not verified for Israel:** Google's per-country list of accepted documents for Israel wouldn't load. I can't confirm whether a VAT dealer certificate (תעודת עוסק מורשה) counts as an organization registration document. Check it the first time it comes up, inside a real account.

**2. Common failure causes and how to avoid them**

| Failure cause | How to avoid it |
|---|---|
| Name mismatch between profile, ID and card (Google's most-cited failure, 9872280 and 13704200) | The profile name is his legal name exactly as on his ID card (ת״ז), in the same script he'll upload. The card must be in his own name: not his wife's card, not another business's card. |
| Wrong account type | For a sole trader, whether עוסק פטור or עוסק מורשה, the default is **Individual**: he is a natural person and verifies with his ID alone. Use **Organization** only if he has a registered company (בע״מ), with the certificate of incorporation (תעודת התאגדות). Google Ads allows switching type only once, by creating or choosing another profile, and sometimes only through support (google-ads/14130831). So get it right the first time. |
| Trade-off of Individual | His personal name appears as the advertiser in ad disclosures and the Ads Transparency Center (15577076). That's normal for tradesmen, but tell him up front. |
| Invoices and VAT | An עוסק מורשה may care what tax status and VAT ID appear on Google's invoices. I couldn't verify how Israeli tax status maps to Google's options. Route this to his accountant; we don't advise on it. |
| Bad photos | Blur, glare, cut-off corners, black-and-white or expired ID (13704200). |
| Business phone with no Israeli +972 number, or one he can't receive codes on | Use a number he can receive codes on, with the Israeli country code. |
| Related accounts | Never reuse a payment method or email from another suspended or old account. Related accounts get suspended too (13704200). A tradesman with a dead old account must say so up front. |

**3. What WAO can and cannot do as a partner**

**Allowed:**
- Create the client account from our MCC. No separate email or password is needed, and country, time zone and currency are fixed at creation, so set Israel, Jerusalem time and ILS right away (google-ads/7456139).
- Invite the client's own Google account as an **Admin**. This also matches our "client owns the account" promise.
- Answer the "is your organization an agency?" question with **Yes**. Google warns that a wrong answer can get the account paused or suspended. Name the client's payments profile as payer.
- Send the client Google's verification link for each task (15577076).
- Screen-share and walk him through it live.

**Not allowed (Google's rules plus our own ownership promise):**
- Logging in as the client.
- Typing his card details.
- Taking or uploading his ID or selfie.
- Creating a payments profile in his name from a WAO login.

Google says only an admin on the payments profile can do the selfie, and that agencies must not upload documents for several advertisers in one file (9872280).

**Avoid:** paying from WAO's own payments profile. That would make WAO the payer in the "who pays" disclosure, break our client-owns-billing promise, and open spend-liability risk.

**Partner status:** Members, Partners and Premier Partners all get standard Google Ads support. "Dedicated account support" is listed only for Premier Partners, by invitation only (google-ads/9029198). There is no documented fast lane for verification. Don't promise one.

**4. Easier onboarding for the Ads Bot**

**Ask for before the call (owner: the bot's chat):**
1. Legal type: עוסק פטור, עוסק מורשה, or בע״מ. Company name and number if בע״מ.
2. Full name exactly as on his ID card.
3. Business address, matching the address he'll give Google.
4. A valid ID card or passport physically in his hand, plus a phone with a working camera.
5. A credit card in **his own name** (or the company's, if בע״מ), with an SMS-capable phone for the card issuer's codes.
6. A Gmail or Google account he controls. Not a shared one, not his nephew's.
7. "Has this business ever advertised on Google Ads, under any account?" This covers both credit eligibility and the related-accounts risk.
8. 20 minutes on a call, at a time when he can also open his banking app.

**Order of steps on one call (day 0):**
1. WAO creates the account from the MCC and invites his Google account as Admin.
2. He accepts the invite.
3. He sets up billing himself: Individual or Organization, name as on ID, his card.
4. The payment-method confirmation code arrives within minutes. He enters it in the same session if it's requested.
5. If an advertiser-verification task appears, he starts it immediately: ID photo with the native camera, phone confirmation, selfie if asked.
6. WAO answers the agency and who-pays questions on its side and confirms his profile is named as payer.

**In parallel (WAO):** build campaigns paused. Launch when there is no verification task with a deadline, or once it is approved.

**What to tell him to expect:**
- "Google usually approves within a few business days. Occasionally it takes longer, and that's outside our control."
- "A small temporary charge will appear on your card and will be refunded."
- "Your name will appear as the advertiser."

**Lines the bot should say (English intent; Tamar writes the Hebrew):**
- "The card and the ID must be in the same name as the account."
- "Use your phone's camera, not a scan or a screenshot."
- "We'll never ask for your card number or a photo of your ID. You enter them directly with Google."
- "If Google emails you about verification, forward it to us that same day."

**Owners:** Eitan-Dev builds the intake fields and a status tracker. WAO ops (Eitan) runs the call.

**5. Interaction with the new-advertiser credit windows**

- **Partner route:** WAO must assign the tier within **20 days of account creation**. The spend must then be reached within **60 days of redemption**.
- **Self-signup route:** the offer must be applied within **14 days of first impression**.
- **The risk:** a verification stall (up to 30 days in rare cases) can burn the 20-day assignment window. A pause after redemption eats the 60-day spend window. At ≥₪1,500/month, losing 2–3 weeks could miss a 1:1 tier.

**Rules:**
- (a) Never create the account ahead of the billing call.
- (b) Assign the partner tier only once ads can actually serve (billing confirmed and no open verification deadline), but no later than **day 15** after creation, to leave a buffer.
- (c) Eitan-Dev builds a dashboard alert at day 10 and day 15 after creation if the tier isn't assigned or verification is still open.
- (d) If verification is still pending on day 15, the operator decides: assign anyway and accept the spend-window risk, or skip the credit.

**Should verification come before launch?** Yes, if Google has opened a task with a deadline. A pause mid-launch wipes out bidding's learning phase and the credit spend window. If there is no task, launch; don't wait for a check Google hasn't asked for.

**6. Page and terms implications**

**/google-ads page and terms (Tamar → Noa; legal wording reviewed by Adam). Suggested claims in English:**
- "Your ads go live after Google confirms your payment details, and after identity verification if Google asks for it. This usually takes a few business days and is controlled by Google."
- "The Google Ads account and payment method are in your name. You enter them directly with Google. WAO never handles your card or ID."
- Don't promise a launch date or a timeline in the terms.

**The 30-day refund clock starting "when the first ad goes live":** it still makes sense, and it's actually the right anchor, because it keeps Google's verification delay off the client's clock.

**Tighten it (Adam decides):**
- (a) Define "goes live" as the first impression recorded in the Google Ads account. That's objective, it's in our data, and it's the same event that anchors the self-signup credit.
- (b) The clock pauses while Google has the account paused or suspended for verification or billing.
- (c) Add a cut-off date for the client: if he hasn't completed Google's billing or verification within N days (suggest 21), WAO may pause the subscription or cancel with a refund.
- (d) Adam also needs to decide whether the ₪249 charge starts at signup or at first impression. Today's clock wording implies a client can pay for weeks of verification limbo.

This also closes open question #6 in /home/eitanya/wao/docs/legal/ads-bot-terms-noa-qa-2026-11-11.md: the client creates the payments profile, in his own name.

**Existing handling in the repo**
- /home/eitanya/wao/src/lib/google-ads/live-readiness.js has a manual yes/no item, `clientBillingAccepted` ("Client-owned billing profile and Google billing terms accepted"), plus `clientAccountOwned` and `mccInvitationAccepted`. The spec is /home/eitanya/wao/docs/specs/priority-5-live-readiness-consent-ui.md.
- There is **no** tracking of payment-method confirmation, advertiser-verification status or deadline, account-creation date, or the credit-tier deadline.
- /home/eitanya/wao/src/app/(app)/google-ads/onboarding/page.tsx has no billing or verification step. It only has a sandbox-connection check and a comment around line 293 about payment and account creation.
- Docs (trust-flow, readiness playbook) only state the ownership principle.

**Suggested build for Eitan-Dev (spec stage, Adam to scope):** add `paymentMethodConfirmed`, `advertiserVerificationStatus` (none / pending / deadline-date / approved), `accountCreatedAt` and `creditTierAssignedAt` to the readiness record. Block launch on any open deadline task. The Google Ads API does expose advertiser identity verification status, per its developer docs page on advertiser-identity-verification. That's worth checking rather than relying on manual entries.

**Handoffs**
- **Adam:** decide terms points 6(a)–(d) and the ₪249 start point.
- **Tamar:** bot onboarding lines and page/terms wording, then Noa QA.
- **Eitan-Dev:** intake fields, status fields and day-10/15 alerts.
- **Eitan:** on the first real onboarding, record whether Google opened tasks at signup and which Israeli documents it accepted, so I can firm up the unverified Israel points.

**Unverified (flagged):** whether verification is mandatory at signup for new Israeli accounts; the per-country list of accepted documents for Israel (including whether תעודת עוסק counts); how Israeli tax status and invoicing map to Google's options.

**Sources (all checked 2026-11-12)**
- https://support.google.com/adspolicy/answer/15577076?hl=en (verification tasks, agency/client, timelines)
- https://support.google.com/adspolicy/answer/9872280?hl=en (document requirements, name matching, photo rules)
- https://support.google.com/adspolicy/answer/9703665?hl=en (triggers, "all advertisers eventually", re-verification)
- https://support.google.com/adspolicy/answer/15588490?hl=en (timelines: 5 business days, rarely 30; pause at deadline)
- https://support.google.com/adspolicy/answer/9870201 (completing verification, name/location matching)
- https://support.google.com/adspolicy/answer/9720978 (FAQ: 30 days or paused; returns 404 now, content seen via search)
- https://support.google.com/google-ads/answer/13704200 (billing and payment suspensions, documents, common mistakes)
- https://support.google.com/google-ads/answer/7268503 and https://support.google.com/google-ads/answer/14130831 (profile types, one-time switch)
- https://support.google.com/google-ads/answer/7456139 (creating accounts from an MCC; country and currency fixed)
- https://support.google.com/google-ads/answer/9357347 and https://support.google.com/google-ads/answer/15758513 (MCC billing setups and link types; not needed for client-card billing)
- https://support.google.com/google-ads/answer/9029198 (Partner benefits: dedicated support is Premier-only, by invitation)
- https://ppcnewsfeed.com/ppc-news/2026-02/google-moves-payment-verification-account-section/ (Feb 2026 move of payment verification)
- https://marzagency.com/resources/google-ads-verification-guide/ (Aug 2026 practitioner guide; secondary)
- https://developers.google.com/google-ads/api/docs/account-management/advertiser-identity-verification (API status field)
- Prior credit brief: /home/eitanya/wao/docs/reviews/google-ads-new-advertiser-credit-dror-2026-11-12.md

## Adam decisions (2026-11-12, Eitan may override)
- Terms: "goes live" = first impression recorded in the account; the 30-day refund clock pauses while Google has the account paused/suspended for verification or billing; if the client hasn't completed Google's billing/verification within 21 days of signup, he may cancel with a full ₪249 refund.
- ₪249 is charged at signup (Eitan: "from day one"); the refund rules above cover verification limbo.
- Page line (to Tamar): ads go live after Google confirms his payment details (and identity, if Google asks), usually a few business days, controlled by Google; the account and card are in his name and he enters them directly with Google.
