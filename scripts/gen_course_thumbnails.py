#!/usr/bin/env python3
"""
gen_course_thumbnails.py -- data-driven Gate 6 thumbnail generator for the
website course (lessons 0, 6-21).

Replaces the hardcoded LESSONS arrays of gen_module3_4/5/6_thumbnails.py,
which drifted out of sync with src/data/website-course-data.ts and wrote
Module-5 art into Module-3/4 slugs (wrong headline on the YouTube playlist).

Single source of truth: src/data/website-course-data.ts. This script parses
module/lesson numbering from it, so a renumber can never desync again.

Bidi fix: on this machine PIL is built with raqm, so HarfBuzz shapes RTL
natively. The old `get_display()` pre-reorder therefore DOUBLE-flipped the
text (mirrored banners). We now pass the LOGICAL string (with LRI/PDI
isolates around Latin runs) straight to PIL.

Copy-safety rule: headlines must avoid death/violence idioms (e.g. the old
"וזו שקוברת אותך" style) -- strict provider moderation can terminate the
session mid-task. Headlines here are pre-approved safe equivalents.

Usage: python3 scripts/gen_course_thumbnails.py [--only 6 7 8]
"""
import argparse
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Reuse the approved icon art + layout helpers from the legacy generators.
from gen_module3_4_thumbnails import (
    icon_speech_magnifier, icon_headline_podium, icon_heading_scan,
    icon_page_split, icon_ai_spark_bubble, icon_faq_pair,
    icon_answer_target, icon_schema_overtake,
)
from gen_module5_thumbnails import (
    icon_globe_link, icon_rocket, icon_chain_link, icon_search_chart,
    icon_radar,
)
from gen_module6_thumbnails import (
    icon_chat_edit, icon_calendar_check, icon_signpost, icon_mic_ai,
    draw_favicon_mark,
)

REPO = Path(__file__).parent.parent
COURSE_DATA = REPO / "src" / "data" / "website-course-data.ts"
OUT_DIR = REPO / "public" / "media" / "thumbnails"

W, H = 1280, 720
BG       = (11, 15, 25)     # #0b0f19
TEAL     = (74, 227, 181)   # #4ae3b5
GOLD     = (255, 208, 0)    # #ffd000
WHITE    = (238, 233, 226)  # #eee9e2
BADGE_BG = (19, 22, 32)     # #131620
BADGE    = "קורס בניה + קידום אתרים עם AI"

FONT_DIR = "/usr/share/fonts/truetype/dejavu"

LRI = "⁦"  # LEFT-TO-RIGHT ISOLATE
PDI = "⁩"  # POP DIRECTIONAL ISOLATE


def isolate_latin(text: str) -> str:
    """Wrap Latin runs (e.g. 'AI', 'SEO') in LRI/PDI isolate marks so they
    don't bidi-swap against adjacent Hebrew. PIL/raqm respects the isolates."""
    return re.sub(r"[A-Za-z][A-Za-z0-9\.\-]*", lambda m: f"{LRI}{m.group(0)}{PDI}", text)


def rtl(text: str) -> str:
    # NO get_display(): raqm shapes RTL natively; reordering here mirrors text.
    return isolate_latin(text)


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


def neon_icon_layer(draw_fn, size=420):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    draw_fn(d, size)
    glow = layer.filter(ImageFilter.GaussianBlur(14))
    combined = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    combined = Image.alpha_composite(combined, glow)
    combined = Image.alpha_composite(combined, layer)
    return combined


# ---------------------------------------------------------------------------
# Headlines -- safe copy only (no death/violence idioms). Pre-approved.
# ---------------------------------------------------------------------------
HEADLINES = {
    0:  "מי בעצם מדבר אליך",
    6:  "כתוב בשפה שלו. לא בשלך",
    7:  "כותרת אחת. עמוד ראשון",
    8:  "גוגל קורא רק את הכותרות",
    9:  "עמוד לכל שירות. חשיפה כפולה",
    10: "הלקוח שואל. גוגל עונה. זה אתה",
    11: "שאלות ותשובות. מכאן גוגל מצטט",
    12: "שלושה משפטים. גוגל בוחר להציג",
    13: "המתחרה כבר מצוטט. עקוף אותו",
    14: "דומיין במאה שקל. שלך לתמיד",
    15: "האתר באוויר תוך עשר דקות",
    16: "לחבר את הדומיין. חמש דקות",
    17: "מה גוגל באמת חושב עליך",
    18: "גוגל עוד לא יודע שאתה קיים",
    19: "לעדכן את האתר? זו רק הודעה",
    20: "רבע שעה בחודש שומרת הכל",
    21: "מתי כדאי להפסיק לעשות לבד",
}

