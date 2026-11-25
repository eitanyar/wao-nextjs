# Mission: Site Bot step 2: interview, confirm facts and home-page preview, before payment (2026-11-25)

Source decisions: `docs/reviews/site-bot-ads-launch-decision-fable52-2026-11-25.md` (end section, Eitan's 2026-11-25 reversals); `docs/reviews/site-bot-agent-intake-uniqueness-lior-fable52-2026-11-25.md` §3 (interview design); Yonatan's 2026-11-25 sign-off on the trade allow-list (work-location question, photographer framing).

## Outcome
An eligible owner who holds a spot goes through these steps, with no human and no payment:
1. **Confirm card + 3 questions.** These already exist in `StartPaidFlow.tsx`.
2. **Work-location question.** This is new. For tutors, photographers and solar suppliers, it asks where the work happens: at the customer's place, at my place, online, or a mix. Studio-only or online-only answers exit to the waiting list (reason `location`), with no preview and no charge.
3. **Research starts in the background.** It already exists but runs only after payment today. It moves here, so it runs while he answers the interview.
4. **Interview v1.** This is new: five fixed questions with a typed answer, plus one vague-answer probe on each question (the probe exists today only for the differentiator, `StartPaidFlow.tsx:345`). The five questions:
   - a recent job
   - a job he turned down
   - the question every caller asks
   - how he handles prices (chips)
   - where he works most and what keeps coming up there
5. **Research questions for the owner.** These already exist (`ownerGates.ts`) but are asked on the pay page after the charge, and they move here.
6. **Confirm-facts screen.** This is new. Every fact taken from his answers is shown as a list (fact, type, service, his exact words), and he taps confirm or fix. That is his approval of the claims.
7. **Home-page preview.** This is new. Only the home page is generated, then shown in a sandboxed, noindex view that only his session can open. Nothing is deployed.
8. **Pay.** Checkout reuses the research and the confirmed facts. The callback generates the remaining pages, which then go to Eitan's review (step 4). Research never runs twice.

**Abandoned interviews.** If an interview is left unfinished, the spot is released after 3 days without payment (Eitan, 2026-11-25). One reminder email goes out at 24 hours.

## Engineer runs (one outcome each, in order)
- **2a: Pre-payment session and re-keying.**
  - An interview session is created at `interview-start`: an httpOnly cookie, bound to the placeId and the spot.
  - Research starts after the card and the 3 questions.
  - Owner gates are re-keyed from the checkout session to the interview session, keeping the server-side gate list rule (`ownerGates.ts` header).
  - `checkout/init` and the callback reuse the research; there is no second `runSiteResearch`.
  - The work-location question, with its exit to the waiting list (`offerState` gets a `location` reason).
  - Spot expiry and the 24-hour reminder.
  - Security tests: the audit-only release, cross-session access to gates and preview, and a crafted session.
- **2b: Interview v1 and facts.**
  - The five typed questions, plus the probe.
  - Fact extraction: one LLM call that turns the answers into facts `{id, type, serviceId?, quote, condition?}`. Types are job, refusal, price rule, local detail, tool or brand, number with its condition, and credential. Each quote must be a substring of his answer, or the fact is dropped.
  - The confirm-facts screen.
  - Storage in the research dossier.
  - This fact schema is what step 3 (the fact ledger) extends, so define it once, here.
- **2c: Home-page preview and the handoff to payment.**
  - Generate the home page only, from the dossier plus the confirmed facts.
  - A preview route that renders it in an iframe sandbox. It is noindex, no-store, and owner-only.
  - Generation is rate-limited to one per session, plus one regeneration after he fixes facts.
  - The callback generates the remaining pages after payment.
  - Photographers get studio vs on-location framing (VISION.md "locationType conditional"; it is missing today, so Yonatan flagged it): the work-location answer drives it.
  - The waiting screen copy while generation runs.
  - **First-screen fact** (Fable 5.2 on Koray K-01; Yonatan sign-off 2026-11-25). Home page only.
    - (a) The hero subheadline carries at least one eligible owner fact and records its fact id (`firstScreenFactId`). If no eligible fact fits, a code-built trust-bar item rendered from an interview `credential` fact (linked to its `cred-*` id) satisfies the rule. Fact words in the title or H1 never count, and this rule never changes the title formula or the H1 gate.
    - (b) Eligible facts have status `confirmed`, or `edited` (use `ownerText`). Priority:
      1. job (no serviceId, or the homepage trade / a homepage service)
      2. tool
      3. local (every place it names is in `researchedServiceAreas(home)`)
      4. non-money price_rule (no digits, no ₪)
      5. number (the owner's exact digits, not one the trust bar shows)

      A credential goes in the trust bar only. A refusal is never used. A fact with a `condition` is used only with that condition stated.
    - (c) The subheadline stays at most 90 characters, one verb sentence, with every truth gate in force. It does not repeat service and city together.
    - (d) The homepage meta description and og:description = `pageNameWithCity(trade, city) + " — " + heroSubheadline`. If the subheadline already contains both, use it alone. Hard cap `META_DESCRIPTION_MAX_CHARS` (155), target 120 or fewer. If it's over 155, use the subheadline alone and never cut mid-word. `Service.description` stays `heroSubheadline`. Other page types are unchanged.
    - (e) If no eligible fact fits, the preview still renders, and `first_screen_fact_missing` is logged for step 3's gate.

## Constraints
- All new Hebrew comes from waocopy and is applied byte-exact. One waocopy brief per run, written before the engineer starts. The briefs cover:
  - the location question and the exit line
  - the five interview questions, the probe and the facts screen
  - the preview screen, the waiting screen and the 24-hour reminder email
- The prod default stays closed (`SITE_BOT_PAID_FLOW`): every new pre-payment route sits behind the same gate as `interview-start`.
- The pre-payment cost of about $2–4 per interviewee (Lior's estimate) is bounded by the 3-a-week start cap and one spot per placeId. Record actual per-session cost in `providerUsage`.
- No demo labels or placeholders. The preview is real data, framed as "your home page, before it goes live".
- The landing page and terms copy that describe the old pay-then-interview order are changed in step 6, not here. The title and H1 are untouched.
- Never write to `data/clients/`.

## Out of scope for step 2
- GBP manager sign-in: after payment, its own step (was step 5).
- Photos: after payment, before go-live (decision 2).
- The fact ledger's sentence-to-fact links and the publish/shrink gate: step 3. Step 3 also adds a same-trade comparison of the code-built fields (FAQ questions, service items), which `reviewPreflight.ts:126-131` skips today (Koray K-01 review).
- Eitan's review screen: step 4.
- Real voice recording: after launch (decision 1).
- Adaptive per-service questions: cut for v1 (Fable 5.2).

## Acceptance
- Focused tests per run, then `npm run test`, then `npm run build -- --webpack`, serially.
- Dev run, gate open, fixture business: start → card → location → interview → gates → facts → preview → mock pay. The research runs once (check the dossier and `providerUsage`).
- The preview is refused for another session.
- In the fixture run, the homepage `firstScreenFactId` resolves to a confirmed or edited fact of an eligible type. The homepage meta description starts with the plain anchor, is 155 characters or fewer, and differs from every other page's. The title and H1 are byte-identical to a run without facts.
- An abandoned session releases its spot after the expiry (time is injected).
- Screenshots on desktop and mobile of the interview, facts and preview screens.

## Verifier
Roni runs the full start-to-preview-to-mock-pay journey after each run. Maya (ux) checks the interview and facts screens for a11y and RTL, and the preview iframe on mobile. Yonatan checks that the photographer framing and the location exit match his sign-off.

## Eitan's decisions (2026-11-25)
1. **Voice:** v1 is typed answers; the phone keyboard's microphone dictates for free. Real voice recording comes after launch.
2. **Photos:** asked after payment, before go-live. The preview uses Google profile photos and the trade image library.
3. **Spot expiry:** an unfinished, unpaid interview releases its spot after **3 days**, with one reminder at 24 hours.
