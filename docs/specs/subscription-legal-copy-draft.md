# Subscription Billing — Legal Disclosure & Cancellation Copy (Draft for Attorney Review)

**SUPERSEDED 2026-07-30 — the attorney returned final sign-off. See
`docs/specs/subscription-legal-copy-final.md` for the approved, ready-to-implement copy. This
draft is kept only for history (it shows the pre-attorney reasoning: Lior's access-policy call,
Noa's proofing pass, the open questions that were sent to counsel).**

**Status: DRAFT. Not final compliance copy. Requires attorney sign-off before go-live.**
Language-QA pass (Noa) complete — all flagged corrections applied below. Policy decision (access-until-period-end, no refund, per continuous-transaction cancellation) made by Lior, 2026-07-29.

**Still blocking before this can be sent to counsel:**
1. Legal entity details filled in below (וואו שיווק באינטרנט, ע.מ 034442921, הפרח 80 ראשל"צ) — **confirm this exact business name against the official עוסק מורשה registration**; the signature line this was matched against read "וואו שיווק באינטרנט" (no trailing ת), differing slightly from how it was first typed here.
2. The `{FOURTEEN_DAY_WITHDRAWAL_CLAUSE}` — deliberately left unwritten. This is the single highest-exposure clause in the set and must be drafted by the attorney, not by any agent.
3. Confirmation from Eitan-Dev/Maya that the built `/account/subscription` cancel flow satisfies the five anti-dark-pattern requirements below.

---

## Token legend

| Token | Meaning |
|---|---|
| `{PRODUCT_NAME}` | The subscribed product/plan name |
| `{TRIAL_AMOUNT}` | Amount actually charged for the trial |
| `{RECURRING_AMOUNT}` | Full recurring price |
| `{BILLING_CADENCE}` | Explicit cadence, e.g. "אחת לחודש" |
| `{FIRST_FULL_CHARGE_DATE}` | Date the trial ends / first full charge |
| `{NEXT_CHARGE_DATE}` | Next scheduled charge |
| `{CHARGE_DATE}` | Date a given charge was made |
| `{ACCESS_END_DATE}` | End of the already-paid period |
| `{CARD_LAST4}` | Last 4 digits of the card |
| `{CANCEL_URL}` | Deep link to the in-account cancel screen |
| `{SUPPORT_EMAIL}` | Support address |
| `{FOURTEEN_DAY_WITHDRAWAL_CLAUSE}` | Attorney-drafted only — see note above |

---

## Piece 0 — Transaction Confirmation (אישור עסקה)

*Trigger: sent immediately after the trial charge succeeds.*

```
אישור עסקה

תודה, העסקה בוצעה בהצלחה.

פרטי העוסק
שם העוסק: וואו שיווק באינטרנט
עוסק מורשה מס׳: 034442921
כתובת: הפרח 80, ראשל"צ
דוא״ל לפניות: {SUPPORT_EMAIL}

מה רכשת
מוצר: {PRODUCT_NAME}
סכום שחויב כעת (תקופת ההתנסות): {TRIAL_AMOUNT} ₪ כולל מע״מ.

מה קורה בהמשך
בתום תקופת ההתנסות, בתאריך {FIRST_FULL_CHARGE_DATE}, המחיר יעבור למחיר המלא.
מחיר מלא: {RECURRING_AMOUNT} ₪ כולל מע״מ.
תדירות החיוב: {BILLING_CADENCE}.
אין תקופת התחייבות מינימלית. אפשר לבטל בכל עת. [ASSUMPTION — attorney to confirm no minimum term.]

איך מבטלים
הביטול מתבצע לבד, באזור האישי באתר, בעמוד ״המנוי שלי״, בפעולה אחת. אין צורך בשיחת טלפון ואין צורך לפנות אלינו.
כאשר תבטל: החיוב הבא ייעצר מיד, והגישה למוצר תימשך עד תום התקופה ששולמה — ולאחריה תסתיים.

זכות ביטול לפי חוק
{FOURTEEN_DAY_WITHDRAWAL_CLAUSE — ATTORNEY TO DRAFT EXACT WORDING}
(תוכן נדרש: זכות ביטול בעסקת מכר מרחוק — חלון של 14 יום ממועד העסקה, זכאות להחזר כספי, וגובה דמי הביטול המותרים המרביים. זו זכות נפרדת ועצמאית מביטול העסקה המתמשכת, כמתואר למעלה.)
```

**Build note:** the trial amount and full recurring amount must render at equal font size/weight — no visual downplaying of the full price.

---

## Piece 1 — Pre-Purchase Disclosure

*Placement: directly above the payment-confirm button, visible without scrolling — not inside the Terms of Service.*

```
לפני שאתה מצטרף — זה מה שחשוב שתדע

המוצר: {PRODUCT_NAME}
העוסק: וואו שיווק באינטרנט, עוסק מורשה מס׳ 034442921, הפרח 80, ראשל"צ.

המחיר, בלי אותיות קטנות
תקופת התנסות: {TRIAL_AMOUNT} ₪ כולל מע״מ.
מחיר מלא לאחר מכן: {RECURRING_AMOUNT} ₪ כולל מע״מ.
[BUILD: render these two lines at equal size/weight, side by side.]

המחיר המלא ייכנס לתוקף בתאריך {FIRST_FULL_CHARGE_DATE}.
תדירות החיוב: {BILLING_CADENCE}.
אין תקופת התחייבות מינימלית — אפשר לבטל בכל עת. [ASSUMPTION — attorney to confirm.]

איך מבטלים
הביטול מתבצע לבד, באזור האישי באתר, בעמוד ״המנוי שלי״, בפעולה אחת. אין צורך להתקשר ואין צורך לפנות אלינו.
כשתבטל: החיוב הבא ייעצר מיד, והגישה למוצר תימשך עד תום התקופה ששולמה, ולאחריה תסתיים.

שתי זכויות נפרדות
1. ביטול העסקה המתמשכת — עוצר את החיובים הבאים. הגישה נמשכת עד תום התקופה ששולמה, ללא החזר על אותה תקופה.
2. זכות ביטול בעסקת מכר מרחוק:
{FOURTEEN_DAY_WITHDRAWAL_CLAUSE — ATTORNEY TO DRAFT EXACT WORDING}
(תוכן נדרש: חלון של 14 יום ממועד העסקה, זכאות להחזר כספי, וגובה דמי הביטול המותרים המרביים. זכות עצמאית ונפרדת מסעיף 1.)
```

---

## Piece 2A — Cancellation Page (`/account/subscription`)

```
ביטול המנוי

לפני שתאשר, כדאי שתדע בדיוק מה קורה:
• החיוב הבא ייעצר מיד. לא תחויב שוב.
• הגישה ל{PRODUCT_NAME} תימשך עד תום התקופה ששולמה — עד {ACCESS_END_DATE} — ולאחריה תסתיים.
• אין החזר על התקופה ששולמה, והיא נשארת פעילה עד סופה.

[ אשר ביטול ]   [ אני משאיר את המנוי ]

לגבי זכות ביטול בעסקת מכר מרחוק (חלון 14 יום והחזר כספי) — ראה תנאי השירות, סעיף הביטול.

העוסק: וואו שיווק באינטרנט, עוסק מורשה מס׳ 034442921, הפרח 80, ראשל"צ.
```

**UX note:** both buttons must be equal visual weight. "אני משאיר את המנוי" must not be a blocking retention screen — see anti-dark-pattern requirements below.

---

## Piece 2B — Cancellation Confirmation Email

```
המנוי שלך בוטל

אישרנו את ביטול המנוי ל{PRODUCT_NAME}.

מה זה אומר בפועל:
• החיוב נעצר מיד — לא תחויב שוב.
• הגישה נשארת פעילה עד תום התקופה ששולמה — עד {ACCESS_END_DATE} — ולאחריה תסתיים.
• אין החזר על התקופה ששולמה; היא ממשיכה לעבוד עד סופה.

שינית את דעתך? אפשר לחדש בכל רגע באזור האישי: {CANCEL_URL}

זכות ביטול בעסקת מכר מרחוק (חלון 14 יום, החזר כספי) — זכות נפרדת. הפרטים בתנאי השירות.

וואו שיווק באינטרנט
עוסק מורשה מס׳ 034442921
הפרח 80, ראשל"צ
{SUPPORT_EMAIL}
```

---

## Piece 3 — Pre-Renewal Reminder Email (3–5 days before full charge)

```
תזכורת: המנוי שלך עומד להתחדש

רצינו לוודא שאתה יודע מראש.

בתאריך {NEXT_CHARGE_DATE} נחייב את הכרטיס שמסתיים ב-{CARD_LAST4} בסכום {RECURRING_AMOUNT} ₪ כולל מע״מ, עבור {PRODUCT_NAME}.
תדירות החיוב: {BILLING_CADENCE}. אין תקופת התחייבות מינימלית.

לא מעוניין להמשיך? אפשר לבטל לבד, בפעולה אחת, כאן: {CANCEL_URL}
אם תבטל לפני {NEXT_CHARGE_DATE}, לא תחויב. אם כבר חויבת, החיוב הבא ייעצר מיד והגישה תימשך עד תום התקופה ששולמה.

וואו שיווק באינטרנט
עוסק מורשה מס׳ 034442921
הפרח 80, ראשל"צ
{SUPPORT_EMAIL}
```

---

## Piece 5 — Recurring-Charge Receipt

*Trigger: the existing renewal-cron success hook (`src/lib/payments/cron-charge.ts`) — replaces the current bare receipt. Cancel link included in every receipt by default, not just on request.*

```
קבלה — חיוב עבור {PRODUCT_NAME}

חייבנו בהצלחה את הכרטיס שמסתיים ב-{CARD_LAST4}.
סכום: {RECURRING_AMOUNT} ₪ כולל מע״מ.
תאריך החיוב: {CHARGE_DATE}.
מוצר: {PRODUCT_NAME}.
תדירות: {BILLING_CADENCE}. החיוב הבא: {NEXT_CHARGE_DATE}.

לביטול המנוי — לבד, בפעולה אחת, בכל עת: {CANCEL_URL}
כשתבטל, החיוב הבא ייעצר מיד, והגישה תימשך עד תום התקופה ששולמה ולאחריה תסתיים.

וואו שיווק באינטרנט
עוסק מורשה מס׳ 034442921
הפרח 80, ראשל"צ
{SUPPORT_EMAIL}
```

**Eng note:** if the invoicing layer (`src/lib/payments/invoicing.ts`) issues a separate formal tax invoice/receipt with a running document number, that document's statutory fields take precedence — confirm no conflict between the two before shipping.

---

## Anti-Dark-Pattern Cancellation Requirements (for Eitan-Dev + Maya — confirm against the built flow, don't assume)

1. **One confirmation step, maximum.** Cancel → one confirm → done.
2. **No blocking retention/upsell wall.** No forced screen the customer must click through or decline before cancellation completes.
3. **Cancelling is no harder than signing up.** Same or fewer steps, same or lower effort.
4. **Equal visual weight** between the cancel action and any "stay" action.
5. **Deep-linkable.** `{CANCEL_URL}` in every receipt/confirmation must go straight to the cancel screen, not a generic account home.

---

## Questions for the Attorney (answer by number)

1. Confirm the two-rights separation (continuous-transaction cancellation vs. 14-day distance-sale withdrawal) and provide the exact `{FOURTEEN_DAY_WITHDRAWAL_CLAUSE}` wording (14-day window, refund entitlement, permitted cancellation-fee cap).
2. Confirm "charge stops immediately, access continues to end of paid period, no refund for that period" is an acceptable base structure for the continuous-transaction cancellation itself.
3. Confirm "no minimum commitment period" is accurate and lawful to state — or supply the actual term if one exists.
4. Confirm Piece 0's contents satisfy the legal requirements for a distance-sale transaction confirmation — what's missing, if anything.
5. Confirm "כולל מע״מ" is the correct VAT presentation for both amounts.
6. Confirm the immediate-charge-stop / access-to-period-end clarification (stated together everywhere) resolves the ambiguity acceptably.
7. Confirm no legal objection to including a cancel link in every recurring receipt.
8. Accessibility (נגישות) compliance for the new pages — flagging as a separate open item; advise if it should route to a specialist instead.
9. All entity details reflect the *current* merchant of record — if it ever changes, this whole set and existing-customer agreements need a coordinated update. Please draft with that portability in mind where practical.
10. Confirm the anti-dark-pattern cancellation flow (one step, no retention wall, no harder than signup) meets Israeli consumer-protection expectations.

---

## Open items tracked separately (not blocking attorney send)

- 🟡 Piece 1 header "המחיר, בלי אותיות קטנות" reads slightly conversational for a flat legal register — Tamar to consider a neutral alternative (e.g. "פירוט המחיר").
- 🟡 "הגישה למוצר" (Piece 0) vs. "הגישה ל{PRODUCT_NAME}" (2A/2B) — pick one convention across all docs.
- 🟡 Piece 2A's two button labels mix imperative/first-person framing — style pass optional.
- 🟡 Piece 0 vs. Piece 1 — period vs. em-dash on an otherwise identical sentence — cosmetic only.
