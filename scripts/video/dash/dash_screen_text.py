"""Real-screen rules for Dash story ads (2026-11-14). No Hebrew here.

A real-screen shot is a shot that shows a product screen recording or screenshot: kind "rec", a shot with
"demo_tag": true or "screen": true, or a clip shot whose clip entry has "screen": true.

Builder rule (render): a real screen never runs under the caption band. For clip and still screens, rows from
SCREEN_CLEAR_Y down are the screen's own background, with a SCREEN_FADE px fade above them, so a caption card always
sits on a plain background. Place the recording (clip "place") so the UI the voice talks about sits above
SCREEN_CLEAR_Y. Kind "rec" (the Ads Bot leads page) keeps its own geometry assert (table bottom above the caption top)
and is held to the same rule by the OCR check below.

Evidence (evidence): every real-screen shot is sampled every SAMPLE_EVERY frames on the shot's own frame (the story
frame before the tile, wordmark and captions are drawn, outside push / pull moves) and run through local OCR
(dash_ocr_worker.py under the OCR venv). The same times are also read on the encoded MP4 (catches a stale render).
FAIL on
  - a test or placeholder string read anywhere on the screen (BLOCKLIST, plus the live client names), and
  - a detected text line on the screen that intersects the box of a caption card or banner shown at that time.
Also FAIL when the recorder manifest entry behind a screen clip carries a test-name / placeholder release blocker.
"""
import json, os, re, subprocess, tempfile

import numpy as np
from PIL import Image

import dash_paths as P
from dash_layout import FPS, H, W, CAP_TOP_OUT

ROOT = P.ROOT
OCR_PY = os.environ.get("DASH_OCR_PY") or os.path.join(ROOT, "scratch", "ocr-venv", "bin", "python")
OCR_WORKER = os.path.join(P.TOOLS, "dash_ocr_worker.py")
SAMPLE_EVERY = 3                      # frames (10 samples per second)
CAP_MARGIN = 4                        # px around a caption card's alpha box that screen text must also stay out of
SCREEN_CLEAR_Y = CAP_TOP_OUT - CAP_MARGIN   # first output row of plain background under a real screen
SCREEN_FADE = 12                      # px fade from the screen into its background above SCREEN_CLEAR_Y
REC_MANIFESTS = ("scratch/video-out/recordings/recordings.manifest.json",)

# Latin test / placeholder strings (OCR reads Latin; matched on the upper-cased text with spaces kept and removed)
BLOCKLIST = [
    r"(?<![A-Z])TEST", r"M2A", r"LOREM", r"IPSUM", r"PLACEHOLDER", r"DUMMY", r"SANDBOX", r"SYNTHETIC", r"(?<![A-Z])EVAL(?![A-Z])",
    r"TODO", r"FIXME", r"(?<![A-Z])XXX", r"UNDEFINED", r"(?<![A-Z])NULL(?![A-Z])", r"(?<![A-Z])NAN(?![A-Z])", r"OBJECT ?OBJECT",
    r"\S+@\S+\.\S+", r"EXAMPLE\.(COM|ORG|NET)", r"\.INVALID", r"LOCALHOST", r"127\.0\.0\.1", r"DEMO-PLACE", r"VIDEO-DEMO",
    r"[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}",                       # UUIDs / sandbox IDs
    r"(?<!\d)\d{3}-\d{3}-\d{4}(?!\d)",                             # Google Ads customer IDs
]
# A blocker of the recorder's releaseBlockers that means test or placeholder data is on screen
MANIFEST_BLOCKERS = re.compile(r"test name|placeholder|PENDING", re.I)


def client_names():
    """Live client slugs (directory names only, read-only) as Latin blocklist words: a real client's name must never
    appear on a demo screen. Our own brand and test / sandbox folders are skipped."""
    d = os.path.join(ROOT, "data", "clients")
    out = []
    for n in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        if not os.path.isdir(os.path.join(d, n)) or n == "wao" or n.startswith("test") or "sandbox" in n: continue
        tok = n.split("-")[0]
        if len(tok) >= 4: out.append(re.escape(tok.upper()))
    return out


