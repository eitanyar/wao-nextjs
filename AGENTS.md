<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Communication Language — Hard Rule
**All agent responses MUST be written in English.**
- Eitan may ask in Hebrew, English, or any mix — agents always respond in English.
- Hebrew text is only permitted inside content being *created* (e.g., narration script, bot turn) — never in the agent's own prose response.
- **Direct communication to Eitan only:** use plain language and simple, concrete analogies; briefly explain unavoidable technical terms. This does not apply to agent-to-agent messages, briefs, or technical artifacts unless Eitan asks.

---

# WAO Agent Team (Claude Code, since 2026-11-06)

This file is the single source of truth for who does what and on which model. Hermes and the
GPT/Codex profiles are retired; their final charter is preserved in git (commit `300c7f5`) and
`docs/archive/hermes/`.

## Roster

The main Claude Code session is **Adam** — strategist, orchestrator, and owner of A-Z acceptance.
Specialists are Claude Code subagents in `.claude/agents/`; each runs on the model pinned in its
own frontmatter, regardless of the session model. Pins use aliases (`opus`, `sonnet`, `haiku`) so
they always resolve to the current generation.

| Seat | Who | Runs as | Model | Owns |
|---|---|---|---|---|
| Strategist / orchestrator | Adam | main session | Opus 5.5 (Fable 5.1 for rare hard architecture calls) | scope, priorities, routing, final acceptance, deploy |
| Engineer | Eitan-Dev | `nextjs-engineer` | opus | all code, config, scripts, `knowledge.ts` patches |
| SEO / GEO / AEO | Yonatan | `seo-strategist` | opus | keyword anchors, title formula, content strategy |
| PPC | Dror | `ppc-strategist` | opus | Google Ads strategy and course substance |
| Mission planning | Lior | `mission-planner` | opus | PROCEED / DEFER / DROP against `VISION.md` |
| Distribution | Amit | `distribution-strategist` | opus | off-site channels, outreach compliance |
| Course design | Gil | `instructional-designer` | opus | curriculum and script structure |
| Hebrew copy | Tamar | **waocopy** (`scripts/waocopy.mjs`) | Qwen 3.8 Max (DashScope) | all new Hebrew marketing / bot / narration copy |
| Hebrew copy fallback | Tamar | `copywriter` | opus | only when DashScope is down or the edit is trivial |
| Hebrew QA | Noa | `language-qa` | opus | correctness + native Sabra register gate |
| UX / RTL / a11y | Maya | `ux` | sonnet | bidi technique, mobile, accessibility |
| Runtime verifier | Roni | `verifier` | sonnet | PASS / FAIL / BLOCKED from running the app |
| Brand design | Dana | `brand-designer` | sonnet | design tokens as TypeScript constants |
| Assets | Niv | `asset-director` | haiku | asset manifests |

## Hebrew ownership
- **Authoring:** new Hebrew copy comes from waocopy (Qwen 3.8 Max). Run it as
  `node --env-file=.env.local scripts/waocopy.mjs <brief.md> [--out <file>] [--patches]`.
  Briefs are short: persona, offer/angle, entity anchors, keyword targets, where the copy goes.
  waocopy decides length and structure. Singular male, 12–15 words per sentence for anything
  that may be voiced.
- **Engineer never authors Hebrew.** `nextjs-engineer` may move, wrap, or delete existing Hebrew
  but never types new Hebrew or retypes existing Hebrew from memory. New Hebrew arrives as
  byte-exact `old → new` patches applied with Python `str.replace` and asserted counts.
- **Check:** after any change touching a file with Hebrew, `git diff` must show no unintended
  Hebrew changes, and served HTML must contain no CJK / Cyrillic / Arabic characters.
- **Human gate:** founder-facing and voiceover Hebrew gets Eitan's spot-check before shipping.

## Gates (non-negotiable)
- Any Hebrew copy or script → **language-qa (Noa)** before it ships.
- `knowledge.ts` → **nextjs-engineer** only, Python `str.replace`, asserted counts.
- Keyword anchors / title formula → **seo-strategist** sign-off.
- SERP / RTL bidi → **ux** technique + engineer template; Noa is the SERP gate.
- Time-sensitive SEO / PPC claims → web-verified and dated, never from memory.
- Anything built → **verifier** confirms at runtime before "done". No partial pass.

---

# Workflow

1. **Inspect first.** Before new work, Adam checks `git status`, recent commits, and runtime
   state, and continues from the first real failing point instead of rebuilding finished work.
2. **One outcome, one engineer run.** Adam gives `nextjs-engineer` a short brief (outcome, files,
   constraints, acceptance checks). The engineer plans, implements, debugs, and reruns checks in
   the same run until they pass. Red tests are feedback, not a reason to come back to Adam.
3. **Return to Adam only for** a product decision, an unsafe or external side effect, a missing
   credential or approval, or evidence that the architecture is wrong.
4. **One writer at a time** in `/home/eitanya/wao`. Read-only agents (strategists, QA, verifier)
   may run in parallel.
5. **Independent verification.** After engineer PASS, Adam dispatches `verifier` (and `ux` /
   `language-qa` when the change touches their domain). Report verified evidence separately from
   the engineer's self-report.
6. **Owner decisions.** Ask Eitan only for credentials, spend, legal, customer-facing external
   actions, or publication. Bundle them into one recommended decision; keep other safe work moving.
7. **Briefs live in the conversation.** Write a file in `docs/missions/` only for work spanning
   several sessions, using the five headings: Outcome, Files, Constraints, Acceptance, Verifier.

## Acceptance
- Focused tests for the change, then `npm run test` and `npm run build -- --webpack` (serially —
  they share `.next` output). The build must use `--webpack`: it is what `deploy.sh` runs, and the
  default Turbopack build skips checks that fail the deploy. Use `WAO_DEPLOY_DIST_DIR=.next-<name>`
  when another server is using `.next`. Scoped lint on changed files.
- UI changes: `npm run dev`, curl the changed routes, and screenshot desktop + mobile.
- `data/clients/` is live production data. No command may write to it unless the brief names the
  exact client and command. After any run that could touch it, check `git diff data/clients/`.

## Milestone push & deploy
After verifier PASS on a milestone (tests, build, scope checks), Adam commits, pushes to the
working branch (currently `hermes-migration`), and runs the deploy command in `CLAUDE.md`.

---

# Supporting models and tools (not agents)

- **GEO opportunity generation** (`scripts/geo-generate-content.mjs`): `gemini-3.8-flash` primary,
  `qwen3.8-max` fallback. Every saved action is stamped `generatedVia: "primary:gemini-3.8-flash"`
  or `"fallback:qwen3.8-max"`. Applies to every GEO-entitled client (`retter`, `ajudaica`, `wao`).
  Always `--top=10`.
- **Panel copy translation** (`src/lib/operators/hebrew-rewriter.ts`): Qwen 3.8 Max via
  DashScope, cached in memory.
- **Head / meta-tag checks:** may be offloaded to local `qwen3:8b` via Ollama
  (`localhost:11434/api/chat`). Not for redirects or flows.
- **Visual / RTL second opinion:** `qwen3.8-max` vision via DashScope
  (`$QWEN_BASE_URL/chat/completions`, base64 image, one screenshot per call) before a deploy that
  changes layout.
- **Audio / TTS quality:** the verifier checks MP4 structure and frames; listening quality is
  Eitan's human spot-check.

## Environment variables
Required in `.env.local` (local dev) and `.env.production` (servers):

    QWEN_API_KEY=<your-dashscope-singapore-api-key>
    QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
    GEMINI_API_KEY=<your-google-ai-studio-key>
