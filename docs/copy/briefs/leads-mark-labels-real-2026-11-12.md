# Client leads screen: mark labels "real / not real" (2026-11-12)

Founder decision: the owner's mark on each enquiry must use the same word as the /google-ads page, which now says he marks an enquiry as "real" ("אמיתית"); e.g. "כל פנייה שסימנת כאמיתית חוזרת לגוגל מהיום הראשון" and "אתה מסמן כל פנייה: אמיתית או לא, נסגרה או לא".

Where it goes: the client's leads table (src/components/crm/LeadsTable.tsx), seen by the business owner (one-man trades) on his phone, often between jobs. One toggle button per row cycles through these states, plus a column header:
- column header (today: "איכות")
- button before marking (today: "סווג")
- marked real (today: "🔥 איכותי")
- marked not real (today: "🗑️ זבל")

What it does (true): marking an enquiry as real sends it back to Google as a verified lead; that is the only goal the campaign counts. "Not real" (spam, wrong trade, job seeker) is not sent. The close action ("💰 סגור עסקה") is separate and stays as it is.

Constraints: very short (header ≤ 12 characters, buttons ≤ 14 characters, emoji included if you keep one); feminine agreement with "פנייה" where the label describes the enquiry; must read instantly. "Not real" must not insult a real customer who just didn't book (it means not a real lead: spam, wrong service, job seeker). Keep an emoji only if it helps a fast scan.

Return JSON: {"header": "...", "unmarked": "...", "real": "...", "notReal": "...", "notes": "..."}.
