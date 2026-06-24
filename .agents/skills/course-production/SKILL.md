---
name: Course Production
description: The master pipeline for producing WAO video lessons — from strategic brief to website embed. Covers content philosophy, script structure, narration craft, Noa QA, ElevenLabs TTS, Marp slides, MP4 assembly, thumbnail, YouTube, and Next.js embed.
---

# WAO Course Production Pipeline

This skill defines the complete A-Z pipeline for producing a WAO video lesson.
Every agent working on any part of lesson production MUST read and follow this skill in full.
**Never skip a gate. Never shortcut a step.**

---

## PIPELINE OVERVIEW

```
Brief (Yonatan/Dror) → Gil (script) → Noa (QA)
→ TTS (ElevenLabs Adam) → Marp (slides PNG) → ffmpeg (MP4)
→ Thumbnail (AI-gen → resize 16:9) → YouTube upload → Next.js embed
```

The render script (`scripts/render_lesson.py`) automates: TTS → PNG slides → MP4 → Thumbnail.
TTS is **idempotent per slide** — existing MP3s are reused if narration is unchanged.
Slide-only fixes (layout, color, bullet trim): always pass `--skip-tts`.

---

## GATE 0 — CONTENT PHILOSOPHY (BEFORE ANY SCRIPT IS WRITTEN)

This is the most important gate. A technically perfect video with boring content fails.
The target audience is the average Israeli small business owner — not a marketer, not a tech person.

### The Audience
- A plumber, bakery owner, electrician, or local service business
- They are time-poor, skeptical, and have been burned by "experts" before
- They understand money, clients, and results — not jargon
- They respond to: stories, concrete numbers (₪70, 3 minutes), and clear next steps

### The Lesson Structure (Gil follows this every time)

Every lesson MUST follow this arc:

```
1. HOOK (slide 1, title slide)
   → Open with a story OR a provocative question OR a surprising fact
   → Must create immediate relevance: "this happened to a client of mine"
   → Never start with "Welcome to lesson N..."

2. PROBLEM / MISCONCEPTION (slide 2)
   → Name the #1 wrong belief the audience holds
   → Make them feel seen: "רוב בעלי העסקים מניחים ש..."

3. CONCEPT (slides 3-4)
   → One clear idea per slide
   → Always use a concrete Israeli B2C analogy
   → Good analogies: street address, renting vs owning, phone number

4. COMMON MISTAKES (slide 4 or 5)
   → 3 mistakes max — not more
   → Each mistake: name it + example + why it costs them

5. TOOL / ACTION (slide 5 or 6 — the AI prompt or practical step)
   → Give them something THEY CAN DO RIGHT NOW
   → Specific: which site to open, what to type, what to look for

6. PAUSE SLIDE (⏸️ — always present)
   → "עצור את הסרטון עכשיו"
   → One concrete deliverable: "3 שמות. ברשימה כתובה."
   → This is the engagement moment — it converts passive viewers to active learners

7. SUMMARY (last slide)
   → 3-4 bullet recap — short, crisp
   → Tease the next lesson
   → End with a call-to-action that connects to the pause slide
```

### Narration Writing Rules (Gil + Noa)

The narration is the VOICE — the slides are just the skeleton.
Narration adds: story, warmth, context, and urgency that bullets cannot convey.

**What belongs in narration (NOT on slides):**
- The full story opening ("לפני שנה, לקוח שלי איבד את כל האתר שלו. לא פרצו. לא וירוס.")
- Emotional stakes ("שנתיים של עבודה. ירדו לטמיון.")
- Concrete context and analogies ("תחשוב על הדומיין כמו כתובת הרחוב שלך")
- Reassurance and direct address ("אתה לא צריך להיות מומחה. שלוש דקות. הצעד הראשון.")

**What belongs on slides (NOT in narration):**
- The key point in one line (bold, in Hebrew)
- Max 4 supporting bullets — short fragments, not full sentences
- Examples in code format: `cohen-electric.co.il`
- Callouts for action: > ⚠️ or > 💡

### Concrete Example Anchors
Always use Israeli B2C examples — NEVER abstract examples:
- ✅ `cohen-electric.co.il`, `tavori-plumber.co.il`, `waze-nav` (too close to trademark)
- ✅ אינסטלטור, מאפייה, חשמלאי, רופא שיניים
- ❌ "company X", "user A", "the business"

### Lesson Length Target
- Runtime: 4–5 minutes
- Narration word count: ~500–600 words total
- Slides: 7 content slides (title + 5 content + pause + summary)

---

