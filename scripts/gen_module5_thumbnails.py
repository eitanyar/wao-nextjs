#!/usr/bin/env python3
"""
gen_module5_thumbnails.py -- Gate 6 thumbnail generator for Module 5 lessons (6-10).

Follows the Gate 6 spec in .agents/skills/course-production/SKILL.md exactly,
using the website-lesson-1.jpg layout as the reference (left headline, right
neon icon, gold pill bottom-left, teal WAO bottom-right).

Usage: python3 scripts/gen_module5_thumbnails.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from bidi.algorithm import get_display

REPO = Path(__file__).parent.parent
OUT_DIR = REPO / "public" / "media" / "thumbnails"

W, H = 1280, 720
BG       = (11, 15, 25)     # #0b0f19
TEAL     = (74, 227, 181)   # #4ae3b5
GOLD     = (255, 208, 0)    # #ffd000
WHITE    = (238, 233, 226)  # #eee9e2
BADGE_BG = (19, 22, 32)     # #131620

FONT_DIR = "/usr/share/fonts/truetype/dejavu"


def rtl(text: str) -> str:
    return get_display(text, base_dir="R")


def load_font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"{FONT_DIR}/{name}", size)


def wrap_headline(draw, text, font, max_width):
    """Greedy word-wrap for RTL headline (words split on spaces, logical order)."""
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


def icon_globe_link(d, s):
    c = s // 2
    r = int(s * 0.30)
    d.ellipse([c - r, c - r, c + r, c + r], outline=TEAL, width=8)
    d.line([c - r, c, c + r, c], fill=TEAL, width=6)
    d.arc([c - r // 2, c - r, c + r // 2, c + r], start=0, end=360, fill=TEAL, width=6)
    # small link/chain accent bottom-right
    lw = int(s * 0.14)
    lx, ly = c + int(r * 0.55), c + int(r * 0.85)
    d.rounded_rectangle([lx - lw, ly - lw // 2, lx + lw // 2, ly + lw], radius=lw // 2, outline=GOLD, width=6)


def icon_rocket(d, s):
    c = s // 2
    # body
    body_w = int(s * 0.20)
    top = (c, int(s * 0.12))
    d.polygon([top, (c - body_w, int(s * 0.55)), (c + body_w, int(s * 0.55))], outline=TEAL, width=8)
    d.rectangle([c - body_w, int(s * 0.55), c + body_w, int(s * 0.75)], outline=TEAL, width=8)
    # fins
    d.polygon([(c - body_w, int(s * 0.55)), (c - body_w - 40, int(s * 0.80)), (c - body_w, int(s * 0.75))], outline=TEAL, width=6)
    d.polygon([(c + body_w, int(s * 0.55)), (c + body_w + 40, int(s * 0.80)), (c + body_w, int(s * 0.75))], outline=TEAL, width=6)
    # flame
    d.polygon([(c - body_w // 2, int(s * 0.75)), (c, int(s * 0.95)), (c + body_w // 2, int(s * 0.75))], outline=GOLD, width=6)
    # window
    d.ellipse([c - 18, int(s * 0.30), c + 18, int(s * 0.30) + 36], outline=TEAL, width=5)


def icon_chain_link(d, s):
    c = s // 2
    r1 = int(s * 0.16)
    d.rounded_rectangle([c - r1 * 2 - 20, c - r1, c - 20, c + r1], radius=r1, outline=TEAL, width=9)
    d.rounded_rectangle([c + 20, c - r1, c + r1 * 2 + 20, c + r1], radius=r1, outline=TEAL, width=9)
    d.line([c - 30, c, c + 30, c], fill=GOLD, width=8)


def icon_search_chart(d, s):
    c = s // 2
    cx, cy = c - 30, c - 30
    r = int(s * 0.20)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=TEAL, width=9)
    d.line([cx + int(r * 0.7), cy + int(r * 0.7), cx + r + 60, cy + r + 60], fill=TEAL, width=10)
    # small bar chart inside
    base_y = cy + r // 2
    for i, h in enumerate([10, 22, 16]):
        bx = cx - r // 2 + i * 18
        d.rectangle([bx, base_y - h, bx + 10, base_y], fill=GOLD)


def icon_radar(d, s):
    c = s // 2
    for r in (int(s * 0.10), int(s * 0.20), int(s * 0.30)):
        d.ellipse([c - r, c - r, c + r, c + r], outline=TEAL, width=6)
    d.line([c, c, c + int(s * 0.30), c - int(s * 0.15)], fill=GOLD, width=8)
    d.ellipse([c - 8, c - 8, c + 8, c + 8], fill=TEAL)


LESSONS = [
    {
        "n": 6, "module": 5,
        "headline": "הדומיין קנוי. עכשיו זה נהיה שלך",
        "icon": icon_globe_link,
    },
    {
        "n": 7, "module": 5,
        "headline": "האתר באוויר תוך עשר דקות",
        "icon": icon_rocket,
    },
    {
        "n": 8, "module": 5,
        "headline": "לחבר את הדומיין. חמש דקות",
        "icon": icon_chain_link,
    },
    {
        "n": 9, "module": 5,
        "headline": "מה גוגל באמת חושב על האתר שלך",
        "icon": icon_search_chart,
    },
    {
        "n": 10, "module": 5,
        "headline": "גוגל עוד לא יודע שאתה קיים",
        "icon": icon_radar,
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
    y = 220
    for line in lines:
        draw.text((left_x, y), rtl(line), font=f_headline, fill=WHITE, anchor="la")
        y += 68

    # teal divider
    div_y = y + 20
    draw.rectangle([(left_x, div_y), (left_x + max_text_width, div_y + 3)], fill=TEAL)

    # module | lesson label
    draw.text(
        (left_x, div_y + 24),
        rtl(f"שיעור {lesson['n']} | מודול {lesson['module']}"),
        font=f_label, fill=TEAL, anchor="la",
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

    # WAO bottom-right, teal, never white
    draw.text((W - 60, H - 70), "WAO", font=f_wao, fill=TEAL, anchor="rm")

    out_path = OUT_DIR / f"website-lesson-{lesson['n']}.jpg"
    img.save(str(out_path), "JPEG", quality=92)
    print(f"Saved {out_path} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    for lesson in LESSONS:
        build_thumbnail(lesson)
