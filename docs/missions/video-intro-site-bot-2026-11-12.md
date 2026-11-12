# Mission: Site Bot intro video, storyboard + visual spec (Fable 5.2, 2026-11-12)

Design only. Nothing here is rendered, and no Hebrew is authored here. Narration comes from
`docs/copy/briefs/video-intro-site-bot-2026-11-12.md` (Tamar → Noa → Eitan's ear).
Parent plan: `youtube-video-plan-2026-11-12.md`; launch mission: `site-bot-full-system-launch-2026-11-19.md`.

## Outcome
One 80–90s master ("how it works") and four cuts (45s / 30s / 15s / 6s), each in 9:16, 1:1 and 16:9,
built by `scripts/video/build-video.mjs` from one script JSON. The viewer is already on the page or
already saw a Dash ad. He should finish knowing what he gets for the monthly price and what the free
first step is.

**One idea:** it is not a website. It is one system that makes his profile, his site and his reviews
tell the same story, and keeps doing it every month.

## Founder decisions applied
| Decision | How it shows up |
|---|---|
| No founder name in ads | No name in narration, captions or end screen. |
| Price only on the end screen | No price in any earlier line, caption or visual. The last beat shows it and says it. |
| "Cancel anytime, no commitment" stamp | On the end screen only, from `data/video/config.json` `stampText`. |
| WAO said upbeat by Nimrod | `[excited]` tag sits directly before the brand word, in B04 and the end beat only. The rest is a straight register. |
| Eyes-closed rule | Every line must make sense with the screen off. Visuals add proof and never carry meaning alone. |
| Own domain from day one | B11 card. No timing claim is made (set-up takes up to 3 business days). |
| Launch 2026-11-19 | No date inside the video, so it does not expire. The page carries the launch stamp. |

## What is live today (checked in the working tree, 2026-11-12)
| Thing | Status today | Rule for the video |
|---|---|---|
| Free check `/site-bot/audit`: `form`, `loading`, `pick`, `confirm`, `ready` (6-item scorecard) | **LIVE** | Show as a real screen. |
| Generated site: page per service, opening hours, call button | **BUILT** (generated client sites) | Show as a real screen, on a demo business with a demo label. |
| Site on the client's own domain | Built (commit `9f391b9`, Pages domain attach) | Say it; verify on the test client before lock. |
| Visible link from the site to the Google profile | **NOT LIVE** (JSON-LD only) | Do not show or say. |
| Review quotes on the site | Partial (owner types them; not pulled from Google) | Do not show. |
| Profile managed and synced to the site | Code exists, **OFF in prod** (`fix-execute` and `gbp/oauth/start` return 503) | Gate G1. Illustration only, never a screen. |
| Ready review-request message to forward | Partial, placeholder copy, **NOT LIVE** for Site Bot | Gate G2. Illustration only. |
| Draft reply to a new review | Drafts exist; posting **OFF in prod** | Do not show or say in v1. |
| Monthly report | **NOT BUILT** | Gate G3. Illustration only, no numbers. |
| Intake chat `/site-bot/start` | **404 in prod** (needs `SITE_BOT_PAID_FLOW=1` on non-prod) | Gate G4. Real screen only if enabled in prod by lock. |
| Checkout `/site-bot/pay/*` | **404 in prod** (mock) | Never shown. |
| `/site-bot/fix/[auditId]` | **404 always** | Never shown. |
| Buy button on the check result (`PaidBuyCtaSlot`) | **OFF in prod** | Record the result screen with the flag off. |
| `/site-bot` page shows ₪199 | **NO**: the round-2 copy is not applied to `page.tsx` | Blocks placing the video on that page (price mismatch). |

**Gate rule.** A gated beat ships only if Roni passes that item of the launch mission's acceptance flow
by the lock date (recommended 2026-11-17). If a gate fails, the beat is deleted; every gated line is
written to be removable. A real screen is shown only for a live feature. A feature that is not live
never gets a mocked product screen; at most it gets an illustration, and only if its gate passes.

## Storyboard: master (target 84s, 13 beats)
One beat = one narration line = one visual. Times are targets; real lengths come from the audio
(`gapSeconds` 0.4). Cap: 13 lines, about 175 words in total.

Stage and caption zones per aspect are defined once in "Safe zones" below. "Plate" is the framed
real-screen recording defined in the spec.

| Beat | Time | Narration intent (English) | Visual | Caption intent | Framing per aspect |
|---|---|---|---|---|---|
| B01 | 0–6 | A customer needs a tradesman tonight. Before she calls anyone, she makes three stops. | **Illustration I1.** A hand holding a plain drawn phone; a blank search bar with a blinking cursor; three empty slots fade in under it. No Google interface. | The hook, verbatim from the line. | 9:16 phone centred in the stage. 1:1 same, scaled 0.82. 16:9 phone on the physical right third, slots spread to the left. |
| B02 | 6–11 | The three stops: your profile, your site, your reviews. | **Illustration I2.** The slots become three cards with glyphs: pin (profile), page (site), speech bubble with an outline star (reviews). Each lands on its word. | The three nouns, one card each. | 9:16 cards stacked top to bottom. 1:1 and 16:9 a row read right to left: profile on the physical right. |
| B03 | 11–18 | When the three don't agree (different hours, different services), she doesn't ask. She calls the next one on the list. | **Illustration I3.** The cards tilt 3–6°, turn grey with dashed outlines, and small clock and list glyphs inside them differ. The thumb swipes them off. | "They don't agree" then "she calls someone else". | Same layout as B02. Swipe exits physical left in all aspects. |
| B04 | 18–24 | Site Bot from `[excited]` WAO is one system that makes all three tell the same story. | **Illustration I4.** Cards snap upright, outlines turn mint and solid, one mint line threads through all three. Wordmark top corner. | Product name, then "one story". | Same layout. Wordmark physical top-left of the stage. |
| B05 | 24–31 | Your site is built as the tree of your services: every job you do gets its own page. | **Real screen S1.** Demo business generated site, home page, scroll from hero to the services grid, tap one service. Demo label on. | "A page for every job". | 9:16 and 1:1 mobile plate. 16:9 desktop plate. |
| B06 | 31–37 | On every page: your hours and a button that calls you. | **Real screen S2.** Demo site, the service page from B05; scroll to hours; mint ring pulses once around the call button. No tap (no ringing, no dialler). Demo label on. | "Hours. A call button." | As B05. |
| B07 **G1** | 37–44 | Your Google profile is kept in line with the site: same services, same areas, same hours. | **Illustration I5.** Left: a generic drawn profile card (pin glyph, three lines, clock). Right: a drawn site card. Three mint ticks connect matching rows. No Google logo, colours, map or stars. | "Same services. Same hours." | 9:16 cards stacked, ticks between. 1:1 and 16:9 side by side, site on the physical right. |
| B08 **G2** | 44–50 | Finished a good job? You forward the customer a ready message with your review link. | **Illustration I6.** Hand holding the phone; one drawn message bubble with a link glyph flies out. No chat-app interface, no notification banner, no text in the bubble. | "A ready message. Your link." | Phone centred; bubble exits physical left. |
| B09 **G3** | 50–56 | Once a month you get one report: who called, who asked for directions, what reviews came in. | **Illustration I7.** A single drawn sheet with three rows: phone glyph, arrow glyph, bubble glyph. Rows are bars of equal length, **no digits**. | "One report a month." | Sheet centred in the stage, all aspects. |
| B10 **G4** | 56–62 | Your part: tell it about the business once, and approve. | **Real screen S3** if G4 passes: `/site-bot/start` intake chat, demo answers, demo label on. Otherwise **Illustration I8**: two drawn bubbles and a tick. | "You tell. You approve." | S3: plates as B05. I8: centred. |
| B11 | 62–68 | The site runs on your own domain, and the domain and the profile stay in your name. | **Card C1.** Two short lines of on-screen text (from the script's `card` field) on the brand background, mint keyline under the first. | Off (the card is the text). | Text block centred in the stage; max width 80% of the safe box. |
| B12 | 68–75 | Start with the free check: type the business name and see in seconds what a customer sees. | **Real screen S4.** `/site-bot/audit`: `form` state, the demo name is typed, cut on submit to the `ready` scorecard, slow scroll over the 6 items. Demo label on. | "Free check. Just the business name." | Plates as B05. |
| B13 | 75–84 | Site Bot from `[excited]` WAO. The monthly price. No commitment. | **End screen E1** (spec below). Held at least 3s after the voice ends. | Off (`captions: false`). | End-screen layout per aspect. |

Fallback if all four gates fail: B01–B06, B11, B12, B13 (about 60s). It still makes sense, because B04
only promises "the same story" and B05–B06 show the part that exists.

## Cuts
Each cut is its own section in the script JSON with its own lines; lines are shorter than the master's.

| Cut | Where | Beats (visuals reused from the master) | Word cap | Notes |
|---|---|---|---|---|
| 45s | WhatsApp follow-up, audit result screen | K1 = B04 (I4), K2 = B05 (S1), K3 = B07 (I5, G1), K4 = one line merging B08 + B09 (I6 then I7 as a hard cut at the midpoint; G2 + G3), K5 = B11 (C1), K6 = B13 (E1) | 90 | The viewer already ran the check, so no B12. The CTA on E1 still points to the check until the buy path is live. If G2/G3 fail, K4 is deleted. |
| 30s | YouTube | T1 = B01 + B02 merged (I2), T2 = B03 (I3), T3 = B04 (I4), T4 = B05 (S1), T5 = B12 (S4), T6 = B13 (E1) | 58 | No gated beats, so it can ship regardless. |
| 15s | Remarketing offer card | F1 = problem in one line (I3), F2 = solution in one line (S1), F3 = B13 (E1) | 26 | No gated beats. |
| 6s | Bumper | X1 = one line, at most 6 words (I4: cards snapping into line), X2 = E1 with the product and brand spoken, price shown but not spoken | 9 | Must come out at 6.0s or less; needs the pipeline change P5. Lior's doc says under-10s may not serve in Demand Gen in-stream; Dror to confirm before it is built. |

## Safe zones (from `data/video/config.json`, pixels)
| Aspect | Frame | Safe box (x, y) | Caption band | Stage for visuals | Why |
|---|---|---|---|---|---|
| 9:16 | 1080×1920 | x 60–900, y 250–1500 | y 1255–1500 | x 60–900, y 250–1215 | Shorts buttons on the physical right (180), title and CTA band at the bottom (420). |
| 1:1 | 1080×1080 | x 70–1010, y 70–990 | y 784–990 | x 70–1010, y 70–750 | Feed and WhatsApp crops. |
| 16:9 | 1920×1080 | x 110–1810, y 60–1000 | y 781–1000 | x 110–1810, y 60–750 | Player bar and YouTube end-screen controls. |

- Caption band height assumes two lines at the configured caption size.
- Nothing that must be read (text inside a real screen, the demo label, the wordmark) may enter the caption band or leave the safe box.
- Backgrounds and illustration bleed may fill the whole frame.
- Maya confirms the 9:16 numbers on a real phone before the first release.

## Visual design spec

### Sources of truth
- **Colours and type:** Dana's constants in `src/lib/course-thumbnail-tokens.ts` (`COURSE_THUMBNAIL_COLORS`, `COURSE_THUMBNAIL_TYPE`). The `brand` block of `data/video/config.json` already mirrors `bg`, `accent`, `headline`, `secondary`. Templates read the config and hard-code no colour.
- **Fonts:** Rubik and Assistant from `public/offline-fonts` through `src/app/offline-fonts.css` (the site's own heading and body fonts, `--font-heading` and `--font-body` in `globals.css`).
- **Demo site colours:** the demo business keeps its own `VERTICAL_THEMES` theme from `src/lib/lp/verticalThemes.ts` inside the plate. That contrast is wanted: it shows the client's site, framed by WAO.

### Colour use
| Token | Value | Use |
|---|---|---|
| `bg` | `#0D1117` | Every background. Never pure black. |
| `accent` | `#4AE3B5` | The only saturated colour. Means "in agreement / WAO's system": aligned cards, ticks, keylines, CTA pill, price. |
| `headline` | `#F2F5F9` | Caption and card text, illustration fills. |
| `secondary` | `#9AA7B5` | The "disagreeing" state (B03), URL, demo label text. |
| `accentWash` | `rgba(74,227,181,0.08)` | Fill of aligned cards and the demo label. |
| `accentDim` | `rgba(74,227,181,0.55)` | Plate border, stamp border. |
| `glowMint` / `glowBlue` | `rgba(74,227,181,0.14)` / `rgba(56,97,251,0.10)` | Two background radial glows: mint at the physical top-right, blue at the bottom-left. Depth only. |
| `gridLine` | `rgba(255,255,255,0.035)` | 64px blueprint grid, faded out toward the bottom. |

- No red, yellow or orange outside the plate. Disagreement is shown by grey, tilt and dashed outlines, not by a warning colour.
- `#FF4FD8` stays reserved for `_PENDING` values.

### Illustration style (I1–I8)
- **Look:** flat line drawing, slightly hand-drawn (round caps and joins, 1–2px wobble), on the brand background. No gradients inside shapes, no 3D, no photos.
- **Stroke:** 6px at 1080 frame width (scale with width), `headline` colour; `accent` only for the agreement state.
- **People:** one hand and forearm only, drawn as outline. No faces, so no AI person can read as a customer. The Dash character does not appear.
- **Phone:** a plain rounded rectangle with a blank screen. No status bar, no notch detail, no app interface.
- **Cards:** rounded rectangles, radius 24px, each with one glyph and two or three placeholder bars. No readable text inside illustrations; captions carry the words.
- **Forbidden:** Google logos, colours, map tiles or search layout; star ratings with numbers; yellow stars (the one outline star is `headline` colour); notification banners; a ringing phone; counters, charts going up, before/after.
- **Delivery:** one layered SVG per scene. The must-see content sits in a centred square that fills the stage's short side; everything outside it is bleed. Three-card scenes ship in two arrangements: stacked (9:16) and row (1:1, 16:9). Row order is right to left.
- **Ownership:** final art is redrawn by the human illustrator as layers, as in the Dash plan.

### Real screens (S1–S4)
- **Recording:** a Playwright script, so every screen can be re-recorded after a UI change. Mobile set: 390×844 CSS at DPR 3. Desktop set: 1280×720 CSS at DPR 1.5. 30 fps.
- **Data:** one seeded fictional demo business (the named test client's generated site; nothing is written to `data/clients/`). No real business, phone number, review or person appears. S4 uses a pre-seeded audit so the result is stable.
- **Flags:** S1, S2, S4 are recorded with production flags (buy button off). S3 is recorded only if G4 passes.
- **Plate:** the recording sits in a rounded frame, radius 36px, 2px `accentDim` border, shadow `0 8px 32px rgba(0,0,0,0.5)`. No device chrome.

| Aspect | Recording set | Plate box (x, y) |
|---|---|---|
| 9:16 | Mobile | x 90–870, y 262–1202 (780×940) |
| 1:1 | Mobile | x 260–820, y 80–740 (560×660) |
| 16:9 | Desktop | x 346–1573, y 60–750 (1227×690) |

- **Demo label:** a pill pinned to the plate's physical top-right corner, inside the plate: `accentWash` fill, 1px `accentDim` border, `secondary` text, Assistant 600, 30px (9:16), 26px (1:1), 28px (16:9). Its text comes from the script JSON, never typed into a template. It is on for every frame of S1–S4.
- **Pointer:** taps show as a 48px `accent` ring that expands and fades in 300ms. No cursor arrow on mobile.
- **Text size check:** body text inside the plate must be at least 24px tall in the output frame; otherwise the recording zooms into the relevant region.

### Caption typography (Hebrew)
- **Font:** Rubik 700, `headline` colour. Sizes from config: 76px (9:16), 64px (1:1), 68px (16:9). Line height 1.28. Never below weight 700 (WhatsApp compression blurs thin Hebrew strokes).
- **Card:** 2–4 words, at most two lines, `text-wrap: balance`, centred, on a plate `rgba(13,17,23,0.88)`, radius 0.32em, padding 0.3em 0.6em 0.36em. Anchored to the bottom of the safe box.
- **Source:** the script's clean `display` text only. Never the speech spelling (niqqud) or a transcript.
- **Direction:** `dir="rtl"` per card. Latin and numeric runs (`WAO`, the price with its currency sign and VAT term) are wrapped as isolated no-wrap units (`.u`), so they neither flip nor break across lines.
- **Typography rules:** gershayim and geresh, not ASCII quotes; em-dash single-spaced; no double spaces; no line may start or end with a stranded punctuation mark or a lone Latin token. Noa owns these; Maya checks one exported frame per card.
- **Timing:** a card appears with its first word and leaves with its last (word timings from the take); minimum 0.7s on screen.

### Text card (C1)
- Line 1: Rubik 700, 9u. Line 2: Assistant 600, 6u, `secondary`. `u` = 1% of the safe box's short side.
- A mint keyline under line 1: 148×6px, radius 3px (Dana's `keyline`).
- Lines are centred, `dir="rtl"`, at most 22 characters each, so they fit 9:16 on one line.

### Motion rules
- **Cuts:** hard cuts between beats on the 0.4s gap. The only dissolve is a 6-frame fade into the end screen.
- **Illustrations:** elements enter with a 250ms ease-out (12px slide plus fade), staggered 120ms, each on its spoken word. The B04 snap is 180ms with a 4% overshoot. Nothing loops.
- **Real screens:** scrolls are eased and never faster than 600 CSS px per second. One slow push-in of at most 6% per beat. No fake typing speed-ups longer than 2×.
- **Captions:** cut in and out, no animation.
- **Never:** shake, flashing, strobing, glitch effects, confetti, counters ticking up.
- **Sound:** voice only in v1, loudness-normalised. No music under the narration, no ringtones, no notification sounds.

### End screen (E1), per aspect
Content, top to bottom of importance: price, stamp, CTA, product name, URL, wordmark. All text comes
from `data/video/config.json` and the approved script line; the price digits come from the price
constant (`src/lib/payments/plans.ts` `netAmount`, checked by the pipeline). `u` = 1% of the safe
box's short side: 8.4px (9:16), 9.2px (1:1), 9.4px (16:9).

| Element | Style | 9:16 (stack, centred) | 1:1 (stack, centred) | 16:9 (two columns) |
|---|---|---|---|---|
| Wordmark `WAO` | Rubik 700, `accent`, letter-spacing 0.08em, `dir="ltr"` | 7u, top of the stack | 6u, top | 6u, top of the right column |
| Product name | Rubik 700, `headline`, from the lexicon id `site-bot` | 11u | 10u | 10u, right column |
| Price line | Rubik 700, `accent`, one isolated no-wrap unit | 13u, the largest element | 12u | 13u, right column |
| Stamp | Rubik 700, 4.6u, `headline` text, 0.5u `accentDim` border, radius 0.5em, padding 0.35em 0.9em, rotated −4°, `accentWash` fill | Under the price, shifted 6u toward the physical left, overlapping the price block's bottom edge by 1u | Same, shifted 4u | Under the price in the right column, same overlap |
| CTA pill | Rubik 700, 6u, `bg` text on `accent`, radius 999px, padding 0.4em 1.2em | Under the stamp, gap 5u | Gap 4u | Left column, vertically centred |
| URL | Assistant 600, 4.6u, `secondary`, `dir="ltr"` | Under the CTA, gap 2.5u | Gap 2u | Under the CTA in the left column |

- **Stack gap** (9:16, 1:1): 3.4u between elements unless stated.
- **16:9 columns:** right column is 56% of the safe box and holds wordmark, product, price, stamp, aligned to the physical right. Left column is 44% and holds CTA and URL, centred. A 1px `gridLine`-coloured divider sits between them, 60% of the safe-box height.
- **Background:** `bg` plus the two glows and the grid, as everywhere.
- **Entrance:** all elements are present from the first frame except the stamp, which lands 400ms in (scale 1.15 → 1, 160ms). The frame is static for at least the last 3 seconds.
- **Fit:** each row shrinks by 5% steps until it fits its column (the existing `.fit` loop).
- **Pending text:** `stampText` and `ctaText` are still `_PENDING` in the config. They render pink and block release until the approved Hebrew is put in.

## Pipeline changes this design needs (scripts/video, not done here)
| # | Change | Needed by |
|---|---|---|
| P1 | `visual.src` per aspect (a map), so 16:9 can use the desktop recording | S1–S4 |
| P2 | A plate template: recording inside the rounded frame on the brand background, with the demo-label overlay | S1–S4 |
| P3 | A `card` template (C1) fed by a `card` field in the script line; that text joins the script hash | B11 |
| P4 | End screen layout per aspect (16:9 two-column), stamp entrance | E1 |
| P5 | Per-video `gapSeconds` and end-hold override, plus a hard fail when the output exceeds `slotSeconds` | 6s and 15s cuts |
| P6 | A beat that can run two visuals in sequence | K4 in the 45s cut |
| P7 | A `gate` field per beat; the build refuses a gated beat whose gate is not marked passed in the config | G1–G4 |
| P8 | Background layer (glows + grid) under illustrations and plates | all |

## Claims ledger
| Claim (spoken or shown) | Backed by | Status |
|---|---|---|
| Page per service, hours, call button | Generated site code | Live |
| Free check from the business name, result in seconds | `/site-bot/audit` | Live |
| Own domain, in his name; profile stays his | Terms §6 and §8; domain attach commit | Verify on the test client |
| No commitment, cancel online anytime | Terms §7–§8 (monthly, no commitment, online cancel anytime; takes effect at the end of the paid month) | Supported; Noa approves the stamp wording |
| Monthly price | `plans.ts` `netAmount` 199, plus VAT | Live in code; **not on `/site-bot` yet** |
| Profile kept in line with the site | Launch mission item 2 | G1 |
| Ready review message | Launch mission item 3 | G2 |
| Monthly report | Launch mission item 4 | G3 |
| Tell it once and approve | `/site-bot/start` | G4 |
| Results, call counts, rankings, "more customers" | — | Never claimed |

## Files
- `docs/missions/video-intro-site-bot-2026-11-12.md` (this file)
- `docs/copy/briefs/video-intro-site-bot-2026-11-12.md` (narration brief)
- Later: script JSON in `docs/copy/`, `scripts/video/specs/sitebot-intro-*.video.json`, recordings and art under `data/video/`

## Constraints
- Hebrew only from Tamar → Noa; Eitan's ear on the voiced result.
- `data/clients/` is read-only; the demo business is fictional and labelled.
- No Google logos or interface, no results promises, no call counts, no ringing phone, no notification look-alikes.
- WAO never messages the end customer; the owner forwards the review message himself.
- AI voice and AI-assisted visuals are declared in Google Ads and YouTube Studio (check the current rule before upload).

## Acceptance
- Script hash approved in `scripts/video/approved-hashes.json`; build passes stage 1 with the page price check.
- Every output is at or under its slot length; ffprobe confirms size and duration.
- No placeholder visuals and no `_PENDING` text in a release render.
- One exported frame per caption card and per end screen, per aspect, passed by Maya; Noa passes captions and card text.
- Gated beats present only with a passed gate.

## Verifier
Roni: runs the build, checks the manifest, confirms each real screen matches the live route in production
on the lock date, and confirms `/site-bot` shows the same price as the end screen.
