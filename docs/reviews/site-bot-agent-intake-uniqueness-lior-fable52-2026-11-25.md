# Lior: can an agent-only intake make Site Bot sites unique and "enough"? (2026-11-25)

## Bottom line

- **Money is not the constraint.** A fully agent-run interview costs roughly ₪10–15 per client, once (my estimate, not measured). The constraint is the owner's attention.
- **Do not run a third paper audit now.** Two audits in 24 hours already agree that generation is safe and the intake is thin. Run the audit on real pilot output around 15.12.
- **₪199 with zero human intake can produce distinct, honest sites.** They can win service + base-city searches and support the map listing. They cannot promise top organic for head terms like "plumber Tel Aviv".
- **Build two things by 20.12:** the agent interview, and a per-page publish / shrink / hold gate.

## 1. The Qwen audit prompt

**What it gets right**
- It audits the system, not imaginary pages, and returns NEEDS_EVIDENCE when an artifact is missing.
- A2, A4 and A6 ask the right things: how much copy rests on owner-only answers, whether vague answers are probed, and whether the data separates fact, claim and filler.
- B1, B4 and C3 are strong tests: simulate two same-trade clients, check omit / shrink / ask / pad, and treat calendar page quotas as a finding.

**What it misses for our question**
- **It never asks "enough to compete".** It has no competitor benchmark, so it can only test uniqueness.
- **It has no numbers.** Every answer is a judgment, so two runs cannot be compared and nothing can become an automated gate.
- **It treats intake as a fixed list.** It ignores facts gained per owner-minute, completion rate, and what happens when he stops answering.
- **It ignores non-owner evidence**, such as his own review texts, profile photos and licence registries.
- **It mixes up the map listing and the organic results**, where the site plays different roles.
- **Sections D and E were answered yesterday**, and its Google "quotes" in D1 are not on Google's page (hard audit, section 0).

**Sharper questions to ask instead, on real transcripts and pages**
1. Per page: how many facts could only this owner have supplied, and what share of sentences trace to them?
2. Swap test: put a same-trade peer's name on the page. Which sentences become false? If none, the page fails.
3. Against the top 5 results for the page's query: what does our page say that none of them say, and which searcher questions do they answer that we don't?
4. Per interview: facts per owner-minute, and which questions yielded only generic answers?
5. Blind test: mix 5 of our pages with 5 competitor pages. Can the auditor pick out the machine-made fleet?
6. For each claim: verified, owner-stated or unverifiable, and how is each rendered?

## 2. Data sufficiency

**What we gather today**

| Source | What we get | Evidence |
|---|---|---|
| Google Places | Name, address, phone, category, hours, website. Reviews and rating are deliberately excluded. | `src/lib/site-bot/placePrefill.ts:22-28` |
| Owner, required | Name, trade, phone, city | `startIntake.ts:54` |
| Owner, 3 questions | Priority services, travel area, what makes him different | `startIntake.ts:103-108` |
| Owner, optional | Years, licence, warranty | `credentialsCopy.ts` |
| Voice note | Nothing: switched off | `voiceNote.ts:17` |
| Research | Keywords, live results, competitor terms and questions | `research/runResearch.ts`, `dataForSeoResearch.ts`, `neuronWriter.ts` |
| Reviews | One quote, only if the owner types it | `researchToSite.ts:311` |

Research tells us what competitors say. Almost nothing here is something only this owner could say.

**Minimum evidence set for a tough niche**

| # | Field | Source | Status |
|---|---|---|---|
| 1 | Name, address, phone, hours, category | Places | Today |
| 2 | Confirmed services and money priorities | Owner | Today |
| 3 | Real travel boundary and excluded areas | Owner | Today, but it never blocks (`ownerGates.ts:14-19`) |
| 4 | One real recent job per top service | Owner, voice | Owner-only; needs build |
| 5 | Jobs he refuses or refers on | Owner | Owner-only; needs build |
| 6 | The question every customer asks, and his answer | Owner | Owner-only; needs build |
| 7 | Price behaviour: call-out fee, "from" prices, night rule or a promise | Owner, plus market norm from results | Designed in the content-depth mission, not built |
| 8 | Local reality: neighbourhoods, building types, recurring local problem | Owner | Owner-only; needs build |
| 9 | Tools, brands, materials | Owner; his photos | Owner-only; needs build |
| 10 | Response time with its condition | Owner | Field exists (`prompts.ts:81`), not asked in the paid flow |
| 11 | Licence, years, warranty | Owner, plus registry | Today, optional; registry check is manual |
| 12 | His own review texts | His Google profile, via manager access | Build: connection returns 503 today |
| 13 | At least 3 real photos, with place and month | Owner; profile photos | Build: no photo intake |
| 14 | Photo date and location data | Photo file | Build, weak source: no code reads it and the hero image builder strips it (`siteLookImages.ts`); WhatsApp is commonly reported to strip it (UNVERIFIED). Ask for a spoken caption. |
| 15 | Searcher questions per service | Results, NeuronWriter | Today |
| 16 | What top competitors cover and show on price | Competitor results | Partly today; price norm not built |
| 17 | A named person and one verbatim sentence | Owner | Owner-only; needs build |
| 18 | Map position baseline | Grid scanner | Built, not wired |

