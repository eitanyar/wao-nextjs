# Rank-and-Rent Portfolio Operating System

Date: 2026-09-06
Status: implementation queue; no purchase, external write, publication, push, or deployment is authorized.

## Decision

Build a WAO control plane plus ten isolated static Next.js site repositories. The control plane owns research dossiers, approvals, portfolio state, lead consent/routing, attribution, outcome reporting, proof, maintenance, and anomaly alerts. Every site repository owns only that site's approved content, design, static route graph, public assets, schema, tests, and Cloudflare Pages build configuration. Site repositories must not import WAO source code, contain client credentials, share runtime storage, or form an artificial cross-link network.

Hogegim is the first proof asset: a catering and small-event venue index for events up to 50 people. It starts only with approved provider facts and the two participating businesses' explicit consent. Electric and automatic gates is second, but gadgates.co.il remains HOLD until the complete expired-domain workflow, trademark/name-confusion review, ownership/transfer review, backlink/abuse review, and founder approval all pass. The remaining research queue is: air-conditioning installation/replacement; waterproofing/roof repair; solar water-heater/solar-energy installation; locksmith/emergency door services; pest control; moving/packing/storage; kitchen/bathroom renovation; commercial cleaning/facility maintenance. These are candidates, not validated market claims.

## Architecture boundary

### WAO control plane

- Versioned portfolio/site/repository/deployment/approval contracts and atomic runtime stores.
- Research-first opportunity dossiers using existing `src/lib/site-bot/research/*` adapters and gates.
- Domain due-diligence linkage to `src/lib/expired-domain-research/*`; dispositions remain `reject`, `hold`, or `manual_due_diligence_required`.
- Certification and eligibility rules for participating microbusinesses and Fix My Business prospects.
- Evidence-led audit findings, owner-controlled asset inventory, consent, baseline snapshots, approved change plans, and exit records.
- First-party lead event validation, consent evidence, duplicate suppression, deterministic capacity-aware routing, delivery receipts, and recipient access boundaries.
- Attribution, qualified/booked/won outcome capture, aggregate before-after proof, confidence labels, costs, operator time, and commercial cohort reports.
- Scheduled crawl/indexing/lead-delivery/SLA/data-freshness anomaly detection; alerts create reviewable work and never make external changes.
- Portfolio admin APIs and workspace. PII is segregated from aggregate portfolio reports and never committed.

### Each independent site repository

- One Next.js 16 static-export project, one `.git` repository, one remote repository, one Cloudflare Pages project, one custom domain, one content bundle, and one site identifier.
- `output: 'export'`, build output `out`, no server-only route handlers, cookies, rewrites, redirects, headers API, server actions, or default Next image optimization.
- Approved static pages, internal links, metadata, canonical URLs, sitemap, robots policy, linked JSON-LD entity graph, visible consent/privacy disclosure, and a client-side POST to the control-plane lead endpoint.
- No private keys, provider tokens, client account credentials, lead database, provider raw dumps, or reusable cross-site tracking identity.
- Git-connected Cloudflare Pages deploys on push only after a human creates/authorizes the remote and Pages connection. WAO must not run `deploy.sh`; no handoff authorizes a push or Cloudflare project/domain mutation.

## Product system

### Rank-and-rent pilot

Use city-first commercial rollout inside a national information architecture. A page publishes only when serviceability, intent, demand/SERP evidence, factual uniqueness, provider capacity, approved keyword anchors, and content/QA gates pass. Do not manufacture a page quota. Lead routing is deterministic and auditable; no cherry-picking. A fixed 60-day Hogegim rental pilot is the safe commercial default, while exact price and SLA remain founder decisions. Capped qualified-lead pricing is the fallback, never an uncapped surprise obligation.

### Fix My Business

Offer a free evidence-led audit that identifies correctable foundations: GBP category mismatch, weak or misaligned title/H1, missing local entity/NAP signals, crawl/indexing defects, thin or unsupported local pages, weak conversion path, missing consent/attribution, and owner-control gaps. Give useful fixes away in the audit. Sell only the bounded remediation plan the business is eligible for. The business owner retains the domain, Git repository, Cloudflare project, analytics/Search Console, GBP ownership/co-ownership, and content/media rights; WAO receives the minimum manager access required and releases it on exit.

