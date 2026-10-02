# SEO Advisor Bot on OpenSEO — Phased Roadmap

**Author:** waostrategy (Dror/Lior) · 2026-10-01
**Owner decision (Eitan, 2026-10-01):** connect the OpenSEO installation on the dev server to an SEO advisor bot. Surface: new `/seo-advisor` conversational bot. Two stated ambitions: (1) operator-side — advise Eitan on his SEO-retainer clients and define the exact next 20/80 task per client; (2) long-term — connect Site-Bot clients to GSC + OpenSEO (DataForSEO credits) so the bot advises on simple optimizations AND carries them out.
**Scope boundary (Eitan):** classic SEO only. AIO/GEO advisory is already covered per-client inside client access (geo pipeline) — do not duplicate it here.

## Phase 0 — Install OpenSEO and prove a zero-credit connection (in progress 2026-10-01)
**Corrected reality (verified 2026-10-01): there is NO current OpenSEO install.** This WSL host IS the dev server (tailscale0 = 100.102.160.114, hostname MSI). Nothing listens on :3001; no open-seo container/image/dir exists; no OPENSEO_* env is set. So "connect the installed OpenSEO" is really "install per the repo's own pinned runbook, then connect."

Already in place (verified):
- The MCP adapter is fully built locally (uncommitted): `src/lib/expired-domain-research/openSeoMcp.ts` (+ test), `scripts/expired-domain-openseo-preflight.mjs`, `scripts/verify-openseo-correction.mjs`, `docs/tools/expired-domain-openseo-local-setup.md`, fixtures under `fixtures/expired-domain-research/openseo/`. `@modelcontextprotocol/sdk@1.30.0` is installed.
- Offline preflight PASSES: all 7 allowlisted tools discovered, 0 network / 0 metered calls, serverOrigin http://127.0.0.1:3001.
- Credentials: WAO's `DATAFORSEO_TOKEN` (`.env.local`) is exactly `base64(DATAFORSEO_LOGIN:DATAFORSEO_PASSWORD)` — verified true — which is precisely OpenSEO's required `DATAFORSEO_API_KEY` format. No new credentials needed.
- Pinned image `ghcr.io/every-app/open-seo:v0.1.7` manifest is pullable (ghcr manifest HTTP 200).

Phase 0 actions (owner-authorized connection work; reversible; ZERO metered/billable calls):
1. Clone `https://github.com/every-app/open-seo` to a separate checkout `/home/eitanya/open-seo`; checkout tag `v0.1.7` (commit `ac9ee482d2b4cd8f472065d6f9b57db35cec560e`); pin image digest `sha256:518cb1f4...8298`.
2. In that checkout only, write `.env`: `DATAFORSEO_API_KEY` = WAO's token (never printed), `AUTH_MODE=local_noauth`, `OPENSEO_TELEMETRY_DISABLED=1`, `PORT=3001`, bind loopback only.
3. `docker compose up -d`; confirm `/api/health` and loopback `/mcp` respond.
4. Run the live-readonly preflight through the adapter (`preflightOpenSeo` → `whoami`, `list_projects`, `tools/list`; zero metered calls). Output: endpoint URL, project id, available tool names vs allowlist, credits remaining (if reported), GO/NO-GO for Phase 1.
Note: the CLI's `--live-readonly` flag is a deliberate stub (throws `live_readonly_not_executed_by_offline_cli`); the live path goes through the adapter functions, not the CLI flag.

