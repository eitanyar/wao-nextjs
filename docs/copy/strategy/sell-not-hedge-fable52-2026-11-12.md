# Making /site-bot and /google-ads sell: diagnosis, new waocopy rules, briefs

The pages are dry because of how they were produced, not because of Tamar's ability. Before the briefs can be fed to waocopy, the items marked **[CONFIRM]** need settling; the first four below are the ones that matter most.

- **/site-bot promises a chat that isn't live.** Noa's review says the paid chat flow is flag-gated off in production and every button goes to the contact form.
- **/site-bot page count conflicts.** The draft says five pages; your 2026-11-11 decision says 14–18 at launch, growing to about 30.
- **/site-bot undersells what the terms already promise.** Terms §2 include Google profile management, the reviews process and a monthly report. The draft gives them half a sentence, and its bottom link presents profile management as a different bot.
- **/google-ads draft still carries the stats block** (200–400% ROI, 60%, 8:1) that Eitan ordered removed, plus the English jargon pills.
- **/site-bot draft renders an empty section** (lines 220–241: blank h2 and paragraph).

## 1. Diagnosis: why both pages read dry

**1. The rules only prohibit.** All 27 approved rules say "never", "at most" or "only when"; none says what a page must achieve. A model given 27 ways to fail and no way to win says less. The worst offenders:

| Old rule | Effect on the copy |
|---|---|
| #28, "X, not Y" once per page | Rations contrast, the main tool for showing why we beat the alternative |
| #31, each point in one section only, and #12, key phrase at most twice | Forbid repeating the promise, which the charter demands |
| #19 and #34, reassurance and absolute words need a fact | Read by the model as "avoid strong words" |
| #17 and #23, state the term, keep the consequence | Pull contract detail into body copy |
| #14, promise must match the button | Shrinks the promise to fit a contact form |

**2. The briefs were patch jobs.** The "conviction pass" brief asked for pride, then said: replace existing strings only, don't touch h1, hero badge or meta, "invent nothing", "no superlatives without a reason", "touch only the lines that need conviction". The charter's own process (write a free sales letter, then cut it into fields) was impossible. The briefs listed facts and bans, never the desire, the enemy or the proof.

**3. QA only pulls one way.** Noa's tags cover errors and AI tells; nothing covers "this weakens the sale".
- Her fixes are locally right and consistently pick the safest true version. The title moved to the three-day ceiling because it is "true for every customer", and the FAQ answers were trimmed to bare facts.
- When the unbacked stats were cut, no proof replaced them.
- Every pattern she finds becomes a permanent rule, so the rule list only grows, and only toward caution.
- Nobody in the loop owns "does it sell".

