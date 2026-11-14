"""FULL-SCREEN Dash ads (Eitan, 2026-11-14: "full screen for all videos"), promoted from the A2-15 full variant
(scratch/video-dash/a2-15-full/tools/a2_15_full.py). Spec: docs/missions/dash-route-fable52-2026-11-14.md,
"Style decision ... FULL-SCREEN".

Pattern: open on Dash at the dashboard; one continuous push THROUGH his screen into the full-frame 9:16 story; Dash
rides along as a reaction tile (top right, ~20% width, inside the safe box); pull back OUT to Dash full face for the
verdict / punchline line; product screens full-frame on a dark page; the END card unchanged.

Full-screen is the default layout. The phone-frame layout (dash_compose.Composer.render) stays behind `--phone`:
    layout, argv = layout_from_argv(sys.argv)

Pieces (no text is drawn here; every word is a Chrome-rendered PNG from dash_overlays):
    FullClip   a wan clip placed on the 1080x1920 frame by out = k*src + (ox, oy), flat measured-background fill
    Push       the camera move through Dash's screen, from any start framing (EST or the VRD dashboard framing);
               reverse=True is the pull back out
    Tile       the reaction tile (navy screen, orange case ring, cream outline, soft shadow)
    Page       a recorder clip played full-frame on the dark page (CSS px -> output px, slow settle-in)
    Cut        per-frame finishing (tile, wordmark, captions, banners), body/tail encode with a swappable END card
Evidence helpers at the bottom measure pauses on the mouth's own loudness gate (dash_evidence.pause_report), never on
hand-typed STT edges.
"""
import json, math, os, shutil, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)
from dash_layout import *
import dash_paths as P
sys.path.insert(1, P.LIB)   # the packaged face rig (read-only)
import dash_face as _df

ROOT = P.ROOT
LAYOUTS = ("full", "phone")


def layout_from_argv(argv):
    """("full" | "phone", argv without the flag). Full-screen is the default; --phone keeps the phone-frame cut."""
    return ("phone" if "--phone" in argv else "full"), [a for a in argv if a != "--phone"]


ease = lambda u: u * u * (3 - 2 * u)


def clamp01(u):
    return min(1.0, max(0.0, u))


# ------------------------------------------------------------------ geometry (output px)
FULL_K = W / 720.0               # wan clip 720x1280 -> 1080x1920 (1.5x, exact 9:16)
UNSHARP = dict(radius=1.6, percent=35, threshold=2)   # light sharpening on enlarged wan frames
PUSH_DUR = 0.90                  # EST push through the screen (A2-15 full: 0.60 -> 1.50)
PULL_DUR = 0.30                  # pull back out to the dashboard; must sit inside a gate-silent run
POP = 0.16                       # reaction tile scale-in
# reaction tile: 20% of the frame width, top right, inside the Google safe box with its shadow
TILE = 216
TILE_X0, TILE_Y0 = GOOGLE_SAFE[2] - 16 - TILE, GOOGLE_SAFE[1] + 12     # x655-871, y300-516
TILE_R, RING, OUTLINE = 46, 7, 3
SHADOW_BLUR, SHADOW_DY = 7, 4
TILE_CLEAR_Y = TILE_Y0 + TILE + SHADOW_DY + 2 * SHADOW_BLUR + 2      # first row below the tile and its shadow
PAGE_BG = (4, 5, 8)              # measured page background of the Ads Bot leads recording
TDEMO_LEFT, TDEMO_TOP, TDEMO_FONT = GOOGLE_SAFE[0] + 12, GOOGLE_SAFE[1] + 80, 30   # «demo business» tag, under the wordmark
END_FADE = 6                     # frames: fade into the END card, then still


# ================================================================== image helpers
def affine_to_out(img, sx, sy, ox, oy, size=(W, H), fill=None, resample=Image.BICUBIC):
    """PIL image placed by out = (sx*x + ox, sy*y + oy) on a size canvas."""
    return img.transform(size, Image.AFFINE, (1 / sx, 0, -ox / sx, 0, 1 / sy, -oy / sy), resample=resample, fillcolor=fill)


def probe_wh(path):
    s = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path],
                       capture_output=True, text=True, check=True).stdout.strip().split(",")
    return int(s[0]), int(s[1])