## GATE 1 — SCRIPT STANDARD

### File Location
`docs/scripts/website-course/LX-Y-slug.md`

### Marp Frontmatter (MUST be absolute first bytes — no blank line before first `---`)
```yaml
---
marp: true
theme: wao-rtl
lesson: N
title: "כותרת השיעור"
lang: he
dir: rtl
status: draft-for-proof
author: Gil (instructional-designer)
runtime-target: "4–5 דקות"
pipeline: "Noa (proof) → Eitan-Dev (render)"
---
```

### Slide Format
```markdown
## כותרת שקופית
### תת-כותרת (אופציונלי)

- נקודה ראשונה
- נקודה שנייה

<!--
הנה הקריינות שלא תופיע על השקופית.
שני משפטים קצרים. ברורים. לא יותר.
-->

---
```

### Hard Rules
- **Max 4 bullets per slide** — YouTube controls cover bottom ~15%, last bullet gets hidden
- **Max 15 words per narration sentence**
- **No em-dashes in narration** (`—` or `-`) — replace with `.` or `,`
- **Imperatives in future form**: `תפתח`, `תרשום`, `תיכנס` — NOT `פתח`, `רשום`, `כנס`
- **WAO branding line**: use `####` (h4) not `###` (h3) — renders in brand teal, not gold

---

## GATE 2 — NOA QA (noa-voice-director — Claude 3.5 Sonnet)

**MANDATORY before any TTS render. Noa touches ONLY narration blocks.**

### What Noa Checks
1. Sabra tone, singular male (`אתה`, `שלך`) — never plural
2. Replace robotic openers: "שלום וברוכים הבאים" → dynamic hook
3. Sentence length ≤ 15 words; split longer sentences with `.`
4. No em-dashes → replace with `.` or `,`
5. Future-form imperatives throughout
6. ו"ו החיבור בשורוק before שווא or בומ"פ: `וּמנסה`, `וּבנוסף`
7. Commas only at natural clause boundaries — never inside a syntactic unit
8. **Homograph scan** — ElevenLabs reads each word in ISOLATION, no sentence context:
   - Ambiguous words: `שם` (name/there), `ספק` (doubt/supplier), `לקוח` (client/taken)
   - `ל + noun` combos: `לאתר`, `לחלק`, `לספר` — almost always ambiguous
   - Fix: add selective nikud OR replace with unambiguous synonym
9. URLs in narration → phonetic Hebrew: `.co.il` → `קו-אי-אל`, `.com` → `קום`, `.net` → `נט`
10. Update `status` to `noa-approved-elevenlabs`

### Critical: QA is Engine-Specific
- ElevenLabs Adam: requires nikud for disambiguation
- Google Chirp3-HD: requires STRIPPED nikud and restructured syntax
- A file approved for one engine CANNOT be used for the other without full re-QA

---

## GATE 3 — TTS (ElevenLabs Adam)

```
Voice ID:   bfGb7JTLUnZebZRiFYyq
Model:      eleven_v3
Stability:  0.5
Similarity: 0.75
API:        Direct HTTP POST only — NEVER use ElevenLabs SDK (v2.53.0 corrupts audio)
```

### Cost Rules
- Spike test: 1–2 sentences only before full render
- Idempotency: existing `slide-N.mp3` files are reused if narration text unchanged
- Visual-only changes: always `--skip-tts`

```bash
# Full render (TTS + slides + MP4 + thumbnail)
python3 scripts/render_lesson.py --input docs/scripts/website-course/LX-Y.md --lesson N --slug website-lesson-N --tts elevenlabs

# Skip TTS (reuse existing audio, re-render slides + MP4)
python3 scripts/render_lesson.py --input docs/scripts/website-course/LX-Y.md --lesson N --slug website-lesson-N --skip-tts
```

---

## GATE 4 — SLIDE RENDERING (Marp CLI)

### Theme
`docs/scripts/website-course/wao-rtl.css`

### Color System
| Element | Hex | Role |
|---------|-----|------|
| Background | `#0b0f19` | All slides — dark navy |
| h1 `#` | `#4ae3b5` | Slide main title |
| h2 `##` | `#4ae3b5` | Slide section heading |
| h3 `###` | `#ffd000` | Subtitle / accent label ("לא בטוח") |
| h4 `####` | `#4ae3b5` | WAO branding on title slides ONLY |
| Body/bullets | `#eee9e2` | Warm white |
| Code blocks | `#131620` | Domains / inline code |

