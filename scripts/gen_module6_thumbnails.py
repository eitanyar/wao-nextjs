#!/usr/bin/env python3
"""
gen_module6_thumbnails.py -- Gate 6 thumbnail generator for Module 6 (lessons
19-21) and the pinned Module 0 brand asset (website-lesson-0).

Follows the Gate 6 spec in .agents/skills/course-production/SKILL.md exactly,
using the website-lesson-1.jpg layout as the reference (left headline, right
neon icon, gold pill bottom-left, teal WAO bottom-right) -- same structure and
bidi technique as scripts/gen_module3_4_thumbnails.py (lessons 11-18), which
this script does not modify.

Bidi: uses the isolate-aware `from bidi import get_display` API + Maya's
isolate_latin() helper (LRI/PDI marks around Latin runs) so Latin tokens like
"AI" don't bidi-swap against adjacent Hebrew.

Usage: python3 scripts/gen_module6_thumbnails.py
"""
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from bidi import get_display

REPO = Path(__file__).parent.parent
OUT_DIR = REPO / "public" / "media" / "thumbnails"

W, H = 1280, 720
BG       = (11, 15, 25)     # #0b0f19
TEAL     = (74, 227, 181)   # #4ae3b5
GOLD     = (255, 208, 0)    # #ffd000
WHITE    = (238, 233, 226)  # #eee9e2
BADGE_BG = (19, 22, 32)     # #131620

FONT_DIR = "/usr/share/fonts/truetype/dejavu"

LRI = "⁦"  # LEFT-TO-RIGHT ISOLATE
PDI = "⁩"  # POP DIRECTIONAL ISOLATE


def isolate_latin(text: str) -> str:
    """Wrap Latin runs (e.g. 'AI', 'SEO', 'website.co.il') in LRI/PDI isolate
    marks so they don't bidi-swap against adjacent Hebrew when reordered."""
    return re.sub(r"[A-Za-z][A-Za-z0-9\.\-]*", lambda m: f"{LRI}{m.group(0)}{PDI}", text)


def rtl(text: str) -> str:
    return get_display(isolate_latin(text), base_dir="R")


def load_font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"{FONT_DIR}/{name}", size)


def wrap_headline(draw, text, font, max_width):
    """Greedy word-wrap for RTL headline (words split on spaces, logical order).
    If the wrapped result exceeds 2 lines, the caller retries with a smaller
    font (see build_thumbnail) -- this function itself just wraps at the
    given font size."""
    words = text.split(" ")
    lines, cur = [], []
    for w in words:
        trial = " ".join(cur + [w])
        bbox = draw.textbbox((0, 0), rtl(trial), font=font)
        if bbox[2] - bbox[0] <= max_width or not cur:
            cur.append(w)
        else:
            lines.append(" ".join(cur))
            cur = [w]
    if cur:
        lines.append(" ".join(cur))
    return lines


def draw_background(draw):
    for x in range(0, W, 80):
        draw.line([(x, 0), (x, H)], fill=(25, 33, 52), width=1)
    for y in range(0, H, 80):
        draw.line([(0, y), (W, y)], fill=(25, 33, 52), width=1)


