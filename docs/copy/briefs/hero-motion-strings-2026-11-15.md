# Homepage hero motion: on-screen strings (2026-11-15)

**Where:** inside the laptop screen in the wao.co.il homepage hero, a 9.6-second animation (design: docs/missions/homepage-hero-motion-ease-fable52-2026-11-15.md — read it). A tradesman answers three questions by tapping ready-made chips; then his Google ad appears and his landing page slides in under it. The feeling to create: «three taps, and it's there». It must look like the real WAO bot, not an illustration — match the voice of the real intake chat (the Ads Bot onboarding bot: short, friendly, second person singular male).

**The result it must produce (already fixed, byte-exact):** business «יוסי אינסטלטור ברעננה»; ad headlines ["איתור נזילות ברעננה במצלמה", "יוסי מגיע אליך באותו יום", "מחיר סגור לפני שמתחילים"]; landing-page H1 «איתור נזילות ברעננה — עם מצלמה, באותו יום». So the chosen answers are: trade = plumber, area = Ra'anana, main service = leak detection.

**Strings (Hebrew, hard max lengths — count spaces):**
- `q1` (≤26): asks his trade.  `q1_chips` — exactly 3 (≤12 each): the first must be the plumber answer; the other two are other common trades.
- `q2` (≤26): asks where he works.  `q2_chips` — 3 (≤12): the first = Ra'anana; two other nearby cities in the Sharon.
- `q3` (≤26): asks which job he most wants more calls for.  `q3_chips` — 3 (≤12): the first = leak detection; two other plumbing jobs.
- `ready` (≤14): the moment both are ready (the ad + the page) — a short, satisfying "done" line; no exclamation spam, no emoji.
- `static_cue` (≤30): shown only when animation is off: «3 questions → your ad + page» idea.
- `replay_label` (≤16): accessible name of the replay button.
- `sr_description` (≤140): screen-reader description of the whole sequence (what happens, in one sentence).

**Rules:** no prices, ratings, results; never «דוגמה»/«דמו»; plain Sabra Hebrew a tradesman uses; chips are noun answers, not sentences.

**Return JSON only:** {"q1":"","q1_chips":["","",""],"q2":"","q2_chips":["","",""],"q3":"","q3_chips":["","",""],"ready":"","static_cue":"","replay_label":"","sr_description":"","why":""}
