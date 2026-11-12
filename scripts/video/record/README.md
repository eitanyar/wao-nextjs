# Video screen recorder

Records the real Site Bot screens the intro storyboard needs
(`docs/missions/video-intro-site-bot-2026-11-12.md`, S1–S4) on a seeded fictional business
(`docs/missions/video-demo-business-spec-2026-11-12.md`). Re-run it after any UI change.

## Run

```bash
# 1. Compiled product modules (the recorder refuses stale ones)
npx tsc -p tsconfig.test.json

# 2. A local dev server on a free port, production flags (needed for S4 only)
cp tsconfig.json /tmp/tsconfig.before            # next dev rewrites tsconfig.json
env -u QWEN_BASE_URL -u QWEN_API_KEY -u QWEN_CHAT_MODEL SITE_BOT_PAID_FLOW=0 \
  WAO_DEPLOY_DIST_DIR=.next-video npx next dev --port 3271 --hostname 127.0.0.1

# 3. Record
node scripts/video/record/record.mjs --base-url http://127.0.0.1:3271
node scripts/video/record/record.mjs --shots S1,S2 --sets mobile     # no server needed
node scripts/video/record/record.mjs --list

# 4. Clean up
cp /tmp/tsconfig.before tsconfig.json && rm -rf .next-video
```

Never point it at the long-running server on port 4017 or at production: it accepts loopback only.

## Output (`scratch/video-out/recordings/`)

| File | What |
|---|---|
| `{shot}_{set}[_DRAFT].mp4` | H.264, 30 fps. `mobile` = 390×844 CSS at 3× → 1170×2532 (for 9:16 and 1:1). `desktop` = 1280×720 CSS at 1.5× → 1920×1080 (for 16:9). |
| `{shot}_{set}[_DRAFT].png` | The last frame. |
| `recordings.manifest.json` | Per clip: hash, size, length, cut marks, the checks that passed, what the network policy answered or blocked, and why the clip may not be released. |

`_DRAFT` means the demo data is not approved. The reasons are printed at the start of a run and
stored in the manifest (`releaseBlockers`).

## Shots

| Shot | Beat | What | Needs |
|---|---|---|---|
| S1 | B05 | Demo site: home, services grid, tap into a service page | nothing |
| S2 | B06 | Demo site: ring around the call button (never clicked), opening hours | nothing |
| S3 | B10 | Intake chat | **blocked** (gate G4, see the spec) |
| S4 | B12 | Free check: type the name, cut, the six-item result | local dev server |

Marks in the manifest (`cut-to-result`, `service-page`, …) are frame-exact cut points for the editor.

## How it stays honest and safe

- **Real renderer.** The demo site is built by the product's own `renderResearchedSitePages` from
  the site record and served from memory. Nothing is deployed.
- **Real UI, seeded data.** S4 runs the live `/site-bot/audit` page. Its two API calls are answered
  from the seed, scored by the product's own `scoreAudit`. No Places lookup is made.
- **Network policy.** Any other `/api/` call, any write request and any external host are blocked
  (fonts excepted). An unexpected API call fails the clip.
- **Checks stop the shot.** Six scorecard items, buy button off, a page per service, a call link on
  every content page. If the product stops doing what the video says, the recording fails.
- **Fiction guards.** Seed only under `data/video/demo/` or `scratch/`; phone must be `050-000000X`;
  domain must be `.invalid` or `.example`; no photos or profile links.
- **Motion limits** from the storyboard: scroll at most 600 CSS px per second, typing at most 10
  characters per second, 300 ms tap ring. All motion is computed per frame, so two runs match.
- **No Hebrew** in this folder. Hebrew on screen comes from the site record and the live UI.

## Layout

| File | Role |
|---|---|
| `record.mjs` | Command line, run loop, manifest |
| `lib/shots.mjs` | The shots, step by step |
| `lib/capture.mjs` | Frame capture into ffmpeg, tap ring, network policy |
| `lib/site.mjs` | Renders and serves the demo site |
| `lib/demo.mjs` | Seed loading, fiction guards, audit replies |
| `lib/motion.mjs` | Scroll, typing and ring frame maths; viewport sets |
| `record.test.mjs` | `node --test scripts/video/record/record.test.mjs` (offline) |

## Adding a shot
Add an entry to `SHOTS` in `lib/shots.mjs` with `beat`, `title`, `source` (`site` or `app`) and a
`run(ctx, env)` built from `ctx.goto / hold / scrollTo / tap / pulse / type / mark / check`. If the
page calls an API, add a seeded reply to `policy.mocks` in `record.mjs`.
