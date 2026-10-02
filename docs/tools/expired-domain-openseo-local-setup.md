# OpenSEO local research setup

This is an operator runbook. Do not place secrets in WAO files or commits.

1. Use a separate checkout of `https://github.com/every-app/open-seo`.
2. Check out tag `v0.1.7` at commit `ac9ee482d2b4cd8f472065d6f9b57db35cec560e`.
3. Pin `OPEN_SEO_IMAGE=ghcr.io/every-app/open-seo:v0.1.7@sha256:518cb1f43c04b8168b14985fedf7086cf16deb5886069a87d4fb3910772d8298`.
4. Run `cp .env.example .env` only in that separate checkout and set `DATAFORSEO_API_KEY` there.
5. Set `AUTH_MODE=local_noauth` and `OPENSEO_TELEMETRY_DISABLED=1` there.
6. Start with `docker compose up -d`, then check `/api/health` and the loopback `/mcp` endpoint.

Local-noauth must bind only to loopback or a private network and must never be internet-exposed. WAO defaults to `http://127.0.0.1:3001/mcp`; hosted access must be explicitly configured as `https://app.openseo.so/mcp` with bearer authorization passed only in an HTTP header. The adapter allows only `whoami`, `list_projects`, `research_keywords`, `get_domain_overview`, `get_domain_keyword_suggestions`, `get_backlinks_overview`, and `get_backlinks_profile`. If the pinned release does not expose the required capability, return `capability_missing`; never guess a tool name or replace the immutable image pin.

Offline adapter verification compiles before invoking the CLI because the CLI imports the emitted CommonJS adapter. From the WAO repository root, run `node scripts/verify-openseo-correction.mjs`. This performs only synthetic fixture checks; it does not start OpenSEO or execute live mode.
