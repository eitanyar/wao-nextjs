# WAO Homepage Recovery & Qwen Copy Strategy — 2026-09-29

Task: `t_48ba4fa0` (fresh strategy review, requested by Eitan; supersedes blocked `t_74fa76ec` whose forced skill crashed dispatch twice).
Author: waostrategy. Read-only task: this report is the only file created. No source/copy/handoff edits, no production access, no git mutation, no push, no deployment, no credential changes.

Evidence model:
- **Observed** = verified in this run (repo files at cited paths, git refs, SHA-256 hashes, live HTTPS probes, systemd/journal reads, profile config files read without exposing secret values).
- **Board/worker claim** = formal kanban outcome or prior worker self-report; point-in-time, not re-run here.
- **Hypothesis** = strategist inference, labeled as such.

---

## 1. Current state (Observed, 2026-09-29 evening)

### Production
- `https://www.wao.co.il/` → HTTP 200, healthy assets (CSS `/_next/static/chunks/0s3xi1bc~no30.css` → 200, `text/css`, 95,221 bytes).
- Production serves the **pre-Astra homepage**: rendered HTML contains zero `astra` markers; H1 is the old Hero copy ("שיווק דיגיטלי מתקדם עם AI. תפטר את הסוכנות שלך. הגיע הזמן."); old `testimonial-card` components render; **zero links to `/google-ads/onboarding` or `/site-bot/start` anywhere in the live homepage HTML** (primary CTAs point to `/site-bot` and `tel:`).
- All conversion routes respond: `/google-ads/onboarding`, `/site-bot/start`, `/google-ads`, `/site-bot`, `/about`, `/contact` → HTTP 200.
- Live `/site-bot` page still shows the superseded **₪1,490** one-time price (14 occurrences of "1,490" in served HTML) — contradicts the locked ₪199/month retainer (`VISION.md:35`, per bottleneck scan B4).

### Repository
- Local `hermes-migration` HEAD = `c78c9ce`; `origin/hermes-migration` = `9bebcfe` → local is **5 commits behind**: `1051ad9` (Astra homepage, 19 paths), `ec56bfc`, `f8e38f9`, `c2a2494`, `9bebcfe` (the four deploy-path repairs).
- Shared worktree: `git status --porcelain` = **150 paths** dirty (mix of accepted, unaccepted, abandoned work).
- Worktree Astra files are **byte-identical to `origin/hermes-migration`** (SHA-256 verified for `src/components/home/AstraHome.tsx` `64be2d4a…`, `AstraProofVideo.tsx` `7d742607…`, all three `src/content/astra-*.json`, and `src/app/(app)/page.tsx` `7fef0ab9…`). The pushed homepage candidate is intact.
- `wao/qwen-chat-candidate` branch at `fe8739c` (Qwen live-chat, built on `9bebcfe`) exists as a separate worktree — Board claim: done via `t_be5d4ec1`/`t_45f76370`.

### Local environment health (Observed — new finding, material)
- `/home/eitanya/wao/node_modules` is **empty** (0 packages, 20K dir, mtime 2026-09-28 15:49). `npm ls next` → `(empty)`. Local canonical tests/builds **cannot run** in the shared worktree until `npm ci`.
- `wao-qa-4017.service` is in a **crash loop**: `Error: Cannot find module '/home/eitanya/wao/node_modules/next/dist/bin/next'`, restart counter ~10,458, no listener on 4017. The private Astra preview is **dead** — there is currently no live preview surface for owner review.
- The `hermes` CLI self-update is **failing** (`python-olm==3.2.16` wheel build fails under clang++/libolm). `hermes profile show/list` do not work; profile state below was read directly from config files. This same broken half-update caused the prior card's crash (`Unknown skill(s): hermes-kanban-dispatch` — a skill installed only on the `orchestrator` profile, force-loaded onto `waostrategy`).

---

## 2. What likely went wrong — fresh analysis

