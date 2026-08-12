#!/usr/bin/env python3
"""
gen_module3_4_thumbnails.py -- Gate 6 thumbnail generator for Module 3 (lessons
11-14) and Module 4 (lessons 15-18).

Follows the Gate 6 spec in .agents/skills/course-production/SKILL.md exactly,
using the website-lesson-1.jpg layout as the reference (left headline, right
neon icon, gold pill bottom-left, teal WAO bottom-right) -- same structure as
scripts/gen_module5_thumbnails.py (lessons 6-10), which this script does not
modify.

Bidi fix (Maya, ux -- APPROVED WITH CHANGES):
- Uses `from bidi import get_display` (new isolate-aware API), NOT the legacy
  `from bidi.algorithm import get_display`, which has no isolate support and
  raises `AssertionError: LRI not allowed here` once Latin runs are wrapped
  in isolate marks.
- Every string passed through rtl() is first passed through isolate_latin(),
  which wraps Latin tokens (e.g. "AI", "SEO") in U+2066/U+2069 (LRI/PDI)
  isolate marks before bidi reordering, per Maya's "apply uniformly" note --
  this covers headlines AND the badge text.

Usage: python3 scripts/gen_module3_4_thumbnails.py
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
    at (x, y) top-left, `size` px square. No SVG rasterizer (cairosvg) is
    installed in this environment, so the mark is redrawn natively in Pillow
    from the same source coordinates (viewBox 0 0 32 32) instead of rasterizing
    the SVG file directly."""
    scale = size / 32.0
    radius = 7 * scale
    draw.rounded_rectangle(
        [x, y, x + size, y + size], radius=radius, fill=(6, 7, 9)
    )
    pts = [(7, 17), (13.5, 23), (26, 8)]
    scaled = [(x + px * scale, y + py * scale) for px, py in pts]
    width = max(2, round(5.2 * scale))
    draw.line(scaled, fill=TEAL, width=width, joint="curve")
    # round off the line caps
    r = width / 2
    for px, py in scaled:
        draw.ellipse([px - r, py - r, px + r, py + r], fill=TEAL)


# ---------------------------------------------------------------------------
# Icons (Dana, brand-designer -- final code, teal/gold line-art, no raster text)
# ---------------------------------------------------------------------------

def icon_speech_magnifier(d, s):
    c = s // 2
    bw, bh = int(s * 0.46), int(s * 0.34)
    bx, by = c - bw // 2, c - int(s * 0.28)
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=18, outline=TEAL, width=8)
    d.polygon([(bx + bw * 0.25, by + bh), (bx + bw * 0.15, by + bh + 30), (bx + bw * 0.45, by + bh)], outline=TEAL, width=6)
    mx, my, mr = c + int(s * 0.10), c + int(s * 0.12), int(s * 0.14)
    d.ellipse([mx - mr, my - mr, mx + mr, my + mr], outline=GOLD, width=7)
    d.line([mx + int(mr * 0.7), my + int(mr * 0.7), mx + mr + 34, my + mr + 34], fill=GOLD, width=8)


def icon_headline_podium(d, s):
    c = s // 2
    pw, ph = int(s * 0.40), int(s * 0.52)
    px, py = c - pw // 2 - 20, c - ph // 2
    d.rounded_rectangle([px, py, px + pw, py + ph], radius=12, outline=TEAL, width=7)
    for i, w in enumerate([0.75, 0.55, 0.65]):
        ly = py + 30 + i * 34
        d.line([px + 16, ly, px + 16 + pw * w, ly], fill=TEAL, width=6)
    bx, by, br = px + pw + 30, py + 10, int(s * 0.11)
    d.ellipse([bx - br, by - br, bx + br, by + br], outline=GOLD, width=7)
    d.line([bx, by + br, bx, by + br + 26], fill=GOLD, width=7)
    d.line([bx - 20, by, bx + 20, by - int(s * 0.16)], fill=GOLD, width=6)


