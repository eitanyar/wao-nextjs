# Expired-Domain Research Tool Milestone Map

## Product decision
Build a local-only, master-admin research workspace at `/admin/expired-domain-research`. A user submits a Wayback search URL or bounded URL pattern plus a keyword. The system discovers historical candidates, checks current DNS/RDAP/HTTP signals, enriches a bounded shortlist through OpenSEO MCP and Moz Data API V3, ranks candidates with evidence and confidence, and persists immutable research runs. It never exposes a registrar, purchase, deploy, outreach, redirect, or site-generation action.

## Safety boundary
- Output dispositions are only `reject`, `hold`, or `manual_due_diligence_required`.
- `rdap_not_found` plus absent DNS/HTTP is an `unregistered_signal`, never purchase certainty.
- Exact Moz PA/DA/spam metrics remain distinct from OpenSEO/DataForSEO rank and spam signals.
- Live external research requires an explicit per-run credit/call budget. Tests use synthetic fixtures only.
- No client data, registrant PII, registrar credentials, payment data, or site content generation is in scope.
- Historical content, redirects, trademark/abuse, and chain-of-custody risks are visible manual gates.

## Dependency order
1. `2026-09-05_031`: contracts, validation, atomic store, deterministic score/explanation.
2. `2026-09-05_032`: Wayback search/CDX discovery and historical-risk evidence.
3. `2026-09-05_033`: DNS, IANA-bootstrap RDAP, safe HTTP status assessment.
4. `2026-09-05_034`: OpenSEO MCP client, zero-credit preflight, local self-host runbook.
5. `2026-09-05_035`: Moz Data API V3 exact PA/DA/spam adapter.
6. `2026-09-05_036`: bounded resumable research orchestrator and acquisition gates.
7. `2026-09-05_037`: authenticated local-only API surface.
8. `2026-09-05_038`: admin UI, synthetic fixture, browser verification driver.
9. `2026-09-05_039`: independent API/runtime verification.
10. `2026-09-05_040`: independent mixed-script visual/UX verification.

## Current-source findings (accessed 2026-09-05)
- OpenSEO hosted MCP is `https://app.openseo.so/mcp`; unauthenticated GET returned 401 with OAuth resource metadata. Official docs: `https://openseo.so/docs/mcp`.
- OpenSEO source `every-app/open-seo` commit `3632f408528cd588fec98c3a174af8ea0ad205e8` exposes `whoami`, `list_projects`, `research_keywords`, `get_domain_overview`, `get_domain_keyword_suggestions`, `get_backlinks_overview`, and `get_backlinks_profile`. Source descriptions say keyword research costs about 30–100 credits per seed with clickstream disabled, domain overview and domain keyword suggestions each cost about 100–300 per target, backlink overview about 25–50, and backlink profile about 30 per page; the MCP server requests confirmation above 2,000 planned credits.
- OpenSEO Docker self-host uses `ghcr.io/every-app/open-seo`; current release `v0.1.7` and its verified multi-architecture manifest digest `sha256:518cb1f43c04b8168b14985fedf7086cf16deb5886069a87d4fb3910772d8298` are the required initial pin instead of mutable `latest`. It defaults to port 3001, requires `DATAFORSEO_API_KEY`, exposes `/api/health`, and serves `/mcp` in `AUTH_MODE=local_noauth`. It must remain private because local mode has no auth. Official guide: `https://openseo.so/docs/self-hosting/docker`.
- OpenSEO hosted terms permit SEO work for owned/client sites and exporting reports, but prohibit reselling results as a standalone data product or building a competing service. Terms revised 2026-08-23: `https://openseo.so/terms-and-conditions`. This tool is an internal workflow, not a data-resale product.
- Wayback's current search page calls `https://web.archive.org/__wb/search/anchor?q=...`; this endpoint is observed but undocumented and therefore must be isolated behind an adapter with schema checks and fixture fallback. Candidate capture history uses the CDX endpoint at `https://web.archive.org/cdx/search/cdx`.
- IANA publishes the RDAP bootstrap registry at `https://data.iana.org/rdap/dns.json` (publication observed 2026-07-23). RDAP/DNS/HTTP are signals, not registrar inventory guarantees.
- Moz Data API V3 uses JSON-RPC at `https://api.moz.com/jsonrpc`, token header `x-moz-token`, and method `data.site.metrics.fetch`; the current response includes `page_authority`, `domain_authority`, and `spam_score`. Official docs: `https://moz.com/api/docs/methods/DataSiteMetricsFetchAction`.

## Context sizing
`waoengineer`, `waoverifier`, and `waouxtester` each have a verified 1,000,000-token context window in `AGENTS.md`. Every handoff below is narrow, fixture-bounded, and far below that payload. No waocopy task is needed because the workspace is internal English UI and Hebrew remains user-provided data.
