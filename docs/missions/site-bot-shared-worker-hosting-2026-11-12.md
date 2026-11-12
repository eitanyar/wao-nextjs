# Site Bot hosting: one shared Worker + Cloudflare for SaaS (design note, 2026-11-12)

Design only. No code, no Cloudflare changes, no commits. Execution-order item 2
(`docs/missions/execution-order-fable52-2026-11-12.md`). Replaces "one Pages project per client"
(`src/app/api/site-bot/deploy/route.ts:438-485`).

## Outcome

Every Site Bot client site is served by **one Worker** (`wao-sites`) that reads the request hostname, finds the
tenant, and returns that tenant's files from **one R2 bucket** (`wao-sites`). Owners without a domain get
`https://{slug}.wao.co.il`. Owners with a domain add **one CNAME** (`www` → `sites.wao.co.il`) at their own
registrar; WAO attaches it as a Cloudflare for SaaS custom hostname, SSL is issued automatically, and the site goes
live on `https://www.{owner-domain}`. We never touch the owner's name servers, MX or TXT. Deploying one client
writes only that client's files; no other site is redeployed.

## Files

| File | Change |
|---|---|
| `workers/wao-sites/src/index.ts` (new) | The router Worker: host → tenant → R2 object, 404, redirects, health probe. |
| `workers/wao-sites/src/router.ts` (new) + `router.test.ts` | Pure functions (host normalising, path → key, redirect rules), unit-tested under `node --test`. |
| `workers/wao-sites/wrangler.jsonc` (new) | R2 binding `SITES`, routes, `compatibility_date`. Deployed with the repo's wrangler 4.106. |
| `scripts/site-hosting/provision.mjs` (new) | Idempotent one-time setup: bucket, fallback-origin DNS, CNAME target, fallback origin setting, routes and exclusion routes. GET-first, never deletes. |
| `scripts/site-hosting/attach-domain.mjs` (new) | Staff-run own-domain attach (launch version): pre-check, create custom hostname(s), poll, live probe, MX/TXT before/after diff. |
| `scripts/site-hosting/zone-route-audit.mjs` (new) | Lists every proxied record on `wao.co.il` and fails unless it is a tenant, the CNAME target, or an excluded WAO host. |
| `src/lib/site-hosting/r2.ts` (new) | R2 upload over the S3 API (SigV4), versioned prefix, pointer flip. |
| `src/lib/site-hosting/tenant.ts` (new) | Tenant record type, canonical-origin rule, reserved slugs. |
| `src/app/api/site-bot/deploy/route.ts` | Replace the wrangler/Pages block (`:428-485`) with R2 upload + pointer flip + subdomain DNS record to `sites.wao.co.il`. `siteUrl` (`:318`) and the fraud-tracker domain (`:321, :323, :397, :401`) come from the tenant's canonical origin. |
| `src/app/api/lead/route.ts:3-8` | CORS allowlist must also accept attached owner hostnames (today only `*.wao.co.il`; see Risk 1). |
| `src/lib/deployment/deploy-access.ts` | Reserve slugs that collide with infrastructure hosts (`sites`, `sites-origin`, `www`, `mail`, `calendar`, `chat`, `docs`, `email`, `smtp`, `alfa`, `karate`, `send`). |
| `data/sites/{slug}.json` | New optional fields: `ownerDomain`, `canonicalOrigin`, `customHostnameIds`, `hostingVersion`. Shape only; no client data written by this note. |

Not changed: the renderers. `renderSitePages`/`renderResearchedSitePages` already take `siteUrl` and build every
canonical, `og:url`, sitemap `<loc>` and schema URL from it (`src/lib/lp/renderSitePages.ts:67-68, 84-101, 332-333`),
and already emit a real `404.html` (`:95`).

## Constraints

- Free zone plan on `wao.co.il` stays. No Enterprise features: no apex proxying, no custom metadata, no wildcard
  custom hostnames (plans page, below).
- The main site (`wao.co.il`, `www.wao.co.il` → 91.98.195.242) and Google/mail hosts on the zone must never be served
  by the Worker. Enforced by exclusion routes plus a passthrough in the Worker plus `zone-route-audit.mjs`.