def blocklisted(text, extra=()):
    u = text.upper()
    hits = []
    for pat in list(BLOCKLIST) + list(extra):
        for s in (u, u.replace(" ", "")):
            if re.search(pat, s):
                hits.append(pat); break
    return hits


def is_screen(spec, s):
    """a shot that shows a real product screen (see the module docstring)"""
    if s["kind"] == "rec" or s.get("demo_tag") or s.get("screen"): return True
    return s["kind"] == "clip" and bool(spec.get("clips", {}).get(s["clip"], {}).get("screen"))


def clear_band(o, bg):
    """the builder rule: plain background from SCREEN_CLEAR_Y down, a SCREEN_FADE px fade above it. o: HxWx3 float."""
    bg = np.asarray(bg, np.float32).reshape(1, 1, 3)
    y0 = SCREEN_CLEAR_Y - SCREEN_FADE
    u = np.clip((np.arange(y0, SCREEN_CLEAR_Y, dtype=np.float32) - y0 + 1) / SCREEN_FADE, 0, 1).reshape(-1, 1, 1)
    o[y0:SCREEN_CLEAR_Y] = o[y0:SCREEN_CLEAR_Y] * (1 - u) + bg * u
    o[SCREEN_CLEAR_Y:] = bg
    return o


def run_ocr(paths):
    if not os.path.exists(OCR_PY):
        raise AssertionError(f"OCR venv missing ({OCR_PY}): python3 -m venv scratch/ocr-venv && "
                             "scratch/ocr-venv/bin/pip install rapidocr_onnxruntime (or set DASH_OCR_PY)")
    with tempfile.TemporaryDirectory() as td:
        lp, op = os.path.join(td, "list.json"), os.path.join(td, "out.json")
        json.dump(paths, open(lp, "w"))
        r = subprocess.run([OCR_PY, OCR_WORKER, lp, op], capture_output=True, text=True)
        assert r.returncode == 0, ("OCR worker failed", r.stderr[-2000:])
        return json.load(open(op))


def alpha_box(png):
    a = np.asarray(Image.open(png).convert("RGBA"))[..., 3]
    ys, xs = np.where(a > 8)
    return int(xs.min()) - CAP_MARGIN, int(ys.min()) - CAP_MARGIN, int(xs.max()) + CAP_MARGIN, int(ys.max()) + CAP_MARGIN


def overlap(a, b):
    return max(0.0, min(a[2], b[2]) - max(a[0], b[0])) * max(0.0, min(a[3], b[3]) - max(a[1], b[1]))


def manifest_entry(src):
    """the recorder manifest entry behind a screen clip: same sha256, else the entry whose file stem the clip's
    stem starts with (a derived copy, e.g. S4_mobile_DRAFT_720.mp4 from S4_mobile_DRAFT.mp4)."""
    import hashlib
    sha = hashlib.sha256(open(src, "rb").read()).hexdigest()
    stem = os.path.splitext(os.path.basename(src))[0]
    best = None
    for mp in REC_MANIFESTS + (os.path.join(os.path.dirname(src), "recordings.manifest.json"),):
        mp = mp if os.path.isabs(mp) else os.path.join(ROOT, mp)
        if not os.path.exists(mp): continue
        for name, c in json.load(open(mp)).get("clips", {}).items():
            if c.get("sha256") == sha: return mp, name, c, "sha256"
            if best is None and stem.startswith(name): best = (mp, name, c, "file stem")
    return best


def grab_mp4(mp4, t):
    fr = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.4f}", "-i", mp4, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                        capture_output=True, check=True).stdout
    return np.frombuffer(fr, np.uint8).reshape(H, W, 3)


