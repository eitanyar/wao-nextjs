# Site-Bot M2b.2 + M2b.3 — preview before pay + customer-scoped preview session

Parent mission: `docs/missions/site-bot-paid-journey-v2-2026-11-07.md`. Plan by Plan agent 2026-11-09 from HEAD `4a30bce`
(read-only); accepted by Adam. Line numbers drift — re-grep before editing.

## Outcome
After the M1 questions the owner lands on `/site-bot/preview`, WAO generates the site in the background under a
customer-scoped session, and the owner sees it in an iframe (mobile/desktop), edits the slug, one-tap confirms the
service areas (`servedAreaNames.ownerConfirmed`), and gets a buy CTA (M3 stub). No payment, GBP write, DNS or publish.
Everything flag-gated (`SITE_BOT_PAID_FLOW==='1' && NODE_ENV!=='production'` — staging = dev/rehearsal server).

## Files
- **Architecture: path-based, no new DNS.** Shell `src/app/(product)/site-bot/preview/{layout,page,PreviewShell}.tsx`
  + `preview/buy/page.tsx` (M3 stub). Site served by `api/site-bot/preview/site/[[...path]]`: renders the stored
  record in memory (`renderResearchedSitePages`) with origin `<host>/api/site-bot/preview/site`, lookup in the rendered
  file map only (no FS by URL path), never serves `sitemap.xml`.
- New libs (no Hebrew): `src/lib/site-bot/{siteHosts,previewRender,previewSession,previewStore,previewSlug,previewJob,previewCopy}.ts`;
  `dataRoots.ts` kind `sitePreviews` (`WAO_SITE_PREVIEWS_DIR`, default `data/site-previews`, gitignored).
- `toPreviewHtml()`: robots `noindex,nofollow,noarchive,nosnippet,noimageindex`; strip canonical, og:url, all
  `<script>` incl. JSON-LD, preconnects, Fraud Blocker; rewrite `href="/…"` → base path; external/wa.me/mailto/tel →
  inert (pattern `localPreview.ts makeHtmlSafe`); forms inert.
- Headers on every preview response: `X-Robots-Tag` (same set), `Cache-Control: private, no-store`,
  `Referrer-Policy: no-referrer`, `X-Frame-Options: SAMEORIGIN`; site route CSP `default-src 'none'; img-src https: data:;
  style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; form-action 'none';
  base-uri 'none'; frame-ancestors 'self'; sandbox allow-same-origin`.
- Noindex layers: 404 without session cookie (primary) → X-Robots-Tag → meta → `robots.ts` disallow `/site-bot/preview`
  → never in sitemap → no IDs in URLs, no inbound links, generic shell title (GTM sees it).
- Routes (one method per file, `route.ts` byte-equal `gatedRouteSource` + `paid.ts`): `preview/start` POST,
  `preview/status` GET, `preview/site/[[...path]]` GET, `preview/slug` POST, `preview/areas` POST, `preview/gates` POST,
  `preview/retry` POST, `preview/end` POST.
- Edits: `StartPaidFlow.tsx finish()` → POST preview/start via `previewStartOutcome()` → `router.push('/site-bot/preview')`;
  `next.config.ts` closed-flag 307 for `/site-bot/preview/:path*`; `robots.ts`; `generate/route.ts` + `researchToSite.ts`
  use `stagingOrigin(slug)` (byte-identical output). Deploy untouched until M4.

## Constraints
- **Session (M2b.3):** token `base64url(claim).hex(HMAC-SHA256(SITE_BOT_PREVIEW_SECRET, "wao-site-preview/v1."+payload))`,
  claim `{v:1,kind:'site_preview',pid,aud,ver,iat,exp}`, strict parse ≤512B, timingSafeEqual; then load
  `<previewsDir>/<pid>/preview.json`, require auditId===aud, sessionVersion===ver, unexpired, audit unexpired.
  Secret ≥32 bytes, no fallback → 503 `preview_unavailable`. Separate from CLIENT_PORTAL_SECRET / ADMIN_SECRET.
