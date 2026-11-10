# Site-Bot design track: component spec (Maya, read-only, 2026-11-10)

I read `researchedSite.ts`, the head of `verticalThemes.ts`, and `mock-carousel.py`. I could not fetch aaasada.com, so I worked from your summary. I wrote no files.

## Findings about the current code that shape the spec

- **Where blocks go.** `buildPageHtml` (line ~501) assembles the sections. Existing sections already follow the "render nothing if empty" pattern (`hasStory`, `hasAbout`, `hasServiceCards`). Every new block should be a function `xSection(page, data, theme): string` that returns `''` when its data is missing.
- **Reviews today.** `reviewSection` (line 284) renders one quote, with `״` quotation marks and italics. The carousel replaces it.
- **Sticky header.** `stickyHeader(theme, businessName, phone, phoneHref)` already exists in `body`. I did not read its source, so I don't know whether it is sticky on mobile or already has a call button. The sticky bar (component 5) must not duplicate it.
- **Theme tokens already cover most of what I need.** `accentText` is a darkened accent, safe for text at 4.5:1 or better. `accentFillText` is the text colour for a solid accent fill. `ctaText` is the text colour on the CTA gradient. Use them for contrast and do not invent colours.
- **Contrast gap: the star colour.** The mock's `#E8A300` stars on a white card are about 2.2:1. Stars are decorative as long as the number is also printed as text, but I recommend a new token `starFill`. That is Dana's decision. As a fallback, outline the stars with `currentColor`, or keep `#E8A300` and always show the numeric rating next to it as text (the 1.4.11 non-text-contrast exemption for information that also appears as text).
- **Mock bugs to fix in production.**
  - The arrow chevrons are hard-coded: `‹` is "next" and `›` is "previous". In RTL, "next" scrolls toward the left, so the glyphs are correct only by accident. Production should use inline SVG chevrons and `scroll-snap` with logical direction handling (see 1).
  - The scroll is `-d * (width+14)`, which relies on negative `scrollLeft` in RTL. It works in modern browsers, but feature-test it.
  - The track has `tabindex="0"` but no name, so it is an unnamed focusable.
  - The JS is bound at the document level and assumes there is only one carousel.

## Shared rules (all components)

- **Data gate.** Each block takes a typed input, and a `has*()` guard returns `''` when the data is missing. No placeholder text, no "coming soon", and no empty heading.
- **Heading order.** The H1 stays in the hero. Each new section gets an H2 that is visible, or visually hidden if the section needs one for its landmark. Never skip a level.
- **Images.**
  - Always `width` and `height` attributes plus CSS `aspect-ratio`.
  - `loading="lazy"` and `decoding="async"` on everything below the fold.
  - The hero image, if any, is the only image without `loading="lazy"`. Give it `fetchpriority="high"`.
  - Serve photos as WebP, resized to a 2x maximum for the displayed size. Gallery thumbnails are about 480 px wide, and the lightbox/enlarged view is about 1200 px.
  - **LCP budget:** the hero image is at most 60 KB (mobile) and at most 120 KB (desktop). Use `srcset` with two widths. If there is no hero photo, the LCP is text. That is better, so do not add a hero photo just to have one.
  - Total page weight target on mobile 3G: under 300 KB of images above the fold, and under 600 KB for the whole page's eager resources.
- **Colours.** Tokens only. Never hard-coded hex except `starFill`, which is pending Dana.
- **Logical CSS only.** `margin-inline`, `padding-inline`, `inset-inline-*`, `border-inline-*`. The physical `left`/`right` audit applies to every new decorative element (fade overlays, badges positioned at a corner).
- **Photo provenance.** Alt text defaults to a fixed label plus the business name (for example "photo of {business}"). The owner's real captions are not available through the API, so do not make up descriptions. Describing the photo content automatically is a different feature and needs Eitan's call.
- **Page types.** I assume two kinds: the homepage (full set) and service/area pages (the researched pages that render `rendersSiteSections`). The tables below say which blocks go where.

## 1. Reviews carousel with rating summary

**Placement:** the homepage, right after the story section. It replaces `reviewSection`. On service and area pages, show it only if the page already rendered the single quote today, in the same position, and use only reviews that mention the service if that mapping exists. If it does not, show nothing on those pages, because this is not content-neutral.

