/**
 * Site Bot product fact sheet for AI-drafted staff replies (src/lib/site-bot/supportDraft.ts).
 * English facts only; the model writes the Hebrew reply at runtime and staff approve every draft.
 * Sources: Site Bot terms of use v1.1 (docs/legal/site-bot-terms-of-use.md, updated 15.11.2026) and the approved
 * /site-bot page copy (docs/copy/site-bot-r2-final-candidate-2026-11-12.txt). When either changes, update this file
 * and bump SITE_BOT_SUPPORT_FACTS_VERSION. Anything not stated here is unknown to the model and must be escalated.
 */
export const SITE_BOT_SUPPORT_FACTS_VERSION = '2026-11-16 (terms v1.1)';

export const SITE_BOT_SUPPORT_FACTS = `
# Site Bot — product facts (${SITE_BOT_SUPPORT_FACTS_VERSION})

## What the service is
- Site Bot is a monthly service by WAO (Wao Internet Marketing, Rishon LeZion) for local, mostly one-person businesses.
- It includes: building and hosting the business website, managing the business's Google Business Profile as a manager
  invited by the owner, a review process (ready review-request messages and suggested replies to reviews), and a
  monthly report.
- The site has a separate page per service the business offers, built after checking what people search for in the
  owner's area. Visitors see opening hours and a click-to-call button.
- Website texts are written with AI models from the details the owner gave and public information. A person at WAO
  reviews the site before it goes live. AI texts can contain mistakes; the owner should report any inaccuracy and WAO
  fixes it.
- The owner confirms the business facts he gave (licence, warranty, years of experience) and is responsible for them.
- Being rolled out to pilot clients "in the coming weeks", at the same price: the owner's reviews shown on the site, the
  review flow, and the monthly report. Do not promise a date for these.

## Changes
- Changes (hours, prices, services, phone, etc.) are requested with one written message in the message box on the
  owner's account page. A person on the WAO team reads every message and updates both the site and the Google profile.
- Do not promise how fast a change or answer will happen.

## Address and domain
- If the owner has his own domain, the site goes live on it within three business days from receiving working access
  to it. Without a domain, the site goes live on a free WAO sub-domain (ending in wao.co.il) within one business day
  of payment.
- The owner can buy a .co.il domain in his own name, at his own cost, from any registrar at any time, and WAO connects
  it. Registration, payment and renewal of the domain are the owner's responsibility.
- The wao.co.il sub-domain belongs to WAO; the owner may use it free while he is a client; it ends with the site and
  cannot be transferred.
- A domain registered in the owner's name and the Google Business Profile always stay the owner's.

## Price and billing
- 199 ILS + VAT per month. Charged on the joining day and then on the same date every month. No trial period.
  Monthly, no commitment. A tax invoice is issued and emailed automatically for every charge.
- Hosting is included.
- A one-time static copy of the site: free after 12 paid months as a client; before that 900 ILS + VAT, paid in
  advance against a tax invoice. Requested in writing while a client, or until the site stops being available.
- No other prices exist. Never quote any other price, discount or refund amount.

## Cancellation
- The owner can cancel online at any time from his account page. The cancellation takes effect at the end of the month
  already paid for; he is not charged again.
- Pro-rata refund when cancelling within 14 days of joining. An extended four-month cancellation period applies to a
  person with a disability, a senior citizen and a new immigrant.
- After cancelling, the site stays available for 30 days from the end of the last paid month, then stops being
  available. (If he cancelled within 14 days and got a pro-rata refund, the 30 days count from the cancellation.)
- If a monthly charge fails and is not settled after 7 days of retries, the service is suspended: updates,
  management, new pages and the bot stop; the public site stays available 30 more days, then stops. Paying the unpaid
  month restores the service; the billing date does not change.
- On termination WAO's manager access to the Google profile is removed, and the owner's data is deleted or handed to
  him, as he chooses, within 30 days.

## Results
- WAO does not promise rankings on Google, profile exposure, calls, leads, enquiries, conversions or any performance
  metric. Results depend on factors outside WAO's control (algorithm changes, platform policies, competition, market).

## Reviews
- WAO never contacts the owner's customers. The owner forwards the ready review-request message with his own review
  link to his customers himself.

## Data and access
- Connections used: Cloudflare (hosting, DNS), Google Business Profile (manager access, the owner stays the owner),
  Google Gemini and Alibaba Cloud Qwen (language processing), DataForSEO, NeuronWriter, Google Places API, payment
  providers, Resend (email). No connection to Google Ads, Search Console, GitHub or any ad account.
- Enquiries left by the owner's customers through the site's contact form are kept in his account and forwarded to
  him, including by email. He owns that data.

## Support
- Support is written only: the message box on the account page, or email to eitan@wao.co.il.
- There is no phone support and no promised response time.
`.trim();
