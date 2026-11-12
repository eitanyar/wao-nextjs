# Ads Bot weekly digest: WhatsApp message carries exactly the three promised numbers (2026-11-12)

Where it goes: the weekly WhatsApp message to an Ads Bot client (`src/lib/google-ads/whatsapp-digest.ts`). Staff send it by hand from an internal page through a wa.me link, so it opens pre-filled in WhatsApp. One-man trade owner, reads it on his phone between jobs. Singular male. Plain text with emoji allowed; no markdown.

The /google-ads hub promises (live, approved):
- `דוח שבועי בשקלים`: `בסוף כל שבוע אתה מקבל שלושה מספרים: פניות שנכנסו, פניות שסימנת כאמיתיות והעלות של כל אחת בשקלים.`
- FAQ: `ובדוח השבועי אתה רואה כמה פניות הגיעו ומה עלתה כל אחת בשקלים.`

Current message (its structure, for reference): greeting with his name; "the weekly summary of "{campaignName}" is ready"; leads this week; closed deals; up to 3 alert titles or an all-clear line; one next action; "want us to update something? tell us and we'll handle it".

Write the new message. It must carry exactly these numbers, labelled as the hub labels them:
1. {leadsIn}: enquiries that came in this week (form, call-button tap, WhatsApp tap from his page)
2. {markedReal}: enquiries he marked real this week
3. {costPerReal}: ad spend this week ÷ enquiries he marked real, in whole shekels

Edge cases (separate lines, one each):
- {markedReal} = 0: no cost-per number. Instead, one line nudging him to mark the week's enquiries (one tap each, in his list), with {leadsLink}.
- {unmarked} > 0: an optional one-line reminder that {unmarked} enquiries are still waiting for his mark.
- Keep the alerts block (up to 3 titles from the system, passed as {alertsBlock}; you write only its lead-in line and the all-clear line) and the single next action ({nextAction}; lead-in line only).

Facts (binding):
- Spend is Google's reported cost for the week. Don't call it "everything you paid" (WAO's fee is separate).
- Don't promise results, don't predict next week, don't say "every enquiry".
- Don't mention closed deals in the three numbers. You may keep closed deals as an optional extra line ({closedDeals}, shown only if >0).
- Support is written, AI-first; no "we'll call you" and no response-time promises.

Return JSON: {"template_lines": [{"id","text","when"}], "notes"}, with placeholders exactly as above in {curly} form. Every line ≤ 12 words.
