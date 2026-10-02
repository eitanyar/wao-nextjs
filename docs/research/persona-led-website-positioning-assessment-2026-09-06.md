# Persona-Led Website Copy and Positioning Assessment

Date: 2026-09-06
Status: strategy decision; no production copy, code, publication, or deployment authorized
Kanban task: t_c730def7

## Executive recommendation

Make Site Bot the primary public offer and the main navigation/funnel destination for WAO's busy, hands-on micro-business owner. Lead with the owner's outcome and effort model—be found locally, turn visibility into calls and jobs, keep ownership, and approve rather than manage—then name Site Bot as the mechanism. Do not reposition WAO around “high-ticket closers.” High-value jobs, qualified leads, booked work, won work, and shekels are useful proof and qualification language for eligible local-service verticals, but “closer” defines a different buyer, implies a sales team, and demands evidence WAO does not yet have. Keep the high-ticket/rank-and-rent work as a bounded proof laboratory for Site Bot and Fix My Business until attributable lead-to-won outcomes and transfer/ownership controls are proven.

## Grounded current state

- `VISION.md:20-40,42-69,251-283` defines WAO as an AI CMO for small businesses, Site Bot as the single acquisition product, the no-website micro-business as the target segment, and the free GBP audit as delivery step zero. Product #2 is Phone Bot; Ads Bot is #3.
- `docs/research/site-bot/009_ulku-local-ranking-fact-check.md:265-297,315-358` makes the free GBP scorecard the acquisition entry point and Site Bot the paid continuation.
- `docs/missions/continuous-waostrategy-planning-loop-2026-09-06.md:10-19` defines the current macro milestone as the rank-and-rent portfolio foundation serving Site Bot/Fix My Business proof—not permission to launch speculative sites.
- `docs/research/rank-and-rent-portfolio-strategy-2026-09-06.md:6-10,60-82` says the first proof is qualified leads and sales, explicitly labels niche scores as directional, and requires outcome evidence before expansion.
- `docs/research/featured-services/001_offer-readiness.md:8-27,42-53` places public Site Bot, incubated-site, and GBP-rebuild claims on HOLD pending ownership, proof, qualification, pricing, disclosure, and exit controls.
- `PROGRESS.md:53-76` still records Site Bot as not fully end-to-end verified and Ads Bot as not live-confirmed. It is stale against some newer artifacts, but it reinforces that public promises must not outrun accepted proof.

## Option comparison

| Dimension | A — high-ticket jobs/leads/closes for high-paying closers | B — Site Bot as primary offer |
|---|---|---|
| Persona fit | Mixed. High-value local jobs fit some trades, but “closer” implies a sales professional or team, not the owner-operator doing the work. Excludes tutors, photographers, and simpler local services unnecessarily. | Strong. It directly serves the owner who lacks time, a website, local visibility, and marketing expertise. The approve-don't-manage model matches his daily reality. |
| Urgency | Potentially very high when leads leak or valuable jobs are missed, but the urgency belongs to Phone Bot/lead rescue after demand exists. | High at the first visible gap: no site, weak GBP, poor local discoverability. The free scorecard creates an immediate diagnosis without claiming results. |
| Willingness to pay | Potentially higher per client, but requires enough job margin, sales capacity, response discipline, and confidence in lead quality. This narrows the market. | Lower entry friction and aligned with the locked ladder. Retention still depends on visible recurring value and an approved cancellation/ownership contract. |
| Sales motion | Consultative and qualification-heavy: lead definitions, territory, capacity, SLA, attribution, close reporting, pricing, and disputes. | Product-led: free audit/scorecard → paid continuation → recurring local-visibility operations. Human gates remain for assets, facts, publication, and account authorization. |
| Operational complexity | High. Requires multi-party lead routing, consent, deduplication, response SLA, quality disputes, booked/won feedback, revenue attribution, and often call handling. | Moderate and closer to current architecture: research, site generation, GBP remediation, deployment, monitoring, proof capture, and owner approvals. Important ownership, billing, and exit gaps remain. |
| Proof requirement | Highest. Must prove qualified lead, contacted, booked, won, value, attribution confidence, exclusions, and economics by cohort. Traffic or call counts are insufficient. | Still material, but staged. First prove truthful audit, owner-controlled deployment, eligible indexed pages, operational reliability, and then attributable calls/jobs/won outcomes. |
| SEO/content implication | Encourages narrow commercial vertical pages and “high ticket” language that may not match search intent; risks premature claims and overfitting the brand to experimental niches. | Preserves the local-SEO/GBP information architecture and lets keyword pages stay intent-specific. Site Bot becomes the conversion bridge rather than replacing every informational query with sales copy. |
| Current milestone fit | Useful as the proof metric for Hogegim and selected portfolio experiments, not as the public brand promise. Current documents explicitly keep these claims experimental. | Best fit. The rank-and-rent control plane is described as proof infrastructure for Site Bot/Fix My Business, while Site Bot remains the Vision product. |

