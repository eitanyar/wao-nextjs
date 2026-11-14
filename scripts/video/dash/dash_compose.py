"""Shared Dash-ad compositor: cab plate + push-in + screen canvas + rigged face + overlays -> one 9:16 MP4.
Generalised from the S1-15 pilot's s1_15_render.py. No text is drawn here: every word arrives as a
Chrome-rendered PNG. The episode supplies canvas_at(t, f) (what Dash's screen shows) and face_state(t).

    comp = Composer(audio, total, ov_dir)
    comp.render(out_mp4, canvas_at, face_state, captions=..., banners=[...], end_t=...)
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from dash_layout import *
from dash_face import DashFace, MINT, mouth_levels, blink_track

SCREEN_RGB = np.array([17, 21, 34], np.float32)     # sampled from the plate's blank screen
CREAM = (248, 239, 220)                               # off-white sampled from the plate's outline
CREAM_F = np.array(CREAM, np.float32)
MINT_F = np.array(MINT, np.float32)
ease = lambda u: u * u * (3 - 2 * u)


def decode(path, w, h, ss=0.0, vf=None):
    args = ["ffmpeg", "-v", "error", "-ss", str(ss), "-i", path]
    if vf: args += ["-vf", vf]
    args += ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(args, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def over(dst, rgb, a, x=0, y=0):
    """alpha-composite rgb/a (h,w) onto dst at (x,y), clipped."""
    h, w = a.shape[:2]
    H_, W_ = dst.shape[:2]
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, W_), min(y + h, H_)
    if x1 <= x0 or y1 <= y0: return dst
    sa = a[y0 - y:y1 - y, x0 - x:x1 - x]
    dst[y0:y1, x0:x1] = dst[y0:y1, x0:x1] * (1 - sa) + rgb[y0 - y:y1 - y, x0 - x:x1 - x] * sa
    return dst


def scaled_layer(rgb, a, s, cx, cy):
    """layer scaled by s about (cx, cy), same canvas size."""
    if abs(s - 1) < 1e-3: return rgb, a
    im = np.concatenate([rgb, a * 255], 2).clip(0, 255).astype(np.uint8)
    pil = Image.fromarray(im, "RGBA")
    inv = 1 / s
    pil = pil.transform(pil.size, Image.AFFINE, (inv, 0, cx - inv * cx, 0, inv, cy - inv * cy), resample=Image.BICUBIC)
    o = np.asarray(pil, np.float32)
    return o[..., :3], o[..., 3:] / 255.0


class Clip:
    """A wan story clip (720x1280) scaled to the canvas width; frame(t_rel) -> the story-area crop starting at clip
    row `oy`. speed < 1 stretches a short clip over a longer beat (no freeze); max_t freezes on a frame."""
    def __init__(self, path, oy, ss=0.5, speed=1.0, max_t=None):
        self.frames = decode(path, CW, 1074, ss=ss, vf=f"scale={CW}:1074:flags=lanczos")
        self.oy, self.speed, self.max_t = oy, speed, max_t
        self.y0 = int(round(oy * CLIP_K))
        assert self.y0 + STORY_H <= 1074, "crop runs off the clip"

    def seconds(self):
        return len(self.frames) / FPS

    def frame(self, t_rel):
        t = t_rel * self.speed
        if self.max_t is not None: t = min(t, self.max_t)
        i = min(int(round(t * FPS)), len(self.frames) - 1)
        return self.frames[i][self.y0:self.y0 + STORY_H].astype(np.float32)


class Recording:
    """A recorder clip shown in the story area, aligned so its `mark` lands at `at` seconds in the ad.
    zoom (optional): an eased push-in on part of the real screen, dict(box=(x0, x1, top) in CSS px of the recorded
    page, t0, t1). The box width sets the zoom; its height follows the story-area aspect. The frames are decoded
    at the zoomed resolution, so the push-in stays sharp."""
    def __init__(self, mp4, manifest, clip_name, mark, at, zoom=None):
        m = json.load(open(manifest))["clips"][clip_name]
        assert m["status"] == "ok", m.get("problems")
        self.meta = m
        self.css_w = int(m["cssViewport"].split("x")[0])
        self.css_h = m["height"] * self.css_w / m["width"]
        self.zoom = zoom
        z = self.css_w / (zoom["box"][1] - zoom["box"][0]) if zoom else 1.0
        self.z = z
        self.dw = round(CW * z / 2) * 2                      # decode width
        self.k = self.dw / self.css_w                        # decoded px per CSS px
        full_h = round(m["height"] * self.dw / m["width"] / 2) * 2
        self.win_h_css = STORY_H * self.css_w / CW           # story window height at zoom 1 (CSS px)
        need = self.win_h_css if not zoom else max(self.win_h_css, zoom["box"][2] + self.win_h_css / z)
        self.dh = min(full_h, int(np.ceil(need * self.k / 2)) * 2 + 2)
        assert need <= self.css_h + 0.5, "zoom window runs off the recording"
        self.frames = decode(mp4, self.dw, self.dh, vf=f"scale={self.dw}:{full_h}:flags=lanczos,crop={self.dw}:{self.dh}:0:0")
        self.mark_t = next(k["t"] for k in m["marks"] if k["name"] == mark)
        self.offset = at - self.mark_t              # ad time of recording t=0

    def window(self, t):
        """(x0, y0, x1, y1) CSS window shown at ad time t."""
        full = (0.0, 0.0, float(self.css_w), self.win_h_css)
        if not self.zoom: return full
        x0, x1, top = self.zoom["box"]
        tgt = (x0, top, x1, top + self.win_h_css / self.z)
        u = ease(min(1.0, max(0.0, (t - self.zoom["t0"]) / (self.zoom["t1"] - self.zoom["t0"]))))
        # interpolate centre and scale (not corners) so the push reads as one camera move
        cf = ((full[0] + full[2]) / 2, (full[1] + full[3]) / 2); ct = ((tgt[0] + tgt[2]) / 2, (tgt[1] + tgt[3]) / 2)
        zs = 1.0 * (self.z ** u)                      # geometric zoom: constant perceived speed
        cx = cf[0] + (ct[0] - cf[0]) * u; cy = cf[1] + (ct[1] - cf[1]) * u
        hw, hh = self.css_w / zs / 2, self.win_h_css / zs / 2
        return (cx - hw, cy - hh, cx + hw, cy + hh)

    def frame(self, t):
        i = int(round((t - self.offset) * FPS))
        i = min(max(i, 0), len(self.frames) - 1)
        x0, y0, x1, y1 = self.window(t)
        im = Image.fromarray(self.frames[i])
        box = (x0 * self.k, y0 * self.k, x1 * self.k, y1 * self.k)
        return np.asarray(im.resize((CW, STORY_H), Image.LANCZOS, box=box), np.float32)


def stt_word_starts(check_dir):
    """Absolute word starts per script line from the voice check's local STT (faster-whisper, already on disk; no
    model call): takes listed in cache/concat/concat.txt, offset by the summed durations of everything before."""
    import glob
    files = [l.split("'")[1] for l in open(os.path.join(check_dir, "cache/concat/concat.txt")) if l.startswith("file")]
    off, out, li = 0.0, {}, 0
    for f in files:
        d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True, check=True).stdout)
        if "/takes/" in f:
            js = glob.glob(f[:-4] + ".local-*.json")
            assert len(js) == 1, js
            words = [w for w in json.load(open(js[0], encoding="utf-8"))["words"] if w.get("type") == "word"]
            out[li] = [off + w["start"] for w in words]
            li += 1
        off += d
    return out, off


def voiced_segments(db, t0, t1, gate=-32.0, min_gap=0.07):
    """voiced intervals inside [t0, t1] from the per-frame loudness (no STT, no model)."""
    fr = np.arange(int(t0 * FPS), min(int(t1 * FPS) + 1, len(db)))
    v = db[fr] > gate
    segs, cur = [], None
    for f, on in zip(fr, v):
        if on and cur is None: cur = [f / FPS, f / FPS]
        if on: cur[1] = (f + 1) / FPS
        if not on and cur is not None and (f / FPS - cur[1]) >= min_gap:
            segs.append(cur); cur = None
    if cur: segs.append(cur)
    return segs


def _char_time(segs, frac):
    tot = sum(b - a for a, b in segs); acc = 0.0
    for a, b in segs:
        if acc + (b - a) >= frac * tot: return a + (frac * tot - acc)
        acc += b - a
    return segs[-1][1]


class Composer:
    def __init__(self, audio, total, ov_dir, est_face_end=0.6, push_end=1.1):
        self.audio, self.total, self.ov = audio, total, ov_dir
        self.nf = int(round(total * FPS))
        self.est_face_end, self.push_end = est_face_end, push_end
        plate = decode(PLATE_SRC, 720, 1280, ss=PLATE_T)[0]
        d = np.abs(plate.astype(int) - SCREEN_RGB.astype(int)).sum(2)
        m720 = np.zeros((1280, 720), np.uint8); m720[d < 60] = 255
        box = np.zeros_like(m720); box[PY0:PY0 + PH, PX0:PX0 + PW] = 1
        m720 *= box
        mc = Image.fromarray(m720[PY0:PY0 + PH, PX0:PX0 + PW]).resize((CW, CH), Image.BILINEAR)
        mc = mc.point(lambda v: 255 if v > 128 else 0).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
        self.MASK = (np.asarray(mc, np.float32) / 255.0)[..., None]
        self.plate_pil = Image.fromarray(plate)
        self.WORLD_EST = self.world(EST_S, 0, 0)
        self.WORLD_SCR = self.world(SCR_OUT_S, SCR_TX, SCR_TY)
        self.MASK_OUT = np.asarray(Image.fromarray((self.MASK[..., 0] * 255).astype(np.uint8)).resize((OUT_W, OUT_H), Image.BILINEAR), np.float32)[..., None] / 255
        self.measure = json.load(open(os.path.join(ov_dir, "measure.json")))
        self.cards = json.load(open(os.path.join(ov_dir, "cards.json")))
        self.face = DashFace(color=CREAM)
        self.mouth, self.db = mouth_levels(audio, FPS, self.nf, full_db="auto", edges=(0.12, 0.50, 0.78))
        self.blink = np.zeros(self.nf)

    # ------------------------------------------------------------------ assets
    def world(self, s, tx, ty):
        inv = 1 / s
        return np.asarray(self.plate_pil.transform((W, H), Image.AFFINE, (inv, 0, -tx * inv, 0, inv, -ty * inv), resample=Image.BICUBIC), np.float32)

    def rgba(self, name):
        a = np.asarray(Image.open(os.path.join(self.ov, name + ".png")).convert("RGBA"), np.float32)
        return a[..., :3], a[..., 3:] / 255.0

    def rgb(self, name):
        return np.asarray(Image.open(os.path.join(self.ov, name + ".png")).convert("RGB"), np.float32)

    def set_blinks(self, starts, slow=()):
        self.blink = blink_track(self.nf, FPS, starts=starts, slow=slow)

    # ------------------------------------------------------------------ captions
    def caption_times(self, lines, texts, drop_texts=(), word_starts=None):
        """lines: [(line_idx, voice_t0, voice_t1, end_cut)]. Cards start on the voice; each card ends where the next
        starts, the last at end_cut. With word_starts {line: [abs start per word]} (local STT from the voice check),
        a card starts at its first word, snapped to a voiced-segment onset within 0.2 s. Without, by character
        position (clause-initial cards snap to the next voiced segment after a pause)."""
        out = []
        for li, l0, l1, end_cut in lines:
            segs = voiced_segments(self.db, l0, l1)
            text = texts[li]
            cs = [c for c in self.cards if c["line"] == li]
            assert " ".join(c["text"] for c in cs) == text, ("cards must rebuild the line", li)
            row = []
            ws = (word_starts or {}).get(li)
            if ws is not None:
                assert len(ws) == len(text.split(" ")), ("STT word count != display word count", li, len(ws))
                onsets = [a for a, b in segs]
                for k, c in enumerate(cs):
                    st = l0 if k == 0 else ws[text[:c["start"]].count(" ")]
                    near = min(onsets, key=lambda a: abs(a - st))
                    if k and abs(near - st) <= 0.2: st = near
                    row.append(dict(name=c["name"], text=c["text"], line=li, start=st))
                for i, c in enumerate(row):
                    c["end"] = row[i + 1]["start"] if i + 1 < len(row) else end_cut
                out += [c for c in row if c["text"] not in drop_texts]
                continue
            for k, c in enumerate(cs):
                st = l0 if k == 0 else _char_time(segs, c["start"] / len(text))
                if k:
                    prev = cs[k - 1]["text"]
                    starts = [a for a, b in segs[1:]]
                    if prev and prev[-1] in ".,!?" and starts:
                        near = min(starts, key=lambda a: abs(a - st))
                        if abs(near - st) < 0.95: st = near
                    else:
                        nxt = [a for a in starts if a >= st - 0.25]
                        if nxt and nxt[0] - st < 0.35: st = nxt[0]
                row.append(dict(name=c["name"], text=c["text"], line=li, start=st))
            for i, c in enumerate(row):
                c["end"] = row[i + 1]["start"] if i + 1 < len(row) else end_cut
            out += [c for c in row if c["text"] not in drop_texts]
        return out

    # ------------------------------------------------------------------ face
    def face_full(self, c, expr, col, f, t):
        a = self.face.alpha(CW, CH, "full", expr, self.mouth[f], self.blink[f], f, t)
        return c * (1 - a[..., None]) + col * a[..., None]

    def face_strip(self, c, expr, col, f, t):
        c[:STORY_Y] = SCREEN_RGB
        a = self.face.alpha(CW, STORY_Y - 4, "strip", expr, self.mouth[f], self.blink[f], f, t)
        c[:STORY_Y - 4] = c[:STORY_Y - 4] * (1 - a[..., None]) + col * a[..., None]
        c[STORY_Y - 4:STORY_Y] = CREAM_F * 0.35 + SCREEN_RGB * 0.65
        return c

    @staticmethod
    def blank():
        c = np.empty((CH, CW, 3), np.float32); c[:] = SCREEN_RGB
        return c

    # ------------------------------------------------------------------ frame
    def camera(self, t):
        if t < self.est_face_end: return EST_S, 0.0, 0.0, self.WORLD_EST
        if t < self.push_end:
            u = ease((t - self.est_face_end) / (self.push_end - self.est_face_end))
            s = EST_S + (SCR_OUT_S - EST_S) * u
            return s, SCR_TX * u, SCR_TY * u, self.world(s, SCR_TX * u, SCR_TY * u)
        return SCR_OUT_S, SCR_TX, SCR_TY, self.WORLD_SCR

    def frame(self, f, canvas_at, captions, banners, end_t, END, wordmark):
        t = f / FPS
        s, tx, ty, wld = self.camera(t)
        out = wld.copy()
        can = canvas_at(t, f)
        if s == SCR_OUT_S:
            x0, y0 = OUT_X0, SCR_OUT_TOP
            cs = np.asarray(Image.fromarray(np.clip(np.rint(can), 0, 255).astype(np.uint8)).resize((OUT_W, OUT_H), Image.LANCZOS), np.float32)
            out[y0:y0 + OUT_H, x0:x0 + OUT_W] = out[y0:y0 + OUT_H, x0:x0 + OUT_W] * (1 - self.MASK_OUT) + cs * self.MASK_OUT
        else:
            w, h = round(PW * s), round(PH * s)
            x0, y0 = round(PX0 * s + tx), round(PY0 * s + ty)
            cs = np.asarray(Image.fromarray(can.clip(0, 255).astype(np.uint8)).resize((w, h), Image.LANCZOS), np.float32)
            ms = np.asarray(Image.fromarray((self.MASK[..., 0] * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), np.float32)[..., None] / 255
            out[y0:y0 + h, x0:x0 + w] = out[y0:y0 + h, x0:x0 + w] * (1 - ms) + cs * ms
        if wordmark is not None: over(out, *wordmark)
        for c in captions:
            if c["start"] <= t < c["end"]: over(out, *self._caps[c["name"]])
        for b in banners:                                           # {layer, center, t0, t1}: 0.16 s scale-in 0.9 -> 1
            if b["t0"] <= t < b["t1"]:
                u = min(1.0, (t - b["t0"]) / 0.16)
                over(out, *scaled_layer(*b["layer"], 0.9 + 0.1 * ease(u), *b["center"]))
        fe = int(round(end_t * FPS))
        if f >= fe:
            k = min(1.0, (f - fe + 1) / 6.0)                         # 6-frame fade into END, then still
            out = out * (1 - k) + END * k
        return np.clip(np.rint(out), 0, 255).astype(np.uint8)

    def render(self, out_mp4, canvas_at, face_state, captions, banners, end_t, END, wordmark, extra_timeline=None):
        self._caps = {c["name"]: self.rgba(c["name"]) for c in captions}
        os.makedirs(os.path.dirname(out_mp4), exist_ok=True)
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                                "-i", self.audio, "-filter_complex", f"[1:a]aresample=48000,apad=whole_dur={self.total},atrim=0:{self.total}[a]",
                                "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
                                "-c:a", "aac", "-b:a", "192k", "-t", str(self.total), "-movflags", "+faststart", out_mp4], stdin=subprocess.PIPE)
        for f in range(self.nf):
            enc.stdin.write(self.frame(f, canvas_at, captions, banners, end_t, END, wordmark).tobytes())
            if f % 60 == 0: print("frame", f, flush=True)
        enc.stdin.close(); assert enc.wait() == 0
        tl = dict(captions=captions, mouth=self.mouth.tolist(), db=self.db.tolist(), blink=self.blink.tolist(),
                  face=[face_state(f / FPS)[0] if f / FPS < end_t else "none" for f in range(self.nf)],
                  banners=[dict(t0=b["t0"], t1=b["t1"], name=b.get("name")) for b in banners], end_t=end_t, total=self.total)
        tl.update(extra_timeline or {})
        json.dump(tl, open(out_mp4.replace(".mp4", ".timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
        print("wrote", out_mp4)
