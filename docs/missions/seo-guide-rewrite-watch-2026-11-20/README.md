# /seo/guide rewrite: ranking watch (deployed 2026-11-20, e991acc)

Baseline (GSC, ISR, web, final data 2026-10-21 → 2026-11-17): see summary.md and baseline.json.
- "מדריך קידום אתרים": 28-day position 1.45 (desktop 1.31, mobile 1.97). This is the real #1.
- "מדריך לקידום אתרים": 28-day position 4.08 (desktop 2.11, mobile 8.28).

To re-run, copy baseline.mjs with new dates: `node --env-file=.env.local baseline.mjs`. It is read-only and writes nothing to data/clients.

Checks fall on days 7–21 (2026-11-27 → 2026-12-11). Roll back (`git revert e991acc`, then request reindexing) if either:
- the 7-day average position for the head queries is worse than 2.0 for 7 days running ("מדריך קידום אתרים" is the #1 anchor; also watch "מדריך לקידום אתרים" against its own baseline of about 4), or
- the AI Overview citation is missing on 3 live checks spread over at least 5 days.

The pre-change live HTML is in live-before.html.gz.
