# Writing upgrades for waocopy (Tamar on Qwen 3.8 Max)

Abstract rules Noa (language-qa) derives from recurring patterns in waocopy output; Adam/Eitan approve them.
`scripts/waocopy.mjs` sends **only the bullet lines under "## Approved rules"** to the model, on every run.

Rules must stay abstract — never quote an example sentence or a concrete phrase (examples leak into output).
Add a rule only after Eitan or Adam approves it; record where it came from under "## Log".

## Approved rules

- Never restate in body text what a heading, label or the neighbouring element already says.
- Don't reuse the same key phrase more than twice per page. Vary it or cut it.
- Replace abstract nouns (direction, presence, place online) with a concrete moment the reader has lived.
- Every promise must match what the linked button actually delivers.
- Use colons and dashes only for real lists or asides, not to set up a reveal, and at most once per section.
- An FAQ answer opens with the direct answer (yes, no, a number, a time), then one reason. No stock openers, and no "it depends on X, Y, Z" lists.
- Never answer a question about terms or price by sending the reader elsewhere. State the term, or ask for it in the brief.
- One verb form per CTA role across a page. Prefer concrete nouns over category words in button labels.
- No reassurance words like "real/genuine" unless a specific fact follows.
- Translate English idioms of position or motion into how an Israeli tradesman would say it aloud.

## Log

- 2026-11-11: rules 1–10 from Noa's homepage full proofread (docs/copy/reviews/homepage-noa-full-proofread-2026-11-11.md); Eitan approved all.