def screen_text_evidence(b, tl, ov, frames_dir, rec_src=None, mp4=None):
    """b: a dash_story Build after setup_render(). Returns True when clean; prints a per-shot report."""
    spec = b.spec
    shots = [s for s in b.shots if is_screen(spec, s)]
    print("\n== real screens: test / placeholder strings (OCR) and screen text under captions")
    if not shots:
        print("  no real-screen shots in this story")
        return True
    extra = client_names()
    print(f"  OCR: RapidOCR (local) via {os.path.relpath(OCR_PY, ROOT)}; every {SAMPLE_EVERY} frames; blocklist {len(BLOCKLIST)} patterns + "
          f"{len(extra)} live client names; caption box = card alpha box + {CAP_MARGIN} px")
    ok = True
    # metadata rule: the recorder's own verdict on the data it recorded
    for s in shots:
        src = rec_src if s["kind"] == "rec" else (spec["clips"][s["clip"]]["src"] if s["kind"] == "clip" else s.get("src"))
        if not src: continue
        src = src if os.path.isabs(src) else os.path.join(ROOT, src)
        e = manifest_entry(src) if src.endswith(".mp4") else None
        if e is None:
            print(f"  shot {s['id']}: {os.path.relpath(src, ROOT)}: no recorder manifest entry (OCR only)")
            continue
        mp, name, c, how = e
        bad = [x for x in c.get("releaseBlockers", []) if MANIFEST_BLOCKERS.search(x)]
        print(f"  shot {s['id']}: {os.path.relpath(src, ROOT)} = {name} in {os.path.relpath(mp, ROOT)} (by {how}); "
              f"test-data blockers: {bad or 'none'}")
        ok &= not bad
    os.makedirs(frames_dir, exist_ok=True)
    caps = {c["name"]: alpha_box(f"{ov}/{c['name']}.png") for c in tl["captions"]}
    bans = {bn["name"]: alpha_box(f"{ov}/{bn['name']}.png") for bn in tl.get("banners", [])}
    jobs = []
    for s in shots:
        pw, pl = b.push_window(s), b.pull_window(s)
        f0, f1 = int(round(s["t0"] * FPS)), int(round(s["t1"] * FPS))
        for f in range(f0, f1, SAMPLE_EVERY):
            t = f / FPS
            if (pw and t < pw[1]) or (pl and t >= pl[0]) or t >= b.END_T: continue
            o = b.story_frame(s, t)
            p = os.path.join(frames_dir, f"{s['id']}_{f:05d}.png")
            Image.fromarray(np.clip(np.rint(np.asarray(o, np.float32)), 0, 255).astype(np.uint8)).save(p)
            q = None
            if mp4:
                q = os.path.join(frames_dir, f"{s['id']}_{f:05d}_mp4.png")
                Image.fromarray(grab_mp4(mp4, (f + 0.5) / FPS)).save(q)
            jobs.append((s, f, t, p, q))
    res = run_ocr([j[3] for j in jobs] + [j[4] for j in jobs if j[4]])
    for s in shots:
        rows = [j for j in jobs if j[0] is s]
        n_hit, n_ov, seen = 0, 0, set()
        for _, f, t, p, q in rows:
            lines = res.get(p, [])
            for ln in lines + res.get(q, []):
                h = blocklisted(ln["text"], extra)
                if h:
                    n_hit += 1
                    key = ("hit", ln["text"])
                    if key not in seen:
                        seen.add(key)
                        print(f"  FAIL shot {s['id']} {t:6.2f}s: test/placeholder text {ln['text']!r} at {[round(v) for v in ln['box']]} ({', '.join(h)})")
            active = [(n, bx) for n, bx in caps.items() if any(c["name"] == n and c["start"] <= t < c["end"] for c in tl["captions"])]
            active += [(n, bx) for n, bx in bans.items() if any(bn["name"] == n and bn["t0"] <= t < bn["t1"] for bn in tl.get("banners", []))]
            for n, bx in active:
                for ln in lines:
                    a = overlap(bx, ln["box"])
                    if a > 0:
                        n_ov += 1
                        key = ("ov", n, tuple(round(v / 8) for v in ln["box"]))
                        if key not in seen:
                            seen.add(key)
                            print(f"  FAIL shot {s['id']} {t:6.2f}s: screen text at {[round(v) for v in ln['box']]} under {n} {list(bx)} ({a:.0f} px2)")
        print(f"  shot {s['id']:4s} {s['t0']:6.2f}-{s['t1']:6.2f}s: {len(rows)} frames read, {sum(len(res.get(j[3], [])) for j in rows)} text lines; "
              f"test strings {n_hit}, caption overlaps {n_ov}  -> {'OK' if not (n_hit or n_ov) else 'FAIL'}")
        ok &= not (n_hit or n_ov)
    print(f"  sampled frames: {frames_dir}")
    return ok
