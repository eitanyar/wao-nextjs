# Mission: Dash v2 cartoon series, visual design (Fable 5.2, 2026-11-12)

Design only. Nothing here was generated, rendered or built, and no image API was called.
This file contains no Hebrew: every on-screen word is referenced by its path in the script JSON
and is rendered by the pipeline from that JSON, never typed into art or templates.

## Outcome
One visual system for six Dash v2 episodes (A1–A3 Ads Bot, S1–S3 Site Bot), each in a 30s and a
15s cut, in 9:16, 1:1 and 16:9, that:
- reads on mute (the problem is understood without sound);
- keeps the cartoon for the problem and real product screens for the solution;
- can be animated by pose swaps from layered art, so a new episode is cheap;
- ends on the pipeline's end screen with price and stamp.

## Inputs used
| Input | Note |
|---|---|
| `docs/copy/video-dash-v2-scripts-2026-11-12.json` | The assembled script file (16:02), with the polish patches applied. The raw `.waocopy.json` (15:47) is the same text before polish, wrapped in markdown, so the assembled file is the one to hash and build from. |
| `docs/copy/video-end-screen-cta-2026-11-12.waocopy.json` | CTA options and picks; still waiting for Noa. |
| `docs/missions/youtube-video-plan-2026-11-12.md`, `youtube-video-animated-humour-…md` | Character origin, policy guardrails, mute pass criterion. |
| `docs/missions/video-intro-site-bot-2026-11-12.md` | Safe zones, colour tokens, caption typography, end screen E1, gates G1–G4. This design reuses them. |
| `data/video/config.json`, `scripts/video/lib/pages.mjs` | Aspects, safe zones, end-screen template. |

**Naming:** the scripts' `screen` fields call the character "Dashoni"; this doc says Dash. The name
is never spoken or shown, so it stays an internal label.

## Founder decisions applied
| Decision | In this design |
|---|---|
| No founder name | No name in art, banners or end screen. |
| Price only on the end screen, with the stamp | No price, coin amount or currency sign in any cartoon frame. |
| WAO said upbeat by Nimrod | Dash's one wide smile (`excited`) is reserved for the brand line. |
| Eyes-closed rule | Art never carries information the voice does not say. It only repeats it. |
| Own domain from day one | No domain or URL appears in cartoon frames; the end screen URL comes from config. |
| Launch 2026-11-19 | No date in any frame. |

---

## 1. Dash character sheet

### Build
| Part | Description |
|---|---|
| Body | A rugged work phone, slightly thicker than a normal phone. Body height : width = 2 : 1 in portrait. |
| Case | Thick rubber case in `dashOrange`, with four chunky corner bumpers. Matte, flat fill, one darker tone (`dashOrangeShade`) for the side thickness. |
| Wear (identity marks, always the same) | A hairline crack across the physical top-left corner of the glass. Pale plaster-dust speckles in the two bottom corners of the case. One short strip of blank masking tape on the back. |
| Screen | Flat `bg` navy. The face is drawn on it in line, like a simple display animation. |
| Face | Two eyes and a mouth, nothing else. No nose, no brows except the single brow line in `sarcastic`. Line weight equals the outline weight. |
| Mount | A magnet arm with a ball joint, clipped to the centre air vent. The ball joint lets Dash sit portrait (9:16, 1:1) or landscape (16:9). |
| Cable | A coiled charging cable from the bottom edge down to the dashboard. It never moves on its own. |
| Limbs | None. Dash acts with eyes, lids, mouth and small tilts on the ball joint (at most 6°). |
| Outline | 6px at 1080 frame width, `headline` colour, round caps and joins, 1–2px hand wobble. |

### Expressions, keyed to the audio tags in the scripts
The scripts use five tags: `deadpan` (41 lines), `calm` (14), `excited` (12), `tired` (10),
`sarcastic` (5). The line's tag selects the face for the whole line.

| Tag | Eyes | Mouth (closed state) | Body | Colour | Used for |
|---|---|---|---|---|---|
| `deadpan` (default) | Two wide rounded bars, upper lid flat at 50%. Pupils dead centre, looking at the viewer. No blink during the line; one blink after it. | Short straight line. | Still. | `headline` | Setups and verdicts. |
| `tired` | Lids at 70% closed. Eyes drift down and to one side, then back. One slow blink (400ms) at the start. | Same line, one end sagging 6°. | Sinks 2° on the joint. | `headline` | Escalation lines ("and another one, and another one"). |
| `sarcastic` | One eye lidded 60%, the other open with a single raised brow line. A side glance at the story, then back to the viewer. | Line tilted up at one corner, 8°. | Tilts 4° toward the raised brow. | `headline` | The dry-edge lines (A2 hug, hook variants). |
| `calm` | Lids open to 80%. The lower edge of each eye rounds into a soft arc. | Shallow upward curve. | Returns upright. | `headline` on a calm line inside the story (S2 line 4); `accent` mint on every product line | The product line, and S2's warm turn. |
| `excited` | Full open circles with one highlight dot each. | Open "D" smile, the only wide smile in the series. | One 6% hop on the mount, 160ms. | `accent` mint | The brand line only. Held at most 0.5s (see "End screen"). |

Non-voice states:
| State | Description | Used for |
|---|---|---|
| `wait` | `deadpan` eyes; the mouth is replaced by a blinking text-cursor bar (500ms on, 500ms off). | A3 line 3 (waiting for an answer). |
| `ask` | `deadpan` plus a 4° tilt; a glyph pops from the face into the story (question mark, or outline star for S2). | A3 line 2, S2 line 3. |
| `blink` | Lids close for 3 frames. | Between lines only. |

**Mouth while speaking:** three openings per expression (closed, half, open), switched by the
loudness of the audio track. The corner shape of the expression is kept; only the opening changes.
No lip-sync model is needed.

**Colour rule:** Dash's face is white while the problem is on screen and turns mint when the
product arrives. Mint means "WAO's system", as in the intro video.

### Two face modes
| Mode | Where the face sits | When |
|---|---|---|
| Full face | Fills the whole screen. | Verdict shots, and the first second of an episode. |
| Face strip | A band along one edge of the screen; the rest of the screen shows the story or the product. Portrait: top band, 16% of screen height. Landscape: a band on the physical right, 16% of screen width. | Story shots and product shots. |

### Turnaround (for the illustrator; six views on one sheet, same scale)
| View | What must be visible |
|---|---|
| Front | Screen with `deadpan` face, four bumpers, crack at top-left, dust in bottom corners. |
| Three-quarter left | Case thickness in `dashOrangeShade`; no buttons on this side. |
| Three-quarter right | Two chunky side buttons. |
| Side (right) | Thickness about one sixth of the width; buttons; the magnet plate of the mount. |
| Back | Ribbed grip lines, one plain round camera bump with a single lens, the strip of blank masking tape, the magnet plate. No logo, no text. |
| On the mount | Portrait and landscape, showing the ball joint and the cable. |

**Never:** arms, legs, a brand mark on the device, a notch or camera island that resembles a real
phone model, a status bar, app icons, a battery or signal indicator.

---

## 2. The owner and the recurring world

### Two drawing layers
| Layer | What it is | Look |
|---|---|---|
| World | The van cab: dashboard, Dash, the owner's hand. | Flat cartoon, outline plus flat fills, the palette below. |
| Story | Everything that happens on Dash's screen: the taxi, the stall, the roof. | Simpler "screen doodle": `headline` line on `bg`, grey fills, amber for money. Figures are small and have dot eyes. |

