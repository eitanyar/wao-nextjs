# Client copy that sells: Site Bot and Ads Bot generators

Nothing was run or changed; this is a plan from reading the code and the saved evals. The two generators have opposite problems:

- **Site Bot** is safe on facts but writes a job description instead of a pitch. Its best selling lines are written and then thrown away.
- **Ads Bot** is under-directed on selling and has no fact gates at all. It is already inventing client facts.

Two things to know before reading on:

- **"Both Qwen" is only partly true.** RSA copy uses Qwen when configured (`src/app/api/bot/route.ts:1144`). The Ads landing page and the callouts run on Gemini (`src/app/api/lp-generate/route.ts:118`, `create-campaign/route.ts:251`).
- **The m2b1i samples look like the old v1 prompt.** Trust-bar wording varies by page, which the code-owned v2 path would not allow. Round 0 below regenerates a v2 baseline before judging anything.

## 1. Diagnosis

### Site Bot

1. **The pitch sells; the page doesn't.** The model writes a free sales letter first (`researchPageCopy.ts:823`), but it is never rendered, and the field rules cut out its agitation and contrast. In electrician-2 the pitch has the enemy scene and the turn (`אני עובד אחרת`). The rendered hero is `חשמלאי בראשון לציון — כל שורה בהצעה לפני שאני פותח את הלוח`, which is a process step.
2. **Every field's job is "describe the work".** This pushes the model to list steps, and to invent them when the owner gave none.
   - Cards must be "present-tense verbs in the order he works" and never carry the differentiator (`:2276`, data doc §22.3 B4).
   - The about headline must be "what he does with his tool or his hands" (`:2273`, C2). Result: `אני פותח לוח חשמל ובודק חיבורים`.
   - P3 says "say what the hands do" (§19.6).
3. **Pride is forbidden.**
   - The tone line says "Not salesy" (`lpCopyPrompt.ts:97`).
   - The fallback is "stay quiet" (`:120`), and the stated move is "delete the adjective, promote the fact" (`:178`).
   - The generic-adjective gate (`copyGates.ts:2082`) blocks the whole "expert" word family.
   - No rule anywhere permits an opinion about his own craft.
4. **Sections are told to end on a fact.** R2 says "end on a fact or on what the customer gets" (§20.8). Result: an about body ending `18 שנה בשטח.` and a story ending `אתה מקבל אחריות לשנה.`
5. **The promise is rationed across the site.**
   - R1 and the site-wide hero cap (`copyGates.ts:2107`) allow the differentiator in only two heroes.
   - Every service page is its own entry page from search, so the others get a feature list: `24 שעות ביממה, הצעת מחיר חינם ואין דמי הגעה`.
   - The differentiator phrase is capped at 2 per page (`DIFFERENTIATOR_CAP`).
   - The v2 budget says "each idea gets one full statement" (`:2284`), which contradicts restating the promise.
6. **"Every clause of the usp above the fold"** (`:679`) turns subheadlines into comma lists. The cut-contract rule against that (`:694`) has no gate, so the lists pass.
7. **Q&A and proof are bare facts.** Answers read `יוסי אינסטלציה בתל אביב נותן אחריות לשנה על כל עבודה.` with no reason it is good news.
8. **There is no close.** The page ends on a form heading, with no restated promise or risk reversal.
9. **A gate on an unrendered field fails whole sites.** plumber-3 failed on `gate_customer_source_claim` hits in `pitch` (`PITCH_GATE_RULES`, `copyGates.ts:2167`).

**Fact slips that passed the gates** (worth fixing while we are here):

- `gate_fear_promise` is blind when the owner's fear arrives in English (`claimScope.ts:87`). In electrician-2, `בלי הפתעות אחרי` passed in a subheadline.
- The licence term drifts across pages (`מורשה` / `עם רישיון` / `בעל רישיון`). Code-owned facts in v2 should end this.

### Ads Bot

1. **The RSA prompt has no selling direction and no fact rule** (`prompts.ts:420–447`). It says "vary the angle" from a field list. It never says to use only supplied facts.
2. **The callout prompt teaches invention** (`:449–483`). It contains Hebrew example phrases, and it maps a licence to "licensed and insured". No data field holds insurance.
3. **The Ads landing page has no fact gates.** northstar-plumbing's owner data has no guarantee, yet the page shipped:
   - a filler guarantee block (`…בלי אותיות קטנות`);
   - `אני מגיע בעצמי` (a solo claim he never made);
   - `ללא הפתעות במחיר` (a price promise he never made);
   - `מוסמך` (certified) built from "licensed".
