# Brief: Site Bot step 2b: the interview, the vague-answer follow-up and the confirm-facts screen (2026-11-25)

**Where:** /site-bot/start, the sign-up flow, right after the holding screen ("הפרטים אצלנו. המקום שלך שמור." in `docs/copy/site-bot-step2a-holding-expired-2026-11-25.waocopy.json`; its button `HOLDING_CTA` "אני מוכן לשאלות" opens this). Same persona and voice as that file. He's a one-man tradesman (plumber, electrician, AC tech, handyman, cleaner, gardener, in-home tutor, photographer…), on a phone, typing (his keyboard mic can dictate). He holds one of 10 launch spots and hasn't paid. He pays only after he sees his home page. Call the step "שאלות", not "ראיון" (your call from the holding screen).

**Why the questions exist:** the site must say things only he could say: real jobs, his rules, his area. That's what makes it his, and what keeps Google from seeing a template. The writer may use ONLY facts he gives here, plus his Google data. Every fact he gives is shown back to him to confirm before anything is written.

**Strings needed (key → string). Keep each question to 1–2 short sentences, plus an optional one-line example hint (`_HINT`) in his trade-neutral world:**
1. `Q_INTRO`: one line before the first question. There are 5 short questions, and real examples beat nice words.
2. Five questions, each with `_HINT`:
   - `Q_RECENT_JOB`: a job from the last two weeks: what was the problem, where, what he did.
   - `Q_TURNED_DOWN`: a job he turned down or sent elsewhere, and why. This shows his boundaries and honesty.
   - `Q_CALLER_QUESTION`: the question almost every caller asks him, and what he answers.
   - `Q_PRICE_STYLE`: how he handles price. This one is chips, not text, and multi-select is allowed. It needs the question plus chip labels: `PRICE_CHIP_PHONE_ESTIMATE` (gives a range on the phone), `PRICE_CHIP_AFTER_VISIT` (prices only after seeing the job), `PRICE_CHIP_FIXED_LIST` (has fixed prices for common jobs), `PRICE_CHIP_FREE_VISIT` (the visit or quote is free), `PRICE_CHIP_PAID_VISIT` (the visit has a fee that's credited if he does the job). No numbers.
   - `Q_AREA_PATTERN`: where he works most, and what keeps coming up there (e.g. old buildings, a certain kind of fault, a season).
3. `PROBE_GENERIC`: one follow-up, shown once when an answer has only general claims ("professional, reliable, fast"). It asks for one concrete example from last month. Never a second time.
4. `Q_SKIP`: a small "skip this question" link label. Skipping is allowed; the site just gets smaller there.
5. `Q_NEXT` / `Q_SUBMIT_LAST`: button labels.
6. Research questions shown inside the flow: we sometimes need 1–3 short confirmations from our research (which services are the money ones, where his area ends). Their wording already exists in code. Needed here: `GATES_INTRO`, one line: "a few short confirmations from what we found on Google".
7. Confirm-facts screen:
   - `FACTS_HEAD` + `FACTS_BODY`: here's everything we took from your answers; only what you confirm goes on the site.
   - `FACT_CONFIRM` / `FACT_FIX` / `FACT_REMOVE`: per-fact buttons.
   - `FACT_FIX_SAVE`: save the edited fact.
   - `FACTS_DONE`: button: build my home page.
   - `FACTS_EMPTY`: shown when we couldn't take any usable fact. Honest; offer to go back to the questions.
   - Fact-type labels, short: `FACT_TYPE_JOB`, `FACT_TYPE_REFUSAL`, `FACT_TYPE_PRICE_RULE`, `FACT_TYPE_LOCAL`, `FACT_TYPE_TOOL`, `FACT_TYPE_NUMBER`, `FACT_TYPE_CREDENTIAL`.
8. `SESSION_ELSEWHERE_HEAD` + `SESSION_ELSEWHERE_BODY`: he opened the sign-up in a second browser or phone after it had started elsewhere. Use the link we emailed him to continue there.
9. `START_FOOTER_NOTE`: replaces today's footer line on the start page: "בסיום השיחה תועבר לדף תשלום מאובטח." That is no longer true, because payment comes only after he sees his home page. One short line on the new order (answers → confirm → see your home page → only then pay).
10. `STEP_CONTINUE`: the generic "continue" button on the domain and location steps. It replaces `domainContinue` "המשך לתשלום", which is now wrong.

**Constraints:** singular male; no prices or numbers in chips; no dates; no promises beyond the above; "Google" by name; plain JSON, key → string.
