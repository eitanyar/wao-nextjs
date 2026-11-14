"""Dash face rig: the 2D line face drawn on Dash's screen, lip-synced from loudness.

Reusable across Dash episodes (docs/missions/dash-route-fable52-2026-11-14.md, "Face rig work").
Packaged from the throwaway S5b composite (scratch/video-dash/wan-consistency/composite/).

- Expressions: deadpan, tired, calm, excited (spec docs/missions/video-dash-v2-design-2026-11-12.md §1).
  No pupils, no brows, no nose, no shine.
- Modes: "full" (face fills the screen) and "strip" (top band of the screen, for SCR / PRD shots).
- Mouth: closed line plus 3 openings, chosen from the voice loudness; the expression's corner shape is kept.
- Lids: per-expression openness; blinks are an extra closure 0..1 supplied per frame.
- Hand wobble: every vertex is displaced by a smooth noise field that re-rolls every `boil` frames
  (1-2 px at 1080 width), so the line "boils" like hand-drawn animation instead of looking pasted on.

Pure numpy + Pillow. No network, no model calls. No text is drawn here.

    from dash_face import DashFace, mouth_levels, blink_track
    face = DashFace(color=(248, 239, 220))
    alpha = face.alpha(w, h, mode="strip", expr="tired", mouth=2, blink=0.0, frame=17)

Self-test (writes an expression sheet PNG):  python3 scripts/video/lib/dash_face.py --sheet out.png
"""
from __future__ import annotations

import math
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

MINT = (0x4A, 0xE3, 0xB5)

# Geometry in face units U (1 U = the screen width in full mode). Origin = face centre.
# Mouth is about twice the S5b test mouth (closed 0.32 U wide, widest opening 0.15 U).
EYE_DX = 0.235      # eye centre offset from the face centre
EYE_W = 0.27        # eye width
EYE_H = 0.19        # full-open eye height
EYE_TOP = -0.17     # top of a fully open eye
MOUTH_Y = 0.105     # mouth centre line
MOUTH_W = 0.32
STROKE = 0.024      # line weight (spec: 6 px at 1080 frame width, scales with the screen)
OPEN_H = (0.0, 0.055, 0.10, 0.15)   # mouth opening per level 0..3

EXPRESSIONS = {
    #            lid openness, eye shape, eye drift (U), mouth curve (U, + = ends up), mouth tilt (deg), mouth width scale
    "deadpan": dict(open=0.50, shape="bar", drift=0.0, curve=0.0, tilt=0.0, wscale=1.0),
    "tired": dict(open=0.30, shape="bar", drift=0.012, curve=0.0, tilt=6.0, wscale=0.95),
    "calm": dict(open=0.80, shape="arc", drift=0.0, curve=0.028, tilt=0.0, wscale=1.0),
    "excited": dict(open=1.00, shape="circle", drift=0.0, curve=0.0, tilt=0.0, wscale=1.05, smile=True),
}


