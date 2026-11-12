# Google Ads new-advertiser credit, Israel (Dror, web-checked 2026-11-12)

Saved by Adam from Dror's hand-back. Eitan reported the offer as "spend ₪1,500, get ₪1,500".

**Brief: Google Ads new-advertiser credit for Israel (checked 2026-11-12, Dror)**

**Bottom line:** I could not confirm "spend ₪1,500, get ₪1,500" from any public Google source. Google's pages fill in the shekel amounts live, per account, so no fixed figure is published anywhere. The structure is confirmed, and the figure is plausible: Google's partner offer menu has a 1:1 tier of "$500 spend → $500 credit, or the local-currency equivalent". I suspect that tier is what Eitan sees, but someone needs to look at WAO's own Partners Program tab to confirm it. The only public pages giving a ₪1,500 voucher are Israeli agency blog posts from 2022, which are outdated and partly contradict each other. They are not evidence.

**1. Amount and conditions**
- **Google's public Israel page** ([business.google.com/il/google-ads](https://business.google.com/il/google-ads/)): three offer tiers, each "spend X in your first 60 days". The amounts are blank placeholders on the public page, and the offer appears after you enter billing details.
- **Israel terms** ([google.com/intl/iw_il/ads/coupons/terms/cyoi](https://www.google.com/intl/iw_il/ads/coupons/terms/cyoi/)):
  - Only for new advertisers with an Israeli billing address, one coupon per advertiser.
  - Must be applied to the first account you created, within 14 days of that account's first ad impression.
  - The spend must accrue within 60 days of applying the coupon. Taxes and fees don't count, and simply paying the amount doesn't count either.
  - The credit usually lands within 35 days of hitting the spend, and expires 60 days after it lands.
  - It only covers future ad costs, and is valid while Google's supply lasts.
- **Partner route** ([support.google.com/google-ads/answer/15329625](https://support.google.com/google-ads/answer/15329625?hl=en)):
  - Tiers in USD "or local equivalent": $500→$500, $680→$630, $1,400→$980, $3,200→$1,600, $4,500→$2,250, $10,000→$5,000, $12,000→$6,000.
  - The spend window is 60 days from when the offer is redeemed.

**2. Eligibility: per business, not per account**
- Google ([answer/6388096](https://support.google.com/google-ads/answer/6388096?hl=en)): "You cannot have advertised with Google Ads before using a different account for the same business." It also says the account must be under 14 days old when the offer is redeemed.
- The general offers page ([answer/2393021](https://support.google.com/google-ads/answer/2393021?hl=en)) defines new as a business that has never advertised on Google Ads, or one expanding into a new country with a new billing address.
- Google checks this only after the spend is reached, and the check takes up to 35 days. On the partner route, if the client hits the spend but turns out not to be new, no credit is paid.
- **So we cannot say "your new account qualifies."** A business that advertised before won't get it, even in a brand-new account. And clients will only find out about a month after spending the ₪1,500.

**3. How it's applied**
- **Self-signup:** applied automatically when the account is created with billing and a valid payment method.
- **Partner route:** not automatic.
  - WAO's manager account must hold Partner or Premier Partner status.
  - Within 20 days of the client account being created, WAO picks a tier for that account in the Partners Program tab.
  - The client account must have no other promotion already applied, so if the client already redeemed the self-signup offer, WAO can't apply one.
  - **WAO's monthly credit pool is capped at 15% of WAO's own rolling 90-day client spend.** If WAO's managed spend is small, the pool may not cover every new Ads Bot client. Policy violations also freeze the remaining pool.
- **Agency limits** ([adspolicy/answer/1396257](https://support.google.com/adspolicy/answer/1396257)):
  - Selling promotional credits is prohibited.
  - More than one credit per customer is prohibited.
  - Offers can't be requested from Google and aren't applied retroactively.
  - Violations can suspend linked accounts.

**4. Mentioning it on our page**
- I found no Google rule that specifically covers a third party advertising the offer. It is neither expressly allowed nor banned.
- Implied by the "no selling" rule: it must be presented as Google's credit, never as part of what the ₪249 buys, and never as a guaranteed discount.
- Quoting a shekel figure is risky: amounts change, and they vary by account and by WAO's pool. If we quote one, add "currently" and a date, and assign someone to recheck it monthly.
- Required in substance: subject to Google's terms, for eligible new advertisers only, may change or end.

**5. Recommended claim (English, for Tamar to adapt)**
> "Businesses that are new to Google Ads may be eligible for a Google ad credit when their account is opened through a Google Partner (currently up to ₪X after ₪Y of ad spend within 60 days). The credit is issued by Google, subject to Google's eligibility checks and terms, and may change or end at any time."

- Fill in ₪X and ₪Y only after WAO's Partners Program tab confirms them. If they can't be confirmed, drop the bracket.
- Do not say:
  - "your new account qualifies"
  - "guaranteed"
  - "WAO gives you"
  - anything that bundles the credit into the subscription price

**Fit with the Ads Bot, and the internal rule it needs**
- The ≥₪1,500/month minimum ad spend lines up well with a 1:1 tier over 60 days, so most eligible clients would hit the spend naturally.
- Our signup intake must ask "Has this business ever advertised on Google Ads?" Otherwise eligibility gets misread.
- WAO must assign the tier within 20 days of creating each account.

**Next steps**
- **Eitan/Adam:** screenshot the Partners Program tab to confirm the shekel tiers and WAO's monthly pool.
- **Tamar:** Hebrew wording, then Noa's QA.
- **Eitan-Dev:** add the "advertised before?" intake question and a 20-day assign reminder.
- **Adam:** decide whether the ₪ figure goes live, given it needs monthly rechecks.

**Sources** (all checked 2026-11-12)
- https://business.google.com/il/google-ads/
- https://www.google.com/intl/iw_il/ads/coupons/terms/cyoi/
- https://support.google.com/google-ads/answer/15329625?hl=en (and ?hl=iw)
- https://support.google.com/google-ads/answer/6388096?hl=en
- https://support.google.com/google-ads/answer/2393021?hl=en
- https://support.google.com/adspolicy/answer/1396257
- Outdated, not evidence: https://www.sfb.co.il/en-us/blog-post/voucher-for-google-ads (April 2022), https://toplink.co.il/ (agency blog)

## Adam re-check + Eitan decision (2026-11-12)
- Eitan: mention the credit on /google-ads WITHOUT an amount.
- Eitan has not seen Google check prior accounts in practice. Adam re-fetched both sources: the Israel terms (cyoi) say "new advertisers", "one voucher per advertiser", "your first Google Ads account"; support answer 6388096 says verbatim "You cannot have advertised with Google Ads before using a different account for the same business" and "an eligibility check will be triggered for up to 35 days". The rule is written; how strictly it's enforced is unknown. Copy must therefore say "businesses new to Google Ads may be eligible", never "every new account gets it".
