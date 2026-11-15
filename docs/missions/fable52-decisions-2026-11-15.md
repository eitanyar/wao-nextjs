# Fable 5.2 decisions in the founder's seat (2026-11-15)

Eitan delegated these calls to Fable 5.2 on 2026-11-15 ("you take it from here with the help of Fable 5.2 on hard questions and decisions, in my spot"). Run: `claude -p --model claude-fable-5-2`, modelUsage = claude-fable-5-2. Prompt facts: D1 style sheet A/B, D2 lead notification options, D3 Qwen token-plan terms risk, D4 ads-LP hosting.

I opened the style sheet and judged both rows.

## D1. Illustration style
**DECISION:** Style B (ink on cream), with one fix. Generate the 12 now, but wire them into the site only after the D2 and D3 work is verified.

**WHY:** The site is light, so A's navy blocks would look like dark ad banners dropped into the articles. B reads as a consultant sketching on a napkin, which is the voice. B also held together better across the three samples: same line, same mint accent, and a recognisably Israeli street with solar water tanks.

**CONDITIONS:**
- Fix the faces: the two smiling tradesmen in the scales sample are too cartoonish. Use simpler, neutral faces or figures seen from behind, as in the street sample.
- Lock one prompt recipe: cream background, sepia ink, mint as the only accent, no text.
- Generating the images needs no engineer, so start now. Wiring them in must not take engineer time from D2 or D3.
- Hebrew alt text comes from waocopy. Images are compressed and lazy-loaded.

## D2. Lead notification
**DECISION:** (a) Email per lead for the pilot. WhatsApp waits for the post-launch nurture project.

**WHY:** It is half a day on a mail system that already works. A lead that sits unseen until evening is a lost job, and for a ₪199 product that is how clients churn. WhatsApp is the right channel, but Meta approval cannot be trusted before 29.11.

**CONDITIONS:**
- The email carries the visitor's name, a tap-to-call phone link and a dashboard link. A plumber must be able to call back from the email itself.
- The lead is saved first. A failed or bounced email never loses the lead and triggers a staff alert.
- It is sent from a WAO address to the intake email only. The owner's address never appears on the site or in anything the visitor receives.
- Confirm the visitor consent text covers passing details to the business owner. If not, send a one-line fix to waocopy.
- The email's Hebrew comes from waocopy, with no promise of delivery or response time.
- Roni verifies end to end with a real inbox, on mobile.

## D3. Qwen token plan
**DECISION:** Nothing in production touches the token plan from 26.11. Short-text traffic moves to Gemini now; Site Bot site copy goes to whichever provider wins a blind test by 19.11.

**WHY:** A ban would take down three products at once during a 10-client pilot, and the training-on-inputs clause is wrong for client data. Gemini is already wired and paid, so it needs nothing from Eitan. Site copy is the one place where Hebrew quality is the product, so it gets tested first.

**CONDITIONS:**
- Build one provider switch per workload (chat, panel rewriter, GBP replies, crons, site copy), each a one-line env change.
- Move the chat bot, qwen-fast, panel rewriter, GBP responder and both crons to Gemini now.
- Blind-test Gemini against Qwen on Site Bot copy for two trades by Thu 19.11, with Noa reading. If Gemini passes, site copy moves too.
- If Gemini fails, Eitan opens a metered DashScope key by Mon 23.11, the same trip-wire as Takbull. Site copy then runs on it with qwen3.8-max unless Qwen4 is confirmed available on metered.
- If neither is ready by 26.11, site copy launches on Gemini and staff read every pilot site before it goes live.
- Add a production guard that refuses to call the token-plan URL.
- The token plan stays for interactive work only (waocopy, images).
- Update the terms' processor list if Google becomes the processor. This needs the lawyer's eye.

## D4. Ads landing pages on the Worker
**DECISION:** Post-launch queue.

**WHY:** At 14 of 100 projects there is no cap pressure, and Ads Bot cannot charge until Takbull is wired. The engineer day is better spent on D2 and D3, which are launch-critical.

**CONDITIONS:**
- Trip-wire: do the move immediately if the project count reaches 60, or before any Ads Bot paid-onboarding push, whichever comes first.
- Place it right after the phase-2 auto-switch in the post-launch queue.
- No new landing-page features are built on the Pages path in the meantime.
