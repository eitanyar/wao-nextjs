# Technical Specification — The Readiness Gate

Author: Dror (PPC Strategist), on behalf of WAO strategy
Owner for implementation: Eitan-Dev (Next.js Engineer)
Client-facing copy owner: Tamar (Copywriter) → Noa (Language QA) — placeholders only below, see §8
Verification owner: Roni (Verifier)
Status: Ready for implementation — spec-only, code not started
Origin: `STATUS.md` "Scored & gated feature backlog — 2026-08-07 (Lior)" — top synthesized idea from
the three-bot brainstorm. **Eitan's call, 2026-08-07: full near-term build, parallel to active pilot
outreach** (the one exception to the "Now stays protected" window).
Depends on: `scripts/gbp-comparison-report.mjs` (Places API (New) client — light refactor required,
see §4), `docs/specs/pilot-client-gating.md` (Ads Bot admission scorecard — reused unchanged, see
§1), `docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md` (source of the
contact-mechanism audit pattern and the four defect classes this spec's Phase 2 generalizes, see
§5), `docs/specs/priority-5-live-readiness-consent-ui.md` (UI/data-persistence pattern this spec's
admin surface mirrors, see §6 — a **different, later-stage gate**, not reused as logic).
Related: `VISION.md` "Buyer routing" (line 42) and Decision Framework (line 446); `docs/specs/
grade-a-outreach-playbook.md` §2 (the free GBP magnet this spec wraps, not duplicates).

---

## 0. Problem statement

Two things are currently ad hoc that this spec turns into one systematic, code-backed artifact:

**(a) Bot routing is a human judgment call, re-derived from memory each time.** VISION.md already
*decided* the buyer-routing rules (micro-SMB → Site Bot ladder; content-ready SMB → GEO Bot direct;
page-count thresholds named explicitly). Today, applying those rules to a specific prospect is
something Lior or Eitan does by re-reading VISION.md and eyeballing the prospect. Nothing encodes
the decision tree as a checkable function, and nothing packages the output as something handable to
a prospect.

**(b) "No client onboarded without provable lead-tracking" is a standing principle, not a gate.**
Per `STATUS.md`'s "Steering question for Lior": Eitan's rule — *"no client should be onboarded
before basic lead tracking + grading works, even in Wizard-of-Oz form — every contact channel must
produce a gradeable trace, no silent losses"* — caught four real, otherwise-invisible defects in one
afternoon (documented in `docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md`:
the offline-conversion cookie-forwarding bug that silently 401'd every upload; the fully
unauthenticated `GET /api/leads` cross-client data leak; the June 15, 2026 Google Ads API cutoff
that quietly broke the offline-conversion upload pathway; and the class of intake/idempotency bugs
Part A's `sendBeacon`/upsert-by-`orderId` work was built to close). That audit lens was applied once,
by a human, under time pressure. This spec turns it into a checklist that runs the same way every
time, for every client, before every bot activation.

**This spec is two phases, not one artifact:**

| Phase | When | Audience | Question it answers |
|---|---|---|---|
| **Phase 1 — Routing Score** | Pre-sale, at first contact (pairs with the GBP magnet) | Presentable to the prospect | "Which bot should we pitch this business, and is Ads Bot even viable for them?" |
| **Phase 2 — Onboarding Gate** | Post-agreement, before the bot is provisioned/billed | Internal only (WAO staff) | "Is this specific client's lead-tracking actually provable yet — go or no-go?" |

They share one data file per client/prospect (§7) but are genuinely different mechanisms answering
different questions at different funnel moments — do not collapse them into a single score.

---

## 1. Relationship to existing specs (read this before building anything)

**Extends, wraps, or is separate — stated explicitly per dependency, per the brief's ask:**

- **`docs/specs/pilot-client-gating.md` (Ads Bot admission, the 8-signal scorecard) — reused
  unchanged, not duplicated, not extended.** Readiness Gate's Ads-fit axis (§3.4) *is* that
  scorecard, called as-is. Pilot-client-gating never covers Site Bot or GEO Bot at all (it assumes
  an Ads-shaped prospect already) — that's the actual gap Phase 1 closes. Do not re-implement any of
  the 8 signals here; import the admission thresholds (`≥12/16 no hard-fail → pilot`, `9-11 →
  conditional`, `<9 → decline or Site Bot only`) as constants.
- **`docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md` — Phase 2 (the LTPC,
  §5) generalizes its §0.2 contact-mechanism audit table and Part A/B fixes into a repeatable,
  per-client checklist.** It is a hard **build dependency**, not just a conceptual one: LTPC items
  1–3 (§5.2) cannot pass for *any* client until Priority 3's Gate-minimum tier (its own §6.6) has
  shipped at the codebase level, because the mechanisms being checked (sendBeacon reliability,
  `isLeadOwnedByClient`, `/api/client/leads`) don't exist until then. If Priority 3's Gate-minimum
  is still unshipped when this spec is built, Phase 2 ships as a checklist that will legitimately
  fail every item until that dependency lands — that is correct behavior, not a bug in this spec.
- **`docs/specs/priority-5-live-readiness-consent-ui.md` — a separate, later-stage, Ads-only gate.
  Not reused as logic, but its UI/persistence *pattern* is mirrored exactly for Phase 2's admin
  surface (§6).** `live-readiness.js`'s six attestations (account ownership, billing, MCC invite,
  approval contact, live consent, audit log) answer *"can this client's Ads account spend real
  money?"* — a narrower, Ads-specific, post-admission question. The Readiness Gate's Phase 2 answers
  a broader, upstream, bot-agnostic question — *"does any contact channel for this client produce a
  gradeable trace at all?"* — that applies even to Site Bot, which has no ad spend and no
  `live-readiness.json` concept. **A client can pass the LTPC and still be blocked by
  `live-readiness.js` before spending a shekel; the two gates are independent and both must pass for
  an Ads Bot client to go live.** Do not merge the two data files or the two admin screens.