### Slide PNG Mapping (7-slide lesson)
- `slide.001–slide.007` → narrations 0–6 (content slides)
- `slide.008` → blank trailing slide — excluded from MP4 automatically

### Chrome / Puppeteer
Required for PNG rendering. Auto-detected path:
`/home/eitanya/.cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome`
If path changes, update `run_marp()` in `scripts/render_lesson.py`.

---

## GATE 5 — MP4 ASSEMBLY (ffmpeg)

- ffmpeg concat demuxer ONLY — MoviePy takes 14+ hours, never use it
- Output: `output/lesson-N/website-lesson-N.mp4`
- Handled automatically by `render_lesson.py`

---

## GATE 6 — THUMBNAIL

### Spec (ALL website course lessons)
| Element | Value |
|---------|-------|
| Final size | **1280×720px JPEG (16:9)** |
| Background | `#0b0f19` + subtle grid texture |
| Left — headline | Large bold **white** Hebrew hook question |
| Divider | Thin teal `#4ae3b5` horizontal line |
| Below divider | Teal `שיעור N | מודול N` |
| Right — icon | Neon teal glowing icon (lesson-specific) |
| Bottom-left | Gold pill badge: `"קורס בניה + קידום אתרים עם AI"` |
| Bottom-right | `WAO` in **teal `#4ae3b5`** — NEVER white |

### Icon Per Lesson
| Lesson | Icon |
|--------|------|
| L1-1 Domain ownership | Neon padlock |
| L1-2 Domain naming | Magnifier over name tag |
| Add new lessons here | Choose relevant neon icon |

### ⚠️ MANDATORY: Resize to 16:9

The AI image generator ALWAYS outputs 1024×1024 (square).
It MUST be resized to 1280×720 before committing or uploading to YouTube.

```python
from PIL import Image

src = "/path/to/generated-thumbnail.png"
dst = "/home/eitanya/wao/public/media/thumbnails/website-lesson-N.jpg"

img = Image.open(src).convert("RGB")
TARGET_W, TARGET_H = 1280, 720
BG = (11, 15, 25)  # #0b0f19

scale = TARGET_H / img.height
resized = img.resize((int(img.width * scale), TARGET_H), Image.LANCZOS)
canvas = Image.new("RGB", (TARGET_W, TARGET_H), BG)
canvas.paste(resized, ((TARGET_W - resized.width) // 2, 0))
canvas.save(dst, "JPEG", quality=92)
print(Image.open(dst).size)  # Must print: (1280, 720)
```

Commit to `public/media/thumbnails/website-lesson-N.jpg`.

---

## GATE 7 — YOUTUBE UPLOAD (Manual)

- Upload `output/lesson-N/website-lesson-N.mp4`
- Upload custom thumbnail `public/media/thumbnails/website-lesson-N.jpg`
- **Limit: max 10 custom thumbnail uploads per 24 hours (Google policy)**
- After upload: record the YouTube video ID (11-char string)

---

## GATE 8 — WEBSITE EMBED (Next.js)

`LessonDashboard` component (`src/components/LessonDashboard.tsx`) renders three tabs:
- **prereqs**: course progress (previous / current / next lesson)
- **task**: the active student assignment from the pause slide
- **guides**: links to additional resources

Set in lesson data / `video-map.json`:
- `videoIds`: YouTube ID array
- `localVideoUrl`: local MP4 path (fallback)
- `activeTask`: text of the pause slide assignment
- Thumbnail served from: `/media/thumbnails/website-lesson-N.jpg`

Use the Google Ads course lesson page as the structural template.

---

## STATUS WORKFLOW

```
draft                   → Gil writes script
draft-for-proof         → Noa QA requested
noa-approved-elevenlabs → Ready for TTS render
rendered                → MP4 + thumbnail done, awaiting YouTube upload
published               → YouTube uploaded + website embedded
```

---

## AUTOMATION ROADMAP

| Priority | Step | Current | Target |
|----------|------|---------|--------|
| 🔴 High | Thumbnail 16:9 resize | Manual Python | Add as Step E.5 in render_lesson.py |
| 🟡 Med | YouTube upload | Manual | YouTube Data API v3 (10/day limit → graceful fallback) |
| 🟡 Med | Website embed | Manual file edit | Script patches video-map.json with YouTube ID |
| 🟢 Low | ASR verification | Not done | Whisper ASR vs. input narration text |
| 🟢 Low | Pre-render lint | Manual review | Auto-flag slides with >4 bullets before Marp render |

**Priority 1** (thumbnail resize) is 5 lines of Pillow code in `render_lesson.py`.
It should be the next code change to the render script.
