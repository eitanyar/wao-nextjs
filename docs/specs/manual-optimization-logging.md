# Manual Optimization Logging — Spec

Author: Dror (PPC Strategist), routed via Adam
Date: 2026-08-04
Status: Spec only — no implementation. For nextjs-engineer (Eitan-Dev) to build once Eitan confirms
the shape below.
Scope: **Narrow.** This spec covers capturing manual changes Eitan (or a future team member) makes
directly in the Google Ads console — outside the operator's own propose/approve flow. It does
**not** design outcome measurement, does **not** design any scoring-adjustment mechanism, and does
**not** touch `operator.ts`, `cpl-ceiling.ts`, `search-term-scoring.ts`, or any other implementation
file. See §4 for why that's deliberate, not an oversight.

---

## 0. The gap this closes

`GoogleAdsOperatorApproval` (`src/lib/google-ads/operator.ts:97`) logs every decision made *through*
the operator's own review UI (`/admin/review/[clientId]`) — task proposed, approved/rejected,
executed, with `correctionNote` on rejections. That log is complete for its own domain.

It captures **nothing** about changes made by hand, directly in the Google Ads console, outside this
app: rewriting ad copy, nudging a bid, adjusting an audience, pausing a keyword Eitan noticed was
underperforming. Today those changes leave no trace anywhere in WAO's systems — not the change
itself, and critically, not the *reasoning* behind it at the time it was made. That reasoning is the
valuable part and it decays fastest; a week later even Eitan may not reconstruct why he paused a
specific keyword. This spec defines a lightweight capture mechanism for that raw material.

**Explicitly not in scope:** the *other* gap named in the task brief — that even approved/executed
operator tasks have no downstream outcome measurement feeding back into scoring — is a separate,
larger initiative. See §4.

---

## 1. What gets captured

One record per manual change. Fields, all required unless marked optional:

| Field | Type | Notes |
|---|---|---|
| `entryId` | string | Generated (e.g. `manual-<timestamp>-<slug>`), mirrors `taskId` convention. |
| `clientId` | string | `retter` \| `aasada` (or future clients) — same values used throughout `google-ads/`. |
| `changedBy` | string | Who made the change. Free-text identifier, not hardcoded to Eitan — see §1.1. |
| `changedAt` | ISO 8601 string | When the change was made in the Ads console (may predate `loggedAt` if backfilled). |
| `loggedAt` | ISO 8601 string | When this record was written — auto-set, not user-entered. |
| `scope` | object | `{ campaign?: string; adGroup?: string; keyword?: string; assetOrAd?: string }` — whatever level the change touched. All optional; at minimum one should be filled, but the form does not hard-require a specific one (a campaign-level budget change has no ad-group). |
| `changeType` | enum | `'bid' \| 'copy' \| 'audience' \| 'negative_keyword' \| 'pause' \| 'budget' \| 'targeting' \| 'other'` — coarse, matches the operator's own `kind` granularity rather than console-menu granularity. |
| `whatChanged` | string | Short structured description of the mechanical diff — e.g. "raised tCPA target ₪45 → ₪55 on 'ברנד' campaign". One or two sentences, not a full changelog. |
| `whyNeeded` | string | **The reasoning at the time.** Why this, why now. Mirrors the operator's own `whyNeeded` field name deliberately — same conceptual slot, different source. This is the field the whole spec exists to protect; see §1.2 on making it easy to fill honestly. |
| `relatedTaskId` | string, optional | If this manual change was made *instead of* or *in reaction to* an open/rejected operator task, link it here. Lets a future reviewer see "operator proposed X, Eitan did Y by hand instead" side by side. Optional because most manual changes won't have a corresponding task. |
| `tags` | string[], optional | Free-form, e.g. `["seasonal", "competitor-response"]` — no controlled vocabulary yet; don't over-engineer taxonomy before there's enough data to know what categories matter. |

### 1.1 Who — don't hardcode Eitan

`changedBy` is a plain string field, not an enum or a session-derived constant. Today it will always
be typed as `"eitan"` or similar, but nothing in the data shape assumes a single actor. This matters
because WAO's plan (per `AGENTS.md`, multiple specialist profiles) already anticipates more people
touching client accounts — a future paid-media hire, a contractor, even Dror's own future
console-execution scope if that ever expands beyond strategy. No schema migration needed when that
happens.

### 1.2 Lightweight capture — the actual design constraint

The brief is explicit: if this creates friction, Eitan skips it, and the log is worthless by
omission (survivorship-biased toward only the changes he remembered to log, probably the boring
ones). Two capture paths, both writing the same record shape:

1. **A short form**, reachable from the existing `/admin/review/[clientId]` surface (same
   authenticated area the operator review already lives in) — not a new top-level admin section.
   Five fields visible by default: client (pre-filled from the current page context), what changed
   (free text), why (free text), change type (a dropdown, defaults to `'other'` so it's never a
   blocker), scope (free text, single field — campaign/ad-group/keyword as one line, not three
   separate inputs). `relatedTaskId` and `tags` are collapsed behind an "add detail" toggle, not
   shown by default. Total time to log: under 30 seconds for the common case.
2. **A CLI/API call** for Eitan's own workflow if he prefers not to leave the terminal —
   `POST /api/google-ads/manual-log` (see §2) with a minimal JSON body, or a one-line CLI wrapper
   script (`scripts/log-manual-change.mjs` — naming only, not building it here) that prompts for the
   same fields interactively. This is the more likely actual path given his existing pattern of
   working from `deploy.sh` / terminal rather than admin UI when possible.

