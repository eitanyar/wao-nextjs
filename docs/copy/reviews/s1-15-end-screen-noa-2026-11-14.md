# Review: S1-15 end screen (Noa, 2026-11-14)

Source: `docs/copy/s1-15-end-screen-2026-11-14.waocopy.json`. Brief: `docs/copy/briefs/s1-15-end-screen-2026-11-14.md`.

**Hero test (adapted for an end screen):** he gets a free check of his own business. The reason to act now is the 10-business pilot cap. This is urgency, not proof, and that is acceptable on a 2-second end card. PASS.

**Mechanical sweep of all four strings:** no double spaces, no NBSP, no hidden direction marks (LRM/RLM/embeds/isolates), no BOM, no stray niqqud. There is no quotation inside any field, so gershayim are not needed.

## Per field

**stamp: PASS.** `פיילוט ראשון: 10 עסקים בלבד.`
- **Bytes:** identical to `launch_stamp` at `src/lib/site-bot/landingCopy.generated.ts:5`. I matched the exact string in both files, quotes included.
- **Bidi:** the "10" sits between Hebrew words and renders correctly in RTL.
- **Grammar:** correct. Keep the final period for message match.

**cta: PASS.** `בדוק את העסק שלי בחינם`
- **Bytes:** identical to `hero.cta_primary` (`landingCopy.generated.ts:11`, and again at :130).
- **Language:** singular male imperative. The TTS homograph rule does not apply because this text is read on screen, not spoken. Five words, but the read is under a second. I agree with keeping "בחינם".

**url_line: PASS.** `wao.co.il/site-bot`
- **Bidi:** the string is all Latin. The dots and slash sit between Latin letters, so even in an RTL container the order cannot flip. No trailing punctuation.
- **Layout (for Maya):** render it as its own line with `dir="ltr"` as a guard. Do not put it on the same line as Hebrew.
- **Verifier:** confirm that bare `wao.co.il/site-bot` redirects to `https://www.wao.co.il/site-bot`.
- **"Site Bot" next to Hebrew:** it stands alone on the end card, so it has no bidi exposure. If a designer ever puts it inline with Hebrew, the wrapping and isolation is Maya's job.

**banner: FIX (sync with the voice; the Hebrew itself is correct).**
- **Current text:** `היא מחפשת בגוגל, לא ברחוב.` The grammar and comma are correct.
- **The problem:** the voice says «היא לא מחפשת ברחוב, היא מחפשת בגוגל.» over the same 9–11s. A viewer with sound on hears "she is not searching on the street" while reading "she searches on Google". The first words clash, and that kills the beat for him. A muted viewer is fine.
- **The rule:** on-screen text that overlaps a voice line may be shorter than the line. It must be a strict subset of the spoken words, in the same order. It may not reorder or reword them. The voice line cannot change, so the banner must follow it.
- **Strongest version (sells):**
  `היא מחפשת בגוגל, לא ברחוב.` → `היא מחפשת בגוגל.`
  - Three words, readable in under a second.
  - Time it to appear on the spoken second clause, about 10s.
  - The roof-and-wave image already carries "not on the street", so the contrast survives visually.
  - "היא" is anchored by the woman with the phone on screen at that moment.
- **Alternative, only if the window can stretch to about 2.5s:** `היא מחפשת בגוגל, לא ברחוב.` → `היא לא מחפשת ברחוב, היא מחפשת בגוגל.` This keeps the full spoken contrast, but 7 words is tight for a single read.

## Claims (against `docs/missions/claims-ledger-2026-11-12.md`)

- **Free audit:** PROVEN. Ledger row B3 says the free check is live, needs only a business name, and returns a result in seconds. Ledger row C5 approves the "check your business free" button. OK.
- **10-business pilot cap:** true, but the ledger has no row for it. The source is `docs/missions/site-bot-launch-readiness-2026-11-12.md:9` ("pilot cap 10 clients", variant B2). The stamp is accurate. **Adam:** add a ledger row so future gates can cite it.
- **29.11 launch:** not on screen, which is correct for message match. But ledger row B2 is out of date: it still reads "Opens 19.11.2026, NEEDS-PROOF". The 29.11 date is confirmed in `site-bot-launch-readiness-2026-11-12.md:9` and `execution-order-fable52-2026-11-12.md`. **Adam:** update B2. If the date ever goes on screen, it must go on the page stamp too, as Tamar noted.
- **Outside the fields I gated (FYI, Adam):** the recorded voice line «Site Bot מביא לך עוד עבודות ועוד ביקורות בגוגל» is ledger row B29, still NEEDS-PROOF against terms §9 (no commitment to calls or enquiries). It is already recorded, so I am not proposing a change.

## Handoffs

- **Adam:** apply the banner FIX, or route it to whoever renders the video. Update ledger row B2 and add the cap row. Note that B29 is still open.
- **Maya (ux):** `dir="ltr"` on the URL line. Keep "Site Bot" off any Hebrew line, or isolate it.
- **Roni (verifier):** check the bare-domain redirect.

## Writing upgrades

1. **On-screen text over a voice line must be a strict, same-order subset of the spoken words.** Shorten it, never reorder or reword it.
   - *Could this have made a great sales page worse?* No. It only applies where text and audio overlap in time.
   - *Retire:* none, because this is a narrow rule for video text only.
