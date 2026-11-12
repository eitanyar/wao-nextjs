# Noa: Site Bot redesign UI labels gate (2026-11-13)

Saved by Adam. This file has no Hebrew of its own: every string is referenced by key/file.

**Verdict: FIX, then SHIP for Redesign A** (items 1–5, 8, and the solid hero from 7).

## Source of truth
- Apply `docs/copy/site-bot-redesign-ui-labels-FINAL-2026-11-12.json`, NOT the r2 waocopy file.
- Never ship: `hero.title`, `hero.subtitle` (SEO anchors stay with researchedPageH1/heroSubheadline), `hero.hours.missing` (hide the row instead).

## Fixes for Redesign A
1. `nav.label` = reuse `RESEARCHED_SITE_LABELS.mainNavLabel` (src/lib/lp/researchedSiteLabels.ts), one label per landmark.
2. New keys `bar.call` / `bar.whatsapp`: move the existing sticky-bar strings from src/lib/lp/renderStaticHtml.ts:231-232, emoji removed (the short forms fit two half-width buttons at 390px).
3. Any hours prefix (visible or screen-reader) uses `hero.hours.label`, never the alternative in Tamar's notes.
4. All sprite icons `aria-hidden` (each sits beside its own text).
5. `{hours}` format: en-dash ranges with no spaces, 24h, a closed day uses `hours.closedDay`, one separator between day groups.
6. renderStaticHtml.ts:161: the hard-coded five-star aria-label must go (replace with `hero.rating.aria` in item 6, or remove now if that template still renders).

## Redesign A keys that ship
nav.label · skip.link · hero.cta.call · hero.cta.whatsapp (hero only) · bar.call · bar.whatsapp · hero.hours · hero.hours.label · hours.days · hours.closedDay · trust.label

## HOLD / later
- `hero.cta.navigate`: HOLD (only with a shown street address, Yonatan condition 10).
- Items 6 / 7-photo labels are clean but wait on the owner-authorised GBP connection. Before they ship: confirm the GBP fetch sorts newest-first with no star filter (`reviews.selection` claim); decide whether `reviews.heading` or the live proof H2 owns reviews.

## YELLOW to Tamar (not blocking)
Saturday spelled out in `hours.days`; `trust.label` as a statement. Generated copy (waocopy site prompt): servicesHeadline preposition (במה), trust line "מגיע בשטח".

## Writing upgrades proposed (accepted)
1. A verb with a fixed preposition keeps it in questions and relative clauses (the preposition moves to the front).
2. Reuse the live label for the same UI element; one concept, one label.