### Phase 0 RESULT — installed + live zero-credit preflight PASSED (2026-10-01)
Executed directly by waostrategy (not a worker self-report):
- Installed: `/home/eitanya/open-seo` at tag v0.1.7 (commit ac9ee482...), pinned image digest sha256:518cb1f4...8298 pulled (ghcr manifest 200). Container `open-seo-open-seo-1` up, health `status ok, version 0.1.7, authMode local_noauth`, bound loopback-only `127.0.0.1:3001` (compose default). Telemetry + DO_NOT_TRACK off.
- Credential: OpenSEO health first flagged the DataForSEO key `warn — does not decode as base64(login:password)` because the first `.env` write had the token masked to `***` by the secret-redaction layer; rewritten via file-based Python (string concat, no inline secret), now health reports `dataforseo: ok - Set`. Verified: sent value == WAO DATAFORSEO_TOKEN, len 44, decodes to `login:password` with colon. No new credentials; no secret value ever printed.
- Live MCP preflight through the compiled adapter (`createOpenSeoMcpClient` mode=local → tools/list, whoami, list_projects; ZERO metered calls): CONNECTED origin http://127.0.0.1:3001; **46 tools discovered**; all 5 required metered tools present (research_keywords, get_domain_overview, get_domain_keyword_suggestions, get_backlinks_overview, get_backlinks_profile) → METERED_REQUIRED_PRESENT true, MISSING []; whoami mode=self-hosted, scopes=[], creditsRemaining=null; list_projects = **empty**.
- **Verdict: GO for Phase 1 connection layer** — endpoint live, credentials valid, full tool capability present.