- **`scripts/gbp-comparison-report.mjs` — consumed via a shared, refactored module, not shelled out
  to and not left untouched.** See §4 for exactly what changes and why "wrap it" and "leave it
  alone" are both wrong answers here.

---

## 2. Phase 1 — Routing Score

### 2.1 Inputs

| Input | Source | Notes |
|---|---|---|
| `businessName`, `city`, `category` | Given (outreach context) | Same three args `gbp-comparison-report.mjs` already requires |
| `siteUrl` (optional) | Given — human-supplied or found via a normal Google search during outreach prep | **Do not** attempt to auto-discover this via Places API's `websiteUri` field — web-verified 2026-08-07 against Places API (New) docs: `websiteUri` sits behind the Place Details **Enterprise SKU** (premium billing tier), a real recurring cost for a signal WAO's own outreach process already has for free. Site URL stays a human/CLI-supplied input. |
| `placeId` (optional) | Given, skips the GBP resolve search | Same as the existing script's `--place-id` flag |

### 2.2 Signal 1 — GBP fields (reused from the magnet, not re-fetched independently)

Exactly the three fields already approved and shipped in `grade-a-outreach-playbook.md` §2: rating,
total review count, recent-review-pace proxy (≤5-review sample, labeled as an estimate). Sourced
from the same Places API (New) Text Search + Place Details calls already live in
`gbp-comparison-report.mjs` (field mask: `id,displayName,rating,userRatingCount,reviews,
formattedAddress`) — confirmed 2026-08-07 against current Places API (New) docs, no field-set or
pricing-tier changes since the 2026-08-03 sign-off. **Do not** add `businessStatus`, `types`,
`primaryType`, or any other field beyond what's already approved without a fresh sign-off — same
discipline the magnet spec already enforced (review-response-rate excluded, must never be added).

### 2.3 Signal 2 — Site page count (new, not in the GBP magnet)

**Source: a direct crawl of the known `siteUrl`, never GSC.** Web-verified 2026-08-07: the Search
Console API requires OAuth from a *verified owner* of the property — Google's own docs are explicit
that an app cannot pull Search Console data for a property it doesn't have an authorized, verified
relationship to. WAO has no such relationship with a prospect pre-onboarding. This is a hard
constraint, not a build shortcut: **"existing GSC data," the third VISION.md criterion for the
content-ready-SMB archetype, cannot be checked at Phase 1 at all.** It is deliberately marked
`unknown-pre-onboarding` (§2.6) and only resolved once the client goes through the GSC OAuth step
that's already part of WAO's standard onboarding (`VISION.md` "Infrastructure Model").