def decode_native(path, ss=0.0):
    w, h = probe_wh(path)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(ss), "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def place_src(img, place, fill, sharpen=True):
    """img (PIL) by out = k*src + (ox, oy) on the 1080x1920 frame, flat fill outside; lanczos + light unsharp."""
    k, ox, oy = place
    sw, sh = img.size
    # source box seen by the output frame; pad the source with the fill so the box stays inside it
    bx0, by0, bx1, by1 = -ox / k, -oy / k, (W - ox) / k, (H - oy) / k
    px0, py0 = max(0, int(math.ceil(-bx0)) + 2), max(0, int(math.ceil(-by0)) + 2)
    px1, py1 = max(0, int(math.ceil(bx1 - sw)) + 2), max(0, int(math.ceil(by1 - sh)) + 2)
    if px0 or py0 or px1 or py1:
        big = Image.new("RGB", (sw + px0 + px1, sh + py0 + py1), fill)
        big.paste(img, (px0, py0))
        img, bx0, by0, bx1, by1 = big, bx0 + px0, by0 + py0, bx1 + px0, by1 + py0
    im = img.resize((W, H), Image.LANCZOS, box=(bx0, by0, bx1, by1))
    if sharpen and k > 1.05:
        im = im.filter(ImageFilter.UnsharpMask(**UNSHARP))
    return np.asarray(im, np.float32)


# ================================================================== story sources
class FullClip:
    """A wan clip at native 720x1280. place = (k, ox, oy): out = k*src + (ox, oy) (default exact full-bleed 1.5x).
    The uncovered frame (when a clip is shifted to keep the action above the captions) gets the clip's own flat
    background, measured as the median of its 40 bottom rows on the first frame (wan backdrops are flat, std ~1)."""
    def __init__(self, path, ss=0.5, speed=1.0, place=None, max_t=None, warp=None):
        """warp: [(t_rel, clip_t), ...] knots (piecewise-linear time map, e.g. hold a still moment then play an
        action on its word); fractional clip times blend the two neighbouring frames (no stutter on slow spans)."""
        self.path = path
        self.frames, self.speed, self.max_t, self.warp = decode_native(path, ss), speed, max_t, warp
        self.place = place or (FULL_K, 0.0, 0.0)
        self.bg = tuple(int(v) for v in np.median(self.frames[0][-40:].reshape(-1, 3), 0))
        self.size = (self.frames.shape[2], self.frames.shape[1])

    def seconds(self):
        return len(self.frames) / FPS

    def idx(self, t_rel):
        t = t_rel * self.speed
        if self.max_t is not None: t = min(t, self.max_t)
        return min(max(int(round(t * FPS)), 0), len(self.frames) - 1)

    def clip_t(self, t_rel):
        if self.warp:
            return float(np.interp(t_rel, [k[0] for k in self.warp], [k[1] for k in self.warp]))
        t = t_rel * self.speed
        return t if self.max_t is None else min(t, self.max_t)

    def native(self, t_rel):
        if not self.warp:
            return Image.fromarray(self.frames[self.idx(t_rel)])
        fi = min(max(self.clip_t(t_rel) * FPS, 0.0), len(self.frames) - 1.0)
        i0 = int(math.floor(fi)); a = fi - i0
        if a < 0.05 or i0 + 1 >= len(self.frames): return Image.fromarray(self.frames[i0])
        if a > 0.95: return Image.fromarray(self.frames[i0 + 1])
        mix = self.frames[i0].astype(np.float32) * (1 - a) + self.frames[i0 + 1].astype(np.float32) * a
        return Image.fromarray(np.clip(np.rint(mix), 0, 255).astype(np.uint8))

    def full(self, t_rel, place=None):
        return place_src(self.native(t_rel), place or self.place, self.bg)

    def to_out(self, x, y, place=None):
        k, ox, oy = place or self.place
        return k * x + ox, k * y + oy


def clip_m0(oy_row, src_w=720):
    """phone-layout placement of a src (width src_w) in the screen canvas: width CW, clip row oy_row at STORY_Y."""
    k0 = CW / src_w
    return (k0, 0.0, STORY_Y - oy_row * k0)


def full_m0(place, oy_row, src_w=720):
    """phone-layout canvas placement (src -> canvas) of a COMPOSED full frame (1080x1920) whose clip sits at place
    (clip -> out), so that the clip shows as in the phone layout (width CW, clip row oy_row at STORY_Y). Pushing a
    composed frame (clip + its overlays) keeps every overlay locked to the clip through the move."""
    k, ox, oy = place
    c0 = CW / src_w
    return (c0 / k, -c0 * ox / k, STORY_Y - oy_row * c0 - c0 * oy / k)


