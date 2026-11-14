# Qwen4 Max Preview: offload map and test plan (2026-11-14)

Author: Eitan-Dev (nextjs-engineer). This is read-only analysis: no repo edits and no Hebrew authored.
Probe artifacts are in `/tmp/claude-1000/-home-eitanya-wao/0a21cb1e-d8ea-461c-98c0-1254f3ed5b6d/scratchpad/probes/`.

---

## 0. Read this first: the terms finding outranks every offload

I re-fetched the token-plan terms page today
(help.aliyun.com/en/model-studio/token-plan-personal-overview). It says:
- The plan is "intended for interactive use only within coding tools and agent tools" (Claude Code, Cursor, Qwen Code and similar).
- It "must not be used for automation scripts, custom application backends, or any non-interactive batch call scenarios."
- "Model inputs and model-generated content will be used for service improvement and model optimization."
- Out-of-scope use "may result in subscription suspension or API Key banning."

All production Qwen traffic runs on this one token-plan key today. AGENTS.md specifies the same
`QWEN_BASE_URL=https://token-plan…` for `.env.production`, and `scripts/site-bot-research-to-site.mjs`
refuses to run against any other host. Production call sites:

| Path | What it does | Model | Terms status |
|---|---|---|---|
| `src/app/api/site-bot/generate/route.ts` → `src/lib/lp/researchPageCopy.ts` | Generates Site Bot client sites (paid product, launches 29.11) | qwen3.8-max | **Violation: app backend** |
| `src/app/api/site-bot/deploy/route.ts` → `src/lib/lp/coreThirtyCopy.ts` | Core-30 page copy, with Qwen as both "Tamar" and "Noa" | qwen3.8-max | **Violation: app backend** |
| `src/app/api/bot/route.ts` (`callQwenChatJSON`, preferred when the key is set) | Live site chat bot | qwen3.8-flash | **Violation: app backend** |
| `src/app/api/gbp/review-reply/route.ts` → `src/lib/gbp/reviewResponder.ts` | GBP review reply drafts (customer PII in inputs) | qwen3.8-max | **Violation; PII goes into a plan that trains on inputs** |
| `src/app/(product)/client/dashboard/page.tsx`, `admin/review/[clientId]` → `src/lib/operators/hebrew-rewriter.ts` | Panel task translation | qwen3.8-max / qwen3.7-plus | **Violation: app backend** |
| `src/app/api/geo/admin-action/[id]/critic/route.ts` → `src/lib/geo/critic.ts` | GEO distinctiveness critic | qwen3.7-plus | **Violation: app backend** |
| `scripts/cron/qwen-health-check.sh`, `scripts/cron/regenerate-geo.sh` (Qwen as fallback) | Cron jobs | qwen3.8-max | **Violation: automation / batch** |
| `scripts/waocopy.mjs` (`--writer qwen`, Opus fallback), Qwen second-pass trial | Scripted calls that a human triggers from Claude Code | qwen4-max-preview | **Grey area**: a human starts it from an agent tool, but it is a custom script, not Qwen inside a supported tool |

**Why this matters more than any token saving:**
1. A key ban would take down Site Bot generation, the live bot, review replies, panel translation
   and the waocopy fallback all at once. That is a single point of failure two weeks before launch.
2. `src/lib/legal/siteBotTerms.ts` lists Alibaba Cloud (Qwen, Singapore) as a processor. The token
   plan's input-training clause probably conflicts with what clients are told about their data,
   reviews and customer names. This needs the lawyer.
3. Moving more work onto the token plan makes this exposure larger.

**Recommended decision for Adam to bundle to Eitan (spend and legal):** move every production or
cron call site to a metered DashScope key (`dashscope-intl`, pay-as-you-go; check whether it has a
no-training clause) or to Gemini. Keep the token plan only for human-in-the-loop work started from
an agent tool. Engineering cost is small: one `QWEN_PROD_BASE_URL`/`QWEN_PROD_API_KEY` pair read by
`qwen-fast.ts`, `hebrew-rewriter.ts` and `reviewResponder.ts`. Qwen4-preview metered pricing and its
availability on intl are **unverified**; check them before planning on it.

