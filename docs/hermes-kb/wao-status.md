# WAO Project Status (updated 2026-07-11)

## Course — "Build & SEO in the Age of AI"
- 22 of 23 lessons scripted and QA-approved. Zero TTS, zero videos rendered, zero on YouTube.
- TTS GATE: a review artifact (slides + narration side-by-side) must be built and approved by Eitan BEFORE any ElevenLabs credits are spent.
- Missing: L2-4 Slide 10 narration (CTA copy is written and approved; needs embedding).
- Modules M3, M4, M6 still need a dated SEO currency sign-off (Gate 0) before TTS. M5 cleared.
- Module M1 not scripted yet (deliberately after M2).

## GEO Bot (₪199/mo) — most advanced product
- Pipeline built and live: GSC pareto analysis, content generation, verification scripts. LP at /geo, client portal at /client/login.
- Pilot client retter.co.il: 20 quality-gated actions generated, NOT yet sent to the client contact (Hadas).
- BLOCKER #1 of the whole company: the first complete cycle (send actions → client implements → verify) has not run. Eitan must send manually (Wizard-of-Oz mode).
- GSC OAuth self-serve flow not built; client setup is currently manual. Needed before client #2.

## Site Bot (₪9.90 trial → ₪1,490 one-time) — MVP not built
- Onboarding chat (15 turns) exists in code. Cloudflare deploy script exists.
- Missing: static-site renderer currently outputs 1 page; MVP needs 5 linked pages deployed to {slug}.wao.co.il with lead form + WhatsApp button, plus one edit-via-chat proof.
- Course CTAs point to wao.co.il/site-bot — product must be live before those lessons ship.

## Ads Bot (₪249/mo) — deliberately HELD
- Two gates: (a) Google Ads API compliance approval pending, (b) GEO Bot first cycle must finish first. No build started.

## Ads Overlap Bot (tool, live) — NEW since July 4
- Finds keywords where a client ranks organic top-3 with real traffic and flags them as paid-ad candidates, with an inline fast draft ad (English structure, Hebrew guarded).
- Live for clients aasada (aaasada.com, budget catering), merlo (merlo-c.co.il, prestige catering), retter. Full ad-copy pipeline runs ONLY on explicit request, never automatically.

## GMB Bot (₪149/mo) — waiting on Google
- GBP API application submitted 2026-07-04; approval window 1–4 weeks. Do not build until write access is confirmed.

## Content Bot (₪490/mo) & Lead Bot — strategy defined, not scoped for build.

## Deployed 2026-07-11
- Full bot tool suite backfilled across all 4 clients (retter, ajudaica, aasada, merlo).
- Master admin login: /admin/login → dropdown → enter any client portal. Admin credential is WEAK dev value; must be rotated for production hardening.
- GEO scan page (SSRF-protected API), WhatsApp digest script, route protection middleware extended.

## Top open actions (owner)
1. Send GEO actions to retter/Hadas — Eitan, unblocks everything.
2. Build course review artifact — before any TTS spend.
3. Send Google Ads API RFI reply — Eitan.
4. Site Bot MVP renderer (1→5 pages) — dev.
5. GSC OAuth flow — dev, before client #2.
6. Rotate weak admin credential — before production hardening.