**Data source:** the owner's real Google reviews (M4). Fields per review: author display name, star count, text, relative or absolute date, and optionally the review URL. Summary fields: average and total count, taken from the place data and not recomputed from the shown subset, because the carousel is a subset. Use the profile's average, which can differ from the subset's.

**Empty-state rule:**
- 0 reviews: render nothing, including the heading and the summary.
- 1 to 2 reviews: no carousel. Render a static column of cards, no arrows. Show the summary only if the count and average exist.
- 3 or more: carousel.
- Reviews with empty text (rating only) are skipped in the carousel and still counted in the total.
- Filter to 4 stars and up only if Eitan decides on it. That is a product question, and I would flag it, because Google's rules (below) say you shouldn't selectively present reviews in a misleading way.

**Structure and markup:**
```html
<section id="reviews" data-section="reviews" aria-labelledby="reviews-heading">
  <header>
    <h2 id="reviews-heading">[label: reviews heading]</h2>
    <p class="summary"><span class="avg">4.9</span> <span aria-hidden="true">stars-svg</span>
       <span class="count">184 [label: reviews on Google]</span></p>
  </header>
  <div class="rv-wrap" role="region" aria-roledescription="carousel" aria-labelledby="reviews-heading">
    <ul class="rv-track" tabindex="0" role="list" aria-label="[label: reviews list]">
      <li class="rc"><article>
         <header>avatar(initial, aria-hidden) name, date</header>
         <p class="stars"><svg role="img" aria-label="5 [label: out of 5]">…</svg></p>
         <blockquote><p>text</p></blockquote>
      </article></li>
    </ul>
    <button type="button" class="rv-btn" data-d="prev" hidden aria-label="[label: previous]">svg</button>
    <button type="button" class="rv-btn" data-d="next" hidden aria-label="[label: next]">svg</button>
  </div>
  <p class="attrib">[Google attribution]</p>
</section>
```
- Cards: `flex: 0 0 min(300px, 82%)`, `scroll-snap-align: start`, `scroll-snap-type: x mandatory`, `scrollbar-width: none`, `overscroll-behavior-x: contain`. Use `list-style: none` on the `<ul>`.
- The 82% on mobile leaves the next card peeking, which signals scrollability without arrows.
- The arrow buttons carry the `hidden` attribute in the markup, and the script removes it. With JS off, the arrows don't exist, and the swipe/scroll-snap track still works, as does keyboard scrolling since the track is focusable.
- Long reviews: clamp to about 6 lines (`-webkit-line-clamp: 6`) with the full text in the markup. Do not add a "read more" that requires JS. If a clamp hides text, expose the full text on the card via the review URL link (if present).
- Avatar: initial in a circle (decorative, `aria-hidden`). Do not hotlink Google profile pictures. That is a third-party request, a privacy issue, and a layout-shift risk.

**JS (about 25 lines, progressive enhancement):**
- Remove `hidden` from the buttons.
- On click, `track.scrollBy({left: dir * cardWidth, behavior: reduced ? 'auto' : 'smooth'})`, where `dir` is derived from `getComputedStyle(track).direction`. In RTL, "next" is the visually leftward direction.
- Disable the arrow (`aria-disabled="true"`) at either end, based on `scrollLeft` with `Math.abs`, since RTL scrollLeft is zero or negative.
- Use one handler for all carousels, scoped via `closest('.rv-wrap')`. No autoplay, no timers, no auto-advance.

**RTL arrow rule:** the "next" arrow sits at the inline-end and points left (`<`). The "previous" arrow sits at the inline-start and points right (`>`). In the DOM, put the previous button first. In an RTL flexbox it then lands on the right, which is correct. Use one chevron SVG and flip it with `transform: scaleX(-1)` on `:dir(rtl)` or on `[dir=rtl]`, so the shapes stay in sync automatically.

**a11y notes:**
- Named region (`role="region"` plus a name). `aria-roledescription="carousel"` is optional. I'd include it, but only with the region name, because a bare roledescription is worse than nothing.
- The track is focusable (`tabindex="0"`), has an accessible name, and has a visible `:focus-visible` outline (2px `accentText`, offset 2px). Arrow keys scroll it natively.
- Buttons are 44 x 44 px, with an SVG icon and the label on the button, not on the SVG.
- `@media (prefers-reduced-motion: reduce)` sets `scroll-behavior: auto` and removes any transitions.
- Stars: the SVG row has an `aria-label` like "5 out of 5" (fixed label plus number), and the author name is real text. Do not use `★` characters as the only carrier of meaning.
- The attribution line is plain text.
- Keep the cards non-interactive unless there is a review link. If there is one, make the date the link text, and make sure the link is at least 44 px tall or has sufficient spacing (WCAG 2.5.8 allows inline links).

