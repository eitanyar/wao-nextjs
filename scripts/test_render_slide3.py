#!/usr/bin/env python3
"""
test_render_slide3.py -- TTS Spike: Slide 3 of L1-1-domain
===========================================================
Renders ONLY the narration from Slide 3 of L1-1-domain.md to a test MP3.
Run this FIRST to validate ElevenLabs Hebrew TTS quality before full production.

Uses direct HTTP requests (same pattern as compile_lesson_video.py). No SDK.

Usage (from repo root):
    python3 scripts/test_render_slide3.py

Output: output/test/slide3_test.mp3
"""

import os
import sys
import requests
from pathlib import Path


# ---------------------------------------------------------------------------
# Load .env.local (Next.js convention)
# ---------------------------------------------------------------------------
def load_env_local():
    repo_root = Path(__file__).parent.parent.resolve()
    env_file = repo_root / ".env.local"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    val = v.strip().strip('"')
                    if k.strip() not in os.environ:
                        os.environ[k.strip()] = val
        print(f"  Loaded: {env_file}")
    else:
        print(f"  .env.local not found at {env_file} (checking system env)")


load_env_local()

# ---------------------------------------------------------------------------
# Slide 3 narration (verbatim from L1-1-domain.md -- "מה זה דומיין, בעצם?")
# ---------------------------------------------------------------------------
SLIDE3_NARRATION = (
    "תחשוב על הדומיין כמו כתובת הרחוב של העסק שלך.\n"
    "אם העסק נמצא ברחוב הרצל 12, אף אחד אחר לא יגור שם.\n"
    "הדומיין עובד אותו דבר בדיוק.\n"
    "tavori-plumbing.co.il שייך רק למי שרשם אותו.\n"
    "כל מי שמקליד את הכתובת הזאת, מגיע אליך.\n"
    "ועוד דבר חשוב: הדומיין הוא לא האתר.\n"
    "הוא הכתובת שמוביל אל האתר.\n"
    "תכף נסביר את ההבדל הזה."
)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
VOICE_ID = "bfGb7JTLUnZebZRiFYyq"  # Suburb
MODEL_ID = "eleven_v3"              # as used by compile_lesson_video.py

REPO_ROOT = Path(__file__).parent.parent.resolve()
OUT_PATH = REPO_ROOT / "output" / "test" / "slide3_test.mp3"


def tts_request(api_key: str, text: str, voice_id: str, model_id: str, out_path: Path) -> int:
    """
    Direct HTTP POST to ElevenLabs TTS API using requests.
    Mirrors the exact pattern from compile_lesson_video.py.
    Returns bytes written, or 0 on failure.
    """
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key,
    }
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
        },
    }

    r = requests.post(url, json=payload, headers=headers)
    if r.status_code == 200:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "wb") as f:
            f.write(r.content)
        return len(r.content)
    else:
        print(f"  HTTP {r.status_code}: {r.text}", file=sys.stderr)
        return 0


def main():
    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        print("\nERROR: ELEVENLABS_API_KEY not set.", file=sys.stderr)
        sys.exit(1)
    print(f"  API key present: {api_key[:8]}...")

    print(f"\n{'=' * 50}")
    print("TTS Spike: Slide 3 of L1-1-domain")
    print(f"{'=' * 50}")
    print(f"Voice:  Suburb ({VOICE_ID})")
    print(f"Model:  {MODEL_ID}")
    print(f"Output: {OUT_PATH}\n")
    print("Narration text (Slide 3 -- 'מה זה דומיין, בעצם?'):")
    print("-" * 45)
    print(SLIDE3_NARRATION)
    print("-" * 45)

    print("\nCalling ElevenLabs TTS API (direct HTTP, no SDK)...")
    nbytes = tts_request(api_key, SLIDE3_NARRATION, VOICE_ID, MODEL_ID, OUT_PATH)

    if nbytes == 0:
        print("\nFAILED — see errors above.", file=sys.stderr)
        sys.exit(1)

    print(f"\nSUCCESS")
    print(f"  Saved: {OUT_PATH}")
    print(f"  Size:  {nbytes / 1024:.1f} KB")
    print(f"\nPlay to verify Hebrew TTS quality before running full pipeline:")
    print(f"  mpg123 {OUT_PATH}")
    win_path = str(OUT_PATH).replace("/home/eitanya", "//wsl$/Ubuntu/home/eitanya")
    print(f"  Windows: {win_path}")
    print(f"\nIf quality is good, run the full pipeline:")
    print(f"  python3 scripts/render_lesson.py \\")
    print(f"    --input docs/scripts/website-course/L1-1-domain.md \\")
    print(f"    --lesson 1 \\")
    print(f"    --slug L1-1-domain")


if __name__ == "__main__":
    main()
