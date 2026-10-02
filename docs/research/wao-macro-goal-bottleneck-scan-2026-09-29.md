# WAO Macro-Goal Bottleneck Scan — 2026-09-29

Task: `t_7f23eee3` (read-only strategy scan, requested by Eitan).
Author: waostrategy. No source, test, config, handoff, git-state, credential, or service change was made; this report is the only file created by this scan.

Evidence model:
- **Observed** = directly verified in this scan (repo files at cited lines, git refs, live HTTPS probes, read-only board queries).
- **Board/worker claim** = formal kanban outcome or worker self-report; point-in-time, not re-run here.
- **Hypothesis** = strategist inference; labeled as such.

Scan-time repository state (Observed):
- Branch `hermes-migration`, local HEAD `c78c9ce`, `origin/hermes-migration` at `9bebcfe` → local is **5 commits behind, 0 ahead**.
- `git status --porcelain` = **148 paths**: 92 untracked, 56 tracked modified/staged (includes 7 staged deployment-security paths).
- Handoff queues (Observed counts): `handoff/pending/` 144 files, `handoff/completed/` 226, `handoff/failed/` 93, `handoff/in-progress/` empty.
- Kanban board `autonomous-hybrid-demand` (Observed, read-only SQL): 547 done, **144 blocked**, 13 todo, 1 running (this scan).

---

## 1. Stated macro goals

Observed from `VISION.md` and current strategy documents:

1. **North Star:** 10,000 Israeli small-business owners running their digital marketing through WAO's AI bot; the bot executes, the owner approves (`VISION.md:8`).
2. **Site Bot is the single MVP acquisition product** at a ₪199/month retainer (locked by Eitan 2026-08-21, superseding the ₪1,490–1,990 one-time price), WoZ-invoiced at pilot; funnel is ₪9.90 preview → ₪199/mo retainer → ₪299/mo GEO upgrade at month 4 (`VISION.md:35`).
3. **Product #2 is Phone Bot; Ads Bot demoted to #3** behind Phone Bot proof (Purple-Cow amendments, 2026-08-23, `VISION.md` Product Shape section).
4. **Launch posture:** a full public self-serve Site-Bot launch was judged infeasible; the approved near-term path is an **operator-led pilot** with 2–3 real permissioned businesses, local previews, human + independent QA, then owner-gated publication (`docs/research/weekend-sitebot-launch-readiness-2026-09-19.md`, Executive decision).
5. **Rank-and-rent portfolio** (Hogegim first) as a bounded commercial-proof path, gated on Eitan's per-domain approval (`docs/research/rank-and-rent-portfolio-strategy-2026-09-06.md`; `docs/missions/continuous-waostrategy-planning-loop-2026-09-06.md`).
6. **Delivery model:** one outcome contract → one goal-mode engineer run → one independent verifier (`docs/missions/outcome-owned-delivery-model-2026-09-09.md`).

---

## 2. The production deployment failure/revert: what happened and where it leaves us

Chronology (mix of Observed git state and Board claims):

- 2026-09-28: reviewed Astra homepage published as `1051ad9` (19 paths, verified by `t_896fcf4f`, `t_07a1e916` — Board claims: done, PASS).
- Manual production deployment then failed repeatedly. Per the Context block of `handoff/pending/2026-09-28_016_waoengineer_fix-atomic-activation-rollback.md` (Board-sourced narrative): activation created a **duplicate `wao` PM2 entry**; a later gate failed; `restore_previous_release()` repointed `releases/current` and started the previous release **without removing the running candidate**, which held port 3000; the rollback entry failed with `EADDRINUSE`; production served the candidate **with unstyled homepage assets**; an emergency manual rollback restored one healthy previous-release process.
- Four narrow repair commits landed on `origin/hermes-migration` on 2026-09-28 (Observed refs): `ec56bfc` (candidate runtime-data symlink + tsconfig restoration), `f8e38f9` (remove invalid `/api/leads` route export), `c2a2494` (bounded Webpack build memory for the 3.7 GiB host), `9bebcfe` (singular PM2 process replacement `replace_wao_process()` + `verify_homepage_assets()` gate + corrected rollback). Engineer cards `t_9fcca574`, `t_585f39fa`, `t_7ad9376a`, `t_9b29ca91` are formally done (Board claims; not re-run here).

