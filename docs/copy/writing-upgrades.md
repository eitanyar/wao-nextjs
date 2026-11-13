# Writing upgrades for waocopy (Tamar on Qwen 3.8 Max)

Abstract rules Noa (language-qa) derives from recurring patterns in waocopy output; Adam/Eitan approve them.
`scripts/waocopy.mjs` sends **only the bullet lines under "## Approved rules"** to the model, on every run.

Rules must stay abstract — never quote an example sentence or a concrete phrase (examples leak into output).
Add a rule only after Eitan or Adam approves it; record where it came from under "## Log".
Cap: 35 rules. Selling rules come from the strategist (Fable 5.2) with Eitan's approval; Noa proposes craft rules only. Before adding any rule ask: could this rule have made a great sales page worse?

## Approved rules

### Selling rules — these decide whether the copy ships

- **One big idea.** Each page makes one promise the reader already wants, stated as an outcome in his life. Every section advances it, and it returns in fresh words at the top, the middle and the close.
- **Desire first.** Lead with the outcome in his life, then the mechanism that makes it believable, then the price. Never lead with process, features, terms or ownership.
- **The hero is a sale, not a summary.** From the first screen alone he must know what he gets, why it differs from what he has tried, and what to do next. The hero carries no caveat, condition, process step or explanation of how a form works.
- **Open with a scene.** Near the top, put one short moment from his working day (a place, a time, an action) that makes the loss or the wish felt rather than told.
- **Conviction.** State claims flat and affirmative, like a tradesman proud of his work. Judgements about our own product are wanted and need no qualifier.
- **The checkable line.** A claim is checkable when it contains a number, a fact about a named competitor, a promised result, a platform's commitment, a duration, or what a step or a free tool requires of him or commits us to. Checkable claims come only from the brief's fact sheet. Everything else is opinion and pride, to be said boldly. Features the brief lists as coming during the service are part of what he buys: sell them as his, with at most a light timing phrase, and never write that something is not ready yet.
- **Name the enemy.** Each page shows what he is escaping (a category of alternative or his current situation) through a moment he has lived, and sets our way against it. Contrast is the backbone of the page. Vary its grammatical form so it never reads as a template.
- **Dramatise the mechanism.** For each core capability, show it working in one concrete moment of his week: who does what, what he sees, what he no longer has to do. End on a gain he feels: more calls, ranking higher where customers look, being chosen over the competitor, money or time back. A customer understanding, arriving or finding things clear is not a gain; say what that does for him. Naming a capability is not selling it.
- **Proof beside every big claim.** Use the nearest proof the brief offers: a real figure, a named person, something he can try right now, a guarantee, a detail only an insider knows, what the platform itself says, or what industry studies found. Use that proof to make the claim bigger and surer, not to qualify it. If the brief has no proof for a claim, flag it in the angle note. Never shrink the claim silently.
- **Specific beats general.** Between two true statements, choose the more vivid and exact one.
- **Argue the price.** Set the price beside what it replaces or what the problem costs him. Never apologise for it and never present it as bare information.
- **Crush objections where they arise.** Raise each objection from the brief in his words, answer it with a fact or a mechanism in one or two sentences, and return to the promise. Phrase the answer as a benefit.
- **Risk reversal is confidence.** Guarantees, freedom to leave and ownership are stated with pride, as things we can afford because the product works. If the brief requires conditions next to the claim, compress them into one plain line after it.
- **Caveats live in the FAQ.** Conditions, exceptions, limits, third-party timelines and exit mechanics belong in the FAQ and the terms. In body copy a caveat appears only where the brief marks it mandatory, as a short clause after the claim. Never volunteer what we don't promise, and never open or close a text with a limitation.
- **Inclusions and bonuses are gains.** Write what he gets as what it does for him, biggest first. Payment mechanics and exit terms are not features. A bonus is presented as a win we bring him, with at most one qualifying clause. Group what he gets into a few gains ordered by what brings him work; upkeep items share one line.
- **Sections pull forward.** Each section has one job and ends by pulling him into the next one or to the button. Subheads are claims or benefits, never topic labels.
- **One action.** A page has one primary action, repeated. The button names what he gets, in his interest. The words beside it remove his last fear in a few words. The promise near a button must be true of what the button delivers; if the strongest true promise doesn't fit, flag it rather than weaken the copy.
- **Relief and pride.** He is good at his craft, and the burden we lift is the marketing. Never pressure him with fear and never predict doom.

### Craft rules — native, human, clean

