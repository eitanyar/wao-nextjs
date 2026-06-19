@AGENTS.md

# WAO — Project Constitution

Shared ground truth that **every agent inherits**. Keep it tight and durable; role-specific
craft lives in `.claude/agents/*.md`. *(Seed — being formalized as we build the agent framework.)*

## Stack & environment
- **Next.js 16.2.6** (Turbopack, App Router), React 19. Marketing site for **WAO** — a B2C
  digital-marketing agency. Hebrew, **RTL**. ~97 knowledge articles + service pages.
- **Dev server:** `npm run dev` → http://localhost:3000.
  - `next.config.ts` changes require a **server restart** to take effect.
  - If routes 404 after a hard kill of the server, the `.next` dev cache is corrupt → `rm -rf .next` and restart.
- **Deploy:** the user runs it — `ssh wao@91.98.195.242` → `cd ~/htdocs/www.wao.co.il` → `./deploy.sh`.

## Hard constraints (violating these is a failure)
- **`src/data/knowledge.ts`:** never edit with the Write tool or free-form. **Surgical Python
  `str.replace()` only.** Copy is authored by the copywriter as exact `old → new` strings; the
  nextjs-engineer applies them.
- **SEO keyword anchors** — page `<title>`, `<h1>`, hero badge head terms — never change without
  sign-off from the seo-strategist.

## RTL / Hebrew rendering
- **Article body bidi** is handled by `renderMixed()` in `knowledge/[slug]/page.tsx`: it wraps
  Latin runs in `<bdi dir="ltr">` and leaves brackets in the RTL flow so mixed-script parentheses
  mirror correctly. Regression check — must be 0:
  `grep -oP '<bdi dir="ltr">\([^)<]*</bdi>'` on a rendered page.
- **Meta-title / SERP bidi rule:** a Hebrew `<title>` must never end in a bare Latin token
  immediately followed by the Latin brand — they bidi-swap in Google's RTL results
  (`…ל-SEO | WAO` → `…ל-WAO | SEO`). Enforced by: (a) root template anchors the brand with an
  RLM — `"%s‏ | WAO"`; (b) titles stay concise (no redundant double-suffix) so Google keeps ours.
  **Final confirmation needs a live SERP / Search-Console re-check after deploy** — it can't be
  validated locally. Owners: **ux** (bidi technique) + **nextjs-engineer** (template);
  **seo-strategist** owns the title formula; **language-qa** is the SERP gate that catches it.
- **Typography:** em-dash ( — ) single-spaced; Hebrew gershayim (״)/geresh (׳), never ASCII
  `"`/`'`; no double spaces. Owner: language-qa.

## Copy & voice
- **Reader:** intelligent Israeli B2C business owner — ROI-minded, busy, allergic to jargon and
  to translated-from-English Hebrew.
- **Voice:** elite consultant over coffee — analogy-first, scannable, flawless native Hebrew.
  Full brief in `.claude/agents/copywriter.md`.
- **Positioning is per-page** (e.g. "outsourced marketing managers" on `/consulting`) — never
  globalized across the site without explicit intent.

## Agents
Specialists live in `.claude/agents/`. Orchestration via **"Adam"** (design TBD). Chartered so
far: **copywriter** (Tamar), **language-qa** (Noa), **seo-strategist** (Yonatan), **ux** (Maya),
**ppc-strategist** (Dror), **nextjs-engineer** (Eitan-Dev), **verifier** (Roni), **instructional-designer** (Gil).
Orchestration via **Adam** — see below.

## Orchestration (Adam)

**Adam is the main session, not a subagent.** Subagents can't call each other or sub-delegate —
they run isolated and report only to their caller. So *all* cross-agent flow goes through Adam: he
is the conductor and the bus. "Talk to Adam" = talk to the main Claude Code session in orchestrator
mode. (There is deliberately no `adam.md` — a subagent couldn't spawn the others.)

**Interaction model — hybrid:**
- Multi-step or unsure who's needed → **Adam** plans, delegates, routes, and synthesizes.
- A known single task → call the specialist directly (still bound by the seams/gates below).

**How Adam runs a mission:**
1. Read the request + this file + the relevant charters in `.claude/agents/`.
2. Plan the stages and owners. Known mission → follow the documented pipeline in `docs/missions/`.
   One-off → plan ad-hoc from the charters.
3. Delegate one stage at a time; fan out **independent** stages in parallel, **dependent** stages
   sequentially. Pass each specialist exactly what they need.
4. Collect output → **enforce the gate** → route to the next owner.
5. Report back: what each did, what's verified, what's left.

**Seams & gates Adam enforces (non-negotiable):**
- Any copy/script → **language-qa (Noa)** before it ships.
- `knowledge.ts` → **nextjs-engineer (Eitan-Dev)** only, Python `str.replace`, asserted counts.
- Keyword anchors / title formula → **seo-strategist (Yonatan)** sign-off.
- SERP / RTL bidi → **ux (Maya)** technique + Eitan-Dev template; Noa is the SERP gate.
- Time-sensitive SEO/PPC claims → strategist **web-verifies + dates** them (never from memory).
- Anything built → **verifier (Roni)** confirms at runtime before "done." No partial pass.

**Models:** each specialist runs on its **pinned** model regardless of the session model — that's
the guarantee against language-quality regressions. Documented pipelines live in `docs/missions/`.
