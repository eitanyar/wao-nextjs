# /google-ads hero: secondary button label without «דמו» (2026-11-15)

**Where:** the secondary (outline) button in the /google-ads hero, next to the primary «שיחה של 30 דקות עם איתן — חינם». It opens the real Ads Bot intake chat in try-it mode (/google-ads/onboarding?demo=1): the visitor answers the bot's questions and sees the ad it would build for his business, free, before signing up.

**Current line (byte-exact):** `hero.cta_secondary :: לראות דמו חינם`

**Rule (founder, 15.11):** nothing on the page may read as a demo/example/placeholder — so no «דמו», «דוגמה», «הדגמה». Say what he actually does: tries it himself and sees his own ad. ≤ 22 characters, button label (imperative or infinitive, matching the primary's register), plain Sabra Hebrew, no exclamation mark.

**Return JSON only:** {"patches":[{"file":"docs/copy/google-ads-r2-final-candidate-2026-11-12.txt","old":"hero.cta_secondary :: לראות דמו חינם","new":"hero.cta_secondary :: <label>","why":"..."}]}