## Positioning decision

Use a two-layer message hierarchy:

1. Primary promise: WAO operates the owner's local Google presence while he stays in control and returns to work.
2. Primary offer: free GBP audit/scorecard as the entry; Site Bot/Fix My Business as the paid continuation for eligible businesses.

Outcome language should progress by evidence maturity:

- Allowed now: audit findings, owner-controlled assets, work performed, pages published after approval, operational status, and clearly labeled observations.
- Allowed only when measured and consented: calls, qualified leads, booked jobs, won jobs, value ranges, and cohort conversion rates with uncertainty.
- Not allowed: guaranteed rankings, guaranteed leads, universal timelines, invented savings, unsourced benchmark percentages, or a blanket claim that every buyer has high-ticket economics.

## Page and navigation decisions

### Change now at the drafting level

1. Homepage first impression and metadata
   - `src/app/(app)/layout.tsx:24-69`
   - `src/components/Hero.tsx:6-22`
   - Replace generic agency and “fire your agency” framing with the Site Bot/approve-don't-manage hierarchy.
   - Make the free audit the lower-friction primary entry and Site Bot the explicit product continuation; exact CTA hierarchy requires Eitan approval before wiring.
   - Remove unsupported proof counters from the first impression unless a source record is attached.

2. Sitewide navigation and footer
   - `src/components/Header.tsx:6-13,65-101,166-220`
   - `src/components/Footer.tsx:5-42,78-90`
   - Put Site Bot in primary navigation. Surface the free GBP audit as the acquisition CTA once its public readiness gate passes.
   - Demote Training and Blog from primary navigation; keep them accessible in the footer and sitemap for residual SEO.
   - Remove the separate GMB Bot service posture from the footer because `VISION.md:42-45,253-259` merges GBP into Site Bot.
   - Keep SEO and Google Ads discoverable as capability/service pages, not equal-weight primary offers.

3. Homepage support sections after the first-impression pass
   - `src/components/Services.tsx:6-21`
   - `src/components/Process.tsx:4-15`
   - `src/components/WhyWao.tsx:4-18`
   - `src/components/Testimonials.tsx:4-15`
   - `src/components/CtaBanner.tsx:4-12`
   - Preserve the capability grid for discoverability, but make the hierarchy unmistakable: Site Bot first; other capabilities support the lifecycle.
   - Replace agency-style discovery/90-day-plan/weekly-meeting process language with audit → owner facts/approval → execute → evidence/ongoing operation.
   - Remove or quarantine placeholder-looking testimonials and unsupported counters. The B2B technology and fintech roles also contradict the stated B2C/micro-business focus.

4. About and consulting alignment
   - `src/app/(app)/about/page.tsx:7-18,58-115,151-183`
   - `src/app/(app)/consulting/page.tsx:6-18,51-108,143-177`
   - Rewrite the ideal-client definition. The current `about` FAQ specifies B2C businesses with ₪10,000+ monthly marketing budgets, which conflicts with the micro-business wedge and the free-audit acquisition logic.
   - Keep founder experience, values, and a consultative lane for existing-site or complex businesses. Do not let consulting become the default CTA for the no-site persona.

