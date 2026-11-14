"""DashFace + the `sarcastic` expression (spec docs/missions/video-dash-v2-design-2026-11-12.md, Expressions):
one eye lidded 60%, the other open under a single raised brow line; a side glance at the story, then back to the
viewer; mouth line tilted up at one corner 8 degrees; the whole face tilted 4 degrees toward the raised brow.
Kept in the Dash toolkit (scripts/video/dash) so the packaged rig in scripts/video/lib stays untouched. No text drawn here.

    face = DashFaceX(color=CREAM, glances=[(16.9, 18.3)])   # glance windows in ad seconds (eased in/out 0.25 s)
"""
import math
import os
import sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
import dash_face as df
from dash_face import DashFace, EXPRESSIONS

SARC_LID, SARC_OPEN = 0.40, 0.85   # lidded eye 60% closed; the open eye
BROW_GAP, BROW_LEN, BROW_TILT = 0.065, 0.80, 10.0   # U above the open eye's lid; x eye width; degrees, outer end up
MOUTH_TILT, HEAD_TILT = -8.0, 4.0  # mouth: physical-right corner up 8 deg; head: clockwise 4 deg (toward the brow)
GLANCE_DX, GLANCE_DY, GLANCE_EASE = -0.07, 0.02, 0.25   # toward the story's left (the hug) and a little down
BROW_SIDE = 1                      # the raised brow sits over the physical-right eye; the lidded eye is the left one


def _ease(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3 - 2 * u)


class DashFaceX(DashFace):
    def __init__(self, *a, glances=(), **k):
        super().__init__(*a, **k)
        self.glances = list(glances)

    def glance(self, t):
        g = 0.0
        for a, b in self.glances:
            g = max(g, min(_ease((t - a) / GLANCE_EASE), _ease((b - t) / GLANCE_EASE)))
        return g

    def alpha(self, w, h, mode="full", expr="deadpan", mouth=0, blink=0.0, frame=0, t=0.0):
        if expr != "sarcastic":
            return super().alpha(w, h, mode, expr, mouth, blink, frame, t)
        g = round(self.glance(t), 2)
        key = ("sarc", w, h, mode, int(mouth), round(float(blink), 2), frame // self.boil if self.boil else 0, g)
        if key in self._cache:
            return self._cache[key]
        U, cx, cy = self.layout(w, h, mode)
        base = EXPRESSIONS["deadpan"]
        ex, ey = cx + GLANCE_DX * U * g, cy + GLANCE_DY * U * g
        st = df.STROKE * U
        polys = []
        polys += self._eye_polys(dict(base, open=SARC_LID), -BROW_SIDE, blink, U, ex, ey, 0.0)
        polys += self._eye_polys(dict(base, open=SARC_OPEN), BROW_SIDE, blink, U, ex, ey, 0.0)
        # the brow line over the open eye
        bottom = ey + (df.EYE_TOP + df.EYE_H) * U
        lid_y = bottom - SARC_OPEN * df.EYE_H * U
        bcx, bcy = ex + BROW_SIDE * df.EYE_DX * U, max(lid_y - BROW_GAP * U, 1.6 * st + 2)   # strip: stays inside the band
        bl = BROW_LEN * df.EYE_W * U
        brow = self._rrect(bcx - bl / 2, bcy - st / 2, bcx + bl / 2, bcy + st / 2, st / 2, st / 2)
        th = math.radians(-BROW_TILT * BROW_SIDE)
        brow = [(bcx + (x - bcx) * math.cos(th) - (y - bcy) * math.sin(th), bcy + (x - bcx) * math.sin(th) + (y - bcy) * math.cos(th)) for x, y in brow]
        polys.append((brow, 255))
        polys += self._mouth_polys(dict(base, tilt=MOUTH_TILT), mouth, U, cx, cy)
        # head tilt: rotate everything about the face centre (y-down coords: + = clockwise on screen)
        hc = math.radians(HEAD_TILT)
        fy = cy + (df.EYE_TOP + df.MOUTH_Y) / 2 * U
        rot = lambda p: [(cx + (x - cx) * math.cos(hc) - (y - fy) * math.sin(hc), fy + (x - cx) * math.sin(hc) + (y - fy) * math.cos(hc)) for x, y in p]
        ss = self.ss
        im = Image.new("L", (w * ss, h * ss), 0)
        d = ImageDraw.Draw(im)
        for pts, fill in polys:
            p = self._wob(rot(pts), frame, U) * ss
            d.polygon([tuple(q) for q in p], fill=fill)
        a = np.asarray(im.resize((w, h), Image.BOX), np.float32) / 255.0
        if len(self._cache) > 512:
            self._cache.clear()
        self._cache[key] = a
        return a


if __name__ == "__main__":   # sheet: strip + full, glance off / on, mouth 0 / 2
    out = sys.argv[1]
    f = DashFaceX(color=(248, 239, 220), glances=[(1.0, 3.0)])
    tiles = []
    for mode, (w, h) in (("strip", (604, 136)), ("full", (604, 1086))):
        for t in (0.0, 2.0):
            for m in (0, 2):
                a = f.alpha(w, h, mode, "sarcastic", m, 0.0, 0, t)
                tiles.append(Image.fromarray((a * 255).astype(np.uint8)).resize((302, round(h / 2))))
    W_ = 302 * 4 + 30
    sheet = Image.new("L", (W_, 68 + 543 + 30), 40)
    for i, tl in enumerate(tiles):
        sheet.paste(tl, ((i % 4) * 310, 0 if i < 4 else 78))
    sheet.save(out)
    print("wrote", out)
