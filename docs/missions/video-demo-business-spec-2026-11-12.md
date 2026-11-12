# Mission: demo business for the video screen recordings (Fable 5.2, 2026-11-12)

The fictional business that appears in the real-screen beats (S1–S4) of
`video-intro-site-bot-2026-11-12.md`, and how its data reaches the recorder in
`scripts/video/record/`. No Hebrew is authored here.

## Outcome
One frozen, approved site record for a clearly fictional plumber, under `data/video/demo/`. The
recorder turns it into the S1, S2 and S4 clips at both viewport sets, with no manual step, and can
repeat that after any UI change.

**Today:** the recorder works end to end on a **stand-in** (an eval record from this morning, test
names, copy not proofread). Its six clips are named `_DRAFT` and are blocked from release.

## The demo business
| Field | Value | Why |
|---|---|---|
| Trade | Plumber, one-man, comes to the customer | The persona's own world; matches the Dash ads. |
| Name | From Tamar (`demo_business_name` in the narration brief). Must read as a made-up name and return no exact match in a Google search. | It is typed on screen in S4 and sits in the site header in S1–S2. |
| Person | None. No owner name, no face, no photo. | "No real person"; the product then writes in first person without a name. |
| Area | Two real neighbouring cities (the product needs a real place to write a local page). No street address. | A street address could be someone's real address. |
| Services | Three: leak detection (main), drain unblocking, water heater installation | Gives S1 a grid of three and three service pages. |
| Hours | `Sun-Thu 08:00-18:00, Fri 08:00-13:00` (the format the product parses; it prints the Hebrew itself) | B06 shows hours. |
| Phone | `050-0000000` (rule: `050-000000X`) | Not a subscriber number; a viewer who dials reaches nobody. The recorder refuses any other number. |
| Email | None, or `@example.com` | Same reason. |
| Domain | `https://demo-plumber.invalid` | Own domain from day one; `.invalid` can never resolve. No address bar is shown anyway. |
| Reviews, stars | **None** (`reviewQuote`, `starRating`, `reviewCount` empty) | The storyboard forbids review quotes and star numbers; the site prints them if present. |
| Prices | **None** (`startingPrices`, `calloutFee`, `pricingNotes` empty) | Founder rule: a price appears only on the end screen. The site prints prices if present. The promises "free quote" and "price agreed before work" may stay. |
| Photos, logo, profile links | None | No real media or profiles. |

### The free-check result (S4)
The result is scored by the product's own `scoreAudit` from six facts in the seed
(`data/video/demo/demo-business.json` → `audit.snapshot`). Chosen picture: **2 pass, 4 fail.**

| Item | Seed fact | Result |
|---|---|---|
| Categories | 3 categories | pass |
| Phone and website | both present | pass (the demo business has a site in S1, so the check must not say it has none) |
| Opening hours | regular hours, no holiday hours | fail |
| Photos | none | fail |
| Reviews | 4 reviews | fail (under 10) |
| Description | none | fail |

The audit ID and place ID are made-up (`demo-place-0001`); no real Google place is referenced and
no Places lookup is made.

## How the data flows
| Step | Who | What |
|---|---|---|
| 1 | Tamar → Noa | Hebrew intake answers, brief `docs/copy/briefs/video-demo-business-intake-2026-11-12.md`. |
| 2 | Engineer | Puts the answers in a fixture under `data/video/demo/` and runs the site generator once with all data roots pointed at `scratch/` (same recipe as `scratch/sell-r1/run-one.sh`). |
| 3 | Noa | Proofreads the generated pages (only the fields the site renders). |
| 4 | Engineer | Copies the record byte-exact to `data/video/demo/site-record.json`; sets `siteRecord`, `status: "APPROVED"` and the three sign-offs in `demo-business.json`. |
| 5 | Anyone | `node scripts/video/record/record.mjs --base-url http://127.0.0.1:<port>` → clips without `_DRAFT`. |

## Files
- `data/video/demo/demo-business.json`: the seed (slug, domain, service page for S1, audit facts, status, sign-offs).
- `data/video/demo/stand-in/site-record.json`: today's stand-in, a byte-exact copy of `scratch/sell-r1/eval/plumber-3/site-record.json`.
- `scripts/video/record/`: recorder, README, tests.
- `scratch/video-out/recordings/`: clips, last-frame stills, `recordings.manifest.json`.

