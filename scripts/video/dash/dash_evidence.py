"""Shared evidence checks for Dash ads (generalised from s1_15_evidence.py). Each function prints a section and
asserts its invariant. No Hebrew here."""
import json, math, os, re, subprocess, unicodedata
import numpy as np
from PIL import Image
from dash_layout import W, H, FPS, GOOGLE_SAFE, OUT_X0, OUT_W, OUT_H, SCR_OUT_TOP

BAD_SCRIPTS = r"[Ѐ-ӿ؀-ۿݐ-ݿ぀-ヿ㐀-鿿가-힯ﭐ-﷿ﹰ-﻿]"


def probe(mp4):
    print("== probe")
    print(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,duration,sample_rate,channels",
                          "-show_entries", "format=duration", "-of", "compact", mp4], capture_output=True, text=True).stdout)
    err = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-f", "null", "-"], capture_output=True, text=True).stderr
    print("decode errors:", repr(err) if err else "none")
    assert not err
    print("audio mean/max volume:", re.findall(r"(mean_volume: \S+ dB|max_volume: \S+ dB)",
          subprocess.run(["ffmpeg", "-i", mp4, "-af", "volumedetect", "-vn", "-f", "null", "-"], capture_output=True, text=True).stderr))


class StringTable:
    def __init__(self):
        self.rows = []

    def chk(self, label, rendered, src, srcname):
        self.rows.append((label, rendered == src and rendered.encode() == src.encode(), srcname, rendered))

    def print(self):
        print("\n== on-screen strings (DOM textContent of the rendered PNGs vs the source, byte-exact)")
        for label, ok, src, txt in self.rows:
            print(f"{'OK ' if ok else 'BAD'} | {label:28s} | {txt} | {src}")
        assert all(r[1] for r in self.rows)

    def script_scan(self, ov):
        print("\n== script scan (CJK / Cyrillic / Arabic) over every rendered string")
        allt = "".join(r[3] for r in self.rows)
        bad = [ch for ch in allt if re.match(BAD_SCRIPTS, ch)]
        cf = [hex(ord(c)) for c in allt if unicodedata.category(c) == "Cf"]
        print("offending characters:", bad or "none", "| hidden bidi controls:", cf or "none")
        html_all = "".join(open(os.path.join(ov, f), encoding="utf-8").read() for f in os.listdir(ov) if f.endswith(".html"))
        n = len(re.findall(BAD_SCRIPTS, html_all))
        print("in all overlay HTML files:", n, "such characters")
        assert not bad and not n


def caption_dirs(measure, names):
    print("\n== bidi: computed direction of every Hebrew text element (must be rtl, isolated by the page CSS)")
    for n in names:
        for k, e in measure[n]["els"].items():
            print(f"  {n}.{k}: direction={e['dir']} font={e['font']}")


def safe_zone(ov, names, label="overlays"):
    gx0, gy0, gx1, gy1 = GOOGLE_SAFE
    print(f"\n== {label} vs Google 9:16 safe zone x{gx0}-{gx1} y{gy0}-{gy1} (alpha bbox of each overlay PNG, frame coords)")
    for n in names:
        al = np.asarray(Image.open(f"{ov}/{n}.png").convert("RGBA"))[..., 3]
        ys, xs = np.where(al > 0)
        ok = xs.min() >= gx0 and xs.max() <= gx1 and ys.min() >= gy0 and ys.max() <= gy1
        print(f"  {n:10s} x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()}  {'inside' if ok else 'OUTSIDE'}")
        assert ok
    print("  (banner scale-in runs 0.9 -> 1.0 about its own centre, so its largest extent is the 1.0 PNG above)")
    print("  screen (navy canvas) after push-in: x%d-%d y%d-%d" % (OUT_X0, OUT_X0 + OUT_W - 1, SCR_OUT_TOP, SCR_OUT_TOP + OUT_H - 1))


def grab(mp4, t):
    fr = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", mp4, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(fr, np.uint8).reshape(H, W, 3)


def endcard(measure, mp4, t_a, t_b, bg=(13, 17, 23)):
    gx0, gy0, gx1, gy1 = GOOGLE_SAFE
    print(f"\n== end card vs Google 9:16 safe zone x{gx0}-{gx1} y{gy0}-{gy1}")
    for k, e in measure["endcard"]["els"].items():
        inside = e["left"] >= gx0 and e["right"] <= gx1 + 1 and e["top"] >= gy0 and e["bottom"] <= gy1 + 1
        print(f"  {k:8s} x{e['left']:.0f}-{e['right']:.0f} y{e['top']:.0f}-{e['bottom']:.0f}  {'inside' if inside else 'OUTSIDE'}")
        assert inside
    b = grab(mp4, t_b).astype(int)
    ink = np.abs(b - np.array(bg)).sum(2) > 40
    ys, xs = np.where(ink)
    ok = xs.min() >= gx0 and xs.max() <= gx1 and ys.min() >= gy0 and ys.max() <= gy1
    print(f"  pixel ink bbox of the decoded frame at {t_b}s: x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()} -> {'inside' if ok else 'OUTSIDE'}")
    assert ok
    a = grab(mp4, t_a).astype(int)
    dd = np.abs(a - b)
    print("  end card still from %.2fs on: |frame(%.2f) - frame(%.2f)| mean %.3f, 99.9th pct %d, max %d (x264 noise)" % (t_a, t_a, t_b, dd.mean(), np.percentile(dd, 99.9), dd.max()))
    assert dd.mean() < 0.15 and np.percentile(dd, 99.9) <= 8, "end card must be a still (only x264 noise)"


