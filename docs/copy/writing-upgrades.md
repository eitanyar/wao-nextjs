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
- A hero or intro string that also serves as the meta description fits about 155 characters, with the hook early enough to survive truncation.
- Don't end a body text by repeating what the button directly below it says.
- When a settled fact includes its consequence, keep the consequence. A technical term with no plain-language effect next to it is jargon.
- Don't switch between first and third person for the brand inside one paragraph.
- Prefer spoken time spans to numeric ranges in prose. Never translate English sentence patterns for durations or results literally.
- At most one rhetorical question followed by its own answer per section, and never in two neighbouring elements.
- No semicolons in marketing copy. Split into two sentences or join with a conjunction.
- Use the "X, not Y" contrast at most once per page.
- FAQ questions are written in the reader's own voice, first person, the way he'd type them, consistently across the whole FAQ.
- A named person is introduced with his role the first time he appears on a page.
- Each point on a page lives in one section only. A step list and a feature grid must not cover the same items.
- Numbered steps are actions in time order, with an explicit subject and the same grammatical form. A feature isn't a step, and the first step must match what the page says comes first.
- One name per product, per channel and per offer across a page. Don't alternate synonyms or switch between forms with and without the definite article.
- Unlimited promise words (forever, always, guaranteed, never) appear only when the settled terms say exactly that.
- When a platform's official term means something else in the reader's daily life, replace it with a plain description.
- Use active voice with a person as the subject. No passive-with-agent constructions and no formal or legal negation forms.
- Tags, pills and labels use the reader's own words and name only what the text next to them actually describes.

## Log

- 2026-11-11: rules 1–10 from Noa's homepage full proofread (docs/copy/reviews/homepage-noa-full-proofread-2026-11-11.md); Eitan approved all.
- 2026-11-11: rules 11–15 from Noa's homepage-rewrite QA (docs/copy/reviews/homepage-rewrite-noa-qa-2026-11-11.md) and rules 16–27 from Noa's /google-ads + /site-bot full proofread (docs/copy/reviews/google-ads-site-bot-noa-full-proofread-2026-11-11.md); Eitan approved all 17.
