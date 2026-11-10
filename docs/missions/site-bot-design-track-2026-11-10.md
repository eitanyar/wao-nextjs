# Site-Bot design track — richer generated sites (reviews, photos, icons, conversion bar)

Approved by Eitan 2026-11-10. Owner: Adam. Reference for richness: aaasada.com/azkarot. Mockup of the reviews carousel
(sample reviews, localhost only): scratchpad `mock-reviews/`, built by `mock-carousel.py`.

## Outcome
Generated sites stop looking plain: real Google reviews in a carousel with a rating summary, a hero rating badge, the owner's
own profile photos, service icons, a mobile sticky call / WhatsApp bar, check-mark lists, a profile card with a years badge,
and an "us vs the usual" table — every block built only from real data and absent when its data is missing.

## Files
- Specs (verbatim): `docs/research/site-bot/design-track-maya-spec-2026-11-10.md` (components, markup, a11y, empty states,
  page-type matrix, build order, 23 labels for Tamar) and `docs/research/site-bot/design-track-dana-tokens-2026-11-10.md`
  (`RICH_THEME_TOKENS` per vertical; Adam machine-checked every text pair ≥ 4.5 and graphic pair ≥ 3 on 2026-11-10: 0 failures).
- Renderer `src/lib/lp/researchedSite.ts` (zero Hebrew bytes), labels `src/lib/lp/researchedSiteLabels.ts`, tokens
  `src/lib/lp/verticalThemes.ts` (+ contrast tests), phone helpers next to `israeliPhoneE164`.

## Constraints
- Real data only: the owner's Google reviews and owner-uploaded photos arrive with M4 manager access. Never sample reviews,
  stock photos posing as his work, or invented comparison rows on a live site.
- No `AggregateRating` / `Review` JSON-LD from these reviews (self-serving review policy; Yonatan to confirm).
- Static HTML; JS only as progressive enhancement (carousel works with JS off via scroll-snap). Logical CSS only; RTL arrows per
  Maya; no autoplay; reduced-motion respected; tap targets ≥ 44px; no page-level horizontal overflow; images sized + lazy.
- WhatsApp link only for mobile numbers (05x); landline → call button only. Check overlap with the existing `stickyHeader`.
- Engineer never authors Hebrew: Maya's 23 labels + the icon keyword-stem list → waocopy → Noa → byte-exact patches.
- Build order (Maya): sticky bar → reviews carousel (fixture data until M4) → hero badge → icons → check lists → gallery
  (needs photo fetch / resize / hosting pipeline) → profile card (needs a founding-year owner field) → comparison table (last,
  after the legal wording decision).

## Acceptance
- Each component: unit tests for its empty-state rules; contrast tests for the new token pairs; old records render byte-identical.
- Maya audit at 390×844 and 360×640: bidi, overflow, carousel keyboard use, focus not obscured by the sticky bar, reduced motion.
- Eitan sees each component on a localhost render before it ships.

## Open owner decisions (bundle for Eitan)
(a) hero badge minimum (proposed ≥ 5 reviews and ≥ 4.0); (b) show only 4★+ reviews or all (Google discourages misleading
selection); (c) customer-uploaded photos allowed or owner-only (proposed owner-only); (d) "usual" column wording (proposed a
neutral "not always" mark, no claims about competitors); (e) check current Google attribution / display terms for Business
Profile reviews before launch.

## Verifier
Roni: runtime render of homepage + service page with fixture reviews/photos (desktop + mobile, RTL), carousel with JS on and
off, WhatsApp/call links correct, every block absent with empty data; `git diff data/clients/` empty.
