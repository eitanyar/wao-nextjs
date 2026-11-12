# Leads screens: subtitles match the new "real / not real" labels (2026-11-12)

The owner's mark labels on the leads table are now (Noa-approved, founder-confirmed feminine): header "אמיתית או לא", buttons "סמן" / "🔥 אמיתית" / "❌ לא אמיתית". The /google-ads page says "פנייה שסימנת כאמיתית חוזרת לגוגל מהיום הראשון".

Two subtitles above the table still use the old wording and one makes a false claim ("זה מאמן את גוגל לשלוח לידים טובים יותר" is not how it works today; the account counts real-marked enquiries as the only result, and an automatic switch to bidding on them is DESIGNED for later, not live). Rewrite both, short, one line each, singular male, telling him what to do: mark each enquiry real or not, and update when he closed a deal. No "every enquiry", no "trains Google", no future promise.

1. Internal/admin leads page (src/app/(app)/leads/page.tsx:30), current: "כאן נכנסים כל הלידים מדף הנחיתה — גם פניות דרך הטופס וגם לחיצות על טלפון/וואטסאפ. סמן ליד איכותי, ועדכן הכנסה כשסוגרים עסקה — זה מאמן את גוגל לשלוח לידים טובים יותר."
2. Client leads page (src/app/(product)/client/leads/page.tsx:44), current: "כל הפניות שנכנסו מהקמפיין שלך — כולל לחיצות על טלפון ווואטסאפ. סמן ליד איכותי, ועדכן כשסגרת עסקה."

Return JSON: {"admin_leads_subtitle": "...", "client_leads_subtitle": "...", "notes": "..."}