The story layer is deliberately simpler than the world. It reads as Dash's own drawing of what
happened, it is cheap to redraw, and no figure in it can be mistaken for a real customer.

### Palette
| Token | Value | Use |
|---|---|---|
| `bg` | `#0D1117` | Dash's screen, story background, end screen. From config. |
| `headline` | `#F2F5F9` | Outlines, face, story lines. From config (`text`). |
| `secondary` | `#9AA7B5` | Story fills, doodle figures. From config (`muted`). |
| `accent` | `#4AE3B5` | Mint. Product beats and the end screen only. From config. |
| `dashOrange` / `dashOrangeShade` | `#F5922F` / `#C96A12` (proposed) | Dash's case only. Nothing else is orange. |
| `coinAmber` | `#F2C14E` (proposed) | The owner's money: coins, wallet contents, the till. |
| `agencyGreen` | `#8BD450` (proposed) | A3 only: the agency's graphs. Deliberately not mint. |
| `cabDark` / `cabMid` / `cabLight` | `#161C26` / `#1F2733` / `#3A4656` (proposed) | Dashboard, vents, windscreen. |

Dana confirms the four proposed groups as tokens before final art. `#FF4FD8` stays reserved for
`_PENDING` text.

### The owner
| Layer | How he appears |
|---|---|
| World | Right hand and forearm only, reaching in from the driver's side. Rolled grey-blue work-shirt sleeve, one plaster on a knuckle, no watch, no ring. He taps with his thumb. Three poses: rest, reach, thumb-tap. Never a face. |
| Story | A small full figure: stocky, a plain cap with a blank patch, a work vest with pockets, a tool belt. Dot eyes; a mouth appears only when he smiles (S2 line 1). The cap is his identity mark in every episode. His role changes by one prop: steering wheel (A1), apron (A2), report pages (A3), adjustable wrench (S1), no vest and no belt at home (S2), phone at his ear (S3). |

He is addressed in singular male by the voice and is never named. The joke is never on him: on
the roof he is drawn earnest, not foolish.

### Recurring story cast
| Figure | Design | Episodes |
|---|---|---|
| Click-people | Doodle bodies with an arrow-cursor for a head. They are the clicks. | A1 (passengers), A2 (tasters) |
| The woman | Doodle figure, shoulder bag, phone in hand. Dot eyes. | S1, S3 |
| The technician | Doodle figure, overalls and a head torch, no cap, a tool bag. Must not be confusable with the owner. | S2 |
| His customer | Plain doodle figure at a door. | S2 line 4 (mirror) |

### The van (generic, no real brand)
- **Outside:** a white mid-size panel van, boxy, with a roof rack and a ladder. No grille badge, no wheel-cap emblem, no model lettering. The licence plate is a blank rectangle. The magnetic sign on the side is a rectangle with a wrench pictogram and three blank bars: no name, no phone number.
- **Cab:** left-hand drive. The steering wheel sits at the physical left edge of the frame with a blank hub. Dash is on the centre vent.
- **Dashboard props, always in the same places:** a blank paper coffee cup, a spike of receipts (blank), a short spirit level, a jar of coins (`coinAmber`), a roll of tape. The windscreen shows a flat pale sky and a rooftop line: no signs, no shop fronts.
- **Time of day:** always daytime, parked between jobs.

### Glyphs replace words inside art
Art carries no letters or digits. These glyphs stand in:

| Glyph | Meaning | Where |
|---|---|---|
| Plane | Airport | A1 |
| Coin (`coinAmber`, blank face) | His money | A1, A2 |
| Arrow-cursor | A click | A1, A2 |
| Sun over the awning | Next morning | A2 |
| Bar chart, pie chart (`agencyGreen`) | The report | A3 |
| Rosette with confetti dots | The agency celebrating | A3 only; never used for WAO |
| Magnifier with a blank bar | Searching | S1 |
| Pin on a blank card | A business profile | S1, S3 |
| Clock | "Later" | S2 |
| Thumbs-up | "Thanks" | S2 |
| Outline star (`headline`, never yellow, never counted) | A review | S2 |
| Bolt, water drop, AC unit | The three trades | S3 |
| Tick (`accent`) | Site and profile agree | S1, S3 product beats |

The few real words the scripts require inside the picture are text overlays from the script JSON
(section 3, "Text overlays").

### Policy rules for every frame
- No Google logo, colours, map tiles, search-page layout or review interface. "Search" is the magnifier glyph.
- No ringing phone, ring waves, vibration lines or call interface. A call is a figure holding a phone plus a speech bubble.
- Dash's banner must not resemble a phone notification (design below).
- No currency sign, amount, counter of leads, graph of results, or before/after.
- No real business, person, phone number, domain or brand.
- Confetti appears only as the agency's in A3.

---

## 3. Per-episode scenes and shot lists

### Shot types
| Code | Shot | What the viewer sees |
|---|---|---|
| EST | Establish | The cab, Dash on the mount, the story already visible on its screen. At most 1.0s, then a push-in to SCR. First beat of every cut. |
| SCR | Screen | Dash's screen fills the stage, with the orange bezel at its edges and the face strip on. The story plays here. |
| VRD | Verdict | Dash, full face, looking at the viewer, with the banner. Captions off for this beat. |
| PRD | Product | Dash's screen shows the real product recording (or a gated drawing). Face strip in mint, `calm`. Demo label on. |
| END | End screen | The pipeline's end-screen template. Captions off. |

Cuts inside a beat (for example payoff pose, then VRD) are baked into that beat's clip.

### Layout boxes per aspect (pixels; starting values, Maya verifies on exported frames)
Safe boxes and caption bands are the config's, as tabled in the intro mission.

| Element | 9:16 (1080×1920) | 1:1 (1080×1080) | 16:9 (1920×1080) |
|---|---|---|---|
| Stage | x 60–900, y 250–1215 | x 70–1010, y 70–750 | x 110–1810, y 60–750 |
| Caption band | y 1255–1500 | y 784–990 | y 781–1000 |
| Wordmark (from frame 1) | x 60–220, y 250–306 | x 70–230, y 80–130 | x 110–300, y 60–116 |
| Dash orientation | Portrait | Portrait | Landscape |
| SCR / PRD: Dash's screen | x 90–870, y 330–1200 | x 260–820, y 80–740 | x 346–1573, y 60–750 |
| Face strip inside it | top 140px | top 100px | physical right 200px |
| Story or recording area | 780×730 | 560×560 | 1027×690 |
| VRD: banner | x 90–870, y 330–560 | x 250–1010, y 80–250 | x 410–1510, y 60–270 |
| VRD: Dash | x 280–680, y 600–1200 | x 370–710, y 270–740 | x 560–1360, y 300–750 |
| Recording set for PRD | Mobile | Mobile | Desktop |

- The wordmark sits at the physical top-left of the safe box in every aspect, clear of the Shorts button column on the right.
- Story art is drawn in two layouts: **tall** (for the 780×730 and 560×560 areas) and **wide** (1027×690). The must-see action sits in a centred square; the rest is bleed.

