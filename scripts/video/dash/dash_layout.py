"""Shared Dash-ad geometry (output 1080x1920, 30 fps), from the S1-15 pilot's safe-zone pass. No Hebrew here.
Episode timings live in the episode's own module."""
from dash_paths import ROOT as _ROOT

W, H, FPS = 1080, 1920, 30

# Cab plate (S5br frozen frame, 720x1280): the navy screen's bounding box
PLATE_SRC = f"{_ROOT}/scratch/video-dash/wan-consistency/shots/S5br.mp4"
PLATE_T = 2.0
PX0, PY0, PW, PH = 212, 345, 310, 557
EST_S = 1.5                     # plate -> output scale in EST (fills 1080x1920)
SCR_S = 1.95                    # screen-canvas build resolution
CW, CH = round(PW * SCR_S), round(PH * SCR_S)   # screen canvas = 604 x 1086
# Final framing after the push-in. 1.79 is the smallest scale at which the plate still covers the full 1920 px
# height with the screen top at 247 (top + 935*s >= 1920).
SCR_OUT_S = 1.79
SCR_OUT_TOP = 247
SCR_OUT_CX = 480                # screen centre x, near the caption centre (Google safe box centre x = 467.5)
OUT_W, OUT_H = round(PW * SCR_OUT_S), round(PH * SCR_OUT_S)
OUT_X0 = round(SCR_OUT_CX - OUT_W / 2)
SCR_TX = OUT_X0 - PX0 * SCR_OUT_S
SCR_TY = SCR_OUT_TOP - PY0 * SCR_OUT_S
assert SCR_TY + 1280 * SCR_OUT_S >= 1920 and SCR_TX <= 0 and SCR_TX + 720 * SCR_OUT_S >= 1080, "plate must cover the frame"
STRIP_H = 140                   # face strip, top band of the screen canvas
STORY_Y = STRIP_H               # story area: y 140 .. CH
STORY_H = CH - STORY_Y          # 946

# story clips (wan, 720x1280) inside the canvas
CLIP_K = CW / 720.0

# Google Ads 9:16 safe zone (help article 13547298, vertical overlay PNG measured 2026-11-14)
GOOGLE_SAFE = (48, 288, 887, 1247)           # x0, y0, x1, y1 inclusive
CAP_BOTTOM = 1240                            # caption cards and banner sit on this line (7 px inside the safe box)
CAP_TOP_OUT = 1093                           # top of a caption card (measured on the S1-15 PNGs)
# canvas y below which the caption band covers the screen (after the push-in)
CAP_COVER_CANVAS_Y = (CAP_TOP_OUT - SCR_OUT_TOP) * CH / OUT_H
