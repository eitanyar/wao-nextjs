# Mission: wan 3.0 character-consistency test for the Dash series (2026-11-14)

## Outcome
A yes/no on whether wan3.0-video (Qwen/Alibaba token plan, no extra spend) can carry a whole illustrated series with ONE main character that stays on-model shot after shot. If yes, it becomes the production route for the Dash track. If no, a fallback is chosen from the test evidence.

Known so far: one 5s Dash test on 2026-11-12 SUCCEEDED (`scratch/video-dash/test/`), good style, minor prop drift. It never tested consistency across shots, angles, expressions or lip-sync.

## Files
- Character + world spec: `docs/missions/video-dash-v2-design-2026-11-12.md` (Dash = orange rugged work phone on a van dash mount, face on screen, crack top-left, dust speckles, masking tape; five expressions; palette; policy rules).
- Scripts: Dash v2 scripts (`docs/copy/video-dash-v2-*`), A1 "The taxi" for the test.
- API: async `/api/v1/services/aigc/video-generation/video-synthesis`, model `wan3.0-video`, up to 10 reference images, `reference_audio` for lip/mouth sync, 2–30s, 9:16, output URL valid 24h (download at once).
- Output: `scratch/video-dash/wan-consistency/`.

## Steps
0. **Eitan confirms the main character:** Dash as specified, or a change. No generation before this.
1. **Character sheet (images):** wan2.7-image-pro or qwen-image-3.0-pro, from the spec: front, three-quarter L/R, back, on the mount (portrait + landscape), and the five faces (deadpan, tired, sarcastic, calm, excited). 2–3 candidates per view, pick one set → **Eitan approves the sheet.** These become the reference images.
2. **Consistency run:** 5 shots × 5s from A1, each a different demand:
   - S1 full face, deadpan, front (baseline)
   - S2 face strip + a story scene beside it (character small in frame)
   - S3 three-quarter angle, sarcastic, van interior
   - S4 different lighting (night / streetlight)
   - S5 mouth driven by a Nimrod `reference_audio` line (one continuous take)
   Same reference set, same seed policy, prompts only change the action.
3. **Score every shot** (frames at 0.5s intervals), pass/fail per item:
   - identity marks present and in place (crack top-left, tape, dust, four bumpers, orange shade)
   - face style matches the sheet (line weight, eyes, no nose/brows except sarcastic)
   - no limbs, no logos, no fake UI/text, no real phone model look
   - style matches S1 (flat fills, outline wobble, palette)
   - S5: mouth timing reads as speaking the line
   Scoring: Qwen vision per frame (as a second opinion) + Adam on contact sheets; **Eitan watches all 5 shots** before any verdict.
4. **Cost:** read console usage after the first shot; report credits per second before running the rest.

## Constraints
- Illustrated only. No realistic people, customers, reviews, Google screens or logos; nothing that passes as filmed reality (Google/YouTube policy, "less AI" founder rule).
- Token-plan terms: interactive use from the agent session only — no batch scripts, no unattended loops. One shot submitted at a time, by hand.
- No Hebrew text inside generated frames (captions are added by our pipeline).
- Eitan approves the sheet before step 2 and sees all shots before any series decision.

## Acceptance
- **Go:** ≥4 of 5 shots pass every identity/style item, and S5 mouth reads as speech.
- **Partial:** identity holds in full-face shots but drifts in scenes → hybrid: wan for scenes/backgrounds, Dash's face composited by our existing video pipeline (`scripts/video/build-video.mjs`).
- **No-go:** identity drifts in ≥2 shots → wan only for backgrounds/B-roll; Dash track stays on the pipeline's own 2D rig.

## Verifier
Roni: MP4 structure (duration, 9:16, frame count, audio track on S5), contact sheets exist for every shot, credits used logged. Listening/looking quality = Eitan.

## Decision 2026-11-14 (Fable 5.2, delegated by Eitan): KEEP WITH CHANGES

## 3. Spec for the test (replaces section 1 of the current sheet where they differ)

| Part | Spec |
|---|---|
| Body | Rugged phone, 2:1, thick `dashOrange` case, four chunky corner bumpers, flat fill plus one shade tone. |
| Identity marks (only two) | (a) Orange case with four bumpers. (b) One flat off-white tape patch across the top-left bumper, a plain rectangle. |
| Removed | Hairline crack, dust speckles, back tape, coiled cable. |
| Screen | Always flat navy `#0D1117`. Never white. |
| Face | Two off-white rounded bars for eyes and one line for the mouth. No pupils, highlights, brows or nose. |
| Expressions | `deadpan`: lids 50%, straight mouth. `tired`: lids 70%, mouth sags. `sarcastic`: one eye lidded plus a 4° tilt, no brow. `calm`: soft arcs, mint. `excited`: open bars and a D-smile, mint, no highlight dots. |
| World | Flat slate cab, pale flat sky and one rooftop line. Props: coin jar and spirit level only. |
| Outline | Thick uniform off-white, flat fills, no gradients. |
| Never | Limbs, white screen, pupils or shine, brows, painted or detailed scenery, logos, UI, text, real phone model, extra props. |

