# M4 — Existing-site migration with ranking preservation

_Spec by Yonatan (seo-strategist), 2026-11-11, on Eitan's request to reach M4 soon. Platform facts web-verified 2026-11-11._

**Found in the code, matters before any migration (and for sites already live):**
- **No `404.html` in the deploy output.** Cloudflare Pages then treats the site as a single-page app: any unknown URL returns the homepage with 200 OK — a soft 404 for Google. Applies today to every live `{slug}.wao.co.il` site.
- **Canonicals and the sitemap point to `*.html`.** Pages redirects `/about.html` → `/about`, so every canonical in `renderSitePages.ts` and every `buildSitemap()` entry points at a redirecting URL; any old→new redirect aimed at a `.html` page becomes a two-hop chain.
Both are fixed in Step 0.

## Outcome
WAO replaces an owner's existing site on his own domain. Every old URL with value lands, in one hop, on an equivalent new page. His email keeps working. Rankings hold within the normal move dip.

## Files
`src/app/api/site-bot/deploy/route.ts`, `src/app/api/cloudflare-pages/deploy/route.ts`, `src/lib/lp/renderSitePages.ts` (`buildSitemap`, `pageHead`).
Reuse: `src/lib/seo-advisor-panel.ts` (ranked keywords, backlinks), `src/lib/expired-domain-research/` (Wayback).
New: `src/lib/site-migration/` (equity, inventory, map, parity, dns).

## Platform facts (verified 2026-11-11)
- Pages `_redirects` (docs updated 2026-08-25): codes 301/302/303/307/308, default 302 — always write `301`. Limits: 2,000 static + 100 dynamic rules, 1,000 chars/line; top-most rule wins; no query-string matching, no cross-domain, no 404/410. >2,100 rules → Bulk Redirects.
- Serving (docs updated 2026-10-10): `/x.html` → `/x` (blog reports 308, Oct 2026, medium confidence — confirm with curl). No top-level `404.html` → every unknown path returns the homepage.
- Custom domains (docs updated 2026-04-21): apex must be a Cloudflare zone (nameserver change); a subdomain needs only a CNAME. CAA must allow Cloudflare's CAs. Pointing away from Pages and back deactivates the domain.
- Google site-move doc (fetched 2026-11-11): server-side 301/308, 1:1, no chains, keep ≥1 year, 404/410 for dropped pages, never many-to-homepage. Change of Address applies only to domain changes (not here).

## Build order

**Step 0 — URL hygiene (S, prerequisite; also fixes live sites)**
- Canonicals, sitemap and internal links extensionless (`/about`, `/sherut/x`).
- Emit a real `404.html`.
- Accept: unknown path → 404; canonical = final URL (no redirect); sitemap URLs all 200 directly.

**Step 1 — Site equity check (M)**
Inputs: `site:` count + crawl count; GSC clicks/impressions by page, 16 months (if granted); DataForSEO ranked keywords (top-50, trade+city); referring domains.
Tiers (tune after 5 checks):
- Nothing to lose: <10 clicks/month, no top-20 trade+city keyword, <5 referring domains.
- Migrate carefully: some of these, and every URL with impressions maps to a Core-30 node.
- Don't touch yet: >30 URLs with impressions, a store/bookings engine, >300 clicks/month, or pages we can't match in parity.
Accept: JSON report + tier with each rule's evidence.

**Step 2 — URL inventory and map (M)**
Sources (deduped, normalised): crawl, `sitemap.xml`, GSC pages, Wayback CDX, backlinked targets, images/PDFs with impressions or links.
Rules: 1:1 to closest-topic page; pages with impressions keep head term in `<title>`/`<h1>` and topic; merges only for same topic; dropped → 404/410 logged with reason; never all-to-homepage (>10% to `/` = FAIL); destination = final 200 URL; lowercase, percent-encoded Hebrew paths.
Approvals: Yonatan signs the map; owner confirms the dropped list.
Accept: lint passes (no chains/loops, all destinations 200, homepage share ≤10%, <2,000 rules).