Live production state (Observed this scan, HTTPS probe of https://www.wao.co.il/):
- HTTP 200 in ~1.0s; CSS asset `/_next/static/chunks/0s3xi1bc~no30.css` → 200 `text/css` 95,221 bytes; JS chunk → 200 `application/javascript`. **Production is healthy.**
- Production serves the **pre-Astra homepage**: rendered `<h1>` contains the old Hero copy (`src/components/Hero.tsx:8-9` at `c78c9ce`); zero occurrences of `astra` markers or the Astra section anchors in the served HTML. The title is the layout default (`src/app/(app)/layout.tsx:30` at `c78c9ce`).

Consequences for the path forward:
1. The reviewed homepage (`1051ad9`) and all four deploy-path repairs exist **only on `origin/hermes-migration`** — they have never been activated in production. The repair chain is unproven end-to-end against the real host.
2. The local shared worktree's `deploy.sh` (139 lines at `c78c9ce`) still contains the **old defective rollback** (`deploy.sh:64-69`, `deploy.sh:130-138`: `pm2 stop` + naive `pm2 start`, no duplicate removal, no homepage-asset gate). Any local reasoning or testing that uses the worktree copy tests the broken script. (Observed via `git diff HEAD origin/hermes-migration -- deploy.sh`.)
3. A successful redeploy is the single step that converts five done engineering cards into customer-visible value — and it is **owner-only** (Eitan deploys manually; strategist/engineer contracts forbid production SSH).

---

## 3. Ranked bottlenecks (max 5, by impact × evidence)

### B1 — No working paid Site-Bot customer journey (blocks the single MVP product)
Impact: highest. The product that VISION.md names as the only acquisition MVP cannot complete a paid journey end-to-end.
Observed defects, all still present in the current worktree:
- **Checkout callback contract mismatch:** `src/app/(product)/site-bot/pay/[sessionId]/page.tsx:21-27` requires `url` and `slug` from the checkout callback, but `src/lib/site-bot/checkout/researchCompletion.ts:23-31` returns `success/charged/researchId/status/statusUrl/openGateCount` — no `url`/`slug`. A successful paid-research response is therefore treated as an error by the pay page. (Corroborates `weekend-sitebot-launch-readiness-2026-09-19.md`.)
- **Researched-record deployment dead end:** `src/app/api/site-bot/deploy/route.ts:141-142` rejects researched records lacking `researchedPages` with `researched_site_pages_required`; a repo-wide grep finds `researchedPages` referenced only in the deploy and generate routes — **no seam writes it into a site record**.
- **Payments are mock-only:** `src/lib/payments/get-provider.ts:9-12` states `TakbullPaymentProvider` throws until its real API contract is confirmed; line 23 defaults to `MockPaymentProvider` unless `PAYMENT_PROVIDER=takbull`.
Dependencies/risks: Takbull's real API contract is external (owner lane), but the callback mismatch and the `researchedPages` gap are **local, code-level, and dependency-free**. With WoZ invoicing at pilot (`VISION.md:35`), the pilot does not need live Takbull — it needs the preview→research→generate→deploy chain coherent.

### B2 — Production release path repaired but unproven; reviewed homepage undeployed
Impact: high; evidence strong (Section 2). Five done cards (homepage + 4 deploy fixes) produce **zero customer-visible value** until one successful manual deployment. The failure class that caused the revert (duplicate PM2 entries, EADDRINUSE rollback, unstyled assets, OOM-killed build on a 3.7 GiB host) now has targeted gates on `origin` (`verify_homepage_assets`, `replace_wao_process`, bounded Webpack heap), but they have only been exercised in synthetic harnesses (Board claims). Risk: another failed activation on the live host; mitigations already coded (singular-process assertion, asset gate, rollback verification per handoff 016 spec). This bottleneck is **owner-gated**, not engineer-gated.

### B3 — Shared worktree drift and release-candidate hygiene cost
Impact: medium-high; observed. The single-writer workspace `/home/eitanya/wao` sits 5 commits behind `origin` with 148 dirty paths mixing accepted, unaccepted, and abandoned work (7 staged deployment-security paths; unrelated GEO, recovery-contact, expired-domain, package/tsconfig changes). Every production-near step has required bespoke candidate isolation, hash pinning, and reconciliation (e.g. `docs/research/next-production-near-release-outcome-2026-09-18.md`; `docs/research/seven-day-delivery-lane-decision-2026-09-17.md`). Two verifier cards (`t_600a118a`, `t_8219a66e`) blocked **after all checks PASSed** over evidence-ceremony disputes (raw 148-line porcelain demanded inline) — pure process loss. Risk: silent absorption of unaccepted hunks into future commits; wasted runs.

### B4 — Public marketing contradicts the locked offer
Impact: medium; observed. `src/app/(app)/site-bot/page.tsx` still advertises the superseded ₪1,490 one-time price at lines 29, 49, 76, 257, 351, 446, while `VISION.md:35` locks ₪199/month retainer. This page is live in production (old release). Any pilot or traffic sent to `/site-bot` today sees the wrong offer. Fix path is the standard `waocopy` → `waohebrewqa` → `waoengineer` (zero-Hebrew-bytes) pipeline; no code risk, but it competes for the same single-writer window.

### B5 — Queue/board process debt
Impact: medium; observed. 144 pending handoffs (the 2026-09-09 triage found only 1 of 90 executable specs runnable, `docs/research/wao-pending-queue-triage-2026-09-09.md`; the queue has since grown to 144), 144 blocked board cards, and legacy one-shot/exact-once contracts that get "consumed" and force new corrective cards. Hypothesis: this is a persistent tax on dispatch throughput; the pending directory is not a FIFO backlog and should be treated as REVIEW_REQUIRED archive unless a card is explicitly re-validated (already the standing rule in AGENTS.md Workflow Rules).

Dependency ordering: B2 depends only on an owner decision (deploy `origin/hermes-migration@9bebcfe`). B1 is independent and local. B3 raises the cost of B1/B4 work but can be routed around with disposable clean worktrees based on `origin` (the pattern the four deploy-fix cards already used successfully). B4 depends on owner confirmation that pilot messaging should switch to ₪199/mo publicly. B5 is background hygiene.

---

## 4. Recommended single highest-value next local outcome

**Repair the Site-Bot paid-journey seams (B1) in one goal-mode `waoengineer` card, executed in a disposable clean worktree based on `origin/hermes-migration@9bebcfe` — not the dirty shared worktree:**

1. Align the checkout callback contract: either extend `completePaidCheckoutResearch` (`src/lib/site-bot/checkout/researchCompletion.ts`) to return the `url`/`slug` the pay page requires, or narrow `CheckoutCallbackResponse` (`src/app/(product)/site-bot/pay/[sessionId]/page.tsx:21-27`) to the fields actually produced — engineer's choice after inspecting both seams, with focused tests proving a successful paid-research response renders a success state, not an error.
2. Close the `researchedPages` persistence gap so a researched generated record can pass `src/app/api/site-bot/deploy/route.ts:141-142` instead of dead-ending at `researched_site_pages_required`.
3. Acceptance: focused tests + `npm run test` + `npm run build` in the isolated worktree; narrow commit pushed to `origin/hermes-migration`; then one independent verifier card.

This is the highest-value *local* outcome because it is the only ranked bottleneck that is (a) on the critical path of the single MVP product, (b) fully dependency-free (no owner gate, no external API, no Hebrew copy), and (c) a prerequisite for the operator-led pilot that the weekend readiness decision already approved. The disposable-worktree execution mode sidesteps B3 without requiring a risky shared-worktree reconciliation.

## 5. Non-goals for the next cycle

- No public self-serve launch of Site-Bot checkout; payments stay mock/WoZ (`VISION.md:35`; weekend readiness decision).
- No Takbull integration work — its real API contract is unconfirmed (`src/lib/payments/get-provider.ts:9-12`).
- No revival of legacy `handoff/pending/` specs in filename order; they remain REVIEW_REQUIRED.
- No new rank-and-rent site builds, niche research dispatches, or Phone Bot work until the Site-Bot pilot path is coherent.
- No shared-worktree mass reconciliation, `git reset`, or `git clean` as a side effect of any card.
- No Hebrew copy changes inside engineer cards (zero-Hebrew-bytes rule).

## 6. Owner-only decision boundaries (Eitan)

1. **Production deployment:** running `deploy.sh` against 91.98.195.242 to activate `origin/hermes-migration@9bebcfe` (homepage + all deploy repairs). Agents never deploy. Decision needed: redeploy now, or after the B1 journey fix lands.
2. **Pilot definition:** naming the 2–3 pilot businesses and approving business facts, media rights, lead destinations, SEO anchors, and privacy treatment (explicit precondition in `weekend-sitebot-launch-readiness-2026-09-19.md`).
3. **Takbull:** obtaining/confirming the real API contract so live payments can be wired.
4. **Public pricing switch:** approving when `/site-bot` marketing moves from ₪1,490 one-time to ₪199/month (B4 dispatch trigger).
5. **Preview-service restart authorization:** the consumed one-shot `wao-qa-4017` restart authorization requires a fresh explicit owner authorization if that preview is still needed (`docs/research/astra-preview-restart-policy-recovery-decision-2026-09-28.md`, Required owner action) — likely superseded by the published homepage commit; owner to confirm or close.