### Mute rule: captions plus one banner
| Carrier | What | Where | When |
|---|---|---|---|
| Captions | The line's `display` text in 2–4 word cards (existing pipeline). | Caption band. | Every beat except VRD and END. |
| Banner | The verdict line, whole, held for the beat. | Banner box, above Dash. | The VRD beat only: one banner per cut. |

**Banner design:** a hand-drawn rounded tab with a small tail pointing down at Dash. Fill
`headline`, text `bg`, Rubik 700, 6px outline, tilted −2°. It pops out of Dash's screen (scale
0.9 → 1, 160ms). It has no app icon, no title row, no timestamp and no close button, and it never
slides down from the top edge of the frame, so it cannot be read as a system notification. It is
the inverse of a caption card (light on dark), so the two are never confused.

**Banner text:** by default the verdict line's `display` string, byte-exact from the script JSON
(paths below). Tamar confirms or shortens each one in the on-screen-text brief. Two cases need
her: the S1 and S3 15s verdict lines are two sentences, and S2's verdict alone does not state the
problem.

| Episode | 30s banner source | 15s banner source |
|---|---|---|
| A1 | `episodes.A1.script_30[3].display` | `episodes.A1.script_15[1].display` |
| A2 | `episodes.A2.script_30[4].display` | `episodes.A2.script_15[1].display` |
| A3 | `episodes.A3.script_30[4].display` | `episodes.A3.script_15[1].display` |
| S1 | `episodes.S1.script_30[3].display` | `episodes.S1.script_15[1].display` (second sentence only; Tamar confirms) |
| S2 | `episodes.S2.script_30[4].display` (Tamar: is the problem clear on mute?) | none; `script_15[1]` runs as SCR with captions |
| S3 | `episodes.S3.script_30[3].display` | `episodes.S3.script_15[1].display` (Tamar confirms length) |

### Text overlays (words the scripts put inside the picture)
Rendered by the pipeline as HTML over the art, from the script JSON. Never drawn into images.

| Id | Word | Source |
|---|---|---|
| `T-A3-stamp` | The one word stamped across the stack | The word in geresh in `episodes.A3.script_30[4].display` |
| `T-S3-yes` | The owner's one-word answer, floating | The word in geresh in `episodes.S3.script_30[2].display` |
| `T-S3-labelSite`, `T-S3-labelProfile` | The two trade labels on the site card and the profile card | The two trade words in `episodes.S3.script_30[0].display` |
| `T-S3-svc1..3` | The three service lines | The three service words in `episodes.S3.script_30[5].display` |
| `T-demo` | Demo label on real screens | The same string the intro video uses, from its script JSON |

Tamar and Noa confirm the standalone form of each (the on-screen-text brief, item C).

### Motion rules
- **Pose swaps, not in-betweens.** Each scene has two to four poses, swapped on the spoken word. Pops (scale 0.9 → 1, 160ms) and short slides (12px, 250ms) only.
- **Push-in:** EST to SCR is one 500ms push. No other camera moves.
- **Loops:** a gag may repeat at most twice (A1 line 2). Nothing loops for the whole beat.
- **Cuts:** hard cuts on the 0.4s gap; a 6-frame fade into END only.
- **Never:** shake, flashing, glitch effects, a counter ticking up in currency.
- **Sound:** voice only. No ringtone, notification, vibration or cash-register sound.

### A1 "The taxi" (Ads Bot)
Scenes: `SC-A1-meter` (Dash's screen as a taxi meter: a drum of notches and a row of cursor icons,
no digits), `SC-A1-taxi` (taxi from the side, back door open, the owner at the wheel, a
click-person passenger; poses: in, asks, out), `SC-A1-pay` (the owner's wallet emptying coins into
click-people's hands; the taxi's wheels have not moved).

**30s**
| Line | Tag → face | Shot | Visual | Mute | Notes |
|---|---|---|---|---|---|
| 0 | deadpan | EST → SCR | `SC-A1-meter`. The owner's thumb (world hand) taps; each tap flips one notch and adds one cursor icon. | Captions | Wordmark from frame 1. No amounts on the meter. |
| 1 | deadpan | SCR | `SC-A1-taxi`: passenger slides in; bubble with plane glyph and question mark; driver's bubble with a coin; passenger steps out. A small meter chip in the scene corner flips. | Captions | |
| 2 | tired | SCR | Same scene, two more passengers at double pace. On each exit one coin arcs from the driver's pocket into the fare box. | Captions | Two repeats only. |
| 3 | deadpan | SCR 0.8s → VRD | `SC-A1-pay` payoff pose, then Dash full face and the banner. | Banner | |
| 4 | calm | PRD | `R-ADS-lead`: the thumb marks one lead as a closed job (tap ring). Face strip turns mint. | Captions | Gate G5. Show only what the real screen shows. |
| 5 | excited | END | `E-ADS`. | Off | |

**15s**
| Line | Tag → face | Shot | Visual | Mute |
|---|---|---|---|---|
| 0 | deadpan | EST → SCR | `SC-A1-taxi`: one passenger leans in, asks, steps out; the meter chip flips once. | Captions |
| 1 | deadpan | SCR 0.6s → VRD | `SC-A1-pay`, then the banner. | Banner |
| 2 | calm | PRD | `R-ADS-lead`. | Captions |
| 3 | excited | END | `E-ADS`. | Off |

### A2 "The tasting stall" (Ads Bot)
Scenes: `SC-A2-stall` (a market stall with an awning, toothpicks and little cups, a till drawer;
poses: one taster, three tasters, crowd, hug), `SC-A2-pay` (the crowd round and content, the till
drawer open and empty).

**30s**
| Line | Tag → face | Shot | Visual | Mute | Notes |
|---|---|---|---|---|---|
| 0 | deadpan | EST → SCR | `SC-A2-stall`: the owner (apron) hands a sample to one click-person. | Captions | Wordmark from frame 1. |
| 1 | deadpan | SCR | Sun glyph rises over the awning. The same taster returns with two more; all three take samples. Till drawer shut. | Captions | |
| 2 | tired | SCR | Crowd pose. The owner's coin stack shrinks from three to one. Till empty. | Captions | |
| 3 | sarcastic | SCR | One regular hugs the owner and walks off with another sample. | Captions | Dash's side glance lands on the hug. |
| 4 | deadpan | SCR 0.8s → VRD | `SC-A2-pay`, then the banner. | Banner | Round bellies are on click-people, not on real-looking people. |
| 5 | calm | PRD | `R-ADS-lead`, then `R-ADS-campaign` if the real panel shows a running campaign. | Captions | Gate G5. No Google logo in frame. |
| 6 | excited | END | `E-ADS`. | Off | |

**15s**
| Line | Tag → face | Shot | Visual | Mute |
|---|---|---|---|---|
| 0 | deadpan | EST → SCR | `SC-A2-stall`, crowd pose arriving in two swaps. | Captions |
| 1 | deadpan | SCR 0.6s → VRD | `SC-A2-pay`, then the banner. | Banner |
| 2 | calm | PRD | `R-ADS-lead`. | Captions |
| 3 | excited | END | `E-ADS`. | Off |

### A3 "The report" (Ads Bot)
Scenes: `SC-A3-report` (a glossy report page with `agencyGreen` bar charts; poses: page 1, the
agency rosette with confetti, page flip, pie-chart page), `SC-A3-stack` (the pages fanned into a
thick stack).

