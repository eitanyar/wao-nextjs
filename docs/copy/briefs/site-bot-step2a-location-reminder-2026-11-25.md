# Brief: Site Bot step 2a: work-location question, its exit, and the 24-hour reminder (2026-11-25)

**Where:** inside the Site Bot sign-up flow at /site-bot/start, after the owner confirms his Google details and answers 3 short questions, and before the interview. Same persona and voice as `docs/copy/site-bot-eligibility-waitlist-2026-11-25.waocopy.json`: a one-man tradesman, on a phone, from an ad. He already holds one of our 10 launch spots. He hasn't paid; he pays only after seeing his home page.

**Flow he is in:** confirm details → 3 questions → (this question, only for tutors, photographers and solar water-heater businesses) → short interview → confirm his facts → see his home page → pay ₪199/month → we build the rest and a human reads it before it goes live.

**Strings needed (key → string):**
1. `LOCATION_Q`: where does the work happen? One short question. Its framing depends on the trade, so give three variants:
   - `LOCATION_Q_TUTOR`: where do the lessons happen?
   - `LOCATION_Q_PHOTOGRAPHER`: where do the shoots happen?
   - `LOCATION_Q_SOLAR`: does he install and repair at customers' homes, or mainly sell from a shop?
2. Answer buttons, short labels (2–4 words each). The same 4 options are used for tutor and photographer; for solar only HOME / OWN_PLACE / MIX:
   - `LOCATION_OPT_HOME` (at the customer's place)
   - `LOCATION_OPT_OWN_PLACE` (at my studio / my place / my shop)
   - `LOCATION_OPT_ONLINE` (online only; tutor only)
   - `LOCATION_OPT_MIX` (both)
3. `LOCATION_EXIT_HEAD` + `LOCATION_EXIT_BODY`: shown when he answers OWN_PLACE or ONLINE only. Our sites are built for businesses that go out to customers across an area. Ones that work from a fixed place or online need a different site, which we don't build yet. Honest "not yet". He's added to the waiting list automatically with the details he already gave, so no form. No charge, nothing to do. Thank him for his time.
4. Reminder email, 24 hours after he started and didn't finish. He gave his email earlier in the flow. One short transactional email about the request he started, not marketing:
   - `REMINDER_SUBJECT`
   - `REMINDER_BODY`: his spot is held for him for 3 days in total, then it goes to the next business on the list. Link: "continue where you stopped". His answers are saved.
   - `REMINDER_CTA` (the button label)

**Constraints:** singular male; no new promises; the only price mention allowed is none (don't mention price); "Google" by name; plain JSON, key → string. The email body may use `{businessName}` and `{continueUrl}` placeholders exactly as written.
