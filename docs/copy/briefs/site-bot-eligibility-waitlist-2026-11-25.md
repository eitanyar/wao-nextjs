# Brief: Site Bot eligibility block + waiting list strings (2026-11-25)

**Where:** the free Google check result page (/site-bot/audit), right where the "build my site" button would be. These are UI strings in a TS copy module, shown to a business owner who just ran the free check from a paid ad.

**Persona:** one-man-show tradesman (plumber, electrician, in-home tutor, photographer) with a Google Business Profile and ratings, usually NO website. Busy, suspicious of agencies, reading on a phone.

**The flow now:** free check → we check fit → short agent interview + he confirms his facts + sees his home page → he pays ₪199/month → we build. A human (us) reads every site before it goes live. We take only 10 businesses at the start, about 3 a week.

**Strings needed (one each, short; label the key):**
1. `NOT_ELIGIBLE_HAS_SITE` — his profile already has a website. Site Bot is for businesses without one. Polite, no sales pressure, keep the free check value. Optional pointer: he can still use the check results.
2. `NOT_ELIGIBLE_TRADE` — his trade is outside what we build now. Honest: "not yet", and he can leave details to hear when it opens for his trade.
3. `NOT_ELIGIBLE_PROFILE` — his profile looks unhealthy (suspended / not verified / no ratings). Tell him what to fix at Google first, in plain words, then come back.
4. `WAITLIST_FULL_HEAD` + `WAITLIST_FULL_BODY` — he fits, but this round's spots are taken (or the week's spots). Sell the dream, not the constraint: being few is why a human reads his site. Invite him to the list.
5. `WAITLIST_PREOPEN_HEAD` + `WAITLIST_PREOPEN_BODY` — he fits, but sign-ups haven't opened yet. "Leave your details and you'll be among the first."
6. Waiting-list form: `WAITLIST_NAME_LABEL`, `WAITLIST_PHONE_LABEL`, `WAITLIST_EMAIL_LABEL` (optional field), `WAITLIST_SUBMIT`, `WAITLIST_CONSENT` (one line: we use his details only to tell him when a spot opens, and he can ask to be removed; Privacy Law-safe, no marketing-consent bundling), `WAITLIST_THANKS` (after submit), `WAITLIST_ERROR` (try again).

**Constraints:** singular male; no prices or dates; no promises beyond the above; no new claims about results. Use "Google" by name. Plain JSON output, key → string.
