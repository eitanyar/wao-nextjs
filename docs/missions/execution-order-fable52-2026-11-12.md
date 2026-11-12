# Execution order to the 29.11 Site Bot launch (Fable 5.2, 2026-11-12)

Read-only planning run by Fable 5.2 (claude-fable-5-2), founder-requested. Pending founder decisions in section 4.

**Founder update 2026-11-12 (after this plan):** no hand invoicing (decision 2's fallback is rejected), and there are no pilot clients lined up; 10 is only a cap. Clarified: the client self-signs-up and pays the recurring subscription himself through the Takbull checkout at sign-up; WAO never charges on a schedule. So the launch gate is "the self-serve Takbull checkout works end to end" (proven with one real test purchase, e.g. by the founder, then cancelled/refunded through the normal flow), not a charge date. Item 7 stays the critical path.

**Founder decisions 2026-11-12 (evening):**
- **Decision 1 approved, and start now:** extra engineer sessions are used immediately (tonight / Fri 13 / Sat 14), not only on Fridays. Item 1 (repo cleanup) started 2026-11-12 evening.
- **Decision 4 overruled:** do NOT delete the clicks → real-leads progression. It becomes a strong selling point on /google-ads, the chat bot and the A1 ad, worded to the true approved design (docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md §1.6–1.7): stage 1 capped clicks, and marks go back to Google from day one; stage 2 automatic switch to real-lead bidding after about 15 real leads in 60 days (usually 2–3 months at the minimum budget); automatic rollback. The false "15–30 closed jobs" and "Google moves budget" lines are replaced. Brief: docs/copy/briefs/google-ads-clicks-to-leads-strong-point-2026-11-12.md.
- **Consequence for the build order:** Ads Bot phase 2 (automatic switch) is no longer "defer indefinitely". It must be live before any client can reach the switch (G1 = 45 days after first impression, so mid-January at the earliest for a 29.11 sign-up). Slot: the first engineer days after the 29.11 launch, about 30.11–3.12.


**Bottom line:** the queue as approved is about 21 engineer-days against 15 available (10 working days, Sun 15.11 to Thu 26.11). The launch build alone uses all 15 with no slack, so the redesign fits only with extra sessions (decision 1), and Ads Bot phase 2 and the video pipeline wait until after 29.11.

## POST-LAUNCH PRIORITY QUEUE (do not lose; first work after the 29.11 launch)
Founder-ordered, 2026-11-12. In this order unless Eitan reorders:
1. **Ads Bot phase 2: automatic switch to real-lead bidding + rollback** (docs/specs/ads-bot-phase2-auto-graduation-2026-11-12.md + volume-reality §1.6). Must be live before any client can reach the switch (G1 = 45 days). Slot 30.11–3.12. It makes the "designed to" copy become "built to".
2. **WhatsApp nurture sequence, PARKED by founder until after launch; important, do not drop.** Spec: docs/copy/reviews/amit-nurture-compliance-2026-11-12.md. Build: demo mobile field + separate unticked consent checkbox + stored consent proof; inbound webhook with opt-out keywords + Meta "Stop promotions" button; opt-out list checked before every send; scheduler (days 0/4/9/15/22, quiet hours, stop/pause rules); 131049 handling; a DEDICATED marketing WhatsApp number; privacy-policy section naming Meta. Lawyer reviews the consent text (+ the direct-mail §17F point). Copy: docs/copy/ads-bot-nurture-sequence-r2-2026-11-12.waocopy.json (after Noa). About 2 engineer days.
3. **Auto-reply when the owner can't answer:** switch it on after phase 2, then make that ad (Fable decision 3).
4. **Ads Bot later items** (Dror): ad schedule + hours question; free-intent negative phrases instead of the bare "חינם"; default negative-intent dictionary; weekly clean-up in the first 30 days; budget_tune as an owner-approved proposal; sitelink Hebrew; AUTONOMY legal version in prod.

## 1. Engineer order, now to 29.11

| # | Item | Days | Earliest start | Why here |
|---|---|---|---|---|
| 1 | Tree triage: finish or park the sell-mission work, commit the video code as-is, check the `tsconfig` diffs, fix the `mail.ts` log line | 0.5 | Sun 15 AM | Every later step edits `src/lib/lp/*`; a dirty tree with unknown test status makes every later check ambiguous. Rule: if tests (incl. `src/lib/lp/sellMission.test.ts`) aren't green within the half day, park it on a side branch until after launch. |
| 2 | Hosting design note: shared Worker layout and the exact Cloudflare permission list | 0.25 | Sun 15 | You owe the Cloudflare permissions by Tue 17 and can't until the engineer names them. |
| 3 | `/google-ads` false-claims patch and the Site Bot stamp, in one deploy | 0.25 | Sun 15, once Noa passes; latest Wed 18 | The false claims are live on a product on sale now. The stamp (`src/lib/site-bot/landingCopy.generated.ts:5`) rides the same 18-minute deploy. The patch must also cover `src/lib/bot/prompts.ts:403` and `src/app/api/bot/route.ts:827`, where the bot says the same "15–30" claim. |
| 4 | Launch step 1: intake (owner contact, domain question) | 1.25 | After #1 | No outside dependency, and it captures the domain and contact details that steps 4 and 5 need. Licence confirmation stays with the human check for the pilot. |
| 5 | Launch step 2: scoped-promise fix, price-table and licence re-check, visible profile link | 2 | After #4 | Site correctness comes before looks, and it must land before the redesign rewrites the same renderer files. |
| 6 | Redesign A: items 1–5 and 8, the solid-colour hero from item 7, a thin slice of item 9, the three small defects | 2 | After #5; only if decision 1 is yes | Same files as #5, so it goes straight after. A slice of item 9 is unavoidable because hiding the bar on desktop needs CSS classes. Cut-off: verified by Tue 24 or it ships the week of 30.11 by re-rendering the pilot sites. |
| 7 | Launch step 3: Takbull wiring, real pay page, one live charge, open the flow in production | 4 | The day docs and keys arrive (planned Wed 18); it jumps the queue if they come earlier | It is the critical path and has never returned one successful response. Starting early leaves time for Takbull's support to answer. |
| 8 | Launch step 4: hosting on the shared Worker, per-client address, timed sub-domain run, paid-queue alert, hand-run own-domain attach | 3 | Cloudflare token and test domain (Tue 17); after #7, or during any wait on Takbull | New architecture, never run end to end. It needs #4's domain field. |
| 9 | Launch step 5, trimmed: one written message box for support and change requests feeding a staff queue, plus the review-request kit | 2 | After #8 | Trimmed from 4 days: for 10 clients, staff answer by hand and send cancel notices by hand; the AI draft comes later. |
| 10 | Rehearsal, fixes, launch deploy | 2 | Wed 25 – Thu 26 | Must run on the final design and the real payment path. |

Rows 1–5 and 7–10 total 15.25 days against 15. The 3 days in the hosting row is the Pages-era estimate; the shared-Worker change has not been re-estimated.

## 2. Parallel lane

| Who | What | Done by |
|---|---|---|
| Tamar → Noa | `/google-ads` claims patch (ledger A6–A8) and stamp wording | Sun 15 midday |
| Dror | Check the claims patch against `docs/specs/ads-bot-phase2-volume-reality-2026-11-12.md` and Google's misrepresentation policy | Sun 15 AM |
| Yonatan | Confirm the stamp is not a keyword anchor | Sun 15 |
| Tamar → Noa | Intake lines and the profile-link label | Mon 16 AM |
| Tamar → Noa | Redesign labels adjusted to Yonatan's conditions; only the non-review labels are needed for Redesign A | Mon 16 EOD |
| Roni | "Before" render of test-core30-verify for Yonatan's condition 11 | Before #6 starts |
| Tamar → Noa | Message-box lines, confirmation, review-request message | Sun 22 |
| Maya, Roni, Yonatan | Redesign A at 390px and desktop: focus under the bar, contrast, titles and H1s byte-identical | Day after #6 |
| Tamar → Noa → voice → you | Dash: 9 flagged lines, then your single listening pass; no engineer needed | No launch deadline |
| You | Takbull docs and test keys | Sun 15 if possible, Tue 17 latest |
| You | Google manager account, test `.co.il` domain, Cloudflare token | Tue 17 |
| You | Change-request turnaround time and the support address | Thu 19 |
| Adam | Commit the docs and config (candidate 9) in docs-only commits; leave out `qa-screenshots-*` and `handoff/usage/` | Tonight |
| Lawyer | TS 161 support wording, the stale TS 3 date, sub-processor list | Before 26.11 |

## 3. Defer or drop

- **Ads Bot phase 2:** after 29.11. The step-0 fix needs a 14-day soak, so nothing could fire before 26.11. Dror's volume doc also changes phase 2 to "no target", so building it would not make the page claim true. Fix the claim in copy.
- **Video pipeline P1–P8 and video tests in `npm run test`:** after launch. Dash v2 needs layered art from a human illustrator and nothing has been rendered (`docs/missions/video-dash-v2-design-2026-11-12.md`). The intro video's gated beats can't pass before launch.
- **Site Bot ads S1–S3:** no media spend before 29.11. Ads Bot A1–A3 go first once the art exists.
- **Redesign item 6 (Google reviews block) and the photo half of item 7:** after launch. Yonatan's condition 4 requires reviews from the owner-authorised profile connection, which is build step 6. Items 9 (full) and 10 follow as planned.
- **Sell-mission further rounds and "live proof" phase 2:** after launch.
- **Readiness steps 6–11:** unchanged, 30.11 to 20.12.

## 4. Founder decisions

1. **Two extra engineer sessions (Fri 13 and Fri 20, or equivalent evenings).** Recommend yes: they fund Redesign A and give 0.75 day of slack. If no, the redesign ships the week of 30.11. Deadline: tomorrow morning.
2. **Takbull trip-wire.** Recommend: if there is no real charge by Mon 23.11 EOD, launch on 29.11 with hand invoices for the pilot instead of slipping. Deadline: Tue 17.
3. **Stamp wording.** Recommend an undated "pilot, 10 places" stamp now, with 29.11 added after the first real charge. Deadline: Sun 15.
4. **The "target cost per enquiry after 15–30 closed jobs" claim.** Recommend deleting it and saying only what the bot does today (blocks wasteful searches, caps click price). Deadline: tonight, so Tamar can be briefed.
5. **Redesign split.** Recommend approving Redesign A before launch and items 6 and 7-photos after. Deadline: Mon 16.

## 5. Biggest risk to 29.11

Takbull: every call throws today (`src/lib/payments/providers/takbull.ts:61-137`), the old decline is unresolved, and it needs 4 days that start only when your documents arrive. The one thing I'd do is get the docs and test keys to the engineer on Sunday 15.11 instead of Tuesday. That buys two working days for Takbull's support to answer before the 23.11 trip-wire.

**Next prompt to paste after /clear:** "Adam: run item 1 from the 12.11 execution order (tree triage: sell-mission finish-or-park with a half-day timebox, commit video code as-is, tsconfig check, mail.ts log line), then item 2 (shared-Worker design note with the exact Cloudflare permission list)."