1. **The homepage was never actually lost — it was never activated.** The reviewed Astra homepage (`1051ad9`) passed independent verification (Board claims: `t_896fcf4f`, `t_07a1e916` PASS) and sits pushed on origin. The manual production deployment failed at activation (duplicate PM2 `wao` entry → later gate failure → rollback that left the candidate holding port 3000 → `EADDRINUSE` loop → production briefly served an unstyled candidate → emergency manual rollback to the previous release). Source: Context block of `handoff/pending/2026-09-28_016_waoengineer_fix-atomic-activation-rollback.md` (Board-sourced narrative, consistent with observed origin history). **Hypothesis:** the root failure class was deploy-script process management on a 3.7 GiB host, not the homepage itself. Four targeted repairs (`ec56bfc`, `f8e38f9`, `c2a2494`, `9bebcfe`: runtime-data symlink, invalid route export, bounded Webpack heap, singular `replace_wao_process()` + `verify_homepage_assets()` + corrected rollback — all present in origin's `deploy.sh`, Observed via grep at lines 11/73/83/99/134-137/193) now exist but **have only been exercised in synthetic harnesses** (Board claims). The single step converting five done cards into customer value is one successful owner-run deployment.

2. **Copy ownership oscillated and the requested Qwen pass never ran.** Timeline (Observed from files + Board): the committed Astra top-page copy records `"authoring_model": "gpt-6-sol"` (`docs/copy/astra-authority-first-homepage-copy.json:7`, SHA-256 `4668a79f…`; backup `pre-sharp-sabra` `c8588606…` also gpt-6-sol). Card `t_2952011d` (done) captured an owner correction to use waocopy's GPT-6 Sol profile and "do not use Qwen"; handoff `2026-09-28_006` (sharp Sabra pass) was authored with `Dispatch Approved: no` and **remains pending — never dispatched**. The current task instruction reverses that: Qwen 3.8 Max is the requested Hebrew copy owner. Net effect: the committed homepage copy has **no completed owner-requested Qwen pass and no completed sharp-Sabra pass of any model**; Eitan rejected the earlier copy as over-explained and AI-patterned (`2026-09-28_006` Context).

3. **waocopy profile configuration is internally inconsistent** (Observed, read without exposing secrets):
   - `~/.hermes/profiles/waocopy/config.yaml` → `model.default: gpt-6-sol`, `provider: openai-codex`, context_length 1,000,000 (the effective Hermes config).
   - `~/.hermes/profiles/waocopy/profile.yaml` → `model: alibaba/qwen3.8-max` (stale/contradictory metadata).
   - `.env` exists with **non-empty** `QWEN_API_KEY`, `DASHSCOPE_API_KEY`, `QWEN_BASE_URL` (presence/emptiness checked by pattern count only; values never read). `auth.json` exists for the codex provider.
   - Conclusion: **Qwen credentials are configured; the profile default model is not Qwen.** No access block found. To honor the Qwen-copy-owner instruction, either config.yaml must be restored to `alibaba/qwen3.8-max` (owner/ops action — not done here) or each copy card must pin `model: qwen3.8-max, provider: alibaba` via `kanban_create` overrides. AGENTS.md still documents waocopy as Qwen 3.8 Max, matching the instruction.

4. **The verification/preview surface degraded underneath the mission** (Observed, section 1). Empty `node_modules` + crash-looping QA service + broken `hermes` CLI mean: (a) owner review of copy now has no live preview page; (b) any local acceptance must run in disposable worktrees after a fresh `npm ci`; (c) dispatch itself is fragile until `hermes update` completes or is rolled back. **Hypothesis:** the node_modules wipe at 2026-09-28 15:49 coincides with the homepage-release worktree operations; whatever pruned it also killed the QA service's runtime.

5. **The live old homepage carries claim risk.** The pre-Astra homepage publicly renders three named testimonials with specific results (דנה כהן — "18,000 כניסות בחודש"; יוסי לוי — "עלות ההמרה ירדה ב-60%"; מיכל ברק — "ROI מדיד", `src/components/Testimonials.tsx:5-7`). The Astra claim boundaries explicitly forbid inventing customer identities, quotations, and results (`docs/copy/astra-authority-first-homepage-copy.json:39`). Whether these three are real documented customers is **unproven in this task**; if they are illustrative, production is currently displaying exactly the class of claim the new homepage was built to remove. Deploying the Astra candidate retires them.

---

## 3. What remains unproven

| # | Item | Status |
|---|------|--------|
| 1 | Deploy repair chain (`ec56bfc`→`9bebcfe`) against the real host | Synthetic harness only (Board claims); never activated in production |
| 2 | Owner acceptance of final homepage copy | The gpt-6-sol sharp-Sabra pass was never dispatched; the Qwen-owner pass never ran; Eitan's last recorded verdict on the prior copy was rejection (`t_2952011d` body) |
| 3 | Customer video full-content people/minors review | `docs/research/astra-real-proof-source-manifest.json:20`: "Not independently reviewed"; founder spot-check required before publication |
| 4 | Google Partner directory status freshness | Last observation 2026-09-24 (manifest `partner.observation_date`); badge bytes hash-pinned (`dfde4673…`, `badge_bytes_unmodified: true`) |
| 5 | Local test/build health | Cannot run: `node_modules` empty; QA preview service dead |
| 6 | Live testimonials' authenticity | Unverified; public exposure risk |
| 7 | `/site-bot` supporting-route offer consistency | Live page contradicts locked ₪199/mo offer (Observed "1,490" ×14) |

---

## 4. Safest stepwise recovery & improvement plan

Conversion architecture is already correct in the pushed candidate and needs no redesign: hero CTA, Header CTA, paths card, and final CTA all route to `/google-ads/onboarding`; the second paths card routes to `/site-bot/start`; supporting links `/google-ads`, `/site-bot`, `/about`, `/contact#contact-form` (Observed in `AstraHome.tsx` + copy JSON `exact_destinations`). The video renders as an immediately available, lazy, non-autoplay `youtube-nocookie` iframe (`zrgqx7OOtcc`) with a direct link and **no click barrier and no disclaimer-heavy visible copy** — only a heading and one context line (Observed `AstraProofVideo.tsx`, `video_proof` block). Partner proof is one compact factual block: badge + status line + directory link, near the founder, no legalistic stack (Observed `AstraHome.tsx:190-197`).

**Step 0 — Restore the local execution surface (engineer card, no production touch).**
`npm ci` in `/home/eitanya/wao`; run canonical `npm run test` + `npm run build` once to establish a green baseline; repair or formally retire `wao-qa-4017.service` (restart requires fresh owner authorization per `astra-preview-restart-policy-recovery-decision-2026-09-28.md`; simplest compliant path: owner authorizes one restart, or the service is stopped and preview moves to disposable-worktree servers). Also resolve the broken `hermes update` state (finish or roll back) so dispatch stops crashing. Prerequisite for everything else.

**Step 1 — Owner decision gate: redeploy `origin/hermes-migration@9bebcfe` now, or after copy refresh.**
Only Eitan deploys. Two defensible orders:
- (a) **Deploy now** (recommended if the claim risk in §2.5 weighs heaviest): publishes the verified Astra homepage, retires the named-testimonial old page, activates all four deploy repairs, and restores the two priority CTAs. Copy can then be improved incrementally on top.
- (b) **Copy first**: run Steps 2–3, land one narrow copy-commit, deploy once. Slower public fix; keeps the risky old testimonials live longer.
The deploy itself now has fail-closed gates: singular-process assertion, homepage asset check, verified rollback (Observed in origin `deploy.sh`).

**Step 2 — Qwen-owned copy pass (waocopy on Qwen 3.8 Max, per current owner instruction).**
One Contract v3 card: back up and replace only `docs/copy/astra-authority-first-homepage-copy.json` (pin current SHA-256 `4668a79f686a2807f3628c8006555600ad8b91ca44d5f235af1633629eab5e51`); preserve schema, SEO-anchor references, `exact_destinations`, and every claim boundary byte-for-byte; voice spec = the sharp-Sabra requirements already written in pending handoff `2026-09-28_006` (its style rules are model-agnostic and reusable; its "do not use Qwen" clause is superseded by the current instruction and must be rewritten, not copied). Dispatch with `model: qwen3.8-max, provider: alibaba` pinned on the card until config.yaml is restored (owner/ops action). Per waocopy spec discipline: anchors + persona + offer only; waocopy decides length/structure.

**Step 3 — Gates: `waohebrewqa` material-issue review → owner (Eitan) acceptance → `waoengineer` byte-exact patch.**
Engineer consumes approved JSON bytes only (zero Hebrew typed), copies into `src/content/astra-authority-first-homepage-copy.json`, keeps `homepage-astra.contract.test.mjs` 12/12 green, runs focused + canonical tests and build in a disposable worktree based on current origin, pushes one narrow commit. Then one independent verifier card (runtime, routes, metadata, video non-autoplay, RTL) and one `waouxtester` visual pass at 1440×1000 / 390×844 / 320×700.

**Step 4 — Video and Partner freshness (before or with publication).**
Founder spot-check of the full video content (people/minors) per manifest requirement; re-observe the Partner directory listing and refresh `observation_date`; keep badge bytes hash-pinned. No visible copy changes needed — current presentation already matches the authority-first decision.

**Step 5 — Supporting-route consistency.**
Separate narrow copy card to align `/site-bot` public pricing with the locked ₪199/month offer (owner approval required per bottleneck scan §6.4). Until then, `/site-bot/start` (the homepage destination) is the priority surface; verify its intake flow renders the current offer, not the legacy one.

**Non-goals:** no shared-worktree mass reconciliation; no revival of the 145-file pending queue in filename order (REVIEW_REQUIRED archive); no agent-run deployment or production SSH; no credential/profile changes inside copy or engineer cards; no new offers or third paths on the homepage.

---

## 5. Bounded skill-capability audit (read-only; per operator note)

### 5.1 How skills are installed per profile (Observed)
Each Hermes profile loads skills from its own directory: `~/.hermes/profiles/<profile>/skills/<category>/<skill-name>/SKILL.md`. A skill "available to the orchestrator" is simply present under `~/.hermes/profiles/orchestrator/skills/`; it is **not** visible to `waocopy`/`waoengineer`/verifiers unless copied into their directories. Making a skill accessible to a profile = copy the skill directory into that profile's `skills/` tree (same relative category path), then verify with a `skills_list` run on that profile or a directory check. `kanban_create(skills=[...])` force-loads by name and **hard-crashes dispatch if the name is not installed on the assignee profile** — proven by `t_74fa76ec`: `hermes-kanban-dispatch` exists only under the orchestrator profile, and both waostrategy runs died with `Error: Unknown skill(s): hermes-kanban-dispatch` (Board events, Observed). Rule: never force a skill name without first verifying it exists in the assignee's own skills tree; prefer not forcing at all (workers can load relevant skills themselves).

### 5.2 Present per profile (Observed inventory, deduplicated)
- **All worker profiles** (waocopy, waohebrewqa, waoengineer, waoverifier, waouxtester): the full generic library (apple, creative incl. `humanizer`, github, productivity, research incl. `grounded-citations`, software-development incl. `nextjs-route-verification`, `production-deployment`, `systematic-debugging`, `test-driven-development`, `requesting-code-review`, `dogfood`, `hermes-agent-skill-authoring`, `web/blocked-page-recovery`).
- **waostrategy extra (profile-exclusive):** `software-development/wao-contract-handoff-authoring`, `software-development/local-seo-geo-architecture`, `software-development/outcome-oriented-system-recovery`, `software-development/approval-gated-operator-rollouts`, `design-research/ux-art-direction-audits`. (Also `.archive/nextjs-demo-sandbox-flows` — archived, not loadable.)
- **waoengineer extra:** `software-development/dataforseo-research-adapter`.
- **orchestrator-only (NOT on any WAO worker):** `wao/wao-kanban-orchestration`, `wao/wao-agent-progress-supervision`, `wao/wao-external-source-analysis`, `autonomous-ai-agents/hermes-kanban-dispatch`, `autonomous-ai-agents/hermes-profile-management`, `autonomous-ai-agents/hermes-memory-provider-configuration`, `software-development/shared-worktree-release-candidates`, `software-development/staged-precommit-review`.
- **Default shared tree (`~/.hermes/skills/`, not mirrored into worker profiles):** `software-development/multi-profile-agent-orchestration`, `software-development/live-preview-release-verification`, `software-development/static-marketing-site-development`, `github/static-site-review-deployment`, plus a `marketing/` directory that exists but is **empty** (Observed).

### 5.3 High-value role-specific recommendations (evidence-linked; no installs performed)
| Profile | Add | Why (evidence from this mission) | Setup + verification |
|---|---|---|---|
| waoengineer | `shared-worktree-release-candidates` (copy from orchestrator) | Every homepage/deploy card hand-rolled the disposable-clean-worktree-from-origin pattern (handoffs 011–016); the skill codifies exactly this | Copy dir → run a trivial engineer card → confirm `skills_list` shows it; do not force-load until confirmed |
| waostrategy | `multi-profile-agent-orchestration`, `live-preview-release-verification` (copy from default shared tree) | Dispatch-ordering/hold rules and "is the QA/preview release actually live" checks were repeatedly re-derived (the dead 4017 preview would have been caught by the latter's workflow) | Copy both dirs → `skills_list` on waostrategy |
| waoverifier / waouxtester | `live-preview-release-verification` | Verifier cards `t_600a118a`, `t_8219a66e` blocked over evidence ceremony about which runtime was live; a shared verification playbook reduces that class | Copy dir → confirm via `skills_list` |
| waocopy / waohebrewqa | `creative/humanizer` is already present — **use it explicitly in copy cards' instructions** (no install needed); optionally author a small `hebrew-sabra-copy` skill via `hermes-agent-skill-authoring` capturing the singular-male/12–15-word/no-AI-contrast-template rules from handoff 006 | The recurring rejection mode is AI-patterned Hebrew (`t_2952011d` body); a dedicated skill beats re-specifying style rules in every handoff | Author once (separate authorized task), install into both profiles, verify by `skills_list` |
| orchestrator/dispatchers | keep `hermes-kanban-dispatch` orchestrator-only | It documents dispatch from the orchestrator seat; the crash proves force-loading it elsewhere is fatal | No change; enforce the pre-flight name check of §5.1 |

Not recommended: installing the broad generic libraries' media/smart-home/social skills into worker profiles (context noise, no mission value); any profile/config edit inside read-only or copy cards.

---

## 6. Owner-only decisions required (Eitan)

1. **Redeploy now vs. copy-first** (§4 Step 1) — production currently shows the old homepage with unverified named testimonials and zero priority-route CTAs.
2. **Restore waocopy's effective model to Qwen 3.8 Max** (config.yaml edit or per-card model pin) so the requested copy owner matches configuration; credentials are already in place (Observed, §2.3).
3. **QA preview service**: authorize one `wao-qa-4017` restart (after Step 0's `npm ci`) or formally retire it in favor of disposable-worktree previews.
4. **Full-video people/minors spot-check** and Partner-directory freshness re-observation (§4 Step 4).
5. **`/site-bot` public pricing switch** to ₪199/month (§4 Step 5).
6. **`hermes` CLI repair** (finish or roll back the failed `python-olm` update) to stop dispatch crashes.