- We never write to an owner's DNS. The only record the owner adds is `www CNAME sites.wao.co.il` (and, only where
  the registrar offers ALIAS/ANAME/flattening, an apex alias). Never a literal CNAME at the apex: it breaks MX.
- `data/clients/` is not written by any rehearsal except the named test slugs.
- Token scoped to `wao.co.il` only. The account holds 18 other zones (checked by GET 2026-11-12); none are granted.
- No Hebrew authored here. Owner-facing instructions and the "your registrar can't point the bare address" message
  need a Tamar → Noa brief (listed under Handoffs).

## Acceptance

1. `provision.mjs` run twice: second run reports "no changes".
2. `zone-route-audit.mjs` passes, and `curl -sI https://wao.co.il/`, `https://www.wao.co.il/` and each Google/mail
   host return the same status and server headers as before provisioning, with no `x-wao-site` header.
3. Subdomain tenant: deploy `test-plumber-tlv` → `https://test-plumber-tlv.wao.co.il/` 200, unknown path 404 with
   the tenant's `404.html`, `/about.html` → 301 `/about`, `http://` → 301 `https://`.
4. One-tenant update: redeploy `test-plumber-tlv` with a changed file; `test-core30-verify` R2 objects and ETags
   unchanged; new content live within 60 s.