Method, in priority order:
1. Fetch `{siteUrl}/sitemap.xml` (and, if it's a sitemap index, resolve one level of child sitemaps)
   → count `<url>` entries. This is the primary, cheap, reliable method for any competently-built
   site (including every prior Site Bot build — Next.js static export sitemaps are trivial to
   generate and already standard practice).
2. If no sitemap is found: a shallow, same-domain, breadth-first crawl from the homepage, depth ≤ 2,
   capped at a fixed page count (recommend 50 — enough to distinguish "under 15," "15–29," and "30+"
   without needing to be exact above that), respecting `robots.txt`. No JS rendering / no headless
   browser — a plain HTML `fetch` + link-extraction, matching this project's "no queue, no infra"
   proportionality convention (same posture priority-3 §1.1 states for its own scope).
3. If both fail (no site, or the crawl is blocked/times out) → `siteFound: false` /
   `pageCount: null`. This is itself a routing signal (§2.5, rule 1), not an error state.

### 2.4 Signal 3 — Vertical archetype classification

A static lookup, not a new judgment call — directly from VISION.md's already-named lists:
- **micro-SMB**: plumber, tutor, photographer, electrician, locksmith, AC-repair, mechanic/auto-repair
  (also the Grade-A archetypes in `grade-a-outreach-playbook.md` §0)
- **content-ready-SMB**: accountant, coach, clinic/physiotherapist/dentist/aesthetic-doctor, lawyer,
  architect

**Note for Eitan-Dev:** a *different* vertical taxonomy already exists in `src/app/api/bot/route.ts`
(the buyer-intent budget clusters from the 2026-08-07 cluster-precision audit —
`homeImprovement`/`autoServices`/`academicTutoring`/`fitnessTraining`/`businessProfessionalSvc`/
`creativeVisualSvc`). That table exists for CPC/budget estimation, not Site-vs-GEO routing — do
**not** repurpose it as the archetype classifier (its buckets don't map 1:1 onto
micro-SMB/content-ready-SMB), but do keep the Hebrew category *label strings* consistent between the
two tables where the same vertical appears in both, so the same prospect doesn't get two different
category spellings depending on which script touched them. A category string constants file shared
by both is a reasonable small refactor if this starts drifting — flagged, not mandated, for this
pass.

### 2.5 Routing decision tree

Applied literally from VISION.md's decided rules — this function is a translation of existing
prose into a checkable tree, not a new strategic decision:

1. **No site found** (`siteFound: false`) → `primaryBotRoute: 'site-bot'` (Site Bot's whole premise
   is starting from zero — this is the expected, common case for a solo tradesman).
2. **Site exists, `pageCount < 15`** → `primaryBotRoute: 'site-bot'`. Rationale string must cite
   VISION.md's explicit rule verbatim in the internal (non-client-facing) trace: *"GEO Bot is NOT
   the month-3 attach for 5-page Site Bot buyers — a 5-page site has no surface for GEO Bot to work
   on."*
3. **Site exists, `15 ≤ pageCount < 30`, archetype = micro-SMB** → `primaryBotRoute: 'site-bot'`
   (their site is Site Bot's, still growing), **`secondaryUpsell: 'gmb-bot'`** per VISION's month-1
   ladder rung, with a `nearGeoThreshold: true` flag once `pageCount ≥ 15` specifically because
   VISION names 15 pages as the unlock threshold **for an existing Site Bot client's later GEO
   attach** — a genuinely different number from rule 5's 30-page bar, and deliberately so (see the
   callout in §2.5.1 below; do not silently unify the two numbers).
4. **Site exists, `pageCount < 30`, archetype = content-ready-SMB** (e.g. a new clinic with a thin
   site) → `primaryBotRoute: 'geo-bot'` still, per VISION's archetype-first rule, but flagged
   `thinContentWarning: true` — a heads-up for Lior/Eitan that the Pareto engine will have less to
   work with initially, not a reroute VISION never specified.
5. **Site exists, `pageCount ≥ 30`, archetype = content-ready-SMB** → `primaryBotRoute: 'geo-bot'`,
   `gscDataStatus: 'unknown-pre-onboarding'` (§2.6).
6. **Site exists, `pageCount ≥ 30`, archetype = micro-SMB** — an edge case VISION never named (a
   micro-SMB with an unusually content-heavy site). Do **not** force a rule that doesn't exist:
   output `primaryBotRoute: 'site-bot'` (the safe default, matches their archetype) with
   `flagForHumanReview: true` and the reason spelled out. This is the one case in the tree where the
   function should defer rather than guess.

**Ads Bot fit is a fully orthogonal axis (§3.4)** — evaluated independently and attached to the same
result object, since a prospect can be simultaneously Site-Bot-routed *and* Ads-Bot-ready (this is
literally the current outreach lane: Grade-A archetypes are micro-SMB by content shape and the
active Ads pilot target by demand/budget economics at the same time).

#### 2.5.1 Why two different page-count thresholds exist, named explicitly to prevent conflation

| Population | Threshold | What it decides | Source |
|---|---|---|---|
| Content-ready-SMB, scored fresh (rule 5) | **≥30 pages** | Direct-to-GEO-Bot routing at first contact | VISION.md line 44: "30+ pages give the pipeline real leverage" |
| Micro-SMB, already a Site Bot client, later re-scored for upsell (rule 3) | **≥15 pages** | GEO Bot unlocks as the *next* rung on their ladder | VISION.md line 43: "GEO Bot once ≥15 pages exist" |

These are not the same number measuring the same thing with different rounding — they're two
different populations at two different funnel moments. A future maintainer collapsing them into one
`GEO_PAGE_THRESHOLD` constant would silently break rule 3 or rule 5. Keep them as two named
constants (`GEO_DIRECT_ROUTE_MIN_PAGES = 30`, `GEO_UPSELL_UNLOCK_MIN_PAGES = 15`).

### 2.6 `gscDataStatus` field

Always `'unknown-pre-onboarding'` at Phase 1 — never guessed, never inferred from page count or
domain age. Set to `'confirmed-thin'` or `'confirmed-sufficient'` only once GSC OAuth is granted
during actual onboarding (out of scope for this spec to implement that reconciliation step itself —
flagged as a Phase 2/onboarding follow-up in §9, not built here).

### 2.7 Output shape and the presentable artifact

The script's stdout output is the free lead-magnet deliverable — the existing GBP comparison block
**plus** one short "what's next" line derived from `routing.primaryBotRoute` /
`routing.secondaryUpsell`. **The exact Hebrew phrasing for each of the ~5 routing outcomes (site-bot,
site-bot+gmb-upsell, geo-bot, geo-bot+thin-content-flag, not-ready) is Tamar's to write and Noa's to
QA — this spec supplies only the routing *logic* that selects which template fires, not the copy
itself.** Placeholder markers only, e.g. `{{ROUTING_LINE_SITE_BOT}}` — do not ship with Dror-authored
Hebrew in the template slots.

---

## 3. Data model — Phase 1

```ts
interface ReadinessGateInput {
  businessName: string;
  city: string;
  category: string;       // Hebrew vertical label
  siteUrl?: string;        // human-supplied, never auto-discovered via Places websiteUri
  placeId?: string;
}

interface GbpSignals {
  rating: number | null;
  reviewCount: number;
  recentPace: { d30: number; d60: number; d90: number };
  sampleSize: number;      // ≤5, per Places API's hard cap — always surfaced, never hidden
}

interface SiteCrawlResult {
  siteFound: boolean;
  pageCount: number | null;
  method: 'sitemap' | 'shallow-crawl' | 'none';
  sitemapUrl?: string;
}

interface VerticalClassification {
  archetype: 'micro-smb' | 'content-ready-smb' | 'unclassified';
  gradeTier?: 'grade-a' | 'grade-b' | 'grade-c'; // from grade-a-outreach-playbook.md §0, optional
}

interface RoutingDecision {
  primaryBotRoute: 'site-bot' | 'geo-bot';
  secondaryUpsell?: 'gmb-bot';
  nearGeoThreshold?: boolean;       // rule 3
  thinContentWarning?: boolean;     // rule 4
  flagForHumanReview?: boolean;     // rule 6
  gscDataStatus: 'unknown-pre-onboarding' | 'confirmed-thin' | 'confirmed-sufficient';
  adsBotReady: boolean;             // derived from AdsFitResult below
  adsFit: AdsFitResult;
  ruleFired: string;                // e.g. "rule-2-thin-site" — internal audit trace, never client-facing
}

interface AdsFitResult {
  // Delegates to pilot-client-gating.md's 8-signal scorecard — see §3.4 for which
  // signals are automatable vs. require a human answer. Not recomputed here.
  totalScore: number;               // 0-16
  hardFail: boolean;
  admission: 'pilot' | 'conditional' | 'decline-or-site-only';
  weakestSignal?: string;
  signalsSource: 'automated' | 'partial-manual' | 'not-yet-scored';
}

interface ReadinessGateResult {
  input: ReadinessGateInput;
  gbp: GbpSignals;
  siteCrawl: SiteCrawlResult;
  vertical: VerticalClassification;
  routing: RoutingDecision;
  generatedAt: string;              // ISO 8601
  presentableReportText: string;    // Hebrew, RTL-safe, WhatsApp-ready — GBP block + routing line
}
```

### 3.4 Ads-fit signal automation — what's real vs. what needs a human, stated plainly

Pilot-client-gating.md's 8 signals are not uniformly automatable. Do not let the existence of this
spec's JSON shape imply `AdsFitResult` is a pure function of API calls — it isn't, and pretending
otherwise would silently reintroduce the "looks real, checks nothing" failure mode priority-5 §1.3
explicitly named and rejected for `liveConsentRecorded`.

| # | Signal | Automatable in v1? | How |
|---|---|---|---|
| 1 | Demand exists (search volume) | Partial | Keyword Planner if available, else the band table already in `pilot-client-gating.md` — same manual/CLI process as today, not newly automated here |
| 2 | Unit economics (CPA vs. job value) | No | Job/client value is only known from the conversation with the prospect — human-entered |
| 3 | Budget floor (CPC-relative) | Partial | Same as #1 — band table or live check, same manual process |
| 4 | Reputation floor (GMB rating/reviews) | **Yes** | Direct from §2.2's GBP signals, already fetched |
| 5 | Capacity to absorb leads | No | Human judgment from the conversation — hard-fail signal, must be asked directly |
| 6 | Auction sanity (SERP check) | No | Manual SERP look, per the existing spec's own "no live API needed" design |
| 7 | Defined service radius | No | Usually known/asked directly |
| 8 | AI-resistance tier | **Yes** | Static lookup by vertical (same table as §2.4's archetype, one level more granular) |

**v1 posture:** `readiness-gate.mjs` auto-populates signals 4 and 8, and 1/3 from the band table if a
live Keyword Planner check isn't run. It does **not** silently default signals 2/5/6/7 — it prompts
for and stores them as explicit CLI inputs (or leaves them `null` and marks
`signalsSource: 'partial-manual'` / `'not-yet-scored'` until Eitan/Lior fills them in after the
qualifying conversation). A `totalScore` computed from a partially-null signal set must never render
as if it were a complete score — surface `signalsSource` wherever `totalScore` is shown.

---

## 4. Integration with the GBP magnet script — the exact answer to "wrapper vs. separate"

**Neither a bare wrapper nor a fully separate reimplementation. A new sibling script that imports a
shared, refactored client module — a small one-time extraction, not a rewrite.**

Why not "just wrap `gbp-comparison-report.mjs`, shell out, parse stdout": that script's `main()` is
a top-level, non-exported function that renders a *human-readable Hebrew text block* directly to
stdout — there is no structured (JSON) return value to consume, and parsing that Hebrew text back
into `GbpSignals` would be fragile and duplicate work the script already does internally with clean
data (`formatEntry()` already builds exactly the object shape needed, right before it's rendered to
a string).

Why not "just reimplement the Places API calls independently in the new script": that recreates the
exact "second copy of the same API client" antipattern this codebase has already flagged and
rejected multiple times (`priority-2-weekly-proactive-loop.md` §2.2: *"do not write a third copy of
that regex"*; `priority-3-...md` §2.1: extracting `leadsStore.ts` specifically so three routes don't
each reimplement `readLeads()`/`writeLeads()`).

**Required refactor (Eitan-Dev, small, do first):**
1. Extract `textSearch()`, `placeDetails()`, `recentPace()`, and a renamed `buildEntrySignals()`
   (currently `formatEntry()`, minus its client-name-label concern — return just `{ rating,
   reviewCount, recentPace, sampleSize }`, i.e. `GbpSignals` shape) from
   `scripts/gbp-comparison-report.mjs` into a new `scripts/lib/places-client.mjs`.
2. `gbp-comparison-report.mjs` imports from that module instead of defining its own copies — zero
   behavior change to its existing output, confirmed by running it once before/after and diffing
   stdout for a known fixture business.
3. `scripts/readiness-gate.mjs` (NEW) imports the same module, adds its own new logic (site crawl
   §2.3, vertical lookup §2.4, routing tree §2.5, Ads-fit signal merge §3.4), and produces both the
   structured `ReadinessGateResult` JSON (§3, §7) and the combined presentable text block (§2.7).

**CLI shape**, mirroring the existing script's argument style:
```
node scripts/readiness-gate.mjs --name="..." --city="..." --category="..." --site="https://..." \
  [--place-id=...] [--out=path/to/report.txt] [--json-out=path/to/result.json]
```

---

## 5. Phase 2 — Onboarding Gate: the Lead-Tracking Provability Checklist (LTPC)

### 5.1 Purpose and enforcement posture

This is the literal, per-brief "specific enough for Eitan-Dev to implement as a go/no-go check, not
vibes" checklist. It generalizes the four defect classes named in §0 into six repeatable checks, run
once per client before that client's bot is provisioned or first-charged.

**Enforcement in v1 is a visible staff gate, not a code-level block** (see §9 for why hard
enforcement is explicitly deferred). This mirrors the same proportionality call priority-3 made for
its own Gate-minimum tier and priority-5 made for its admin-only staff toggle — a WoZ-stage business
with a handful of live clients doesn't need a programmatic block yet; it needs the checklist to be
impossible to *forget*, which a staff-facing screen with a computed pass/fail banner already achieves
at far lower build cost than wiring a guard into every provisioning/billing code path.

### 5.2 The six checklist items

| # | Item | Pass condition | Method | Defect class it generalizes |
|---|---|---|---|---|
| 1 | **Contact-mechanism inventory complete** | Every clickable contact affordance on the client's *actual live* site/LP (not the template) is enumerated and mapped to a tracked handler. Zero "untracked" rows. | Re-run priority-3 §0.2's audit-table method against the specific client's shipped site — a custom Site Bot build can add mechanisms the LP template never had. | The class of gap §0.2 was built to catch in the first place |
| 2 | **Delivery reliability confirmed** | `sendBeacon`/`keepalive` fires and is confirmed landing server-side via a real click-through, not a code read. | Roni's runtime check: network panel + "close tab immediately after tap" repro, per priority-3 §6.5. | The bare-`fetch()`-can-silently-drop failure mode Part A was built to close |
| 3 | **Intake produces exactly one correct record per real action** | Click each mechanism once on the live client instance → exactly one Mini-CRM row, correct type/status, no duplicate, no drop. | Manual smoke test against production, per client, before go-live. | Intake/idempotency bug class (duplicate or dropped records) |
| 4 | **No unauthenticated cross-client exposure** | Every endpoint this client's data will flow through requires auth and scopes correctly to that client only. | Automated regression suite (priority-3 §6.1 #4, §6.3 #9–11) **plus** one manual curl-without-cookie smoke test against the live production endpoint before this specific client goes live. | The unauthenticated `GET /api/leads` cross-client leak |
| 5 | **Grading path reachable and functional** | WAO staff (WoZ) or the client can mark a real lead GOOD/JUNK/closed and it persists. | One real end-to-end grade-and-persist smoke test per new client. | The "Mini-CRM exists but nobody can actually use it for this client" gap |
| 6 | **Downstream integrations confirmed live, not just present in code** | Any API this client's tracking depends on (e.g. offline-conversion upload to Google Ads) is confirmed via one real or sandboxed successful call — not assumed from source presence. | One live/sandboxed smoke call per dependency, logged with timestamp + result. | The June 15, 2026 API-cutoff class — code that looks correct but the upstream silently stopped accepting calls |

### 5.3 Bot-specific additions (on top of the six universal items)

- **Ads Bot**: item 1–3 already cover gclid/wbraid/gbraid capture generically (it's part of the lead
  record), but name it as its own named sub-check — `gclidCaptureConfirmed` — since it's what makes a
  lead gradeable *for Smart Bidding specifically*, distinct from gradeable for human review.
- **GEO Bot / Content Bot**: the action-page approval loop (mark-done → verification crawler) must
  produce its own gradeable trace — an immutable `log.jsonl` entry — same universal principle
  (§5.2 item 1/5), different concrete mechanism than gclid.
- **Site Bot**: the LTPC's *timing* differs, not its content — Site Bot's own deliverable is the
  build, not a lead. The gate applies at the moment the client's finished site goes live with working
  contact mechanisms (phone/WhatsApp/form), whether that's Day 1 (if Ads Bot is bundled) or Month 1
  (GMB Bot upsell, first time contact mechanisms matter for grading). Flag this explicitly so it
  isn't skipped on the (wrong) assumption that "Site Bot has no leads yet, so no gate needed."

### 5.4 Evidence, not bare checkboxes

Every item that resolves to `pass` must carry `checkedBy` + `checkedAt` + a short evidence string
(what was actually observed — e.g. "clicked WhatsApp CTA on live retter.co.il, saw lead #47 appear in
`/leads` within 2s, type=whatsapp-click"). This mirrors priority-5 §1.3's rejection of a bare
attestation checkbox for `liveConsentRecorded` — a check that looks real but records nothing is worse
than no check, because it launders false confidence. Do not ship a version of this UI where an item
can be marked `pass` with an empty evidence field.

---

## 6. Phase 2 data model and admin surface

### 6.1 Data model

```ts
interface LtpcItem {
  id: 'contact-inventory' | 'delivery-reliability' | 'intake-integrity'
    | 'no-unauth-exposure' | 'grading-path' | 'downstream-integrations'
    | 'gclid-capture' | 'geo-action-log';   // bot-specific extras, §5.3
  status: 'pass' | 'fail' | 'not-checked';
  checkedBy?: string;
  checkedAt?: string;      // ISO 8601
  evidence?: string;       // required non-empty if status === 'pass', per §5.4
}

interface LtpcRecord {
  botType: 'site-bot' | 'geo-bot' | 'content-bot' | 'ads-bot' | 'gmb-bot';
  items: LtpcItem[];
  overallPass: boolean;    // derived: every applicable item (universal + bot-specific) is 'pass'
}
```

### 6.2 Admin surface — mirror `priority-5-live-readiness-consent-ui.md` §2 exactly

Same shape, same reasons: server component page + `'use server'` action (not a new API route),
`wao-admin` cookie gate checked first, atomic write (temp file + rename), append-only audit log.

- `src/app/(app)/admin/readiness-gate/page.tsx` (NEW) — lists clients from `data/clients/*` (same
  enumeration as `admin/clients/page.tsx`), and separately lists open prospects from
  `data/prospects/*` (§7) for the Phase 1 routing view. For each client, renders the six-or-eight-item
  LTPC as toggle-with-evidence rows (same pattern as `live-readiness`'s six fields), plus a read-only
  `overallPass` banner.
- `src/app/(app)/admin/readiness-gate/action.ts` (NEW) — `'use server'`, `verifyAdminToken` first,
  validates `clientId` against `/^[a-z0-9-]+$/i` (same regex as priority-5 §1.4), rejects any
  `pass` submission with an empty evidence field (§5.4), writes
  `data/clients/{clientId}/readiness-gate.json` atomically, appends to
  `data/clients/{clientId}/readiness-gate.audit.jsonl`.
- **Do not** reuse or extend `DecisionRow`/`WhyDisclosure` (`src/components/admin/review/`) for this
  — checked and rejected: those components are purpose-built for the operator-task
  approve/reject/inquiry flow (`docs/specs/adam-recommendation-audit-*.md`) and don't fit a
  multi-item toggle-with-evidence checklist. The right precedent is priority-5's own admin form, not
  those.

---

## 7. File/directory layout

```
data/prospects/{prospectSlug}/readiness-gate.json    # Phase 1 output, pre-client
data/clients/{clientId}/readiness-gate.json          # Phase 2 (LTPC) — copied/merged from the
                                                        prospect file at onboarding, then owned here
data/clients/{clientId}/readiness-gate.audit.jsonl   # append-only, mirrors live-readiness.audit.jsonl
```

`prospectSlug` = slugified `{businessName}-{city}` (ASCII transliteration or a simple hash — exact
scheme is Eitan-Dev's implementation choice, not prescribed here; just needs to be stable and
filesystem-safe). No route/dashboard is required to *create* `data/prospects/` — `readiness-gate.mjs`
writes it directly, same "script writes, no new UI for the internal-only step" convention as
`gbp-comparison-report.mjs`.

---

## 8. Client-facing copy — placeholders only, Tamar/Noa own the words

The presentable report (§2.7) needs Hebrew, RTL-safe, WhatsApp-ready phrasing for each routing
outcome. This spec supplies the trigger logic and placeholder markers only:

- `{{ROUTING_LINE_SITE_BOT}}` — no site found, or <15 pages
- `{{ROUTING_LINE_SITE_BOT_GMB_UPSELL}}` — 15–29 pages, micro-SMB
- `{{ROUTING_LINE_GEO_BOT}}` — ≥30 pages, content-ready-SMB
- `{{ROUTING_LINE_GEO_BOT_THIN_CONTENT}}` — <30 pages, content-ready-SMB (flagged, still routed GEO)
- `{{ROUTING_LINE_ADS_NOT_READY}}` — Ads-fit hard-fail, for the sub-case where the "what's next"
  conversation includes an Ads Bot no

Do not draft final Hebrew for these; hand off to Tamar → Noa once the routing logic above is
confirmed and before this ships client-facing.

---

## 9. Explicitly out of scope for v1

- **Automating pilot-client-gating.md signals 2, 5, 6, 7** (unit economics, capacity, auction
  sanity, service radius) — stays human-entered, per §3.4. Automating any of these is a separate,
  larger effort (e.g. signal 6 would need a SERP-scraping capability this codebase doesn't have and
  hasn't evaluated for ToS risk).
- **Pre-onboarding GSC confirmation** — impossible under current Google API access rules
  (web-verified 2026-08-07, §2.3). `gscDataStatus` stays `'unknown-pre-onboarding'` until the
  client's own OAuth onboarding step runs.
- **The GSC-OAuth reconciliation step itself** (updating `gscDataStatus` post-onboarding, and
  potentially re-routing a client if it comes back thin) — flagged as a real follow-up, not built
  here. Whoever picks it up should wire it into whatever OAuth-completion hook already exists in the
  onboarding flow, not build a new polling mechanism.
- **Hard, code-level enforcement of the LTPC gate** (e.g. a guard inside `create-campaign`/billing
  routes that checks `overallPass` before allowing provisioning). v1 is a visible staff checklist,
  per §5.1's proportionality call. Revisit as a v2 candidate specifically if a real client is ever
  found to have slipped through despite the checklist showing incomplete/failed items — that failure
  mode is the actual trigger, not a timeline.
- **Deep, JS-rendering site crawls** — sitemap-first, shallow same-domain fallback only (§2.3). No
  headless browser, no infinite crawl.
- **Auto-discovering `siteUrl` via Places API's `websiteUri`** — stays a human/CLI input, to avoid
  the Enterprise SKU cost (§2.1).
- **A client-facing self-serve version of the routing report** — stays a WAO-staff-run script in
  v1, same convention as the GBP magnet itself (`grade-a-outreach-playbook.md` §2: "no new
  route/component/dashboard").
- **Cross-vertical benchmarking, review-response-rate** — already excluded upstream in the GBP
  magnet spec; inherited here, not reopened.
- **GMB Bot pricing** — this spec is routing + gating logic only, no monetization decisions
  (`grade-a-outreach-playbook.md` already parked that decision until a real prospect asks).

---

## 10. Test coverage (Eitan-Dev)

Same hard rule as every prior priority spec in this repo: assert against real behavior (mocked `fs`,
mocked `fetch` for Places/crawl calls), not source-text regex.

### 10.1 `scripts/lib/places-client.test.mjs` (extend/new alongside the refactor, §4)
1. `gbp-comparison-report.mjs`'s stdout output for a fixed mock fixture is byte-identical before and
   after the extraction refactor — the regression guard that proves §4's refactor changed nothing
   about the shipped magnet's behavior.

### 10.2 `scripts/readiness-gate.test.mjs` (NEW)
2. Site crawl: sitemap with 8 `<url>` entries → `pageCount: 8, method: 'sitemap'`.
3. Site crawl: no sitemap, shallow crawl finds 22 same-domain links within depth 2 → `pageCount: 22,
   method: 'shallow-crawl'`.
4. Site crawl: fetch fails entirely → `siteFound: false, pageCount: null, method: 'none'`.
5. Routing rule 1 (`siteFound: false`) → `primaryBotRoute: 'site-bot'`.
6. Routing rule 2 (`pageCount: 5`) → `primaryBotRoute: 'site-bot'`, no `secondaryUpsell`.
7. Routing rule 3 (`pageCount: 18`, micro-SMB) → `primaryBotRoute: 'site-bot'`,
   `secondaryUpsell: 'gmb-bot'`, `nearGeoThreshold: true`.
8. Routing rule 4 (`pageCount: 12`, content-ready-SMB) → `primaryBotRoute: 'geo-bot'`,
   `thinContentWarning: true`.
9. Routing rule 5 (`pageCount: 40`, content-ready-SMB) → `primaryBotRoute: 'geo-bot'`,
   `gscDataStatus: 'unknown-pre-onboarding'`, no warnings.
10. Routing rule 6 (`pageCount: 35`, micro-SMB) → `primaryBotRoute: 'site-bot'`,
    `flagForHumanReview: true` — named explicitly, e.g. `test('micro-SMB with 35 pages defers to
    human review, does not silently reroute to GEO')`.
11. `GEO_DIRECT_ROUTE_MIN_PAGES` (30) and `GEO_UPSELL_UNLOCK_MIN_PAGES` (15) are two distinct
    exported constants, each independently referenced by the correct rule — regression guard against
    the collapse warned about in §2.5.1.

### 10.3 `src/app/(app)/admin/readiness-gate/action.test.mjs` (NEW, mirrors priority-5 §4)
12. No `wao-admin` cookie → action rejects / page redirects to `/admin/login`.
13. Submitting an LTPC item as `pass` with an empty evidence field → rejected, not written (mirrors
    priority-5 test #the `liveConsentRecorded` empty-note case exactly).
14. Submitting a valid `pass` with evidence → persists to `readiness-gate.json`, appends to
    `readiness-gate.audit.jsonl`.
15. `overallPass` is `false` while any applicable item is `not-checked` or `fail`, and only flips
    `true` once every universal item plus every applicable bot-specific item is `pass` — assert both
    directions explicitly (adding the last item flips it true; regressing one item flips it back
    false).

### 10.4 Roni's runtime pass
- Every LTPC item in §5.2/§5.3 verified against one real (not simulated) client instance per bot
  type WAO actually has live, per the "method" column — this is inherently a manual/runtime pass,
  not something a unit test can substitute for (same boundary priority-2 §6.4 and priority-3 §6.5
  already draw for this class of check).
- Confirm the admin page's `overallPass` banner matches the actual state of `readiness-gate.json` on
  disk, shown before/after one item toggle.

### 10.5 Definition of Done
- [ ] `scripts/lib/places-client.mjs` extracted, `gbp-comparison-report.mjs` output unchanged
      (test #1).
- [ ] `scripts/readiness-gate.mjs` produces both `ReadinessGateResult` JSON and the presentable text
      block (with placeholder markers per §8, not final copy) for a real fixture business.
- [ ] All routing-tree tests (#2–11) pass.
- [ ] `/admin/readiness-gate` shipped, admin-gated, evidence-required, tested (#12–15).
- [ ] `npm run build` / `npm run lint` clean.
- [ ] Roni's runtime pass (§10.4) complete for at least one live client.
- [ ] Tamar/Noa have written and QA'd the five placeholder templates from §8 before this is used in
      live outreach — flagged as a **hard precondition for client-facing use**, independent of the
      code being merged.

---

## Lior's Resolution — 2026-08-07

Resolves Dror's four open questions so Eitan-Dev can build without re-litigating.
Verdicts are binding strategic calls; the one item that is genuinely Eitan's risk
judgment (not Lior's) is flagged explicitly under Q1.

### Q1 — Enforcement posture: **PROCEED with the visible staff gate (Dror's v1 default). Do NOT hard-block code paths in v1.**
WAO is Wizard-of-Oz throughout at this stage — provisioning and billing are
human-triggered (manual ~10-min onboarding session; Eitan runs deploy). A code-level
guard would gate an action no autonomous system currently takes, buying rigidity and
build cost against a checklist that is being validated against real prospects for the
*first* time. Hard-coding enforcement of an unvalidated checklist risks baking in a
false gate. One binding refinement: the gate must be a **mandatory step in the human
onboarding runbook** — the green `overallPass` banner is the literal go-signal, and
Eitan may not provision until it is green. A merely informational screen would
reproduce the same "human-remembered process" that already failed to catch the four
defects. The spec's revisit trigger (a real client slipping through despite the
checklist showing incomplete) is correct and retained.

### Q2 — Priority-3 dependency: **PROCEED — Phase 2 can be built now. Gate-minimum has shipped. One correction to the spec's framing.**
Verified on disk (not assumed): `/api/client/leads` (GET+POST, session+ownership
gated), `leadMatchesClientIndex`/`isLeadOwnedByClient` (`src/lib/crm/ownership.js` +
`intelligence.ts` wrapper), `conversion-upload.ts` (cookie-forwarding fix *and* the
Priority-4 Data Manager API migration), and `leadsStore.ts` all exist. Priority-3's
Gate-minimum tier (§6.6) has shipped. **Correction:** LTPC item 2 (delivery
reliability — `sendBeacon`/`keepalive`) depends on Priority-3's **Full-spec Part A**,
which has *not* shipped — `LandingPage.tsx` `pingClick()` still fires a bare
`fetch(...).catch(()=>{})`, and `handleSubmit()` still lacks `keepalive`/retry and
regenerates `orderId` per call. So the Phase-2 admin surface and 5 of 6 items can be
built and can pass today; item 2 will *legitimately fail* against any real client
until Part A lands — the spec's own anticipated "correct behavior, not a bug." Net
effect: item 2 being a named go/no-go gate **raises** the priority of Priority-3
Full-spec Part A above its current "trails pilot outreach" status. Flag to Adam.

### Q3 — Post-onboarding GSC reconciliation ownership: **DEFER — do not build here. Place it on the GSC-OAuth onboarding hook, event-driven, human-review on reroute.**
Trigger = the **OAuth-grant completion event** in the onboarding flow — not a cron,
not manual polling. Owner = whoever builds the "Self-serve GSC OAuth (for clients
post-payment)" step already open and unchecked in VISION.md Phase 1R (line 248). The
reconciliation is a small callback on that hook: pull real page/content data,
recompute the routing signal, set `gscDataStatus` to `confirmed-thin` /
`confirmed-sufficient`, write to the *same* `data/clients/{clientId}/readiness-gate.json`
file. If the real data would flip the pre-sale route, it raises `flagForHumanReview`
for Lior/Eitan — **never a silent auto-reroute** (consistent with rule 6's
defer-don't-guess posture). Reason it is not built in this spec: the OAuth-completion
hook it must attach to does not exist yet, so building the reconciliation now means
building against an absent hook — premature. It belongs to the (unwritten) GSC-OAuth
onboarding spec as one step, not a new route and not a new mechanism.

### Q4 — Crawl parameters (50-page cap, depth-2): **PROCEED with the defaults as-is. This is not a real open question.**
This is exactly the "ship a reasonable default, tune empirically against real data"
pattern VISION already uses (CPC-cache 30-day TTL; negative-keyword batch cap). The
routing tree only needs to distinguish `<15` / `15–29` / `30+`, so the crawl only
needs accuracy near those boundaries and can be coarse above 30 — a 50-page cap covers
that with margin, and depth-2 is proportionate to the "no queue, no infra" posture.
Over-thinking this pre-launch is waste. Ship it; revisit only if real prospect crawls
show systematic mis-bucketing near the 15/30 thresholds. Cheap durability note: put
both numbers in named constants (like `GEO_DIRECT_ROUTE_MIN_PAGES` /
`GEO_UPSELL_UNLOCK_MIN_PAGES` in §2.5.1) so empirical tuning later is a one-line change.

### The one item that is Eitan's judgment, not Lior's
Q1's *escalation trigger* — the spec says revisit hard enforcement "if a real client
is ever found to have slipped through." "Found" is vague, and the decision to accept
that residual risk vs. pay for a hard block is a **business risk-tolerance call**, not
a strategic-prioritization one. Eitan should pre-register the threshold now (parallel
to the dispute-rate switch threshold he already owes per STATUS.md): e.g. "one
provable slip-through, or one near-miss with a paying client → v2 hard block."
Pre-committing this *before* the checklist runs prevents a retroactive over-correction
under pressure — the exact failure mode Lior's charter guards against.

### Q1 escalation trigger — resolved by delegation, 2026-08-07
Eitan handed this decision back to Lior ("On questions — Lior"), converting the
deferred item above into a Lior call rather than an open question. Resolved and
pre-registered *before* the checklist runs — matching the rigor of the dispute-rate
switch threshold (STATUS.md), the CPL-ceiling gate, and Priority-3 §8.6, not a looser
standard because it's being decided faster.

**The threshold is severity-split, not a flat count** — because the two slip-through
shapes carry radically different stakes and a single number would either be too twitchy
for the benign case or too slow for the catastrophic one.

**Class A — money moved without a provable trace (catastrophic): ONE occurrence trips
the hard block, immediately.**
A client with live ad spend OR an active recurring charge went live while their LTPC
`overallPass` was `false`, or any lead-tracking item was `fail`/`not-checked`, or an
item marked `pass` is later found to rest on falsified/stale evidence. This is the exact
near-miss that motivated the feature: real money burning with zero attribution. A single
confirmed Class A is enough — not twitchy, because the visible gate has demonstrably
failed at its one job in its highest-stakes case, which is precisely the revisit
condition §9 already names.

**Class B — bot provisioned without a trace, but no money at risk yet (moderate): TWO
within a rolling 90 days.**
E.g. a Site Bot build published with an untracked contact mechanism, pre-billing, no ad
spend. A real defect, but nothing is burning. The first is logged and the staff gate is
tuned (why did the green banner get bypassed, or miss it?); a second inside 90 days
escalates to the Class A response. A Class B that later has spend or billing switched on
before the failing item is fixed converts to Class A on that event. The rolling window
ensures one early WoZ stumble doesn't count against WAO forever.

**How a slip-through is counted (closing the "found is vague" gap Dror flagged):** it
counts when surfaced by (a) Roni's runtime pass, (b) a client-reported missing/lost
lead, or (c) a retrospective audit finding an onboarding where the runbook's green
`overallPass` banner was bypassed, or was green on falsified/stale evidence. "Provable"
means documented: which client, which item, and the spend/billing state at go-live.

**What happens operationally the moment it's crossed (a confirmed Class A, or a 2nd Class
B in 90 days):**
1. **Same day** — Eitan is notified directly (single-founder stage: a flag to Eitan plus
   a new STATUS.md open loop entry).
2. **Immediately** — interim manual freeze: no new client is provisioned with ad spend or
   billing until Eitan personally confirms that client's LTPC is green. This closes the
   exposure window during the gap before the code block ships.
3. **Next mission cycle** — §9's out-of-scope "hard, code-level enforcement of the LTPC
   gate" is promoted to an active Priority spec (a guard inside the
   provisioning/billing/`create-campaign` routes that refuses to proceed unless
   `overallPass === true`), scheduled as the next build after the current in-flight
   mission — not queued behind the general backlog.

Rationale in one line: a single catastrophic slip justifies the build because it proves
the visible gate failed exactly where money and attribution were on the line, while a
single benign slip does not — forcing the hard-block build before the checklist is proven
against real prospects is the premature-rigidity cost the v1 posture was deliberately
chosen to avoid.
