# GEO-Bot Conversational Design Brief — porting the g-ads EQ patterns to the GEO funnel

**Author:** Lior (strategist, Opus) · 2026-08-13
**Status:** Strategic plan — precedes copy. Copy authoring (waocopy) and engineering (waoengineer) execute against this.
**Why this exists:** Eitan asked that the geo-bot receive the same conversational-design improvements the g-ads onboarding bot got — pause-to-reflect, pacing & leading, the expertise reframe — not just a typography/register pass. This brief designs the architecture; it does not write the final Hebrew (that's waocopy's craft) or touch code (waoengineer's).

## 1. Governing principle — port the PATTERNS, re-author the CONTENT, keep ONE audience

The g-ads patterns are transferable; their *words* are not. The geo-bot sells a different *service* (organic SEO / GEO — being found and cited across Google AI Overviews, AI Mode, ChatGPT Search, Perplexity) but to **the exact same person** as the g-ads bot. We keep the geo funnel's SEO/GEO substance and turn order; we overlay the g-ads *conversational mechanics*; and — critically (Eitan, 2026-08-13) — we keep the **audience, persona, and core message identical across both bots**, because the g-ads bot is meant to be offered as a later upgrade from geo (and vice-versa). A prospect must never feel the two bots were written for two different people. Nothing g-ads-specific in *mechanics* (ad budget, the "campaign manager" line, the profile photo, LP generation) crosses over — but the *voice, audience, and worldview* must match exactly.

## 1a. The audience (shared by BOTH bots — do not re-segment)

**Israeli micro-business owners whose value is hands-on, in-person, or human — the kind of work AI will NOT replace soon.** Trades that use their hands (plumber, electrician, mechanic, gardener, AC, mover, locksmith), craft/creative-physical (photographer, hairdresser, stylist, designer), and human-care / in-person relationship work (therapist, trainer, coach, tutor, alternative medicine). The qualifying trait is **AI runway** — these professionals have *more time before AI replaces them*, which is exactly why they are WAO's customers and worth investing in. Explicitly **NOT knowledge workers whose output AI is already eating** (lawyer/accountant/consultant are out — no runway, and their reality contradicts the core message). The tell: *does this professional have years of runway before AI could do their actual work?* If yes, they're our audience.

## 1b. Their customers — the demand side (shapes every Lead)

The owner's OWN customers are, mostly, **people rushing to find a solution fast — often driven by pain or emotional distress** (a burst pipe at night; a body that hurts; a crisis that needs a therapist now). They search in the moment of pressure and grab the first credible answer. This urgency is the demand-side backdrop for the whole redesign: being the answer the AI hands them — at that exact urgent moment — is the value. Note the asymmetry to hold in the voice: **the client is calm and safe (relief); the client's customer is the one in a hurry.** Never transfer the customer's urgency onto the client as pressure.

## 2. The core message — the ONLY thing AI replaces is the manual agency; the client never is

There is exactly **one** legitimate "AI replaces X" idea in all WAO messaging, and it must be aimed precisely (Eitan, 2026-08-13):

> **AI (WAO's automation) replaces the manual marketing-AGENCY labor** — the campaign manager, the SEO-retainer consultant, the content team billing fat monthly fees. **The client is NOT in that boat.** Their craft is AI-safe, and they are the *beneficiary* of the disruption: agency-grade results without the agency cost and overhead.

So the message is a two-part move, identical across both bots:

- **Pace (the owner is safe):** "AI won't replace what you do with your hands / in person" — verbatim spirit of the g-ads line "את המקצוע שלך AI כנראה לא יחליף."
- **Lead (AI is on your side; it replaces the expensive middleman, and puts you on top):**
  - g-ads lead: *let AI run your campaign* — it does what an agency's campaign manager did, for a fraction of the cost.
  - geo lead: *let AI recommend you* — it does what an expensive SEO agency did, and makes the AI itself hand your name to whoever asks for a pro.

**Emotional target — RELIEF, not threat (binding):**
The whole move must land as the owner *exhaling*, never as fear and never as triumph-over-an-enemy. Nothing here is a threat — not to the client, not even framed as a threat to the agency. It is the lifting of a burden: *you don't have to gamble on another expensive agency or wrestle the marketing yourself — the AI does that part now, cheaply and transparently, and it's on your side.* The "replaces the manual agency labor" idea is delivered as **the weight coming off the owner's plate** (no more retainers, no more black-box middleman, no more getting burned), not as schadenfreude toward the agency. Pair it with the g-ads bot's existing "been-burned" emotional beat: the relief is *you're safe, and you're finally free of the part that used to cost you and let you down.*

**Framing guardrails (binding):**
- No threat register anywhere — not at the client, not at AI-search, not even at the agency. The feeling is relief and safety.
- Do NOT write the geo pace→lead as doom ("ChatGPT is stealing your customers", "the AI answers instead of you, and you're invisible"). AI is the ally the owner recruits, and the takeaway is a burden lifted.
- The client's takeaway is always: *you're safe, the heavy/expensive part is off your plate, and the AI is on your side.*

## 3. Pattern-by-pattern port plan

### 3a. Expertise reframe — geo T0
- **Current (commodity framing, to change):** `ספר לי על העסק שלך. מה אתה עושה, ומה השירות שהכי מכניס לך כסף?` — "what do you do / what makes the most money" reduces the owner to a transaction, same flaw the g-ads T1 reframe fixed.
- **Design intent:** open on the owner's *field and authority* — the thing they are the go-to expert for — because GEO is precisely about making them the recognized answer in their domain. Must still elicit the two fields T0 collects: `businessNiche` + `topService`.
- **Angle for waocopy:** tie expertise to findability — "what are you the address for" / "what do people come to you specifically for" — not "what earns the most." Keep the g-ads device of separating the real trade name from a formal title.

### 3b. Pace→Lead library — geo edition (AI-as-ally themed, trade-segmented)
- **Structure:** mirror the g-ads library exactly — segmented by trade archetype, each moment = Pace (a certain truth: their craft is safe from AI) → Lead (make AI work for them via GEO), max 2 sentences, each ≤15 words (TTS), singular male, no emoji.
- **Placement:** the early-bonding window = geo **T0–T3**. Exactly 1, at most 2 per session.
- **Certainty gate (unchanged, critical):** use a line only when the truth is certain for this specific owner; if uncertain, skip entirely — *zero is better than fake.*
- **Framing (see §2):** Pace validates the craft is AI-safe; Lead offers recruiting the AI to recommend them. AI is the ally, never the thief. **Demand-side backdrop (§1b):** every Lead can lean on the truth that the owner's customer is searching *in a hurry, often in pain* — so being the name the AI hands them at that moment is what matters (but keep the urgency the customer's, never the client's). **3 archetypes** (confirmed; knowledge-workers dropped — not our audience per §1a):
  - **Hands-on (plumber, electrician, locksmith, mechanic, gardener, AC, mover):** Pace = AI won't fix a burst pipe or wire a house → Lead = but it can be the one that hands your name to whoever asks it for a pro nearby.
  - **Craft/creative-physical (photographer, hairdresser, stylist, designer):** Pace = AI can fake an image but can't *be* your eye or your hands → Lead = so let's make it the thing that recommends the real you when someone wants it done right, locally.
  - **Human-care / in-person (therapist, trainer, coach, tutor, alternative medicine):** Pace = people ask the AI for advice, then still want a real human they trust → Lead = so let's make you the human it sends them to.
  (waocopy writes the final Hebrew for each Pace/Lead; strategist owns the segment intents above. Cut CONFIRMED by Eitan 2026-08-13.)

### 3c. Pause-to-reflect moment — anchor on AIO (geo T7)
- The g-ads bot uses a reflective, experiential prompt (T6: picture a specific recent client and what troubled them) to shift the owner from autopilot into felt experience. The geo funnel's natural home for this is the **AIO turn (T7)**, which already raises AI answers in search.
- **Design intent:** make the disruption *visceral and self-observed*, not abstract. Direction for waocopy: invite the owner to recall (or, implicitly, to go try) searching their own core service and seeing what the AI answer said — "have you ever seen it happen on your own search? what did it show?" — a genuine pause that lets the threat land in their own words before we position GEO as the response. This also naturally surfaces `aioDetected`.
- Keep it a real reflective beat, not a rhetorical setup; one moment, don't stack it with a pace→lead in the same turn.

### 3d. Hard-truth pause — the "רגע, לפני שנמשיך" redirect
- The g-ads bot has an honesty move: it stops and tells the owner a hard truth when the standard path is wrong for them (e.g. the locksmith → Local Services Ads redirect). This builds trust by not overselling.
- **Geo equivalent:** trigger when the diagnostic reveals GEO can't work the standard way yet — e.g. **no website / no indexable content / no GSC and no content owner** (visible from T1/T2/T3). The honest pause: acknowledge that GEO needs a substrate to optimize, and name the real first step (establish minimal indexable presence / connect the property) before promising AI citations. Parallels the LSA redirect: redirect to the right first move rather than pretend the default plan fits.
- One moment, only when genuinely triggered; never a scripted scare.

### 3e. Discipline to port wholesale (no redesign, just adopt)
- **NO-REPEAT rule:** if the owner volunteers a later field while answering an earlier turn, silently mark it collected and skip that question. (g-ads has this; geo should state it identically.)
- **Silent service-model / context detection** from T0, used to pick the right pace→lead archetype.
- **Register:** native spoken Sabra Hebrew, singular male, warm-direct, jargon always explained (GEO/AIO/GSC especially — this audience is less technical than the g-ads one), correct typography (gershayim ״/geresh ׳, single-spaced em-dash, no double spaces), TTS ≤15-word sentences in any spoken beat.

## 4. Explicitly OUT of scope (wrong funnel)
Ad budget math, the "campaign manager" pace→lead, `profilePhotoUrl` / photo asks, LP generation, Local Services Ads content. The geo turn set (website, GSC, content ownership, service areas, FAQ, exclusions, AIO, approval flow, differentiation, email) keeps its topics, order, and collected fields unchanged.

## 5. Turn-by-turn design map (what each geo turn becomes)

| Turn | Current intent (keep) | Pattern applied |
|---|---|---|
| T0 | business intro → businessNiche, topService | **Expertise reframe (3a)**; eligible pace→lead window opens |
| T1 | website + platform | pace→lead eligible; register/typography |
| T2 | GSC access | jargon-explained register; pace→lead eligible |
| T3 | content ownership | pace→lead eligible; **hard-truth pause (3d)** may trigger if thin/no substrate |
| T4 | service areas | register only |
| T5 | top FAQ questions | register; already semi-reflective — keep |
| T6 | pain/exclusions | register |
| T7 | AIO awareness (special) | **Pause-to-reflect anchor (3c)**; surfaces aioDetected |
| T8 | approval flow + WhatsApp | register |
| T9 | differentiation | register |
| T10 (route only) | email | register |

## 6. Downstream pipeline & sequencing
1. **This brief** (done) — strategist design.
2. **Task 008 → waocopy:** author the final Hebrew implementing §3 — the reframed T0, the 4-archetype geo pace→lead library, the T7 pause-to-reflect, the T3 hard-truth redirect, and a register/typography pass on all turns. Deliverable = exact strings + exact old→new pairs for existing lines.
3. **Task 009 → waoengineer** (written AFTER 008 returns exact bytes): apply via assertion-guarded `str.replace` patch to BOTH `src/app/api/geo-bot/route.ts` (TURN_QUESTIONS + any sim logic) AND `src/lib/geo/prompts.ts` (GEO_ADAM_SYSTEM_PROMPT + T0-T9). New constructs (pace→lead library, pause-to-reflect framing, hard-truth block) live in the system prompt (`geo/prompts.ts`); turn-string edits hit both files.
4. **Verify:** runtime turns exercise the reframed T0, an AIO turn, and a triggered redirect; confirm both paths in sync.

## 7. Non-negotiable guardrails
- **Bot Turns Rule:** every turn-string change lands in BOTH geo files; the two paths must stay identical for shared strings.
- **Hebrew via patch, never retype:** waocopy authors exact bytes; waoengineer applies them as a `str.replace` patch with count assertions — no free-form Hebrew editing by the coder (see the 2026-08-13 onboarding incident).
- **Certainty over cleverness:** pace→lead and the hard-truth pause fire only when true for this owner; a fake moment is worse than none.
- **TTS:** any spoken beat ≤15 words/sentence.
