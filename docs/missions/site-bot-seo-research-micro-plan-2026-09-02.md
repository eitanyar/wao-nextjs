# Site Bot Research-First SEO: Macro Milestones and Execution Queues

Date: 2026-09-02
Owner: waostrategy
Scope: client-owned Israeli service-business sites only. Rank-and-rent remains out of scope.

## Product decision

Replace the raw service-by-city Core-30 launch matrix with a research dossier that selects a smaller evidence-backed launch architecture and retains qualified opportunities as a growth backlog. DataForSEO is the demand, intent, and SERP authority. NeuronWriter is restricted to shortlisted service/intent clusters for semantic briefs and post-draft scoring. FAQs are optional page components chosen from researched questions and first-party objections; they are not mandatory and are not sold as a rich-result mechanism.

## Provider checks completed

- DataForSEO credentials are live. The account endpoint returned status 20000 and a positive balance. Keywords Data, DataForSEO Labs, Search Intent, and Organic SERP endpoints accepted authenticated requests and rejected only deliberately empty payloads, proving endpoint access without running billable research.
- The NeuronWriter key is live. `/list-projects` returned six projects; five are Hebrew/google.co.il. The existing `wao.co.il` project is the default pilot until a dedicated Site Bot project is created manually.
- Official NeuronWriter API documentation confirms Gold-or-higher access, one monthly analysis per `/new-query`, no analysis consumption for `/get-query`, and `/evaluate-content` scoring without saving a revision.
- No `/new-query` was created during planning, so no NeuronWriter analysis quota was consumed.
- `.env.local` now contains `NEURONWRITER_API_KEY` and `NEURONWRITER_PROJECT_ID`; the key value is never copied into a spec or tracked document.

## Macro milestones

### M0 — Contracts and provider safety
Deliver a versioned dossier contract, provenance rules, cache/expiry policy, provider budgets, secret handling, and fail-closed status model.

### M1 — Business truth and market research
Reconcile owner facts, Places/GBP facts, DataForSEO demand/intent/SERPs, NeuronWriter service-cluster semantics, and sourced city evidence.

### M2 — Evidence-selected architecture
Cluster by SERP overlap, score page opportunities, select the homepage and three or four money services, reject doorway/cannibalizing candidates, and persist backlog and internal-link graph.

### M3 — Targeted human gates
Ask only for unresolved business boundaries, topical-border decisions, money-service priorities, or ambiguous merge/split choices. High-confidence cases proceed automatically.

### M4 — Research-driven copy and FAQ decisions
Compile page briefs containing persona, offer, queries, approved entities/facts, internal links, and optional FAQ candidates. NeuronWriter remains service-cluster-only.

### M5 — Evaluation, rendering, and deployment gates
Run Hebrew QA, NeuronWriter evaluation, one bounded revision, duplicate/cannibalization checks, hierarchy rendering, stable slugs, and deploy-readiness checks.

### M6 — Validation and staged rollout
Compare old and new architecture on field-service, fixed-location, and hybrid fixtures, then run independent structural/runtime and RTL visual gates.

## Prioritized task queues

### Queue A — Foundation (P0; strictly first)
- 002: dossier contracts and atomic store.

### Queue B — Provider and truth adapters (serialized after 002)
- 003: DataForSEO keyword/intent/SERP adapter.
- 004: NeuronWriter service-cluster adapter.
- 005: city/entity evidence compiler.
- 006: business-truth compiler.

### Queue C — Research assembly and architecture
- 007: research orchestrator and readiness state.
- 008: SERP-overlap clustering.
- 009: page opportunity portfolio and internal-link graph.

### Queue D — Human gates
- 010: concise Hebrew copy bundle.
- 011: adaptive gate API/UI and approval state.

### Queue E — Brief, generation, and evaluation
- 012: research brief and optional FAQ policy.
- 013: brief-driven generation and paid fallback removal.
- 014: NeuronWriter evaluation and one-revision hold gate.

### Queue F — Pipeline and rendering
- 015: researched hierarchy, stable slugs, links, schema, sitemap.
- 016: checkout-to-research state machine and deploy gate.

### Queue G — Proof and release
- 017: deterministic cohort comparison report.
- 018: independent runtime/RTL release verification.

## Scheduling rules

1. Use one board, `sitebot-seo-micro`, with explicit parent dependencies.
2. Serialize tasks 002–009 in `dir:/home/eitanya/wao`; these tasks share contracts and test configuration, so parallel edits would create avoidable collisions.
3. After 009, task 010 (`waocopy`, JSON bundle only) and task 012 (`waoengineer`, pure brief compiler) may run in parallel because their write sets do not overlap. Task 011 waits for 010; task 013 waits for both 011 and 012.
4. Do not start waocopy task 010 until task 009 fixes the decision states needing labels.
5. Do not dispatch task 018 until 017 and every engineering test/build pass.
6. Never run `deploy.sh`; Eitan deploys manually.
7. No task may mutate `data/clients/` or overwrite `data/sites/*.json` fixtures.

## Kanban dependency graph

`002 → 003 → 004 → 005 → 006 → 007 → 008 → 009`

After 009:

- `009 → 010 → 011`
- `009 → 012`
- `011 + 012 → 013 → 014 → 015 → 016 → 017 → 018`

## Context-budget check

`waoengineer`, `waocopy`, `waohebrewqa`, and `waoverifier` are configured with 1,000,000-token context windows in `AGENTS.md`, and each handoff spec is under 4 KB. Provider responses are normalized and bounded by the contracts rather than dumped raw, so no task approaches the target profile context limit.

## Cost and quota defaults

- DataForSEO: cache-first staged calls. Batch expansion/volume; run live SERPs only for shortlisted or ambiguous clusters; enrich competitors only for finalists. Persist call count and provider-reported cost. Hard-stop before budget overrun.
- NeuronWriter: one `/new-query` per distinct shortlisted service/intent cluster, never per city permutation and never for trust/legal/about pages. Persist query IDs, reuse `/get-query`, and score through `/evaluate-content` without saving revisions.
- FAQs: include only when researched questions materially help a buying decision and have distinct supportable answers. Repeated FAQ blocks fail the duplicate gate.

## Release blockers

Missing primary service; unresolved serviceability; no researched matching intent; no defensible architecture; no first-party differentiator for the principal page; unsupported local assertion; unresolved cannibalization; missing approval for low-confidence boundaries; failed Hebrew QA; failed semantic evaluation after one revision; generic production fallback; or failed independent verification.
