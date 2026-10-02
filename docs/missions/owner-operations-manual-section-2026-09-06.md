# WAO Owner Operations Manual — Strategy Memo

Date: 2026-09-06
Status: strategy and execution specification only; no copy, production code, outreach, legal approval, publication, or deployment authorized
Kanban task: t_d36d3c49

## Decision

Create a private, admin-authenticated, noindex manual at `/admin/manual`. It is Eitan’s daily operating guide, not a public course, SEO page, sales page, or customer workspace. Place one entry card/link on the existing post-login `/admin/clients` hub and a return link inside the manual; do not add it to `Header.tsx`, `Footer.tsx`, `sitemap.ts`, Training, Knowledge, or any public page.

The MVP is read-only. It teaches the approved workflow and supplies copyable checklists/templates, but stores no prospect or lead data, sends no messages, makes no external calls, and exposes no purchase, payment, domain, client-account, publish, or deploy action. Operational records continue in the approved control plane or another explicitly approved system; the manual must never become a shadow CRM.

## Information architecture

Use stable ASCII section IDs and everyday Hebrew display copy authored separately:

1. `start-here` — purpose, internal-only boundary, current version, and stop conditions.
2. `daily-routine` — new leads, routing receipts, overdue follow-ups, capacity, consent, and next actions.
3. `weekly-review` — funnel outcomes, response times, stale prospects, trial health, costs/operator time, and manual gates.
4. `internet-prospecting` — find businesses from public Internet evidence without scraping sensitive data or contacting anyone automatically.
5. `rank-rent-fit` — serviceability, intent/demand evidence, provider capacity, ownership, reputation/legal risk, lead economics evidence, and reject/hold/manual-review outcomes.
6. `free-lead-trial` — transparent written scope, recipient disclosure, qualified-lead definition, consent, routing, duration, capacity/SLA approvals, evidence, and a clean stop path.
7. `lead-routing-follow-up` — deterministic assignment, duplicate handling, delivery receipts, status updates, and respectful follow-up records.
8. `annual-rent-conversion` — review measured trial value and costs; prepare a fixed yearly-rent proposal with blank founder-approved amount, term, scope, exclusivity, exit, and ownership fields. Never auto-price or imply guaranteed future performance.
9. `ownership-consent-privacy` — client-owned assets/access, contact consent, PII segregation, revocation, export/deletion decision, and approval/legal gates.
10. `cold-outreach-later` — visibly disabled until founder and legal/commercial approval; draft-review-send-log-do-not-contact workflow only, with no automation.
11. `updates` — version, effective/review dates, source references, change log, owner, and next-review trigger.

Search indexes titles, summaries, steps, checklist items, template labels, field labels, and aliases entirely in the browser. Empty results identify no match and preserve the full section list when cleared. Each section is directly addressable by fragment ID.

## Daily and weekly workflows

Daily: check consent and capacity before routing; review unacknowledged delivery receipts; update contacted/qualified/booked/won/excluded outcomes; schedule the next follow-up; honor revocation/do-not-contact immediately; escalate any ownership, legal, payment, domain, account, or publication gate rather than improvising.

Weekly: review the cohort from lead to won outcome, attribution completeness, response delay, duplicates/exclusions, trial end dates, provider capacity, complaints/revocations, operator time/cost, stale evidence, and the next approved action. Traffic and rankings remain diagnostics, never commercial proof.

## Prospect and free-trial lifecycle

`discovered → screened → hold/reject/manual-review → contact-approved → invited → written-trial-approved → trial-active → evidence-review → annual-rent-proposed/extended/closed → active-rental/closed`.

No transition is automatic. Publicly discovered contact information is not permission to contact. A free-lead trial must disclose WAO/site identity, intended recipient(s), what counts as a qualified lead, routing method, duration, follow-up expectation, data handling, no-obligation stop path, and any exclusions. Conversion occurs only after a shared evidence review and explicit agreement; exact annual amount and legal/commercial terms remain blank until approved.

## Checklists, templates, and fields

Include: Internet prospect note; rank-and-rent suitability gate; trial-readiness checklist; transparent trial outline; lead handoff/follow-up log; weekly evidence review; yearly-rent proposal-preparation outline; ownership/consent/privacy gate; closeout/export/deletion checklist; cold-outreach preflight.

Use opaque IDs and separate PII from aggregate evidence. Useful fields: source URL/retrieval date; business/niche/service area; public evidence and contradictions; fit disposition/reason; approval and legal-review references; contact authorization/do-not-contact state; trial start/end and approved terms reference; qualified-lead definition; recipient/capacity/routing state; consent version/timestamp; pseudonymous lead event ID; delivery receipt; contacted/qualified/booked/won/excluded status and reason; outcome date; value range and confidence; next action/owner/due date; operator time/cost; proposed annual term/amount/scope/exclusivity/exit as unfilled approval fields.

Templates are operational prompts, not contracts or legal advice. They must instruct Eitan to obtain the required approval instead of asserting compliance.

## Update and version model

The Hebrew source bundle is the single content source, with `schemaVersion`, semantic `manualVersion`, `effectiveDate`, `lastReviewedAt`, `reviewOwner`, `sourceRefs`, a stale-review notice, and a dated change log. Stable IDs survive wording updates. Every content revision repeats waocopy → waohebrewqa → Eitan digest approval → waoengineer byte-exact import. The UI visibly shows version/effective/last-reviewed values and displays the approved stale notice after 90 days; it provides no browser editor in MVP.

## Mobile-first UI

Use the product/admin shell, RTL, one-column-first layout, 44px minimum targets, sticky compact search, horizontally scrollable section chips, collapsible sections with native semantics, visible focus, fragment navigation, readable mixed Hebrew/English terms, and no horizontal page overflow at 390×844. Desktop may add a sticky section rail and wider content column. Checklists remain print/copy-friendly and non-persistent; no localStorage or form submission.

## Content, implementation, and verification chain

Context sizing: `AGENTS.md` records 1,000,000-token windows for waocopy, waohebrewqa, waoengineer, waoverifier, and waouxtester. Each task reads only this memo, one bounded content artifact, and named source files; expected payload stays below 80,000 tokens.

1. `2026-09-06_058_waocopy_author-owner-operations-manual.md` — Hebrew content JSON only.
2. `2026-09-06_059_waohebrewqa_review-owner-operations-manual.md` — independent language/safety review.
3. Human gate — Eitan records digest approval for the exact PASS bundle; no handoff can generate this approval.
4. `2026-09-06_060_waoengineer_build-owner-manual-section.md` — private read-only route, search/navigation, byte-exact content import, scoped tests, and fixture scripts.
5. `2026-09-06_061_waoverifier_verify-owner-manual-runtime.md` — auth, noindex, search/fragments, forbidden-surface, and network/runtime checks.
6. `2026-09-06_062_waouxtester_verify-owner-manual-ux.md` — desktop/mobile RTL and usability screenshots.

No task dispatches another. No task authorizes outreach, storage of customer data, payment, legal conclusion, domain/account mutation, commit, push, publication, or deployment.
