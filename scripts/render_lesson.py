#!/usr/bin/env python3
"""
render_lesson.py -- WAO Course Video Production Pipeline
========================================================
Pipeline: TTS (ElevenLabs or Google Chirp3-HD) -> Marp (PNG slides) -> ffmpeg (MP4) -> Pillow (Thumbnail)

Usage (from repo root):
    python3 scripts/render_lesson.py \\
        --input docs/scripts/website-course/L1-1-domain.md \\
        --lesson 1 \\
        --slug L1-1-domain

    # Use Google Chirp3-HD instead of ElevenLabs:
    python3 scripts/render_lesson.py \\
        --input docs/scripts/website-course/L1-1-domain-google.md \\
        --lesson 1 \\
        --slug L1-1-domain \\
        --tts google

The script is idempotent: it skips TTS calls for slides whose .mp3 already exists.
Set ELEVENLABS_API_KEY in .env.local or environment before running.

NOTE: YouTube custom thumbnail uploads are restricted by Google to max 10 per 24h.
      This script only generates the local thumbnail file; manual upload is required.
"""

import argparse
import glob
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


# ---------------------------------------------------------------------------
# 0. Load .env.local (Next.js convention) if key not already in env
# ---------------------------------------------------------------------------
def load_env_local(root: Path):
    env_file = root / ".env.local"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, _, v = line.partition("=")
                    if k.strip() not in os.environ:
                        os.environ[k.strip()] = v.strip()
        print(f"  Loaded .env.local from {env_file}")


# ---------------------------------------------------------------------------
# 1. Parse narration blocks from lesson .md
# ---------------------------------------------------------------------------
MIC_EMOJI = "\U0001f399\ufe0f"  # microphone emoji used as narration marker


def extract_narrations(md_path: Path) -> list:
    """
    Returns a list of dicts: {"slide": int, "text": str}

    Supports two narration formats:
      1. Legacy (Google Ads course):
            🎙️ Narration:
            <text lines>
            ---
      2. Marp presenter notes (Website course):
            <!-- narration text here -->
         The first HTML comment per slide block is used as narration.
         The DEPLOYMENT CHECKLIST comment (contains ===) is ignored.
    """
    text = md_path.read_text(encoding="utf-8")
    narrations = []
    slide_index = 0

    # Split on slide separators (lines that are exactly ---)
    # raw_slides[0] = HTML comment block (LEARNING OBJECTIVE) or front-matter start
    # raw_slides[1] = YAML front-matter (marp: true ...)
    # raw_slides[2+] = slide content + narration pairs
    raw_slides = re.split(r"^---\s*$", text, flags=re.MULTILINE)
    content_blocks = raw_slides[2:]  # skip comment + front-matter

    for block in content_blocks:
        narration_text = None

        # --- Format 1: Legacy 🎙️ Narration: marker ---
        mic_match = re.search(
            MIC_EMOJI + r"\s*Narration:\s*\n(.*?)(?=\Z)",
            block,
            flags=re.DOTALL,
        )
        if mic_match:
            narration_text = mic_match.group(1).strip()

        # --- Format 2: Marp presenter notes (HTML comment) ---
        if not narration_text:
            # Find all <!-- ... --> blocks in this slide
            comments = re.findall(r"<!--(.*?)-->", block, flags=re.DOTALL)
            for cand in reversed(comments):
                cand_str = cand.strip()
                if cand_str and "SLIDE " not in cand_str and "OBJECTIVE" not in cand_str and "CHECKLIST" not in cand_str:
                    narration_text = cand_str
                    break

        # Is this block purely a narration slide? (Old format standalone slide)
        visible = re.sub(r"<!--.*?-->", "", block, flags=re.DOTALL).strip()
        is_standalone_narration = "🎙️ Narration:" in block and len(visible.replace("🎙️ Narration:", "").strip()) < 5

        if is_standalone_narration:
            if narration_text and slide_index > 0:
                # Attach to the last valid slide
                existing = [n for n in narrations if n["slide"] == slide_index]
                if not existing:
                    narrations.append({"slide": slide_index, "text": narration_text})
        else:
            slide_index += 1
            if narration_text:
                narrations.append({"slide": slide_index, "text": narration_text})

    return narrations


# ---------------------------------------------------------------------------
# 2. Google Cloud TTS — Direct HTTP
# ---------------------------------------------------------------------------
GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}"