class Page:
    """A recorder clip played full-frame on the dark page. CSS px -> output px: out = k(t)*css + offset, with the
    anchor CSS point held on anchor_out while k eases k0 -> k1 over [t0, t1] (a slow settle-in). Frames decoded at
    the largest scale used, so the page stays sharp. offset = ad time of recording t=0 (or via mark/at)."""
    def __init__(self, mp4, css_w, k0, k1, t0, t1, anchor_css, anchor_out, offset=None, mark_t=None, at=None,
                 crop_css_h=None, ss=0.0, page_bg=PAGE_BG):
        w, h = probe_wh(mp4)
        self.css_w = css_w
        self.css_h = h * css_w / w
        self.k0, self.k1, self.t0, self.t1 = k0, k1, t0, t1
        self.anchor_css, self.anchor_out, self.page_bg = anchor_css, anchor_out, page_bg
        self.dw = int(math.ceil(css_w * max(k0, k1) / 2) * 2)
        full_h = round(h * self.dw / w / 2) * 2
        self.k = self.dw / css_w                     # decoded px per CSS px
        self.dh = full_h if crop_css_h is None else min(full_h, int(math.ceil(crop_css_h * self.k / 2) * 2))
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(ss), "-i", mp4, "-vf", f"scale={self.dw}:{full_h}:flags=lanczos,crop={self.dw}:{self.dh}:0:0",
                              "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
        self.frames = np.frombuffer(raw, np.uint8).reshape(-1, self.dh, self.dw, 3)
        self.offset = offset if offset is not None else at - mark_t

    def seconds(self):
        return len(self.frames) / FPS

    def kt(self, t):
        return self.k0 * (self.k1 / self.k0) ** ease(clamp01((t - self.t0) / (self.t1 - self.t0)))

    def map(self, k):
        """out = k*css + (ox, oy)"""
        return self.anchor_out[0] - k * self.anchor_css[0], self.anchor_out[1] - k * self.anchor_css[1]

    def rect_out(self, css_rect, k):
        ox, oy = self.map(k)
        x0, y0, x1, y1 = css_rect
        return k * x0 + ox, k * y0 + oy, k * x1 + ox, k * y1 + oy

    def frame_index(self, t):
        return min(max(int(round((t - self.offset) * FPS)), 0), len(self.frames) - 1)

    def frame(self, t):
        k = self.kt(t)
        ox, oy = self.map(k)
        s = k / self.k
        return np.asarray(affine_to_out(Image.fromarray(self.frames[self.frame_index(t)]), s, s, ox, oy, fill=self.page_bg), np.float32)


# ================================================================== the reaction tile
class Tile:
    """The rounded reaction tile: navy screen, orange case ring and cream outline (the phone, in miniature), soft
    shadow. Face drawn by the rig in "full" layout on a canvas sized so the face sits centred in the tile."""
    def __init__(self, plate):
        from dash_compose import SCREEN_RGB, CREAM
        # the case orange, sampled from the plate just outside the screen (left edge, mid height)
        ys, xs = np.arange(PY0 + 200, PY0 + 360), np.arange(PX0 - 18, PX0 - 8)
        px = np.asarray(plate)[np.ix_(ys, xs)].reshape(-1, 3).astype(int)
        orange = px[(px[:, 0] > 180) & (px[:, 2] < 90)]
        assert len(orange) > 50, "case orange not found on the plate"
        self.orange = tuple(int(v) for v in np.median(orange, 0))
        ss, T, M = 4, TILE, 24                      # supersampled shapes, margin for the shadow
        self.M = M
        S_ = (T + 2 * M) * ss
        def rr(d, inset, fill):
            d.rounded_rectangle([(M + inset) * ss, (M + inset) * ss, (M + T - inset) * ss - 1, (M + T - inset) * ss - 1],
                                radius=max(1, (TILE_R - inset) * ss), fill=fill)
        col = Image.new("RGB", (S_, S_), (0, 0, 0)); dc = ImageDraw.Draw(col)
        rr(dc, 0, CREAM); rr(dc, OUTLINE, self.orange); rr(dc, OUTLINE + RING, tuple(int(v) for v in SCREEN_RGB))
        al = Image.new("L", (S_, S_), 0); rr(ImageDraw.Draw(al), 0, 255)
        sh = Image.new("L", (S_, S_), 0)
        ImageDraw.Draw(sh).rounded_rectangle([M * ss, (M + SHADOW_DY) * ss, (M + T) * ss - 1, (M + T + SHADOW_DY) * ss - 1], radius=TILE_R * ss, fill=150)
        size = (T + 2 * M, T + 2 * M)
        self.rgb = np.asarray(col.resize(size, Image.LANCZOS), np.float32)
        self.a = np.asarray(al.resize(size, Image.LANCZOS), np.float32)[..., None] / 255
        self.sh = np.asarray(sh.resize(size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(SHADOW_BLUR)), np.float32)[..., None] / 255
        inner = T - 2 * (OUTLINE + RING)
        self.inner0 = M + OUTLINE + RING
        self.fw = int(round(0.88 * inner))                                  # face U = canvas width ("full" layout)
        cy = inner / 2 - (EYE_TOP_MOUTH_MID * self.fw)                      # centre of the face span on the tile centre
        self.fh = int(round(cy / 0.42))
        self.fx = self.inner0 + (inner - self.fw) // 2
        self.inner = inner

    def bbox(self):
        """alpha bbox (incl. shadow, alpha > 1/255) in frame coords."""
        al = (self.a + self.sh * (1 - self.a))[..., 0]
        ys, xs = np.where(al > 1 / 255)
        return (TILE_X0 - self.M + xs.min(), TILE_Y0 - self.M + ys.min(), TILE_X0 - self.M + xs.max(), TILE_Y0 - self.M + ys.max())

    def layer(self, face, expr, col, mouth, blink, f, t):
        """(rgb, alpha) of the whole tile incl. shadow, size (T+2M)^2, top-left at (TILE_X0-M, TILE_Y0-M)."""
        a = face.alpha(self.fw, self.fh, "full", expr, mouth, blink, f, t)
        rgb = self.rgb.copy()
        y0, y1 = self.inner0, self.inner0 + self.inner
        fa = np.zeros(rgb.shape[:2], np.float32)
        h = min(self.fh, self.inner)
        fa[y0:y0 + h, self.fx:self.fx + self.fw] = a[:h]
        fa[y1:] = 0
        rgb = rgb * (1 - fa[..., None]) + np.asarray(col, np.float32) * fa[..., None]
        alpha = self.a + self.sh * (1 - self.a)                                # shadow under the tile
        rgb = rgb * self.a / np.maximum(alpha, 1e-6)                           # shadow is black
        return rgb, alpha


