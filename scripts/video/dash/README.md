# Dash story-ad toolkit

Builds one full-screen 9:16 Dash story ad from a `story.json` shot list. The story.json schema and time
expressions are documented in the `dash_story.py` docstring.

## Where things live

- Code: `scripts/video/dash/` (this folder). No Hebrew is typed in any file here. Every on-screen string is loaded
  from a named source (script JSON, waocopy JSON, `data/video/config.json`).
- Inputs, build artifacts and outputs stay in gitignored `scratch/`:
  - story spec: `scratch/video-dash/<id>/story.json`
  - voice, clips, stills: paths named in the spec, repo-relative (for example `scratch/video-dash/<id>/audio/...`)
  - build artifacts: `<story.json dir>/story-build/` (`voice.wav`, `timing.json`, `stt.json`, `ov/`, `pv/`)
  - outputs: `scratch/video-out/stories/<id>/<id>_9x16_he_FULL.mp4` plus `.timeline.json`, `.evidence.txt`,
    `.parts/`, `_contact_4fps.png`, `_strip_1fps.png`
- Override the locations with `--out-root DIR` and `--build-dir DIR` (any position), or the env vars
  `DASH_OUT_ROOT` and `DASH_BUILD_DIR`. Path defaults are in `dash_paths.py`.
- Shared dependencies: `scripts/video/lib/dash_face.py` (face rig), `scripts/video/lib/captions.mjs`, `pages.mjs` and
  `render.mjs` (caption split and Chrome render), `scripts/voice/` (lexicon, local STT), `scratch/voice-venv`
  (faster-whisper).

## Entry point

- `dash_story.py <cmd> <story.json>` for every story.
- `dash_story_x.py <cmd> <story.json>` for stories that use the extra glyphs (ST14, ST16, ST20). Same commands.
- `dash_story_seat2.py` forwards to `dash_story.py` (old command lines).
- Run from the repo root. Spec paths are repo-relative.

## Stages, in order

| # | Stage | Command | Reads | Writes | Cost |
|---|---|---|---|---|---|
| 0 | Clips | made outside this toolkit (wan) | keyframes | `scratch/video-dash/<id>/clips/*.mp4` | **paid** (wan clip generation) |
| 1 | Voice prep: re-voice one line (only lines that need it) | `node scripts/video/dash/dash_revoice_line.mjs <scripts.json> <episode> <section> <line> <outDir> [--take k]` | script JSON, lexicon | `<outDir>/<slug>.mp3` + `.local.json` + `.report.json` | **paid** (ElevenLabs TTS). A cached take is reused at no cost. |
| 2 | Voice prep: splice, tighten, measure | `python3 scripts/video/dash/dash_story.py prep <story.json>` | `voice.src`, `voice.splice` takes | `story-build/voice.wav`, `timing.json` | free (local STT) |
| 3 | Overlays | `python3 scripts/video/dash/dash_story.py overlays <story.json>` | script JSON, config, `timing.json` | `story-build/ov/*.png`, `cards.json`, `measure.json` | free (local Chrome) |
| 4 | Timing check (optional) | `... render <story.json> --timeline-only`, `... preview <story.json> <t1,t2,...>` | `timing.json`, `ov/` | `.timeline.json`; `story-build/pv/*.png` | free |
| 5 | Render | `python3 scripts/video/dash/dash_story.py render <story.json>` | `timing.json`, `ov/`, clips, stills | MP4, `.timeline.json`, `.parts/` | free |
| 6 | Evidence | `python3 scripts/video/dash/dash_story.py evidence <story.json>` | MP4, timeline, `ov/` | `.evidence.txt` | free (local STT) |
| 7 | Sheets | `python3 scripts/video/dash/dash_story.py sheets <story.json>` | MP4 | `_contact_4fps.png`, `_strip_1fps.png` | free |
| - | END card only | `python3 scripts/video/dash/dash_story.py endcard <story.json>` | `.parts/` | END card PNG, re-joined MP4 | free |

## Rules

- Re-run `prep` after any change to the voice source or splices. `render` refuses a stale `timing.json`.
- Re-run `overlays` after any change to captions, banners, the END card or overlay boxes.
- A story is done only when `evidence` exits 0.
- Evidence fails on a caption card that leads its voice onset by more than 0.15 s and on any shot edge off the
  30 fps frame grid.
- END hold is 3.8 s.
- Real screens (`dash_screen_text.py`): a shot of kind `rec`, a shot with `"demo_tag": true` or `"screen": true`, or a
  clip whose `clips` entry has `"screen": true`. A clip or still screen is cleared to its own background from just
  above the caption band down, and plays nearest frames (no blend, so scrolling text never ghosts). Place the
  recording so the UI the voice names sits above the band. Screen recordings come from `scripts/video/record/` on the
  demo business (`data/video/demo/demo-business.json`), never a test record.
- Evidence OCRs every real-screen shot (local RapidOCR, free) and fails on a test / placeholder string (TEST, M2a,
  lorem, emails, sandbox IDs, live client names, ...), on screen text under a caption card or banner, and on a
  recorder manifest entry that flags a test name. One-time setup:
  `python3 -m venv scratch/ocr-venv && scratch/ocr-venv/bin/pip install rapidocr_onnxruntime` (or set `DASH_OCR_PY`).
- Paid steps are stages 0 and 1 only. Every other stage is local and free.
- Never type Hebrew into a story.json or a tool. New strings come from the script JSON or a waocopy file.
- Generated files never go into git: specs, audio, clips, build artifacts and outputs stay in `scratch/`.
