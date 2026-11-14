# Dash production route review (2026-11-14)

## Verdict

**Hybrid, with a sharper split than proposed: wan never draws Dash's face and never puts Dash and the story in the same shot.**

| Layer | Made by | Evidence |
|---|---|---|
| Cab plate with blank-screen Dash | wan, **once**, then frozen as a still and reused in every episode | S5br is static (0 px shift over 150 frames), so a video adds nothing. S1r and S5br used the same setting text and still came out as two different dashboards and skies, so regenerating per shot would break the world. |
| Dash's face, blinks, lip-sync, face strip | Pipeline rig | The composite is pixel-identical on all 140 non-blink frames. wan's lip-sync (S5a) held one phrase, then cycled faces and dissolved to a new cab. |
| Story doodles (taxi, click-people), full-frame on navy, no Dash | wan, one reference per shot | S2r's motion is good: in, sits, out, walks away, taxi still. Its failures were the round head and the slide-in. |
| Glyphs, bubbles, coins, meter, banner, captions, product recording, end screen | Pipeline overlays | wan drew "10" on a panel (S4) and dropped the coin twice (S2, S2r). |

- **Pure wan is rejected:** round 1 failed shot control 0/5, and the lip-sync is unusable.
- **Pipeline-only is rejected:** it throws away the one thing wan does well and cheaply, which is doodle motion.
- **The split fits the spec:** in A1 the story plays on Dash's screen (SCR shots), so the pipeline frames a wan story clip inside a still bezel with the rigged face strip on top.

**Prerequisite:** `scripts/video/` has no face rig. The composite was throwaway Python, so the engineer must package it before A1.

## Recipe

**References**
- **One image per wan shot, always.** Ten refs made wan treat the sheet as a storyboard.
- **A shot with two characters gets one merged keyframe image.** Build it in the image model first; never pass two refs.
- **Dash:** ref 02 (blank) only. Refs 01 and 03–10 are no longer wan inputs; they become the drawing spec for the rig.

**Generate first, in this order (image model; Eitan approves like the sheet)**
1. **Click-person:** doodle body with an arrow-cursor head, off-white line on `#0D1117`, grey fill. Text alone failed twice ("not a human head" still gave a round head).
2. **`K-A1-taxi` keyframe:** side-view taxi, back door open, owner in his cap at the wheel, click-person beside the door, blank roof sign.
3. **`K-A1-pay` keyframe:** wallet, coins, click-people's hands.
4. **Master cab plate:** one more pass from ref 02, at most 3 tries, to fix S5br's gradient sky, missing rooftop line and cropped coin jar. If none is better, freeze the S5br frame.

**The gate before the episode:** run one 5s shot from `K-A1-taxi` (about $0.30). If the cursor head holds, proceed. If it fails 3 times, the story falls back to image-model pose stills swapped by the pipeline, which the spec's motion rules already allow.

**Not wan at all:** `SC-A1-meter` (pose stills, since meters invite digits), the owner's thumb (a still overlay with a short slide), bubbles, the plane glyph, coin arcs and the meter chip.

**Prompt rules**

| Worked (keep verbatim) | Failed (never again) |
|---|---|
| "exactly as in Image 1", one ref | Several refs; "Use Image 9 for the setting" (the camera wandered and the spirit level turned orange) |
| Setting described in text, ending "Nothing else." | Acting sequences with several beats (wan cycled expressions) |
| "keeps this one expression for the whole shot" | Negative shape words for a character design |
| "Locked-off static camera… no pan, no zoom, no cuts, one continuous take" | Relying on "no numbers" to stop digits |
| "plain flat deep navy panel" (fixed S2's ghost overlay); "The taxi never moves" | wan `reference_audio` lip-sync |
| `prompt_extend` off, 720P | Dash and the story in one frame |

**Shot length and budget**
- Generate 5s per shot with one action each (in, asks, out). Trim the first 0.5s, where the taxi slides in, and use at most 4s.
- Longer beats are two clips with a hard cut, or a held last frame.
- Use 1:1 for story clips if the API offers it; otherwise 9:16 with the action in a centred square.
- Stop at 3 attempts per shot, then use the stills fallback.
- Cap A1 at 100s of wan (about $6). The expected need is about 40s. Submit by hand, one task at a time.

**Face rig work, in order**
1. Build the three faces A1 needs beyond blink: `tired`, `calm` (mint) and `excited`, plus face-strip mode.
2. Make the mouth about twice as large. At 23 px it is far smaller than wan's S5a mouth and is hard to read in the contact sheet.
3. Sample the off-white from the plate and add a slight outline wobble so the face doesn't look pasted on.
4. Keep Dash front-facing and locked off, as S5br proved. Do the EST→SCR push as a pipeline scale on the finished composite.
5. Defer the three-quarter warp, tracking for a moving phone, and Hebrew forced alignment. A1 has no angled shot, and loudness-driven sync suits a one-line mouth.

## QA checklist

Check contact sheets at 0.25s intervals. Any fail rejects the shot.

**Every wan shot**
- [ ] One continuous take: no cut, pan, zoom or dissolve.
- [ ] No letters, digits, logos or UI anywhere.
- [ ] Nothing appears or vanishes after the trimmed first 0.5s.
- [ ] Flat fills, no gradients, no painted scenery.

**Cab plate**
- [ ] Orange case, four bumpers, tape on the top-left bumper.
- [ ] Screen blank navy in every frame.
- [ ] Nothing else orange; coin jar fully in frame.
- [ ] Zero pixel shift of the screen box.

**Story clip**
- [ ] Click-person has the cursor head in every frame, never a round head or a face.
- [ ] Owner wears the cap.
- [ ] Taxi wheels never move.
- [ ] Off-white line on navy only, no orange.
- [ ] Action matches the keyframe's single verb.
- [ ] No Dash in frame.

**Composite**
- [ ] Face bounds identical on all non-blink frames.
- [ ] Mouth closed in every pause.
- [ ] Expression matches the line's tag.
- [ ] Nothing outside the screen changes.
- [ ] No pupils, brows or shine.
- [ ] Eitan's one-viewing read: "he's talking", not "pasted on".

## Production log (first entry)

Format for `docs/missions/dash-production-log.md`, one entry per production:

```
## <date> · <production> · <route>
Cost / time: <wan seconds, $, renders, attempts per kept shot, wall-clock>
Worked: <≤3 bullets, each with the evidence file>
Failed: <≤3 bullets, each with the evidence file>
Rule changes: <"From now on…" lines, each copied into the Recipe>
Next production tests: <one hypothesis>
```

```
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
```

## Open questions

1. **Does the composited face read as speaking?** Watch `S5a-vs-S5b-composite.mp4`; I could only judge stills. **Recommend:** accept the route and ask for the mouth about twice as large. If it still looks pasted on after that, add the outline wobble rather than going back to wan's lip-sync.
2. **Story doodles: wan motion or pose-swapped stills?** The spec says pose swaps. **Recommend:** wan, behind the $0.30 keyframe gate and the 3-attempt cap. The stills fallback costs nothing extra.
3. **What is the first production?** **Recommend:** A1 15s, 9:16 only, then the 30s. That is four beats and about two wan clips, so every rule is exercised once before the long cut. The product beat still needs the real `R-ADS-lead` recording (gate G5), and the other aspects need their own plates (16:9 needs a landscape Dash).
**Eitan, 2026-11-14:** watched `S5a-vs-S5b-composite.mp4`. The pipeline face syncs better, so the hybrid face route is confirmed. The voice-over picks are marked in the shortlist sheet, and nothing gets produced until Eitan reviews.