def icon_heading_scan(d, s):
    c = s // 2
    pw, ph = int(s * 0.42), int(s * 0.52)
    px, py = c - pw // 2, c - ph // 2
    d.rounded_rectangle([px, py, px + pw, py + ph], radius=12, outline=TEAL, width=7)
    d.line([px + 16, py + 28, px + pw - 16, py + 28], fill=GOLD, width=9)
    for i, w in enumerate([0.7, 0.5, 0.6]):
        ly = py + 66 + i * 30
        d.line([px + 16, ly, px + 16 + (pw - 32) * w, ly], fill=TEAL, width=4)
    d.ellipse([px - 22, py + 18, px - 2, py + 38], outline=GOLD, width=5)
    d.line([px - 12, py + 28, px + 8, py + 28], fill=GOLD, width=3)


def icon_page_split(d, s):
    c = s // 2
    d.rounded_rectangle([c - 170, c - 60, c - 110, c + 60], radius=10, outline=TEAL, width=7)
    d.line([c - 150, c - 30, c - 130, c - 30], fill=TEAL, width=4)
    d.line([c - 150, c - 10, c - 130, c - 10], fill=TEAL, width=4)
    targets = [(c + 40, c - 90), (c + 60, c + 5), (c + 40, c + 95)]
    for tx, ty in targets:
        d.rounded_rectangle([tx, ty - 35, tx + 60, ty + 35], radius=8, outline=GOLD, width=6)
        d.line([(c - 108, c), (tx, ty)], fill=GOLD, width=4)


def icon_ai_spark_bubble(d, s):
    c = s // 2
    r = int(s * 0.30)
    d.rounded_rectangle([c - r, c - r + 10, c + r, c + int(r * 0.55) + 10], radius=26, outline=TEAL, width=8)
    d.polygon([(c - 30, c + int(r * 0.55) + 10), (c - 50, c + int(r * 0.55) + 40), (c - 5, c + int(r * 0.55) + 10)], outline=TEAL, width=6)
    sx, sy, sr = c, c - 20, int(s * 0.13)
    d.line([sx, sy - sr, sx, sy + sr], fill=GOLD, width=7)
    d.line([sx - sr, sy, sx + sr, sy], fill=GOLD, width=7)
    d.line([sx - sr * 0.6, sy - sr * 0.6, sx + sr * 0.6, sy + sr * 0.6], fill=GOLD, width=5)
    d.line([sx - sr * 0.6, sy + sr * 0.6, sx + sr * 0.6, sy - sr * 0.6], fill=GOLD, width=5)


def icon_faq_pair(d, s):
    c = s // 2
    d.rounded_rectangle([c - 130, c - 90, c + 30, c + 10], radius=20, outline=TEAL, width=7)
    # hand-drawn "?" -- arc + dot, teal, centered in the left bubble
    qx, qy = c - 50, c - 40
    d.arc([qx - 22, qy - 26, qx + 22, qy + 6], start=200, end=430, fill=TEAL, width=7)
    d.line([qx, qy + 6, qx, qy + 16], fill=TEAL, width=7)
    d.ellipse([qx - 4, qy + 26, qx + 4, qy + 34], fill=TEAL)
    d.rounded_rectangle([c - 10, c - 10, c + 150, c + 90], radius=20, outline=GOLD, width=7)
    d.line([c + 40, c + 40, c + 65, c + 65], fill=GOLD, width=8)
    d.line([c + 65, c + 65, c + 110, c + 20], fill=GOLD, width=8)