## 4. Changes to the wan test plan

- **Step 0 is closed:** the character is Dash as specified above. Eitan still approves the sheet.
- **Step 1:** build the sheet from this spec. Add one reference of the phone with a blank navy screen.
- **Step 2:** replace S4 (night lighting) with a second generation of S1 from a fresh task, since the series is always daytime and repeatability matters more. Run S5 twice: once with wan's mouth sync, once with a blank screen and the face composited by our pipeline.
- **Step 3:** score the two marks instead of crack, dust and tape. A white screen, pupils, brows or painted scenery fails the shot automatically. Add "props neither appear nor vanish".
- **Acceptance:** unchanged. If the composited-face S5 looks as good as wan's, choose the hybrid even on a Go, because the face then stays identical across the series.

The shot lists, scripts and palette in the current spec are unchanged, but its "Never" list, turnaround and style-frame prompts (SF-01 to SF-05, SF-15) need the same edits before anyone generates from them.
## Results 2026-11-14 (Adam; Eitan has not watched yet)

Sheet approved by Eitan: `scratch/video-dash/wan-consistency/sheet/refs/` (10 images; back view dropped, image model put a face on it). Shots: `scratch/video-dash/wan-consistency/shots/` (`ALL-SHOTS-grid.mp4` = all six, audio from S5a). 720P, 9:16, 5s, all 10 refs inline as base64 in every shot, prompt_extend off. About 3 min per render.

| Shot | Identity marks (case, 4 bumpers, tape) | Face style | Camera / continuity | Verdict |
|---|---|---|---|---|
| S1 deadpan front | pass every frame | pass | swings away ~2.8–3.5s, radio panel appears | FAIL (camera) |
| S2 face + story scene | pass | 1 frame of round dot eyes | locked, OK; doodle is a ghost overlay, no cursor head, no coin | FAIL (face, story) |
| S3 three-quarter sarcastic | pass | cycles deadpan → sarcastic → calm (mint) | cuts between front and three-quarter | FAIL (cuts, expression) |
| S4 = S1 fresh task | pass | cycles sarcastic/tired unasked | same swing-away at ~3s, digits "10" on a panel | FAIL (repeatable defect, text) |
| S5a wan lip sync | pass | mouth syncs first phrase only, then cycles faces | dissolves to a new cab at ~3.75s | FAIL (partial sync) |
| S5b blank screen | pass | screen grows calm then deadpan face | size jumps | FAIL |

Qwen vision second opinion (S1 only) agreed: 9/10 frames pass, the failing frame is the swing-away.
Spirit level stays orange in every shot, inherited from ref 09.

**Reading:** identity is strong, 6/6 shots on-model whenever Dash is on screen. Shot control is the failure: with 10 refs, wan seems to treat the sheet as a storyboard and cycles through views and expressions, adding cuts and pans that the prompt forbids. By the acceptance rule this is No-go (0/5), but the cause looks like the reference set, not identity drift.
**Proposed follow-up (not run):** S1 and S5b again, each with ONE reference image (01 and 02 respectively). That's 2 shots, to test the storyboard hypothesis before the final verdict.
Credits: the console shows tokens only. The plan was at 10% of $68 before the 6 shots; the delta after = cost of 30s of wan video.

## Single-reference rerun 2026-11-14 (Eitan approved)

| Shot | Refs | Result |
|---|---|---|
| S1r (S1 prompt, setting described in text) | 01 only | PASS: one continuous take, no pan or cuts, deadpan held, one blink, case, bumpers and tape on-model every frame, no props appear or vanish. Minor: two faint diagonal streaks in the sky. |
| S5br (blank screen) | 02 only | PASS: screen stays blank navy all 5s, static, identity marks held. Usable as the base plate for a composited face. |

**Hypothesis confirmed:** the 10-image set made wan cycle through the sheet like a storyboard. With one reference per shot, shot control works.
**Cost:** ≈ $0.06/s at most (five 5s shots moved the plan 10.6% → 12.8%).
**Proposed verdict (Eitan to confirm after watching `BEFORE-AFTER-single-ref.mp4`):** hybrid, per Fable's rule. wan renders scenes with Dash on a blank screen from 1–2 refs per shot, and the face plus lip-sync are composited by `scripts/video/build-video.mjs`, so the face stays identical across the series. wan's own lip sync (S5a) held for only the first phrase.
**Open before the verdict is final:** (1) the S5b composited version, i.e. the pipeline face plus the Nimrod clip on S5br, for comparison with S5a; (2) one story-scene shot (S2) with a single ref, since S2 was the weakest on story content.