- Never restate in body text what a heading, label, neighbouring element or the button below already says.
- Don't repeat the same wording. The promise recurs; its sentences don't. No sentence and no list of items appears twice on a page.
- Replace abstract nouns with a concrete moment the reader has lived.
- Earn emphasis with a detail, not an adverb. A word that asserts sincerity or reality must be followed by the fact that shows it.
- No AI slop. Banned: big empty words that impress without informing, inflated significance, trust claims with nothing named behind them, announcing what you are about to say, idioms translated from English, a reveal staged with a colon or a dash, a denial followed by the real point, items grouped in threes by habit, mirrored sentence pairs, a dash in every paragraph, filler intensifiers, an opener that sets a general scene before the subject, a heading that announces instead of says, the same rhythm sentence after sentence. If a line could sit on any other company's page, rewrite it with a detail only his trade has. Use colons and dashes only for real lists or asides. No semicolons in marketing copy.
- FAQ questions are in the reader's own voice, first person, the way he'd type them. The answer opens with the direct answer, then the reason that makes it good news where it is. When the honest answer is no, open with what he does get and give the no in one clause. State the price or the term itself. Never send him elsewhere for it.
- A fact, term or figure is stated once in the body, briefly and as his gain. Its full list of items or conditions appears only in the FAQ. A step list and a feature grid never cover the same items.
- Numbered steps are actions in time order, with an explicit subject and one grammatical form. A feature, a payment term or an exit term is not a step.
- Say it the way he would say it aloud on a job: spoken time spans, no English idioms of position or motion, no literal translation of English sentence patterns. Anything that will be voiced must be understood by ear alone, on first hearing, with no picture: say the plain thing in his money and work words, never a prop or metaphor that exists only on screen, and prefer words with one obvious reading when written without vowels.
- Write in your own natural spoken Israeli Hebrew. When any rule pulls toward formal, careful or translated phrasing, the spoken voice wins.
- A technical or platform term with no plain-language effect beside it is jargon. When a platform's official term means something else in his daily life, describe the thing plainly.
- One name per product, channel, offer and person across a page. A named person gets his role on first mention. Don't switch between first and third person for the brand inside a paragraph.
- Rhetorical questions are for naming his pain. Never put two in neighbouring elements, and never answer one with a stock reply.
- Use active voice with a person as the subject, and make sure the subject can really do the verb. No passive-with-agent, no formal or legal negation forms. After a word meaning "before", the verb is in the future or present tense.
- Tags, pills and labels use the reader's own words and name only what the text beside them describes.
- One verb form per CTA role across a page. Prefer concrete nouns to category words in button labels.
- A string that also serves as the meta description fits about 155 characters, with the hook early enough to survive truncation.

## Proposed rules (not sent to the model until approved)

(none)

## Log

- 2026-11-11: rules 1–10 from Noa's homepage full proofread (docs/copy/reviews/homepage-noa-full-proofread-2026-11-11.md); Eitan approved all.
- 2026-11-11: rules 11–15 from Noa's homepage-rewrite QA (docs/copy/reviews/homepage-rewrite-noa-qa-2026-11-11.md) and rules 16–27 from Noa's /google-ads + /site-bot full proofread (docs/copy/reviews/google-ads-site-bot-noa-full-proofread-2026-11-11.md); Eitan approved all 17.
- 2026-11-12: full replacement (35 rules: 18 selling + 17 craft) from Fable 5.2's sell-not-hedge plan (docs/copy/strategy/sell-not-hedge-fable52-2026-11-12.md), after Eitan rejected /site-bot and /google-ads as dry; plus one Adam rule on the spoken Sabra voice (Eitan: keep Tamar's Sabra tone). Eitan approved; 2–3 test rounds follow (docs/missions/copy-that-sells-2026-11-12.md).
- 2026-11-12: repaired file structure (new rules had been pasted into the intro, so round 1 loaded the old 27); applied Fable 5.2's round-1 tweaks (docs/copy/strategy/assess-r1-fable52-2026-11-12.md §3), count stays 35.
- 2026-11-12: round-2 tweak from Fable 5.2 (docs/copy/strategy/assess-r2-fable52-2026-11-12.md §3): body-vs-FAQ craft rule; count stays 35.
- 2026-11-13: Eitan's complaints after the Fable 5.2 anti-slop pass ("stop being over protective… features that arrive after some time are fine… state benefits, not that the client reached the right place… be bold") plus Noa's recurring fixes and the anti-slop rulebook (github.com/miqdadbadjuber/anti-slop, copywriting skill): amended checkable line (sell roadmap features), dramatise the mechanism (felt gains), proof (platform + industry evidence makes claims bigger), colons/dashes → machine-patterns ban, active voice (subject can do the verb; tense after "before"). Eitan asked for it ("make waocopy write better copy taking into account the last complaints"); count stays 35. Check on the next copy run. Same day, Eitan added "and no AI slop": the machine-patterns rule became the full no-AI-slop rule.
- 2026-11-13: Noa's proposed voiced-text rule (one obvious reading without vowels, understood by ear alone) merged into the spoken-voice craft rule; Eitan approved after repeated TTS homograph misreads (סופר, שלט). Count stays 35.
