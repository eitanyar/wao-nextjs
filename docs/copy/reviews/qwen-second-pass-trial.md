# Qwen second-pass QA trial (started 2026-11-14)

Eitan's decision, 2026-11-14: after Noa's gate, Qwen4 Max Preview gives the same copy one more review.
Stop rule: if 4 of the first 5 runs add nothing worth applying, drop the step, because it lengthens development.

"Added value" = at least one Qwen note that Adam or Noa applied. Style preferences that weren't applied don't count.

| # | Date | Copy / file | Qwen notes | Applied | Added value | Extra time |
|---|---|---|---|---|---|---|
| 1 | 2026-11-14 | S1-15 video ad end screen (`docs/copy/s1-15-end-screen-2026-11-14.waocopy.json`) | 1 raised, 0 dropped by the filter: a "fact" note on voice line B29, "more jobs and reviews" (`docs/copy/reviews/s1-15-qwen-second-pass-2026-11-14.json`) | Not applied (Adam). Noa had already flagged the same point as FYI, and the line is Eitan's own benefit direction from 12 Nov (sell roadmap features). | **no** | Qwen 45s + ~3 min adjudication |
| 2 | 2026-11-14 | A2-15 video ad end screen + demo leads (`docs/copy/a2-15-end-screen-and-demo-leads-2026-11-14.waocopy.json`) | 4 raised, 0 dropped by the filter (`docs/copy/reviews/a2-15-qwen-second-pass-2026-11-14.json`) | None applied (Adam). The price note rested on stale ledger row C6: the live page does show 249, verified with curl. The no-checkout note is a known constraint. The voice claim is the same as run 1. The demo-leads gaps were already in the engineer brief. | **no** | Qwen 42s + ~5 min adjudication |
| 3 | 2026-11-14 | N1–N4 Dash ad voice lines (`docs/copy/video-n1-n4-final-voice-lines-2026-11-14.md`) | 1 raised, 0 dropped (`docs/copy/reviews/n1-n4-qwen-second-pass-2026-11-14.json`): N1 line 4 unvocalized «חסר» can read as past tense; Noa had added the niqqud to the same phrase in N2 but missed it in N1 | Applied (Adam): «חסר» → «חָסֵר», the same form Noa used in N2 | **yes** | Qwen 261s + ~2 min adjudication |
| 4 | | | | | | |
| 5 | | | | | | |

Verdict: **closed after run 3 (2026-11-14), step dropped.** Eitan's decision: the Opus 5.5 writer self-checks every draft against the QA rules, and Noa gives voiced and founder-facing copy one fresh read. One useful catch in three runs at about 4.5 min per run did not justify a third reviewer. Runs 4 and 5 were not held.
