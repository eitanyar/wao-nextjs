# Brief: Site Bot step 2a: holding screen + expired-spot screen (2026-11-25)

**Where:** /site-bot/start, the sign-up flow. Same persona and voice as `docs/copy/site-bot-step2a-location-reminder-2026-11-25.waocopy.json`. He holds one of our 10 launch spots and hasn't paid; he pays only after he sees his home page.

**Strings needed (key → string):**
1. `HOLDING_HEAD` + `HOLDING_BODY`: he has finished his details. We are now researching what people in his area search for in his trade (runs in the background, a minute or two). Next comes a short interview: a few questions about real jobs, so the site sounds like him and not like every other plumber. Then he confirms the facts and sees his home page before paying anything. His spot and answers are saved; he can close and come back by the link we email him. This screen shows before the interview exists, and later as the waiting state while research runs, so it should work in both cases.
2. `HOLDING_CTA`: button to start the interview.
3. `EXPIRED_HEAD` + `EXPIRED_BODY`: he comes back after 3 days without finishing. His spot was passed to the next business, as promised in the reminder. Nothing was charged. If he still wants a site, he can run the free check again and get a new spot if one is free (or join the list). No guilt-tripping.
4. `EXPIRED_CTA`: button back to the free Google check.

**Constraints:** singular male; no price, no dates; no promises beyond the above; "Google" by name; plain JSON, key → string.
