# Homepage hero motion + a11y spec — Maya (ux), 2026-11-15

Design: docs/missions/homepage-hero-motion-ease-fable52-2026-11-15.md (Fable 5.2, "three taps, and it's there").
Strings: docs/copy/hero-motion-strings-2026-11-15.waocopy.json + docs/copy/hero-motion-skip-label-2026-11-15.waocopy.json (skip_label) — JSON object after any preamble; apply by script.
Coordinates: 960x605 virtual window, origin top-left, tab bar 26 px. Rendered scale ~0.41 at 1440, ~0.25 at 390 — RE-MEASURE after the tighter crop (e3a9a3e) and scale every size by the new ratio.

## 1. DOM / state model — CSS keyframes + ~40-line JS controller
- `.hero-scene-wrap{position:relative}` with `data-motion="rest|playing"`; SSR emits `rest` (resting frame = first paint, no layout change).
- New layers SSR'd inside `.hero-window`, absolutely positioned, `opacity:0`, `contain:layout paint` (CLS 0): `.hm-chat` (dark panel below the tab bar), `.hm-ready`, `.hm-hl-ad`, `.hm-hl-lp` (highlight bars), `.hm-ring` (call-button glow), `.hm-pointer`. Wrap the iframe in `.hero-window-lpwrap`; animate the wrapper, never the iframe.
- Replay/skip button OUTSIDE the aria-hidden/inert scene (sibling, bottom inline-end) + sr-only `<p>` with sr_description.
- JS (no library, ≤2 kB gz): start when load + requestIdleCallback (1200 ms fallback) AND IntersectionObserver ≥ 0.6 AND iframe `load` fired (not by 3 s → never play); set `playing`. All layers `duration:9600ms; animation-fill-mode:both` (keyframe % = ms/96). On pointer `animationend`, Esc or skip → `rest`. Replay = remove attr, reflow, re-add. Bail on prefers-reduced-motion (listen for change).
- No-JS / reduced motion = SSR frame exactly.

## 2. Keyframes (ms). E = cubic-bezier(.22,1,.36,1) entrances; P = cubic-bezier(.65,0,.35,1) pointer/collapse. Same timeline phone + desktop.
- Chat panel opacity 0→1 0–150 (E), opaque dark over ad/page.
- Q1 visible at 0; question exits opacity 1→0 150 ms at 1150, 2350, 3450; Q2/Q3 enter 1300 / 2500 (translateY 12→0 + opacity, 250 ms, E).
- Chip click: `::before` green layer 0→1 over 200 ms; clicks at 900, 2100, 3300; siblings → 0.3 over 150 ms.
- Pointer press 90 ms scale 1→.92→1; click ring scale .4→1.6, opacity .5→0, 350 ms.
- Pointer arcs: outer element animates X (P), inner animates Y (cubic-bezier(.5,0,.25,1)). Hop 1 400→900 from (140,660) to (430,242); hop 2 1650→2100 to (470,344); hop 3 2850→3300 to (410,446). Targets mid-chip on empty fill, never over the right-aligned text.
- Ready cue scale .9→1 + opacity 3700–3950 (E), green check, hold 350.
- Chat collapse 4050→4500 (P), transform-origin 45px 560px (corner chip), scale 1→.09, opacity →0 over last 30%; corner chip fades in 4300–4500.
- Ad translateY 24→0 + opacity 4500–5000 (E); ad highlight bar scaleX 0→1 origin right 4900–5500; ad headline still 5000–9600; bar fades 6500–6700.
- Pointer drift to (150,120) 4600→5400, stops.
- LP wrapper translateY 60→0 + opacity 6700–7300 (E); LP headline highlight scaleX 7400–7900, fades 8900–9100 (headline still ≥1500 ms).
- Pointer to the call button 7500→8200 (P) (~(830,540) — measure the real button); press 8200; glow ring overlay scale 1→1.35, opacity .6→0, 500 ms.
- 9000–9300 pointer fades; button icon cross-fades to replay at 9000 (300 ms); 9600 = rest. Max two movers at once.

## Phone/desktop layout
- Chat column 640 wide centred; chips stacked: 3 rows × 84 px, gap 18, tops at 200 / 302 / 404. Question 50 px bold; chip font 42 px virtual (≈17 px desktop, ≈10.6 px phone). Minimum rendered chip font 10 px (target 11); if phone scale < 0.24 raise the chip font to 10/scale.
- Display order (strings unchanged): Q2 chips [כפר סבא, רעננה, הרצליה]; Q3 chips [פתיחת סתימות, החלפת צנרת, איתור נזילות] — correct chips land top/middle/bottom so the pointer travels down.

## 3. Pointer
Inline SVG arrow, white fill, 2 px black round-join stroke, tip at (0,0), viewBox 24x36; height 36 virtual desktop (~15 px), 52 virtual phone (~13 px). Shown on touch devices too (it depicts a cursor on the laptop).

## 4. RTL
`direction:rtl`; chip text right-aligned; question bubble right of its avatar (onboarding gradient circle linear-gradient(135deg,#4AE3B5,#00C3FF)); chips top→bottom; pointer enters bottom-left; highlight sweeps from the right. Reuse onboarding styles: panel rgba(13,15,21,.96), chip rgba(74,227,181,.06) + accent border, radius 10 (×2 virtual), Rubik var(--font-rubik). Replay button via inset-inline-end; keep the corner chip's physical left:18px.

## 5. Accessibility
- Scene aria-hidden + inert; sr-only sr_description; static_cue visible caption only under reduced motion (aria-hidden).
- WCAG 2.2.2 applies (auto-start, > 5 s, beside content): the 44×44 button is visible throughout — while playing its aria-label is skip_label, at rest replay_label; Esc also skips.
- Button: dark rgba(13,15,21,.85), 20 px icon #4AE3B5 (>3:1), focus = 3 px #fff outline + 2 px dark offset ring.
- Contrast: chip text ~15:1; pressed chip #101416 on #36ddb5 ~10:1; ready cue white on dark. Highlights/glow decorative.

## 6. Performance
Transform/opacity only (never box-shadow, filter, background or the iframe). will-change only on pointer, chat panel, ad and LP wrapper under [data-motion=playing]; none on the matrix3d parent. No per-frame JS. Budget ≤2 kB gz JS, ≤3 kB gz CSS, 0 new requests, no library, no new fonts. Verify: layout-shift sum 0 over 15 s; LCP element still the H1; no per-frame Layout/Recalc and no task > 50 ms during playback; INP < 200 ms tapping the CTA mid-animation; Lighthouse before/after.

## 7. Roni's checklist
Record 10–12 s at 1440 and 390 from a cold load (start waits for 60 % in view; desktop after load). Timeline matches; Q1 visible at frame 0; no typing/spinner/4th question. Chips ≥10 px rendered at 390. Pointer never crosses text; ad + page headlines hold ≥1500 ms. Final frame pixel-identical to SSR frame (except the replay icon). Replay, skip and Esc work; tab reaches the button; visible focus; ≥44 px. Reduced motion: no animation, no pointer, static_cue visible. Screen reader reads only sr_description + the button. No overflow at 390; bidi grep 0. JS off: resting frame. Slow/blocked iframe: no play. CLS/LCP/INP checks above.