def neon_icon_layer(draw_fn, size=420, glow_color=TEAL):
    """Render an icon on a transparent layer with a neon glow, via a callback
    that draws the icon shape onto a given ImageDraw at full opacity."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    draw_fn(d, size)
    glow = layer.filter(ImageFilter.GaussianBlur(14))
    combined = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    combined = Image.alpha_composite(combined, glow)
    combined = Image.alpha_composite(combined, layer)
    return combined


def draw_favicon_mark(draw, x, y, size):
    """Hand-drawn re-render of public/favicon.svg (rounded square + checkmark)
    at (x, y) top-left, `size` px square."""
    scale = size / 32.0
    radius = 7 * scale
    draw.rounded_rectangle(
        [x, y, x + size, y + size], radius=radius, fill=(6, 7, 9)
    )
    pts = [(7, 17), (13.5, 23), (26, 8)]
    scaled = [(x + px * scale, y + py * scale) for px, py in pts]
    width = max(2, round(5.2 * scale))
    draw.line(scaled, fill=TEAL, width=width, joint="curve")
    r = width / 2
    for px, py in scaled:
        draw.ellipse([px - r, py - r, px + r, py + r], fill=TEAL)


# ---------------------------------------------------------------------------
# Icons -- Module 6 (chat-update, maintenance, hand-off) + Module 0 (mic/AI)
# ---------------------------------------------------------------------------

def icon_chat_edit(d, s):
    """Speech bubble with a pencil accent -- 'update the site via chat'."""
    c = s // 2
    bw, bh = int(s * 0.48), int(s * 0.36)
    bx, by = c - bw // 2 - 10, c - int(s * 0.22)
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=22, outline=TEAL, width=8)
    d.polygon(
        [(bx + bw * 0.22, by + bh), (bx + bw * 0.12, by + bh + 32), (bx + bw * 0.42, by + bh)],
        outline=TEAL, width=6,
    )
    # three "typing" dots inside the bubble
    for i in range(3):
        dx = bx + bw * 0.28 + i * bw * 0.22
        dy = by + bh * 0.5
        d.ellipse([dx - 6, dy - 6, dx + 6, dy + 6], fill=TEAL)
    # pencil, bottom-right of the bubble
    px0, py0 = c + int(s * 0.10), c + int(s * 0.14)
    px1, py1 = px0 + int(s * 0.20), py0 + int(s * 0.20)
    d.line([px0, py0, px1, py1], fill=GOLD, width=10)
    d.polygon([(px1, py1), (px1 + 10, py1 + 22), (px1 - 12, py1 + 10)], fill=GOLD)
    d.ellipse([px0 - 8, py0 - 8, px0 + 8, py0 + 8], outline=GOLD, width=5)


def icon_calendar_check(d, s):
    """Calendar with a checkmark -- 'monthly maintenance, quarter of an hour'."""
    c = s // 2
    cw, ch = int(s * 0.46), int(s * 0.42)
    cx, cy = c - cw // 2, c - ch // 2 + 10
    d.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=16, outline=TEAL, width=8)
    d.line([cx, cy + int(ch * 0.28), cx + cw, cy + int(ch * 0.28)], fill=TEAL, width=6)
    # binder rings
    for rx in (cx + cw * 0.28, cx + cw * 0.72):
        d.line([rx, cy - 18, rx, cy + 14], fill=GOLD, width=7)
    # grid dots (a few weeks)
    for row in range(2):
        for col in range(3):
            gx = cx + cw * 0.22 + col * cw * 0.28
            gy = cy + ch * 0.5 + row * ch * 0.24
            d.ellipse([gx - 5, gy - 5, gx + 5, gy + 5], fill=(120, 130, 150))
    # big gold checkmark, bottom-right, slightly overlapping
    qx, qy = c + int(s * 0.14), c + int(s * 0.16)
    d.line([qx - 26, qy, qx - 6, qy + 20], fill=GOLD, width=11)
    d.line([qx - 6, qy + 20, qx + 34, qy - 24], fill=GOLD, width=11)


def icon_signpost(d, s):
    """Forked signpost -- 'when to stop doing it alone / hand off'."""
    c = s // 2
    pole_x = c - 10
    d.line([pole_x, c - int(s * 0.30), pole_x, c + int(s * 0.34)], fill=TEAL, width=9)
    # two arrow signs pointing opposite ways
    d.rounded_rectangle(
        [pole_x - 4, c - int(s * 0.24), pole_x + int(s * 0.30), c - int(s * 0.24) + 44],
        radius=8, outline=TEAL, width=7,
    )
    d.polygon(
        [(pole_x + int(s * 0.30), c - int(s * 0.24)),
         (pole_x + int(s * 0.30) + 26, c - int(s * 0.24) + 22),
         (pole_x + int(s * 0.30), c - int(s * 0.24) + 44)],
        fill=TEAL,
    )
    d.rounded_rectangle(
        [pole_x - int(s * 0.30), c - int(s * 0.04), pole_x + 4, c - int(s * 0.04) + 44],
        radius=8, outline=GOLD, width=7,
    )
    d.polygon(
        [(pole_x - int(s * 0.30), c - int(s * 0.04)),
         (pole_x - int(s * 0.30) - 26, c - int(s * 0.04) + 22),
         (pole_x - int(s * 0.30), c - int(s * 0.04) + 44)],
        fill=GOLD,
    )
    d.ellipse([pole_x - 12, c + int(s * 0.30), pole_x + 12, c + int(s * 0.30) + 24], fill=TEAL)


def icon_mic_ai(d, s):
    """Microphone with an AI spark -- Module 0: the AI voice behind the course."""
    c = s // 2
    mw = int(s * 0.16)
    mx, my = c - int(s * 0.06), c - int(s * 0.10)
    d.rounded_rectangle([mx - mw, my - int(s * 0.24), mx + mw, my + int(s * 0.10)], radius=mw, outline=TEAL, width=8)
    d.arc(
        [mx - mw - 22, my - int(s * 0.10), mx + mw + 22, my + int(s * 0.28)],
        start=20, end=160, fill=TEAL, width=7,
    )
    d.line([mx, my + int(s * 0.28), mx, my + int(s * 0.40)], fill=TEAL, width=7)
    d.line([mx - 30, my + int(s * 0.40), mx + 30, my + int(s * 0.40)], fill=TEAL, width=7)
    # AI spark, top-right of the mic
    sx, sy, sr = c + int(s * 0.22), c - int(s * 0.26), int(s * 0.13)
    d.line([sx, sy - sr, sx, sy + sr], fill=GOLD, width=7)
    d.line([sx - sr, sy, sx + sr, sy], fill=GOLD, width=7)
    d.line([sx - sr * 0.6, sy - sr * 0.6, sx + sr * 0.6, sy + sr * 0.6], fill=GOLD, width=5)
    d.line([sx - sr * 0.6, sy + sr * 0.6, sx + sr * 0.6, sy - sr * 0.6], fill=GOLD, width=5)


# Module 0 ("לפני שנתחיל") is a shared brand-positioning intro, pinned ahead of
# Lesson 1 in every AI-narrated course. Its narration/slides are already
# course-agnostic (see docs/scripts/website-course/M0-intro-ai-disclosure.md),
# but the thumbnail's gold badge names one specific course -- so for Module 0
# we render one thumbnail PER COURSE below, each with that course's own badge
# text and its own slug prefix, instead of a single hardcoded website-course
# badge. Add a new entry here whenever another course adopts this intro.
COURSES = {
    "website-course": {
        "badge": "קורס בניה + קידום אתרים עם AI",
        "slug_prefix": "website",
    },
    "google-ads-course": {
        "badge": "קורס Google Ads עם AI",
        "slug_prefix": "google-ads",
    },
}

DEFAULT_COURSE = "website-course"

LESSONS = [
    {
        "n": 19, "module": 6,
        "headline": "לעדכן את האתר? זו רק הודעה",
        "icon": icon_chat_edit,
    },
    {
        "n": 20, "module": 6,
        "headline": "רבע שעה בחודש שומרת הכל",
        "icon": icon_calendar_check,
    },
    {
        "n": 21, "module": 6,
        "headline": "מתי כדאי להפסיק לעשות לבד",
        "icon": icon_signpost,
    },
    {
        "n": 0, "module": 0,
        "headline": "מי בעצם מדבר אליך",
        "icon": icon_mic_ai,
        "label": "לפני שנתחיל",
        "shared_across_courses": True,
    },
]


def build_thumbnail(lesson, course=DEFAULT_COURSE):
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw_background(draw)

    f_headline = load_font(58, bold=True)
    f_label = load_font(28, bold=False)
    f_badge = load_font(24, bold=True)
    f_wao = load_font(34, bold=True)

    left_x = 60
    max_text_width = 560

    lines = wrap_headline(draw, lesson["headline"], f_headline, max_text_width)
    # Line-count ceiling guard: retry once with a smaller headline font if the
    # wrap produced more than 2 lines.
    if len(lines) > 2:
        f_headline = load_font(50, bold=True)
        lines = wrap_headline(draw, lesson["headline"], f_headline, max_text_width)

    right_x = left_x + max_text_width
    y = 220
    for line in lines:
        draw.text((right_x, y), rtl(line), font=f_headline, fill=WHITE, anchor="ra")
        y += 68

    # teal divider
    div_y = y + 20
    draw.rectangle([(left_x, div_y), (left_x + max_text_width, div_y + 3)], fill=TEAL)

    # module | lesson label -- Module 0 is pinned, not a numbered lesson
    label = lesson.get("label")
    label_text = f"{label} | מודול {lesson['module']}" if label else f"שיעור {lesson['n']} | מודול {lesson['module']}"
    draw.text(
        (right_x, div_y + 24),
        rtl(label_text),
        font=f_label, fill=TEAL, anchor="ra",
    )

    # icon on the right, neon glow
    icon_layer = neon_icon_layer(lesson["icon"], size=420)
    img_rgba = img.convert("RGBA")
    icon_x = W - 420 - 90
    icon_y = (H - 420) // 2 - 20
    img_rgba.alpha_composite(icon_layer, (icon_x, icon_y))
    img = img_rgba.convert("RGB")
    draw = ImageDraw.Draw(img)

    # gold pill badge bottom-left -- names the course this thumbnail belongs to
    badge_text = rtl(COURSES[course]["badge"])
    bbox = draw.textbbox((0, 0), badge_text, font=f_badge)
    pad_x, pad_y = 26, 14
    badge_w = (bbox[2] - bbox[0]) + pad_x * 2
    badge_h = (bbox[3] - bbox[1]) + pad_y * 2
    badge_x0, badge_y0 = 60, H - 70 - badge_h // 2
    draw.rounded_rectangle(
        [(badge_x0, badge_y0), (badge_x0 + badge_w, badge_y0 + badge_h)],
        radius=badge_h // 2, outline=GOLD, width=2, fill=BADGE_BG,
    )
    draw.text(
        (badge_x0 + badge_w // 2, badge_y0 + badge_h // 2),
        badge_text, font=f_badge, fill=GOLD, anchor="mm",
    )

    # WAO bottom-right, teal, never white -- favicon mark placed immediately
    # left of the wordmark, vertically centered, ~8px gap.
    wao_text = "WAO"
    wao_bbox = draw.textbbox((0, 0), wao_text, font=f_wao)
    wao_w = wao_bbox[2] - wao_bbox[0]
    wao_x = W - 60
    wao_y = H - 70
    draw.text((wao_x, wao_y), wao_text, font=f_wao, fill=TEAL, anchor="rm")

    mark_size = 30
    gap = 8
    mark_x = wao_x - wao_w - gap - mark_size
    mark_y = wao_y - mark_size // 2
    draw_favicon_mark(draw, mark_x, mark_y, mark_size)

    slug_prefix = COURSES[course]["slug_prefix"]
    out_path = OUT_DIR / f"{slug_prefix}-lesson-{lesson['n']}.jpg"
    img.save(str(out_path), "JPEG", quality=92)
    print(f"Saved {out_path} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    for lesson in LESSONS:
        if lesson.get("shared_across_courses"):
            for course in COURSES:
                build_thumbnail(lesson, course=course)
        else:
            build_thumbnail(lesson)