# Voice and model fixed per production spec
PROD_LANGUAGE_CODE = "he-IL"
PROD_VOICE_NAME = "he-IL-Chirp3-HD-Orus" # Journey model (Chirp-based)


def get_api_key() -> str:
    api_key = os.environ.get("GOOGLE_TTS_KEY", "")
    if not api_key:
        print("ERROR: GOOGLE_TTS_KEY not set. Load .env.local or export the key.", file=sys.stderr)
        sys.exit(1)
    return api_key


def generate_audio_http(api_key: str, text: str, out_path: Path):
    """Generate MP3 via direct HTTP POST to Google TTS."""
    url = GOOGLE_TTS_URL.format(api_key=api_key)
    payload = json.dumps({
        "input": {"text": text},
        "voice": {
            "languageCode": PROD_LANGUAGE_CODE,
            "name": PROD_VOICE_NAME
        },
        "audioConfig": {
            "audioEncoding": "MP3"
        }
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json; charset=utf-8",
        },
        method="POST",
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            import base64
            audio_content = base64.b64decode(data["audioContent"])
            with open(out_path, "wb") as f:
                f.write(audio_content)
            return True
    except urllib.error.HTTPError as e:
        print(f"    Google TTS HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        try:
            print(f"    Details: {e.read().decode('utf-8')}", file=sys.stderr)
        except Exception:
            pass
        return False
    except Exception as e:
        print(f"    Google TTS Error: {e}", file=sys.stderr)
        return False

SUBURB_VOICE_ID = "bfGb7JTLUnZebZRiFYyq"
TTS_MODEL_ID = "eleven_v3"

def synthesize_audio(api_key: str, text: str, voice_id: str, model_id: str, out_path: Path) -> bool:
    import urllib.request, json
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    payload = json.dumps({
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with open(out_path, "wb") as f:
                f.write(resp.read())
            return True
    except Exception as e:
        print(f"ElevenLabs TTS Error: {e}", file=sys.stderr)
        return False

def run_tts(narrations: list, audio_dir: Path, repo_root: Path, tts_engine: str = "elevenlabs"):
    """Step B -- TTS for all narration blocks. Idempotent (skips existing files)."""
    if tts_engine == "google":
        print("\n[Step B] Google Cloud TTS (Chirp3-HD)")
        key = get_api_key()
        if not key:
            print("ERROR: GOOGLE_TTS_KEY not set in .env.local.", file=sys.stderr)
            sys.exit(1)
        print(f"  Voice: {PROD_VOICE_NAME}")
        for item in narrations:
            slide_n = item["slide"]
            mp3_path = audio_dir / f"slide-{slide_n}.mp3"
            if mp3_path.exists():
                print(f"  Slide {slide_n}: already exists, skipping.")
                continue
            char_count = len(item["text"])
            print(f"  Slide {slide_n}: generating TTS ({char_count} chars)...")
            success = generate_audio_http(key, item["text"], mp3_path)
            if not success:
                print(f"  ERROR: Failed slide {slide_n}. Aborting.", file=sys.stderr)
                sys.exit(1)
            print(f"    Saved: {mp3_path} ({mp3_path.stat().st_size // 1024} KB)")
            append_silence(mp3_path, silence_ms=500)
            time.sleep(0.2)
    else:
        print("\n[Step B] ElevenLabs TTS (direct HTTP, no SDK)")
        api_key = os.environ.get("ELEVENLABS_API_KEY", "")
        if not api_key:
            print("ERROR: ELEVENLABS_API_KEY not set. Load .env.local or export the key.", file=sys.stderr)
            sys.exit(1)
        print(f"  Voice: Suburb ({SUBURB_VOICE_ID})")
        print(f"  Model: {TTS_MODEL_ID}")
        for item in narrations:
            slide_n = item["slide"]
            mp3_path = audio_dir / f"slide-{slide_n}.mp3"
            if mp3_path.exists():
                print(f"  Slide {slide_n}: already exists, skipping.")
                continue
            char_count = len(item["text"])
            print(f"  Slide {slide_n}: generating TTS ({char_count} chars)...")
            success = synthesize_audio(api_key, item["text"], SUBURB_VOICE_ID, TTS_MODEL_ID, mp3_path)
            if not success:
                print(f"  ERROR: Failed to synthesize slide {slide_n}. Aborting.", file=sys.stderr)
                sys.exit(1)
            print(f"    Saved: {mp3_path} ({mp3_path.stat().st_size // 1024} KB)")
            print(f"  Slide {slide_n}: appending 0.5s silence...")
            append_silence(mp3_path, silence_ms=500)
            time.sleep(0.3)
    print("[Step B] TTS complete.")



def append_silence(mp3_path: Path, silence_ms: int = 500):
    """Append silence to an existing MP3 using ffmpeg."""
    tmp = mp3_path.with_suffix(".tmp.mp3")
    silence_filter = f"aevalsrc=0:s=44100:d={silence_ms / 1000}"
    cmd = [
        "ffmpeg", "-y",
        "-i", str(mp3_path),
        "-f", "lavfi", "-i", silence_filter,
        "-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1",
        "-c:a", "libmp3lame", "-q:a", "2",
        str(tmp),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        tmp.rename(mp3_path)
    else:
        print(f"WARNING: Could not append silence to {mp3_path}: {result.stderr[-300:]}")
        if tmp.exists():
            tmp.unlink()


# ---------------------------------------------------------------------------
# 3. Marp render (PNG slides)
# ---------------------------------------------------------------------------
def _build_node_env():
    """Build a PATH-enriched environment for running Node/marp subprocesses.

    In non-interactive WSL bash (wsl -e bash -c ...), PATH is EMPTY.
    We must inject all required paths explicitly.
    """
    import glob as _g, os as _o
    env = _o.environ.copy()

    # Start with essential system paths (they are absent in non-interactive WSL)
    system_paths = ['/usr/local/sbin', '/usr/local/bin', '/usr/sbin',
                    '/usr/bin', '/sbin', '/bin', '/usr/games', '/usr/local/games']
    extra = [p for p in system_paths if _o.path.isdir(p)]

    # Add NVM-managed node bin dirs (latest version first)
    nb = _o.path.expanduser('~/.nvm/versions/node')
    if _o.path.isdir(nb):
        extra += sorted(_g.glob(_o.path.join(nb, 'v*', 'bin')), reverse=True)

    # Other common npm global locations
    for p in [_o.path.expanduser('~/.npm-global/bin'), _o.path.expanduser('~/.local/bin')]:
        if _o.path.isdir(p):
            extra.append(p)

    # Merge with whatever is already in PATH (don't lose anything)
    existing = [p for p in env.get('PATH', '').split(':') if p and p not in extra]
    env['PATH'] = ':'.join(extra + existing)
    return env


def run_marp(md_path: Path, slides_dir: Path) -> list:
    """Step C -- Render each slide as PNG via marp-cli."""
    print("\n[Step C] Marp slide render -> PNG")
    slides_dir.mkdir(parents=True, exist_ok=True)

    node_env = _build_node_env()
    node_env["MARP_NO_STDIN"] = "1"

    # Find the Puppeteer-managed Chrome binary for --browser-path
    _chrome_path = None
    for _pattern in [
        os.path.expanduser("~/.cache/puppeteer/chrome/*/chrome-linux*/chrome"),
        os.path.expanduser("~/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-linux*/chrome-headless-shell"),
        "/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium",
    ]:
        _found = sorted(glob.glob(_pattern))
        if _found and os.path.isfile(_found[-1]):
            _chrome_path = _found[-1]
            break
    if _chrome_path:
        print(f"  Browser: {_chrome_path}")
    else:
        print("WARNING: No Chrome/Chromium found. Marp may fail.", file=sys.stderr)

    # Build candidate list: prefer explicit node + marp path (avoids shebang /usr/bin/env node issue in WSL)
    candidates = []
    # 1. Explicit node binary + marp script (most reliable in non-interactive WSL)
    nvm_base = os.path.expanduser("~/.nvm/versions/node")
    if os.path.isdir(nvm_base):
        for node_bin in sorted(glob.glob(os.path.join(nvm_base, "v*", "bin", "node")), reverse=True):
            marp_script = os.path.join(os.path.dirname(node_bin), "marp")
            if os.path.isfile(marp_script):
                candidates.append([node_bin, marp_script])
                break
    # 2. Fallback: PATH-based candidates
    candidates += [["marp"], ["npx", "-y", "@marp-team/marp-cli"]]

    marp_bin = None
    for candidate in candidates:
        try:
            result = subprocess.run(
                candidate + ["--version"],
                capture_output=True, text=True, timeout=30, env=node_env,
                stdin=subprocess.DEVNULL,
            )
            if result.returncode == 0:
                marp_bin = candidate
                print(f"  Using: {' '.join(marp_bin)} v{result.stdout.strip()}")
                break
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue

    if marp_bin is None:
        print("ERROR: marp-cli not found. Install: npm install -g @marp-team/marp-cli", file=sys.stderr)
        sys.exit(1)

    # Theme set: resolve wao-rtl.css relative to the lesson md
    theme_css = md_path.parent / "wao-rtl.css"
    if not theme_css.exists():
        # Fallback: look in same dir as this script
        theme_css = Path(__file__).parent.parent / "docs/scripts/website-course/wao-rtl.css"

    cmd = marp_bin + [
        "--no-stdin",
        "--images", "png",
        "--allow-local-files",
        "--html",
        str(md_path),
        "-o", str(slides_dir / "slide.png"),
    ]
    if theme_css.exists():
        cmd += ["--theme-set", str(theme_css)]
        print(f"  Theme: {theme_css}")
    else:
        print("  WARNING: wao-rtl.css not found, slides may render without dark theme", file=sys.stderr)
    if _chrome_path:
        cmd += ["--browser-path", _chrome_path]
    print(f"  Running: {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, env=node_env,
                           stdin=subprocess.DEVNULL)
    if result.returncode != 0:
        print(f"ERROR: marp failed:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)

    pngs = sorted(slides_dir.glob("slide.*.png"))
    if not pngs:
        pngs = sorted(slides_dir.glob("slide-*.png"))
    print(f"  Generated {len(pngs)} PNG(s).")
    return pngs


# ---------------------------------------------------------------------------
# 4. MoviePy assembly
# ---------------------------------------------------------------------------
def get_audio_duration(mp3_path: Path) -> float:
    """Use ffprobe to get audio duration in seconds."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(mp3_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 5.0  # fallback


def assemble_video(pngs: list, audio_dir: Path, narrations: list,
                   out_mp4: Path):
    """Step D -- FFmpeg video assembly: image clips + audio -> MP4.

    Uses ffmpeg concat demuxer directly -- orders of magnitude faster than
    MoviePy frame-by-frame re-composition.  Each narration N maps to png[N]
    (same index-based pairing as before).
    """
    print("\n[Step D] FFmpeg video assembly")
    import subprocess, json, tempfile

    def get_audio_duration_ffprobe(mp3: Path) -> float:
        cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "default=noprint_wrappers=1:nokey=1", str(mp3)]
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            return float(r.stdout.strip())
        except Exception:
            return 5.0

    # Pairing logic: two Marp formats are supported.
    #
    # LEGACY format (Google Ads course) — narration is a SEPARATE Marp slide:
    #   PNG[0] = title slide        <- narration[0] audio
    #   PNG[1] = narration block 1  <- SKIP (blank slide rendered by Marp)
    #   PNG[2] = slide 2 content    <- narration[1] audio
    #   ...
    #   Mapping: narration[i] -> pngs[i * 2]
    #
    # PNG mapping strategy:
    #
    # DIRECT (preferred): use actual slide number from narration item.
    #   narration slide_n → pngs[slide_n - 1]  (Marp numbers from 1, so slide 2 = index 1)
    #   Works for both sequential and sparse (title+content) slide layouts.
    #
    # LEGACY INTERLEAVED fallback (Google Ads course only):
    #   Narrations are numbered 1,2,3... AND num_pngs ≈ 2 * num_narrations.
    #   narration[i] → pngs[i * 2]
    #
    # Auto-detect LEGACY: narrations start at slide 1 AND n_pngs >= 2 * n_narr.
    n_narr = len(narrations)
    n_pngs = len(pngs)
    first_slide = narrations[0]["slide"] if narrations else 1
    slides_are_sequential_from_1 = all(narrations[i]["slide"] == i + 1 for i in range(len(narrations)))
    use_interleaved = slides_are_sequential_from_1 and (n_pngs >= 2 * n_narr)

    if use_interleaved:
        print(f"  PNG mapping: INTERLEAVED (legacy 🎙️ format) — {n_pngs} PNGs, {n_narr} narrations")
    else:
        print(f"  PNG mapping: DIRECT slide-number (presenter-notes format) — {n_pngs} PNGs, {n_narr} narrations")

    segments = []
    for i, item in enumerate(narrations):
        slide_n = item["slide"]
        mp3_path = audio_dir / f"slide-{slide_n}.mp3"
        if use_interleaved:
            png_index = i * 2
        else:
            png_index = slide_n - 1  # Direct: slide 2 → index 1 → slide.002.png
        if png_index >= len(pngs):
            print(f"  WARNING: No PNG for narration {i} (slide={slide_n}, png_index={png_index}, total={len(pngs)}). Skipping.")
            continue
        png_path = pngs[png_index]
        duration = get_audio_duration_ffprobe(mp3_path) if mp3_path.exists() else 5.0
        segments.append((png_path, mp3_path if mp3_path.exists() else None, duration))
        audio_status = "audio OK" if mp3_path.exists() else "NO AUDIO"
        print(f"  narr[{i}] slide={slide_n}: png={png_path.name} + {audio_status} ({duration:.2f}s)")


    if not segments:
        print("ERROR: No segments to assemble.", file=sys.stderr)
        sys.exit(1)

    out_mp4.parent.mkdir(parents=True, exist_ok=True)
    tmp_dir = Path(tempfile.mkdtemp(prefix="wao_render_"))

    # Step 1: For each segment, create a silent-or-audio MP4 clip via ffmpeg
    clip_paths = []
    for idx, (png, mp3, dur) in enumerate(segments):
        clip_out = tmp_dir / f"clip_{idx:03d}.mp4"
        if mp3:
            cmd = [
                "ffmpeg", "-y", "-loop", "1", "-i", str(png),
                "-i", str(mp3),
                "-c:v", "libx264", "-tune", "stillimage", "-preset", "fast",
                "-crf", "18", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k",
                "-shortest", "-t", str(dur),
                str(clip_out),
            ]
        else:
            cmd = [
                "ffmpeg", "-y", "-loop", "1", "-i", str(png),
                "-f", "lavfi", "-i", f"anullsrc=cl=stereo:r=44100",
                "-c:v", "libx264", "-tune", "stillimage", "-preset", "fast",
                "-crf", "18", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k",
                "-t", str(dur),
                str(clip_out),
            ]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            print(f"  ERROR encoding clip {idx}: {r.stderr[-300:]}", file=sys.stderr)
            sys.exit(1)
        size_kb = clip_out.stat().st_size // 1024
        print(f"  Clip {idx}: {clip_out.name} ({size_kb} KB)")
        clip_paths.append(clip_out)

    # Step 2: Write concat list file
    concat_list = tmp_dir / "concat.txt"
    with open(concat_list, "w") as f:
        for cp in clip_paths:
            f.write(f"file '{cp}'\n")

    # Step 3: Concatenate all clips
    print(f"  Concatenating {len(clip_paths)} clips -> {out_mp4.name}")
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat_list),
        "-c", "copy",
        str(out_mp4),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        print(f"ERROR: ffmpeg concat failed:\n{r.stderr[-500:]}", file=sys.stderr)
        sys.exit(1)

    # Cleanup temp clips
    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)

    size_mb = out_mp4.stat().st_size / (1024 * 1024)
    print(f"  Output: {out_mp4} ({size_mb:.1f} MB)")
    print("[Step D] Video assembly complete.")

# ---------------------------------------------------------------------------
# 5. Thumbnail (Pillow)
# ---------------------------------------------------------------------------
def generate_thumbnail(lesson_title: str, lesson_number: int, out_path: Path):
    """Step E -- Generate a 1280x720 branded thumbnail with Pillow + python-bidi."""
    print("\n[Step E] Thumbnail generation")
    from PIL import Image, ImageDraw, ImageFont
    try:
        from bidi.algorithm import get_display
        HAS_BIDI = True
    except ImportError:
        print("WARNING: python-bidi not installed. Hebrew text may render reversed.")
        print("         Install: pip3 install python-bidi --break-system-packages")
        get_display = lambda x, **kw: x  # noqa: E731
        HAS_BIDI = False

    def rtl(text: str) -> str:
        """Apply bidi algorithm so Pillow (LTR renderer) shows Hebrew correctly."""
        return get_display(text, base_dir="R")

    W, H = 1280, 720
    BG       = (11,  15,  25)   # #0b0f19
    TEAL     = (74,  227, 181)  # #4ae3b5
    GOLD     = (255, 208, 0)    # #ffd000
    WHITE    = (238, 233, 226)  # #eee9e2
    BADGE_BG = (19,  22,  32)   # #131620
    DIM      = (120, 130, 150)  # subdued

    img  = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # ---- Background: subtle grid ----
    for x in range(0, W, 80):
        draw.line([(x, 0), (x, H)], fill=(25, 33, 52), width=1)
    for y in range(0, H, 80):
        draw.line([(0, y), (W, y)], fill=(25, 33, 52), width=1)

    # ---- Right accent bars ----
    draw.rectangle([(W - 8, 0), (W, H)], fill=TEAL)
    draw.rectangle([(W - 22, 50), (W - 8, 260)], fill=GOLD)

    # ---- Font loader ----
    def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
        dirs = [
            "/usr/share/fonts/truetype/dejavu",
            "/usr/share/fonts/truetype/liberation",
            "/usr/share/fonts/truetype/noto",
            "/usr/share/fonts/truetype",
            "/usr/share/fonts",
        ]
        bold_names = ["DejaVuSans-Bold.ttf", "NotoSansHebrew-Bold.ttf",
                      "LiberationSans-Bold.ttf", "FreeSansBold.ttf"]
        reg_names  = ["DejaVuSans.ttf", "NotoSansHebrew-Regular.ttf",
                      "LiberationSans-Regular.ttf", "FreeSans.ttf"]
        for d in dirs:
            for n in (bold_names if bold else reg_names):
                p = os.path.join(d, n)
                if os.path.exists(p):
                    return ImageFont.truetype(p, size)
        print("WARNING: No TTF font found. Using PIL default (Hebrew glyphs may be missing).")
        print("         sudo apt install fonts-noto-hinted")
        return ImageFont.load_default()

    f_label  = load_font(22, bold=False)  # small course label
    f_course = load_font(34, bold=True)   # course name
    f_lesson = load_font(72, bold=True)   # big lesson title
    f_sub    = load_font(28, bold=False)  # subtitle
    f_wao    = load_font(28, bold=True)   # WAO badge

    # ---- Fixed text layout (right-anchored, RTL via bidi) ----
    RIGHT_X = W - 60

    # Course name — 2 lines, top right
    draw.text(
        (RIGHT_X, 60),
        rtl("קורס בניה + קידום אתרים"),
        font=f_course, fill=TEAL, anchor="ra",
    )
    draw.text(
        (RIGHT_X, 60 + 44),
        rtl("בעידן ה-AI"),
        font=f_course, fill=TEAL, anchor="ra",
    )

    # Teal divider under course name
    div1_y = 60 + 44 + 44
    draw.rectangle([(RIGHT_X - 440, div1_y), (RIGHT_X, div1_y + 3)], fill=TEAL)

    # Lesson title — large, right-aligned
    draw.text(
        (RIGHT_X, div1_y + 28),
        rtl("שיעור 1: הדומיין"),
        font=f_lesson, fill=WHITE, anchor="ra",
    )

    # Lesson subtitle
    draw.text(
        (RIGHT_X, div1_y + 28 + 90),
        rtl("הכתובת הדיגיטלית שלך"),
        font=f_sub, fill=DIM, anchor="ra",
    )

    # Gold divider
    div2_y = div1_y + 28 + 90 + 40
    draw.rectangle([(RIGHT_X - 440, div2_y), (RIGHT_X, div2_y + 3)], fill=GOLD)

    # Module info
    draw.text(
        (RIGHT_X, div2_y + 18),
        rtl("מודול 1 | שיעור 1"),
        font=f_label, fill=DIM, anchor="ra",
    )

    # ---- WAO badge — bottom-right ----
    badge_w, badge_h = 160, 48
    badge_x0 = W - 60 - badge_w
    badge_y0 = H - 70
    draw.rounded_rectangle(
        [(badge_x0, badge_y0), (badge_x0 + badge_w, badge_y0 + badge_h)],
        radius=8, fill=BADGE_BG, outline=GOLD, width=2,
    )
    draw.text(
        (badge_x0 + badge_w // 2, badge_y0 + badge_h // 2),
        "WAO",
        font=f_wao, fill=GOLD, anchor="mm",
    )

    # ---- Save ----
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(out_path), "JPEG", quality=95)
    print(f"  python-bidi: {'active' if HAS_BIDI else 'MISSING — Hebrew text may be reversed'}")
    print(f"  Saved: {out_path}")
    print("[Step E] Thumbnail complete.")
    print("\nNOTE: YouTube thumbnail upload limit = 10 per 24h (Google policy).")
    print(f"      Upload manually: {out_path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="WAO Course Lesson Render Pipeline")
    parser.add_argument("--input", required=True,
                        help="Path to lesson .md (relative to repo root or absolute)")
    parser.add_argument("--lesson", type=int, required=True, help="Lesson number")
    parser.add_argument("--slug", required=True, help="Output slug (e.g. L1-1-domain)")
    parser.add_argument("--skip-tts", action="store_true", help="Skip TTS step")
    parser.add_argument("--skip-marp", action="store_true", help="Skip Marp render step")
    parser.add_argument("--skip-video", action="store_true", help="Skip video assembly step")
    parser.add_argument("--skip-thumbnail", action="store_true", help="Skip thumbnail generation")
    parser.add_argument("--tts", default="elevenlabs", choices=["elevenlabs", "google"],
                        help="TTS engine: 'elevenlabs' (default) or 'google' (Chirp3-HD)")
    parser.add_argument("--single-slide", type=int, help="Only process this specific slide number (for Feedback Gate)")
    args = parser.parse_args()

    script_dir = Path(__file__).parent.resolve()
    repo_root = script_dir.parent
    load_env_local(repo_root)

    md_path = Path(args.input)
    if not md_path.is_absolute():
        md_path = repo_root / md_path
    if not md_path.exists():
        print(f"ERROR: Input not found: {md_path}", file=sys.stderr)
        sys.exit(1)

    output_root = repo_root / "output" / f"lesson-{args.lesson}"
    audio_dir = output_root / "audio"
    slides_dir = output_root / "slides"
    out_mp4 = output_root / f"{args.slug}.mp4"
    thumbnail_path = output_root / "thumbnail.jpg"

    print(f"\n{'=' * 60}")
    print("WAO Lesson Render Pipeline")
    print(f"  Input:  {md_path}")
    print(f"  Output: {output_root}")
    print(f"{'=' * 60}\n")

    # Step A: Extract narrations
    print("[Step A] Extracting narration blocks...")
    narrations = extract_narrations(md_path)
    if args.single_slide:
        narrations = [n for n in narrations if n["slide"] == args.single_slide]
        print(f"  Filtering to single slide: {args.single_slide}")
    
    print(f"  Found {len(narrations)} narration block(s):")
    for item in narrations:
        preview = item["text"][:60].replace("\n", " ")
        print(f"    Slide {item['slide']}: {preview}...")

    # Step B: TTS
    if not args.skip_tts:
        run_tts(narrations, audio_dir, repo_root, tts_engine=args.tts)
    else:
        print("\n[Step B] TTS skipped (--skip-tts).")

    # Step C: Marp
    if not args.skip_marp:
        pngs = run_marp(md_path, slides_dir)
    else:
        print("\n[Step C] Marp skipped (--skip-marp).")
        pngs = sorted(slides_dir.glob("slide.*.png"))
        if not pngs:
            pngs = sorted(slides_dir.glob("slide-*.png"))
        print(f"  Using {len(pngs)} existing PNG(s).")

    # Step D: Video assembly
    if not args.skip_video:
        assemble_video(pngs, audio_dir, narrations, out_mp4)
    else:
        print("\n[Step D] Video assembly skipped (--skip-video).")

    # Step E: Thumbnail
    if not args.skip_thumbnail:
        md_text = md_path.read_text(encoding="utf-8")
        title_match = re.search(r'^title:\s*"?(.+?)"?\s*$', md_text, re.MULTILINE)
        lesson_title = title_match.group(1) if title_match else args.slug
        generate_thumbnail(lesson_title, args.lesson, thumbnail_path)
    else:
        print("\n[Step E] Thumbnail skipped (--skip-thumbnail).")

    print(f"\n{'=' * 60}")
    print("Pipeline complete.")
    if out_mp4.exists():
        print(f"  Video:     {out_mp4}")
    if thumbnail_path.exists():
        print(f"  Thumbnail: {thumbnail_path}")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    main()