**Mobile / desktop:**
- Mobile (under 640 px): swipe, next card peeking, buttons visible only if there is room. I'd hide them under 480 px if they would sit on top of cards. The summary stacks above the track.
- Desktop: 3 cards visible in a 960 px container (`min(300px, 82%)` gives about 3 at 960). The summary row sits on the inline-start side and the arrows on the inline-end side of the header, as in the mock.

**Rating summary and attribution (flagged, not certain):**
- Google's Places API terms require attribution when showing Places data. As I understand it: show the "Google" attribution, do not alter the content, and do not cache reviews beyond the allowed period. The Business Profile (manager access) API is different, and that is M4's route. Business Profile API terms are less explicit about display, and the owner is showing his own reviews on his own site, which is a common practice, but **I am not sure** of the exact current wording. **Flag for Adam / Eitan:** check the current Google Business Profile API Terms and Places "Policies" page before launch, specifically (a) a required "Google" logo or text attribution, (b) any rule against showing a filtered subset, (c) any freshness/cache limit, and (d) the rule about review schema (see next point).
- **Schema warning:** Google's structured-data guidelines say self-serving reviews (`Review` or `AggregateRating` markup for a LocalBusiness, about the business's own site) are not eligible for review rich results. Do not add `AggregateRating` JSON-LD from these reviews to `schemaGraph`. That is a handoff to Eitan-Dev and Yonatan: either leave it out or get a sign-off.
- Use a text-only attribution: the word "Google" in the label ("{count} reviews on Google"), plus a link to the owner's Google profile if the URL is known. Do not draw the Google logo without brand-guideline approval.
- Do not invent the date. Show Google's relative date string if that is what the API returns, or format the absolute date. Never imply a date.

## 2. Hero rating badge

**Placement:** the hero on the homepage and on service/area pages. Rendered above the H1, or below the subheadline and before the CTA. I recommend below the subheadline, right above the CTA, because it supports the click. It must not push the H1 down on mobile.

**Data source:** the same summary (average, count). **Empty-state:** render nothing unless both exist and the count is at least 5 (threshold is a product call for Eitan; a "4.0 from 2 reviews" badge hurts more than it helps). If the average is below 4.0, render nothing in the hero but keep the reviews section.

**Markup:**
```html
<a class="hero-rating" href="#reviews" >
  <svg aria-hidden="true">star</svg>
  <strong>4.9</strong>
  <span>[label: from] 184 [label: reviews on Google]</span>
</a>
```
- Link only if `#reviews` renders on the same page. Otherwise a plain `<p>`.
- A pill: `display:inline-flex; gap:8px; min-height:44px; padding-inline:14px; border:1px solid border; border-radius:999px; background: surface`. The text is `textPrimary`, the star is `starFill`.
- **a11y:** the link text reads naturally. The star SVG is hidden. The number must be real text. Contrast of text on `surface` is AA via tokens. Focus ring as above.
- **Mobile / desktop:** one line on desktop. On mobile it wraps the label under the number if needed (`flex-wrap`), and it stays centred or start-aligned to match `heroTextAlign`.

## 3. Photo strip / gallery

**Placement:** homepage, between the services and about sections (shows the work after the offer). On service pages, only if photos can be tied to that service; otherwise skip. On area pages, skip.

**Data source:** the owner's Google Business Profile photos (manager access), only those the owner uploaded (owner or "merchant" photos), not customer-uploaded photos, unless Eitan decides otherwise, since customer photos carry the uploader's rights. Excluded: logos, cover images with text overlays if detectable, and duplicates. Never stock images.

**Empty-state:** 0 to 2 photos: nothing. 3 to 5: a static grid. 6 or more: the first 6 in the grid, plus a "more" link to the Google profile if its URL exists (label below). Cap at 8 to protect page weight.