5. Own domain (founder's test `.co.il`): after the owner-side CNAME, custom hostname `status: active` and
   `ssl.status: active`; `https://www.{test-domain}/__wao/health` returns the tenant slug; canonicals, sitemap and
   `LocalBusiness` schema carry `https://www.{test-domain}`; `https://test-x.wao.co.il/*` 301s to it; MX and TXT of
   the test domain identical before and after (DoH diff saved in the run log).
6. Lead form on the own-domain rehearsal site submits and the lead appears in the client's CRM.
7. Rollback: pointer flip to the previous version restores the old page within 60 s.
8. `npm run test` and `npm run build -- --webpack` green; scoped lint on changed files.

## Verifier

Roni checks 2–7 at runtime from outside (curl + a phone browser on the own-domain site): status codes, the
`x-wao-site` header present only on tenant hosts, the SSL certificate issuer on the owner domain, canonical/sitemap
host, the lead arriving, and that `wao.co.il` and `mail.wao.co.il` behave exactly as before. Take Roni's "before"
render of `test-core30-verify` (Yonatan's condition 11) **before** that site is migrated.

---

## Docs consulted (all fetched 2026-11-12)

| Topic | Page | Page's own date | Fact used |
|---|---|---|---|
| Workers limits | https://developers.cloudflare.com/workers/platform/limits/ | 29.10.2026 | Static assets: 20,000 files per Worker version (Free), 100,000 (Paid); 25 MiB per file; no stated total. 100,000 requests/day on Free; 10 ms CPU (Free); 50 subrequests (Free); 1,000 routes per zone; 100 Workers custom domains per zone. |
| Static assets | https://developers.cloudflare.com/workers/static-assets/ | — | "Cloudflare deploys both your Worker code and your static assets in a single operation." No per-asset update path. `not_found_handling = "404-page"`. |
| Worker as SaaS origin | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/worker-as-origin/ | — | Fallback origin is an originless record (`AAAA 100::`); route `*/*` covers custom hostnames; more specific routes with Worker = None win; per-hostname `custom_origin_server` is bypassed; route by `host` header. |
| SaaS getting started | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/getting-started/ | — | Works on a Free zone; fallback origin "must be proxied"; optional proxied CNAME target; ready when `status` and `ssl.status` are `active`; "using an A record to point to the target is not a supported setup" without apex proxying. |
| Enable SaaS | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/enable/ | — | Dashboard → zone → SSL/TLS → Custom Hostnames → Enable; non-Enterprise must enter payment information. |
| SaaS plans | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/ | 14.08.2026 | 100 hostnames included on Free/Pro/Business, max 50,000, $0.10 per additional hostname. Enterprise-only: wildcard hostnames, custom certs, CA choice, apex proxying/BYOIP, custom metadata. |
| Hostname validation | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/hostname-validation/ and `/realtime-validation/` | — | Real-time (CNAME) validation is automatic once the owner's CNAME exists; pre-validation (TXT/HTTP) avoids downtime; backoff lengthens if the owner waits; a no-change PATCH resets it. |
| Certificate DCV | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/validate-certificates/ and `/http/` | — | HTTP DCV is automatic once the hostname CNAMEs to the target; CAA records must not block the CA; a few minutes without a valid cert are possible. |
| Apex | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/apex-proxying/ | — | "Most DNS providers do not allow CNAME records at the zone's root", so customers "have to use a subdomain as a vanity domain". Apex proxying needs static IP prefixes (paid, account team). |
| O2O | https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/saas-customers/how-it-works/ | — | An owner whose DNS is on Cloudflare (other account) with a proxied CNAME to us is supported (O2O). |
| CNAME flattening | https://developers.cloudflare.com/dns/cname-flattening/ | — | Lets a Cloudflare-hosted zone put a CNAME at the apex. |
| Routing options | https://developers.cloudflare.com/workers/configuration/routing/ and `/custom-domains/` | — | Workers Custom Domains need "a zone you own" on Cloudflare: not usable for owner domains. |
| R2 pricing | https://developers.cloudflare.com/r2/pricing/ | 30.10.2026 | $0.015/GB-month; Class A $4.50/M; Class B $0.36/M; free 10 GB, 1M Class A, 10M Class B per month; egress free. |
| R2 limits / consistency | https://developers.cloudflare.com/r2/platform/limits/ (30.10.2026), https://developers.cloudflare.com/r2/reference/consistency/ | | 1 write/s per key; read-after-write strongly consistent; bindings unaffected by caching. |
| R2 enable | https://developers.cloudflare.com/r2/get-started/ | 21.04.2026 | Enabled through a dashboard checkout (Storage & databases → R2). Confirmed: our token gets `10042: Please enable R2 through the Cloudflare Dashboard`. |
| Workers + KV pricing | https://developers.cloudflare.com/workers/platform/pricing/ | 02.10.2026 | Paid $5/month minimum, 10M requests and 30M CPU-ms included, then $0.30/M and $0.02/M CPU-ms; static-asset requests free. KV Free: 100k reads/day, **1,000 writes/day**, 1 GB; Paid: 10M reads, 1M writes/month. |
| KV behaviour | https://developers.cloudflare.com/kv/concepts/how-kv-works/, https://developers.cloudflare.com/kv/platform/limits/ (30.10.2026) | | Eventually consistent, "up to 60 seconds or more"; 1 write/s per key. |
| Pages limits | https://developers.cloudflare.com/pages/platform/limits/ | 05.09.2026 | 100 projects per account, not routinely increased. |
| Token permissions | https://developers.cloudflare.com/fundamentals/api/reference/permissions/ | 30.10.2026 | Exact permission-group names used in section 4. |
| API endpoints | https://developers.cloudflare.com/api/resources/custom_hostnames/methods/create/, `.../fallback_origin/methods/update/`, https://developers.cloudflare.com/api/resources/workers/subresources/routes/methods/create/ | | Custom hostname create and fallback origin update accept "SSL and Certificates Write"; route create accepts "Workers Routes Write". |
| Workers for Platforms | https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/platform/pricing/ | 21.04.2026 | $25/month. Not needed: we run one script, not one per tenant. |
| Runtime `request.cf.hostMetadata` | https://developers.cloudflare.com/workers/runtime-apis/request/ | | Only populated with custom metadata, which is Enterprise. So the tenant lookup is our own, by hostname. |

## Current Cloudflare state (read-only GET, 2026-11-12)

- Token active. Zone `wao.co.il`: **Free** plan, active, SSL mode `full`. The account holds 19 zones, all Free.
- **14 Pages projects** (out of 100): `test-plumber-tlv`, `test-core30-verify`, `karate`, `wao-client-6543`,
  `wao-client-4567`, `test-schema-address2/3`, `test-antigeneric-flow`, `test-checkout-flow`,
  `test-exempt-osek-patur` and 4 more on page 2.
- No Workers scripts, no Worker routes, no KV namespaces. **R2 not enabled.**
- Custom hostnames and fallback origin: `403 Authentication error`. The current token lacks "SSL and
  Certificates", and SaaS is presumably not enabled yet.
- 38 DNS records. Proxied non-tenant hosts that a `*/*` route would catch: `wao.co.il`, `www`, `calendar`, `chat`,
  `docs`, `email`, `mail` (→ ghs.googlehosted.com), `smtp` (→ stackmail), `karate` (Pages). `alfa` is DNS-only and
  is not affected. MX/SPF/DKIM records are DNS-only and are not affected by Worker routes.

## 1. Architecture

### Why R2 (not static assets per Worker version, not KV)

| | Static assets in the Worker | KV | **R2 (chosen)** |
|---|---|---|---|
| Update one tenant | Redeploys the Worker and **every** tenant's files in one version | Per key | Per object |
| Capacity | 20,000 files per version on Free, 100,000 on Paid, **shared by all tenants**. At about 100 files a site: 200 sites (Free), 1,000 (Paid), then a hard wall | Unlimited keys, 25 MiB values | 5 TiB objects, effectively unlimited |
| Writes | n/a | Free: **1,000 writes/day**, so one 100-file deploy uses 10% of the day | Free: 1M Class A/month, about 10,000 deploys |
| Consistency after deploy | Atomic per version | Eventual, "up to 60 seconds or more" | Strong read-after-write |
| Cost at 1,000 sites | $0 | Paid plan needed for writes | $0 (inside free tier, see section 5) |

Static assets lose on the shared-file ceiling and the "redeploy everyone" property, which is the exact failure the
founder is escaping. KV's daily write cap on Free and its 60-second staleness make a deploy-then-verify flow flaky.
R2 is strongly consistent, cheap and per-object.

### Layout in R2 (bucket `wao-sites`)

```
hosts/{hostname}.json                 {"slug":"plumber-tlv","role":"canonical"|"redirect"}
tenants/{slug}.json                   {"slug", "version":"20261112T1830Z-ab12", "canonicalOrigin":"https://www.example.co.il", "status":"live"|"suspended"}
sites/{slug}/{version}/index.html
sites/{slug}/{version}/about.html
sites/{slug}/{version}/sherut/x.html
sites/{slug}/{version}/404.html
sites/{slug}/{version}/sitemap.xml
sites/{slug}/{version}/robots.txt     (new, rendered at deploy with "Sitemap: {canonicalOrigin}/sitemap.xml")
```

### Request flow

1. Request arrives on any proxied hostname of `wao.co.il` (a `{slug}.wao.co.il` record or a SaaS custom hostname).
   The zone route `*/*` sends it to `wao-sites`; exclusion routes with Worker = None (`wao.co.il/*`,
   `www.wao.co.il/*`, `calendar.wao.co.il/*`, `chat…`, `docs…`, `email…`, `mail…`, `smtp…`, `karate…`) win because
   "more specific routes take precedence".
2. Worker lower-cases the `Host`, strips a trailing dot and port, and reads `hosts/{host}.json` (cached in isolate
   memory for 30 s). **Unknown host → `fetch(request)` passthrough** to whatever the DNS record points at. That is
   the safety net if an exclusion route is ever missing, and it keeps the not-yet-migrated Pages subdomains working.
3. `http:` → 301 `https:`. `role: "redirect"` (apex, the old `{slug}.wao.co.il` after an own-domain move) → 301 to
   `canonicalOrigin + path + query`.
4. Reads `tenants/{slug}.json` (cached 30 s). `status: "suspended"` → 410 page (for take-down after cancellation).
5. Path → key: decode, reject `..`, NUL, backslash and over-long paths (400); `/` → `index.html`; `/a/` →
   `a/index.html`; `/about` → `about.html`; `/about.html` → 301 `/about` (keeps the `servedPath` rule in
   `renderSitePages.ts:55-64`). The key is always prefixed `sites/{slug}/{version}/`, so a path cannot reach another
   tenant.
6. `SITES.get(key)`. Hit → 200 with `content-type` from the extension, `x-wao-site: {slug}`, `etag`, and
   `cache-control: public, max-age=60` for HTML (long for images/CSS). Miss → `sites/{slug}/{version}/404.html` with
   **status 404**.
7. Edge cache: the Worker uses the Cache API keyed on `{slug}/{version}/{path}`. A new deploy changes the version, so
   no purge is needed; the 30-s pointer cache is the only staleness.
8. `GET /__wao/health` → `{"slug","version"}`. Used by the attach script and Roni to prove a hostname really reaches
   us and not the owner's old host.

### Deploy for one client

1. Existing gates in `deploy/route.ts:203-312` stay unchanged (admin session, dossier, approved copy review).
2. `canonicalOrigin` = `https://www.{ownerDomain}` if the domain is attached **and live**, else
   `https://{slug}.wao.co.il`. This becomes `siteUrl` (today hard-coded at `:318`), so canonicals, `og:url`,
   sitemap, schema and `robots.txt` all carry the right origin with no renderer change.
3. Render (unchanged) → upload every file to `sites/{slug}/{newVersion}/` over the R2 S3 API (about 15–120 small
   files; parallel 8 at a time, a few seconds).
4. Read back the object count and `index.html` ETag. Only then write `tenants/{slug}.json` with the new version (the
   atomic switch) and the `hosts/` entries.
5. Subdomain tenants: ensure `{slug}.wao.co.il CNAME sites.wao.co.il` (proxied), using the same GET-first, 81053-aware
   logic as today (`:467-479`), with the target changed from `{slug}.pages.dev`.
6. Keep the current and the previous version; delete older ones (rollback = rewrite the pointer).
7. No Worker redeploy, no other tenant touched.

### Redirects and 404

- `http` → `https`: in the Worker (step 3).
- Own domain: `www.{domain}` is always canonical. Apex (only where the owner's DNS can alias it) is a `redirect`
  host → 301 to www. The old `{slug}.wao.co.il` becomes a `redirect` host the moment the owner domain is live, so
  Google never sees two copies.
- www ↔ apex the other way round (apex canonical) is **not offered**: it needs apex proxying (Enterprise).
- Unknown path → tenant `404.html` with status 404. Unknown host → passthrough (step 2).

## 2. Owner domain flow

**Before (staff, at intake):** record `ownerDomain` from the intake question (execution-order item 4). Run
`attach-domain.mjs --slug X --domain example.co.il --precheck`. It reads over DNS-over-HTTPS (no owner access needed):
NS, apex A/AAAA, `www` record, MX, TXT, CAA. It saves the MX/TXT snapshot and flags: CAA present (must allow
Cloudflare's CAs), `www` already serving a live site (that's the M4 migration mission, not this one), DNS on
Cloudflare (fine, O2O).

**Owner (or staff with his registrar login), one record:**

| Type | Name | Value | Notes |
|---|---|---|---|
| CNAME | `www` | `sites.wao.co.il` | Replace any existing `www` record. Nothing else changes. |

Nothing at the apex unless the registrar offers ALIAS, ANAME or "CNAME flattening". Then, optionally,
`@ ALIAS sites.wao.co.il`. **Never a plain CNAME at `@`** (some panels allow it, and it kills email).

**WAO side (script, staff-triggered for the launch):**

1. Create custom hostname `www.example.co.il` (`ssl.method: "http"`, `type: "dv"`, `min_tls_version: "1.2"`). Can be
   done before the owner adds the CNAME; real-time validation starts when it appears.
2. Poll `GET /zones/{zone}/custom_hostnames/{id}` every 60 s; if stuck in `pending` after the owner confirmed, send a
   no-change PATCH to reset the backoff. Surface `verification_errors` to staff verbatim.
3. **"Live" = all four:** `status: active`, `ssl.status: active`, `https://www.example.co.il/__wao/health` returns this
   slug with a valid certificate, and the MX/TXT snapshot is byte-identical to the pre-check.
4. Then re-deploy the tenant with `canonicalOrigin = https://www.example.co.il`, flip `{slug}.wao.co.il` to
   `redirect`, register the new host with the fraud tracker (section 3), and notify the owner.
5. Apex, if aliased: create a second custom hostname `example.co.il` as `redirect`. Docs say an A-record setup is
   "not a supported setup" without apex proxying; an ALIAS resolves like an A record at the CA. So this is
   **best-effort, offered only after it passes in rehearsal**, never promised.

**Owner whose registrar can't point the apex** (most Israeli registrar panels; to confirm in rehearsal):
"Your site's address is `www.example.co.il`. Your registrar can't point the bare address to us, so either use the
registrar's free 'forwarding' to `https://www.example.co.il`, or leave the bare address as it is. Your email isn't
affected either way." Caveat for staff: many registrar forwarders serve HTTP only, so `https://example.co.il` may
show a certificate warning. That's the registrar's limit, not ours. We do not move name servers to fix it. That's
the separate M4 path and needs its own decision.

**Email guarantee, made checkable:** the only record we ever ask for is named `www` (plus an optional apex ALIAS,
which coexists with MX). WAO holds no access to the owner's DNS. The pre/post MX+TXT diff is stored with the run
and is part of "live".

## 3. Migration

- **Pages test sites `test-core30-verify`, `test-plumber-tlv`:** both are legacy (non-researched) records in
  `data/sites/`. (1) Roni captures the "before" render of `test-core30-verify` first. (2) Deploy each through the
  new path; once `hosts/test-x.wao.co.il.json` exists the Worker serves it even while DNS still points at
  `test-x.pages.dev`, because the zone route intercepts proxied traffic. (3) Repoint the DNS record to
  `sites.wao.co.il`. (4) Keep the Pages project 7 days for rollback, then remove the Pages custom domain and project
  (destructive, needs Adam's go).
- **Other 12 Pages projects** (`karate`, `wao-client-*`, `test-schema-address*`, `test-antigeneric-flow`,
  `test-checkout-flow`, `test-exempt-osek-patur`, `yosi-build`, …): not migrated by this work. `karate` gets an
  exclusion route because it may be a real site. The founder decides which to delete.
- **Ads-LP deploy** (`src/app/api/cloudflare-pages/deploy/route.ts:102-182`) still creates one Pages project per
  landing page and shares the 100 cap. Follow-up: point it at the same Worker (it already renders a `404.html`).
- **Fraud tracker (`deploy/route.ts:321`, also `:323, :397, :401`):** registration is per domain
  (`ensureFraudBlockerDomain`, `src/lib/fraud-blocker/client.ts:162`). Subdomain tenants: unchanged, the domain stays
  `{slug}.wao.co.il`. Own-domain move: register `www.example.co.il` (new `sid`, re-rendered into the pages by the
  re-deploy in step 4), then archive the old `{slug}.wao.co.il` entry once its 301 is live, so the count per client
  stays at one (the client has a `plan_limit` error code). All four call sites take the host from `canonicalOrigin`
  instead of the hard-coded template.
- **Lead form CORS** (`src/app/api/lead/route.ts:5`) allows only `*.wao.co.il` origins. An own-domain site's form
  would be blocked by the browser. The allowlist must include every hostname in the tenant registry (read from
  `data/sites/*.json` `ownerDomain`, cached). Ships with the attach work.

## 4. Cloudflare permissions: founder checklist (about 10 minutes)

Do these in order, logged in to dash.cloudflare.com as Eitan@wao.co.il.

**A. Turn on R2 (the file store), about 2 min**
1. Left menu → **Storage & databases** → **R2** → **Overview**.
2. Click through the checkout. It asks for a payment method; usage stays inside the free allowance (10 GB, about
   10,000 site deploys a month), so the bill should be $0.
3. Don't create a bucket. The engineer's setup script does that.

**B. Turn on Cloudflare for SaaS on wao.co.il (owner domains), about 2 min**
1. Home → click **wao.co.il** → left menu **SSL/TLS** → **Custom Hostnames**.
2. Click **Enable** and enter the payment details if asked. The first 100 owner hostnames are included; after that
   it's $0.10 each.
3. Leave "Fallback Origin" empty. The setup script creates it.

**C. Workers plan, about 1 min (recommended, $5/month)**
1. Left menu → **Workers & Pages** → **Plans** → **Workers Paid** → Purchase.
2. Why: the free plan stops serving every client site after 100,000 requests in a day. For $5 that hard stop goes
   away. If you'd rather start free, skip this; we'll add an alert at 50,000/day.

**D. Create the API token, about 3 min**
1. Top-right profile icon → **My Profile** → **API Tokens** → **Create Token** → **Create Custom Token** (bottom).
2. Name: `wao-sites-hosting`.
3. Permissions, add each row:
   - Account · **Workers Scripts** · Edit
   - Account · **Workers R2 Storage** · Edit
   - Zone · **Workers Routes** · Edit
   - Zone · **SSL and Certificates** · Edit
   - Zone · **DNS** · Edit
   - Zone · **Zone** · Read
4. **Account Resources:** Include → *Eitan@wao.co.il's Account*.
5. **Zone Resources:** Include → **Specific zone** → **wao.co.il**. Not "All zones".
6. Client IP filtering: leave empty. TTL: leave empty or set 1 year.
7. **Continue to summary** → **Create Token** → copy it once and send it to Adam through the usual secret channel.
   It goes into `.env.local` / `.env.production` as `CLOUDFLARE_SITES_API_TOKEN`.

**E. Create the R2 upload key, about 2 min**
1. **Storage & databases** → **R2** → **Manage API tokens** (right side) → **Create API token** (Account token).
2. Name: `wao-sites-upload`. Permission: **Object Read & Write**. Apply to: **Specific buckets only** →
   `wao-sites`. If the bucket doesn't exist yet, do this step after the engineer's setup run; he'll tell you.
3. Copy the **Access Key ID**, **Secret Access Key** and the **S3 endpoint** shown once, and send them the same way.

**Do NOT grant:**
- "All zones" or any of the other 18 domains in the account.
- The ready-made "Edit Cloudflare Workers" template: it adds KV, Pages and account-wide settings we don't need.
- Zone · Zone · **Edit**, Zone Settings, Firewall, Page Rules, Cache Purge: not needed.
- Account Settings Edit, Billing, Memberships, API Tokens, Registrar, Zero Trust, Logs: never.
- Your **Global API Key**: never share it.
- Cloudflare Pages Edit on the new token: the old token keeps that until migration ends, then we cut it back.

## 5. Costs (USD per month, prices fetched 2026-11-12; pages cited above)

Assumptions: about 3,000 requests per site per month (visitors, bots, uptime checks); about 100 files and 5 MB per
version, 2 versions kept; 4 deploys per site per month; worst case every client has an own domain with **two**
custom hostnames (www + apex). Subdomain-only clients use **no** SaaS hostnames.

| | 10 clients | 100 clients | 1,000 clients |
|---|---|---|---|
| Requests/month | 30k | 300k | 3M (about 100k/day: at the Free cap) |
| Workers | $0 Free, or $5 Paid (recommended) | $5 | $5 (3M < 10M included) |
| R2 storage | 0.1 GB, $0 | 1 GB, $0 | 10 GB, at the 10 GB free line, about $0–0.15 |
| R2 Class A (writes) | 4k, $0 | 40k, $0 | 400k, $0 (< 1M free) |
| R2 Class B (reads, about 2 per uncached request) | 60k, $0 | 600k, $0 | about 6M, $0 (< 10M free; edge cache lowers it) |
| SaaS hostnames | 20 → $0 | 200 → 100 × $0.10 = **$10** | 2,000 → 1,900 × $0.10 = **$190** |
| Zone plan | Free, $0 | $0 | $0 |
| **Total** | **$0–5** | **about $15** | **about $195** |

With www only (no apex alias): 100 clients $5, 1,000 clients about $95. The plans page shows "$0.10" with no
period; Cloudflare's billing treats it as monthly per active hostname (memory note, consistent). Confirm on the
first invoice. Pages for comparison costs $0 but hits the 100-project wall at client 86 today (14 used).

## 6. Estimate (focused engineer-days, including tests and the verifier pass)

**Needed for the 29.11 launch: 4.5 days** (execution-order row 8, replacing its 3 days)

| Work | Days |
|---|---|
| Router Worker + unit tests (host, path, redirects, 404, passthrough, health, cache) | 1.0 |
| `provision.mjs` + `zone-route-audit.mjs`; first real provisioning run; main-site non-regression check | 0.5 |
| Deploy route: R2 upload, versioned pointer, per-client `siteUrl`, DNS target change, fraud-tracker host, reserved slugs | 1.0 |
| `attach-domain.mjs` (precheck, create, poll, live probe, MX/TXT diff) + lead-form CORS for owner hosts | 0.5 |
| Migrate `test-core30-verify` and `test-plumber-tlv` | 0.25 |
| Live rehearsal: timed subdomain run + founder's test `.co.il` end to end, Roni pass | 0.75 |
| Paid-queue alert (carried over from row 8, unchanged) | 0.5 |

**Can follow after launch: about 4 days**

| Work | Days |
|---|---|
| Self-serve own-domain: account-page status, scheduled poller, "you're live" notice (needs Tamar → Noa lines) | 1.5 |
| Apex ALIAS support, once rehearsal proves it on a real registrar | 0.5 |
| Move the ads-LP deploy off Pages onto the Worker; delete obsolete Pages projects | 1.0 |
| Suspend/take-down (410) and site export hooks for cancellation (capability 12) | 0.5 |
| Per-tenant uptime/cert check on a schedule, version pruning job | 0.5 |

## 7. Risks and how to test each before a real client

| # | Risk | Test before a real client |
|---|---|---|
| 1 | **Leads silently lost on owner domains.** `api/lead` CORS allows only `*.wao.co.il` (`route.ts:5`); the form would fail in the browser with nothing logged. | Rehearsal acceptance 6: submit the form on `www.{test-domain}` from a phone; the lead must appear. Unit test on the allowlist. |
| 2 | **Apex at Israeli registrars.** Most can't ALIAS the apex; forwarders are often HTTP-only, so `https://example.co.il` shows a warning. Apex proxying is Enterprise. | Rehearse on the founder's test `.co.il` at the registrar most owners use: www CNAME, then try ALIAS and forwarding; record exactly what works. Owner copy says "www" only until then. |
| 3 | **The `*/*` route on `wao.co.il` catches the main site or Google/mail hosts.** | Exclusion routes + passthrough + `zone-route-audit.mjs`; before/after `curl -sI` of every proxied host; no `x-wao-site` header outside tenants. Run on a quiet evening. |
| 4 | SSL never issues: CAA records, an existing `www` AAAA, or the owner's other CDN hiding records. | Precheck reads CAA/AAAA over DoH; rehearsal on a domain where we add a CAA record on purpose to see the error surfaced. |
| 5 | One Worker bug takes every site down. | Worker changes are rare and separate from tenant deploys; `wrangler versions` with gradual rollout + `wrangler rollback`; a smoke script hits every tenant's `/__wao/health` after each Worker deploy. |
| 6 | Duplicate content: the same site on `{slug}.wao.co.il` and the owner domain. | The canonical flip and the 301 happen in the same step; Roni checks that the old host 301s and the canonical tags match. |
| 7 | Cross-tenant file leak through path tricks. | Unit tests: `..`, `%2e%2e`, `//`, backslash, NUL, unicode; key always under `sites/{slug}/{version}/`. |
| 8 | Free Workers daily cap hard-stops all sites. | Workers Paid (checklist C), or an alert at 50k/day if the founder stays on Free. |
| 9 | Stale content after a deploy. | Acceptance 4 and 7: change visible within 60 s; rollback within 60 s. |
| 10 | Fraud-tracker plan limit when a domain moves. | Archive the old host only after the new one registers; dry-run on the test domain. |

## Handoffs

- **Founder:** checklist A–E above, plus the test `.co.il` domain with registrar access (already due Tue 17.11).
- **Tamar → Noa:** owner instructions for the one `www` record; the "your registrar can't point the bare address"
  message; the "your site is live on your domain" notice. Plain facts only; brief to be written by Adam.
- **Yonatan:** confirm `www.{domain}` as the canonical form for owner domains and the 301 from `{slug}.wao.co.il`.
- **Roni:** the "before" render of `test-core30-verify` before migration; then the Verifier section.
