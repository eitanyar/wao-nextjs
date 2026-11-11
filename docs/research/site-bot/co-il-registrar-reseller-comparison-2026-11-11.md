# .co.il reseller registrar comparison — Amit, 2026-11-11

**Short answer:** Yes. LiveDNS (Israeli, ISOC-IL accredited) runs a published partner program with volume pricing, a web-service API, and account-to-account moves to the client. Several details are unverified and need a sales call before building.

## 1. How .co.il works
- **Registry/registrars:** ISOC-IL runs .co.il; only accredited registrars (companies) use the registry ([DomainTheNet](https://www.domainthenet.com/en/israel_internet_association.aspx)). ISOC-IL's own registrar-list pages returned 403 — current accredited list **unverified** (IANA points to http://en.isoc.org.il/il-cctld/accredited-registrars/domain-name-registrars).
- **Holder:** any person or legal entity, no local-presence requirement ([ISOC Rules v1.9, Feb 2022](https://www.internic.co.il/assets/pdf/ISOC-IL_Registration_Rules_v1.9_ENGLISH.pdf); [Openprovider](https://openprovider.help/books/domains/page/coil)). A sole trader can hold it in his own name.
- **On behalf of the holder:** allowed (Rules v1.9).
- **Data needed:** holder name (+ legal form), address, email, phone, company number for businesses, admin/tech contacts, working nameservers — without nameservers the application times out ([OpenSRS](https://support.opensrs.com/support/solutions/articles/201000093589--il-domain-policies), [CentralNic](https://kb.centralnicreseller.com/domains/tlds/co.il)).
- **Random identity checks (since Feb 2022):** holder must send photo ID / company certificate within 21 days or the domain is deleted, no refund.
- **Renewal:** 1–5 years ([ISOC news](https://news.internetsociety.org/new-rules-opened-2020-at-isoc-il-il-registry-supports-five-year-registration-of-domain-names/)); not automatic at the registry ([Domgate](https://portal.domgate.com/knowledgebase/18/il-rules.html)).
- **Grace after expiry:** sources disagree (45/90 vs 120 days) — **unverified**; never let a domain lapse.
- **Registrar transfer:** auth code (5 days, single use); holder email must be reachable; holder unchanged. **Holder change** needs signed documents or isn't supported — register in the client's name from day one.

## 2. Options
| | LiveDNS partner (Israeli) | Openprovider | OpenSRS | CentralNic Reseller |
|---|---|---|---|---|
| Reseller account | Yes, credit tracks ([page](https://domains.livedns.co.il/Resellers.aspx)) | Yes | Yes | Yes |
| API | "Web service, one line of code to register/renew" | REST | API | API |
| Price/yr | ₪91 (5-pack) → ₪82 (100-pack) incl. VAT, vs ₪92 list | unverified | unverified | unverified |
| Auto-renew | not stated (unverified) | yes, 15 days before | not stated | renewal-mode setting |
| Holder email click | not stated (**ask**) | yes, 24h | yes, 72h or fails | yes, 24h |
| Hebrew support | yes | no | no | no |
| Client exit | move to client's own LiveDNS account, or auth code | auth code | auth code | auth code |

Also: ResellersPanel $32/yr wholesale (undated); DomainTheNet ₪125/yr list, "Business Partners" link, no API found; Box.co.il 401 (unverified); .co.il via ResellerClub/Namecheap/Gandi API not confirmed.

## 3. Recommendation: LiveDNS partner program (Platinum/Titanium, ₪85–82/yr incl. VAT)
- **New client (after 2nd payment, by code):** API call with holder legal/business name + business number, address, email, phone, WAO nameservers → if email confirmation exists, WhatsApp/SMS nudge within the hour → log expiry, spend a credit → if picked for ISOC-IL ID check, prompt upload within 21 days, human follow-up by day 7.
- **Leaving client:** stop renewals → move to his own LiveDNS account or give auth code → prepaid year stays his (non-refundable, [LiveDNS](https://domains.livedns.co.il/Registrar.aspx)).
- **Ops:** cron renews via API ~30 days before expiry; human tops up credits, chases validations, handles exits — est. 1–2 h/month at 100 domains.
- **Sales-call questions (Eitan):** (a) API creates holder contact + registers in client's name under our partner account? (b) holder email confirmation? (c) auto-renew or API-driven? (d) move to client's account — API-triggerable? (e) API docs + rate limits.
- **Compliance (low risk):** holder details go to LiveDNS + ISOC-IL and public WHOIS → name LiveDNS and ISOC-IL in the Site-Bot terms processor list; client consents to holder registration at sign-up; we also need his business number. Goes into the pending lawyer re-approval.