Eligibility requires uncontested ownership/access, a real GBP-eligible business, verified business facts, a bounded static brochure/local-service scope, owner-approved media, and an approved redirect/content migration plan. Suspension appeals, contested ownership, regulated/high-liability claims, large commerce/catalogs, proprietary booking logic, or complex multi-location estates require paid assessment or rejection.

### Trust proof for scaling Site Bot

Proof is a dated cohort, not a testimonial counter or traffic screenshot. Publish only aggregate, consented evidence: research-to-launch time; owner-controlled asset completion; indexed eligible pages; query coverage; attributed qualified leads; response time; booked/won outcomes; value range; conversion rates; support incidents; operator hours; provider/content/maintenance costs; and uncertainty. A case study requires baseline and after snapshots, source provenance, cohort definition, exclusions, and client approval. Certification means operational readiness and truthful evidence, never guaranteed rankings or leads.

## Automation and gates

Automate: bounded research, dossier persistence, page-candidate scoring, static build checks, technical SEO checks, lead validation/deduplication, deterministic routing, aggregate reporting, maintenance probes, anomaly detection, and draft work queues.

Manual or approval-gated: keyword/title/H1 anchors; business/provider eligibility; owner facts and media rights; GBP changes; outbound contact; prices and contracts; legal/privacy/trademark conclusions; domain purchase/transfer; Git remote creation; Cloudflare Pages connection/domain changes; publishing; push/deploy; client-account access; and spending above an approved research budget.

## Execution queues

1. Foundation: contracts/store → certification → research runner → audit findings → authorization/assets → proof model → static template → repo manifest/factory → lead contract → routing → reporting → anomalies → admin API/UI → independent runtime/visual verification.
2. Fix My Business: concise Hebrew bundle → Hebrew QA → engineer wiring after keyword-anchor approval → runtime and RTL verification.
3. Hogegim: approved provider intake/research dossier → routing configuration → concise Hebrew content bundle → Hebrew QA → isolated repo build → runtime and RTL verification → manual remote/Cloudflare/domain gate.
4. gadgates.co.il: complete existing expired-domain tasks → bounded read-only due-diligence record → founder/legal HOLD decision. No copy, repo, purchase, or launch task exists before approval.
5. Eight candidate niches: one independent evidence dossier each. After founder sign-off, repeat the Hogegim content/QA/repo/runtime/visual sequence with a new repository and Cloudflare project. Do not pre-author keyword anchors or copy.

## Founder decisions that materially change economics

- Confirm Hogegim fixed-rental pilot versus capped qualified-lead fallback, exact term, price, recipient SLA, and the two participating providers.
- Approve the Fix My Business packaging and payment milestones after eligibility/access validation; no amount is assumed.
- Decide whether a clean-domain-first policy applies to all eight experiments.
- Permit gadgates.co.il acquisition/legal review only after the technical dossier is complete; this is not permission to buy.
- Approve each site's keyword/title/H1 anchors, content, remote repository, Cloudflare Pages connection, custom domain, and launch.

## Context sizing

`AGENTS.md` records 1,000,000-token context windows for `waoengineer`, `waocopy`, `waohebrewqa`, `waoverifier`, and `waouxtester`; `hermes profile show` confirms all five profiles exist with `.env` files. Every handoff below is narrowly scoped, uses synthetic fixtures or bounded artifacts, and expects less than 120,000 tokens. Copy and visual tasks are further split so no profile receives the full portfolio payload.

## Technical grounding

- Next.js 16.2.6 local documentation: `node_modules/next/dist/docs/01-app/02-guides/static-exports.md` — `output: 'export'` emits `out/`; request-dependent route handlers, cookies, redirects, headers, proxy, ISR, Server Actions, and default image optimization are unsupported.
- Cloudflare Pages Git integration, accessed 2026-09-06: https://developers.cloudflare.com/pages/configuration/git-integration/ — one Pages project can connect to one GitHub or GitLab repository and automatically deploy pushes.
- Cloudflare static Next.js guide, accessed 2026-09-06: https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/.