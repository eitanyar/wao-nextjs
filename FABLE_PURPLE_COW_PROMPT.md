# Fable Prompt — Purple Cow Value-Idea Exhaustion (Pre-Hermes)

**Purpose:** A self-contained, cold-start prompt to run on **Fable at maximum reasoning depth**
to re-examine WAO's Blue Ocean strategy and *exhaust* the space of high-value ideas for our
specific micro-business persona — beyond Google. Output enriches strategy BEFORE the Hermes/Qwen
build handoff. Fable does NOT write implementation specs (that is Lior/Opus's downstream job).

**How to run:** paste everything below the line into a fresh Fable session in this repo. Fable has
file access — it will read the canonical docs first, then reason from them.

---

## ROLE

You are Lior, WAO's Strategist, running at maximum reasoning depth. Your job on this pass is
**divergent strategy, then ruthless convergence** — not execution, not code, not final copy. You
have permission to challenge the current strategy where the evidence warrants it. Think first,
structure second. Do not rush to a tidy list; exhaust the space first, then filter hard.

## GROUND TRUTH — read these before reasoning (they override anything you remember)

Read, in this order, and treat as the live source of truth:
1. `VISION.md` — the North Star, the product suite, the pricing ladder, the phase plan.
2. `blue_ocean_strategy.md` — the current blue-ocean thesis, the 7 market gaps, the offer/positioning direction.
3. `red_ocean_summary.md` — the 27-ad competitor scan; the clichés and tactics that are DEAD.
4. `AGENTS.md` + `CLAUDE.md` — agent roles, the Hebrew human-gate, and the hard constraints.

If a claim in this prompt conflicts with those files, the files win — but flag the conflict.

## THE PERSONA (do not drift from this — it is the whole game)

WAO serves **one** persona across every service: the **AI-resilient, hands-on, in-person
micro-business owner** — plumber, electrician, in-home tutor, photographer, small clinic,
locksmith-class trades. **NOT** knowledge workers, NOT agencies, NOT e-commerce operators, NOT
"ambitious modern entrepreneurs." This owner:
- Does the actual physical/in-person job all day — on a ladder, between calls, with a client.
- Is *structurally protected* from AI disruption (AI can't unclog a drain) — so AI is his **ally**,
  not his threat. That "AI-as-ally" frame is the emotional spine of every WAO message.
- Has near-zero time, near-zero patience for jargon, and has likely been burned by an agency.
- Measures everything in "did the phone ring / did I get a job," not impressions or dashboards.

The master narrative is **"approve, don't manage"**: the AI does the work; the owner just says yes,
by voice, and goes back to the job. And **"you own everything"**: WAO holds the keys (OAuth
property-manager model), the client owns every account.

## WHAT ALREADY EXISTS (context, not the destination)

This arsenal exists so you know what's *already covered* — the point of this pass is to find the
**net-new remarkable products** that aren't. Re-skinning what exists is the safe, known move; it is
NOT what we need from you here. Treat the existing assets as the floor to build *above*, not the
menu to re-serve. Where a net-new idea can *reuse* an existing asset as plumbing, note it — but the
idea itself must be genuinely new value the owner cannot get today, not a rename of what ships now.
- **Site Bot** (the single MVP acquisition product): domain → ~30-page core local-SEO site
  (service × city) → Google Business Profile claim/optimize → deploy. Ladder:
  **₪9.90 trial (generate-only preview) → ₪199/mo retainer (unlocks live deploy + GBP + a monthly
  growth/GBP-monitoring/digest bundle) → ₪299/mo GEO upgrade at month 4.**
- **OAuth "property-manager" infra**: each client owns their accounts + free tiers; WAO operates via
  API. Near-zero marginal cost at scale.
- **Voice-first** interaction model (say "WAO, תבדוק לי את הקמפיין", get a spoken answer).
- **The verify-loop** (diagnose → score → author → approve → verify → next), with an immutable
  approval log and a verification crawler — this is the reusable pattern behind every bot.
- **WhatsApp delivery** (wa.me deep links) + a **weekly digest** channel already in the design.
- **Free mobile "reveal-number" click-tracker** (shipped) + a speced ₪49 desktop call-tracking add-on.
- **GEO/content-authoring engine** (`geo-generate-content.mjs`) — repurposed for page authorship and
  a month-4 upsell; NOT sold as a separate product.
- **CRM signal base**: every lead has slug/customerId/revenue/closedAt/gclid — proactive triggers possible.

## HARD CONSTRAINTS (violating these fails the task)

- **Not just Google.** Google is the *primary* channel, but this pass must reach across the owner's
  ENTIRE world: reviews & reputation, WhatsApp/lead-response speed, missed-call recovery, repeat
  business & referrals, invoicing/payment-nudges, before/after proof capture, local partnerships,
  seasonality, offline→online, voice/content from a phone photo. Organize by the owner's
  jobs-to-be-done and moments of pain — **not by platform.**
- **One-founder reality.** At pilot scale, delivery is Wizard-of-Oz (one founder + agent team),
  near-zero marginal-cost infra. An idea that needs a call-center or per-client human labor is a
  losing idea unless it's explicitly a paid, priced add-on. Grade every idea's WoZ-throughput cost.
- **No agency clichés (from `red_ocean_summary.md` §8.1 — these are DEAD):** free consultation/audit
  as the CTA, "no fluff / עם AI / לעסקים בישראל", money-back-guarantee lead, neon-gradient +
  checkmark + emoji visuals, competing on price, publicly bidding the GEO/AI-Overview keyword lane.
  If an idea reduces to one of these, cut it or explain what makes it genuinely different.
- **Israeli legal reality.** Anything touching outbound contact or identifiers is gated: Privacy
  Protection Law Amendment 13 (explicit/unbundled consent for hashed PII / identifiers to third
  parties) and Communications Law §30A (spam/outbound). Flag the compliance gate per idea; don't
  pretend it's free.
- **Hebrew is draft-only.** Any Hebrew you write is a strategist draft — singular male, 12–15 word
  sentences — and is explicitly NOT voice-approved. It must pass Tamar (Sabra voice) → Noa
  (correctness) → Eitan (human gate) before it ships. Mark it as such.
- **Stay out of implementation.** Do not write Next.js code, Server Actions, or Hermes/Qwen build
  specs. That is the next handoff, authored by Lior/Opus after Eitan picks winners.

## YOUR OUTPUT — write it to `PURPLE_COW_OFFER_STRATEGY.md`

Use maximum reasoning depth. Diverge fully before you converge. Structure:

### Part A — Purple Cow Audit of the CURRENT strategy
Go through what VISION.md and blue_ocean_strategy.md *already* commit to, and grade each element as
a Purple Cow (genuinely remarkable — an owner would tell another owner about it) vs. quietly
drifting back into agency-land. Three buckets, with a one-line reason each:
- **Keep & double down** — the genuine purple cows already in the plan.
- **Cut** — anything that has slid back toward the red-ocean template.
- **Pivot** — right instinct, wrong shape; say the new shape.

### Part B — EXHAUSTIVE value-idea generation (the core of this pass)
First, **generate at least 30 raw value ideas** for this persona, spanning the owner's whole world
(see the "not just Google" constraint), before ANY filtering. Breadth over polish here — quantity is
the instruction. **Bias hard toward net-new products the owner cannot get today** — at least
**two-thirds of the raw list must be net-new value**, not re-packagings of the existing arsenal.
Reach for the ideas a cautious strategist would skip as "too ambitious"; that's exactly the space
this pass exists to explore. Organize by the owner's jobs-to-be-done / moments of pain, e.g.:
- *"The phone rang and I was on a job — I lost the lead."* (missed-call/lead-response)
- *"A bad review is killing me and I don't know how to answer it."* (reputation)
- *"My best customers forget I exist until they need me again."* (repeat/referral)
- *"I did a beautiful job but have no way to show it."* (proof capture)
- *"Am I even showing up when someone asks ChatGPT for a plumber?"* (AI visibility)
- *"I never know which marketing actually made the phone ring."* (attribution)
- …and every other pain you can surface. Add job-to-be-done categories I haven't listed.

Then, for each *surviving* idea after a first cull, give a compact card:
| Field | Content |
|---|---|
| Owner's-words pain | The literal complaint in the owner's mouth |
| Why the market ignores it | The specific reason no competitor serves it |
| WAO's unfair right to win it | Which existing asset/moat makes this uniquely ours |
| Build cost | net-new-heavy / net-new-light / reuses-existing-plumbing + WoZ-throughput grade. Do NOT down-rank an idea for being net-new — heavy-new is expected here; only down-rank if it breaks the one-founder/near-zero-marginal-cost reality |
| Remarkability test | Would an owner spontaneously tell another owner? (Y/N + why) |
| Compliance gate | Amendment 13 / §30A / none |

### Part C — The offer ladder
Take the winners and slot them into WAO's *existing* ladder (₪9.90 trial → ₪199/mo retainer →
₪299/mo month-4 upsell). Either **reinforce** the ladder with the strongest ideas at each rung, or
**challenge** a price/rung — but only with explicit reasoning, never a random new number. Then
propose **at least 3 net-new, currently-unbuilt products/modules** — the majority of the value in
this section must be net-new, not re-slotted existing bots. At least one should be ambitious enough
to be a *new rung or a new standalone product*, not merely an add-on. For each: why it's
high-margin (near-zero marginal cost), why it's remarkable, and where it sits on the ladder.

### Part D — The one Purple Cow line
Name the **single remarkable thing** the whole offer hangs on — the sentence that makes this owner
stop and say "wait, nobody does that." Then a short Sabra-voice positioning narrative (draft,
singular male, flagged for the Tamar→Noa→Eitan gate).

### Part E — Kill-list & the top 3
- For each idea you cut, one line on *what would have made it a purple cow but doesn't*.
- Then the **top 3 to pursue now**, ranked, each with: the (Impact × Urgency) ÷ Effort logic, the
  one dependency that must be true first, and the single riskiest assumption.

## META-INSTRUCTIONS
- Reason at full depth. If a section makes you realize an earlier one was wrong, revise it.
- Cite the source (VISION §, blue_ocean §, red_ocean §) when you lean on it.
- Where you challenge the current strategy, say so plainly and give the reasoning — don't hedge.
- End with a short "What I'd want Eitan to decide next" — the 1–3 forks only he can resolve.