**Structure:**
```html
<section id="gallery" data-section="gallery" aria-labelledby="gallery-heading">
  <h2 id="gallery-heading">[label: gallery heading]</h2>
  <ul role="list" class="gal">
    <li><img src="…480.webp" srcset="…480 480w, …960 960w" sizes="(min-width:768px) 33vw, 50vw"
            width="480" height="360" loading="lazy" decoding="async" alt="[label: photo of] {business}"></li>
  </ul>
</section>
```
- Layout: CSS grid, `grid-template-columns: repeat(2, 1fr)` on mobile and 3 on desktop, `gap: 8px`, each image `aspect-ratio: 4/3; object-fit: cover; border-radius: radiusMd`. Fixed crop means no layout shift and uniform tiles even though source photos vary.
- No lightbox in v1 (it needs JS plus focus trapping, and a bad lightbox is an a11y regression). Tiles are not links. A later option is a CSS-only `:target` lightbox, but I don't recommend it.
- **Alt text:** repeated identical alt on every tile is noisy for screen readers. Use the fixed label plus the business name, plus a number ("photo 2 of 6" as a label template), or mark them `alt=""` if Eitan prefers them as decorative. My recommendation: meaningful but short alt on the first image, numbered on the rest. The decision on auto-generated descriptions is Eitan's.
- **Mobile:** 2 columns, a 3-tile first row is unnecessary. Desktop: 3 columns. A horizontal strip would add a second scroller to the page, so I prefer the grid.
- **Perf:** all lazy, because the gallery is below the fold. Pre-resize at generation time (the build step, which is Eitan-Dev's), not at runtime.

## 4. Service icons

**Approach:** a small, fixed in-house set of about 24 inline SVG icons (single-colour, 24 px grid, 1.75 px stroke, `currentColor`), stored in a TypeScript map `SERVICE_ICONS: Record<IconKey, string>` of SVG path strings. No icon font (blocks render, FOUT, and accessibility trouble), no external CDN, and no runtime library. This is about 200 to 400 bytes per icon, and only icons actually used on the page are emitted.

**Why not generic AI-generated or per-business icons:** inconsistent quality. A fixed vetted set is on-brand and testable. I'd draw it, or source it from a permissively licensed set (Lucide is ISC, Tabler is MIT; check the licence file and keep the notice in the repo). **Dana** should approve stroke style and sizes.

**Icon keys (starting set):** plumbing/water, electrical, locksmith/key, air-conditioning, cleaning, painting, renovation/hammer, roofing, gardening, moving/truck, pest control, car, medical/cross, tooth, beauty/scissors, massage/wellness, fitness, legal/scale, accounting/calculator, camera/event, music, food, pet, education, phone/support, generic (check-in-circle).

**How an icon is picked for a service** (deterministic, in this order):
1. Match the service name or its slug against a keyword table (Hebrew stems and English stems per icon key) held in code. This is data, not copy. The engineer must not type the Hebrew stems himself, so Tamar supplies the stem list as a byte-exact patch, or Noa/Tamar approve a short list.
2. If no match, use the vertical theme's default icon (a map from `VerticalKey` to icon key).
3. If still none, use the generic icon, or **no icon** at all. I prefer no icon over a wrong icon (a wrong icon is worse than a missing one). If more than half of the cards would fall to generic, render none for any of them, so that the cards look uniform.

**Placement:** inside each service card (`serviceDetailsSection` cards), above or at the inline-start of the title. On homepage and service pages where service cards render. Not on area pages.

**Data / empty-state:** data is the existing service card titles. No match, no icon (rules above).

**Markup:**
```html
<span class="svc-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none"
  stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="…"/></svg></span>
```
- Container: 48 x 48 px, `border-radius: radiusSm`, a tinted background (`surfaceAlt` on `surface` cards, or the reverse), icon colour `accentText`. Icons are decorative, so `aria-hidden="true"` and no `<title>`. The service name is the accessible name.
- Directional icons (arrows, a truck that faces left or right) must be mirrored for RTL, or avoided. Flag this to whoever draws them. Prefer symmetric icons.
- **Mobile / desktop:** same size. Cards stay in the existing `auto-fit minmax(220px, 1fr)` grid. On mobile the icon sits above the title (one column), on desktop at the inline-start of the title if the card is wide.

## 5. Sticky call / WhatsApp bar (mobile)

**Placement:** every page type, mobile only (`@media (max-width: 767px)`). It's the page's conversion constant.

**Data source:** the phone number (`israeliPhoneE164` already exists). WhatsApp uses `https://wa.me/972…` with the same number, only if the owner's number is a mobile number (starts with `05`). A landline cannot receive WhatsApp. Check that with a function next to `israeliPhoneE164`. If the number is a landline, show the call button only, full width. No phone at all: render nothing. I'm not certain about the number-format rules beyond that, so Eitan-Dev should unit-test the check. Add `?text=` prefilled with a fixed label (Tamar writes it) only if Eitan wants a prefilled message.

**Overlap check (important):** `stickyHeader` already exists, and the hero has `heroCallButton`. If the header already shows a call button on mobile, the bottom bar duplicates it, which is acceptable (the bottom bar is thumb-reachable), but decide whether to hide the header's call button on mobile when the bar renders. I'd keep both only if the header button is small. I have not read `stickyHeader`'s source, so check this before building.

**Structure:**
```html
<nav class="cta-bar" aria-label="[label: quick contact]">
  <a class="cta-call" href="tel:+972…"><svg aria-hidden/> <span>[label: call]</span></a>
  <a class="cta-wa" href="https://wa.me/972…" rel="noopener"><svg aria-hidden/> <span>[label: WhatsApp]</span></a>
</nav>
```
- CSS: `position: fixed; inset-inline: 0; bottom: 0; display: flex; gap: 8px; padding: 8px 12px calc(8px + env(safe-area-inset-bottom)); background: surface; border-top: 1px solid border; box-shadow: 0 -2px 8px rgba(0,0,0,.08); z-index: 50`. Hidden at 768 px and up via `display: none`.
- Buttons: `flex: 1; min-height: 48px`. The call button uses the CTA gradient with `ctaText`. The WhatsApp button uses brand green `#25D366` as a background only if the text on it is dark enough: white on `#25D366` is about 1.9:1, which fails. Use dark text (`#0B3D1E` or similar, to be verified at 4.5:1 or better), or use a darker green `#128C7E` with white (about 4.1:1, still fails for small text, so use bold 18px+ text, or `#0E7A6E`). I'd test the pair with a contrast check before committing.
- **Layout shift:** `position: fixed` doesn't cause shift. Add `padding-block-end` to the `<body>` or footer on mobile, equal to the bar height (about 64 px), so the bar never hides the last content. Set the viewport meta `viewport-fit=cover` if using `env(safe-area-inset-*)`.
- **a11y:** a `<nav>` with a label, native links (no JS), visible focus, tap targets of at least 48 px. Do not use `target="_blank"` without `rel="noopener"`. Do not trap focus. The bar must not cover the focused element: add `scroll-padding-bottom` on `html` equal to the bar height (WCAG 2.4.11 Focus Not Obscured).
- **Cookie/consent overlays:** if any overlay exists at the bottom, coordinate z-index.
- **Desktop:** hidden. The header call button handles it.

## 6. "Us vs the usual" comparison table

**Placement:** the homepage, after services and before about (or after about, before areas). Not on service or area pages (the facts are business-wide, not service-specific).

**Data source:** owner-provided distinguishing facts only (for example: years in business, same-day service, warranty, licence, free quote, family business). Each fact is an owner claim, so the "usual" column must not assert specific falsehoods about competitors. The "usual" column should be a neutral generic statement for each row (for example "varies" or a dash or cross), not a claim about a named competitor, and not a claim that could be considered disparaging advertising. **Legal flag:** Israeli comparative advertising is allowed but must be factual and not misleading. I'm not a lawyer. Ask Eitan whether the "usual" column wording needs review. The safest design: the "usual" column shows only a neutral mark ("not always" as a fixed label) for each row, with no concrete counter-claims.

**Empty-state:** at least 3 owner facts, otherwise nothing. Maximum 6 rows. Facts must be short (under about 40 characters of Hebrew); if one is longer, either truncate in the data layer (not here) or drop the row. Do not ever pad with generic invented rows.

**Structure (a real table, since it is tabular data):**
```html
<section id="compare" data-section="compare" aria-labelledby="compare-heading">
  <h2 id="compare-heading">[label: compare heading]</h2>
  <div class="tbl-wrap" role="region" aria-labelledby="compare-heading" tabindex="0">
    <table>
      <caption class="sr-only">[label: compare caption]</caption>
      <thead><tr><th scope="col"><span class="sr-only">[label: feature]</span></th>
        <th scope="col">{businessName}</th><th scope="col">[label: the usual]</th></tr></thead>
      <tbody><tr><th scope="row">{fact}</th>
        <td><svg aria-hidden/> <span class="sr-only">[label: yes]</span></td>
        <td><svg aria-hidden/> <span class="sr-only">[label: not always]</span></td></tr></tbody>
    </table>
  </div>
</section>
```
- Business column emphasised: bold text, `accent` top border, `surfaceAlt` background tint. Check marks use `accentText` and cross/dash marks use `textMuted`. Never rely on colour alone (WCAG 1.4.1): the icon shape differs and the screen-reader text states the result.
- Row headers (`th scope="row"`) carry the fact, so the table is navigable.
- Mobile: 3 columns fit if the first column is allowed to wrap. The table has `width: 100%; table-layout: fixed`, the first column about 50%, and the other two about 25% each. If the fact text is long, wrap it. The wrapper has `overflow-x: auto` as a safety net only, and must not cause page-level horizontal overflow.
- Desktop: `max-width: 700px`, centred.
- Do not stack cells into cards on mobile. It breaks table semantics, and 3 columns do fit.

## 7. Check-mark lists and profile card with years badge

### 7a. Check-mark lists

**Placement:** inside existing sections where there is a list-like input: service card features, about section bullets, the trust bar items. Not a separate section.

**Data source:** only fields that are already lists in the data (for example service bullet points, owner facts). Do not split paragraphs into fake bullets.

**Empty-state:** an empty or one-item list renders nothing (a one-item list is just a sentence, so show it as a sentence if the field exists). Cap at 6 items.

**Markup:**
```html
<ul role="list" class="checks">
  <li><svg aria-hidden="true">check</svg><span>text</span></li>
</ul>
```
- `list-style: none` removes native semantics in Safari/VoiceOver, hence `role="list"`.
- Layout: `display: grid; grid-template-columns: auto 1fr; gap: 8px`, the icon at the inline-start (the right in RTL). The check is a plain tick, symmetric, so it does not need mirroring. Icon in `accentText`, 20 px, text in `textPrimary` at 1rem or more.
- Desktop: two columns (`columns: 2`) for lists of 4 or more, one column on mobile.

### 7b. Profile card with years badge

**Placement:** the homepage, inside or next to the about section (`aboutSection`), as the top card of that section. Not on other pages.

**Data source:** the owner's facts: business name, owner name (if given), years in business (computed from a founding year the owner provided, or a number he provided; do not infer from Google's listing date), a short role line, and optionally the owner's own photo from the profile photos (only if clearly identified as the owner's, which the API cannot tell us, so default to no photo).

