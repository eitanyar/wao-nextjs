# Site Bot single-segment pivot — session record (2026-08-21)

Continuation record for the strategist (Lior) session that executed the single-segment pivot
locked in VISION.md on 2026-08-21. Read this fully before dispatching anything new — it's the
state of the world, the decisions already made, and the queue, not a to-do list to skim.

## Authorization for the next session

Eitan granted full execution autonomy for this work for the remainder of the prior session
("this session requires no additional consent on my side... all privileges granted", "keep
going, don't stop for confirmation"). Carry that forward: proceed through the specialist-gate
pipeline (copywriter → language-qa → nextjs-engineer apply → verifier) without pausing for
approval on routine execution decisions. This does NOT relax CLAUDE.md's hard constraints —
still never run `deploy.sh`, never `git push`, never free-form-edit `src/data/knowledge.ts`
(surgical Python `str.replace` only), never a destructive git operation. Genuine strategic forks
(pricing, scope, whether to reopen a retired channel) still go to Eitan — see "Open decisions"
below for the one still outstanding.

`handoff/EXECUTION_MODE` was `claude-subagents` throughout this session — check it hasn't
changed before assuming the dispatch pattern below still applies.

## Mission context

VISION.md's Phase 1 (read it in full, it's dense and load-bearing) collapsed WAO to a **single
target segment**: the no-website micro-business (fixed-location plumber/electrician-class,
in-home tutors, photographers), served by **Site Bot** (core-30 local-SEO site + GBP claim) as
the sole active acquisition product. GEO Bot is retired as an *external acquisition channel* —
critically, **not retired as a product**. Eitan's own words, given mid-session: "I need GEO fully
operational for clients I specifically join with my retainer. Don't scrape it completely." Two
legitimate entry paths survive:
1. **Month-4 self-serve upgrade** for WAO's own existing Site Bot clients, once they have real
   GSC data — meant to be self-serve inside the client dashboard, not Eitan-brokered.
2. **Retainer / warm-intro** for an external client with an already-established site — Eitan
   personally decides these, no self-serve signup surface.
What's actually gone is the **self-serve cold-acquisition mechanic**: no more schema.org `Offer`,
no ₪199/590/1,290 tiers, no public "sign up now" CTA, no marketing to the content-ready-SMB
segment (accountants/lawyers/clinics/coaches/therapists).

## What's done this session (all verified — tests passing, or runtime-checked by Roni)

### Core-30 page-generation engine (Site Bot's actual product — was previously just a 5-page brochure site)
Four layers, all in `src/lib/lp/`, all pure/tested, **none wired into any route yet**:
- `coreThirty.ts` — `buildCoreThirtyNodes(data, opts?)`: turns a client's onboarding
  `secondaryServices` × `specificCities` into a capped (~30) node list, round-robin so every
  service gets coverage. `deriveLocationType(serviceModel)` maps `field→service-area`,
  `location→fixed-location`, `event|mixed→hybrid` (photographer case). Fail-closed: empty
  service/city list → `[]`, never a fabricated page.
- `coreThirtyCopy.ts` — `generateCoreThirtyPageCopy(node, data)`: Tamar→Noa two-pass Hebrew
  generation per page (mirrors `generate/route.ts`'s pattern), with the `locationType` honesty
  conditional baked into the prompt (service-area pages must never claim a storefront; hybrid
  pages must mention both studio and on-location). No Hebrew authored in source — English
  instructions only, exactly like `lpCopyPrompt.ts`'s convention.
- `duplicateCheck.ts` — `checkNearDuplicates(pages, opts?)`: trigram-Jaccard near-duplicate
  detector (default threshold 0.6) for narrative/FAQ/metaDescription — the Gate-1 anti-doorway-
  page check. Zero coupling to the other two files (locally-typed). City-swap test case scored
  0.819, well clear of the threshold.
- `renderCoreThirtyPages.ts` — `renderCoreThirtyPages(params)` + `buildCoreThirtySitemapUrls()`:
  HTML rendering reusing `renderSitePages.ts`'s now-exported layout helpers (`navBar`,
  `footerBadge`, `pageHead`, `assembleDocument`, etc.), pages at `sherut/{node.id}.html`, with a
  real per-page internal-linking block (same-city siblings, falling back to same-service).
  `buildSitemap()` in `renderSitePages.ts` was extended with a backward-compatible optional
  `extraPaths` param.

**Known gap flagged by the builder, not yet resolved:** `CoreThirtyPageCopy` has no
`formHeadline`/CTA-label field, so the renderer currently reuses `copy.pageHeadline` as a stand-in
for the lead-form headline/CTA. Also `formConversionLabel` isn't threaded through, so core-30
lead-form submits won't fire a Google Ads conversion event yet. Resolve this — either add fields
to `CoreThirtyPageCopy` or thread a small copy-fields object through — as part of the wiring task
below, don't leave it silently degraded.