4. **Headlines are hard-cut at 29 characters plus "…"** (`create-campaign/route.ts:133`, `:648`), so a broken headline can go live.
5. **The landing-page prompt carries Hebrew examples with invented claims** (`lpCopyPrompt.ts:162–176`: "the only one in the area", "not a subcontractor"). The research path strips two of them; the Ads path sends all four.

### Google Ads policy (checked 2026-11-12)

I read Google's pages through a summarising fetch, and they carry no revision date. Dror should confirm the exact wording before we rely on it.

- **Misrepresentation covers ads and destinations.** It bans claims that entice with "an improbable result", offering services without "the right licenses or qualifications", misleading pricing, unavailable offers, and inconsistencies between ad and landing page.
- **No superlative rule found.** I did not find an explicit "superlatives need third-party verification" rule on the current page.
- **Editorial rules for ad text:** no phone number in ad text, no repeated punctuation, no emoji or decorative symbols, no gimmicky repetition across assets, and standard spelling and grammar.

My recommendation:

- **Ads:** treat ranking words (best, only, cheapest, number one) and result guarantees as banned unless the owner's data states them. Google combines assets in any order, so each must be true alone and backed on the landing page.
- **Landing page:** pride and opinion are fine. The same checkable-claim line applies, because a false claim there is the client's false advertising.

## 2. Client selling rules (inject into both system prompts)

```text
CLIENT SELLING RULES
Priority: (1) truth rules, (2) these selling rules, (3) voice and craft rules.
When a craft rule would weaken the sale and no truth rule is involved, the sale wins.

- Voice. You are the owner, talking to one customer at his door, in your own
  natural spoken Israeli Hebrew. When a rule pulls toward formal, careful or
  translated phrasing, the spoken voice wins.
- One big promise. The page makes one promise the customer already wants, stated
  as an outcome in his home or his day, built from the owner's usp or his
  strongest fact against the customer's fear. It returns in fresh words at the
  top, the middle and the close.
- Desire first. Lead with what the customer gets, then the owner's way of working
  that makes it believable. The way he works is evidence, never the headline.
- The first screen is a sale. From it alone the customer knows what he gets, why
  this tradesman and not the last one, and what to do now. No feature list, no
  caveat, no condition.
- Open with a scene. One short moment the customer is living now makes the
  problem felt rather than told.
- Pride. The owner speaks flat and affirmative about his craft and his standards.
  His opinion of his own work needs no qualifier and no fact.
- The checkable line. A claim is checkable when it states a number, a duration, a
  price or anything free, a credential or insurance, a warranty, an arrival or
  finish time, availability, a place served, a tool, material or method, a named
  company, a past job or customer, how he behaves on the job, or a guaranteed
  result. Checkable claims come only from the owner facts, at the strength he
  stated. Everything else is his opinion and pride: say it boldly.
- Never rank him against others (best, only, cheapest, first) unless an owner
  fact says exactly that.
- Name the enemy. Show the experience the customer fears, as a moment, taken from
  the owner's fear field, and set the owner's stated way against it. Never a
  named competitor. State the result as what the customer sees, knows or holds at
  that moment, never as a guarantee about the future the owner did not give.
- Dramatise the mechanism once. Show his way of working in one moment: what he
  does, what the customer sees, what the customer no longer has to worry about.
  Other fields do not re-list the steps.
- Proof beside the promise. Put the nearest owner fact next to each big claim, or
  lean on the facts the page already shows. With no proof, make the strongest
  claim the facts carry and record the gap in "flags".
- Specific beats general. Between two true statements, choose the more vivid one.
- Price terms are gains. A stated price policy is presented as the customer's
  safe first step, never as bare information.
- Answer like a seller. Each answer opens with the direct answer, then the reason
  it is good news, from the facts.
- Risk reversal is confidence. His warranty and price terms are stated with
  pride, close to the call to action.
- Limits live in the answers. Exclusions and conditions appear only where a
  question asks for them. Never in the hero, the story or the close.
- Endings pull forward. Every section ends on the customer's gain or the next
  step, never on a tool, a bare credential or a list.
- One action. The close restates the promise in new words, removes the last
  hesitation with an owner fact, and invites the page's one action.
- Relief, not fear. Urgency comes only from the customer's real situation. Never
  an invented deadline, discount, scarcity or prediction of doom.
```

**Ads-only addendum (RSA prompt):**

```text
- Every asset stands alone and is true alone: Google combines them in any order.
- Plan the set: service-and-place assets, outcome assets, proof assets in the
  owner's exact figures, contrast assets, and action or risk-reversal assets. No
  two assets make the same claim.
- Every claim in an ad also appears on its landing page.
- No ranking words, no promised results, no phone number, no emoji, no repeated
  punctuation. A line that does not fit its limit is rewritten, never cut.
```