**Empty-state:** no years number: no badge, and the card shows only what exists. If the card would contain only the business name, render no card at all (the about section stays as is). The badge appears only when years is at least 3, or whatever Eitan sets as the minimum. Years must be computed at build time from the founding year, and should be refreshed when the site is regenerated, so it doesn't go stale. Flag it: a hard-coded "30" goes out of date. Store the founding year, and derive the number.

**Markup:**
```html
<div class="profile-card">
  <div class="yrs-badge" role="group" aria-label="[label: years in business template with number]">
    <strong aria-hidden="true">30</strong><span aria-hidden="true">[label: years]</span>
  </div>
  <div class="profile-body"><h3>{ownerName or businessName}</h3><p>{role line}</p></div>
</div>
```
- Badge: a 72 px circle (min 64), `accent` fill, `accentFillText` text colour (this token exists precisely for it). Number at 1.6rem bold, label at 0.75rem. 0.75rem text at 12px is below comfortable; use at least 0.8rem and verify 4.5:1. Position the badge with `inset-inline-start` / `inset-block-start` negative offsets if it overlaps the card corner, never `left`/`right`. If it overlaps the photo, ensure the overlap does not clip on a 360 px screen (verify no horizontal overflow).
- Heading level: the card title is an H3 under the about H2.
- The badge is a static element, so no tap target concern. Text is not clickable.
- **Mobile:** badge above the text, centred or at the inline-start. **Desktop:** badge at the inline-start of the card, text beside it, `max-width: 700px`.

