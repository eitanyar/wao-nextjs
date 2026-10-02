# Astra Authority-First Homepage Decision — 2026-09-27

## Decision

REJECT the currently approved top-page authority treatment despite its structural and visual QA PASS. Eitan's direct review of the restricted local homepage at `http://100.102.160.114:4017/` is the controlling product-acceptance evidence: the founder card, click-to-load video, duplicated path explanation, repeated founder content, and disclaimer-heavy Partner block feel artificial rather than authoritative.

ADOPT an authority-first top flow for the busy Israeli service-business owner:

1. `#hero` owns the visitor promise, persona recognition, and primary next action. Preserve the current title, single H1 lines, and hero eyebrow from `src/content/astra-homepage-copy.json`; do not add another explanatory offer block.
2. The founder portrait becomes a restrained human-authority element, not a large biography card. It establishes who is accountable once. Preserve `#people` by moving that anchor to this authority element; remove the later duplicated founder section from the homepage.
3. `#proof` owns customer voice only. Show the authorized WAO customer-review video as a normal, immediately available privacy-enhanced, non-autoplay player with a direct fallback link. Remove the separate load button and pre-player consent lecture. This direction supersedes the earlier click-only presentation requirement, but does not authorize downloading, cropping, still extraction, copied thumbnails, quotations, identities, results, or claims from the video.
4. `#paths` owns offer choice once. Merge the useful decision guidance from `#choose_path` into the existing two-path section and remove the duplicate pair of path cards. Keep exactly two starting paths and the existing conversion destinations.
5. Google Partner proof becomes a compact factual credential near the accountable founder treatment: official local badge, current Partner status, Search/Display scope, and exact directory link. Remove the visible legalistic stack. Truth is preserved through precise factual wording, no endorsement language, no outcome implication, and provenance in the English source manifest.
6. Every later section keeps one distinct job. Do not repeat the hero promise, founder biography, path decision, video framing, or Partner status. The final CTA may ask for action but must not restate the hero body.

## Current Evidence

- Current source renders the founder in `src/components/home/AstraHome.tsx:79-90`, repeats founder/accountability content at `:128-145`, and repeats the founder again at `:236-259`.
- Current source renders a separate two-path decision section at `src/components/home/AstraHome.tsx:108-147` and another two-path section at `:149-185`.
- Current video framing duplicates its context between `src/components/home/AstraHome.tsx:97-104` and `src/components/home/AstraProofVideo.tsx:12-15`, then adds a separate activation barrier at `src/components/home/AstraProofVideo.tsx:16-32`.
- The current Partner block renders two defensive disclosure paragraphs at `src/components/home/AstraHome.tsx:134-144`.
- The live restricted runtime displayed the same repeated message pattern and click barrier. Independent task `t_5d4dc7e4` proved technical quality, responsive integrity, accessibility behavior, and non-misleading disclosure; it did not prove owner acceptance or sellability. Eitan's later rejection therefore supersedes the prior visual PASS for product acceptance.

## Source and Claim Boundaries

- Preserve the existing SEO title, single H1 text, and hero eyebrow exactly.
- Preserve `/google-ads/onboarding`, `/google-ads`, `/site-bot/start`, `/site-bot`, `/about`, and `/contact#contact-form` destinations.
- Preserve the exact Partner directory URL and official local badge bytes.
- Preserve video provenance and no-quote/no-result boundaries. Update only the manifest's presentation authorization after implementation to record Eitan's 2026-09-27 instruction to remove the needless click barrier.
- Do not invent customer names, testimonial quotations, campaign outcomes, client counts, ratings, awards, experience totals, revenue, leads, rankings, ROI, or Google endorsement.
- Keep the existing Organization-level Partner directory `sameAs`; no schema expansion is required.

## Required Delivery Order

1. `waocopy` drafts one standalone replacement bundle for the changed authority-first top-page strings.
2. `waohebrewqa` performs material Hebrew QA before any engineering consumption.
3. `waoengineer` consumes the approved bytes without typing Hebrew, restructures the exact affected seams, updates focused tests and the source manifest, and runs focused checks, scoped lint, canonical tests, build, and local runtime evidence.
4. `waoverifier` independently checks source/runtime/privacy/route behavior.
5. `waouxtester` performs serious desktop/mobile visual review explicitly against Eitan's rejection: authentic authority, no repetition, no needless video barrier, compact credible Partner proof, and persona-led hierarchy.

No commit, push, publication, deployment, or `deploy.sh` execution is authorized by this decision.