**30s**
| Line | Tag → face | Shot | Visual | Mute | Notes |
|---|---|---|---|---|---|
| 0 | deadpan | EST → SCR | `SC-A3-report` page 1; the owner holds it up; green bars climb in three swaps. | Captions | Charts have no labels or numbers. |
| 1 | tired | SCR | Rosette and confetti over an abstract agency mark (a blank shape). The owner waits, arms half raised. Dash does not react. | Captions | The agency mark must resemble no real logo. |
| 2 | deadpan (`ask`) | SCR | A question mark pops from Dash's face. The owner flips a page, then another; each is another green chart. | Captions | |
| 3 | tired (`wait`) | SCR | Pie-chart page; the owner points at it; Dash's mouth is the blinking cursor. | Captions | |
| 4 | deadpan | SCR 0.8s → VRD | `SC-A3-stack` with `T-A3-stamp` across it, then the banner. | Banner | |
| 5 | calm | PRD | `R-ADS-lead`. No confetti, no celebration frame. | Captions | Gate G5. |
| 6 | excited | END | `E-ADS`. | Off | |

**15s**
| Line | Tag → face | Shot | Visual | Mute |
|---|---|---|---|---|
| 0 | deadpan (`ask`) | EST → SCR | Page 1, the question mark, one page flip. | Captions |
| 1 | deadpan | SCR 0.6s → VRD | `SC-A3-stack` with `T-A3-stamp`, then the banner. | Banner |
| 2 | calm | PRD | `R-ADS-lead`. | Captions |
| 3 | excited | END | `E-ADS`. | Off |

### S1 "The roof" (Site Bot)
Scenes: `SC-S1-van` (the van from the side; poses: small sign, bigger sign, flag taped to the
roof), `SC-S1-roof` (the owner on the roof waving an adjustable wrench, shout lines, the flag, an
empty street), `SC-S1-woman` (the woman right below, looking at her phone; an enlarged inset of
her phone with one generic result card: pin glyph, blank bars, two small street blocks and an
arrow), `SC-S1-split` (roof above, her phone with the magnifier bar below), `SC-S1-down` (the
owner climbing down the ladder).

**30s**
| Line | Tag → face | Shot | Visual | Mute | Notes |
|---|---|---|---|---|---|
| 0 | deadpan | EST → SCR | `SC-S1-van`: sign, bigger sign, flag. | Captions | Wordmark from frame 1. Sign has a pictogram only. |
| 1 | tired | SCR | `SC-S1-roof`. | Captions | Earnest, not foolish. |
| 2 | deadpan | SCR | `SC-S1-woman`: she taps the result card (tap ring). | Captions | No ringtone, no map, no real interface. |
| 3 | deadpan | SCR 0.8s → VRD | `SC-S1-split`, then the banner. | Banner | The search is a magnifier glyph and a blank bar. |
| 4 | calm | PRD | `R-SITE-S1` (demo site, services grid) for the first sentence; then `I5` (drawn profile card with three mint ticks); then `SC-S1-down` for the last sentence. | Captions | The profile half is drawn (gate G1). No ranking implied: nobody is shown finding him. |
| 5 | excited | END | `E-SITE`. | Off | |

**15s**
| Line | Tag → face | Shot | Visual | Mute |
|---|---|---|---|---|
| 0 | tired | EST → SCR | `SC-S1-roof`. | Captions |
| 1 | deadpan | SCR → VRD | `SC-S1-woman` for the first sentence, then `SC-S1-split` and the banner for the second. | Captions, then banner |
| 2 | calm | PRD | `R-SITE-S1`, then `I5`. | Captions |
| 3 | excited | END | `E-SITE`. | Off |

### S2 "Later" (Site Bot)
Here the owner is the customer, at home. Scenes: `SC-S2-room` (a living room in summer, a dead
wall AC, the owner fanning himself with his cap; the technician arrives; poses: arrives, replaces
a part, cleans the filter, wipes the floor), `SC-S2-door` (the owner at his door with a thumbs-up
bubble; the door closes; the technician at the lift), `SC-S2-later` (the owner waving a hand, a
clock in his bubble), `SC-S2-mirror` (the same door, mirrored: the owner outside with his tool
bag, his own customer inside with the thumbs-up and the clock).

