# Mission Pipeline — Google Ads Strategic Course Engine

**Owner of the run:** Adam (orchestrator) · **Status:** ready to run
**Objective:** transform the existing 18-lesson wao.co.il Google Ads curriculum into an *evergreen*
Hebrew video + text course focused on **strategy & algorithmic logic** (Smart Bidding learning
phases, Quality Score, Audience Signals), with the **fluid UI abstracted to dynamic external
resource lists**. Zero-cost / free-tier pipeline. Embeds into `/training/google-ads-course`.

## Reading the brief → the team
The user's "B2C Strategist" = **ppc-strategist (Dror)**; "Audio Copywriter" = **instructional-
designer (Gil)**; "Live Curator" = a web-research *function* run by **Dror/Yonatan**; the whole
tech pipeline = **nextjs-engineer (Eitan-Dev)**; orchestrator = **Adam**.

## Stage 0 — Hebrew-TTS spike  ✅ RESOLVED 2026-06-13
**Decision:** We are using **ElevenLabs** as our premium TTS provider, using the `eleven_multilingual_v3` model (which handles unvoweled Hebrew and English terms perfectly). Free/OSS Hebrew voice-clone does not exist at usable quality (XTTS/F5/Bark lack Hebrew; Robo-Shaul is research-grade and needs nikud). The narration step will use the ElevenLabs paid API, while the rest of the pipeline stays free (Marp/MoviePy/embed).

### (original gate)  owner: Eitan-Dev
Clone a short anchor; synthesize **one Hebrew paragraph** with the candidate engine; judge quality.
- Open-source Hebrew voice-clone is the highest-risk link (F5-TTS/Tortoise = EN-centric; XTTS lacks
  Hebrew; Bark inconsistent).
- **GATE:** if Hebrew quality fails → **STOP the pipeline** and escalate the fork to the user:
  human VO / paid Hebrew TTS / text+slides-first. Do **not** build the full pipeline on a bad TTS.

## Stage 1 — Curriculum architecture  ·  owner: Gil (input: Dror)
Map the 18 lessons → course → modules → lessons, novice→advanced, one objective each. Decide which
lessons survive as strategy and which collapse (Pareto 80/20). Output: a course map.

## Per-lesson loop (Stages 2–6)

**2. Strategic brief**  ·  Dror — distill the lesson to its strategic 80/20, strip the UI, surface
the enduring algorithmic logic. **Web-verify** current Google Ads mechanics; date + source. →

**3. Script**  ·  Gil — turn the brief into a bite-size **spoken-word Hebrew** script as **Marp**
slide markdown (hook → teach → example → recap; paced for the ear; UI pushed to the resource list). →

**4. Proof**  ·  Noa — language/typography/RTL correctness on the script. ⛔ nothing proceeds unproofed. →

**5. Render**  ·  Eitan-Dev — TTS (per Stage 0) → Marp CLI (slides) → MoviePy (stitch audio+slides
→ MP4). Modular, re-runnable, idempotent (free spaces are flaky). →

**6. Deployment checklist (Live Curator)**  ·  Dror/Yonatan — web-fetch the *current* official
Google Ads docs + strong practical walkthroughs for this lesson's topic → clean JSON/Markdown
resource list (this is the abstracted "UI" layer).

## Stage 7 — Embed  ·  owner: Eitan-Dev
Assemble MP4 + script text + resource list into `/training/google-ads-course` infra.

## Stage 8 — RTL/a11y  ·  owner: Maya
Hebrew slides + course page render correctly RTL; accessible; mobile clean.

## Stage 9 — Verify  ⛔ GATE  ·  owner: Roni
The **MP4 actually plays with synced audio**, **embeds and plays** in the live page, page returns
200. PASS/FAIL/BLOCKED with captured evidence. No partial pass.

## Global gates Adam enforces
- Stage 0 before any full build.
- Every script proofed (Noa) and every output verified (Roni) before "done."
- Every Google Ads fact web-verified + dated (Dror) — evergreen depends on it.
- UI never hard-coded into a lesson; always pushed to the Stage-6 resource list.
