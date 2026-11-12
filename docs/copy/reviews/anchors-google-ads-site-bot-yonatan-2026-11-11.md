# Anchor specs: /google-ads + /site-bot (Yonatan, 2026-11-11)

Saved by Adam from Yonatan's hand-back. Eitan confirmed the fee is ALWAYS ₪1,500 flat (overrides Facts item 3 in the Noa review).

**All titles:** keep title.absolute; the string ends in a Hebrew word + RLM + " | WAO"; ≤60 chars including the suffix; the OG title is the identical string, which also fixes the missing RLM. No other page in src/app competes for either head term.

## /google-ads (commercial intent)
- **Title:** keep "פרסום בגוגל" first, then "ניהול Google Ads". Change "מ-₪1,500" to a flat "₪1,500 לחודש". Drop "בחשבון שלך" (the h1 carries it) to get ≤60 chars. End on "לחודש".
- **h1:** keep "פרסום בגוגל" as the opening words and keep "שנשאר שלך". Fix the calque "להינעל על" (direction: "כבול לסוכנות"). Approved.
- **Badge:** remove MCC. Use the commercial terms: month to month, no minimum, no notice. ≤45 chars, and don't repeat the h1's ownership line.
- **Meta description:** 140–155 chars. Open with the pain (paid for clicks, no idea what came of them). Include: the head term once, the flat ₪1,500, the ad budget paid to Google separately, and the free 30-minute call that includes a look at the account. No MCC, no semicolon.
- **OG title:** the title string.
- **INCLUDED h2:** "ניהול קמפיינים בגוגל" is a secondary anchor and must survive. "— בחשבון שלך" can go. If the section merges into Methodology, the phrase moves to the merged section's h2.
- **Also flat-fee sync:** FAQ 1 and the JSON-LD descriptions (page.tsx:33, :42, and FAQPage :57) drop "from/starting at" and MCC.

## /site-bot (commercial intent)
- **Title:** keep "בניית אתר לעסק קטן" first. Drop "עורך". The new angle is speed + updates by message. The speed claim must be true without a footnote ("from one business day" or the three-day ceiling). No price in the title.
- **h1:** keep the head term as the opening words. Remove "מתחילה בשיחה עם איתן". Replace with: the bot builds the site with him in a chat from the start; updates go by message. Eitan is introduced in the body, not the h1. ≤90 chars; verb gender agrees with "בנייה".
- **Badge:** no "עורך". Use the price, ₪199 + VAT per month, with no commitment.
- **Meta description:** 140–155 chars. Include: the head term once, the chat build, one business day on a WAO address or three with his own domain, updates by message, ₪199 + VAT. Don't name Eitan, and don't say "לעסק שלך" twice.
- **OG title:** the title string.

## Landscape (Nov 2026, medium confidence, vendor sources)
Google rewrites most title tags, long ones more often, and is testing AI headline rewrites. Consistent title/h1/OG lowers the risk. There's no keyword-volume data in the repo for either head term; the specs rest on intent.
Sources: ahrefs.com/blog/title-tags-study · blckalpaca.at title-tags-2026 · seo-kreativ.de google-ai-search-titles

## Next
Tamar writes the ten strings → Noa QA → Yonatan signs off the final strings → Maya + engineer on the OG RLM technique → engineer applies + keeps the schema in sync → Roni checks head tags after deploy.