**Terms grading used below:**
- **Low:** Adam or an agent runs it interactively inside Claude Code, a human reads the output, and it is ideally run through Qwen Code CLI.
- **Medium:** a human triggers a custom script.
- **High:** unattended, production, cron or batch.

---

## 1. Inventory: where premium Claude does work today

### 1a. Subagent seats (`.claude/agents/*.md` frontmatter)
| Seat | Pin | Main work | Notes on offloadability |
|---|---|---|---|
| Adam (main session) | Opus 5.5 | Orchestration, acceptance, diff review, log triage, screenshot and contact-sheet review, JSON checks, long-file summaries, blind-test keying | **Largest offload surface** (section 3) |
| nextjs-engineer (Eitan-Dev) | opus | Code, config, knowledge.ts patches | Writing code stays on Claude: the Qwen coder corrupted Hebrew three times (`26034e5`, `74a7c59`, memory `feedback_additive_only_structural`). **Review-only** offload is possible. |
| language-qa (Noa) | opus | Hebrew correctness gate | **Gate: never offload.** Pattern mining for writing upgrades could get a first draft. |
| copywriter (Tamar fallback) | opus | Rare fallback | Already a fallback |
| seo-strategist (Yonatan) | opus | Anchors, title formula | Decisions stay. SERP/keyword data digestion could get a first draft. |
| ppc-strategist (Dror) | opus | Ads strategy | Decisions stay; time-sensitive claims need the web, which Qwen API calls don't have |
| mission-planner (Lior), distribution (Amit), instructional-designer (Gil) | opus | Planning | No evidence for Qwen here; keep |
| verifier (Roni) | sonnet | Runtime checks with tools | Needs tools; only the screenshot-judgement step is offloadable |
| ux (Maya) | sonnet | RTL/bidi/a11y | Screenshot defect scan offloadable as a first pass |
| brand-designer (Dana) | sonnet | Design tokens | Low volume; not worth it |
| asset-director (Niv) | haiku | Manifests | Already cheap |

### 1b. waocopy (`scripts/waocopy.mjs`, commit `fb284e3` today)
Default writer is now Opus 5.5 through the headless `claude` CLI. Qwen4 is used with `--writer qwen`
and as the automatic fallback. Note that Qwen runs with `reasoning_effort: high` by default
(`args.effort = 'high'`), and that is the cause of the 7–9 min runs (see probe P8).

### 1c. Work already off Claude
| Work | Model | Where |
|---|---|---|
| GEO generation | gemini-3.8-flash primary, qwen3.8-max fallback | `scripts/geo-generate-content.mjs` |
| Live chat bot | qwen3.8-flash preferred, gemini-3.8-flash otherwise | `src/app/api/bot/route.ts` |
| Site Bot / Core-30 generation | qwen3.8-max | `researchPageCopy.ts`, `coreThirtyCopy.ts` |
| Review replies, panel translation | qwen3.8-max | `reviewResponder.ts`, `hebrew-rewriter.ts` |
| GEO critic | qwen3.7-plus | `src/lib/geo/critic.ts` |
| Podcast titles, trainer, inner coach | gemini-3.8-flash | `src/lib/podcast-title/*`, `src/lib/trainer/*`, `src/lib/inner-coach/*` |
| Head/meta checks | local qwen3:8b (100%) | AGENTS.md |
| Interlink candidates | local bge-m3 (60%, suggestion only) | memory |
| Visual/RTL second opinion | qwen3.8-max vision (AGENTS.md) | ad hoc |
| Video | wan3.0-video on the token plan | `docs/missions/wan3-character-consistency-test-2026-11-14.md` |

---

## 2. Proven Qwen Max strengths → Qwen4 offload candidates

**Assumption (must be confirmed by the checks in section 5): where qwen3.8-max is proven, Qwen4
Max Preview is at least as good.** The repo and memory record the previous model as `qwen3.8-max`;
Eitan calls it "Qwen 3.9 Max". Qwen4 is a *preview* and may drift silently, so every "assume ≥"
needs a re-run cadence, not a one-time pass.