## Page-type matrix

| Component | Homepage | Service page | Area page |
|---|---|---|---|
| 1 Reviews carousel | yes (after story) | only if reviews can be mapped, otherwise no | no |
| 2 Hero rating badge | yes | yes | yes |
| 3 Photo gallery | yes | only with a service-tied photo set | no |
| 4 Service icons | yes | yes | no |
| 5 Sticky bar | yes | yes | yes |
| 6 Comparison table | yes | no | no |
| 7a Check lists | yes | yes | no |
| 7b Profile card | yes | no | no |

## Build order (impact over effort)

1. **Sticky call/WhatsApp bar (5).** Highest conversion impact, smallest effort, no new data dependency. Pure CSS and no JS. Do it first. Check against `stickyHeader` first.
2. **Reviews carousel plus summary (1).** The biggest trust gain. It depends on M4 data, so build it with fixture data in tests, and gate on real data. The static (no-JS) version ships first, and the JS enhancement second.
3. **Hero rating badge (2).** Tiny effort once (1)'s data exists.
4. **Service icons (4).** Moderate effort (drawing or choosing the set, keyword table), visible on every site, and no data dependency.
5. **Check-mark lists (7a).** Small effort, uses existing data.
6. **Photo gallery (3).** High visual impact but depends on the photo pipeline (fetch, resize, host), which is the biggest engineering cost. Do it after the data path from M4 exists.
7. **Profile card with years badge (7b).** Needs a founding-year field to exist in the owner's facts. Build when that field is confirmed.
8. **Comparison table (6).** Lowest priority: it needs 3 or more owner facts, which most sites will not have yet, and it carries the legal-wording question. Build it last, after Eitan answers the legal question.