- Rows 4–9 and 17 decide whether a site survives a "thin / scaled" judgment. Only the owner has them.
- Row 12 is the best automated source we are not using.
- **Criminal lawyer is outside the current launch scope.** VISION.md demoted lawyers out of the roadmap, and lawyer advertising rules need a legal check (UNVERIFIED). I would not test the intake on that niche.

## 3. Agent-run intake design

**Channel**
- **Version 1: a personal web link, one question per screen, tap to record.** The link goes out by WhatsApp and email right after payment. He can stop and resume.
- The recorder already exists (`voiceNote.ts`). The same page takes photo uploads and shows the facts screen.
- **Native WhatsApp voice notes come later.** We can send WhatsApp templates (`src/lib/notifications/whatsapp-cloud.ts`), but I found no inbound webhook handler in `src/`.

**Flow**
1. **Before the first question, the agent builds a gap list.** It maps the service tree against missing facts, using the research dossier and the searcher questions.
2. **Five core voice prompts, about 5 minutes:**
   - a job from the last two weeks
   - a job he turned down
   - the question every caller asks
   - a price behaviour choice (chips, not voice)
   - where he works most and what keeps recurring there
3. **One adaptive question per priority service**, picked from the gap list and a trade pack:
   - Plumber: emergencies, insurance jobs, brands.
   - Pest control: licence number, materials, safety around children and pets, warranty period.
   - Roofer: materials, working-at-height certificate, warranty.
4. **Vague-answer probe.** If an answer contains only generic claims, ask once for one example from last month. Still nothing: drop the field and log a gap. The probe exists for one question today (`StartPaidFlow.tsx:345`).
5. **Three photos**, each with a spoken caption.
6. **Facts screen.** He sees every extracted fact as a list and taps confirm or fix. This is also his approval of the claims.

**Extraction**
- Each transcript becomes small facts with an ID, type, linked service and the exact quoted words.
- Types: job, refusal, price rule, local detail, tool or brand, number with its condition, credential.
- The writer may only use these facts. This is the "fact ledger" from yesterday's review.

**Claim verification**

| Class | Example | How it is rendered |
|---|---|---|
| Verified | Licence found in the registry; claim echoed in his reviews | Stated plainly |
| Owner-stated | "I arrive within two hours on weekdays" | In his voice, with its condition |
| Unverifiable or risky | Guarantees, "always", superlatives | Held for the 2-minute exception review |

**Nudges**
- Send the link at payment, then at 4 hours, 24 hours and 72 hours.
- The last nudge asks for one thing only: a 60-second story about one job.
- Then stop. After that, one question a month.

**When he doesn't answer**
- The site goes live on time at the size he earned: a home page plus a services hub.
- A service gets its own page only when its facts arrive. No generic text ever fills the gap.

**Cost and time** (estimates; the pilot must measure them)