### Strengths (with evidence)
| # | Proven strength | Evidence | Qwen4 candidate | Probe today (indicative) |
|---|---|---|---|---|
| S1 | **Visual RTL defect detection.** 7/7 on a planted-defect page (3/3 defects, 4/4 clean), and the **only** model, including Sonnet 5 and Haiku, to catch horizontal overflow | memory `project_local_vision_verifier_unreliable` (2026-08-13); commit `e7f9344` (two-tier vision split) | Screenshot and contact-sheet first pass for Adam, Maya and Roni | P3/P4: 2/2 visible defects, 0/4 false FAILs on clean, **21–37s** (3.8 took ~100s) |
| S2 | **Natural Hebrew on short, structured jobs.** Cloud 3.8 beat local qwen3:8b on panel translation, and the team reverted to it | commits `2f20629` → `3f2726e`; `hebrew-rewriter.ts` | Already in production (terms issue). No new Claude saving. | n/a |
| S3 | **Keeps approved lines, price conventions and jokes; plainer native lines.** Qwen4 8.1 vs 3.8 at 5.75; 3.8 "over-rewrote" | `docs/copy/reviews/video-dash-scripts-r4-blind-noa-2026-11-12.md`; memory `project_waocopy_qwen4_default` | Patch passes and edits to existing copy (`--patches`), Ads Bot copy | n/a |
| S4 | **Ads Bot stories on par with Opus** (3–3 tie) | memory `project_blind_story_test_opus_vs_qwen4_2026_11_13` | Ads Bot first drafts / ideas | P8: low effort passes deterministic brief checks |
| S5 | **Critic on grounding and distinctiveness with thinking on** (the 3.7-plus dry run found the interlinking catch) | `src/lib/geo/critic.ts` header (2026-08-17 dry run) | Non-language critique axes in the second pass (section 6) | P2: found state/claim issues Noa did not flag |
| S6 | **Long context at a flat rate** (3.8: flat to 1M) | memory `project_model_cost_geometry` | Log and long-file digestion | P7: strong, evidence-cited triage of 14 KB of logs in 81s |

### Documented weaknesses (weighed the same way)
| # | Weakness | Evidence | Consequence for routing |
|---|---|---|---|
| W1 | **Reliability under real structured load.** 100% of real retter GEO generations timed out twice while trivial probes were fast | commit `25f4b52`; memories `project_qwen_outage_2026_08_14`, `project_geo_gen_gemini_primary_2026_08_15` | Never put Qwen on a critical path without a fallback and a timeout; it suits advisory roles only |
| W2 | **Loses on story concepts, especially Site Bot** (Opus 7/10 vs Qwen4 3/10; Site Bot 0/5) | memory `project_blind_story_test_opus_vs_qwen4_2026_11_13` | Do not offload Site Bot stories or concepts |
| W3 | **Qwen *coder* corrupts Hebrew when it writes files** (CJK, Cyrillic, Portuguese fragments; `\n`→`\\n` in a regex) | commits `26034e5`, `74a7c59`; memories `feedback_additive_only_structural`, `feedback_hebrew_edits_need_patch_not_retype` | Qwen may **read and review** code but never write code or files |
| W4 | **Calque idioms and register drift** in authored Hebrew | `src/lib/geo/critic.ts` header ("Qwen's own known weakness") | Noa stays the gate; Qwen-authored Hebrew always goes through her |
| W5 | **Latency at high reasoning** (3.8 vision ~100s; Qwen4 waocopy 7–9 min today) | memories; today's run | Use `effort=low` for first drafts and checks (P8: 81.6s) |
| W6 | **High run-to-run variance** (new today) | P2 vs P6: same input, recall 5/17 vs 10/17 | Every check must use ≥3 repeats, or a union or majority of runs |
| W7 | **Preview model drift** | memory `project_waocopy_qwen4_default` | Re-run a fixed canary set weekly |
| W8 | **Terms**: interactive-only plan | section 0 | Section 0 decision first |