Two gating facts Phase 1 must handle (surfaced, not yet actioned):
1. **No OpenSEO project exists yet** (list_projects empty). `preflightOpenSeo` returns `project_missing` without a configured projectId. Spec 034 forbids `create_project` through the adapter (it's a mutation, off-allowlist). So a project must be created once via the OpenSEO UI or an explicitly authorized one-time operator action before research runs.
2. **Self-hosted OpenSEO = bring-your-own DataForSEO key, pay-as-you-go (real money to DataForSEO).** `creditsRemaining` is null (no provider-side balance); the adapter's budget planner works off an owner-set `approvedCap`, not a provider balance. First metered call needs an explicit spend ceiling authorization.

OpenSEO MCP server version self-reports `0.0.12` (internal) under app version 0.1.7.

### Phase 0+ — owner gates cleared and metered path PROVEN (2026-10-01, evening)
Owner authorizations (Eitan, chat): one-time `create_project` + **$20 total spend ceiling**.
- Project created (zero credits): id `46b14fdf-859c-40e4-be3c-b161a481e1e6`, name "WAO SEO Advisor", locationCode 2376 (Israel), languageCode "he". Adapter `preflightOpenSeo` with this projectId → status `ok`.
- First metered proof call executed: raw `get_domain_overview(www.wao.co.il)` via MCP → isError false, REAL data: organic traffic 202, organic keywords 107, cached 12h. Spend: one overview (~100-300 OpenSEO credits ≈ cents). No balance header exists on DataForSEO API; dollar calibration must come from the DataForSEO dashboard after runs (credits→USD mapping not published by OpenSEO).
- **Adapter gap discovered by execution:** the live self-hosted server requires `projectId` on EVERY metered tool call; the committed-shape adapter (`callAllowedOpenSeoTool`/`runOpenSeoResearch`/`validateInput`, built against spec 034 assumptions) does not send it → adapter call fails `OpenSEO tool failed` while the raw call with projectId succeeds. Phase 1 must plumb projectId through the adapter.
- Real per-tool costs from live tool descriptions (differ from spec 034 estimates): research_keywords ~30-100/seed (~96 flat for Israel via Google Ads data); get_domain_overview ~100-300 (12h cache); get_domain_keyword_suggestions ~100-300 (12h cache); get_backlinks_overview ~50 domain / ~25 page; get_ranked_keywords "charges credits" (rich args: market, maxRank, minSearchVolume, sortBy, excludeBrandTerms — the 20/80 striking-distance tool); get_keyword_metrics hydrates up to 700 keywords; get_search_opportunities = FREE (no OpenSEO credits; joins GSC pos 4-20 with GA4 — Phase 3 goldmine, needs GSC connection).
- Container ops: `docker compose up -d / down` in /home/eitanya/open-seo with OPEN_SEO_IMAGE pinned by digest; restart=unless-stopped; loopback-only.

## Phase 1 — Operator 20/80 advisor (internal, Eitan-first)
Phase 1 local implementation executed 2026-10-01 under Kanban card t_1deb1703; independent verification and release remain pending.
- Reuse `src/lib/expired-domain-research/openSeoMcp.ts` (implemented locally, uncommitted; originally spec'd in 2026-09-05_034 for the expired-domain pipeline). The allowlist, credit-budget planner (`estimateOpenSeoPlan`), and redaction rules carry over unchanged.
- New operator-only route (no public exposure): input = client domain from Eitan's retainer roster; output = ranked "next best action" list with evidence (domain overview, ranked-keyword gaps, keyword suggestions, backlink profile) and an explicit 20/80 framing: the one or two moves with the largest expected organic impact per effort.
- Per-run credit ceiling approved in advance by the budget planner; every skipped planned call persisted (spec 034 §5-6 already defines this).
- Advisory only. No mutation of client properties. Fits the existing "audit-only" posture proven by the Site-Bot scorecard (c78c9ce).

## Phase 1b — location/language market filter (2026-10-02)
- Task t_e05b25b8 threads per-call market overrides through the operator advisor without creating another OpenSEO project.
- Both keys select an explicit pair; location alone uses its default language; language alone uses the project location; neither uses the project default.
- Advisor allowlist: US 2840 with en/es; IL 2376 with he/ar. Language alone fails closed in the advisor until a location is selected.
- UI dropdown is the gated follow-on in spec 2026-10-02_005, not part of this adapter/CLI task.

## Phase 1c — operator panel (2026-10-02)
- Admin-gated `/admin/seo-advisor` and `/api/admin/seo-advisor/run` surface bounded domain advice.
- Market source of truth is the `resolveAdvisorMarket` US/IL allowlist; project default omits overrides.
- Credit presets are 400, 1000, and 2000; explicit cap approval precedes metered calls.
- One writer at a time in the shared repository; this panel follows the apply-copy card.

## Phase 2 — Public `/seo-advisor` conversational bot (funnel front-end)
- Prospect enters a domain; bot runs a heavily budgeted free mini-diagnosis and gives real advice, converting to WAO SEO/GEO services. Voice/persona: reuse the geo-bot conversational patterns (`docs/specs/geo-bot-conversational-design-brief.md`) — same audience, relief-not-threat register, singular male Hebrew, TTS ≤15-word sentences. Hebrew copy = waocopy + waohebrewqa gate; bot-turn changes land in BOTH the API route and prompts lib per the Bot Turns Rule.
- Hard cost guardrails (metered credits on a public surface): one cached domain-overview per domain per day; result cache shared across prospects; preflight budget ceiling; Fraud Blocker + rate limiting; anonymous gating before any metered call; fallback to cached/expired evidence with an explicit freshness label.
- Never expose credits, account email, or raw provider payloads (spec 034 constraints carry over).

## Phase 3 — Site-Bot clients: GSC + OpenSEO advise-and-execute (long term, Eitan-confirmed)
- Connect a Site-Bot client property to GSC (client-authorized OAuth) and OpenSEO/DataForSEO evidence.
- Bot proposes simple optimizations (title/meta, internal links, FAQ from researched questions) and — behind the existing client-authorization envelope and deterministic safety gates — carries them out on client-owned sites WAO already manages, with audit evidence and rollback.
- Sequenced after Phases 1-2 prove evidence quality and budget discipline. Explicit human gates for anything touching published client pages.

## Dependency/ordering notes
- Phase 0 is a hard gate for everything: if the pinned OpenSEO release lacks the required tool set, report `capability_missing` and re-plan (no guessed substitutes — spec 034 §9).
- The uncommitted adapter files must be committed through a scoped release candidate (shared worktree is dirty; use the disposable-worktree pattern proven on beaf348) before Phase 1 builds on them.
- One implementation writer at a time in /home/eitanya/wao.
