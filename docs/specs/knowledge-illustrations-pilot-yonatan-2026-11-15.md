# Knowledge illustrations pilot — Yonatan (seo-strategist), 2026-11-15

Decision: Fable 5.2 D1 (docs/missions/fable52-decisions-2026-11-15.md) — style B, 12 articles, money pages real-only.
Saved by Adam from Yonatan's report (his tools could not create files). Titles are referenced by slug; they do not change.

## Picks
Data: the only GSC export in the repo is `data/clients/wao/pareto.json` (90 days to 2026-08-14); it shows one article
(`/knowledge/international-seo`, 22 impressions). The rest are ranked by intent + business value. Today only
`google-ads-quality-score` links to `/google-ads`; no article links to `/site-bot` ("can link naturally").

| # | Slug | Why | Visual concept |
|---|---|---|---|
| 1 | local-seo | Site Bot's core promise | Neighbourhood street from above, small shop, ink map pins |
| 2 | google-my-business | Site Bot handles the profile | Hairdresser from behind photographing her salon chair |
| 3 | local-pack | Core-30 targets the map box | Three shopfronts on a hand-drawn map, one mint door |
| 4 | google-ads-quality-score | Ads Bot; already links /google-ads | Two plain vans at a petrol station, mint gauge needle |
| 5 | search-intent | Ads Bot + content intent | Customer at a crossroads of three shop doors |
| 6 | ai-overviews | GEO; cost queries trigger AIOs | Notebook pages folding into one answer card |
| 7 | geo-audit-ai-overviews | GEO lead magnet → audit | Carpenter from behind, magnifier on a blank card |
| 8 | international-seo | Only article in GSC data | Jaffa quay crates with blank luggage tags |
| 9 | core-web-vitals | Site Bot site speed | Bakery counter, three hourglasses, one mint |
| 10 | google-search-console | Site Bot weekly digest | Owner from behind at a cafe, notebook of curves |
| 11 | seo-audit | Feeds /site-bot/audit | Mechanic's clipboard checklist against a shop shutter |
| 12 | eeat | Reviews + trust | Garage wall of thank-you notes, no readable text |

## Rules
Keyword anchors: title, metaTitle, H1, summary, og:title stay byte-identical; the image never sits in or before the H1.
1. Files: `/public/images/knowledge/<slug>.<ext>`; crops `<slug>-og.jpg` (1200×630), `<slug>-16x9.webp`, `-4x3.webp`, `-1x1.webp`.
2. Master 1600×900, subject centred (croppable to 16:9, 4:3, 1:1, 1200×630).
3. AVIF first, WebP fallback via `<picture>`, 800w + 1200w, ≤100 KB per file at 1200w.
4. Placement: after the first body section (first H2 block), not the hero; text stays the LCP element.
5. `loading="lazy"`, `decoding="async"`, no preload; switch to eager only if it is visible on load at any viewport.
6. Explicit width/height (1600×900) + CSS `aspect-ratio:16/9;width:100%;height:auto`.
7. Embed IPTC `DigitalSourceType = trainedAlgorithmicMedia`; serve pre-built files (no next/image re-encode); check with exiftool on the served URL.
8. Article schema `image`: array of the 16x9, 4x3, 1x1 crops (≥50K pixels each), same image shown on the page.
9. og:image `<slug>-og.jpg` 1200×630 JPEG for pilot slugs; first check what og:image the page serves today.
10. Confirm `max-image-preview:large`.
11. Alt: Hebrew, one sentence ≤ ~125 chars, topic named once naturally, no "AI illustration" label; waocopy writes it. No figcaption in the pilot.
12. No text, letters, logos or readable signage; no recognisable faces; figures neutral or from behind.

## Risks
- IPTC metadata stripped silently → breaks Google's gen-AI image rule (rule 7). High confidence.
- Scaled-content perception: 12 is low risk; review quality before all 97.
- CWV: hero placement would take LCP / add CLS (rules 4–6).
- Schema image must be visible on the page.
- Discover: ≥1200 px wide, >300K pixels, 16:9, max-image-preview:large.
- Trust: illustrations must never pass as real work photos (style B signals this).
- Measurement: export a 28-day GSC baseline per pilot slug before deploy; compare at ~6 weeks.

## Sources (all fetched 2026-11-15)
- https://developers.google.com/search/docs/appearance/structured-data/article
- https://developers.google.com/search/docs/appearance/google-images
- https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- https://developers.google.com/search/docs/appearance/google-discover
- https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading
- https://iptc.org/news/google-ai-transparency-based-on-iptc-standards/

## Status (Adam, 2026-11-15)
12 masters generated (qwen-image-3.0-pro, token plan, interactive), style B; #4 and #5 regenerated to remove a logo
and gibberish sign lettering. Kept in Adam's scratchpad `illustrations/` until wiring (after Fable D2+D3 verified).
Next: waocopy alt texts; engineer builds rules 1–10; verifier; Adam exports the GSC baseline.