| Item | Estimate |
|---|---|
| Owner time | 8–12 minutes, splittable, plus 3 photos |
| Speech to text, about 6 minutes | Cents; ElevenLabs transcription code exists in `scripts/voice/lib/io.mjs` |
| Interview and extraction model calls | About $0.3–1 |
| Research and generation | About $1.50 (figure recorded in the content-depth mission) |
| WhatsApp nudges | Under $0.2, at about $0.0053 per message for Israel (third-party figure, UNVERIFIED against Meta's rate card) |
| **Total per client, once** | **About $2–4** |

## 4. The "unique + enough" gate

**What exists:** `reviewPreflight.ts` is a staff script that prints one sheet per site. It is not in the deploy path and gives no per-page verdict.

| Check | Threshold | Status |
|---|---|---|
| Stored fact-trace results | 0 failures | Exists, covers depth blocks only |
| Word floor per page | 250 visible words | Exists |
| Fact gaps | Listed | Exists, warn only |
| Name, phone, address match | Exact | Exists |
| Foreign script, bidi, leftovers, links | 0 hits | Exists |
| Existing-website flag | Flag | Exists |
| Same-trade similarity | Warn above 0.15 or an 8-word shared run; fail above 0.25 | Exists |
| Owner facts per money page | At least 3; at least 12 per site | Add |
| "Only he could say" item per money page | At least 1 | Add |
| Substance units per page | At least 5 | Add |
| Sentences unique within the site | At least 70% | Add |
| Searcher questions answered from owner facts | At least 3 per service page | Add |
| Unverifiable claims not yet reviewed | 0 | Add |
| Verbatim owner sentence on home or about | At least 1 | Add |
| Trace for every model-written field | 100% | Add; needs the fact ledger |

**Verdict per page**
- **Publish:** all bars met.
- **Shrink:** below the owner-fact or substance bars. The page folds into the services hub and a question is queued for the owner.
- **Hold:** similarity fail, a risky claim, or a name / phone mismatch.

**Human touch**
- Only held items reach a person, with the flagged sentences highlighted. Target: 2 minutes.
- During the pilot all 10 sites still get the full review, so we can compare the gate's verdict with your judgment and set the thresholds.
- Terms §2 says a person checks every site. After the pilot, either keep a one-click sign-off per site or reword §2.
- I would not add embedding similarity now. Word-sequence overlap is enough at 10–50 sites.

## 5. Honest verdict

**Can ₪199 with zero human intake rank in tough niches?**
- **Yes** for service + base-city searches, long-tail questions, and backing the map listing with a real site.
- **No** for a promise of top organic on head terms. The map listing is driven mainly by the profile's category, distance to the searcher and reviews. In the Whitespark 2026 survey, as summarised by secondary sources, profile signals weigh about 32%, reviews 20% and the website 15%.
- If owners don't answer, the product falls back to thin sites. So the interview completion rate is the number to watch in the pilot.

**The right answer**
- **Scope the promise:** "a real site that says what only you can say, matched to your Google profile, growing every month". Never a position.
- **Staged rollout**, below. No higher tier yet; decide that with pilot numbers.

| When | What must be true |
|---|---|
| 29.11 pilot | Your 10-minute call follows the same question list and is recorded with consent; `reviewPreflight` run by hand per site; pilot clients picked inside launch scope |
| By 20.12 | Agent interview v1 live; fact ledger; gate gives per-page verdicts; fact gap becomes the monthly question |
| Later | Own review texts via manager access; native WhatsApp interview; competitor coverage check; tough-niche flag at the free audit |

**Google facts**
- The November 2026 core update began 10 Nov with "up to two weeks". I could not confirm completion as of 25.11 (one secondary source says complete: UNVERIFIED).
- I found no Google statement tying it to local or AI-made sites. That claim is UNVERIFIED.
- I did not re-verify the September 2026 spam update today.
- Google's scaled-content rule covers many pages made mainly to manipulate rankings, however they are produced (Google spam policies, checked 2026-11-25).

## 6. Delivery block

| Rank | Mission | Verdict | Rationale |
|---|---|---|---|
| 1 | Pilot call uses the agent's question list, recorded | **PROCEED** now | Tiny effort; produces the first real transcripts and the human baseline |
| 2 | Fact ledger plus per-page gate | **PROCEED**, by 20.12 | Builds the bot; everything else depends on it |
| 3 | Agent interview v1 (web link, voice, photos, facts screen, nudges) | **PROCEED**, by 20.12 | Removes you from intake; the unit economics depend on it |
| 4 | Corrected audit on real pilot output | **DEFER** to about 15.12 | On paper it repeats known findings |
| 5 | Own review texts via manager access | **DEFER** until the connection is enabled | Best automated source, but blocked on the 503 path |
| 6 | Native WhatsApp inbound interview | **DEFER** past 20.12 | No inbound handler found; the web link covers version 1 |
| 7 | Competitor coverage check; tough-niche flag | **DEFER** past the pilot | Useful, not blocking |
| 8 | Higher tier or human concierge interview | **DROP** for now | Contradicts the price model; revisit with pilot data |
| 9 | Embedding similarity | **DROP** | No gain at this fleet size |

**Dependencies**
- Mission 2 needs the fact ledger before the per-page counts mean anything.
- Mission 3 needs a private upload route, transcription, and Hebrew prompts from waocopy with Noa's read (voiced copy).
- Mission 3 needs consent wording for recording.
- All three fit VISION.md (Gate 1 facts intake, Proof Engine, voice first).

**Next single action for Adam:** brief `nextjs-engineer` on mission 2's fact ledger, and in parallel have waocopy write the interview question list so you can use it as your call script from 29.11.

**Open question for Eitan:** will you record your pilot calls (with the client's consent) and let the agent interview the later pilot clients from about 10.12, so we can compare agent against human before the pilot ends?

Sources:
- [Search Engine Roundtable: November 2026 core update](https://www.seroundtable.com/google-november-2026-core-update-42504.html)
- [Keywords Everywhere: November 2026 core update](https://keywordseverywhere.com/news/google-algorithm-updates/november-2026-core-update/)
- [Momentic: November 2026 core update](https://momenticmarketing.com/google-updates/november-2026-core-update)
- [Google: Spam policies for web search](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google: March 2024 core update and spam policies](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)
- [Whitespark: Local Search Ranking Factors](https://whitespark.ca/local-search-ranking-factors/)
- [BrightLocal: Google local algorithm](https://www.brightlocal.com/learn/google-local-algorithm/)
- [Meta: WhatsApp Business Platform pricing](https://developers.facebook.com/docs/whatsapp/pricing)
- [Times of Israel blog: WhatsApp bot billing](https://blogs.timesofisrael.com/your-whatsapp-bots-october-bill-is-₪0-almost/)