- Cookie `__Host-wao-preview` HttpOnly Secure SameSite=Strict Path=/ (dev http fallback `wao-preview-dev`).
- Expiry absolute `min(iat+7d, audit.expiresAt)`; lazy purge frees slug reservation.
- Scope: no route accepts previewId / researchId / slug path / collectedData from the client as authority (fixes B1).
- Revocation: `preview/end` + restart bump `sessionVersion`. CSRF: SameSite=Strict + Origin must equal request origin
  (missing Origin rejected) + `Content-Type: application/json`.
- Rate limits (`src/lib/payments/rate-limit.ts`, in-memory, single pm2 fork): start 3/h/IP + 3/day/audit; status 60/min;
  slug 30/min + 10/h; areas 10/h; gates 20/h; ≤3 generation runs per preview; global `SITE_BOT_PREVIEW_MAX_CONCURRENT=2`,
  `SITE_BOT_PREVIEW_DAILY_CAP=20`. Prod gate-open later needs a SQLite counter.
- Admin routes keep `verifyAdminToken`; preview cookie never authorizes admin routes and vice versa; check in every
  handler (no proxy.ts reliance).
- Guard tests updated, never deleted (`audit-only-release.security.test.mjs` offenders regex, finish() assertions,
  next.config 307, layout pin, stub per route, no cross-imports admin↔preview, robots/sitemap);
  `deploy-client-auth.security.test.mjs` + "deploy does not import previewSession/previewStore".
- Engineer never authors Hebrew: `PREVIEW_COPY` keys start as `__HE_TODO_` + `PREVIEW_COPY_PENDING` flag (S7 fills).
- Aside (separate S fix): `admin-auth.ts verifyAdminToken` uses `===` for the signature, not constant-time.

## Acceptance (slices, in order — one engineer run each)
- **S1** host helper + `previewRender` pure transform (S). No `index,follow`/canonical/og:url/`<script`/external
  hrefs/tel/wa.me/sitemap in output; all internal hrefs under base path; generate/researchToSite byte-identical.
- **S2** session + store libs (M). One test per threat row: tamper, expiry, kind confusion both ways, version revoke,
  aud mismatch, missing secret, concurrent slug reserve (exactly one wins), purge, symlink rejection.
- **S3** start/job/status/end + intake wiring (M/L). Closed flag → stubs 503; Origin/JSON/audit/placeId checks; 429s;
  fixture business reaches `ready` under `WAO_SITE_PREVIEWS_DIR`; `git status data/sites data/clients` clean;
  interrupted job → `failed: interrupted`; end → 404 after.
- **S4** shell + site route (M). No cookie → 404; headers present; iframe nav stays under base path; sitemap 404;
  prod-mode boot with flag → 307 / 503.
- **S5** slug edit (S/M). Normalize/reject codes; reserved / live client / data/sites / other preview each refused;
  atomic rename.
- **S6** areas confirm + gate answers + retry (M). Idempotent confirm, stale digest 409, "not right" flags only;
  client collectedData ignored; ≤3 attempts; admin cookie on preview → 404, preview cookie on admin → 401.
- **S7** copy pass (waocopy → Noa) for `PREVIEW_COPY` keys; flip `PREVIEW_COPY_PENDING=false`.

## Verifier
Roni per slice; S3 outbound guard (LLM hosts + Places only; no Cloudflare/GBP/Takbull/Fraud Blocker); S4 desktop +
360px walk, view-source, axe on shell (iframe title, 44px); S5 two-browser race; S6 held-path walk with a truth-gap
fixture. `git diff data/clients/` empty every slice.

## Open decisions (Eitan) — recommended defaults
1. Ownership proof before preview? **Default: no** — proven by WhatsApp/email code at buy (M3); abuse capped.
2. Areas "not right"? **Default: flag for human review before go-live**, no pre-pay regeneration.
3. Slug field address for no-domain businesses? **Default: show `<slug>.wao.co.il`** as their address until they
   connect their own domain (M4); the pre-pay preview stays path-based.