Neither path enforces `whyNeeded` beyond "non-empty" — no character minimum, no rich-text
requirement. The bar is "one honest sentence," not a report. If Eitan is mid-task in the Ads console
and wants to log something in under 15 seconds, the CLI path with a single `--why` flag should be
enough; the web form exists for when he's already in the browser.

---

## 2. Where it lives

**A separate log stream from `approvals.jsonl`, and separate from `inquiries.jsonl`.** Same
precedent already established in this codebase: `GoogleAdsOperatorInquiry`
(`src/lib/google-ads/operator.ts:128`) is kept in its own `inquiries.jsonl` file specifically so
nothing in the decision/trust-clock read-model can accidentally treat a "Why?" turn as a decision by
scanning the wrong file (`src/lib/google-ads/operator.ts:147-154`). The same reasoning applies here,
more strongly: a manual-change note is not a decision *record* in the approval-audit sense at all —
it never went through propose/approve, it has no `status`, no `risk`, no trust-clock relevance. It
must not be queryable in any code path that computes the trust clock or approval rate, even
accidentally.

**Proposed path**, following the existing `data/clients/<clientId>/...` convention
(`src/lib/google-ads/cpl-ceiling.ts:147` uses the same pattern for brand-baseline storage):

```
data/clients/<clientId>/tasks/google-ads/manual-changes.jsonl
```

Same directory as `approvals.jsonl` and `inquiries.jsonl` (`taskDir()` in `operator.ts:139-141`
already resolves this path) — co-located because it's the same domain and the same per-client
storage convention, but a **distinct file**, append-only JSONL, one record per line, matching the
existing two logs' format exactly (easy to `cat`/`grep`/`jq` across all three when reviewing a
client by hand — see §3).

**Read access:** a `readManualOptimizationLog(clientId, opts?)` function (naming only — not
implementing) would live alongside `readGoogleAdsOperatorInquiries` in `operator.ts` or, arguably
better, in its own small module (`src/lib/google-ads/manual-log.ts`) precisely so it's obvious at a
glance that this file's exports never touch `DECISION_STATUSES` or `CLOCK_QUALIFYING_STATUSES`. That
module-boundary choice is a build-time decision for Eitan-Dev; flagging it here only so the
separation is deliberate, not incidental.

**Write access:** `POST /api/google-ads/manual-log`, structurally mirroring
`/api/google-ads/operator-task/inquiry/route.ts` — same auth pattern (session cookie,
`hasOperatorAccess` check against the client record), same "append one record, return it" shape, no
mutation of any other file.

---

## 3. What this actually buys Eitan, right now — and what it doesn't

Concretely, today, this log is:

- **A searchable memory aid.** When Eitan or Dror is later deciding "should the operator's rubric
  auto-flag this kind of situation," they can `grep`/review `manual-changes.jsonl` across a client's
  history and see the pattern of manual interventions and their stated reasons — instead of relying
  on memory or reconstructing it from the Ads console's own (much coarser, UI-buried) change history.
- **A side-by-side with operator behavior**, via `relatedTaskId` — a manual record of "the operator
  proposed X, I did Y instead, because Z" is exactly the kind of case Dror would want in hand when
  next revising `cpl-ceiling.ts` thresholds or `search-term-scoring.ts` logic.
- **An audit trail for account changes generally** — useful on its own even setting aside the
  operator: if ad performance shifts, "what changed and why, across both the automated and manual
  paths" becomes one queryable history instead of two disconnected ones (one logged, one invisible).

What it explicitly is **not**, today:

- It does **not** feed any scoring, threshold, or rubric automatically. Nothing reads this file at
  task-generation time. `buildGoogleAdsOperatorTasks()` is unaffected by anything written here.
- It does **not** "teach" the operator in any sense. There is no learning loop attached to this log.
  Every use of it is manual review by a human (Eitan or Dror), at least for now.
- It is not a substitute for outcome measurement — see §4.

---

## 4. The real limitation — read this before assuming this solves more than it does

This spec captures **raw material only**: what changed and why, at the moment of the change. It does
not, and cannot on its own, tell anyone whether a given manual change *worked* — whether CPL improved,
lead volume moved, quality held. Attaching measured outcomes to decisions (manual or operator-driven)
and using that history to adjust future scoring is a **distinct, larger, and currently unbuilt
initiative** — the same one named as explicitly out of scope in this task's brief for the *operator's
own* approval log, and the gap is structurally identical here.

Closing that loop, for either log, would require at minimum:

1. **An outcome-measurement mechanism** — something that, on a schedule, looks at CPL/lead-volume/
   conversion-value deltas attributable to a specific change (manual or operator-executed) over a
   defined post-change window, and attaches that measurement back to the originating record
   (`entryId` here, `taskId` in `approvals.jsonl`). This does not exist today in either log.
2. **A scoring model that consumes history** — something that reads accumulated outcome-tagged
   records (from both logs) and adjusts `cpl-ceiling.ts` thresholds, `search-term-scoring.ts` logic,
   or task-materiality gating in `operator.ts` based on what has empirically worked. Today all of
   that logic is fixed and rule-based, unaffected by any log's contents.

Neither of those is designed here. If Eitan wants that closed, it needs its own separate spec and
almost certainly its own separate mission — it touches measurement (GA4/Ads conversion data),
scoring-model design, and probably a review cadence for when/how thresholds get revised, none of
which this document should smuggle in "while in the neighborhood." This spec's job ends at making
sure the raw material — what happened and why — stops disappearing.
