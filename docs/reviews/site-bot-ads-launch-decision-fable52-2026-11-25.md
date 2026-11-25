# Site Bot: ads-first launch review (2026-11-25)

**Verdict:** your decision is sound, and Adam's plan is about 70% right. It has three real holes: nothing in code stops the wrong business from buying, dropping manager access quietly breaks the monthly report, and "review only held pages" is wrong for the first 10. Ads to the free check can start around 6.12, and paid sign-ups around 20.12 if Takbull cooperates.

One input is stale: the brief says "₪9.90 trial". The code (`src/lib/payments/plans.ts:51`), terms §7 and the page FAQ all say no trial, and you reconfirmed that on 11-11. I assumed no trial.

## 1. Is the decision sound?

Yes. Strangers from ads test the real product, and a hand-recruited pilot would only test your persuasion. It holds on one condition: "best effort" means a smaller site, never a wrong one.

| Risk | How it is contained |
|---|---|
| **Client harm:** a business with a working site buys, or wrong facts go live under his name | A code block at the free check (missing today, see section 2). The owner confirms his facts list before anything is written. You read every site for the first 10. |
| **Profile trouble:** adding a website link can sit "pending" at Google, usually about 10 minutes, up to 30 days (web-verified 2026-11-25, Google help) | The owner makes the edit himself, and only that one field. The bot first checks that the field is empty and the profile is healthy. |
| **Google risk:** a fleet of look-alike thin sites. Google's rule targets many pages made mainly to manipulate rankings, however they are produced (web-verified 2026-11-25, Google blog) | The shrink rule, plus a same-trade similarity check at publish. Researched sites get no duplicate check at deploy today (`deploy/route.ts:409-422` covers legacy sites only). |
| **Spillover onto wao.co.il** from client subdomains | How much a weak subdomain fleet hurts the main site is UNVERIFIED. At 10 sites the risk is small. Decide on a separate neutral domain before lifting the cap. |
| **Refunds and churn:** he pays, never finishes the interview, gets nothing | By hour 72 a small honest site (home + services) goes live from what he typed before paying. Nobody pays for nothing. Add a 14-day full refund. |
| **Reputation:** an angry stranger writes about WAO | Cap of 10, tell him up front what happens next, and the refund. |
| **Your time** | About 6–7 hours in total for the first 10 (section 4). |

## 2. Adam's gate, item by item

| Item | Verdict | Why |
|---|---|---|
| 1. Takbull real charge | **Keep; it sets the date** | Every Takbull call still throws (`src/lib/payments/providers/takbull.ts:61-137`). It waits on Takbull's documents, not on our code. Also prove online cancel, and a renewal charge before client 1's day 30. Refunds can be done by hand in Takbull's back office for the first 10. |
| 2. Agent interview v1 | **Simplify** | Five fixed questions, 3 photos, a confirm-facts screen and the nudges. Cut the per-service adaptive questions for now. Add a typed answer option beside voice. The voice step is off today (`voiceNote.ts:17`) and needs a private upload route and recording-consent wording. |
| 3. Fact ledger + gate | **Shrink** | The ledger is a footnote list: every sentence points to a fact the owner gave. Build it for interview facts only, with publish/shrink counts and the similarity check. Full coverage of every field is the largest item and can wait. The thresholds can't be tuned without real sites anyway. |
| 4. Exception-only review queue | **Change** | For the first 10 you read every site, start to finish. The page sells "a human eye on every site" and terms §2 promise it. Build a plain screen: queue, phone preview, flagged sentences, then approve, edit, hold or ask the owner. |
| 5. Honest landing page | **Keep; it is bigger than stated** | Lines to fix in `landingCopy.generated.ts`: the "pilot of 10" stamp, "we keep the match every month", "one message and we update site and profile", the manual month-1 alignment, "you talk with us 10 minutes", own domain in 3 business days (FAQ and meta description), and the monthly report (3 places). All via waocopy; title and H1 stay untouched. |
| 6. Conversion tracking | **Keep, add one event** | This is the counter that tells Google which ad led to a finished check. Add a second event for a paid sign-up. Whether the tag container has any tags in it is unverified. |
| 7. Lawyer | **Keep, with a deadline** | Send the change list by 27.11 and ask for it back by 10.12. Add recording consent and the refund wording. |

**Decision a (owner adds the link himself): keep, but it has consequences Adam missed.**
- It is the cleanest consent, and it removes the 503 blocker.
- Without manager access we cannot read calls and direction requests, so the monthly report as promised cannot exist.
- Reword the report to what we own: taps on the call button, form leads, site visits, and the change in review count.
- "We manage your profile" becomes "we check your profile against the site every month and tell you exactly what to fix".
- Show the link step only after the site has passed review and been live 48 hours.
- Add a staff switch to pause the step during a Google update. I could not confirm that the November core update has finished (UNVERIFIED; the newest source I found is dated 11.11).

**Decision b (WAO subdomain): keep.**
- It matches your 11-12 rule for businesses without a domain, and most no-website businesses have none.
- The conflict is only the "3 business days" line. Reword it to "bought a domain? we connect it", with no day count.
- You handle a domain connection as an exception, about 20 minutes each.
- Whether a subdomain ranks worse than an own domain is UNVERIFIED. The real cost is that he builds no asset of his own, which the exit card covers.

**Decision c (cap of 10): keep, but enforce it in code.**
- No cap exists in code today. Pausing ads by hand is too slow while you are at work.
- A counter should flip the buy button to a waiting list at 10, and limit new sign-ups to about 3 a week.