**4. The pages are organised like the contract.**
- **/google-ads steps:** step 03 is `אתה משלם את התקציב לגוגל` (with Google's verification process) and step 05 is `אתה יכול לבטל בכל חודש`. Two of five "how it works" steps are payment and exit.
- **/google-ads "what you get" grid:** four of six cards are terms: the fee, the budget, `החזר דמי שירות` with its three conditions, and `דפי נחיתה וביטול`.
- **/google-ads FAQ:** one answer ends, unprompted, with `אף אחד לא יכול להבטיח מספר פניות מראש`.
- **/site-bot:** runs hero → three steps → price → comparison → FAQ. There is no proof section and no reason for the price. The one bold line (`הדרך הכי פשוטה לעסק של אדם אחד`) sits at the bottom of the comparison.

**5. The heroes sell the wrong thing.**
- **/site-bot h1** (`...מתחילה בצ׳אט — הבוט בונה איתך ואתה מעדכן את האתר בהודעה`) describes a process. The subhead dramatises the smallest benefit on the page, updating a price. A plumber with no site wants the phone to ring. The line under the button explains how the form works.
- **/google-ads badge:** the first words on the page are the exit terms (`חודש בחודש. בלי התחייבות ובלי הודעה מוקדמת`).
- **/google-ads h1** leads with ownership (`בחשabון שנשאר שלך — בלי להיות כבול לסוכנות`). That is risk reversal, not a desire.
- **/google-ads subhead** opens well with the burned scene, then ends as a price tag.
- **/google-ads buttons:** three compete. The stats eyebrow apologises (`לא הבטחה לקמפיין שלך`).

**6. The only voice exemplar is a diagnostic tool.** The audit page's listed moves include "states its own limits plainly" and "doesn't promise ranking". That is right for a free checker's result screen. Loaded on every run as the sole model, it teaches a sales page to hedge, and the charter repeats it.

**7. Over-correction after the Wix error.** One false claim ("same price as Wix") became a habit of describing competitors politely: `אפשר, אבל גם ב-Wix...`.

## 2. New waocopy rules (replaces "## Approved rules")

There are 34 rules, with the selling rules first because order signals priority. All are abstract; none contains a phrase to copy. The `###` subheads are for humans only, since the loader sends bullet lines.

```markdown
## Approved rules

### Selling rules — these decide whether the copy ships

- **One big idea.** Each page makes one promise the reader already wants, stated as an outcome in his life. Every section advances it, and it returns in fresh words at the top, the middle and the close.
- **Desire first.** Lead with the outcome (work coming in, hours back, money not wasted), then the mechanism that makes it believable, then the price. Never lead with process, features, terms or ownership.
- **The hero is a sale, not a summary.** From the first screen alone he must know what he gets, why it differs from what he has tried, and what to do next. The hero carries no caveat, condition, process step or explanation of how a form works.
- **Open with a scene.** Near the top, put one short moment from his working day (a place, a time, an action) that makes the loss or the wish felt rather than told.
- **Conviction.** State claims flat and affirmative, like a tradesman proud of his work. Judgements about our own product (simplest, best fit, built for him) are wanted and need no qualifier.
- **The checkable line.** A claim is checkable when it contains a number, a fact about a named competitor, a promised result, a platform's commitment, or a duration. Checkable claims come only from the brief's fact sheet. Everything else is opinion and pride, to be said boldly.
- **Name the enemy.** Each page shows what he is escaping (a category of alternative or his current situation) through a moment he has lived, and sets our way against it. Contrast is the backbone of the page. Vary its grammatical form so it never reads as a template.
- **Dramatise the mechanism.** For each core capability, show it working in one concrete moment of his week: who does what, what he sees, what he no longer has to do. End on his gain. Naming a capability is not selling it.
- **Proof beside every big claim.** Use the nearest proof the brief offers: a real figure, a named person, something he can try right now, a guarantee, a detail only an insider knows. If the brief has no proof for a claim, flag it in the angle note. Never shrink the claim silently.
- **Specific beats general.** Between two true statements, choose the more vivid and exact one.
- **Argue the price.** Set the price beside what it replaces or what the problem costs him. Never apologise for it and never present it as bare information.
- **Crush objections where they arise.** Raise each objection from the brief in his words, answer it with a fact or a mechanism in one or two sentences, and return to the promise. Phrase the answer as a benefit.
- **Risk reversal is confidence.** Guarantees, freedom to leave and ownership are stated with pride, as things we can afford because the product works. If the brief requires conditions next to the claim, compress them into one plain line after it.
- **Caveats live in the FAQ.** Conditions, exceptions, limits, third-party timelines and exit mechanics belong in the FAQ and the terms. In body copy a caveat appears only where the brief marks it mandatory, as a short clause after the claim. Never volunteer what we don't promise, and never open or close a text with a limitation.
- **Inclusions and bonuses are gains.** Write what he gets as what it does for him, biggest first. Payment mechanics and exit terms are not features. A bonus is presented as a win we bring him, with at most one qualifying clause.
- **Sections pull forward.** Each section has one job and ends by pulling him into the next one or to the button. Subheads are claims or benefits, never topic labels.
- **One action.** A page has one primary action, repeated. The button names what he gets, in his interest. The words beside it remove his last fear in a few words. The promise near a button must be true of what the button delivers; if the strongest true promise doesn't fit, flag it rather than weaken the copy.
- **Relief and pride.** He is good at his craft, and the burden we lift is the marketing. Never pressure him with fear and never predict doom.

### Craft rules — native, human, clean

- Never restate in body text what a heading, label, neighbouring element or the button below already says.
- Don't repeat the same wording. The promise recurs; its sentences don't.
- Replace abstract nouns (direction, presence, place online) with a concrete moment the reader has lived.
- Earn emphasis with a detail, not an adverb. A word that asserts sincerity or reality must be followed by the fact that shows it.
- Use colons and dashes for real lists or asides, not to stage a reveal. No semicolons in marketing copy.
- FAQ questions are in the reader's own voice, first person, the way he'd type them. The answer opens with the direct answer, then the reason that makes it good news where it is. State the price or the term itself. Never send him elsewhere for it.
- A fact, term or figure is stated once in the body, and precisely in the FAQ. A step list and a feature grid never cover the same items.
- Numbered steps are actions in time order, with an explicit subject and one grammatical form. A feature, a payment term or an exit term is not a step.
- Say it the way he would say it aloud on a job: spoken time spans, no English idioms of position or motion, no literal translation of English sentence patterns.
- A technical or platform term with no plain-language effect beside it is jargon. When a platform's official term means something else in his daily life, describe the thing plainly.
- One name per product, channel, offer and person across a page. A named person gets his role on first mention. Don't switch between first and third person for the brand inside a paragraph.
- Rhetorical questions are for naming his pain. Never put two in neighbouring elements, and never answer one with a stock reply.
- Use active voice with a person as the subject. No passive-with-agent, no formal or legal negation forms.
- Tags, pills and labels use the reader's own words and name only what the text beside them describes.
- One verb form per CTA role across a page. Prefer concrete nouns to category words in button labels.
- A string that also serves as the meta description fits about 155 characters, with the hook early enough to survive truncation.
```

**What happened to each old rule**

| Old # | Fate | Why |
|---|---|---|
| 1, 12 | Kept, merged | Pure anti-redundancy |
| 2 | Rewritten | "Max twice" banned repeating the promise; now it bans repeated wording only |
| 3 | Kept | Already a persuasion rule |
| 4 (promise matches button) | Rewritten into "One action" | It was shrinking promises; now a mismatch gets flagged |
| 5, 17 | Kept, merged; "once per section" dropped | The count cap was arbitrary |
| 6, 7, 19 (FAQ) | Rewritten, merged | Direct answer stays, and the reason must now sell |
| 8 | Kept | Consistency |
| 9 (reassurance words) | Rewritten as "Earn emphasis" | The old wording read as "avoid strong words" |
| 10, 15 | Kept, merged | Native register |
| 11 | Kept | Technical |
| 13, 25 | Kept, merged; "keep the consequence" dropped | That half dragged contract detail into steps; consequences now live in the FAQ |
| 14, 20, 23 | Kept, merged | Consistency |
| 16 (one rhetorical question per section) | Rewritten | The pain question is the hero's best opener; only the stacked AI pattern is banned |
| 18 ("X, not Y" once per page) | **Dropped** | Replaced by "Name the enemy" with varied form |
| 21 (each point in one section) | Rewritten | Facts live once; the promise recurs |
| 22 | Kept, tightened | Payment and exit terms are now explicitly not steps |
| 24 (unlimited promise words) | Rewritten into "The checkable line" | Same legal protection, without discouraging bold judgements |
| 26, 27 | Kept | Anti-bureaucratic; labels |

**New rules:** all 18 selling rules, except that "One action" absorbs old #4 and "The checkable line" absorbs old #24. They exist because the old list never told Tamar what winning looks like.

## 3. Changes to the system prompt and to Noa's mandate

### `scripts/waocopy.mjs` and the charter

1. **Add a priority order to the preamble:** "Priority: (1) the hard lines in the brief, (2) the selling rules, (3) the craft rules. When a craft rule would weaken the sale and no hard line is involved, the sale wins."
2. **Send the rules as two labelled groups.** Selling rules go under "these decide whether the copy ships", craft rules under their own heading. `loadUpgrades` currently strips subheads, so keep them.
3. **Add a `--page` mode for full rewrites.** Output is JSON with: `angle` (awareness stage, sophistication stage, enemy, proof used), `bigIdea` (one English sentence), `letter` (the whole pitch as one free Hebrew sales letter), `heroes` (three hero options with different angles), `fields` (the letter cut into the section map from the brief), and `flags` (claims she wanted to make but had no fact for). The `flags` field stops missing proof from silently shrinking a claim.
4. **Tag exemplars by kind.** Add `applies: tool-ui` to the audit exemplar and a `--kind` filter. Change the header to say its "state your limits" and "honest unknown" moves apply to diagnostic screens only. There is no sales-page exemplar yet; the first approved rewrite becomes it.
5. **Charter, "Voice reference" (lines 50–57).** Remove "the tool stating its own limits" and "honest unknown" from the moves to learn. Keep the three-beat bluntness and benefit-tied praise.
6. **Charter, hard rules.** Keep "never alter an anchor", and add: "On a full rewrite, propose the h1 after the head term; Yonatan signs it."
7. **Charter, modes.** A brief headed "FULL REWRITE" is Mode A, and the "letter first, then cut" process is mandatory, not advisory.

### Noa (`.claude/agents/language-qa.md`)

1. **New first principle:** "You protect the sale. Copy leaves your desk at least as persuasive as it arrived."
2. **New tag, 💰 weakens the sale.** It covers hedges, unprompted disclaimers, a caveat in the hero, a process or a term used as a headline, label subheads and a big claim with no proof beside it. These go to Tamar like AI tells.
3. **Bold is not an error.** She may challenge a claim only if it fails the checkable test (number, named competitor fact, promised result, platform commitment, duration) and she cites the fact-sheet line it contradicts. That gets a ⚖️ tag and goes to Adam. Everything else is puffery and stays.
4. **Strongest true version.** When a fact fix is needed, she offers the strongest true wording, not the safest. If they differ, she gives both and says which sells.
5. **Deliberate repetition of the promise is not a defect.** Only repeated wording is.
6. **Hero test in every report.** After reading only the first screen, she writes one English sentence: what he gets and why he would believe it. If she can't, the verdict is FAIL whatever the grammar.
7. **Rule proposals.** She proposes craft rules only. Each must answer "could this rule have made a great sales page worse?" The list is capped at 35: to add one, retire one. Selling rules change only through Adam.

## 4. Creative briefs

Both briefs are FULL REWRITE, `--page` mode. Fill each fact sheet's [CONFIRM] items first. The English wording of each big idea is the idea, not a line to translate.

### Brief A — /site-bot

**Reader.** A one-man business: a tradesman, a craftsman or an in-person carer. He is good at the work and has good Google reviews, but no website or a dead one. He has seen Wix adverts and may have had a developer's quote in the thousands, so he has heard every "build a website" promise. He is problem-aware, at high sophistication. He does not want a website. He wants the next customer who searches to call him and not the other guy.

**Big idea.** You do the work. The bot does everything that gets you found and chosen on Google (the site, the Google profile, the reviews), and keeps doing it every month, for less than one small job. It was built for the one-man business and for nobody else.

**Hero.**
- **h1:** opens with `בניית אתר לעסק קטן`, then the outcome and the "without you doing it" twist. No process words. Yonatan signs.
- **Subhead:** one sentence of the lost-call scene, then the whole promise in one breath.
- **Badge:** keep the price (it is an anchor; Yonatan owns any change).
- **Button:** one primary action. I recommend the free check for cold visitors ("see what customers see about you, in a minute"), with the call with Eitan as the visibly secondary action. This reverses the current order and is Eitan's call.
- **Line beside the button:** removes the last fear and does not explain the form.
- **After five seconds he believes:** this is made for someone exactly like me, they do all of it, it costs less than I feared, and I can't get stuck.

**Flow, one job per section.**
1. **The lost call.** Make the cost of today felt. A customer in a hurry searches, he is the better professional, and someone else gets the call. His craft is fine; being seen is the missing part.
2. **What ₪199 does for you every month.** Each item is a capability, a moment and a gain: a site built from research into what people near him search; his real reviews and a call button on it; his Google profile kept up; happy customers asked for reviews; a draft reply to a bad review that he approves; a monthly report in calls and enquiries; hosting; changes by message.
3. **How little you do.** Three steps. He answers a few questions, a person at WAO checks the site, and it is live within one business day.
4. **Against the alternatives.** Developer or agency: thousands up front and a wait for every change. Site builder: his own evenings. Building alone with AI: every fault is his. Doing nothing: the status quo from section 1. This block carries the "best for the one-man show" claim in the biggest type on the page.
5. **The price, argued.** ₪199 + VAT set against what it replaces and against the value of one job. No commitment, and his ownership of the domain and profile, both stated as confidence.
6. **Proof.** Eitan, by name and role. The free check as a live demonstration. A real client site he can open. The human check before go-live.
7. **FAQ.**
8. **Close.** The scene resolved, the promise once more, the same two doors.

**Objections to crush in the body.** "I have no time." "I'm not technical." "A site won't bring me work." "I'll get locked in." "Why not Wix?" "My nephew will build it."

**To the FAQ.**
- Billing and cancellation mechanics.
- One day versus three days, and when the clock starts.
- The domain: he buys it in his name; month one runs on a WAO address.
- What happens after cancelling: 30 days, the buyout, free after 12 months.
- "Will I be first on Google?" Answered honestly, then with what we actually do.
- Texts written with AI and checked by a person.
- An existing site.
- The course graduate's question.

**Stays in the terms.** Liability cap, sub-processors, "as is", the statutory 14 days, failed-payment retries, data handling.

**Fact sheet.**
- ₪199 + VAT a month, no trial, no commitment, cancel online, effective at the end of the paid month.
- Live in one business day on a WAO address, three with his own domain.
- We connect his existing Google profile as a manager; he remains the owner.
- Site, hosting, profile management, reviews process and monthly report are included (terms §2).
- Eitan is one message away.
- Don't name WhatsApp. Never "forever". No competitor prices as numbers.
- **[CONFIRM]** page count at launch.
- **[CONFIRM]** whether update-by-message works today.
- **[CONFIRM]** whether the chat build is live or sign-up goes through Eitan.
- **[CONFIRM]** whether pre-fill from his Google profile and preview-before-pay can be mentioned.
- **[CONFIRM]** a client site we may link.
- **[CONFIRM]** Eitan's years in the field.

### Brief B — /google-ads

**Reader.** The same owner, in one of two states. Either he paid for clicks or an agency and saw no work from it, or he knows adverts work for competitors and fears burning money. He is solution-aware and has heard every agency promise, so the page leads with the mechanism, not a bigger promise.

**Big idea.** Google adverts that learn from the jobs you closed, not from clicks. They are run by a bot for ₪249 instead of an agency retainer, in an account that is yours, with every enquiry and what it cost in front of you each week.

**Hero.**
- **h1:** opens with `פרסום בגוגל`, then the jobs-not-clicks promise. Ownership moves down the page. Yonatan signs.
- **Subhead:** the burned moment in one sentence, the mechanism in one sentence, the price as the punchline.
- **Badge:** replace the exit terms with the price or the refund (Yonatan signs).
- **Buttons:** the free 30-minute call with Eitan is primary; the no-cost demo is secondary; the third button goes.
- **After five seconds he believes:** this is the opposite of what burned me, I will see exactly what I get for my money, and it costs a fraction of an agency.

**Flow.**
1. **The burned scene.** The money went out, the clicks came in, the phone stayed quiet, and nobody could tell him why.
2. **The mechanism.** A week in his life: an enquiry arrives, it lands in his list, he marks whether it was relevant and whether it closed, Google learns from that, and the budget moves to the searches that bring work.
3. **What the bot does for you.** Builds the account, adverts and landing pages from zero. Guards the budget (fake-click blocking, cutting searches that eat money). Sends a weekly report in enquiries and shekels. The founder is one message away.
4. **Proof.** The demo he can try without spending. Google Partner, stated plainly. Eitan, by name. Real cost-per-enquiry receipts (see the note below).
5. **The offer, argued.** ₪249 + VAT set against what management normally costs. The ₪1,500 minimum framed as his money going to adverts and not to us. The Google credit as a bonus we bring, with one qualifying clause. The refund as confidence, with its three conditions in one plain line directly under it.
6. **Yours, and free to leave.** The account, campaigns and data are his; he can leave any month. Stated as pride.
7. **How it starts.** Three steps of real actions.
8. **FAQ.**
9. **Close.**

**Objections to crush in the body.** "I already tried and it didn't work." "A bot instead of a person?" "₪1,500 is a lot." "I'll get locked in." "How do I know it's working?"

**To the FAQ.**
- Who is paid what.
- Google's payment and identity verification, and the days it takes.
- Cancellation and the landing pages: 30 days, ₪900, free after 12 paid months.
- The refund in full.
- "Do you fix my existing account?" No: a new one from scratch, and the call can look at the old one.
- "Do you promise enquiries?"
- Who qualifies for the credit.
- Adverts versus organic.

**Must appear on the page (Dror, Google policy).** These go in the offer block or the FAQ, not the hero:
- the fee is separate from the ad spend, which goes directly to Google;
- his own account, linked to WAO's manager account;
- he can see clicks and cost at any time;
- there is a written agreement.

**Hard lines.** No results guarantee. The refund is of the service fee. No credit amount, and no promise the credit is granted. Never frame the credit as a discount or as part of the fee.

**Fact sheet.**
- ₪249 + VAT a month from day one.
- Minimum ₪1,500 a month in ad spend, paid by him to Google.
- New account in his name, built from scratch, starting with his most profitable service.
- Enquiries from forms, calls and WhatsApp clicks go to his list.
- Fraud Blocker included.
- Refund of the fee within 30 days of the first live advert: adverts ran at the ₪1,500 pace, one per business, requested within 7 days; automatic if we fail to launch.
- **[CONFIRM]** weekly search-term cleanup and the cost-per-enquiry ceiling are active for Ads Bot subscribers (they exist in `src/lib/google-ads`; cleanup runs after a human approves).
- **[CONFIRM]** the weekly report's channel.
- **[CONFIRM]** whether we may state that WAO's own manual management costs more than ₪1,500 a month. It is our own fact and the strongest price anchor available.

**Are the client numbers usable as proof?** Conditionally. AAAsada at ₪69.51 and Retter at ₪29.47 per enquiry are real and computed by our own system, unlike the removed stats. Three conditions apply:
- each client's permission, or anonymising by trade and area;
- Dror restating each figure for a named period;
- one short line saying these are specific accounts.

They belong in the proof section, never the hero. Both come from accounts WAO manages, not from Ads Bot accounts built from scratch, so the caption must say "accounts we manage".

## 5. Process

1. **Fact sheet first.** Adam settles every [CONFIRM] and marks each fact "body", "FAQ" or "must be adjacent". Nothing unconfirmed goes to Tamar.
2. **Brief, then waocopy in `--page` mode.** She returns the letter, three heroes, the fields and the flags.
3. **Sell-check before any polish.** Adam scores the letter against the 18 selling rules and resolves the flags by finding the proof or dropping the claim openly.
4. **Eitan picks the hero.** He reads the three heroes and the letter, about five minutes, before QA spends effort.
5. **Noa.** Correctness plus sale protection, ending with the hero test.
6. **Checkable claims only** go to Dror and Yonatan: numbers, the credit, the refund, anchors. This is a list of perhaps ten lines, not the page.
7. **Engineer builds the new structure.** Then verifier, then Eitan's final read on the rendered page.
8. **Guard against regression.** Cap the rule list at 35, and review it against any page Eitan calls dry. Save the first approved page as the sales exemplar.