5. Site Bot and separate GBP product cleanup—blocked on product truth, not merely copy
   - `src/app/(app)/site-bot/page.tsx:7-49,132-171,252-290,439-461`
   - `src/app/(app)/google-business/page.tsx:7-24,81-99,117-198,316-338`
   - Site Bot still states one-time ₪1,490 pricing, 24-hour delivery, and customer-owned Cloudflare/GitHub claims that conflict with newer strategy and observed deployment architecture. Do not polish these claims; reconcile product, billing, ownership, cancellation, and proof first.
   - The separate ₪149 GMB Bot page conflicts with the merged Site Bot product. Decide redirect versus historical/retainer-only reframing only after route, customer, and SEO impact review.

### Preserve search intent; change only conversion bridges

1. SEO hub and long-form guides
   - Preserve topic targets, URLs, article structures, breadcrumbs, internal links, and author/entity anchors in:
     - `src/app/(app)/seo/page.tsx`
     - `src/app/(app)/seo/guide/page.tsx`
     - `src/app/(app)/seo/keyword-research/page.tsx`
     - `src/app/(app)/seo/topical-authority/page.tsx`
     - `src/app/(app)/seo/international/page.tsx`
     - `src/app/(app)/seo/consulting/page.tsx`
   - Do not rewrite these pages wholesale around the micro-business persona; that would damage query-intent fit.
   - Add a compact decision bridge near bottom CTAs: no site/weak local presence → free audit/Site Bot; established site/complex SEO need → consultation.
   - Audit unsupported time, percentage, ranking, and outcome claims before any metadata or copy refresh. Examples include `src/app/(app)/seo/guide/page.tsx:386-395` and conversion/timeline statements found across the SEO hub and spokes.

2. Training and Blog
   - Keep routes, indexability, existing course/article assets, and topical internal links.
   - Demote them from the primary sales journey because `VISION.md:61-66,163-167` says courses are residual SEO/internal capability rather than the funnel top.
   - Do not spend this milestone rewriting all educational content for the persona. Add product bridges only where naturally relevant and evidence-safe.

3. Google Ads, Content, Social, and specialist consulting pages
   - Keep their keyword-focused service intent and indexability.
   - Present them as later capabilities or qualified service lanes, not equal primary offers.
   - Remove or substantiate numeric performance claims before using them as proof. `src/app/(app)/google-ads/page.tsx:8-17,118-122` is a high-risk example.

### What remains unchanged

- WAO remains Google-first.
- The owner-control/property-manager principle remains strategically central, but public ownership claims must match the real delivery contract and architecture.
- Site Bot's research-first, non-doorway-page content gates remain unchanged.
- The free GBP scorecard remains genuinely useful and ungated; easy fixes stay free.
- SEO guides retain their search-intent architecture, canonical URLs, author schema, and residual trust value.
- Human approval remains mandatory for Hebrew voice, title/H1/keyword anchors, client-facing claims, pricing/contracts, publication, domains, GBP changes, and deployment.
- Rank-and-rent remains a bounded proof path with no public high-ticket promise until real outcomes exist.

## Recommended implementation order and gates

1. Draft a homepage-and-shell positioning bundle only; do not edit production files.
2. Run independent Hebrew QA.
3. Eitan approves the exact offer hierarchy, CTA destination, title/H1 anchors, and every retained proof claim.
4. Separately reconcile Site Bot pricing, billing, owner-controlled assets, cancellation/exit behavior, 24-hour claim, and GBP page disposition.
5. Only then author an engineer wiring spec with byte-exact approved Hebrew and independent runtime/RTL verification.
6. After first-impression metrics and proof mature, add persona-aware bridges to SEO/service pages; do not mass-rewrite indexed guides.

## Follow-up handoffs authored

- `handoff/pending/2026-09-06_048_waocopy_draft-persona-website-shell.md` — draft-only first-impression bundle.
- `handoff/pending/2026-09-06_049_waohebrewqa_review-persona-website-shell.md` — independent Hebrew QA.

No engineer apply handoff is authorized. It would be premature before Eitan's spot-check and the product-truth gates above.

## Context sizing

`AGENTS.md` records a real 1,000,000-token context length for `waocopy` and `waohebrewqa`. Each follow-up reads a bounded set of source excerpts and produces/reviews one small JSON bundle, expected below 80,000 tokens. No task receives the full website or repository payload.