EYE_TOP_MOUTH_MID = (_df.EYE_TOP + _df.MOUTH_Y + _df.OPEN_H[3] + _df.STROKE) / 2    # face span centre (U)


# ================================================================== the camera through the screen
def scr_camera():
    """the VRD framing (Dash full face on the dashboard after the phone-layout push-in): (s, tx, ty)."""
    return SCR_OUT_S, SCR_TX, SCR_TY


class Push:
    """One camera move from a start framing (default EST: plate x1.5) through Dash's screen. The screen canvas keeps
    its phone layout (face strip on top, story below) while the story's placement morphs, in canvas space, from its
    phone-layout placement m0 (src -> canvas) to the exact full-bleed placement m1 (src -> out); at the end the
    screen mask covers the whole frame and the strip has left the top, so the last push frame equals the first
    full-bleed frame. reverse=True runs the same move backwards (pull back out to the start framing)."""
    def __init__(self, comp, m0, m1, t0, t1, cam0=None, fill=(14, 22, 37), reverse=False):
        self.comp, self.m0, self.m1, self.t0, self.t1, self.fill, self.reverse = comp, m0, m1, t0, t1, fill, reverse
        mask = (comp.MASK[..., 0] * 255).astype(np.uint8)
        self.mask_im = Image.fromarray(mask)
        self.ax, self.ay = PW / CW, PH / CH            # canvas px -> plate px
        strip_bot_plate = PY0 + STORY_Y * self.ay
        # final camera: screen centred in x, strip bottom 8 px above the frame; smallest scale whose mask covers the frame
        for s in np.arange(3.6, 6.0, 0.01):
            tx = W / 2 - s * (PX0 + PW / 2)
            ty = -8 - s * strip_bot_plate
            mo = np.asarray(affine_to_out(self.mask_im, s * self.ax, s * self.ay, s * PX0 + tx, s * PY0 + ty, resample=Image.BILINEAR))
            if mo.min() >= 254: break
        else:
            raise AssertionError("no push scale covers the frame")
        self.sF, self.txF, self.tyF = float(s), float(tx), float(ty)
        self.s0, tx0, ty0 = cam0 or (EST_S, 0.0, 0.0)
        self.v0 = ((W / 2 - tx0) / self.s0, (H / 2 - ty0) / self.s0)   # plate point at the frame centre at the start
        self.vF = ((W / 2 - tx) / s, (H / 2 - ty) / s)
        cs_x, cs_y = self.sF * self.ax, self.sF * self.ay
        cox, coy = self.sF * PX0 + self.txF, self.sF * PY0 + self.tyF
        k1, ox1, oy1 = m1                               # src -> out, pulled back through the final camera into canvas space
        self.M0 = (m0[0], m0[0], m0[1], m0[2])
        self.M1 = (k1 / cs_x, k1 / cs_y, (ox1 - cox) / cs_x, (oy1 - coy) / cs_y)

    def u(self, t):
        u = ease(clamp01((t - self.t0) / (self.t1 - self.t0)))
        return 1 - u if self.reverse else u

    def cam(self, u):
        s = self.s0 * (self.sF / self.s0) ** u
        vx = self.v0[0] + (self.vF[0] - self.v0[0]) * u
        vy = self.v0[1] + (self.vF[1] - self.v0[1]) * u
        return s, W / 2 - s * vx, H / 2 - s * vy

    def frame(self, t, src, strip_canvas):
        """src: PIL story image (the native clip frame, or a drawn 1080x1920 page); strip_canvas: (STORY_Y, CW, 3)
        float, the face strip for this frame."""
        u = self.u(t)
        s, tx, ty = self.cam(u)
        world = self.comp.world(s, tx, ty)
        csx, csy, cox, coy = s * self.ax, s * self.ay, s * PX0 + tx, s * PY0 + ty      # canvas -> out
        M0, M1 = self.M0, self.M1
        mx = M0[0] * (M1[0] / M0[0]) ** u
        my = M0[1] * (M1[1] / M0[1]) ** u
        mox = M0[2] + (M1[2] - M0[2]) * u
        moy = M0[3] + (M1[3] - M0[3]) * u
        story = affine_to_out(src, csx * mx, csy * my, csx * mox + cox, csy * moy + coy, fill=self.fill)
        story = np.asarray(story.filter(ImageFilter.UnsharpMask(**UNSHARP)), np.float32)
        st = Image.fromarray(np.clip(np.rint(strip_canvas), 0, 255).astype(np.uint8))
        st_rgb = np.asarray(affine_to_out(st, csx, csy, cox, coy, fill=(0, 0, 0)), np.float32)
        st_a = np.asarray(affine_to_out(Image.new("L", st.size, 255), csx, csy, cox, coy, fill=0, resample=Image.BILINEAR), np.float32)[..., None] / 255
        scr = story * (1 - st_a) + st_rgb * st_a
        ma = np.asarray(affine_to_out(self.mask_im, csx, csy, cox, coy, fill=0, resample=Image.BILINEAR), np.float32)[..., None] / 255
        return world * (1 - ma) + scr * ma

    def info(self):
        return dict(t0=self.t0, t1=self.t1, start_scale=self.s0, final_scale=self.sF, reverse=self.reverse)