## 3. Change list for the engineer

RISK is the chance the change causes invented client facts. "Lowers" means it reduces today's risk.

### New file `src/lib/lp/clientSellingRules.ts`

| Change | Reason | RISK |
|---|---|---|
| Export the two blocks above (English, zero Hebrew) | One source for both generators | low |

### `src/lib/lp/researchPageCopy.ts`

| Line | Change | Reason | RISK |
|---|---|---|---|
| `:239`, `:258`, `:247`, `:259` | Inject the block into the Tamar and repair system prompts, v1 and v2 | Repairs must not flatten what the first pass sold | low |
| `:823–828`, `:2260–2261` | Add a cut map: hero is the promise; subheadline is the mechanism as a benefit; story is agitation, contrast, mechanism, outcome; about is the man and his pride; cards are gains; close is promise plus risk reversal. The pitch's contrast line must survive into a rendered field | The pitch's selling lines are lost in the cut | low |
| `:2276` and §22.3 B4 | Cards: what the customer gets from this service, plus the one owner-sourced detail that makes it believable. Drop "two or three steps in order" and "never the differentiator" | Dry, and the step demand pressures invention | lowers |
| `:2273` and C2/B5 | About headline: one first-person line of pride in his standard. Keep no number and no town list | Today it is a process label | low–med (the conduct-claim gates must cover it) |
| `:2274` and B6 | About body ends on the customer's gain; one pride sentence allowed | Flat endings | low |
| §20.8 R2 (data doc, then rebuild `generationData`) | "End on a fact or on what the customer gets" becomes "end on what the customer gets" | Bare-fact endings | low |
| `:679` | "Every usp clause above the fold" becomes "the usp's promise and mechanism above the fold; other clauses may sit in the trust bar" | Comma-list subheadlines | low |
| `:2284` | "Each idea" becomes "each fact and each process step"; the promise is exempt in fresh words | Contradicts the one-promise rule | low |
| `:1023–1024`, `:2423–2425` | After the direct answer, add one reason sentence from the cited facts; keep `factIds` | Bare answers; the fact-trace gate still checks | low |
| Schema, limits, renderer | New `closeLine` (above the form, about 140 characters) and unrendered `flags` array, warn-only for round 1 | No close today; flags stop silent shrinking | low |

### `src/lib/lp/lpCopyPrompt.ts`

| Line | Change | Reason | RISK |
|---|---|---|---|
| `:97` | Replace "Not salesy" with "sells with the pride of a tradesman; never corporate" | Direct instruction to be dry | low |
| `:120–121`, `:178` | "Stay quiet" becomes "use scene and pride, never filler"; add "then say what the fact means for him" | Fact lists | low |
| `:159–176` | Replace the four Hebrew examples with abstract English descriptions | Examples leak, and two contain invented claims | lowers |
| `:193–194` | Hero carries the promise in free shape; subheadline is one benefit sentence with a verb. Keep the keyword rule at `:192` | Process-first heroes | low |
| `:196–200` | FAQ answers as in the selling rules | Bare answers | low |

### `src/lib/lp/copyGates.ts`, `copyGates.config.ts`, `claimScope.ts`, `factRestatement.ts`, `repetitionBudget.ts`

**Keep unchanged:**

- every `CLAIM_RULES` entry (`copyGates.config.ts:156–181`);
- customer-source, customer-attribution, quote-overlap and invented-story;
- foreign-tool and usp-tool;
- service-area, availability, hours, install-arrival and same-day scope;
- fear-promise, fact-trace and fact-restatement;
- name-spelling, unconfirmed-service, WAO-offer and trade-term;
- plural and feminine address, and we-form;
- foreign-script and all typography gates;
- the verbatim-wording gates (`gate_clause_repeat`, `gate_phrase_repeat`). They cap wording, not the promise.

**Relax:**

| Gate | Change | Reason | RISK |
|---|---|---|---|
| `gate_hero_signature_cap` (`:2107`) and R1 | Warning only; duplicate-hook and duplicate-meta gates stay. Needs Yonatan's nod | Each service page is an entry page | low |
| `DIFFERENTIATOR_CAP` | Raise 2 to 3 | Promise at top, middle and close | low |
| `gate_about_headline_promise` (`:2116`) | Warning only | Conflicts with the new pride headline | low |
| `gate_generic_adjective` (`:2082`) | Move only the "expert" word family to warning. Ranking phrases stay blocked | Legitimate positioning | low |
| `gate_moral_ending` (`:2070`) | Warning for one round; Tamar reads the hits | May hit pride closers | low |
| Hero allowance (`factRestatement.ts:88–93`) | Allow one code-owned fact in the hero and one in `closeLine`, exact owner digits, usp membership not required | Proof beside the promise | low |
| Pitch hits (`:2167`) | A truth hit in `pitch` drops that pitch sentence; rendered fields still block | plumber-3 failed on an unrendered field | low |
| `repetitionBudget.ts:12` | Add `closeLine` to the never-dropped fields | The close restates by design | low |