## Constraints
- Seed data lives only under `data/video/demo/` or `scratch/`. The recorder refuses a seed path under `data/clients/` and never writes to `data/`.
- The recorder runs against a loopback dev server only and refuses any other host.
- The page's API calls are answered from the seed or blocked. No Places lookup, no model call, no form post, no analytics.
- The call button gets a ring and is never clicked.
- Hebrew comes only from the generator output (proofread by Noa) and from the live UI.

## What the recordings showed about the product (2026-11-12)
| # | Finding | Effect on the video | Owner |
|---|---|---|---|
| F1 | Opening hours are visible only on the contact page. Service pages and the home page carry them in structured data only. | B06 says "on every page: your hours". Not true on screen today. S2 records the call button on the service page, then cuts to the contact page for the hours. | Founder decision D2 |
| F2 | The service cards on the home page are not links. The links to service pages are in a list lower down and in the menu. | S1 cannot "tap a service card". It scrolls on to the link list and taps there, which makes S1 8.9s on mobile against a 7s beat. | Engineer / Maya |
| F3 | The call button is on the home page, contact page and every service page, but not on the privacy, accessibility and 404 pages. | "A button that calls you on every page" is fair for the pages a customer reads. No change needed. | — |
| F4 | A free-check result with four failed items is long on mobile: each failed item opens its fix steps, so the scroll over all six is about 1,400 CSS px. At the storyboard's scroll limit the result part alone is 6.8s (S4 total 10.8s against a 7s beat). | Either show only the first three items, or let B12 run longer. | Founder decision D3 |
| F5 | Desktop recordings (1280×720 CSS) put 16px body text at about 15px in the 16:9 plate. The storyboard's own floor is 24px. | The 16:9 plate needs a zoom, or the desktop set should be recorded at about 800×450 CSS. | Maya |
| F6 | On the contact page the hours line prints the time range with the later hour first on the physical left (normal right-to-left order). | Maya to confirm it reads correctly to a Hebrew reader before it is shown large. | Maya |
| F7 | The free-check screens name Google in text ("the business profile on Google", "Google Places"). No logo or interface. | Dror to confirm text mentions are fine in a Google ad. | Dror |

## Blocked today
| Item | Why | Unblocks when |
|---|---|---|
| Release-quality S1, S2, S4 | Stand-in data: test name, an owner name, a review quote, a star rating, prices, copy not proofread. | Steps 1–4 above. |
| S3 (intake chat `/site-bot/start`) | Gate G4 not passed (404 in production). The chat replies come from a live model, so a repeatable recording needs a seeded reply script. The demo owner's answers are Hebrew. | G4 passes, plus engineer item E2 and Tamar's answers. |
| Clips inside the final video | The assembly pipeline has no plate template yet (P1, P2 in the storyboard). | Next pipeline task. |

## For the engineer (changes in `src/` that I did not make)
| # | Change | Why |
|---|---|---|
| E1 | `WAO_AUDITS_DIR` override for `data/audits` in `src/lib/site-bot/auditStore.ts`, like the other data roots in `dataRoots.ts`. | Lets a recording or a QA run read a seeded audit from the real API instead of an intercepted reply. Optional: the interception works today. |
| E2 | A fixture mode for `/api/bot` on non-production servers (replies read from a file). | Needed for a repeatable S3. Only if G4 passes. |
| E3 | Make each home-page service card a link to its service page (F2). | Better for customers, and S1 becomes the storyboard's shot. Needs Maya's and Yonatan's nod (internal links). |
| E4 | If D2 goes that way: print the opening hours on service pages (F1). | Makes B06 true as written. |

## Acceptance
- `node --test scripts/video/record/record.test.mjs` passes (17 tests today).
- A full run exits 0, every clip `status: "ok"`, sizes 1170×2532 and 1920×1080 at 30 fps.
- With approved data: no `_DRAFT` in any file name and `"release": true` in the manifest.
- `git status data/clients` shows nothing after a run.

## Verifier
Roni: runs the recorder against a fresh local server, opens each clip, confirms the manifest's
checks, and on the lock date compares each recorded screen with the same route in production.