def strip_canvas(comp, expr, col, f, t):
    """the phone-layout face strip (top STORY_Y rows of the screen canvas)."""
    return comp.face_strip(comp.blank(), expr, col, f, t)[:STORY_Y]


def dashboard_face(comp, f, t, expr, col):
    """EST / VRD: Dash full face on the dashboard (camera from comp.camera(t): EST before est_face_end, else the
    phone-layout SCR framing)."""
    return comp.frame(f, lambda tt, ff: comp.face_full(comp.blank(), expr, col, ff, tt), [], [], 1e9, None, None).astype(np.float32)


# ================================================================== per-frame finishing and encode
class Cut:
    """Owns the per-frame finishing (tile, wordmark, captions, banners) and the encode.
    The END card is a swappable tail: the body (frames before the END fade) is encoded once; the tail (fade + still
    card) is encoded from the END PNG and the saved pre-fade frames, then the two are joined by ffmpeg's concat
    demuxer (stream copy, same encoder settings, IDR at the join). Re-rendering only the card = `finish(...)`."""
    X264 = ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", str(FPS)]

    def __init__(self, comp, tile, tile_face, captions, banners, end_t, tile_state, pop_starts=(), wordmark=True):
        self.comp, self.tile, self.tile_face = comp, tile, tile_face
        self.captions, self.banners, self.end_t = captions, banners, end_t
        self.tile_state, self.pop_starts = tile_state, list(pop_starts)
        self.WM = comp.rgba("wordmark") if wordmark else None
        self.CAPS = {c["name"]: comp.rgba(c["name"]) for c in captions}
        self.fe = int(round(end_t * FPS))

    def finish_frame(self, out, f, t):
        from dash_compose import over, scaled_layer, CREAM_F, MINT_F
        st = self.tile_state(t)
        if st:
            expr, cn = st
            rgb, a = self.tile.layer(self.tile_face, expr, MINT_F if cn == "mint" else CREAM_F, self.comp.mouth[f], self.comp.blink[f], f, t)
            x, y = TILE_X0 - self.tile.M, TILE_Y0 - self.tile.M
            pops = [p for p in self.pop_starts if p <= t < p + POP]
            if pops:
                u = (t - pops[-1]) / POP
                full_rgb, full_a = np.zeros((H, W, 3), np.float32), np.zeros((H, W, 1), np.float32)
                full_rgb[y:y + rgb.shape[0], x:x + rgb.shape[1]] = rgb
                full_a[y:y + a.shape[0], x:x + a.shape[1]] = a
                rgb2, a2 = scaled_layer(full_rgb, full_a, 0.6 + 0.4 * ease(u), TILE_X0 + TILE / 2, TILE_Y0 + TILE / 2)
                over(out, rgb2, a2 * ease(u))
            else:
                over(out, rgb, a, x, y)
        if self.WM is not None: over(out, *self.WM)
        for c in self.captions:
            if c["start"] <= t < c["end"]: over(out, *self.CAPS[c["name"]])
        for bn in self.banners:
            if bn["t0"] <= t < bn["t1"]:
                u = min(1.0, (t - bn["t0"]) / 0.16)
                over(out, *scaled_layer(*bn["layer"], 0.9 + 0.1 * ease(u), *bn["center"]))
        return out

    @staticmethod
    def parts_dir(out_mp4):
        return out_mp4[:-4] + ".parts"

    def encode(self, out_mp4, base_frame, audio, total, endcard_png):
        """base_frame(f, t) -> float (H, W, 3) story/face frame; the finishing is applied here. endcard_png: the END PNG."""
        pd = self.parts_dir(out_mp4)
        os.makedirs(pd, exist_ok=True)
        nf = int(round(total * FPS))
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                                *self.X264, "-an", f"{pd}/body.mp4"], stdin=subprocess.PIPE)
        under = []
        for f in range(min(nf, self.fe + END_FADE)):
            t = f / FPS
            fr = np.clip(np.rint(self.finish_frame(base_frame(f, t), f, t)), 0, 255).astype(np.uint8)
            if f < self.fe: enc.stdin.write(fr.tobytes())
            else: under.append(fr)
            if f % 60 == 0: print("frame", f, flush=True)
        enc.stdin.close(); assert enc.wait() == 0
        np.save(f"{pd}/under.npy", np.stack(under))
        json.dump(dict(fe=self.fe, nf=nf, total=total, audio=audio, end_t=self.end_t, endcard=endcard_png), open(f"{pd}/parts.json", "w"))
        self.finish(out_mp4)

    @classmethod
    def finish(cls, out_mp4, endcard_png=None):
        """(re)build the END tail from the END PNG and join it to the body; mux the voice. Only the card re-renders."""
        pd = cls.parts_dir(out_mp4)
        p = json.load(open(f"{pd}/parts.json"))
        fe, nf, total, audio = p["fe"], p["nf"], p["total"], p["audio"]
        endcard_png = endcard_png or p.get("endcard")
        END = np.asarray(Image.open(endcard_png).convert("RGB"), np.float32)
        under = np.load(f"{pd}/under.npy").astype(np.float32)
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                                *cls.X264, "-an", f"{pd}/tail.mp4"], stdin=subprocess.PIPE)
        for f in range(fe, nf):
            k = min(1.0, (f - fe + 1) / END_FADE)
            base = under[f - fe] if f - fe < len(under) else END
            enc.stdin.write(np.clip(np.rint(base * (1 - k) + END * k), 0, 255).astype(np.uint8).tobytes())
        enc.stdin.close(); assert enc.wait() == 0
        open(f"{pd}/concat.txt", "w").write(f"file '{pd}/body.mp4'\nfile '{pd}/tail.mp4'\n")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{pd}/concat.txt", "-i", audio,
                        "-filter_complex", f"[1:a]aresample=48000,apad=whole_dur={total},atrim=0:{total}[a]",
                        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", str(total), "-movflags", "+faststart", out_mp4], check=True)
        n = int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", out_mp4],
                               capture_output=True, text=True, check=True).stdout.strip())
        assert n == nf, ("frame count after the END join", n, nf)
        p["endcard"] = endcard_png
        p["endcard_sha256"] = __import__("hashlib").sha256(open(endcard_png, "rb").read()).hexdigest()
        json.dump(p, open(f"{pd}/parts.json", "w"))
        print(f"wrote {out_mp4} (body {fe} frames + END tail {nf - fe} frames from {os.path.basename(endcard_png)})")