**Add:**

| Gate | What it does | RISK |
|---|---|---|
| `gate_unknown_number` | Blocks any digit run in a model-written field that is not in the owner facts | lowers |
| Fear-promise fix | Fear-promise works when the fear is not Hebrew. Token classes from Noa, byte-exact | lowers |
| `gate_subheadline_list` (warning) | Flags a subheadline with no verb or with two or more commas | fact-neutral |

### `src/lib/bot/prompts.ts` and the Ads routes

| Place | Change | Reason | RISK |
|---|---|---|---|
| `prompts.ts:420–447` | Add "facts only from the input; skip empty fields"; add the selling block and the Ads addendum; pass the landing page's promise into the brief | No fact rule today; ad and page must match | lowers |
| `prompts.ts:449–483`, `create-campaign/route.ts:251` | Build callouts from the code-owned fact templates (`ownerFactCopy.ts` `trustText`), not from the model | The "insured" invention and leaking examples | lowers (high today) |
| `create-campaign/route.ts:133`, `:648` | Replace `trim()` with validate, one repair, then drop the asset | Cut headlines ship | low |
| `lp-generate/route.ts:118` | Run the claim gates on Ads landing pages, with `nullGuarantee` when there is no guarantee | Invented guarantee, solo and price claims today | lowers (high today) |
| `lp-generate/route.ts:118` | Move Ads landing-page copy to Qwen (Adam's call) | Founder wants Qwen's Sabra tone | low |

## 4. Test plan

All output goes to `scratch/sell-r<N>/`. Nothing writes to `data/clients/` or `data/lps/`. A site costs about $0.18–0.29 at the m2b1i rate.

**Round 0 (free).**
- Rescore the saved m2b1g and m2b1i records with the changed gates. Any hit outside the intended changes is an overfire.
- Regenerate hebrew-plumber-1 and electrician-2 on the current v2 prompt as the baseline.

**Round 1 fixtures.**
- **hebrew-plumber-1:** fact-rich, Hebrew owner data.
- **electrician-2:** English facts, no guarantee, no response time, so it tempts invention.
- **plumber-3:** camera usp and a tempting review; failed last time.
- **split-hours-1:** the hours trap.
- **New thin-facts fixture:** name, trade and city only. It tests that pride does not become invention.
- **Ads:** RSA plus landing-page JSON for three of the same owners, through a script that calls the prompt builders directly.

**Round 2.** Fix the top three failures. Rerun the five, and add two other trades (AC, locksmith) to check wrong-trade bleed.

**Round 3.** All eight m2b1g fixtures plus the thin-facts one. Eitan reads two sites; Noa runs the hero test.

| Score | How | Pass |
|---|---|---|
| Selling | I score ten checks, 0–2 each: outcome hero; why-him on the first screen; scene; rendered contrast; mechanism dramatised once; pride present; proof adjacent; endings on gain; close; no list or caveat in the hero | Site average ≥14/20 in round 1, ≥16 in round 2; every page ≥15 in round 3 |
| Sabra voice | Noa rates 1–5; Eitan spot-checks | Average ≥4, no page below 3, zero calques |
| Fact fidelity | Hand ledger: every checkable claim in a rendered field traced to an owner field | Zero untraceable claims, every fixture, every round |
| Gate pass | Valid sites and repair count | ≥4 of 5 in round 1, 5 of 5 in round 2, 9 of 9 in round 3; repairs per site no more than 20% above the round-0 baseline |
| Ads | Limits, policy checklist, angles | 15 headlines ≤30 and 4 descriptions ≤90 with no truncation; zero policy hits; ≥4 distinct angles; every ad claim on its landing page |

**Stop rule.** One invented client fact in a rendered field means the relaxation that allowed it is reverted, not tuned.

**Decisions for Eitan and Adam:**
1. Approve the new `closeLine` field.
2. Move Ads landing-page copy to Qwen, or leave it on Gemini.
3. Yonatan's nod on relaxing the site-wide hero cap.

Sources:
- [Google Ads Misrepresentation policy](https://support.google.com/adspolicy/answer/6020955?hl=en)
- [Google Ads Editorial policy](https://support.google.com/adspolicy/answer/6021546?hl=en)
- [Editorial: Punctuation and symbols](https://support.google.com/adspolicy/answer/14847994)
- [Unreliable claims](https://support.google.com/adspolicy/answer/15936857)