# Dash production log

One entry per production, newest first. The format and rules are in `docs/missions/dash-route-fable52-2026-11-14.md` (Recipe). Copy every "From now on…" line into the Recipe.

## 2026-11-14 · wan consistency test (9 shots) · pure wan → hybrid
Cost / time: 45s of wan, ≤$2.70, 9 renders, 3 of 9 usable (S1r, S5br, S2r motion only),
  about 3h including the sheet and composite. Plan about 13% used.
Worked:
- Identity: case, bumpers and tape on-model in 9/9 shots.
- One ref + locked-off wording gives full shot control (S1r, S5br).
- Pipeline face on a blank plate is pixel-stable (S5b-composite).
Failed:
- 10 refs: wan cycled the sheet as a storyboard, 0/5 (S1–S5b).
- wan lip-sync: one phrase, then face cycling and a dissolve (S5a).
- Text-only character design: round head instead of cursor head, twice (S2, S2r);
  digits appeared despite "no numbers" (S4).
Rule changes:
- From now on: one reference image per shot; two characters = one merged keyframe.
- From now on: wan never draws Dash's face; the rig does.
- From now on: one frozen cab plate for the whole series.
- From now on: every story character gets an approved reference image before any video.
- From now on: glyphs, coins, meters and bubbles are pipeline overlays.
- From now on: trim the first 0.5s; one action per 5s clip.
Next production tests: does a single keyframe ref hold the cursor head through a 5s action?
