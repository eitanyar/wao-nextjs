@AGENTS.md

# WAO — Project Constitution

Shared ground truth that **every agent inherits**. Keep it tight and durable; role-specific
craft lives in `.claude/agents/*.md`.

## Stack & environment
- **Next.js 16.2.6** (Turbopack, App Router), React 19. Marketing site for **WAO** — a B2C
  digital-marketing agency. Hebrew, **RTL**. ~97 knowledge articles + service pages.
- **Dev server:** `npm run dev` → http://localhost:3000.
  - `next.config.ts` changes require a **server restart** to take effect.
  - If routes 404 after a hard kill of the server, the `.next` dev cache is corrupt → `rm -rf .next` and restart.
- **Deploy:** Automated post-milestone by Adam after verifier PASS — `ssh -i /home/eitanya/.ssh/id_ed25519_wao_hermes_deploy wao@91.98.195.242 "cd ~/htdocs/www.wao.co.il && ./deploy.sh"`. Manual fallback remains available.

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

## Agents & orchestration
The main Claude Code session is **Adam** — strategist, orchestrator, and owner of acceptance.
Adam may code directly for small fixes; substantial implementation goes to `nextjs-engineer`.
Roster, models, Hebrew ownership, gates, and workflow: **`AGENTS.md`** (single source of truth).
Multi-session mission briefs live in `docs/missions/`. The retired Hermes protocol is in
`docs/archive/hermes/` for history only — do not follow it.
