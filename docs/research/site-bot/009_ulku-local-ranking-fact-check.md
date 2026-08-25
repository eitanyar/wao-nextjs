# 009 — Fact-Check: Caleb Ulku's Local Ranking Method (Podcast Transcript)

Source: transcript from Eitan's Google Doc (podcast interview, ~episode 1,085 of a daily
show). Speaker: Caleb Ulku — local SEO agency owner (Houston/New Orleans), pivoted his
agency 100% to local SEO in early 2023. Internal dating (references to "Ask Maps" rollout
in March, a Pichai interview "a month ago", May de-indexing event) places the episode
roughly mid-2025. Full transcript read, all 9 segments; nothing skipped.

Date: 2026-08-25. Author: orchestrator (project director), on Eitan's request.

---

## EXECUTIVE SUMMARY

**Bottom line: this is largely real gold — with about 20% hype mixed in, and two tactics
that could actively hurt us if copied blindly.**

Ulku's system is one of the most coherent "website + GBP as one entity" playbooks I have
seen described publicly. Its core idea maps almost exactly onto what WAO wants to be for
the AI era:

1. **The website must mirror the Google Business Profile exactly** — same categories,
   same services, same hierarchy (~30 pages, his "Core 30"). This is the highest-confidence
   lever in the entire transcript: it aligns with Google's own published guidance
   (relevance/prominence, complete business info) and with the Whitespark 2026 local
   ranking study's long-standing finding that GBP signals are the dominant local factor.
2. **Write for machines that judge trustworthiness from what they can read online** —
   he explicitly frames the endgame as AI agents (not humans) reading every page and
   deciding whether to recommend the business. This is GEO/AIO in plain clothes, and his
   "trust content" concept (pricing, failure stories, who-the-service-is-NOT-for) plus
   "attribute matching" (state the exact capability: *lead* main drain line, *tonight*,
   *garbage disposal*) are directly usable GEO techniques.
3. **Measure what matters: percent-of-grid top-3 visibility (rank maps), not traffic.**
   He shows a case study of a client whose traffic dropped 50% while calls went up because
   local grid visibility went green. For a local business, traffic is a vanity metric.