ICONS = {
    0:  icon_mic_ai,
    6:  icon_speech_magnifier,
    7:  icon_headline_podium,
    8:  icon_heading_scan,
    9:  icon_page_split,
    10: icon_ai_spark_bubble,
    11: icon_faq_pair,
    12: icon_answer_target,
    13: icon_schema_overtake,
    14: icon_globe_link,
    15: icon_rocket,
    16: icon_chain_link,
    17: icon_search_chart,
    18: icon_radar,
    19: icon_chat_edit,
    20: icon_calendar_check,
    21: icon_signpost,
}


def parse_course():
    """Return {lesson_n: (module, lesson_in_module)} parsed from
    website-course-data.ts, including the pinned Module 0 intro
    (website-lesson-0). lesson_in_module is the per-module number shown on
    video title slides ("מודול 3 | שיעור 1"), NOT the course-wide slug number.
    """
    src = COURSE_DATA.read_text(encoding="utf-8")
    out = {}
    # Slice the source between consecutive `num: N,` markers; every lesson
    # slug inside a slice belongs to that module, in order. (Balanced-bracket
    # regexes break on the nested uiGuides arrays.)
    marks = list(re.finditer(r"\bnum:\s*(\d+),", src))
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(src)
        slugs = re.findall(r'slug:\s*"website-lesson-(\d+)"', src[m.start():end])
        for lim, s in enumerate(slugs, 1):
            out[int(s)] = (int(m.group(1)), lim)
    if re.search(r'slug:\s*"website-lesson-0"', src):
        out[0] = (0, 0)
    return out


def build_thumbnail(n, module, lesson_in_module):
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    draw_background(draw)

    f_headline = load_font(58, bold=True)
    f_label = load_font(28, bold=False)
    f_badge = load_font(24, bold=True)
    f_wao = load_font(34, bold=True)

    left_x = 60
    max_text_width = 560

    headline = HEADLINES[n]
    lines = wrap_headline(draw, headline, f_headline, max_text_width)
    # Line-count ceiling guard: retry once with a smaller headline font.
    if len(lines) > 2:
        f_headline = load_font(50, bold=True)
        lines = wrap_headline(draw, headline, f_headline, max_text_width)

    right_x = left_x + max_text_width
    y = 220
    for line in lines:
        draw.text((right_x, y), rtl(line), font=f_headline, fill=WHITE, anchor="ra")
        y += 68

    # teal divider
    div_y = y + 20
    draw.rectangle([(left_x, div_y), (left_x + max_text_width, div_y + 3)], fill=TEAL)

    # label line -- per-module numbering, matching the video title slide and
    # the YouTube title prefix; Module 0 is pinned, not a numbered lesson
    label_text = ("לפני שנתחיל | מודול 0" if n == 0
                  else f"שיעור {lesson_in_module} | מודול {module}")
    draw.text(
        (right_x, div_y + 24),
        rtl(label_text),
        font=f_label, fill=TEAL, anchor="ra",
    )

    # icon on the right, neon glow
    icon_layer = neon_icon_layer(ICONS[n], size=420)
    img_rgba = img.convert("RGBA")
    img_rgba.alpha_composite(icon_layer, (W - 420 - 90, (H - 420) // 2 - 20))
    img = img_rgba.convert("RGB")
    draw = ImageDraw.Draw(img)

    # gold pill badge bottom-left
    badge_text = rtl(BADGE)
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

    # WAO bottom-right, teal, never white + favicon mark left of wordmark
    wao_text = "WAO"
    wao_bbox = draw.textbbox((0, 0), wao_text, font=f_wao)
    wao_w = wao_bbox[2] - wao_bbox[0]
    wao_x = W - 60
    wao_y = H - 70
    draw.text((wao_x, wao_y), wao_text, font=f_wao, fill=TEAL, anchor="rm")
    mark_size = 30
    gap = 8
    draw_favicon_mark(draw, wao_x - wao_w - gap - mark_size, wao_y - mark_size // 2, mark_size)

    out_path = OUT_DIR / f"website-lesson-{n}.jpg"
    img.save(str(out_path), "JPEG", quality=92)
    print(f"Saved {out_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*", type=int, help="Render only these lesson numbers")
    args = parser.parse_args()

    mapping = parse_course()
    missing = sorted(set(HEADLINES) - set(mapping))
    if missing:
        print(f"ABORT: headlines for lessons {missing} not found in course data.")
        sys.exit(1)

    targets = sorted(args.only) if args.only else sorted(HEADLINES)
    for n in targets:
        module, lim = mapping[n]
        build_thumbnail(n, module, lim)
    print(f"Done. {len(targets)} thumbnail(s) rendered.")


if __name__ == "__main__":
    main()