def icon_answer_target(d, s):
    c = s // 2
    for i, w in enumerate([70, 100, 55]):
        ly = c - 30 + i * 30
        d.line([c - w // 2, ly, c + w // 2, ly], fill=TEAL, width=8)
    r = int(s * 0.34)
    d.ellipse([c - r, c - r, c + r, c + r], outline=GOLD, width=6)
    d.ellipse([c - r + 20, c - r + 20, c + r - 20, c + r - 20], outline=GOLD, width=4)


def icon_schema_overtake(d, s):
    c = s // 2
    d.line([c - 90, c - 40, c - 130, c, c - 90, c + 40], fill=TEAL, width=7, joint="curve")
    d.line([c + 10, c - 50, c + 60, c, c + 10, c + 50], fill=GOLD, width=9, joint="curve")
    # hand-drawn "</>" glyph, gold, near (c+70, c-18): open angle, slash, close angle
    gx, gy = c + 70, c - 18
    d.line([gx - 14, gy - 12, gx - 24, gy, gx - 14, gy + 12], fill=GOLD, width=6, joint="curve")
    d.line([gx - 4, gy + 16, gx + 6, gy - 16], fill=GOLD, width=6)
    d.line([gx + 16, gy - 12, gx + 26, gy, gx + 16, gy + 12], fill=GOLD, width=6, joint="curve")


LESSONS = [
    {
        "n": 11, "module": 3,
        "headline": "כתוב בשפה שלו. לא בשלך",
        "icon": icon_speech_magnifier,
    },
    {
        "n": 12, "module": 3,
        "headline": "כותרת אחת. עמוד ראשון או כלום",
        "icon": icon_headline_podium,
    },
    {
        "n": 13, "module": 3,
        "headline": "גוגל קורא רק את הכותרות",
        "icon": icon_heading_scan,
    },
    {
        "n": 14, "module": 3,
        "headline": "עמוד לכל שירות. חשיפה כפולה",
        "icon": icon_page_split,
    },
    {
        "n": 15, "module": 4,
        "headline": "הלקוח שואל. גוגל עונה. זה אתה",
        "icon": icon_ai_spark_bubble,
    },
    {
        "n": 16, "module": 4,
        "headline": "שאלות ותשובות. מכאן גוגל מצטט",
        "icon": icon_faq_pair,
    },
    {
        "n": 17, "module": 4,
        "headline": "שלושה משפטים. גוגל בוחר להציג",
        "icon": icon_answer_target,
    },
    {
        "n": 18, "module": 4,
        "headline": "המתחרה כבר מצוטט. עקוף אותו",
        "icon": icon_schema_overtake,
    },
]


def build_thumbnail(lesson):
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
    # Line-count ceiling guard (Maya approved as-is): retry once with a
    # smaller headline font if the wrap produced more than 2 lines.
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

    # module | lesson label
    draw.text(
        (right_x, div_y + 24),
        rtl(f"שיעור {lesson['n']} | מודול {lesson['module']}"),
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

    # gold pill badge bottom-left
    badge_text = rtl("קורס בניה + קידום אתרים עם AI")
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

    out_path = OUT_DIR / f"website-lesson-{lesson['n']}.jpg"
    img.save(str(out_path), "JPEG", quality=92)
    print(f"Saved {out_path} ({img.size[0]}x{img.size[1]})")


def _test_bidi_latin_hebrew_boundary():
    """Regression test for Maya's flagged edge case: a Latin token immediately
    followed by a Hebrew word, e.g. 'AI-מבוסס'. Must not raise and must
    produce isolate-wrapped output (not a silent no-op)."""
    sample = "פתרון AI-מבוסס לעסק שלך"
    isolated = isolate_latin(sample)
    assert LRI in isolated and PDI in isolated, "isolate_latin did not wrap the Latin token"
    result = rtl(sample)
    assert result, "rtl() returned empty output for Latin/Hebrew boundary case"
    print(f"Bidi test OK: {sample!r} -> isolated={isolated!r}")


if __name__ == "__main__":
    _test_bidi_latin_hebrew_boundary()

    # Lesson 11 was approved by the coordinator (Adam) after pixel-diff /
    # headless-Chrome RTL ground-truth verification. Render the full batch
    # (11-18) using the same confirmed pipeline.
    for lesson in LESSONS:
        build_thumbnail(lesson)