def mouth_table(tl, pauses, total):
    print("\n== mouth per 0.25 s (level 0 = closed; voiced = loudness above the -45 dB gate)")
    mo, db, face = np.array(tl["mouth"]), np.array(tl["db"]), tl["face"]
    print(" t(s)  | face     | voiced | mouth levels in window | closed?")
    for k in range(int(total / 0.25)):
        f0, f1 = int(k * 0.25 * FPS), int((k + 1) * 0.25 * FPS)
        v = (db[f0:f1] > -45).any()
        lv = mo[f0:f1].tolist()
        print(f" {k*0.25:5.2f} | {face[f0]:8s} | {'yes' if v else 'no ':3s}    | {''.join(map(str, lv)):9s} | {'closed' if max(lv)==0 else 'open'}")
    silent = db < -45
    print("frames below gate:", int(silent.sum()), " of which mouth open:", int((mo[silent] > 0).sum()))
    assert int((mo[silent] > 0).sum()) == 0
    allc = True
    for a0, b0 in pauses:
        fs = range(int(math.ceil((a0 + 0.05) * FPS)), int((b0 - 0.05) * FPS))
        c = all(mo[f] == 0 for f in fs)
        allc &= c
        print(f"  pause {a0:.2f}-{b0:.2f}s: mouth levels {''.join(str(mo[f]) for f in fs)} -> {'CLOSED' if c else 'OPEN'}")
    return allc


def captions(tl):
    print("\n== captions timeline")
    for c in tl["captions"]:
        print(f"  {c['start']:6.2f}-{c['end']:6.2f}  {c['text']}")
    for b in tl.get("banners", []):
        print(f"  {b['t0']:6.2f}-{b['t1']:6.2f}  [banner {b.get('name')}]")


def sheets(mp4, out_prefix, total):
    """contact sheet at 4 fps (thumbs) and a 1 fps strip, like the S1-15 pilot."""
    n4 = int(total * 4)
    cols = 10
    rows = math.ceil(n4 / cols)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-vf", f"fps=4,scale=216:384,tile={cols}x{rows}:padding=4:color=0x333333",
                    "-frames:v", "1", f"{out_prefix}_contact_4fps.png"], check=True)
    n1 = int(math.ceil(total))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-vf", f"fps=1,scale=180:320,tile={n1}x1",
                    "-frames:v", "1", f"{out_prefix}_strip_1fps.png"], check=True)


def silent_runs(db, gate=-45.0, min_s=0.10):
    """Gate-silent runs [(t0, t1)] from the per-frame loudness the mouth is driven by (frame f covers f/FPS..)."""
    s = np.asarray(db) < gate
    runs, st = [], None
    for f, v in enumerate(list(s) + [False]):
        if v and st is None: st = f
        if not v and st is not None:
            if (f - st) / FPS >= min_s: runs.append((st / FPS, f / FPS))
            st = None
    return runs


def pause_report(tl, gaps, gate=-45.0, min_closed=0.30):
    """Pause check measured on the same loudness gate that drives the mouth (not on hand-typed STT edges).
    gaps: the brief's between-line windows [(name, t0, t1)]. For each, the gate-silent run inside it must exist,
    be >= min_closed long and have the mouth closed on every frame; the voiced frames that the brief window also
    covers (voice tail before, onset after) are listed with their mouth levels: there the mouth follows the voice,
    by design. Intra-line pauses (commas) are every other gate-silent run >= 0.10 s; mouth closed on all of them.
    Returns True only if every check holds; prints why not otherwise."""
    mo, db = np.array(tl["mouth"]), np.array(tl["db"])
    runs = silent_runs(db, gate)
    print(f"\n== pauses, measured on the mouth's own loudness gate ({gate:.0f} dB): every gate-silent run >= 0.10 s")
    ok_all, used = True, set()
    for name, a, b in gaps:
        inside = [(x, y) for x, y in runs if x < b and y > a]
        if not inside:
            print(f"  {name}: brief {a:.2f}-{b:.2f}s  NO gate-silent run inside -> FAIL"); ok_all = False; continue
        x, y = max(inside, key=lambda r: r[1] - r[0]); used.add((x, y))
        fs = range(int(round(x * FPS)), int(round(y * FPS)))
        closed = all(mo[f] == 0 for f in fs)
        long_ = (y - x) >= min_closed - 1e-6
        tail = [f for f in range(int(math.ceil(a * FPS)), int(round(x * FPS)))]
        head = [f for f in range(int(round(y * FPS)), int(b * FPS))]
        def desc(frs):
            return " ".join(f"{f / FPS:.2f}:{db[f]:.0f}dB/m{mo[f]}" for f in frs) or "none"
        ok = closed and long_
        ok_all &= ok
        print(f"  {name}: brief {a:.2f}-{b:.2f}s | gate-silent {x:.2f}-{y:.2f}s ({y - x:.2f}s, mouth {''.join(str(mo[f]) for f in fs)}) -> "
              f"{'CLOSED' if closed else 'OPEN'}{'' if long_ else ' but SHORTER than %.2fs' % min_closed}")
        print(f"      brief window still voiced before the run (voice tail): {desc(tail)}")
        print(f"      brief window voiced after the run (next onset):        {desc(head)}")
    for x, y in runs:
        if (x, y) in used: continue
        fs = range(int(round(x * FPS)), int(round(y * FPS)))
        closed = all(mo[f] == 0 for f in fs)
        ok_all &= closed
        print(f"  intra-line {x:.2f}-{y:.2f}s ({y - x:.2f}s): mouth {''.join(str(mo[f]) for f in fs)} -> {'CLOSED' if closed else 'OPEN'}")
    return ok_all