**Decision d (₪50–100/day test): change the timing, start earlier.**
- Run it to the free check before the paid flow opens, with a "tell me when it opens" capture.
- It answers the biggest unknown two weeks sooner: do ads bring no-website businesses at a sane cost. It also builds your first-10 list.
- Google's floor for this campaign type is $5 a day, and its own guidance is 10–15 times the target cost per conversion (web-verified 2026-11-25).
- So optimise on "check completed", expect slow learning, and judge after about 50 checks. Dror should confirm the setup.

**Missing from the plan**
- **Eligibility block at the free check.** This is the most important gap. The website flag is captured (`startIntake.ts:29,56`) but blocks nothing. With no human screening, code must refuse the buy button when the profile already has a website, when the trade is outside launch scope (`VISION.md:267`), or when the profile looks unhealthy.
- **What he is told after paying:** the sequence, and "live within 2 business days of confirming your facts". A held site gets the same 2-day promise.
- **One full rehearsal** on a real business with a real card before any paid sign-up.
- **Exit card:** not built. Its deadline is the first cancellation's offline date.

## 3. Smallest honest launch

**Cut for now:** adaptive questions, full ledger coverage, per-field regenerate, manager connection, the profile-based report, review-reply drafts, own-domain automation, native WhatsApp interview.

**One deliberate exception to "only promise what runs":** the reworded report. Its first delivery is 30 days after client 1, so it can be built right after launch, with a hard deadline of client 1's day 25. If you don't accept that, cut the report from the page.

**Build order**
1. Eligibility block, waiting-list capture, both conversion events and the cap counter.
2. Interview v1, with waocopy writing the questions in parallel.
3. Minimal ledger, publish/shrink gate, similarity at publish.
4. Your review screen.
5. Guided link step, with a check on Google's public data.
6. Page and terms copy patch.
7. Takbull wiring when the documents arrive, then the rehearsal, then open.
8. After launch: report, exit card.

**Dates (my estimates):** ads to the free check around Sun 6.12. Paid sign-ups around Sun 20.12 if Takbull's documents arrive by about 3.12; each day they slip moves the date by a day.

## 4. Your minutes per client

| Task | Minutes |
|---|---|
| Full read of a 4–8 page site | 20–30 |
| Fixes and re-check | 5–10 |
| Owner messages | 5–10 |
| Link-step problems | about 3 on average |
| Domain connection or refund, 1–2 clients in 10 | 20 or 5 each |

- **Clients 1–3:** about 45–60 minutes each.
- **Clients 4–10:** about 25–35 minutes each.
- **Ongoing:** about 10 minutes a month per client. Above 20, the margin at ₪199 is in question.

**Trigger to step back to held-only review.** All four must hold:
1. On 5 sites in a row you made no factual correction on a page the gate marked "publish".
2. Your median review is under 10 minutes.
3. No client has reported a wrong fact on a live site.
4. Terms §2 and the "human eye" line are reworded.

Then raise the cap to 25.

## 5. Recommendation

**Decide now**
1. **Owner adds the link; the profile promise and the report are reworded to what we can do without manager access.** My answer: yes.
2. **Non-finishers get the small site at 72 hours, and everyone gets a 14-day full refund.** My answer: yes. It sells, and the worst case is ₪199 a client.
3. **Start the ₪50–100/day test to the free check around 6.12, before the paid flow opens, with a waiting list.** My answer: yes, capped at about ₪1,400 for two weeks.

**Your two actions this week:** chase Takbull for its documents and a working test card, and send the lawyer the change list with the 10.12 deadline.

**Single next build action:** brief the engineer on step 1. Adam's order starts with the fact ledger; I would start here because it is one short run, it protects existing sites, and it unlocks the ad test.

Sources:
- [Google: what happens to your Business Profile edits](https://support.google.com/business/answer/3038311?hl=en)
- [Google: manage Business Profile owners and managers](https://support.google.com/business/answer/3403100?hl)
- [Google: March 2024 core update and spam policies](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)
- [Google: spam policies for web search](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google Ads: minimum budget for Demand Gen](https://developers.google.com/ads/blog/posts/2026/02/minimum-budget-requirement-for-demand)
- [Google Ads: Demand Gen performance guide](https://support.google.com/google-ads/answer/16797388?hl=en)
- [Keywords Everywhere: November 2026 core update](https://keywordseverywhere.com/news/google-algorithm-updates/november-2026-core-update/)
- [Search Engine Roundtable: November 2026 core update](https://www.seroundtable.com/google-november-2026-core-update-42504.html)
---

## Eitan's decisions (2026-11-25), these replace section 5

1. **REVERSED. WAO becomes the GBP manager through Google sign-in.** The API is approved. The 503 is our own paid-flow switch (`SITE_BOT_PAID_FLOW`), not Google. So the full monthly report and the profile-management promise stay. The "owner adds the link himself" design is dropped.
2. **REVERSED. Interview before payment.** The new order is: free check → eligibility block → agent interview + confirm facts + home-page preview → pay → build. There is no 72-hour fallback site and no refund offer beyond the legal minimum. Lawyer question added: what is the legal minimum cancellation/refund for a monthly digital subscription that was sold online (Consumer Protection Law, distance-sale cancellation)?
3. **Not stated. Adam assumes yes:** the ₪50–100/day ad test to the free check around 6.12, with a waiting list, before the paid flow opens. Step 1 needs the waiting list either way.

**Effect on build step 1.** The cap and weekly limit gate the **start of the interview**, not only the buy button. If they didn't, people would finish an interview and then find no free spot. Before the paid flow opens, every eligible business goes to the waiting list.
