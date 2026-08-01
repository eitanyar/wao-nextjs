# Technical Specification — GMB Bot Scope (Month-1 Upsell, ₪149/mo)

Author: Dror/Lior (Strategist), on behalf of WAO strategy
Owner for implementation: Eitan-Dev (Next.js Engineer) — NOT YET, blocked (see §5)
Status: Spec-only — do not build against this until Site Bot MVP is confirmed closed
Model followed: VISION.md Phase 1R (GEO Bot), same execute-verify loop pattern

---

## 0. What it is

A done-for-you monthly Google Business Profile (GBP) management service, sold as the month-1
attach after Site Bot for micro-SMBs (plumbers, tutors, photographers — confirmed buyer-routing
ladder, VISION.md line 43). GBP is the highest-leverage lever this segment has: their transactional
queries trigger Local Pack, not AI Overview, so profile health directly moves the needle GEO Bot
can't touch for them yet.

## 1. The 80/20 feature set (justified, not a menu)

**In scope — the core loop:**

| Feature | Why it's in the 20% | Risk / approval posture |
|---|---|---|
| **Review-reply drafts** | Highest ROI per hour: reputation + conversion signal, and every SMB with any review volume needs this weekly. Named directly in Eitan's own Foresight doc as a lead-magnet play. | Public + permanent once posted. **Draft only, approved per-item before posting.** |
| **NAP consistency check** | Read-only diagnostic (name/address/phone match across GBP, site, directories). Zero live-write risk, cheap to automate immediately. | No approval needed — it's a report, not an action. |
| **Profile-completeness score + nudge** | Read-only diagnostic against GBP's own completeness fields (hours, categories, photos, attributes). Directly correlates with Local Pack visibility. | No approval needed — internal/client-facing nudge, not a GBP write. |
| **Post scheduling (biweekly cadence)** | Freshness signal that supports Local Pack ranking; reuses the Tamar→Noa content pattern already built for Content/GEO Bot. | Public + visible immediately. **Draft only, approved per-item before posting.** |

**Explicitly deferred (not in v1):**
- **Q&A auto-response** — dropped, not deferred-to-v2-and-forgotten: GBP Q&A has low query volume
  for most micro-SMBs, and a wrong public answer is far harder to walk back than a bad review reply.
  Low expected hours-saved per client, disproportionate reputational risk. Revisit only if a client
  segment shows real Q&A traffic.

**Rule of thumb enforced by this split:** anything that is a *live public write* to the profile
(review reply, post) requires per-item human approval before it ships. Anything that is *read-only
diagnostic* (NAP check, completeness score) can run and report fully automated from day one — no
approval bottleneck on the parts of the loop that carry zero irreversibility risk.

## 2. Delivery model: WoZ-first (mandatory, not optional)

Consistent with WAO's stated pattern (GEO Bot Phase 1R): **WoZ for the first cohort, not direct
automation**, for one reason specific to GBP that doesn't apply to GEO Bot's action-page pattern —
GBP writes are irreversible-in-practice and public the instant they post (a bad review reply can't
be un-said; GEO Bot's content additions live on the client's own site and can be quietly edited).

