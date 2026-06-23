---
name: Course Production
description: The master pipeline for rendering WAO video lessons. Handles formatting, TTS, slides, MP4 assembly, thumbnail generation, and publishing.
---

# WAO Course Production Pipeline

This skill defines the perfect A-Z pipeline for producing a WAO video lesson.
Every time an agent is tasked with building or rendering a lesson, they MUST follow this exact flow without deviation. This ensures zero friction, no lost features between runs, and a perfect output.

## 1. Lesson Format Standard
All lessons are written in Marp Markdown.
- **Narrations MUST be hidden in HTML comments** within the slide they belong to, never as standalone slides that display text.
  ```markdown
  # Slide Title
  - bullet 1
  
  <!-- 
  Narration text goes here.
  This text will be sent to Google TTS but will NOT appear on the visual slide.
  -->
  ---
  ```
- **Language Rules**: Follow Noa's standards (Singular Male, conversational Sabra Hebrew, short sentences <15 words, NO nikud, NO English words spelled in English letters — transliterate to Hebrew like "קו-אי-אל").

## 2. Text-to-Speech (TTS) Config
- **Engine Options**: Google Cloud TTS (Default) or ElevenLabs (Fallback)
- **Google Voice**: `he-IL-Chirp3-HD-Orus` (Primary, cost-effective)
- **ElevenLabs Voice**: `bfGb7JTLUnZebZRiFYyq` (`eleven_v3`)
- **Rule**: We are actively experimenting with Google TTS to save costs. Because Google TTS struggles with Hebrew pronunciation, you MUST use the **Slide-Level Feedback Gate**. Generate the slide, wait for Eitan's feedback. If pronunciation is wrong, Noa must apply phonetic patches to the Marp markdown based on Eitan's audio feedback before re-rendering.

## 3. The Render Engine
We use `python3 scripts/render_lesson.py --input <md_path> --lesson <N> --slug <slug> --tts elevenlabs`.
The script is strictly responsible for:
1. Extracting `<!-- -->` narration blocks.
2. Generating MP3s via ElevenLabs TTS.
3. Rendering PNG slides via Marp CLI.
4. Assembling the MP4 via `ffmpeg concat demuxer` (zero-copy, high speed).
5. Generating the branded 1280x720 Thumbnail (leaving colors, layout, and python-bidi RTL logic perfectly intact).

## 4. End-to-End Output & Publishing
A lesson is NOT considered finished until all of the following exist perfectly:
1. **The MP4 Video**: Flawless synced audio, zero narration text visible on the slides.
2. **The Thumbnail**: High-resolution, correct course name ("קורס בניה + קידום אתרים בעידן ה-AI").
3. **YouTube Upload**: The video and custom thumbnail are uploaded to the WAO YouTube channel. (Agent provides manual upload instructions if limited by API).
4. **Course Page Embed**: The YouTube URL is embedded in the Next.js `page.tsx` for the specific lesson, including all required metadata and structured data for SEO.

*Never break the chain. Do not skip the thumbnail. Do not leave the narration on the slide.*