---

## 3. Ranked offload map

Savings are estimates. Opus through Claude Code is subscription-metered, so "premium tokens" means
quota and context pressure, not dollars. The most valuable saving is Adam's main-session context,
because image and log tokens there push out working memory.

| Rank | Task | Current model | Qwen4 role | Expected saving | Quality risk | Terms risk | Confidence |
|---|---|---|---|---|---|---|---|
| 1 | Screenshot / contact-sheet / video-frame defect scan (Adam, Maya, Roni) | Opus 5.5 (Adam), Sonnet (Maya, Roni) | **Primary first pass**; Claude looks only at flagged frames plus a 1-in-5 spot check | ~1.5–2k image tokens per screenshot in Adam's context; a 12-cut sheet is ~20–30k. Est. 60–80% of Adam's image tokens. | Medium: preview drift, and overflow detection is not yet re-proven on Qwen4 at scale. Pair with a DOM `scrollWidth` check. | Low (interactive) | **High** (S1 + P3/P4) |
| 2 | Log triage and long-file digest (cron logs, build logs, GEO runs, long mission docs) | Opus 5.5 (Adam) | **First draft**; Adam reads the digest, and every quote is grep-verified by code | 5–20k tokens per log kept out of Adam's context. Est. 70–90%. | Medium: hallucinated causes. Mitigated by the deterministic quote check. | Low | **Medium-high** (S6 + P7) |
| 3 | Code diff bug-hunt before Adam's acceptance review | Opus 5.5 (Adam) | **Second opinion, run first**; Adam still reviews | Not a token saving; it catches misses earlier. Adam can skim instead of line-reading low-risk diffs. Est. 20–40% of review effort. | Low as an advisory: it never edits; false positives cost time | Low | **Medium** (P5: 3/3, 0 FP; n=1) |
| 4 | waocopy first drafts: Ads Bot copy, ideas/brainstorm, patch passes, at `effort=low` | Opus 5.5 (today's default) | **First draft** for Ads Bot, brainstorm and patch passes; Opus keeps Site Bot and stories | ~16k in + 5–10k out of Opus per brief; small. Main gain is a second, different draft to pick from. | High for stories (W2); unknown at low effort | Medium (scripted) | **Low-medium** (S3/S4 vs W2) |
| 5 | Hebrew pre-screen *before* Noa (flag list for Noa) | none (Noa reads cold) | **Second opinion** | Noa still reads everything, so the saving is fewer Noa rounds, not tokens | Medium: recall 29–59%, high variance; risk that Noa anchors on its list | Medium | **Low.** Park it until the second-pass trial reports. |
| 6 | Writing-upgrade pattern mining across `docs/copy/reviews/*` | Noa (Opus) | **First draft** of candidate rules; Noa approves | One long-context read of ~25 reviews per batch | Low: Noa filters every rule; watch for rules that leak examples (memory `feedback_rule_examples_leak_into_output`) | Low | Medium |
| 7 | SERP / keyword / DataForSEO JSON digestion for Yonatan | Opus | **First draft** summary; Yonatan decides | Large JSON kept out of Opus context | Medium: number misreads (check numbers deterministically) | Low | Low-medium |
| 8 | Blind-test shuffling/keying, JSON validity, word counts, gershayim, double spaces, Hebrew-diff guard, CJK/Cyrillic/Arabic scan | Adam (Opus) by hand | **None: route to code.** Memory `project_local_model_offload_results`: models scored 75–92% on these; code scores 100% | All of it | n/a | n/a | **High.** Build a `scripts/copy-lint.mjs`-style checker. |
| 9 | Production Qwen paths (Site Bot generation, review replies, panel, critic): upgrade 3.8 → Qwen4 | qwen3.8 / 3.7 | Do not upgrade until section 0 is resolved; a preview model in production adds drift risk | none (not Claude) | High (preview drift) | **High** | n/a |

**Do not offload:** Noa's gate, knowledge.ts patches, any code or file writing (W3), Site Bot stories
and concepts (W2), strategist decisions, time-sensitive SEO/PPC claims (no web), runtime
verification (needs tools), and anything founder-facing without Noa and Eitan.

---

## 4. Probe results (8 Qwen4 calls, indicative only, n=1 each)

| ID | Hypothesis | Setup | Result |
|---|---|---|---|
| P1 | Model available on the plan | `GET /models` | qwen4-max-preview listed, plus qwen3.8-max, wan3.0-video and others |
| P2 | Qwen4 as a Noa pre-screen (default effort) | Real draft `docs/copy/site-bot-account-page-hebrew-2026-11-14.waocopy.json` (54 strings); Noa's charter and writing-upgrades as system prompt; graded by key against Noa's 17 fixes in `docs/copy/reviews/noa-site-bot-account-page-2026-11-14.md` | **Recall 5/17, precision 5/6, 152s** (11.6k reasoning tokens). The extra flag (`state.cancelScheduled`, "scheduled cancel shown as already cancelled") is a plausible real issue Noa did not raise. |
| P6 | Same as P2, `effort=low` | Same input | **Recall 10/17, 60s.** 4 extra flags, including `cardUpdateNeeded.body1` (possible "postponed vs declined" meaning flip) and dangling objects in `magicLink.body` / `renewal.body`. The two runs differ sharply, which is evidence of high variance (W6). Low effort was not worse here. |
| P3/P4 | Vision RTL defect scan | 390px puppeteer screenshots of a static page built from *existing* repo Hebrew: (a) 620px card overflow, (b) mojibake card, (c) bidi-paren plant that turned out **not** visibly broken (excluded), plus a clean control | Defect page: overflow FAIL with the correct card named, garbled FAIL; clean page: 4/4 PASS. **21s and 37s.** |
| P5 | Diff bug-hunt | `git show fb284e3 -- scripts/waocopy.mjs` with 3 planted bugs: `&&`/`\|\|` precedence, `lines.length` off-by-one, removed `clearTimeout` in `close` (hangs the CLI for TIMEOUT_MS) | **3/3 found, 0 false positives, 54s**, each with a correct mechanism explanation |
| P7 | Log triage | `handoff/usage/2026-08-14_016_geo-regenerate-retter.log` + `2026-08-15_022_geo-gen-gemini-primary-run.log`, no hints | Correct: Tamar timeouts after crawl and lexicon succeeded; it did not over-claim a cause. It also found 3 secondary anomalies: summary says "Generated: 10" while 8 items carry schema BLOCKERs; confidence 100 even on blocked items; repeated URL across "non-overlapping" facets. 81s. |
| P8 | Latency is caused by the effort setting | `waocopy.mjs docs/copy/briefs/offload-test-2026-11-14.md --writer qwen --effort low` | **81.6s** vs 7–9 min at the default `high`; about Opus's 65–80s. Deterministic brief checks (12 ideas, 3 best, 4 bullets, T4 60–90 words, no CJK/Cyrillic/Arabic, no ASCII gershayim, no double spaces, no WAO or ₪ in client copy) pass for Qwen-low, Qwen-high (today) and Opus (today). Quality not judged. |

Side finding: 34 of the `docs/copy/*.json` files start with the English "Angle:" line
before the JSON (by design, per the system prompt), and 1
(`site-bot-redesign-ui-labels-r2-2026-11-12.waocopy.json`) is not JSON at all. Any deterministic
check must parse from the first `{`, as waocopy itself does.

P7's anomalies in the GEO pipeline (summary overstates success; confidence ignores the BLOCKER) look
like real bugs in `scripts/geo-generate-content.mjs` as of August. They are worth a separate ticket
if they still reproduce.

---

## 5. Falsifiable checks for the top 6

Shared rules:
- Every item runs **3 times** (W6) and reports the per-run score and the union.
- Run at `effort=low` unless the test is about effort.
- Every model claim that quotes the input is **grep-verified** by code. A fabricated quote fails the item.
- Log each run as one JSONL line `{test, item, run, model, effort, secs, tokens, request_id, score, notes}` under a ledger path Adam picks (suggestion: `docs/evals/qwen4-offload/<test>.jsonl`, plus a one-line verdict row in a `README.md` there). Keep artifacts in a scratchpad.
- Assume nothing transfers from 3.8. A test passes only on Qwen4 numbers.
- Repeat a 5-item canary from each test **weekly** (preview drift, W7).

### C1. Screenshot defect scan (rank 1)
- **Sample:** 24 screenshots at 390px and 1280px.
  - 12 clean: real routes (`/`, `/site-bot`, `/site-bot/audit`, `/google-ads`, `/knowledge/<2 slugs>`, `/account`) from the dev server.
  - 12 defective: the same routes with one injected defect each, through a puppeteer `page.addStyleTag`/DOM mutation. Defect types: fixed-width overflow ×3, mojibake (UTF-8→latin-1 of an existing string) ×3, `<bdi dir="ltr">` wrapped around an existing *Hebrew-led* parenthetical ×2 (verify the mirror is actually visible first, which P3 showed is not guaranteed), `direction:ltr` on a body paragraph ×2, clipped text via `overflow:hidden; height` ×2.
  - Plus 6 real frames from the Dash video contact sheets.
- **Scoring:** deterministic against the injection key, per check (PASS/FAIL JSON as in P3).
- **Baseline:** the same 24 through the verifier's Sonnet. Independently of both models, run a DOM `document.documentElement.scrollWidth > innerWidth` check as the overflow ground truth.
- **Pass:** ≥ 95% defect recall over 3 runs (majority vote); 0 false FAILs on clean images in the majority vote; Qwen4 recall ≥ Sonnet's.
- **Judge:** deterministic.
- **Cost/time:** 72 calls at ~30s, concurrency 3, about 15 min; token plan. About 1 h of engineer harness work (the P3 harness is a start: `probes/shot.cjs`, `probes/q.mjs`).

### C2. Log triage and long-file digest (rank 2)
- **Sample:** 8 real logs or long docs with a known answer:
  - `handoff/usage/2026-08-14_016_geo-regenerate-retter.log` (Qwen timeouts)
  - `2026-08-15_021_gemini-env-fix.log` (stale env override, per `25f4b52`)
  - `retter-autoretry-status.log`
  - `2026-08-15_019_qwen-health-check.log`
  - two GEO-gen client logs
  - one long mission doc (`docs/missions/site-bot-full-system-launch-2026-11-19.md`) with the question "list the open items"
  - one build log containing a known historical failure (the next-server tracing crash, memory `project_next_server_tracing_exclude_trap`)
- **Scoring:**
  1. Deterministic: every quoted evidence string must occur verbatim in the input. Pass = 100%, no exceptions.
  2. Adam grades root cause blind against a pre-written answer key (written before any run): correct / partial / wrong.
- **Pass:** ≥ 7/8 correct (partial = 0.5) in 2 of 3 runs, and zero fabricated quotes.
- **Cost/time:** 24 calls at ~80s, about 30 min wall; Adam ~20 min writing the key and grading.

### C3. Diff bug-hunt (rank 3)
- **Sample:** 10 recent real commit diffs (e.g. `fb284e3`, `c80b4ca`, `0b49183`, `3ca838f`, `5011418` and 5 older). Apply a mutation catalogue by script with asserted counts, 1–3 per diff: precedence flip, off-by-one, removed `await`, removed `clearTimeout`, inverted guard, swallowed `catch`, wrong env-var name, **one changed Hebrew byte inside an existing string** (tests whether it notices Hebrew drift; the deterministic Hebrew-diff guard remains the real control). Add 5 unmutated diffs as controls.
- **Scoring:** deterministic. A hit means the returned `line` equals a mutated `+` line. A fabricated line (not in the diff) counts as a false positive.
- **Pass:** recall ≥ 80% across mutations (majority of 3 runs), on average ≤ 1 false positive per clean diff, 0 fabricated lines.
- **Judge:** deterministic. Adam spot-reads the false positives; some may be real bugs, which count in Qwen's favour after Adam confirms.
- **Cost/time:** 45 calls at ~60s, about 25 min; 1 h of harness work.

### C4. waocopy first draft at low effort (rank 4)
- **Sample:** 6 real briefs from `docs/copy/briefs/`, 2 per class:
  - Ads Bot story or short (`voice-test-15s-one-event-2026-11-14.md`, `voice-test-15s-story-rewrite-2026-11-14.md`)
  - UI microcopy or patches (`site-bot-terms-s16-support-2026-11-14.md`, a `--patches` brief)
  - Site Bot story (control, where Qwen is expected to lose) plus `offload-test-2026-11-14.md`
- **Writers:** Opus default, Qwen4-low, Qwen4-high. One run each for writing; variance shows up as the spread across briefs.
- **Scoring:**
  1. Deterministic pre-gate:
     - JSON parses from the first `{`
     - no CJK, Cyrillic or Arabic characters
     - no ASCII `"`/`'` between Hebrew letters
     - no double spaces
     - voiced lines ≤ 15 words
     - brief hard lines grep-checked (no price or WAO where forbidden)
     - patches' `old` strings exist byte-exact
  2. Noa scores blind: Adam shuffles and keys the outputs; Noa gives 1–10 plus a must-fix count per 100 words.
  3. Eitan picks blind on the story class only (his human gate).
- **Pass, per class:** Qwen4-low clears the pre-gate 100%, Noa's score ≥ Opus − 0.5, must-fix count ≤ Opus, and on stories Eitan prefers Qwen ≥ 40%. Expected result: pass on Ads Bot and patches, fail on Site Bot stories. A failure there confirms W2 and is a valid outcome.
- **Cost/time:** 18 runs, about 30 min wall; Noa one session; Eitan 10 min.

### C5. Second-pass value: historical replay before the live trial
The live 5-run trial is already decided (section 6). This replay only calibrates the prompt so the
live runs are not spent on a weak one.
- **Sample:** 6 past cases with a Noa-approved draft and a later shipped FINAL that changed something Noa did not catch:
  - `leads-mark-labels-real-2026-11-12.waocopy.json` → `-FINAL`
  - `site-bot-intake-owner-contact-domain-2026-11-12.waocopy.json` → `-FINAL`
  - `google-ads-clicks-to-leads-r2` → `-FINAL`
  - `site-bot-redesign-ui-labels` → `-FINAL`
  - `google-ads-hub-moment3-designed-to` → `-final`
  - Noa round-2/3 files: `docs/copy/reviews/noa-round2-final-2026-11-12.md`, `noa-round3-final-2026-11-12.md`
- **Ground truth:** strings changed between the Noa-approved version and FINAL, extracted by code.
- **Scoring:** deterministic match by key or quote, then Adam labels each Qwen note with the section 6 rubric.
- **Pass, to go live with this prompt:** ≥ 1 rubric-valid note in ≥ 3 of 6 cases, with a median of ≤ 3 rejected notes per case.
- **Cost:** 18 calls at ~60s; Adam ~30 min.

### C6. Variance and latency (cross-cutting; it decides how C1–C5 are run)
- **Sample:** the P2 input × 5 runs at low, 5 at medium and 3 at high.
- **Measures:**
  - recall and precision against Noa's 17 (deterministic)
  - wall time p50/p95
  - reasoning tokens
- **Pass for "single run is enough":** recall standard deviation ≤ 1.5 items. Otherwise run a union of 3 everywhere.
- **Pass for low effort as the default:** median recall at low ≥ high, and p95 ≤ 120s.
- **Cost:** 13 calls, about 20 min.

---

## 6. Second-pass QA trial (Eitan-decided; not re-proposed): prompt design and scoring

**Goal:** Qwen should look where Noa does *not*. Her gate already covers grammar, agreement,
typography, register, calques, the AI-signature sweep and the TTS sound check. P2 and P6 show where
Qwen adds something Noa did not raise: **state truth, meaning flips, dangling objects and
cross-string consistency.** Point the prompt only there.

**Inputs to send:**
- the Noa-approved final strings
- Noa's review, so Qwen knows what is already fixed
- the render context: which component or state each string appears in, and whether a message box or form exists in that state
- `docs/missions/claims-ledger-2026-11-12.md`
- the relevant terms sections

**What the prompt asks Qwen to look for (and nothing else):**
1. **State truth:** for each string, in every state it renders in, is every pointer and instruction true? ("the box above", "the form below", "write to support" when there is no box or form in that state, or for that plan).
2. **Meaning flip or misread:** a word or phrase an Israeli owner could read with a different meaning that changes what he believes or does. Examples: "declined" vs "postponed". For voiced copy, unvowelled homographs whose second reading changes the meaning.
3. **Fact and claim consistency:** numbers, durations, prices, dates and named features versus the claims ledger, the terms and the other strings in the same set (e.g. 30 days vs 30 minutes; "account page" vs "subscription management" naming the same screen differently).
4. **Dead ends:** a string that tells him to do something the surface does not let him do.
5. **Broken fragments:** dangling objects, missing subjects or placeholders (`{date}`, `{price}`) that read wrong once filled in or reused in another state.

**Explicit exclusions in the prompt:** grammar, typography, register, word choice and style
preferences; anything Noa's review already changed; praise; rewrites. Output English notes only.
Optional suggested wording goes to Tamar, not into the build.

**Output contract:**
`{"notes":[{"category":"state|misread|fact|deadend|fragment","key":"…","quote":"<exact substring>","reader_consequence":"<what he would wrongly believe or do>","severity":"must|should"}]}`.
At most 8 notes. An empty list is a valid and expected answer. Run at `effort=low` (P6: ~60s, so the
added dev time stays small).

**Deterministic pre-filter before any human sees a note (code, not judgement):**
- `quote` must occur verbatim in the copy, else drop it as fabricated.
- `key` must not be in Noa's fixed list, and `quote` must not overlap a Noa-changed string, else drop it as a duplicate.
- `category` must be one of the five, else drop it as out of scope.
- Log the count of dropped notes per reason.

**"Worth applying" rubric** (one adjudicator per note: Noa for misread/fragment, Adam for state/fact/deadend):
- A note is **worth applying** only if **all** of these hold:
  - (a) it survives the pre-filter;
  - (b) the adjudicator answers *yes* to: "If we ship without this change, would a real reader misunderstand, take a wrong action, hit a dead end, or see a false or inconsistent claim?";
  - (c) the change is actually applied, or an equivalent fix is made. "Agreed but deferred" counts only if a ticket names it.
- **Style-only or "nice to have" notes are never counts**, even when applied, because the ledger already says style preferences don't count. This keeps the score honest.
- **Run verdict:** "added value: yes" if ≥ 1 note is worth applying; otherwise "no".
- **Columns to add to the existing ledger** (`docs/copy/reviews/qwen-second-pass-trial.md`): notes raised / dropped by pre-filter (fabricated, duplicate, out of scope) / rejected by adjudicator / applied, adjudicator per note, Qwen wall seconds, adjudication minutes. "Extra time" = Qwen seconds + adjudication minutes, so the stop rule weighs the real cost.
- **Tie-breaker for consistency:** the adjudicator records the decision before seeing the severity Qwen gave, so a "must" label does not sway the call.

---

## 7. Open items and handoffs

1. **Adam → Eitan (decision):** move production and cron Qwen calls off the token plan to a metered key or Gemini, and get the lawyer to check the input-training clause against `siteBotTerms.ts`. Do this before the 29.11 Site Bot launch.
2. **Adam:** pick the ledger location for C1–C6, and consider running C6 first, because it sets the repeat count for everything else.
3. **Engineer (later, on approval):**
   - a deterministic copy-lint script (rank 8)
   - the C1/C3 harnesses
   - a `QWEN_PROD_*` env split
   - waocopy's Qwen default effort: `high` → `low`, after C4/C6
4. **Separate ticket:** the P7 GEO-pipeline anomalies (success summary ignores BLOCKERs; confidence ignores validation).
5. **Unverified:** Qwen4-preview metered price and intl availability; whether a team or enterprise token plan with backend rights exists.
