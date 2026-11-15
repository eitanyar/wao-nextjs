# Site Bot terms: interim legal pass (2026-11-15)

The clients are businesses (§1), so the Consumer Protection Law's cancellation rules apply only because the terms adopt them voluntarily. The binding tests are the Standard Contracts Law (unclear terms are read against WAO) and the Privacy Protection Law.

## 1. Changes needed

**A. §8: copy price**
> לאחר 12 חודשים שבהם היית לקוח בשירות, תוכל לקבל עותק סטטי של האתר שלך ללא תשלום; לפני כן — בתשלום חד-פעמי.

- **Must say:** after 12 paid months (cumulative), one static copy is free. Before that, it costs a one-time 900 ILS plus VAT, paid in advance, with a tax invoice.
- **Request window:** in writing, while a client or until the site goes offline.
- **Why:** an unpriced fee is unenforceable and misleading, and the site already states the price.

**B. §8: the 30 days**
> לאחר כניסת הביטול לתוקף, האתר נשאר זמין 30 ימים נוספים, ולאחר מכן מפסיק להיot זמין.

- **Must say:** the site stays online 30 days from the end of the last paid month, then goes offline.
- **Exception:** on a 14-day cancellation with a pro-rata refund (§7), the 30 days run from the cancellation date.
- **Why:** the line is already consistent with the one above it; this states it in the site's own words.

**C. §16: support**
> תמיכה: בדוא״ל, בכתובת eitan@wao.co.il. זמן מענה משוער: עד 24 שעות בימי עסקים.

- **Decision:** approve the 14.11 draft's support patch as written; its second patch (the date line, 14.11.2026) is superseded by section 3 below.
- **Must say:** support is in writing only, through the message box in the account area or by email. No response time, and no "we do not commit" sentence.
- **Check:** "האזור האישי" already appears in the account and Site Bot copy; I did not open those lines, so confirm it is the account page's exact name.
- **Why:** a stated time WAO does not meet is a misleading term.

**D. §6: the WAO address**
> הדומיין ופרופיל העסק ב-Google נשארים שלך בכל מקרה.

- **Must add, before this line:** the free address ending in wao.co.il belongs to WAO. It is the client's to use, at no charge, for as long as they are a client. It stops with the site and is not transferable.
- **Must clarify:** "the domain" here means a domain registered in the client's name.
- **Why:** "yours as long as you are a client" on the site, next to "stays yours in any case" here, invites an ownership claim on the subdomain.

**E. §5, §10, §12: processors**
> | Alibaba Cloud (מודלי Qwen, אזור סינגפור) | עיבוד שפה | כתיבה וניתוח של טקסטים לאתר ושל תגובות לביקורות |

> | Alibaba Cloud (מודלי Qwen, אזור סינגפור) | עיבוד שפה לכתיבה וניתוח | תנאי השירות של הספק |

> | ספקי סליקה ודוא״ל כלליים | חיוב ושליחת הודעות | עיבוד תשלום ושליחת הודעות שירות |

- **Add Google (Gemini API)** in both tables and the §12 list, as the main language processor for site texts, the bot's chat and review-reply suggestions. Processing is outside Israel, including the US.
- **Keep Alibaba**, narrowed to "backup language processing". The metered fallback is still open until 23.11, and over-disclosure is the safe side.
- **Name Resend** as the email-sending provider (US), including lead notifications. Visitor names and phones now pass through it. The payment provider stays generic.
- **Generalise the Cloudflare rows** to hosting, deployment, file storage and DNS. Sites now deploy through a Worker and R2, not only Pages; this also touches the §10 Cloudflare closing line.
- **§11:** no change; "including Singapore and the United States" already covers this.
- **Why:** Amendment 13 raises the cost of an inaccurate processor disclosure.

**F. §10: lead emails**
> - פניות שלקוחות שלך משאירים דרך טופס יצירת הקשר באתר; WAO מעבדת פניות אלה מטעמך, אך ורק לשם העברתן אליך.

- **Must say:** WAO stores these enquiries in the client's account and passes them on, including by email to the address given at signup.
- **Roles:** the client is the owner of this data and responsible for how they use it. WAO acts on their behalf only.
- **Why:** "only to pass them to you" does not clearly cover storage, and the roles should be explicit now that visitor data is emailed.

**G. §18: data on termination**
> ונתוניך יימחקו או יימסרו לך, לפי בחירתך, בתוך 30 ימים

- **Must add:** "your data" means the details the client supplied and their enquiries. The site copy is governed by §8.
- **Why:** otherwise this is a free route around the 900 ILS.

## 2. Interim marker

- **No public "not reviewed by a lawyer" line.** It protects nothing, invites challenge and undermines trust.
- **Add a neutral version label** next to the date: "version 1.1".
- **Record acceptance:** store the version and timestamp each pilot client accepts at signup. The "interim, pending counsel" note lives only in `docs/legal/`.

## 3. Date line

Use the actual publication date: **15.11.2026** if deployed today, otherwise the deploy date.

Any Site Bot subscriber who is already paying needs the §17 notice of 30 days, because A and C are arguably changes for the worse.

## 4. Not changing now, and the lawyer's list

**Preconditions before publishing:**
- **§12 no-training line:** it says model processing runs on paid commercial routes. That is only true once production is off the Qwen token plan (guard by 26.11) and the Gemini key is on a paid billing tier. Adam should confirm both.
- **§6 delivery times:** I did not verify that the pilot actually delivers in one business day (WAO address) and three (own domain).

**Leaving as is:**
- **§7 and §8 cancellation mechanics:** already match the live product (cancel online, monthly, upfront).
- **§13 liability cap, §14 indemnity, §19 Rishon LeZion jurisdiction:** reasonable for business clients.
- **§11 consent by joining:** adequate for the pilot.
- **§17:** already protective.

**For the real lawyer:**
1. A proper data-processing annex and Amendment 13 compliance: roles, security, breach notice, and whether a privacy officer is needed.
2. The legal basis for transfers abroad, per processor.
3. The visitor-facing privacy and consent text on client sites (decision D2's condition).
4. Whether very small businesses could be treated as consumers, and if so §13 and §19.
5. Ownership of site texts before 12 months, and whether 900 ILS is defensible as a fee.
6. The marketing-use clause in §10.
7. The Ads Bot phase 2 bidding-consent clause.