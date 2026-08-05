# Interaction-Model Spec — Adam Recommendation Audit Loop

Author: Dror (PPC Strategist), routed via Adam
Date: 2026-08-03
Status: Ready for ux (Maya, visual/pixel design) and nextjs-engineer (Eitan-Dev, build) — **this
document is interaction-model only: no component design, no visual system, no code.**
Audience: Eitan (reviewer), Adam (orchestrator/recommendation source), Maya (follow-on UI), Eitan-Dev
(follow-on build), Roni (verification once built).
Scope: Google Ads recommendations only, on top of the existing `GoogleAdsOperatorTask` /
`GoogleAdsOperatorApproval` plumbing (`src/lib/google-ads/operator.ts`). Other bots (GEO, Content,
Site) will need their own pass through this same interaction model once they reach the same
maturity — not in scope here.
Related: VISION.md "Phase 1.5 — Proactive Management Loop", VISION.md Gate 2 ("Primary/Secondary
Conversion Action Flip" — the concrete example of a stage-gate transition this spec must support),
`docs/specs/priority-1-google-ads-execution-loop.md` (the mutation/execution engine this review
gate sits in front of), `docs/specs/priority-2-weekly-proactive-loop.md` (the digest cadence that
feeds the recommendation queue).

---

## 0. What this spec is answering, and why it's needed now

`buildGoogleAdsOperatorTasks()` already turns a weekly digest into a queue of proposed actions
(`operator.ts:80-228`) — materiality-gated (see §4), risk-scored, with a `whyNeeded` and a
`recommendedAction` string on every item. But `buildApprovalRecord()` (`operator.ts:253-270`)
**hardcodes `status: 'approved'`** — there is no human review gate in the code today. Every task
Adam would propose executes immediately, unseen.

That is the literal blocker behind Eitan's hesitation: VISION.md assumes an "Adam proposes → Eitan
approves / asks-why / stays-silent" interface everywhere, but nothing defines what that interface
*is*. Eitan can't evaluate a loop he can't picture, so he keeps intervening — which is rational, not
a trust problem. This spec is the missing middle layer: it defines the review surface, the
why-vs-reject distinction, and the trust-clock model that the 2-month exit condition depends on.
Once this is built, "Eitan stops correcting Adam's recommendations for 2 consecutive months" becomes
a measurable, displayed fact — not a vibe.

**Out of scope (explicitly, per Adam's routing):** pixel/component-level UI (Maya's follow-on),
code/implementation (Eitan-Dev's follow-on). This document specifies *what* the interface must do
and *why*, not what it looks like.

---

## 1. Queue vs. one-card-per-decision — **recommend one-card-per-decision, with a passive queue-depth indicator**

**Decision: one-card-per-decision is the review surface. A priority-ranked list exists, but only as
a read-only, already-decided audit trail — never as the surface Eitan makes a live decision from.**

### Reasoning, tied to "stress-free" / low cognitive load for a perfectionist reviewer

A priority-ranked queue forces two decisions on every visit, not one: *which item matters most* (a
triage judgment) and *what to do about it* (the actual decision). For a perfectionist, the triage
judgment is where the anxiety lives — "did I pick the right one to look at first, is something
higher-risk sitting three rows down that I haven't scrolled to yet." A list is also never "done" —
there's always a next row, so the reviewing never resolves into a clean stop.

A single card removes the triage judgment entirely: **the system has already decided what's next**
(highest risk first, then oldest, see §1.1), Eitan only has to decide the one thing in front of him,
and when the card is dismissed, the session is *over* — not "the top of a shorter list." This
mirrors the shape already built for the client-facing GEO flow (`/geo/action/[actionId]`, one action
per page, one decision per page) and VISION.md's own design constraint: *"Zero decisions required,
one continue"* (VISION.md, Client-Facing Orchestrator section). A queue view is anxiety-shaped; a
single card with a clear end is relief-shaped.

### 1.1 What "one card" means operationally

- Adam surfaces **at most one open recommendation at a time** per client per stage-gate (see §3).
  If a weekly digest generates three materiality-crossing tasks for one client, they queue
  server-side but are shown to Eitan one at a time, highest `risk` first, then earliest `order`
  (reusing the existing `risk` + `order` fields on `GoogleAdsOperatorTask` — no new ranking logic
  needed).
- A small, persistent, non-actionable counter ("2 more waiting for this client") sits near the card
  so nothing is hidden — but it is explicitly **not clickable into a list**. Seeing the count
  answers "is there more work," without inviting triage.
- Across clients, the same one-at-a-time rule applies per client — a WAO operator managing multiple
  clients works through them as separate single-card sessions, not one shared master queue. This
  keeps the "per client, per stage-gate" clock model in §3 structurally simple (one active card =
  one clock state to reason about at a time).
- The audit trail (everything already decided, `readGoogleAdsApprovals()`) is a separate, always
  read-only view — useful for "what did I approve last month," never presented as a place to make a
  new decision from.

---

## 2. "Why?" vs. "reject" — must be structurally distinct affordances, not tone-dependent

**Decision: three distinct actions on every card, each backed by a different code path and a
different logged event type. "Why?" can never be misread as a correction because it is not the same
button, does not change task status, and does not touch the clock — by construction, not by
interpreting what Eitan typed.**

### 2.1 The three actions

| Action | Effect on task status | Effect on the 2-month clock | Logged as |
|---|---|---|---|
| **Approve** | `proposed` → `approved` → executes (existing pipeline, `operator-task/route.ts`) | No effect (this is the expected, silent-clock-advancing outcome) | `GoogleAdsOperatorApproval { status: 'approved' }` (existing) |
| **Why?** | **No change** — task stays `proposed`, sits open, waiting for one of the other two actions | **No effect — structurally cannot count as a correction** | new, separate log: `GoogleAdsOperatorInquiry { taskId, question, answeredBy: 'adam', answer, askedAt, answeredAt }` — a different file/stream than `approvals.jsonl`, so it is not even queryable as if it were a decision |
| **Reject / Adjust** | `proposed` → `rejected` (new terminal status, distinct from `failed` — `failed` means the mutation attempted and errored; `rejected` means Eitan declined it) | **Resets the clock for this client + this stage-gate to zero** | `GoogleAdsOperatorApproval { status: 'rejected', correctionNote }` |

The key structural property: **"Why?" is not a text field on the same form as "Reject."** It is a
separate button that opens an inline Q&A thread and, critically, **returns the reviewer to the same
still-open card** afterward — it never advances the task out of `proposed`. Eitan can ask "why?" as
many times as he wants, get answers, ask again, and the clock is untouched throughout, because no
event that resets the clock has fired — there's nothing to structurally distinguish because the
"why" path never enters the code branch that writes a correction event at all.

This also means **"why?" can be asked before or after approving** without contradiction — if
something is unclear after approval, that's a separate follow-up question about an already-approved
action, not a retroactive correction. Only an explicit "Reject / Adjust" click resets anything.

### 2.2 Why answers come from Adam directly, inline

The "why" answer must be immediate and specific — not a ticket that waits for a human. Adam already
has the source data for the answer, because every task's `whyNeeded` field is generated from the
same digest that produced the task (`operator.ts:87-211` — e.g. `alert.message`, `digest.pacing`).
The inline "why" thread is a scoped Q&A over that same context: Eitan's question, Adam's answer
(citing the specific number — "budget pacing is 34% over because of X"), logged for the audit trail
but not decision-bearing. If Adam's answer genuinely can't resolve the question (e.g. it requires a
platform-mechanics check Adam hasn't verified), the honest move is Adam saying so explicitly, not
guessing — and that non-answer still doesn't touch the clock; it just leaves the card open.

### 2.3 What "silence" resolves to (this had no defined behavior before — it now does)

Today's code has no timeout concept — a task sits in `proposed`/pending forever unless acted on.
This spec adds one explicit rule, because "Eitan stays silent" is one of the three named outcomes
in the audit-loop model and must resolve to *something* deterministic:

- **Low-risk tasks** (`risk: 'low'`, matching the existing field) auto-execute after **72 hours** of
  no action on the card, logged as `status: 'auto-approved'` — a fourth status, distinct from both
  `approved` (explicit human click) and `rejected`. Auto-approval **does not advance the trust
  clock** (see §3) — only an explicit Approve click counts as a clock-advancing week's decision,
  because the clock is meant to measure *demonstrated trust in reviewed decisions*, not the absence
  of a decision. This also matches VISION.md's eventual "zero decisions required" end-state without
  quietly claiming trust wasn't earned.
- **Medium/high-risk tasks** never auto-execute. They stay open until Approve or Reject. If Eitan is
  simply behind, the card queue-depth counter (§1.1) grows but nothing fires without his click.
- This 72-hour number is a product default, not a Google Ads platform constraint — confirm with
  Eitan before build; it is not sourced from any Google documentation and should not be presented as
  one.

---

## 3. The 2-month clock — tracked per client, per stage-gate, derived from the log (not a separate stored counter)

**Decision: the clock is a computed read-model over the existing append-only approval log
(`approvals.jsonl` per client), not a new mutable counter anyone could accidentally reset by editing
a number. This matches the project's existing convention (Priority 1/2 specs both treat the JSONL
approval log as the single source of truth) and makes the clock auditable by construction — Eitan
can always see *why* the counter says what it says by reading the underlying events.**

### 3.1 Definition

For a given `(clientId, stageGate)` pair:
- **A qualifying week** is any calendar week in which **at least one recommendation was presented**
  and **decided** (Approve or Reject — auto-approved low-risk items also count as decided, since a
  live decision *could* have been made and wasn't overridden) for that client at that stage-gate.
- **A silent week** — zero recommendations crossed the materiality bar (§4) for that client that
  week — is **excluded from the count entirely**: it neither advances nor resets the clock. This is
  the literal "pause, not reset" rule from the brief.
- **The clock is: count of consecutive qualifying weeks, since the most recent Reject event (or
  since the stage-gate began, if no Reject has ever happened), with silent weeks skipped over.**
  8 consecutive qualifying weeks with zero Reject events = clock complete for that
  `(clientId, stageGate)`.
- **A "Why?" event never appears in this calculation at all** — it isn't a decision type the clock
  formula even looks at (see §2.1's structural point: it's a different log stream).

### 3.2 Per stage-gate, re-applied fresh

"Stage-gate" is not a UI concept invented for this spec — it is the concrete transition already
named in VISION.md Gate 2: moving a client from bidding on a proxy signal ("ליד מאומת") to bidding
on real CRM-close revenue ("עסקה סגורה"). Each stage-gate is materially a different trust question
("do I trust Adam's proxy-signal calls" is not the same claim as "do I trust Adam's real-revenue
calls") — so:
- On a stage-gate transition (e.g. Gate 2 firing for a client, per the existing trigger already
  defined in VISION.md: "~30+ closed deals logged, stable revenue values"), the clock for that
  client **resets to 0/8 at the new stage-gate**, starting a fresh trust question.
- The prior stage-gate's completed (or in-progress) clock is **archived, not deleted** — visible as
  history ("proxy-signal stage: 8/8 weeks clean, completed 2026-06-14") so completed trust isn't
  erased just because the client moved on. This gives Eitan evidence, not just a reset counter that
  looks like starting over from nothing.
- Today, only one stage-gate exists in the codebase (proxy-signal, pre-Gate-2). This spec's model
  needs no new fields to support a second stage-gate later — `stageGate` is just a string key
  alongside `clientId` in the read-model query, matching how Gate 2 is already described as a toggle
  in VISION.md ("Phase toggle to the WAO account-management dashboard").

### 3.3 Display

A single, plain, non-gamified line per client, per active stage-gate — no streaks, no badges, no
color-coded "on track" language that oversells progress:

> **[Client name] — [stage-gate name]: 5 of 8 qualifying weeks clean since last correction.**
> *(2 weeks paused — no recommendations crossed the threshold.)*

That second line only appears when at least one week was actually skipped, so Eitan can see the
clock isn't silently running slower than expected without a reason shown. When a Reject happens, the
counter visibly drops to 0/8 with a one-line reference to which task caused it (linking to that
card's entry in the read-only audit trail, §1.1) — so a reset is always traceable to a specific,
reviewable decision, never a mystery drop.

---

## 4. What triggers a recommendation appearing at all — the materiality bar

**This is already partially built — this section names the existing gate explicitly and states the
general rule so future task kinds follow it, rather than each new trigger inventing its own bar.**

`buildGoogleAdsOperatorTasks()` (`operator.ts:80-228`) does not turn every digest observation into a
task — it only fires on `digest.alerts` (already threshold-gated upstream in
`buildWeeklyDigest`/`intelligence.ts`) and specific `digest.nextActions` phrase matches. Concretely,
today's materiality bars, already in the codebase or named in VISION.md:

| Lever | Materiality bar | Source |
|---|---|---|
| Budget pacing drift | >20% over/under target | VISION.md Phase 1.5 table |
| Conversions | Zero conversions in a 7-day window | VISION.md Phase 1.5 table; `alert.type === 'no_conversions'` |
| Landing/tracking health | Zero *leads* (not just conversions) in the window — a sharper signal than zero conversions | `alert.type === 'no_leads'` |
| Search-term waste | Pacing over budget → treated as a waste signal, routes to `search_term_cleanup` | `operator.ts:117` |
| CRM lead-quality / close-rate | 10 deals closed; close rate >30%; ₪50K attributed revenue; seasonality window | VISION.md Phase 3.5 "Automatic Triggers" table |

**The general rule for any future lever:** a recommendation is only generated when a lever crosses a
**predefined, numeric materiality bar** set in advance (not judged ad hoc per observation) — this is
what keeps the one-card model in §1 viable. If the bar were vague or Adam could invent a new
"noteworthy" threshold each week, the queue-depth counter (§1.1) would grow unpredictably and the
single-card model would collapse back into a triage problem. Below the bar: no card, ever — not a
lower-priority card, not a "for your information" card. Sub-threshold observations stay inside the
weekly digest (already delivered separately, per Priority 2) as passive information, never entering
the decision queue.

New task kinds (beyond the six that exist today) must ship with an explicit numeric bar defined
before the kind goes live — this is a review gate on future Adam/Dror work, not just a note for
Eitan-Dev.

---

## 5. Summary of what's newly specified vs. what already exists in code

| Piece | Status |
|---|---|
| Task generation with `whyNeeded`/`recommendedAction`/`risk` | **Exists** — `operator.ts:80-228` |
| Materiality-gated triggers (§4) | **Exists**, this doc names the rule explicitly for future kinds |
| Per-task approve → execute pipeline | **Exists** — `docs/specs/priority-1-google-ads-execution-loop.md` |
| Append-only per-client approval log | **Exists** — `approvals.jsonl`, `operator.ts:230-251` |
| **Human review gate before execution** (approval is currently hardcoded) | **New — this spec requires removing the hardcoded `status: 'approved'` in `buildApprovalRecord()` and inserting the one-card review surface before it** |
| One-card-per-decision surface, queue-depth indicator | **New** (§1) |
| "Why?" as a structurally separate, non-clock-touching action | **New** — requires a new `GoogleAdsOperatorInquiry` log type (§2.1) |
| `rejected` and `auto-approved` as explicit statuses | **New** — extends `GoogleAdsOperatorStatus` beyond today's `'proposed' | 'approved' | 'queued' | 'executed' | 'failed'` (§2.1, §2.3) |
| Per-client, per-stage-gate 2-month clock, derived read-model, pause-not-reset | **New** (§3) |
| Stage-gate archive-not-delete on transition | **New** (§3.2) |

---

## 6. Next owners

- **ux (Maya):** pixel/component design for the one-card review surface, the inline "why" thread,
  the queue-depth indicator, and the per-client/per-stage-gate clock display in §3.3. This document
  is the brief — Maya designs the look, not the logic.
- **nextjs-engineer (Eitan-Dev):** once Maya's design lands, implement: (a) remove the hardcoded
  `status: 'approved'` in `buildApprovalRecord()` and gate execution behind an explicit review step;
  (b) add `GoogleAdsOperatorInquiry` log type and its read/write functions alongside the existing
  `approvals.jsonl` pattern in `operator.ts`; (c) extend `GoogleAdsOperatorStatus` with `'rejected'`
  and `'auto-approved'`; (d) build the clock read-model as a pure function over the approval log
  (mirrors the existing `buildWeeklyDigest`-style "pure computation, thin route wrapper" convention
  from Priority 2). A full technical spec (interfaces, file list, test cases) in the style of
  Priority 1/2/3 should follow once Maya's design is ready — this document intentionally stops short
  of that so design and engineering aren't sequenced backwards.
- **Eitan (reviewer / product owner):** confirm the 72-hour low-risk auto-approve window (§2.3) and
  the specific numeric bars restated in §4 are still the right defaults before this is built —
  they're carried over from existing VISION.md/codebase values, not re-derived here, and are exactly
  the kind of number this whole spec exists to make him comfortable auditing rather than guessing at.
- **verifier (Roni):** once built, confirm at runtime that (1) a "Why?" click never changes task
  status or the clock display, (2) a Reject click visibly resets the clock and is traceable to the
  triggering card, (3) a silent week visibly pauses rather than resets the clock, (4) a stage-gate
  transition archives rather than deletes the prior clock's history.