**Where the hype is (do not copy):**
- Claiming missed phone calls *directly* lower Google rankings ("Google is tracking your
  calls") — unproven mechanism; Google has never confirmed behavioral call signals in
  local ranking. Good business advice dressed up as a ranking factor.
- Publishing AI-generated YouTube videos "that nobody watches, for Gemini" — pure
  speculation; zero public evidence it moves local AI recommendations.
- Faking EXIF/GPS metadata on AI images — he himself cites a study showing EXIF doesn't
  matter, then does it anyway. Skip.
- Paid press-release services ($80/mo) for Google News pickup — weak tactic, weak claim.
- Also note the conflict of interest: he sells a course (embedded ad in the transcript)
  and runs an agency; his "month one results almost always look fabulous" is sales-grade
  language. The mechanics he describes, however, mostly hold up.

**For WAO:** roughly 60% of his method is something site-bot should be doing and largely
can be automated (Core 30 structure from the client's GBP, first-paragraph discipline,
attribute-rich service pages, trust sections, review-ask flow, grid-visibility KPI).
One tactic (neighborhood/landmark geo pages) is real but carries a doorway-page policy
risk and needs a strict uniqueness bar. The rest is reject.

**Decision needed from Eitan:** which of the "adopt" items in §6 become the next specs
for waostrategy to write into `/handoff/pending/`.

---

## 1. WHO IS TALKING, AND HOW MUCH TO TRUST HIM

- Ulku ran a general SEO agency (big Upwork clients: Skillshare, Adobe, Stanley Black &
  Decker), split-tested tactics with those budgets, then pivoted fully to local SEO in
  early 2023 because ChatGPT made informational SEO a dying channel. That pivot logic is
  sound and matches what we have observed.
- He is candid about his own failures (got a client's domain de-indexed with shady link
  building in ~2015; bought PBN courses). Candor is a weak-but-real honesty signal.
- He openly sells a course (an ad for "Compact Keywords" is spliced into this very
  transcript) and pitches his agency throughout. Treat superlatives as marketing; treat
  described mechanisms as claims to grade.
- He does not invent Google policy — when he speculates, he usually says "we think" or
  "we're testing." The worst offender in the transcript is the phone-call ranking claim
  (§4, item 17), which he states as fact.

## 2. HIS COMPLETE METHOD, AS DESCRIBED

Step 0 — **GBP hygiene first.** Fix categories (use up to 10; the "multiple categories
dilute your primary" idea is a myth per his repeated split tests) and services (no
keyword-stuffed duplicates — Google matches entities, not keyword variants). Fill every
box, including holiday hours (Google only lets you set the next 2–3 holidays, so revisit
quarterly).

Step 1 — **Core 30: website mirrors the GBP.** Homepage = primary category ("plumber
Houston"); H2 per secondary category and per core service, each linking down to a page
that owns that entity; service pages under category pages exactly as the GBP's
category→service hierarchy. ~30 pages for a typical business. Multi-location: one GBP
landing page per location (Core 30 × N), but never move a ranking homepage GBP-link to
an internal page without a rank-map check first (rank drops follow).

Step 2 — **Measure with rank maps.** Grid-rank the market; the KPI is *percent of grid
positions in the top 3* (position 4 = "first loser", invisible). Size the grid so the
market leaders sit at 60–90% top-3; if leaders are at 100%, the grid is too small.
Never promise a client more than the best competitor has demonstrated. Tool: LeadSnap
(chosen for its citations API).

Step 3 — **Topical relevance threshold.** Keep building service-entity-supporting content
until the client reaches ~half of the market leader's top-3%. Supporting content must
serve the service entity ("what to think about when hiring a plumber in Houston"), NOT
generic blogs ("5 ways to winterize your water heater" = waste).

Step 4 — **Geographical relevance.** On the rank map, find grid dots at positions 4–6 and
write hyper-local content about a Google-recognized landmark in that area (validated via
Places API). In competitive markets: dozens of such pages. Uniqueness is enforced by real
research (census data, neighborhood character, CRM conversations) — after Google's May
de-indexing wave hit their geo pages, they enriched with research and got much of it
re-indexed because it became "informationally additive".

Step 5 — **Links via real local presence.** Chambers of commerce (17 joined for one New
Orleans PI lawyer), local sponsorships (youth sports, festivals — UT Austin TEDx talk
sponsor link for $250), found via a Gemini prompt. Press releases monthly (PR Underground,
cheapest route into Google News); paid local-newspaper features for big metros.

Step 6 — **The AI layer (his newest work).**
- *Attribute matching:* state the exact capability on the page ("lead main drain line",
  not just "main drain line") because LLMs match specific attributes when recommending.
- *Trust content (a fifth content type, in trial):* pricing, stories of things that went
  wrong, who the service is NOT for — because AI agents read the whole page and reason
  about fit.
- *Reviews with attributes:* ask "tell us what happened and what the outcome was" from the
  technician's own phone number via text (40–45% take rate vs ~5% for review software);
  rotate platforms: Google → Bing (ChatGPT uses Bing) → Yelp → Angi → back.
- *Video:* embed AI-generated videos (Pictory) on articles and publish to YouTube "for
  Gemini, not for people".
- *AI phone answering:* better than not answering, but monitor hang-ups — he ties missed
  calls to rank drops (§4 item 17).

Content-type taxonomy: (1) category pages, (2) service pages, (3) topical relevance,
(4) geographical relevance, (5) trust — the fifth one new and in trial.

## 3. EVIDENCE GRADING

Grades: **STRONG** = aligned with Google's published guidance and/or multi-source industry
consensus. **PLAUSIBLE** = consistent with practitioner consensus, no direct public proof.
**ANECDOTAL** = only his agency's experience. **SPECULATIVE** = extrapolation, no evidence.
**WEAK** = contradicted or undermined by evidence he himself cites.

| # | Claim | Grade | Basis |
|---|-------|-------|-------|
| 1 | Website mirroring GBP structure builds trust with Google and AI systems | STRONG | Google's own local doc: relevance = how well the Business Profile matches the search; "complete and detailed business info" is their stated lever. Entity consistency across GBP+site is also the foundation of how LLMs form a business picture. |
| 2 | Use up to 10 categories; "dilution" is a myth | STRONG (consensus) / his numbers ANECDOTAL | Category selection has been the top GBP-level factor in Whitespark's study for years; adding relevant secondary categories is mainstream advice. His "never saw dilution" is absolute language from one agency. |
| 3 | Google matches entities, not keyword variants — service-list keyword stuffing is dead | STRONG directionally | Google's semantic understanding (Hummingbird onward) is well documented. Caveat: "keywords don't exist anymore" is overstatement — phrasing still carries signal. |
| 4 | Don't move a ranking homepage's GBP link to an internal page | PLAUSIBLE | Common practitioner caution; no official doc. Low-risk to follow. |
| 5 | URL structure barely matters; internal linking is what Google reads | PLAUSIBLE, slightly overstated | Internal linking genuinely drives crawl + equity distribution. Google docs still treat URL structure as minor-but-real. Fine as a working stance. |
| 6 | Keyword/entity placement: title tag > H1 > early first paragraph; never open with company history | STRONG | Decades of consistent evidence; also matches what AI summarizers weight. |
| 7 | Four content types; geo pages for grid positions 4–6 | PLAUSIBLE, high policy risk | See §4 item 19 — this brushes against Google's doorway-page / scaled-content policies. His uniqueness defense (real research) is the correct mitigation and matches Google's helpful-content bar, which I verified: "original information… substantial additional value… not mass-produced". |
| 8 | May de-indexing wave hit their geo pages; enriching with research restored indexing | ANECDOTAL | Could not independently verify the specific May event from this machine; but consistent with Google's scaled-content-abuse enforcement direction. |
| 9 | EXIF/GPS metadata on AI images | WEAK | He himself cites Jay Huntley's study finding EXIF makes no difference. Defensive folklore; skip. |
| 10 | Map-pack algorithm "hasn't meaningfully changed in 10 years"; proximity/relevance/prominence still rule | STRONG | Google's published local factors are exactly relevance, distance, prominence — verified in their current help doc. "No change in 10 years" is rhetorical but directionally fair. |
| 11 | Ask Maps (Gemini conversational search in Maps) exists and signals where the map pack is heading | STRONG that it exists; PLAUSIBLE as a signal | Google has indeed rolled Gemini conversational features into Maps. Reading it as a preview of the future map-pack algorithm is reasonable inference, not fact. |
| 12 | Publish AI-generated YouTube videos "for Gemini" to boost local AI recommendations | SPECULATIVE | Gemini is genuinely multimodal and Google owns YouTube — but there is no public evidence that zero-view AI videos influence local AI recommendations. This is a guess he is testing on clients. |
| 13 | Chamber memberships + local sponsorships move local rank | STRONG as a class | Google's prominence doc explicitly cites "how many websites link to your business". Local institutional links are the classic, safe way to earn that. The specific anecdotes ($250 UT Austin link, +3–4 rank positions) are unverifiable but believable. |
| 14 | Informational blog traffic is a waste for local businesses | STRONG | His Chicago eye-surgeon case (80k visits/mo on "eye-health foods", invisible for "LASIK Chicago") is exactly the known informational-vs-local-intent mismatch. |
| 15 | Percent-top-3 grid coverage as the KPI; size the grid against competitors' demonstrated ceiling | PLAUSIBLE (sound measurement discipline) | Thresholds (60–90%, half-of-leader) are his agency heuristics, but the discipline — measure grid visibility, benchmark against demonstrated market ceilings — is healthy and rare. |
| 16 | Reviews: personal SMS ask from the known number, ~40–45% take rate, 10× review software | STRONG | Multiple independent studies have found direct personal asks massively outperform software/email flows. |
| 17 | Missed calls / rude answers lower your Google rank ("Google is tracking your calls", "goal completion") | UNPROVEN — treat as SPECULATIVE | Google has never confirmed behavioral call signals as a local ranking input; Google reps have repeatedly declined to confirm click/behavior signals in general. Mechanism is plausible, evidence is anecdote. Keep as a business KPI, never sell it as a ranking factor. |
| 18 | 4.7–4.9 rating converts better than a perfect 5.0 | PLAUSIBLE | Consistent with published consumer-trust research on too-perfect ratings; his framing (joking about earning a one-star) is colorful but the conversion observation is widely reported. |
| 19 | Rotate review platforms incl. Bing because "ChatGPT uses Bing"; ask for the story (attributes), not just stars | PLAUSIBLE-to-STRONG | ChatGPT's search layer has relied on Bing's index; attribute-rich review text feeding LLM matching is consistent with observed GEO behavior. The platform-rotation strategy is new, unproven, but cheap and sensible. Asking for the *story* instead of a rating also complies better with review-solicitation norms. |
| 20 | Fake reviews are illegal; review gating risks review wipe | STRONG | FTC's fake-review rule (finalized 2024) makes fake reviews illegal, not just a ToS breach; Google does penalize gating. Correct and worth telling clients. |
| 21 | Trust content as a fifth type: pricing, failure stories, "who this is not for" | PLAUSIBLE, early | No published proof yet (he says he is trialing it). But it follows directly from how LLMs extract and reason about attributes, and nothing about it can hurt. Highest-interest new idea in the transcript for GEO. |
| 22 | LLMs favor large/multi-location brands (Roto-Rooter vs Joe the plumber); AI cares less about proximity | PLAUSIBLE | Matches published GEO observations: LLMs recommend entities they have abundant data on. Strategic implication — small businesses must build presence early — is sound. |
| 23 | Monthly press releases for Google News pickup → ChatGPT recommendations | SPECULATIVE-to-WEAK | Paid PR wires landing in Google News are low-quality signal; the claim that this drives LLM recommendations is unsubstantiated. Paid local-newspaper features (§5, PR ASAP) are more defensible as real editorial mentions but pricey. |
| 24 | Pichai quotes (agentic search as Google's home; planning horizon cut to 12 months) | UNVERIFIED here | Consistent with Pichai's public statements of that period; could not re-verify the exact interview from this machine. Used only as color, not as evidence. |
| 25 | "SEO in 5 years = writing websites for AI agents; GEO/AEO is all one discipline" | Directional judgment | Not a falsifiable claim; it is a bet, and it is the same bet WAO is already making. |

## 4. WHERE HE IS LIKELY WRONG OR OVERSTATED

1. **"Google doesn't use keywords anymore."** Entities and semantic matching dominate, but
   exact phrasing still carries ranking signal, especially in local queries. Restate as
   "entities first, phrasing second".
2. **Missed-call ranking factor.** The strongest-sounding claim in the transcript is the
   least evidenced. The honest version: "answering calls correlates with keeping rank
   because businesses that don't answer lose the other things that build rank (reviews,
   engagement, conversions)."
3. **Gemini-video-for-nobody tactic.** No evidence. Also, YouTube quality systems are not
   kind to zero-engagement uploads long-term. Park it.
4. **EXIF on AI images.** His own cited evidence says no effect. Drop.
5. **Google News press releases.** Weak signal, and "ChatGPT picks up Google News mentions"
   is asserted, not shown.
6. **Month-one-results-always-fabulous.** Sales language. Core-30 often does produce fast
   lifts for neglected sites — but "always" is a funnel talking.

## 5. WHAT I VERIFIED INDEPENDENTLY (AND WHAT I COULD NOT)

Verified directly:
- Google's current local-ranking guidance (support.google.com/business/answer/7091):
  relevance / distance / prominence; prominence explicitly includes links from other
  websites and review count/quality; complete business info stated as the lever;
  "no way to request or pay for a better local ranking".
- Google's helpful-content guidance: original information, substantial added value,
  not mass-produced, expertise/trust signals — the bar Ulku's geo-content recovery story
  claims to meet.
- Whitespark Local Search Ranking Factors, 2026 edition (Darren Shaw, published
  2025-11-06): exists, current, and now includes a dedicated "AI search visibility
  factors" section — i.e., the industry's reference study treats AI visibility as a
  first-class ranking discipline now. (Full factor list not retrieved — not needed for
  this verdict.)

Could not verify from this machine (search endpoints blocked here — not a contradiction,
just a gap): the specific May 2025 de-indexing wave, Ask Maps' exact rollout date, the
Pichai interview wording, Jay Huntley's EXIF study text. All four are consistent with
what is broadly documented; none carries a verdict that depends on them alone.

## 6. WHAT THIS MEANS FOR WAO SITE-BOT (SBI-FOR-THE-AI-ERA)

The SBI analogy holds: Ulku's method is a *complete system* — exactly what made SBI
compelling in the 2000s — but rebuilt around GBP+website entity alignment instead of
keyword articles. WAO's opportunity is that his system describes almost exactly what a
bot could *execute* for a micro-business owner who will never hire a $2k/mo agency.

**ADOPT (evidence-backed, automatable, fits our pipeline):**
- A1. ~~**Core-30 generator**~~ — **ALREADY BUILT (correction, 2026-08-25):** the Core-30
  engine is WAO's existing, VISION-locked primary shape: `src/lib/lp/coreThirty.ts`
  (service × city node list, capped 30, fail-closed), `renderCoreThirtyPages.ts`,
  `coreThirtyCopy.ts`, `duplicateCheck.ts`, all under the Gate-1 content-safety rules
  (per-page Hebrew authorship, facts-intake gate, no template substitution). Ulku's
  transcript *validates* the bet rather than adding a new build. Two genuine deltas
  worth evaluating later: (a) his page taxonomy mirrors the GBP's own
  category→service hierarchy, ours is a flat service×city coverage matrix; (b) his
  Step 0 is *fixing the GBP first* because the site is generated from it — see §8,
  which promotes this to the direction decision.
- A2. **GBP audit in onboarding/bot:** category completeness (up to 10), no keyword-stuffed
  service lists, every box filled incl. holiday-hours cadence reminder.
- A3. **Page discipline in generated content:** entity in title/H1/early first paragraph;
  never open with company-history filler. (Check whether our current GEO page templates
  comply — likely partial.)
- A4. **Attribute-richness pass:** each service page must state the concrete capabilities
  (materials, situations, speed, hours) an LLM would match against. Natural extension of
  the existing GEO facts-schema work.
- A5. **Trust section template:** pricing transparency, a real failure story, who the
  service is not for. New GEO content type — cheap to add, zero downside, potentially
  the differentiator.
- A6. **Review flow upgrade:** personal ask via the client's own channel (Israel:
  WhatsApp, not SMS), ask for the story ("what happened, what was the outcome"), rotate
  platforms including Bing Places. Fits site-bot retention goals — reviews are a
  compounding asset the owner cannot take away from us (ties into report 005's
  switching-cost work).
- A7. **KPI shift:** report clients *grid top-3 coverage for their money services*, not
  traffic. Needs an Israel-capable grid-rank tool (LeadSnap is US-centric; LocalFalcon
  et al. need an Israel-coverage check — research item).

**ADAPT WITH CARE:**
- B1. **Neighborhood/landmark geo pages** — real, but doorway-page policy risk. Only with
  a hard uniqueness bar (genuine neighborhood facts — for Hebrew markets: neighborhood
  character, parking, building types, local regulations) and human-ish review. This is
  exactly where our Gemini-primary GEO pipeline needs guardrails, not more volume.

**REJECT:**
- C1. Faking EXIF on images. C2. Zero-audience AI videos for Gemini. C3. Paid press-release
  spam. C4. Selling "answer your phone" as a ranking factor (keep it as a plain business
  KPI in the bot's coaching instead — it is still true advice).

**OPEN RESEARCH ITEMS (small, worth doing before specs):**
- R1. Israel grid-rank tooling coverage (LocalFalcon / alternatives over Israeli cities).
- R2. Does Hebrew-language AI recommendation behave the same way (Bing-index reliance,
  attribute matching) — test with live queries about a known client.
- R3. Whitespark 2026 "AI search visibility factors" full list — one read-through; it is
  the closest thing to an authoritative GEO factor list and may confirm or refine A4/A5.

## 7. RECOMMENDED NEXT STEP (superseded by §8)

Original suggestion (A1 first) was written before re-checking the codebase; A1 is
already built. See §8 for the actual decision.

## 8. DIRECTION DECISION — AUDIT-FIRST WEDGE (Eitan + orchestrator, 2026-08-25)

**Decision: GBP audit + optimization becomes the entry point of site-bot — both as the
acquisition funnel and as delivery step zero. Ulku's transcript supplies the exact
checklist; the Israeli market makes it the wedge.**

Reasoning:

1. **GIGO (the technical argument).** Ulku's whole system generates the website FROM the
   GBP (categories → services → pages). Our Core-30 engine likewise seeds services and
   cities from owner/GBP input. If the client's GBP is broken — one category, two
   services, missing hours, wrong service-area — then mirroring it faithfully produces a
   faithful mirror of a mess. The audit is therefore not an add-on product; it is the
   precondition for the generator working at all. Ulku says this explicitly: for a new
   client, categories/services are fixed *before* Core 30 is built.
2. **Market-size argument (Eitan's point, endorsed with a caveat).** The population of
   Israeli micro-businesses with a *broken or neglected* GBP dwarfs the population with a
   good one — most use 1-2 categories, no services list, stale hours, no photos, and many
   never claimed the listing at all. Eitan's "20x" intuition is directionally sound; the
   number itself is unverified and must not be quoted as fact in specs. Consequence:
   selling "we fix your profile" reaches a far larger audience than "we build your site",
   and the audit scorecard is the natural demo artifact (Ulku himself prospects by handing
   people their own rank maps).
3. **It fits the locked product shape.** VISION.md already merged GBP claim/optimize into
   site-bot delivery ("step one of the Site Bot delivery") and the monthly bundle already
   includes "GBP monitoring/upkeep". This decision promotes that merged step from delivery
   mechanics to the *lead* of the product, and adds the prospect-facing audit funnel that
   is missing today (current GMB dashboard is staff-only/tokenized, existing-clients only;
   `getCompletenessScore` in `src/lib/gmb/store.ts:117` is a starting skeleton, not a
   prospect-facing audit).
4. **Trust assumption is correct:** we do not rely on the Israeli owner to run their GBP
   correctly. We audit it, fix it (with their approval per the approval-gated operator
   model), and keep it fixed via the monitoring bundle. The owner confirms; WAO executes.

**Audit checklist v0 (from Ulku Step 0, Israel-adapted):**
- Categories: primary correct? secondaries filled (up to 10)? dilution myth debunked.
- Services: present, entity-clean, no keyword-stuffed duplicates.
- Completeness: description, attributes, hours + holiday hours cadence (the 2-3-holiday
  window Ulku flags), phone, website URI pointing at our core-30 site.
- Photos: real photos present, owner-labeled; count vs competitors.
- Reviews: count, rating, owner responses (ties into report 005 switching-cost assets).
- Grid visibility for the money services (rank map) — needs Israel-coverage tooling (R1).

**Known technical gaps (from report 006, confirmed today):**
- No Places API integration in the repo — required to audit *unclaimed* prospects'
  listings publicly (no OAuth detour mid-funnel). Biggest build item.
- `regularHours`/`specialHours` not in the GBP read mask (`src/lib/gbp/client.ts:89`).
- Account/location resolution for self-serve prospects not built
  (`src/app/api/gmb/pull/route.ts:60-64`).

**RESOLVED (Eitan, 2026-08-25): pricing posture = FREE LEAD MAGNET.**
**Eitan's market read + program principle: leads must COME OUT cheap.** His reasoning:
the target segment — Israeli micro-businesses — mostly can't and won't pay for
advertising at all; for them a free report/check is the only entry point they will
accept. That is both the magnet's reason to succeed and why acquisition cost must stay
near zero. Design implication: acquisition must ride the built-in viral/share loops
(shareable scorecard URLs, WhatsApp/FB group sharing, chamber/association distribution,
organic local word of mouth) first; paid traffic only if and when those saturate, with
measured cost-per-verified-lead and a hard ceiling. The funnel's own marginal cost per
audit is under 2 US cents (below), so acquisition spend — not compute — is the cost to
control.
- The audit/scorecard is free, public, no payment gate, no trial required to see it.
- Funnel: free scorecard (public shareable URL) → "fix this" section → ₪9.90 trial →
  ₪199/mo retainer. Trial gating applies to the fix-it/delivery phase only.
- Lead-magnet requirements this adds to the spec set: public shareable scorecard URL
  per business (link-earning is an explicit goal — owners share scores in WhatsApp/FB
  groups; chambers can offer it to members), phone-OTP or rate-limit before the
  scorecard renders (anti-scrape; also captures a verified phone = lead-quality
  signal), 30-day result caching (Google allows caching; re-audits cost ~nothing).
- Verified cost basis (Google Maps Platform pricing table, pulled 2026-08-25):
  Text Search (New) IDs-only = free; Place Details (New) Essentials = $5/10k calls;
  reviews/rating may bill at Pro tier = $17/5k calls. Total ≈ $0.0005–0.004 per
  audit (well under 2 US cents). Scoring is deterministic code — zero LLM cost for
  the score itself. Have the engineer confirm the exact SKU tier for ratings/reviews
  and the display/caching attribution rules; do not assume.
- No new SKU anywhere in this program; the locked pricing ladder stands.
- **LIVE TEST CASE #1 = WAO'S OWN PROFILE (Eitan, 2026-08-25):** WAO (wao.co.il) has its
  own Google Business Profile. The audit funnel must be run end-to-end on WAO's own
  listing before any prospect-facing rollout — audit → scorecard → fixes → verify —
  dogfood-first, zero-risk. Spec implication: include an end-to-end smoke test against
  the WAO profile in the verification plan (both paths: the public Places lookup AND the
  OAuth-connected full audit, since WAO's profile is already OAuth-reachable like other
  existing clients per report 006 §4). Whatever the audit finds wrong with WAO's own
  profile is a genuine finding, to be fixed the same approval-gated way.
- **GIVE AWAY THE EASY FIXES (Eitan-approved principle, 2026-08-25):** the free
  scorecard must be genuinely useful on its own, even to an owner who never pays.
  The scorecard hands over the 2–3 fixes the owner can do alone (categories, hours,
  photos — with plain how-to steps), and reserves the structural work (services
  architecture, site mirroring, review engine, monitoring) for WAO's paid flow.
  Rationale: an owner who fixes categories for free and suddenly gets calls tells
  five friends — that word of mouth IS the cheap-lead engine; a scorecard whose only
  message is "you're broken, buy the fix" kills it. In the spec set: the scorecard
  copy spec (waocopy) must implement this split explicitly, and nothing about the
  free fixes may be gated.
