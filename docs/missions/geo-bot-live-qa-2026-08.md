# Mission: GEO Bot — Live Real-User QA Simulation
*Owner: Eitan (Strategist) → waouxtester (Opus 4.8, computer-use) | Filed: 19.8.2026*

## Context
Nothing has yet exercised the GEO Bot signup funnel end-to-end as a real prospect
would experience it — only structural/HTTP checks. The goal here is judgment,
not correctness-checking: walk the entire flow as a real Israeli micro-business
owner would, with realistic inputs (never dummy placeholder text), and report
every point of friction, unclear copy, dead end, or missed opportunity — plus
any idea for doing it better, even if it goes beyond what's currently built.

This is a QA/observation mission. **You do not write or edit code.** You do not
run terminal commands or scripts. You observe, click, type, read, and report.
If you find a bug that's clearly a code fix, describe it precisely in your
report — it becomes a separate spec for `waoengineer`, not something you fix
yourself.

**Everything past the mock-payment screen is real, production code — including
the client data store.** Treat every write as a real write. See Guardrails.

---

## Your persona

**⚠️ Persona constraint — read before anything else:** the GEO Bot's site-scan
and fact-extraction pipeline grounds itself in the *actual* content and real
GSC search data of whatever site gets connected. Since this test connects to
**wao.co.il — a digital marketing agency, not a local-service business** — the
persona MUST be a digital marketing agency too, or the fact-extraction/
confirmation step will surface a nonsensical contradiction (self-reported
facts vs. scanned reality) that no real user would ever hit. This means **this
run cannot validate recommendation-quality for WAO's true target persona**
(a B2C local-service business, e.g. dental clinic/contractor/gym) — only the
funnel mechanics, UX, and friction. Say so plainly in your final report, and
don't let a mismatch slip through unflagged if you notice one anyway.

You are role-playing **Eitan Peretz**, owner of **"פסגה דיגיטל – שיווק ופרסום"**
(Peak Digital — Marketing & Advertising), a small-to-midsize Israeli digital
marketing agency. You are moderately marketing-literate (you run an agency,
after all) but genuinely new to *this specific tool* — approach every screen
as a real prospect would: evaluate whether it's clear, whether it's asking
for more than it should at this stage, and whether you'd actually trust it
with your agency's Search Console data.

**Business facts to use verbatim wherever the flow asks for them (type these
exactly — do not paraphrase or invent your own Hebrew phrasing for them).
These are deliberately close to wao.co.il's real, public positioning so the
scan/fact-extraction step has something coherent to confirm against — that's
intentional, not laziness:**

- שם העסק: פסגה דיגיטל – שיווק ופרסום
- תחום: סוכנות שיווק דיגיטלי
- שירות מרכזי: קידום אתרים, פרסום בגוגל, שיווק תוכן וייעוץ אסטרטגי
- אזור שירות: ישראל – כלל הארץ, אונליין
- למה לבחור בנו: ליווי עסקים קטנים ובינוניים בצמיחה דיגיטלית, גישה מבוססת
  תוצאות ונתונים
- אתר: https://www.wao.co.il/ (see GSC note below — this is intentional, not a mistake)
- טלפון ליצירת קשר (fictional, do not use a real number): 09-555-1234
- אימייל ליצירת קשר: geo-qa-test@wao.co.il (fictional test address — if the
  flow requires a deliverable inbox for verification, stop and report rather
  than substituting a real one)

**During the fact-extraction/confirmation step specifically:** if the tool
surfaces facts it scanned from the real wao.co.il content, evaluate them the
way a real agency owner would — do they look accurate, does confirming them
feel trustworthy, is it clear what happens if you correct something. Don't
force a mismatch; if the scanned facts and your self-reported facts naturally
agree (they should, by design), note that this step worked correctly.

**Do NOT use "WAO", "וואו", or any variant as the business name at any point**
— see Guardrails for why.

---

## Pre-flight (do this before touching the signup form)

1. Confirm you're starting from an already-authenticated Google session in
   Chrome (eitan@wao.co.il should already be logged into accounts.google.com).
   Do not attempt to log in yourself, do not type any Google password. If the
   session isn't authenticated, stop and report — do not proceed by entering
   credentials.
2. Note the current URL structure and take a baseline screenshot of
   `/geo/signup` before entering anything.

---

## The walk — step by step, with what to evaluate at each stage

At **every** step below, before moving to the next, capture: (a) a screenshot,
(b) the literal Hebrew copy shown (for later native-speaker review — you are
not the Hebrew-quality gate, just the evidence-collector for it), (c) your
honest reaction as the persona — confused, reassured, annoyed, impressed —
and why.

### 1. `/geo/signup`
- Is it clear, before entering anything, what this product actually does and
  what it costs?