## Labels for Tamar to write (fixed UI strings; English meaning)

1. Reviews section heading (for example "What customers say").
2. "Reviews on Google" with the count (template: "{count} reviews on Google").
3. Summary connector for the hero badge ("from" a count of reviews; template: "{avg} from {count} reviews on Google").
4. Carousel accessible name for the track (list of reviews).
5. Previous review button label.
6. Next review button label.
7. "out of 5" for the star-rating accessible text (template: "{n} out of 5 stars").
8. "View all reviews on Google" link text (used only if the profile URL exists).
9. Gallery section heading.
10. Gallery alt template: "Photo of {business}" and a numbered form ("Photo {n} of {total}: {business}").
11. "See more photos on Google" link text.
12. Sticky bar `nav` accessible name ("Quick contact").
13. "Call" button text.
14. "WhatsApp" button text (may stay as the Latin brand name; Tamar decides).
15. Optional WhatsApp prefilled message (for example "Hi, I found you on your website"), only if Eitan wants prefill.
16. Comparison section heading.
17. Comparison table caption (screen-reader only).
18. Column header: "The usual" / typical alternative.
19. Screen-reader cell texts: "Yes" and "Not always".
20. Row-header column label (screen-reader only; "Feature").
21. Years badge: the visible word "years", and the accessible-name template "{n} years in business".
22. Profile card fallback role line, if no role is given (ask Tamar whether to have one at all, or leave it empty).
23. Keyword stem list for icon matching (Hebrew stems per icon key). This one is data rather than a visible label, but it needs Hebrew authoring, so Tamar supplies it as a byte-exact patch, and Noa reviews it.

## Handoffs

- **Eitan-Dev:** build the section functions and the one shared enhancement script; the photo fetch, resize and hosting pipeline; the landline versus mobile check for WhatsApp; the founding-year-to-years calculation at build time; and the schema decision (do not emit `AggregateRating`).
- **Dana:** the `starFill` token, the SVG icon set style, and the WhatsApp button colour pair.
- **Tamar:** the labels above. Noa: the gate on them and on the stem list.
- **Yonatan:** whether review markup helps or harms (self-serving review policy), and the section order's SEO effect.
- **Eitan (owner decision, bundle into one):** (a) the minimum review count and rating for the hero badge, (b) whether to show only 4-star-and-up reviews, (c) whether customer-uploaded photos may be used, (d) the legal wording of the "usual" column, (e) a Google attribution check against the current Business Profile API terms (I'm unsure of the exact wording).
- **Maya (me), after build:** audit the real output for bidi, mobile overflow at 390 x 844 and 360 x 640, keyboard operation of the carousel, focus not obscured by the sticky bar, contrast of the WhatsApp button, and reduced-motion behaviour.