class DashFace:
    def __init__(self, color=(242, 245, 249), wobble_px=1.4, boil=4, ss=3, seed=7):
        self.color = tuple(int(c) for c in color)
        self.wobble_px = wobble_px
        self.boil = boil
        self.ss = ss
        self.seed = seed
        self._cache = {}

    # ------------------------------------------------------------------ layout
    @staticmethod
    def layout(w, h, mode):
        """(U, cx, cy) in pixels for a screen area of w x h."""
        if mode == "full":
            return w * 1.0, w / 2, h * 0.42
        if mode == "strip":
            # face spans EYE_TOP .. mouth fully open (about 0.45 U); fit it in 86% of the band
            span_top, span_bot = EYE_TOP, MOUTH_Y + OPEN_H[3] + STROKE
            U = min(w * 0.62, h * 0.86 / (span_bot - span_top))
            return U, w / 2, h / 2 - (span_bot + span_top) / 2 * U
        raise ValueError(mode)

    # ------------------------------------------------------------------ wobble
    def _noise(self, frame):
        k = frame // self.boil if self.boil else 0
        rng = np.random.default_rng(self.seed * 1000003 + k)
        return rng.uniform(0, 2 * math.pi, 4), rng.uniform(0.6, 1.4, 2)

    def _wob(self, pts, frame, scale):
        if not self.wobble_px:
            return pts
        ph, fq = self._noise(frame)
        p = np.asarray(pts, float)
        x, y = p[:, 0] / scale, p[:, 1] / scale
        a = self.wobble_px
        dx = a * np.sin(x * 9.0 * fq[0] + ph[0]) * np.cos(y * 7.0 + ph[1])
        dy = a * np.sin(y * 8.0 * fq[1] + ph[2]) * np.cos(x * 6.0 + ph[3])
        return np.stack([p[:, 0] + dx, p[:, 1] + dy], 1)

    # ------------------------------------------------------------------ shapes (point lists, pixel space)
    @staticmethod
    def _rrect(x0, y0, x1, y1, r_top, r_bot, n=10):
        r_top = max(0.0, min(r_top, (x1 - x0) / 2, (y1 - y0) / 2))
        r_bot = max(0.0, min(r_bot, (x1 - x0) / 2, (y1 - y0) / 2))
        pts = []
        def arc(cx, cy, r, a0, a1):
            for i in range(n + 1):
                a = math.radians(a0 + (a1 - a0) * i / n)
                pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        arc(x1 - r_top, y0 + r_top, r_top, -90, 0)
        arc(x1 - r_bot, y1 - r_bot, r_bot, 0, 90)
        arc(x0 + r_bot, y1 - r_bot, r_bot, 90, 180)
        arc(x0 + r_top, y0 + r_top, r_top, 180, 270)
        return pts

    @staticmethod
    def _ellipse(cx, cy, rx, ry, n=48):
        return [(cx + rx * math.cos(2 * math.pi * i / n), cy + ry * math.sin(2 * math.pi * i / n)) for i in range(n)]

    def _mouth_polys(self, e, level, U, cx, cy):
        """[(points, fill)] fill 255 = line colour, 0 = punch back to the screen."""
        w = MOUTH_W * e["wscale"] * U
        st = STROKE * U
        h = OPEN_H[int(level)] * U
        if e.get("smile"):
            h = max(h, OPEN_H[2] * U) + (OPEN_H[int(level)] * U) * 0.25
        n = 24
        xs = np.linspace(-1, 1, n)
        centre = -e["curve"] * U * xs ** 2   # y offsets of the closed line (ends up when curve > 0)
        tilt = math.radians(e["tilt"])
        def place(px, py):
            # rotate about the mouth centre; positive tilt sags the physical-right end
            rx = px * math.cos(tilt) - py * math.sin(tilt)
            ry = px * math.sin(tilt) + py * math.cos(tilt)
            return (cx + rx, cy + MOUTH_Y * U + ry)
        out = []
        if h < 2.2 * st:  # closed (or nearly): a thick line with round ends
            top = [place(x * w / 2, c - st / 2 - h / 2) for x, c in zip(xs, centre)]
            bot = [place(x * w / 2, c + st / 2 + h / 2) for x, c in zip(xs[::-1], centre[::-1])]
            r = st / 2 + h / 2
            capR = [place(w / 2 + r * math.cos(a), centre[-1] + r * math.sin(a)) for a in np.linspace(-math.pi / 2, math.pi / 2, 9)]
            capL = [place(-w / 2 - r * math.cos(a), centre[0] + r * math.sin(a)) for a in np.linspace(math.pi / 2, -math.pi / 2, 9)]
            pts = top + capR[1:-1] + bot + capL[1:-1]
            out.append((pts, 255))
            return out
        # open: a rounded slot; the top edge sits on the closed line, the bottom drops by h (more in the middle)
        if e.get("smile"):
            top_y = lambda x, c: c - st / 2
            bot_y = lambda x, c: c + st / 2 + h * math.sqrt(max(0.0, 1 - x * x))
        else:
            top_y = lambda x, c: c - st / 2 - 0.18 * h * math.sqrt(max(0.0, 1 - x * x))
            bot_y = lambda x, c: c + st / 2 + 0.82 * h * math.sqrt(max(0.0, 1 - x * x))
        ww = w * (1 - 0.18 * (h / (OPEN_H[3] * U)))  # the mouth narrows a little as it opens
        outer = [place(x * ww / 2, top_y(x, c)) for x, c in zip(xs, centre)] + \
                [place(x * ww / 2, bot_y(x, c)) for x, c in zip(xs[::-1], centre[::-1])]
        out.append((outer, 255))
        inner_w = ww - 2.4 * st
        if inner_w > st:
            xi = np.linspace(-1, 1, n)
            ci = -e["curve"] * U * (xi * inner_w / ww) ** 2
            inner = [place(x * inner_w / 2, top_y(x, c) + st) for x, c in zip(xi, ci)] + \
                    [place(x * inner_w / 2, bot_y(x, c) - st) for x, c in zip(xi[::-1], ci[::-1])]
            # only punch when the interior is taller than a stroke
            if (bot_y(0, ci[n // 2]) - st) - (top_y(0, ci[n // 2]) + st) > st * 0.6:
                out.append((inner, 0))
        return out

    def _eye_polys(self, e, side, blink, U, cx, cy, t_drift):
        """Eye = the visible part of a rounded eye shape below a lid line, plus the lid line."""
        ecx = cx + side * EYE_DX * U + t_drift * U * 0.6
        top = cy + EYE_TOP * U + abs(t_drift) * U
        ew, eh, st = EYE_W * U, EYE_H * U, STROKE * U
        if e["shape"] == "circle":
            ew = eh = EYE_H * U * 1.05
        bottom = top + eh
        openness = e["open"] * (1 - blink)
        lid_y = bottom - openness * eh            # lid travels down as the eye closes
        polys = []
        visible = bottom - (lid_y + st / 2)
        if visible > st * 0.35:
            if e["shape"] == "bar":
                shape = self._rrect(ecx - ew / 2, lid_y, ecx + ew / 2, bottom, st / 2, min(eh * 0.42, visible))
            elif e["shape"] == "arc":
                rx, ry = ew / 2, max(visible, st)
                shape = [(ecx + rx * math.cos(a), lid_y + ry * math.sin(a)) for a in np.linspace(0, math.pi, 32)]
            else:  # circle, cut by the lid when blinking
                r = eh / 2
                ccy = top + r
                pts = []
                for a in np.linspace(0, 2 * math.pi, 64):
                    pts.append((ecx + r * math.cos(a), max(ccy + r * math.sin(a), lid_y)))
                shape = pts
            polys.append((shape, 255))
        # the lid line: always drawn, so a closed eye is one clean line
        lw = ew * (1.06 if e["shape"] != "circle" else 0.0)
        if e["shape"] != "circle" or blink > 0.5:
            lw = ew * 1.06
            polys.append((self._rrect(ecx - lw / 2, lid_y - st / 2, ecx + lw / 2, lid_y + st / 2, st / 2, st / 2), 255))
        return polys

    # ------------------------------------------------------------------ public
    def alpha(self, w, h, mode="full", expr="deadpan", mouth=0, blink=0.0, frame=0, t=0.0):
        """Float alpha (h, w) in 0..1 of the face for one frame."""
        e = EXPRESSIONS[expr]
        U, cx, cy = self.layout(w, h, mode)
        drift = e["drift"] * math.sin(t * 2 * math.pi / 2.6) if e["drift"] else 0.0
        key = (w, h, mode, expr, int(mouth), round(float(blink), 2), frame // self.boil if self.boil else 0, round(drift, 3))
        if key in self._cache:
            return self._cache[key]
        ss = self.ss
        im = Image.new("L", (w * ss, h * ss), 0)
        d = ImageDraw.Draw(im)
        polys = []
        for side in (-1, 1):
            polys += self._eye_polys(e, side, blink, U, cx, cy, drift)
        polys += self._mouth_polys(e, mouth, U, cx, cy)
        wob_scale = U
        for pts, fill in polys:
            p = self._wob(pts, frame, wob_scale) * ss
            d.polygon([tuple(q) for q in p], fill=fill)
        a = np.asarray(im.resize((w, h), Image.BOX), np.float32) / 255.0
        if len(self._cache) > 512:
            self._cache.clear()
        self._cache[key] = a
        return a

    def paint(self, rgb, alpha, color=None):
        """Composite the face colour onto an (h, w, 3) float/uint8 image in place-safe fashion; returns float32."""
        c = np.array(color or self.color, np.float32)
        f = rgb.astype(np.float32)
        return f * (1 - alpha[..., None]) + c * alpha[..., None]


# ---------------------------------------------------------------------- audio -> mouth
def load_pcm(audio, sr=48000):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", audio, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32), sr


def mouth_levels(audio, fps, n_frames, lead=0.033, win=0.040, gate_db=-45.0, full_db=-20.0,
                 edges=(0.12, 0.40, 0.70), min_hold=2):
    """Per-frame mouth level 0..3 from loudness (fast attack, slower release, min hold). Returns (levels, db).
    full_db="auto" sets the wide-open point to the 95th percentile of the voiced frames, so a loud take does not
    sit at the widest mouth all the time."""
    pcm, sr = load_pcm(audio)
    db = np.full(n_frames, -120.0)
    for i in range(n_frames):
        c = i / fps + lead
        a, b = int((c - win / 2) * sr), int((c + win / 2) * sr)
        seg = pcm[max(a, 0):max(min(b, len(pcm)), 0)]
        if len(seg):
            db[i] = 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)
    if full_db == "auto":
        voiced = db[db > gate_db]
        full_db = float(np.percentile(voiced, 95)) if len(voiced) else -20.0
    lvl = np.clip((db - gate_db) / (full_db - gate_db), 0, 1)
    sm = np.zeros(n_frames)
    for i in range(n_frames):
        p = sm[i - 1] if i else 0.0
        k = 0.75 if lvl[i] > p else 0.5
        sm[i] = p + k * (lvl[i] - p)
    q = np.array([sum(v >= e for e in edges) for v in sm])
    held = q.copy()
    cur, run = held[0], 1
    for i in range(1, n_frames):
        if q[i] != cur and run < min_hold:
            held[i] = cur
            run += 1
        else:
            run = 1 if q[i] != cur else run + 1
            cur = q[i]
            held[i] = cur
    # a frame below the gate is always closed, whatever the hold says (mouth closed in every pause)
    held[db < gate_db] = 0
    return held.astype(int), db


def blink_track(n_frames, fps, starts, slow=()):
    """Per-frame extra lid closure 0..1. starts: seconds of normal blinks (3 closed frames);
    slow: seconds of slow 400 ms blinks (tired)."""
    out = np.zeros(n_frames)
    fast = [0.45, 1.0, 1.0, 1.0, 0.55, 0.2]
    for s in starts:
        f0 = int(round(s * fps))
        for k, v in enumerate(fast):
            if 0 <= f0 + k < n_frames:
                out[f0 + k] = max(out[f0 + k], v)
    for s in slow:
        f0 = int(round(s * fps))
        n = int(round(0.4 * fps))
        for k in range(n):
            v = math.sin(math.pi * k / (n - 1))
            if 0 <= f0 + k < n_frames:
                out[f0 + k] = max(out[f0 + k], min(1.0, v * 1.15))
    return out


# ---------------------------------------------------------------------- self-test sheet
def _sheet(path):
    face = DashFace(color=(248, 239, 220))
    W, H = 300, 540
    SW, SH = 300, 70
    rows = []
    for expr in EXPRESSIONS:
        tiles = []
        for lvl in range(4):
            bg = np.zeros((H, W, 3), np.float32) + (17, 21, 34)
            col = MINT if expr in ("calm", "excited") else None
            img = face.paint(bg, face.alpha(W, H, "full", expr, lvl, 0.0, 0), col)
            st = np.zeros((SH, W, 3), np.float32) + (17, 21, 34)
            st = face.paint(st, face.alpha(SW, SH, "strip", expr, lvl, 0.0, 0), col)
            tiles.append(np.concatenate([img, np.full((6, W, 3), 60.0), st], 0))
        b = np.zeros((H, W, 3), np.float32) + (17, 21, 34)
        b = face.paint(b, face.alpha(W, H, "full", expr, 0, 1.0, 0))
        tiles.append(np.concatenate([b, np.full((6, W, 3), 60.0), np.zeros((SH, W, 3)) + (17, 21, 34)], 0))
        rows.append(np.concatenate([np.concatenate([t, np.full((t.shape[0], 6, 3), 60.0)], 1) for t in tiles], 1))
    sheet = np.concatenate([np.concatenate([r, np.full((6, r.shape[1], 3), 60.0)], 0) for r in rows], 0)
    Image.fromarray(np.clip(sheet, 0, 255).astype(np.uint8)).save(path)
    # invariants
    a0 = face.alpha(W, H, "full", "deadpan", 0, 0.0, 0)
    a1 = face.alpha(W, H, "full", "deadpan", 0, 0.0, 1)
    assert np.array_equal(a0, a1), "same boil window must give identical pixels"
    assert face.alpha(W, H, "full", "deadpan", 3, 0, 0).sum() > a0.sum() * 0.9
    print("sheet:", path)


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--sheet":
        _sheet(sys.argv[2])
    else:
        print(__doc__)