- **Explicitly check: does anything on this page tell a new prospect they'll
  need existing Google Search Console access to their own site?** (This was
  flagged as a likely gap — confirm or refute it, and if it's missing, say
  exactly where you'd expect to see it.)
- Fill in the business facts above. Note any field that's confusing, missing,
  or asks for something a real dental-clinic owner wouldn't have on hand.

### 2. `/geo/signup/pay/[sessionId]`
- This should be a mock payment gateway (test card `4242...`). Confirm that's
  what you see — if it looks like a real charge screen with no test-mode
  indicator, stop and report immediately, do not enter any real card details.
- Evaluate the pricing/value presentation at the moment of asking for payment:
  is it clear what's being paid for? Any last-second surprise?

### 3. `/geo/signup/connect-gsc`
- This is real Google OAuth. Confirm the account connecting is
  eitan@wao.co.il (already logged in) and that wao.co.il / www.wao.co.il
  appears as an available property to select.
- Evaluate: is it obvious what "connecting Search Console" means and why it's
  needed, to someone who's never heard of GSC? Is the value proposition clear
  or does it feel like a scary permissions screen?
- If offered a choice of property, select wao.co.il / www.wao.co.il.

### 4. `/geo/scan`
- How long does the scan take, and does the UI communicate progress in a way
  that keeps a non-technical user's confidence up, or does it feel broken/stuck?

### 5. `/geo/login` (if reached)
- Evaluate the login/re-entry experience — is it clear this is the same
  account you just created, or does it feel like a new, separate step?

### 6. `/geo/dashboard`
- First-impression test: in 5 seconds, would a real small-agency owner know
  what to do next? What's the single most confusing element?
- Are the generated GEO recommendations plausible and specific to a digital
  marketing agency (i.e. do they read like they're grounded in wao.co.il's
  actual content/GSC data), or do they read as generic/templated regardless
  of what site was connected? This is a useful signal even though it can't
  tell us about local-service-persona relevance (see persona constraint above).

### 7. `/geo/action/[actionId]` (walk through at least 3 recommendations)
- For each: is the recommendation's *business rationale* explained in terms
  the persona would actually understand ("why does this help me get more
  patients"), or is it SEO jargon?
- Try approving one, editing one, and (if possible) rejecting/skipping one.
  Does each path behave as expected, with clear confirmation of what happened?

### 8. Admin review / critic / QA routes (read-only pass)
- You have wao's own site-owner context but not staff credentials — note
  what you can and can't see from the client side, and whether that boundary
  feels right (i.e. does the client ever see something that looks like an
  internal/staff-only view by mistake?).

---

## Evaluation rubric (apply throughout, not just at the end)

Rate each stage 1–5 and justify in one sentence:
- **Clarity** — would the persona understand what's happening and why?
- **Friction** — how much effort/confusion before the next step?
- **Trust** — does anything feel risky, sketchy, or like it's asking for more
  than it should at this point in the relationship?
- **Output quality** — for generated content specifically: is it something a
  real dental-clinic owner would actually want to publish, or does it need
  visible human editing before it's usable?
- **Real-world viability** — if this recommendation went live tomorrow, would
  it plausibly move the needle for a small local business, or is it
  theoretical/generic?

You are explicitly encouraged to go beyond the checklist: if you see a better
way to sequence a step, phrase a screen, or handle an edge case — say so, even
if it's a bigger change than what's currently built. That's the point of this
exercise. Don't self-censor toward "small, safe suggestions only."

---

## Guardrails (non-negotiable)

- **Never type or ask for the real Google password.** The browser session is
  already authenticated for exactly this reason.
- **Never use "WAO"/"וואו" as the business name.** `data/clients/wao/` is a
  live production client record (real approval contact, PIN, entitlements).
  `clientId` is derived from business name, not domain — using the persona
  name above guarantees a different, non-colliding clientId even though the
  site URL (wao.co.il) is shared with the real client record. Confirmed safe
  by code trace; do not deviate from the given business name.
- **Never attempt a real payment.** If the payment screen doesn't look like a
  test/mock gateway, stop and report — do not enter real financial details.
- **Don't touch anything outside this flow.** No Gmail, no other tabs, no
  unrelated site navigation, even though the browser is logged into a real
  personal account.
- **This will create a real client record** (new clientId, own GSC token
  file) under `data/clients/`. That's expected and fine — flag it in your
  report so it can be cleaned up afterward (`rm -rf data/clients/{clientId}/`).
  Do not attempt cleanup yourself (no terminal access, and it's not your job).

---

## Output report format

Structure your final report as:

1. **One-paragraph verdict** — would this funnel convert a real small-agency
   owner, honestly? Explicitly restate that this run validates funnel
   mechanics/UX/friction, NOT recommendation-relevance for WAO's true target
   persona (B2C local-service business) — that needs a separate pass against
   a real local-service site.
2. **Findings, ranked most-to-least important.** Each: what happened, why it
   matters, and (if you have one) a concrete suggestion. Tag each as
   `BLOCKER` (would stop a real signup), `FRICTION` (survivable but costs
   conversions), or `IDEA` (not broken, but could be better).
3. **The GSC-prerequisite question** — explicit answer, confirmed by what you
   actually saw on screen.
4. **The clientId created**, so it can be found and cleaned up.
5. **Anything you were blocked on or couldn't test**, and why.

Report in English (project convention — content you *quote* from the site can
and should stay in its original Hebrew).
