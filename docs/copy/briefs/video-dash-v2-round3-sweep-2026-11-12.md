# Dash v2 voice, round 3: sweep the siblings (2026-11-12)

Noa's review: docs/copy/reviews/noa-google-ads-clicks-to-leads-and-dash-v2-2026-11-12.md. Lines she already fixed are DONE; don't touch them:
- A1.script_30[0]: her version
- A1.script_30[4]: her version of your round 2
- S2.script_15[2]: her version
- S3.script_15[2]: her version. You choose between her two S3 versions; tell me which.
- end cards: "[excited] WAO! Site Bot."

Rules as in rounds 1–2, plus Noa's three new ones:
- In a voiced line, name the product before telling the listener what he does in it.
- No dashes in voiced lines.
- Replace any word that can be read two ways where it sits.

Every "old" must be the byte-exact current line INCLUDING its tag.

Fix these sibling lines that carry the same defects:
1. "סייט בוט" in Hebrew letters becomes "Site Bot" in Latin.
2. "ביקורות מגוגל" becomes "ביקורות בגוגל".
3. "נוסע שנכנס אליך" becomes a passenger getting into a taxi (A1 hooks[0]).
4. **TRUTH, A3:** "בוט מודעות עונה לך על ׳ולקוחות?׳ בעבודות סגורות" implies the bot delivers closed jobs. That's a promise of results, which the terms explicitly don't make. Keep the joke's payoff ("not another pretty graph") but say what's true. For example: the bot answers "and customers?" with the real enquiries you can see and mark, not another pretty graph; or you see every enquiry and every shekel. Noa: "עבודות שנסגרו" reads more naturally than "עבודות סגורות" if closed jobs are mentioned at all.
5. S2.script_30[5]: the second sentence is a fragment ("לפני ש׳אחר כך׳ …" standing alone). Join it.

Lines (current text, with what's on screen):
- [A1.hooks[0]] voice: [deadpan] המונה בקמפיין שלך רץ כמו במונית, וכל קליק הוא נוסע שנכנס אליך.
  screen: 
  screen: Dashoni's dashboard screen is a taxi meter; the owner's thumb taps and each tap adds a fare; WAO mark in the corner from the first frame.
- [A3.script_15[2]] voice: [calm] בוט מודעות עונה לך על ׳ולקוחות?׳ בעבודות סגורות, לא בעוד גרף יפה.
  screen: Real Ads Bot screen; the owner marks a lead as a closed job; no confetti.
- [A3.script_30[5]] voice: [calm] בוט מודעות עונה לך על ׳ולקוחות?׳ בעבודות סגורות, לא בעוד גרף יפה.
  screen: Real Ads Bot screen; the owner marks a lead as a closed job; no confetti, just the updated learning line.
- [S1.script_15[2]] voice: [calm] סייט בוט מביא לך עוד עבודות ועוד ביקורות מגוגל. אתה יכול לרדת מהגג.
  screen: Real Site Bot screen: one site with all his services and a Google profile saying the same thing.
- [S1.script_30[4]] voice: [calm] סייט בוט מביא לך עוד עבודות ועוד ביקורות מגוגל. אתה יכול לרדת מהגג.
  screen: Real Site Bot screen: one site listing all his services and a Google profile saying the same thing; the owner climbs down off the roof.
  screen: Dashoni warm to camera; real Site Bot screen: a review request reaches his customer, who picks the stars and the words; no suggested text.
- [S2.script_30[5]] voice: [calm] סייט בוט מביא לך עוד עבודות ועוד ביקורות מגוגל. לפני ש׳אחר כך׳ הופך ל׳אף פעם׳.
  screen: Real Site Bot screen: a review request reaches his customer after the job; the customer picks the stars and writes the words; no suggested text anywhere.
  screen: Real Site Bot screen: one site with all his services and a Google profile saying the same thing.
- [S3.script_30[4]] voice: [calm] סייט בוט מביא לך עוד עבודות ועוד ביקורות מגוגל.
  screen: Real Site Bot screen: one site with all his services and a Google profile saying the same thing, side by side.

Also give English replacements for the `screen` notes of A1 and A3 that still show "the learning line updates" or "marks a lead as a closed job". The new screen should show the owner marking an enquiry as real, and the enquiry list. These notes are English and for the animator; not voiced.

Return JSON: {"fixes": [{"id": "...", "old": "...", "new": "...", "display": "...", "tag_why": "...", "why": "..."}], "s3_choice": "...", "screen_notes": [{"id": "...", "new": "..."}], "notes": "..."}