### Homepage pivot (applied, QA'd by Noa, runtime-verified by Roni — PASS on all 6 checks)
- `src/components/Hero.tsx` — secondary CTA now `"כבר יש לך אתר? בוא נדבר"` → `/consulting`
  (was routing to the retired `/geo` acquisition funnel).
- `src/components/Services.tsx` — GEO Bot card removed entirely; Site Bot moved to position 1
  of 7 (was buried at position 7 of 8) with a re-captioned local-SEO-flavored description.
- `src/components/CtaBanner.tsx` — subheading rewritten to drop GEO Bot/Ads Bot mentions,
  centers Site Bot's real local-visibility value.

### `/geo` marketing page retargeted (structural strip + copy pass, both QA'd/verified — PASS)
`src/app/(app)/geo/page.tsx`: removed the schema.org `Offer` and the ₪199/590/1,290
`PRICING_TIERS` table + section entirely. Copy rewritten (Tamar, Noa-passed clean) to position
GEO Bot as a real, visible, retainer-delivered capability — NOT hidden, NOT apologetic — with an
honest eligibility framing (needs an existing site with real content — genuinely true, GEO Bot
extends rather than builds) instead of the old dismissive "local business, not for you, go
elsewhere" FAQ answer that was actively repelling Site Bot's own target segment. Title/OG
reframed per Yonatan's (seo-strategist) signed-off direction: dropped "לעסקים" (open-market
signal), kept "GEO" as head term. `src/components/Header.tsx`/`Footer.tsx` no longer link `/geo`
in primary nav; `src/app/sitemap.ts`'s `/geo` priority dropped 0.9→0.3 (page stays indexed, not
noindexed — Yonatan's call, real referral/retainer traffic still has a reason to land there).
`src/app/(product)/geo/*` (the actual client-delivery dashboard) was explicitly untouched and
confirmed still the right, separate surface.

Minor un-blocking polish flagged, not done: FAQ #1's answer reads dense (7 sentences, Noa flagged
as 🟡) and the meta description is 141 chars vs. the 150-160 SEO target — optional Tamar/Yonatan
pass, not load-bearing.

### Site Bot → client-dashboard bridge (built, tested, runtime-verified by Roni — real PASS with
captured curl/cookie evidence, including a self-caught false-positive on the first login probe)
Previously **Site Bot clients had zero dashboard account** — `deploy/route.ts` only ever wrote to
`data/sites/{slug}.json`, never to the `data/clients/{slug}/client.json` the dashboard actually
reads. Fixed:
- `src/lib/geo/client.ts` — `GeoClientRecord` gained `siteBotLaunchedAt?` (stamped once, on
  first creation only — never touched by a redeploy) and `gscConnectedAt?` (stamped once by
  `setClientGscConnected` on the first `false→true` transition, survives later disconnects).
  New `ensureSiteBotClientRecord(params)` — create-only, idempotent, generates a 4-digit numeric
  PIN using the exact same scheme `/api/geo/signup/init/route.ts` already uses.