def rerender_endcard(ov, build):
    """Re-render only the END card overlay into ov (merging its measure entry). build(o) adds the endcard job to an
    Overlays object. Returns the new PNG path."""
    from dash_overlays import Overlays
    ov = os.path.abspath(ov)
    tmp = ov.rstrip("/") + ".endcard-tmp"
    shutil.rmtree(tmp, ignore_errors=True)
    o = Overlays(); build(o)
    assert [j["name"] for j in o.jobs] == ["endcard"], "endcard-only render"
    o.render(tmp)
    m = json.load(open(f"{ov}/measure.json")); m["endcard"] = json.load(open(f"{tmp}/measure.json"))["endcard"]
    json.dump(m, open(f"{ov}/measure.json", "w"), indent=1)
    for ext in ("png", "html"): shutil.copy(f"{tmp}/endcard.{ext}", f"{ov}/endcard.{ext}")
    shutil.rmtree(tmp)
    return f"{ov}/endcard.png"


def tdemo_job(o, label):
    """«demo business» tag on the output frame (same style as the phone-canvas tag, frame scale)."""
    from dash_overlays import E, OFF
    css = f"""#t{{position:absolute;left:{TDEMO_LEFT}px;top:{TDEMO_TOP}px;padding:5px 17px 7px;border-radius:11px;background:rgba(13,17,23,.84);
border:2px solid rgba(242,245,249,.28);font-weight:500;font-size:{TDEMO_FONT}px;line-height:1.25;color:{OFF};white-space:nowrap;unicode-bidi:isolate}}"""
    o.job("tdemo", W, H, f'<div id="t" dir="rtl" lang="he" data-m="tdemo">{E(label)}</div>', css)