**Step 3 — Content parity gate (M)**
Per mapped URL with impressions: same head term in title + H1; same service/city scope; ≥ words on topic; same facts (prices, hours, phone); equivalent FAQs/images; schema ≥; no indexable→noindex.
Accept: per-URL parity report; any FAIL blocks cutover.

**Step 4 — Serve redirects (S)**
`_redirects` with explicit `301` (static first); "Always Use HTTPS" on the zone; www↔apex via zone Redirect Rule 301 (keep the host Google indexes); 410 optional v2 (Pages Function via `_routes.json`), v1 uses real 404; trailing slash per platform final form.
Accept: verifier curls every row → exactly one 301 → 200; both hosts and http take one hop.

**Step 5 — DNS cutover with email preserved (M)**
Export full zone from current DNS (don't rely on Cloudflare auto-scan — misses DKIM selectors). Copy every MX, TXT (SPF, DMARC, GSC), DKIM, SRV, autodiscover and subdomain record; only apex/www change. `dig` diff = 0 missing. DNSSEC off at registrar first. Lower TTLs 48 h ahead.
Rollback: nameservers stay on Cloudflare; switch apex to the old host (unproxied) in <5 min; revert nameservers only if Cloudflare itself fails.
Accept: test mail both ways passes SPF/DKIM/DMARC; zone diff empty except apex/www.

**Step 6 — Post-launch and monitoring (S build, ~8 weeks)**
GBP link `https://domain/?utm_source=google&utm_medium=organic&utm_campaign=gbp`; submit sitemap; inspect top 10 URLs. Daily weeks 1–2, then weekly: re-curl map, GSC coverage, 404s, clicks vs baseline, top-20 positions, email delivery.
Alarms: mapped URL ≠ 301→200; 5xx/404 spike on old URLs; MX/SPF failure → immediate rollback; clicks −40% after week 3 or top terms −10 positions after week 4 → Yonatan diagnoses, fix forward (roll back only if parity was wrong). Keep `_redirects` ≥1 year.

## Owner provides (Step 7)
Registrar login (or delegate); current DNS access or zone export; GSC Owner/Full (or let us verify); GBP manager; the "web guy's" contact; written consent to reuse his content.

## Cutover day (Step 7)
1 freeze map → 2 parity PASS → 3 deploy, test on `pages.dev` → 4 add custom domain, import zone → 5 zone diff = 0 → 6 change nameservers → 7 watch certificate → 8 curl full map → 9 mail test → 10 sitemap + GSC → 11 GBP link → 12 owner sign-off note. Hard rollback window: 72 h.

## Effort and minimal v1
S0 S · S1 M · S2 M · S3 M · S4 S · S5 M · S6 S.
v1 for the first "migrate carefully" client: Step 0 in full; Steps 1–3 as scripts + manual review (no panel UI); Step 4 generator + linter; Step 5 scripted zone diff + human checklist; Step 6 cron curl + weekly manual GSC review. ≈2 engineer runs.

## Verifier
Roni: Step 0 curls (live sites too); every map row one 301 → 200; unknown path 404; zone diff = 0; mail-auth headers; recheck weeks 1, 4, 8.

## Owners
Eitan-Dev: Step 0 now, then v1 scripts. Roni: Step 0 acceptance on a live `{slug}.wao.co.il` + 308 curl. Yonatan: each client's map and tier. Eitan DECIDED 2026-11-11: the three tiers go in the sales pitch for owners with a website (Amit adds them to the playbook; Tamar writes the pitch lines via waocopy → Noa).

Sources: developers.cloudflare.com/pages/configuration/redirects/ · developers.cloudflare.com/pages/configuration/serving-pages/ · developers.cloudflare.com/pages/configuration/custom-domains/ · developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes · engineered.at/articles/fixing-astro-seo-on-cloudflare-pages-why-trailingslash-doesn-t-work-and-what-does · farrosfr.github.io/p/astro-seo-fixing-trailing-slash-issues-on-cloudflare/ · github.com/cloudflare/workers-sdk/issues/5262