- `src/app/api/site-bot/deploy/route.ts` — after a successful deploy, creates the dashboard
  record (non-fatal try/catch, matches the route's existing warning pattern) and auto-logs the
  client in (`wao-client` cookie) **only on genuine first creation** — verified: a redeploy does
  NOT re-set the cookie and leaves `siteBotLaunchedAt`/`pin` untouched.
- Verified at runtime against the disposable `test-plumber-tlv` fixture (now has a real
  `data/clients/test-plumber-tlv/client.json` — this is a sanctioned test slug, not a real
  client, reused throughout this session for exactly this purpose): fresh deploy → dashboard
  record created, cookie set, `/client/dashboard` renders the real empty-state ("המשימות
  הראשונות שלך כבר בהכנה") with a GSC-connect CTA; redeploy → no new cookie, record unchanged;
  `/client/login` with correct PIN → session granted; wrong PIN → correctly rejected.

### Housekeeping
10 stale pending handoff specs (all pre-dating the pivot, targeting the now-retired GEO-Bot-as-
acquisition surfaces) moved from `handoff/pending/` to `handoff/archive/` — that directory is
now clean.

## Decisions locked this session (respect these, don't re-litigate)

- **GEO Bot upgrade price: ₪299/month** (Eitan). Not yet wired anywhere in code — this is the
  price Spec B (below) should charge.
- **GEO Bot is fully operational, never hidden** — the retargeted `/geo` page and the dashboard
  bridge both need to keep reflecting this. Don't let a future pass accidentally re-drift toward
  "GEO Bot is gone" framing.
- **`/geo` stays indexed** (priority lowered, not noindexed/redirected) — Yonatan's call, real
  reasoning in his report (referral-lane traffic, real accumulated signal, semantic mismatch if
  redirected to `/site-bot`).

## Session 2 update (same day, 2026-08-21 — continuation)

**Step 1 (core-30 wiring) is DONE and independently verified — do not redo it.**
`generate/route.ts` now computes `buildCoreThirtyNodes` + generates per-node copy via
`generateCoreThirtyPageCopy` under a local `runWithConcurrency` pool (limit 2), gated on
`GEMINI_API_KEY` being set (simulation mode persists an empty `coreThirtyCopies: {}`, no fallback
template exists at this layer, matching `coreThirtyCopy.ts`'s own doc comment). Both
`coreThirtyNodes` and `coreThirtyCopies` persist into `data/sites/{slug}.json`.
`deploy/route.ts` reads those fields (optional, backward-compatible — pre-pivot records with
neither field still deploy exactly as before), runs `checkNearDuplicates` as a pre-render gate,
and implements the **locked policy** for findings: does NOT hard-block the deploy — excludes only
the second id (`bId`) of every flagged pair from rendering, logs each exclusion, and writes an
audit trail (`coreThirtyDuplicateExclusions`) back into the site record (non-fatal try/catch). It
then renders via `renderCoreThirtyPages`, merges into the upload dict, and overrides `sitemap.xml`
via `buildSitemap(siteUrl, buildCoreThirtySitemapUrls(...))`.

The `formHeadline`/CTA-field gap is also resolved: `CoreThirtyPageCopy` now has real
`formHeadline`/`ctaLabel` fields (Tamar prompt + Noa QA checklist updated to match), and
`renderCoreThirtyPages.ts` uses them instead of the old `pageHeadline`-reused-twice degrade;
`formConversionLabel` is threaded through from `deploy/route.ts` too.

**One real bug was caught and fixed mid-session:** the deploy write loop didn't create nested
parent directories (e.g. `sherut/`) before `writeFileSync`, causing an ENOENT 500 on any record
with real core-30 pages. Fixed (per-file `mkdirSync(path.dirname(filePath), { recursive: true })`
before each write) and independently re-verified by Roni, including a live fetch of
`https://test-core30-verify.wao.co.il/sherut/svc0-city0.html` returning 200 with real rendered
Hebrew content. `test-core30-verify` is now a second sanctioned disposable Site Bot test fixture
(12 real service×city nodes, plumber-shaped, real Gemini-generated copy — not simulation) —
reuse it alongside `test-plumber-tlv` for further core-30 testing rather than inventing a new slug.

**Pricing fork — RESOLVED (Eitan, this session):** Site Bot repriced from the old ₪1,490–1,990
one-time to **₪199/month retainer**. Full ladder: ₪9.90 trial → `generate`-only preview (cheap,
no live deploy/GBP claim) → **₪199/mo unlocks `deploy`** (live core-30 site + GBP claim + a
recurring bundle: monthly page growth/refresh batch, GBP monitoring, client-dashboard digest) →
**₪299/mo GEO Bot upgrade at month 4** (unchanged gate). VISION.md's Bots table, Buyer-routing §,
the old "Phase 2 pricing trigger" note, and the "unresolved pricing/conversion fork" note were all
updated in place — don't re-litigate these as open. Full rationale + bundle contents:
memory `project_site_bot_199_retainer_2026_08_21`.

**Trial-copy framing correction (Eitan's own catch, this session — respect it):** the client-
facing story must never say "you're paying ₪9.90 for a preview" — that reads as weak/thin.
Correct framing: ₪9.90 is a build-slot deposit credited toward month 1 (same commitment-device
logic VISION.md already documents for the Ads Bot's ₪9.90 setup fee), and what the client
perceives for that ₪9.90 is a real personalized mockup of their own site (their name/photo/
services), not an abstract "preview." The internal generate/deploy cost-gate stays exactly as
built — only the client-facing wording changes. **Not yet written as real copy** — this is a
framing instruction for whoever briefs Tamar next, not shipped text yet.

**New open item, deliberately parked — do NOT resolve without asking Eitan:** what happens to a
client's live core-30 site/GBP content when they cancel the ₪199/mo retainer (takedown, freeze,
or paid export/buyout)? Real trust question for this persona, in tension with VISION.md's stated
moat logic ("churn requires cancelling ongoing value"). Full detail: memory
`project_site_bot_cancellation_policy_open`. Surface it again if still unresolved.

**Build implication surfaced by the pricing resolution, not yet done:** `checkout`/payment gating
(`src/app/api/site-bot/checkout/*`) still charges a one-time amount — it needs to become a
recurring ₪199/mo charge before Takbull is wired for real. Not attempted this session; sequence
it whenever Site Bot's payment flow is next touched.

## Immediate next steps, in dependency order (superseding the old list below where they conflict)

1. **Spec B — month-4 self-serve GEO upgrade.** This is now the top of the queue (step 1 above is
   done). Build: a pure `checkGeoUpgradeEligibility(record)` (not already `geo`-entitled,
   `gscConnected === true`, `gscConnectedAt` ≥90 days ago — both fields exist on `GeoClientRecord`
   already), a dashboard card that shows when eligible, and `POST /api/geo/upgrade` —
   session-authenticated (client's own clientId from the cookie, never trust a request body),
   re-checks eligibility server-side, charges **₪299/month** via the same payment-provider
   pattern `src/app/api/geo/signup/callback/route.ts` already uses, grants `entitlements: ['geo']`
   on success, and kicks off the first `gsc-pareto.mjs` + `geo-generate-content.mjs --top=10` run
   (background/async — these take real time; don't block the HTTP response on them). Remember the
   hard rule from memory: **always `--top=10`, never 20**.

2. **Follow-up flagged by Yonatan, not yet started — arguably worse than what was already fixed:**
   `src/app/(app)/geo/audit/page.tsx` and `src/app/(app)/geo/scan/page.tsx` (and
   `.../onboarding/page.tsx`) are **live external lead-gen funnels** for the retired self-serve
   GEO Bot model — their own titles/H1s, wired through `src/components/SiloNav.tsx`. These need
   the same retarget-or-retire treatment `/geo` itself just got, and their fate should be decided
   together with `SiloNav.tsx`'s wiring. Route through Yonatan again (he already owns the anchor
   context) before touching titles/H1s.
   Also: `src/data/knowledge.ts` has ≥3 articles cross-linking to `/geo` with retired commercial-
   service anchor text (e.g. "שירות GEO Bot — להפוך למקור שה-AI בוחר"). Once `/geo/audit`+`/geo/
   scan`'s fate is decided, these anchors need updating — Tamar writes new anchor text,
   Eitan-Dev applies via **surgical Python `str.replace`, never free-form** (hard constraint).

3. Minor, non-blocking: Tamar could trim `/geo`'s FAQ #1 answer (Noa flagged density); the meta
   description could gain ~10-15 chars to hit the 150-160 SEO sweet spot.

## Operating notes that worked well this session (worth keeping)

- Direct-dispatch via the `Agent` tool to named specialists (`nextjs-engineer`, `copywriter`,
  `language-qa`, `seo-strategist`, `verifier`) rather than writing `/handoff/pending/` files and
  waiting — since `EXECUTION_MODE` was `claude-subagents`, the orchestrating session IS the
  picker-upper, so direct dispatch is equivalent and faster.
- Gate discipline held throughout: copywriter → language-qa → nextjs-engineer (apply, when the
  copywriter didn't already have direct Edit access to a plain `.tsx` file) → verifier. Don't
  skip steps even under a full-autonomy grant — the grant was for *not asking permission*, not
  for skipping the quality gates themselves.
- **Never let two dispatched agents edit the same file concurrently.** This was a real, actively-
  managed risk all session (`package.json`/`tsconfig.test.json` for the core-30 test-build entries;
  `deploy/route.ts` between the dashboard-bridge and the still-queued core-30-wiring task).
  Sequence explicitly when two queued tasks share a file.
- New pure-function library modules go into `src/lib/lp/` or `src/lib/geo/` with a matching
  `.test.ts`, added to `tsconfig.test.json`'s `include` and covered by `package.json`'s existing
  `dist/lib/**/*.test.js` `node --test` glob pattern — this project's real test suite, not just
  `tsc`, is the bar (currently 187+ tests passing as of session end).
- **Live credentials are configured in this environment** — a real `CLOUDFLARE_API_TOKEN` means
  `POST /api/site-bot/deploy` performs a REAL Cloudflare Pages deploy + DNS record if called on
  a real/new slug. `test-plumber-tlv` is this session's sanctioned disposable Site Bot test
  fixture (`scripts/test-site-bot.mjs`'s `sampleCollectedData`) — it now has a real
  `data/clients/test-plumber-tlv/client.json` from verification runs. Reuse it for further Site
  Bot pipeline tests rather than inventing a new slug, unless testing fresh-creation behavior
  specifically requires an unused one.

## Reference docs to re-read before dispatching anything

`VISION.md` (Phase 1 section is the single-segment decision, read the whole thing — it's dense
and every sentence is load-bearing), `AGENTS.md`, `CLAUDE.md`, `CLAUDE_TO_HERMES_HANDOFF.md`.