def write_timeline(out_mp4, comp, cut, face_state, total, extra):
    nf = int(round(total * FPS))
    tl = dict(captions=cut.captions, mouth=comp.mouth.tolist(), db=comp.db.tolist(), blink=comp.blink.tolist(),
              face=[face_state(f / FPS)[0] if f / FPS < cut.end_t else "none" for f in range(nf)],
              banners=[dict(t0=b["t0"], t1=b["t1"], name=b["name"]) for b in cut.banners], end_t=cut.end_t, total=total)
    tl.update(extra)
    json.dump(tl, open(out_mp4.replace(".mp4", ".timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)


# ================================================================== evidence (all pauses measured on the mouth's own gate)
def gaps_from_lines(L, total):
    """between-line windows from the episode's voice windows {i: (t0, t1)}, plus the tail under the END card."""
    ks = sorted(L)
    g = [(f"L{a}|L{b}", L[a][1], L[b][0]) for a, b in zip(ks, ks[1:])]
    return g + [("after the last line (under the END card)", L[ks[-1]][1], total)]


def check_in_silence(tl, events, label):
    """every (name, t) inside a gate-silent run (-45 dB, >= 0.10 s) of the voice."""
    import dash_evidence as ev
    runs = ev.silent_runs(np.array(tl["db"]))
    ok = True
    print(f"\n== {label} inside gate-silent runs (measured on the mouth's -45 dB gate)")
    for name, t in events:
        r = next(((x, y) for x, y in runs if x <= t <= y), None)
        ok &= r is not None
        print(f"  {name:38s} {t:6.2f}s -> " + (f"in {r[0]:.2f}-{r[1]:.2f}s" if r else "NOT in a pause"))
    return ok


def check_span_in_silence(tl, spans, label):
    """every (name, t0, t1) wholly inside one gate-silent run (e.g. a pull-out and its screen swap)."""
    import dash_evidence as ev
    runs = ev.silent_runs(np.array(tl["db"]))
    ok = True
    print(f"\n== {label} wholly inside one gate-silent run")
    for name, a, b in spans:
        r = next(((x, y) for x, y in runs if x <= a and b <= y), None)
        ok &= r is not None
        print(f"  {name:38s} {a:6.2f}-{b:6.2f}s -> " + (f"in {r[0]:.2f}-{r[1]:.2f}s" if r else "NOT inside one pause"))
    return ok


def tile_evidence(tile, measure, ov, cards, mp4, sample_ts, extra_names=("banner",)):
    gx0, gy0, gx1, gy1 = GOOGLE_SAFE
    print("\n== reaction tile vs the safe box, wordmark and captions (alpha bbox of the tile layer incl. its shadow, alpha > 1/255)")
    tb = tile.bbox()
    print(f"  tile x{TILE_X0}-{TILE_X0 + TILE - 1} y{TILE_Y0}-{TILE_Y0 + TILE - 1} ({TILE / W:.0%} of the frame width); alpha bbox incl. shadow x{tb[0]}-{tb[2]} y{tb[1]}-{tb[3]}")
    assert tb[0] >= gx0 and tb[2] <= gx1 and tb[1] >= gy0 and tb[3] <= gy1, "tile leaves the safe box"
    wm = measure["wordmark"]["els"]["wordmark"]
    assert wm["right"] < tb[0], "tile touches the wordmark"
    tops = {}
    for n in [c["name"] for c in cards] + list(extra_names):
        al = np.asarray(Image.open(f"{ov}/{n}.png").convert("RGBA"))[..., 3]
        tops[n] = int(np.where(al > 0)[0].min())
    lowest = min(tops.values())
    print(f"  wordmark right edge x{wm['right']:.0f} < tile x{tb[0]};  tile bottom y{tb[3]} < highest caption/banner top y{lowest}")
    assert tb[3] < lowest
    import dash_evidence as ev
    for t in sample_ts:
        fr = ev.grab(mp4, t).astype(int)
        print(f"  t={t:5.2f}s tile edge pixel {fr[TILE_Y0 + TILE // 2, TILE_X0 + 3].tolist()} (cream outline / orange ring)")
    return tb


def seam(mp4, t_last, t_first, label):
    import dash_evidence as ev
    fa, fb = ev.grab(mp4, t_last).astype(int), ev.grab(mp4, t_first).astype(int)
    d = np.abs(fa - fb).mean()
    print(f"  {label} seam ({t_last:.3f}s vs {t_first:.3f}s): mean |diff| {d:.2f}")
    return d


def endcard_parts(mp4):
    p = json.load(open(Cut.parts_dir(mp4) + "/parts.json"))
    print(f"\n== END card is a swappable tail: body {p['fe']} frames + tail {p['nf'] - p['fe']} frames; card PNG {os.path.basename(p['endcard'])} sha256 {p['endcard_sha256'][:16]}…")
    print("  swap: re-render only the endcard overlay, then Cut.finish(mp4) rebuilds the tail and re-joins (body untouched)")
    return p


def data_clients_clean():
    gs = subprocess.run(["git", "status", "--short", "data/clients/"], cwd=ROOT, capture_output=True, text=True).stdout
    print("\n== data/clients untouched")
    print("  git status --short data/clients/:", repr(gs) if gs else "(empty)")
    assert gs == ""


# ================================================================== Ads Bot END card v2 checks
def stamp_lines(png, el):
    """ink rows of the stamp element on the END card PNG -> [(y0, y1, x0, x1)] per rendered line."""
    a = np.asarray(Image.open(png).convert("RGB")).astype(int)
    y0, y1, x0, x1 = int(el["top"]), int(math.ceil(el["bottom"])), int(el["left"]), int(math.ceil(el["right"]))
    reg = np.abs(a[y0:y1, x0:x1] - np.array([13, 17, 23])).sum(2) > 60
    rows = np.where(reg.any(1))[0]
    lines, st = [], None
    for i, r in enumerate(rows):
        if st is None: st = r
        if i + 1 == len(rows) or rows[i + 1] - r > 6:
            xs = np.where(reg[st:r + 1].any(0))[0]
            lines.append((y0 + st, y0 + r, x0 + xs.min(), x0 + xs.max())); st = None
    return lines


def endcard_v2_evidence(m, ov):
    gx0, gy0, gx1, gy1 = GOOGLE_SAFE
    print("\n== END card v2 (Ads Bot, Set 1): 2-line stamp balance, button fit")
    st = m["endcard"]["els"]["stamp"]
    ls = stamp_lines(f"{ov}/endcard.png", st)
    for i, (a, b, x0, x1) in enumerate(ls):
        print(f"  stamp line {i + 1}: ink x{x0}-{x1} ({x1 - x0 + 1} px) y{a}-{b}")
    w = [x1 - x0 + 1 for a, b, x0, x1 in ls]
    ratio = min(w) / max(w)
    print(f"  stamp: {len(ls)} lines (text-wrap: balance), shorter/longer = {ratio:.2f}")
    assert len(ls) == 2 and ratio >= 0.6, "stamp must wrap to 2 balanced lines"
    c = m["endcard"]["els"]["cta"]
    a = np.asarray(Image.open(f"{ov}/endcard.png").convert("RGB")).astype(int)
    y0, y1, x0, x1 = int(c["top"]), int(math.ceil(c["bottom"])), int(c["left"]), int(math.ceil(c["right"]))
    ink = (np.abs(a[y0:y1, x0:x1] - np.array([13, 17, 23])).sum(2) < 120)       # navy text on the mint pill
    rows = np.where(ink.sum(1) > 2)[0]
    text_lines = 1 + int((np.diff(rows) > 6).sum()) if len(rows) else 0
    one_line = text_lines == 1
    inside = c["left"] >= gx0 and c["right"] <= gx1 + 1
    print(f"  CTA button x{c['left']:.0f}-{c['right']:.0f} ({c['right'] - c['left']:.0f} px of the {gx1 - gx0 + 1} px safe width), height {c['bottom'] - c['top']:.0f} px, text lines inside the pill: {text_lines}, inside: {inside}")
    assert one_line and inside
