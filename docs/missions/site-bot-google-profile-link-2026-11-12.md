# Site Bot: Google profile link from place_id (2026-11-12)

## Outcome
Every generated client site shows a working "העסק שלי ב-Google" link (home section + every footer) and the same URL as JSON-LD `sameAs`. It is built from a stored Places `place_id`. When the owner-authorised GBP connection exists (build step 6), the GBP `metadata.mapsUri` takes priority.

## Files
- `src/lib/site-bot/seedPrefill.ts` / `src/lib/site-bot/startIntake.ts`: store `placeId` on the intake record. It is the only Places field we may keep indefinitely.
- `src/lib/lp/renderSitePages.ts` (`googleProfileUrl()`): add the source. The existing `MAPS_URL` allowlist regex already matches `www.google.com/maps/`.
- `src/lib/lp/researchedSiteLabels.ts`: set `RESEARCHED_PROFILE_LINK_LABELS.googleProfileLink` to the Noa-approved label, byte-exact from `docs/copy/site-bot-google-profile-link-label-2026-11-12.waocopy.json` (the `label` field, "העסק שלי ב-Google", ASCII hyphen). Then set `RESEARCHED_PROFILE_LINK_LABELS_PENDING_COPY = false`.

## Constraints (Yonatan C1–C5, verified against Google docs 2026-11-12)
- **C1:** `query` = the owner-confirmed business name from intake. Never a stored copy of the Places `displayName`, because that would be caching Places content. Fallback: the place_id with a generic query made of category + city from intake.
- **C2:** build the URL with `new URL('https://www.google.com/maps/search/')` and `searchParams.set('api','1')`, `set('query', name)`, `set('query_place_id', placeId)`. Never concatenate by hand. Trim the name and cap it at about 100 characters (the URL limit is 2,048). Escape it for JSON-LD with the existing `</` escaping.
- **C3:** use the place_id only if it matches `/^[A-Za-z0-9_-]{10,}$/`. Otherwise render no link and no sameAs. `fixture-…` IDs must never reach production output.
- **C4:** re-check the place_id on regeneration, or at least every 12 months, with a free id-only Place Details call. On `NOT_FOUND`, drop the link and the sameAs, and flag the record for re-matching.
- **C5:** GBP `mapsUri` overrides the built URL once step 6 exists. Never use the Places `googleMapsUri` (Places content, not storable). `placePrefill.ts` must keep not requesting it.
- Bidi (Noa/Maya): "Google" is wrapped in `<bdi>` in BOTH the home section and the footer row.
- No Hebrew authored. The label comes from the approved file.

## Acceptance
Focused tests (URL builder: Hebrew name encoding, spaces as `+`, the cap, invalid and fixture IDs → no link, mapsUri priority), then `npm run test` and the webpack build.

## Verifier
- The home and footer `href` equal the JSON-LD `sameAs` byte for byte.
- The Hebrew name is percent-encoded.
- A fixture or invalid ID renders no link and no sameAs.
- The footer `<bdi>` is present.
- No `__HE_TODO_` anywhere.
- Opening the built URL for a real place_id lands on the right Maps place. Check it manually with WebFetch or a browser, read-only.

Sources: Places policies; Place IDs; Maps URLs get-started; Search Central LocalBusiness and Organization docs; GBP Business Information API (all fetched 2026-11-12).