**Approval mechanism (reuse, don't rebuild):** Same WhatsApp-deep-link + client-facing action-page
pattern already built for GEO Bot (`/geo/action/[actionId]`). For GMB Bot: each pending review
reply or post draft gets its own action-page card — client sees the exact text, approves or edits,
then WAO (WoZ stage) posts it live via the GBP API and logs the confirmation. **No bulk-approve** —
each GBP write item is approved individually, given the higher stakes than a Site Bot copy edit.

## 3. Phase 1.5 Proactive Management Loop — how this spec satisfies it

This closes the same gap VISION.md flags for Ads Bot: *"selling month 2 you can't service."*
GMB Bot's month-1 pricing means the loop has to be live from day one of that client relationship,
not bolted on later.

**Cadence: weekly (Monday), mirroring the existing GEO Bot dashboard pull pattern.**

| Step | What happens | Who/what runs it (WoZ stage) |
|---|---|---|
| Monday pull | New reviews since last cycle, NAP scan re-run, completeness score recalculated | WAO staff, manual script run (`/gmb/dashboard`, analogous to `/geo/dashboard`) |
| Draft generation | Review replies + (biweekly) post draft generated via Tamar→Noa pipeline | Tamar→Noa, reused pipeline |
| Client digest | WhatsApp message: "X new reviews, here are the replies — approve or edit" | WAO staff sends, same wa.me deep-link pattern as GEO Bot |
| Approval | Client approves/edits per item on action page | Client, self-serve |
| Post live | WAO posts approved item to GBP via API, confirms it landed | WAO staff (WoZ) — automation candidate once volume justifies it |
| Log | Immutable record of every review reply/post text, approval timestamp, live-post confirmation | Append-only log, same pattern as GEO Bot's `log.jsonl` |

**Gate this satisfies:** per VISION.md Phase 1.5, this loop must be proven working for real pilot
clients before it can be sold at scale — WoZ-first here is exactly how that gets proven cheaply
before any automation investment is justified.

## 4. Data model (scope-level, not implementation — for Eitan-Dev when unblocked)

Per client, needs to persist:
- GBP location ID + connection status (OAuth granted, scopes confirmed live)
- Scopes actually granted (reviews read/reply, posts write, location-data read — confirm which the
  new API access covers before assuming full write access is live)
- Loop cadence config (weekly pull day, biweekly post cadence)
- Pending-approval queue: item type (review-reply / post), draft text, source review/post ID,
  status (pending / approved-edited / approved-as-is / posted / rejected), timestamps
- NAP consistency scan results: source checked, field, discrepancy found (yes/no), last-scan date
- Profile-completeness score: current score, score history (to show trend to client)
- Immutable approval + post-confirmation log (mirrors `data/geo-logs/{clientId}/log.jsonl` shape —
  new directory, e.g. `data/gmb-logs/{clientId}/log.jsonl`, don't overload the GEO-specific one)

## 5. Dependencies / prerequisites before this moves to PROCEED

- **Site Bot MVP confirmed stable + live-payment-capable** — GMB Bot is the month-1 upsell *after*
  Site Bot; there is no funnel to sell it into until that's closed. This is the hard blocker.
- **GBP API access smoke test** — access was "just granted" per Eitan's note; before committing to
  the scope above as buildable, confirm with one real API call which of {read reviews, write reply,
  read Q&A, write posts, read location data} actually work under the granted scope. Don't assume.
- **WhatsApp action-page pattern generalization** — confirm the GEO Bot action-page component can
  be parameterized for a second bot (item type = review-reply/post vs. content-action) rather than
  forked, to avoid duplicating a UI Eitan-Dev already built once.
- **Immutable log pattern generalization** — same ask, one level down: confirm `log.jsonl` structure
  generalizes to GMB Bot's item types rather than needing a bespoke schema.

## Decision: shared multi-bot dashboard/action-page (resolved 2026-07-24, Lior)

GMB Bot's WoZ dashboard and action-page will be built as the first case against a **shared
multi-bot dashboard/action-page** (one component, `botType`/`itemType` param) — not as standalone
`/gmb/dashboard` and `/gmb/action/[id]` routes.

**Why:** This isn't premature abstraction — it's the second real implementation of an
already-shipped pattern (`/geo/dashboard`, `/geo/action/[actionId]`), and VISION.md already
roadmaps a third and fourth home for it (Content Bot's Tamar→Noa pipeline, GEO Bot v2). Forking
now guarantees a larger refactor later once real client data sits on top of GMB-specific routes.
Since this spec is pre-code and GMB Bot is still blocked on Site Bot MVP closing (§5), there is no
urgency cost to paying the generalization cost now, at the cheapest possible point.

**What this means for implementation (when unblocked):** Eitan-Dev's first task is a short design
pass on the existing GEO Bot dashboard/action-page components to confirm what generalizes cleanly
on a `botType` param (item card rendering, approval state machine, `log.jsonl` schema) versus what
needs a thin per-bot adapter (e.g., review-reply vs. content-action have different draft-text
shapes and source-ID references). Build the shared component with GMB Bot's item types (§4 data
model above) as the second real case driving the generalization — not a hypothetical third bot.