**30s**
| Line | Tag → face | Shot | Visual | Mute | Notes |
|---|---|---|---|---|---|
| 0 | tired | EST → SCR | `SC-S2-room`: dead AC, the technician arrives. | Captions | Wordmark from frame 1. AC unit has no brand. |
| 1 | deadpan | SCR | Three swaps: part, filter, floor. The owner smiles. | Captions | |
| 2 | deadpan | SCR | `SC-S2-door`. | Captions | |
| 3 | deadpan (`ask`) | SCR | An outline star pops from Dash's face. `SC-S2-later`. | Captions | Star is an outline in `headline`, not yellow, no count. |
| 4 | calm (white) | SCR 1.0s → VRD | `SC-S2-mirror`, then the banner. | Banner | Warm, not a scolding: `calm` face. |
| 5 | calm (mint) | PRD | If gate G2 has passed: the real review-request screen. Otherwise `I6` (the owner's hand forwards one message bubble with a link glyph), then a drawn blank review form: outline stars and an empty text field with a cursor. | Captions | The owner forwards the request; WAO never messages his customer. The text field stays empty: no suggested wording. |
| 6 | excited | END | `E-SITE`. | Off | |

**15s**
| Line | Tag → face | Shot | Visual | Mute |
|---|---|---|---|---|
| 0 | deadpan | EST → SCR | `SC-S2-door`. | Captions |
| 1 | deadpan (`ask`) | SCR | The outline star; `SC-S2-later`. | Captions |
| 2 | calm | SCR 1.0s → PRD | `SC-S2-mirror` for the first sentence, then the product visual as in the 30s. | Captions |
| 3 | excited | END | `E-SITE`. | Off |

### S3 "Yes" (Site Bot)
Scenes: `SC-S3-cards` (two cards side by side: a site card and a profile card with a pin glyph,
each with a label slot; the woman between them with a phone at her ear), `SC-S3-ac` (her thought
bubble with an AC unit; the cards' bars scroll; a magnifier comes up empty on each), `SC-S3-ask`
(her bubble: bolt, slash, drop, question mark; the owner with a phone at his ear), `SC-S3-off`
(she turns away, her bubble closed), `SC-S3-agree` (the two cards with three line slots each and
a mint tick per line).

**30s**
| Line | Tag → face | Shot | Visual | Mute | Notes |
|---|---|---|---|---|---|
| 0 | deadpan | EST → SCR | `SC-S3-cards` with `T-S3-labelSite` and `T-S3-labelProfile`. | Captions | Wordmark from frame 1. No ringtone, no call interface. |
| 1 | tired | SCR | `SC-S3-ac`. | Captions | |
| 2 | deadpan | SCR | `SC-S3-ask`; `T-S3-yes` floats up alone. | Captions | |
| 3 | deadpan | SCR 0.8s → VRD | `SC-S3-off` with `T-S3-yes` still floating, then the banner. | Banner | The hang-up is her turning away, not a call screen. |
| 4 | calm | PRD | `R-SITE-S1`, then `I5`. | Captions | Profile half is drawn (gate G1). |
| 5 | calm | PRD | `SC-S3-agree` with `T-S3-svc1..3` on both cards, a mint tick landing on each line. | Captions | A drawing in mint, not presented as a real screen: no demo label. |
| 6 | excited | END | `E-SITE`. | Off | |

**15s**
| Line | Tag → face | Shot | Visual | Mute |
|---|---|---|---|---|
| 0 | deadpan | EST → SCR | `SC-S3-cards` with the two labels; then `SC-S3-ask`. | Captions |
| 1 | deadpan | SCR 0.6s → VRD | `T-S3-yes` floats alone, then the banner. No hang-up. | Banner |
| 2 | calm | PRD | `R-SITE-S1`, then `I5`. | Captions |
| 3 | excited | END | `E-SITE`. | Off |

### Gates on product beats
| Gate | Beat | Status today | If not passed by the lock date |
|---|---|---|---|
| G1 (intro mission) | S1, S3 profile half | Profile sync is off in prod | Stays a drawing (`I5`). Already the default here. |
| G2 (intro mission) | S2 review request | Not live for Site Bot | Drawing (`I6`), or hold S2. |
| G5 (new) | A1–A3 lead marking | No Ads Bot recording exists; the recorder covers Site Bot only | A1–A3 cannot be finished. Needs a recorder shot on demo data, and confirmation that the real screen shows what line 4 or 5 says. |
| Demo data | All real screens | Existing recordings are `_DRAFT` | Recordings stay draft until the demo business is approved. |

---

## 4. Style frames: image-generation prompts

**Purpose:** look approval and a reference pack for the illustrator. These are not final art.
Final art is layered vector, because image models drift between frames and cannot keep Dash
identical across six episodes.

**How to run:** paste by hand into the model console (qwen-image for the first pass; wan2.7-image
for alternates, or for edits from a reference image if its edit mode accepts one, using SF-01 as
the reference). No script calls the API. Pick the supported output size nearest to the aspect
given. Generate four candidates per frame and keep one.

**Shared style block (prepend to every prompt):**
```
Flat 2D vector-style cartoon illustration. Thick uniform off-white outline (#F2F5F9) with round caps and a slightly wobbly hand-drawn line. Flat matte colour fills only, no gradients, no shading, no texture, no 3D. Limited palette: deep navy #0D1117, dark slate #161C26 and #1F2733, mid slate #3A4656, off-white #F2F5F9, cool grey #9AA7B5, warm amber #F2C14E for coins only, orange #F5922F for the phone case only. Dry adult editorial humour, calm and minimal, not cute, not childish. Absolutely no text, letters, numbers or logos anywhere in the image.
```

**Shared negative prompt:**
```
text, letters, numbers, digits, writing, captions, logo, brand mark, watermark, signature, app icons, status bar, notification, user interface, map, photorealistic, photo, 3D render, gradient, glossy, lens flare, drop shadow, realistic human face, detailed facial features, arms or legs on the phone, car emblem, licence plate characters, currency symbols
```

| Id | Aspect | Prompt (after the shared block) |
|---|---|---|
| SF-01 | 1:1 | `Character design, front view, centred on a plain deep navy background: a rugged work smartphone standing upright in a thick orange rubber case with four chunky corner bumpers. Its screen is flat deep navy and shows a minimal face drawn in off-white line: two wide rounded-bar eyes with flat half-closed upper lids, pupils centred and staring straight at the viewer, and a short straight line for a mouth. Deadpan, unimpressed expression. A hairline crack across the top-left corner of the glass. Pale dust speckles in the two bottom corners of the case. No arms, no legs.` |
| SF-02 | 16:9 | `Expression sheet: the same rugged orange-cased work phone repeated six times in a 3 by 2 grid on deep navy, front view, identical size and case. Faces drawn in line on the screen: (1) deadpan, half-lidded bar eyes, straight mouth; (2) tired, eyes almost closed and looking down, mouth line sagging at one end; (3) sarcastic, one eye half-lidded, the other open under one raised brow line, mouth tilted up at one corner; (4) calm, soft open eyes with rounded lower edge and a shallow smile, face lines in mint green #4AE3B5; (5) excited, wide round eyes with a highlight dot and an open D-shaped smile, face lines in mint green #4AE3B5; (6) waiting, deadpan eyes and a small vertical cursor bar instead of a mouth.` |
| SF-03 | 16:9 | `Turnaround model sheet of the same rugged orange-cased work phone on deep navy, five views in a row at the same scale: front, three-quarter left, three-quarter right with two chunky side buttons, right side showing the case thickness, and back. The back has ribbed grip lines, one plain round camera bump with a single lens, a short strip of blank masking tape and a round magnet plate. No logo on the back.` |
| SF-04 | 16:9 | `Interior of a work van cab seen from the passenger side, left-hand drive, parked in daytime. A steering wheel with a blank hub at the far left edge. In the centre, clipped to the air vent on a magnet arm with a ball joint, the orange-cased work phone mounted in landscape, its navy screen showing the deadpan line face. On the dashboard: a blank paper coffee cup, a spike of blank receipts, a short spirit level, a glass jar of amber coins, a roll of tape. A coiled charging cable runs from the phone to the dash. Through the windscreen: flat pale slate sky and a plain rooftop line. Dashboard in dark slate tones. Empty space above the phone.` |
| SF-05 | 9:16 | `Vertical composition. Close view of a work van dashboard, left-hand drive, daytime. The orange-cased work phone is mounted upright in portrait on a magnet arm clipped to the centre air vent, filling the middle of the frame, its navy screen showing the deadpan line face. Beside it a blank paper coffee cup and a glass jar of amber coins; a coiled cable hangs from the phone. Top quarter and bottom third of the image are plain dark slate dashboard and windscreen with no objects.` |
| SF-06 | 1:1 | `Three poses of the same man's right hand and forearm on deep navy, arranged in a row: resting, reaching forward, and tapping with the thumb. Rolled grey-blue work-shirt sleeve, one small plaster on a knuckle, no watch, no ring. Hand and forearm only, cut off at the elbow, no body, no face.` |
| SF-07 | 16:9 | `A generic white mid-size panel van, three-quarter side view, parked on an empty street, daytime. Boxy shape, roof rack with a ladder. No badge on the grille, plain wheel caps, a blank rectangular licence plate. On the side panel a rectangular magnetic sign showing only a simple wrench pictogram and three blank bars. Flat slate street and pale sky, no shop signs.` |
| SF-08 | 16:9 | `Cast sheet in a simpler doodle style: off-white line on deep navy, cool grey flat fills, small figures with dot eyes and no other facial features. Five figures in a row, same scale: (1) a stocky tradesman in a plain cap with a blank patch, a work vest with pockets and a tool belt; (2) a figure whose head is a mouse-pointer arrow shape; (3) a woman with a shoulder bag holding a phone; (4) a technician in overalls with a head torch and a tool bag, no cap; (5) a plain figure standing in a doorway.` |
| SF-09 | 3:4 | `Doodle style, off-white line on deep navy, grey fills, amber only for coins. Side view of a simple taxi with a plain roof light and the back door open. The stocky capped tradesman sits at the wheel. A figure with a mouse-pointer arrow for a head is stepping out of the back seat. Above the passenger a speech bubble containing a small plane icon. One amber coin arcs from the driver's pocket toward a small box on the dashboard. The taxi is standing still.` |
| SF-10 | 3:4 | `Doodle style, off-white line on deep navy, grey fills, amber only for coins. A market stall with a striped awning, a tray of small cups and toothpicks. The stocky capped tradesman in an apron stands behind it. A crowd of round, content figures with mouse-pointer arrow heads take samples. Beside the tradesman an open till drawer that is completely empty.` |
| SF-11 | 3:4 | `Doodle style, off-white line on deep navy, grey fills. The stocky capped tradesman proudly holds up a glossy report page showing a bar chart of rising bars in lime green #8BD450 with no labels. Behind it a fan of more pages, each with another lime green chart, one a pie chart. Above the pages a small rosette shape with confetti dots.` |
| SF-12 | 3:4 | `Doodle style, off-white line on deep navy, grey fills. A white panel van seen from the side with a flag taped to its roof. The stocky capped tradesman stands on the roof waving an adjustable wrench in the air, short shout lines around his head. On the pavement directly below, a woman with a shoulder bag looks down at the phone in her hand and does not look up. The street is otherwise empty.` |
| SF-13 | 3:4 | `Doodle style, off-white line on deep navy, grey fills. An apartment front door, half closed. Inside, the stocky tradesman without vest or tool belt, cap in hand, smiling, with a speech bubble containing a thumbs-up icon. Down the corridor a technician in overalls with a head torch and a tool bag waits at a lift door. Above the tradesman a second small bubble with a clock icon.` |
| SF-14 | 3:4 | `Doodle style, off-white line on deep navy, grey fills. Two rounded cards side by side, each with blank placeholder bars and an empty label slot at the top; the right card has a map-pin icon. Between them a woman with a shoulder bag holds a phone to her ear, with a thought bubble containing a wall air-conditioner unit and a speech bubble containing a lightning-bolt icon, a slash, a water-drop icon and a question mark.` |
| SF-15 | 9:16 | `Vertical composition on a dark slate van dashboard. In the lower half, the orange-cased work phone upright on its mount, its whole navy screen filled by the deadpan line face staring at the viewer. Above it, in the upper third, a large empty off-white rounded speech tab with a thick outline, slightly tilted, with a small tail pointing down at the phone. The tab is completely blank.` |

Check each kept frame against the policy rules in section 2 before it goes to the illustrator.
Any stray letter-like marks disqualify the frame.

---

## 5. Asset manifest (Niv's format)

One constant, structured, no prose. `layout`: `tall` serves 9:16 and 1:1, `wide` serves 16:9.
`source`: `illustrator` = layered SVG redrawn by the human illustrator; `html` = rendered by the
pipeline from config or script JSON; `recorder` = `scripts/video/record`; `image-model` = style
frame, reference only.

```ts
export const DASH_V2_ASSETS = {
  version: 1,
  root: 'data/video/dash/',
  character: [
    { id: 'CH-body-portrait',  aspect: ['9x16', '1x1'], layout: 'tall', source: 'illustrator', usage: 'Dash case + screen, portrait; EST, SCR, VRD, PRD' },
    { id: 'CH-body-landscape', aspect: ['16x9'],        layout: 'wide', source: 'illustrator', usage: 'Dash case + screen, landscape; EST, SCR, VRD, PRD' },
    { id: 'CH-mount',          aspect: 'any', source: 'illustrator', usage: 'magnet arm + ball joint, both orientations' },
    { id: 'CH-cable',          aspect: 'any', source: 'illustrator', usage: 'coiled charging cable' },
    { id: 'CH-wear',           aspect: 'any', source: 'illustrator', usage: 'crack top-left, dust bottom corners; separate layer above the screen' },
    { id: 'F-deadpan',         aspect: 'any', source: 'illustrator', usage: 'face, 41 lines; default', mouths: 3 },
    { id: 'F-tired',           aspect: 'any', source: 'illustrator', usage: 'face, escalation lines', mouths: 3 },
    { id: 'F-sarcastic',       aspect: 'any', source: 'illustrator', usage: 'face, dry-edge lines', mouths: 3 },
    { id: 'F-calm',            aspect: 'any', source: 'illustrator', usage: 'face, product lines (mint) and S2 turn (white)', mouths: 3, tints: ['headline', 'accent'] },
    { id: 'F-excited',         aspect: 'any', source: 'illustrator', usage: 'face, brand line only, max 0.5s; thumbnails', mouths: 1, tints: ['accent'] },
    { id: 'F-wait',            aspect: 'any', source: 'illustrator', usage: 'cursor-bar mouth; A3 line 3' },
    { id: 'F-blink',           aspect: 'any', source: 'illustrator', usage: 'closed lids, 3 frames, between lines' },
    { id: 'F-strip-tall',      aspect: ['9x16', '1x1'], layout: 'tall', source: 'illustrator', usage: 'face-strip frame, top band of the screen' },
    { id: 'F-strip-wide',      aspect: ['16x9'],        layout: 'wide', source: 'illustrator', usage: 'face-strip frame, physical-right band of the screen' },
  ],
  world: [
    { id: 'W-cab-tall',   aspect: ['9x16', '1x1'], layout: 'tall', source: 'illustrator', usage: 'dashboard background with props; EST, VRD' },
    { id: 'W-cab-wide',   aspect: ['16x9'],        layout: 'wide', source: 'illustrator', usage: 'dashboard background with props; EST, VRD' },
    { id: 'W-hand-rest',  aspect: 'any', source: 'illustrator', usage: 'owner hand, rest' },
    { id: 'W-hand-reach', aspect: 'any', source: 'illustrator', usage: 'owner hand, reach' },
    { id: 'W-hand-tap',   aspect: 'any', source: 'illustrator', usage: 'owner hand, thumb tap; A1 line 0, PRD taps' },
    { id: 'W-van-side',   aspect: 'any', source: 'illustrator', usage: 'van exterior, story-layer version; S1' },
  ],
  cast: [
    { id: 'C-owner',      aspect: 'any', source: 'illustrator', usage: 'story-layer owner; props: wheel, apron, pages, wrench, home, phone' },
    { id: 'C-click',      aspect: 'any', source: 'illustrator', usage: 'cursor-headed figure; A1, A2; slim and round variants' },
    { id: 'C-woman',      aspect: 'any', source: 'illustrator', usage: 'S1, S3' },
    { id: 'C-technician', aspect: 'any', source: 'illustrator', usage: 'S2' },
    { id: 'C-customer',   aspect: 'any', source: 'illustrator', usage: 'S2 mirror' },
    { id: 'G-glyphs',     aspect: 'any', source: 'illustrator', usage: 'plane, coin, cursor, sun, charts, rosette, magnifier, pin, clock, thumbs-up, outline star, bolt, drop, AC unit, tick, question mark' },
  ],
  scenes: [
    { id: 'SC-A1-meter',  aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'A1-30 line 0', poses: 2 },
    { id: 'SC-A1-taxi',   aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'A1-30 lines 1-2; A1-15 line 0', poses: 3 },
    { id: 'SC-A1-pay',    aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'A1 verdict payoff', poses: 1 },
    { id: 'SC-A2-stall',  aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'A2-30 lines 0-3; A2-15 line 0', poses: 4 },
    { id: 'SC-A2-pay',    aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'A2 verdict payoff', poses: 1 },
    { id: 'SC-A3-report', aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'A3-30 lines 0-3; A3-15 line 0', poses: 4 },
    { id: 'SC-A3-stack',  aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'A3 verdict payoff, under T-A3-stamp', poses: 1 },
    { id: 'SC-S1-van',    aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S1-30 line 0', poses: 3 },
    { id: 'SC-S1-roof',   aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S1-30 line 1; S1-15 line 0', poses: 2 },
    { id: 'SC-S1-woman',  aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S1-30 line 2; S1-15 line 1', poses: 2 },
    { id: 'SC-S1-split',  aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S1 verdict payoff', poses: 1 },
    { id: 'SC-S1-down',   aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S1-30 line 4, last sentence', poses: 2 },
    { id: 'SC-S2-room',   aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S2-30 lines 0-1', poses: 4 },
    { id: 'SC-S2-door',   aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S2-30 line 2; S2-15 line 0', poses: 2 },
    { id: 'SC-S2-later',  aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S2-30 line 3; S2-15 line 1', poses: 1 },
    { id: 'SC-S2-mirror', aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S2 verdict payoff; S2-15 line 2', poses: 1 },
    { id: 'SC-S2-form',   aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S2 product fallback: blank review form after I6', poses: 1 },
    { id: 'SC-S3-cards',  aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S3-30 line 0; S3-15 line 0; label slots for T-S3-label*', poses: 1 },
    { id: 'SC-S3-ac',     aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S3-30 line 1', poses: 2 },
    { id: 'SC-S3-ask',    aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S3-30 line 2; S3-15 lines 0-1; slot for T-S3-yes', poses: 2 },
    { id: 'SC-S3-off',    aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S3-30 verdict payoff', poses: 1 },
    { id: 'SC-S3-agree',  aspect: ['9x16', '1x1', '16x9'], layouts: ['tall', 'wide'], source: 'illustrator', usage: 'S3-30 line 5; slots for T-S3-svc1..3', poses: 3 },
  ],
  shared: [
    { id: 'I5', aspect: ['9x16', '1x1', '16x9'], source: 'illustrator', usage: 'drawn profile card with mint ticks (intro mission I5); S1, S3 product beats' },
    { id: 'I6', aspect: ['9x16', '1x1', '16x9'], source: 'illustrator', usage: 'hand forwards one message bubble (intro mission I6); S2 product fallback' },
  ],
  overlays: [
    { id: 'U-wordmark', aspect: ['9x16', '1x1', '16x9'], source: 'html', usage: 'WAO wordmark, physical top-left of the safe box, every frame before END' },
    { id: 'U-banner',   aspect: ['9x16', '1x1', '16x9'], source: 'html', usage: 'verdict banner; text from the script JSON path per episode' },
    { id: 'U-tapring',  aspect: 'any', source: 'html', usage: '48px accent ring, 300ms; PRD taps and S1 line 2' },
    { id: 'T-A3-stamp', aspect: ['9x16', '1x1', '16x9'], source: 'html', usage: 'A3 verdict payoff' },
    { id: 'T-S3-yes',   aspect: ['9x16', '1x1', '16x9'], source: 'html', usage: 'S3-30 lines 2-3; S3-15 line 1' },
    { id: 'T-S3-labelSite',    aspect: ['9x16', '1x1', '16x9'], source: 'html', usage: 'S3 line 0, site card' },
    { id: 'T-S3-labelProfile', aspect: ['9x16', '1x1', '16x9'], source: 'html', usage: 'S3 line 0, profile card' },
    { id: 'T-S3-svc',   aspect: ['9x16', '1x1', '16x9'], source: 'html', usage: 'S3-30 line 5, three lines on both cards', count: 3 },
    { id: 'T-demo',     aspect: ['9x16', '1x1', '16x9'], source: 'html', usage: 'demo label on every real-screen frame' },
  ],
  recordings: [
    { id: 'R-SITE-S1-mobile',  aspect: ['9x16', '1x1'], source: 'recorder', usage: 'S1, S3 product beats', status: 'exists as S1_mobile_DRAFT' },
    { id: 'R-SITE-S1-desktop', aspect: ['16x9'],        source: 'recorder', usage: 'S1, S3 product beats', status: 'exists as S1_desktop_DRAFT' },
    { id: 'R-SITE-review-mobile',  aspect: ['9x16', '1x1'], source: 'recorder', usage: 'S2 product beat', status: 'blocked: gate G2' },
    { id: 'R-SITE-review-desktop', aspect: ['16x9'],        source: 'recorder', usage: 'S2 product beat', status: 'blocked: gate G2' },
    { id: 'R-ADS-lead-mobile',  aspect: ['9x16', '1x1'], source: 'recorder', usage: 'A1-A3 product beats: mark a lead as a closed job', status: 'missing: gate G5' },
    { id: 'R-ADS-lead-desktop', aspect: ['16x9'],        source: 'recorder', usage: 'A1-A3 product beats', status: 'missing: gate G5' },
    { id: 'R-ADS-campaign-mobile',  aspect: ['9x16', '1x1'], source: 'recorder', usage: 'A2-30 line 5, optional', status: 'missing: gate G5' },
    { id: 'R-ADS-campaign-desktop', aspect: ['16x9'],        source: 'recorder', usage: 'A2-30 line 5, optional', status: 'missing: gate G5' },
  ],
  endScreens: [
    { id: 'E-ADS-9x16',  aspect: ['9x16'], source: 'html', usage: 'A1-A3 last beat' },
    { id: 'E-ADS-1x1',   aspect: ['1x1'],  source: 'html', usage: 'A1-A3 last beat' },
    { id: 'E-ADS-16x9',  aspect: ['16x9'], source: 'html', usage: 'A1-A3 last beat' },
    { id: 'E-SITE-9x16', aspect: ['9x16'], source: 'html', usage: 'S1-S3 last beat' },
    { id: 'E-SITE-1x1',  aspect: ['1x1'],  source: 'html', usage: 'S1-S3 last beat' },
    { id: 'E-SITE-16x9', aspect: ['16x9'], source: 'html', usage: 'S1-S3 last beat' },
  ],
  styleFrames: [
    { id: 'SF-01', aspect: '1x1',  source: 'image-model', usage: 'Dash hero, front; reference image for the rest' },
    { id: 'SF-02', aspect: '16x9', source: 'image-model', usage: 'expression sheet' },
    { id: 'SF-03', aspect: '16x9', source: 'image-model', usage: 'turnaround' },
    { id: 'SF-04', aspect: '16x9', source: 'image-model', usage: 'cab, wide, Dash landscape' },
    { id: 'SF-05', aspect: '9x16', source: 'image-model', usage: 'cab, tall, Dash portrait' },
    { id: 'SF-06', aspect: '1x1',  source: 'image-model', usage: 'owner hand poses' },
    { id: 'SF-07', aspect: '16x9', source: 'image-model', usage: 'van exterior' },
    { id: 'SF-08', aspect: '16x9', source: 'image-model', usage: 'story-layer cast sheet' },
    { id: 'SF-09', aspect: '3x4',  source: 'image-model', usage: 'A1 story key frame' },
    { id: 'SF-10', aspect: '3x4',  source: 'image-model', usage: 'A2 story key frame' },
    { id: 'SF-11', aspect: '3x4',  source: 'image-model', usage: 'A3 story key frame' },
    { id: 'SF-12', aspect: '3x4',  source: 'image-model', usage: 'S1 story key frame' },
    { id: 'SF-13', aspect: '3x4',  source: 'image-model', usage: 'S2 story key frame' },
    { id: 'SF-14', aspect: '3x4',  source: 'image-model', usage: 'S3 story key frame' },
    { id: 'SF-15', aspect: '9x16', source: 'image-model', usage: 'verdict frame with a blank banner' },
  ],
} as const;
```

---

## 6. End screen, per aspect

The layout is the intro mission's E1, unchanged, so both video families end on the same card.
It is rendered by `endScreenPage` in `scripts/video/lib/pages.mjs` from `data/video/config.json`.
Dash does not appear on it.

### Content per product
| Row | Ads Bot (`E-ADS`) | Site Bot (`E-SITE`) | Source | Status |
|---|---|---|---|---|
| Wordmark | WAO | WAO | `brand.wordmark` | Ready |
| Product name | lexicon id `bot-modaot` | lexicon id `site-bot` | pronunciation lexicon, `clean` form | Ready |
| Price digits | 249 | 199 | `products.*.price.amount`; Site Bot is cross-checked against `plans.ts` | Ready. Ads Bot has no page constant to check against (`pageSource` is null). |
| Price wording (per month, plus VAT) | needed | needed | not in config | **Missing.** The Dash end line carries no price, so the template falls back to the bare amount. Both prices are quoted before VAT, so the bare amount must not ship. |
| Stamp | shared | shared | `end_screen.pick` in the script JSON → `stampText` | Tamar picked; waiting for Noa; config still `STAMP_TEXT_PENDING`. |
| CTA | `ads_bot.pick` | `site_bot.pick` | `video-end-screen-cta-2026-11-12.waocopy.json` → `ctaText` | Tamar picked; waiting for Noa; config still `CTA_TEXT_PENDING`. |
| URL | `wao.co.il/google-ads` | `wao.co.il/site-bot` | config | Ready. Both pages must show the same price before any release. |

### Layout (`u` = 1% of the safe box's short side: 8.4px, 9.2px, 9.4px)
| Element | Style | 9:16 (stack, centred) | 1:1 (stack, centred) | 16:9 (two columns) |
|---|---|---|---|---|
| Wordmark | Rubik 700, `accent`, letter-spacing 0.08em, `dir="ltr"` | 7u, top of the stack | 6u, top | 6u, top of the right column |
| Product name | Rubik 700, `headline` | 11u | 10u | 10u, right column |
| Price line | Rubik 700, `accent`, one isolated no-wrap unit | 13u, the largest element | 12u | 13u, right column |
| Stamp | Rubik 700, 4.6u, `headline` text, 0.5u mint border at 55%, radius 0.5em, rotated −4°, mint wash fill | Under the price, shifted 6u to the physical left, overlapping the price block by 1u | Same, shifted 4u | Under the price, right column |
| CTA pill | Rubik 700, 6u, `bg` text on `accent`, radius 999px | Under the stamp, gap 5u | Gap 4u | Left column, vertically centred |
| URL | Assistant 600, 4.6u, `secondary`, `dir="ltr"` | Under the CTA, gap 2.5u | Gap 2u | Under the CTA, left column |

- **Safe boxes:** 9:16 x 60–900, y 250–1500; 1:1 x 70–1010, y 70–990; 16:9 x 110–1810, y 60–1000.
- **16:9 columns:** the right column (56%) holds wordmark, product, price and stamp, aligned to the physical right; the left column (44%) holds CTA and URL.
- **Entrance:** everything is on from the first frame except the stamp, which lands 400ms in (scale 1.15 → 1, 160ms).
- **Hold:** at least 3 seconds static after the voice ends (`holdSeconds: 3`). The voice over this beat is only the brand and the product name; the price is seen, not heard.
- **Hand-over from Dash:** the `excited` face plays in the 0.4s gap before the end beat, then a 6-frame fade. If that is not built, the product beat cuts straight to the end screen.
- **Today's template** stacks all three aspects in one centred column and applies no stamp entrance. That is acceptable for 9:16 and 1:1; the 16:9 two-column layout is the intro mission's pipeline change P4.
- **Bidi:** the price line (currency sign, digits, VAT term) is one isolated unit; Maya checks one exported frame per aspect.

---

## Pipeline changes this design needs (scripts/video, not done here)
The intro mission's P1 (per-aspect `src`), P2 (plate), P4 (end-screen layout), P5 (slot fail) and
P7 (gates) also apply. New for Dash:

| # | Change | Needed by |
|---|---|---|
| D1 | A persistent wordmark overlay on every beat before the end screen | "Brand from the first frame" |
| D2 | A text-overlay layer on a beat (banner and in-art words), with the text taken from the script JSON and included in the approved hash | VRD beats, A3, S3 |
| D3 | An end-screen price line from config when the end line carries no price | Both end screens |
| D4 | A scene renderer: layered SVG poses plus the audio-driven mouth, captured to one clip per beat per aspect (the recorder's frame capture can be reused) | Every cartoon beat |
| D5 | The face strip composited over recordings in PRD beats | A1–A3, S1–S3 |

## Conflicts between the scripts' `screen` fields and the rules, and how this design resolves them
| Script says | Rule | Resolution |
|---|---|---|
| S1: "her phone screen … with a Google search" | No Google interface | Magnifier glyph and a blank bar. |
| S1, S3: "Real Site Bot screen: … a Google profile saying the same thing" | Profile sync is off in prod (G1); no Google interface | Real site recording, then the drawn profile card. |
| S2: "a review request reaches his customer … picks the stars" | Review flow not live (G2); the owner forwards, WAO does not message; no Google review interface | Drawn fallback: the owner forwards; a blank generic form. |
| A1–A3: "Real Ads Bot screen … the learning line updates" | Only what the real screen shows; no recording exists | Gate G5. The wording of what updates follows the real screen. |
| A2: "the campaign running on Google Ads" | No Google logo | Optional second recording, only if the real panel has no logo in frame. |
| A1: taxi meter, fares | No amounts | Notches and cursor icons, blank coins. |
| A3: "agency logo", confetti | No real brands | Abstract blank mark; confetti is the agency's only. |
| A3, S3: Hebrew words inside the picture | Image models garble Hebrew; no Hebrew typed by hand | Text overlays from the script JSON (D2). |

## Files
- `docs/missions/video-dash-v2-design-2026-11-12.md` (this file)
- `docs/copy/briefs/video-dash-v2-onscreen-text-2026-11-12.md` (brief for Tamar: price line, banners, in-art words)
- Later: art under `data/video/dash/`, specs in `scripts/video/specs/dash-*.video.json`

## Constraints
- Hebrew only from Tamar, then Noa. No Hebrew in art files, templates or this doc.
- No image or video API is called by a script on the Qwen plan; the founder decides how frames are generated.
- `data/clients/` is not touched; real screens use the fictional demo business, labelled.
- The policy rules in section 2 apply to every frame, including style frames.

## Acceptance
- Dash is visibly the same character in two episodes side by side (pilot criterion 5).
- On mute, four of five viewers can state the problem of each episode (pilot criterion 2).
- No frame contains letters or digits that did not come from the script JSON or config.
- Maya passes one exported frame per shot type and per end screen in each aspect; Noa passes banners and overlays.
- The end-screen price equals the page price for the same product on the release date.

## Verifier
Roni builds one episode in three aspects, extracts one frame per beat, and confirms: wordmark
present from frame 1, banner inside its box, captions inside the caption band, no placeholder or
pink `_PENDING` text, end screen held at least 3 seconds, and output length within the slot.
