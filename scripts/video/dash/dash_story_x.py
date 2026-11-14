"""Runtime extension of dash_story.py for ST14 / ST16 / ST20 (Eitan-Dev seat 3).

Does not edit any shared toolkit file: it imports dash_story, registers extra pipeline-drawn glyphs (SVG, no
words, no text nodes) and a wide-glyph variant of glyph_html, then runs dash_story.main() unchanged.

    python3 dash_story_x.py <cmd> <story.json> [...]      same commands as dash_story.py

Wide glyphs: WIDE[name] = (svg_inner, vb_w, vb_h, card). The glyph fills the overlay box minus a padding, keeps
its aspect (centred). card=False draws no navy card (rows that sit inside another card).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dash_story as DS

CR, MI, RD, AM, NV = DS.C_CREAM, DS.C_MINT, DS.C_RED, DS.C_AMBER, "#111522"
GREY = "#8A93A6"


def star(cx, cy, r, filled):
    import math
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * 0.45
        pts.append(f"{cx + rr * math.cos(a):.1f},{cy + rr * math.sin(a):.1f}")
    fill = AM if filled else "none"
    stroke = AM if filled else GREY
    return f'<polygon points="{" ".join(pts)}" fill="{fill}" stroke="{stroke}" stroke-width="{r * 0.16:.1f}" stroke-linejoin="round"/>'


def stars_row(n, x0, cy, r, gap, count=5):
    return "".join(star(x0 + r + k * (2 * r + gap), cy, r, k < n) for k in range(count))


def bar(x, y, w, h, c=CR, o=1.0):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{h / 2}" fill="{c}" opacity="{o}"/>'


def phone_icon(cx, cy, s, c=CR):
    return (f'<rect x="{cx - 0.28 * s}" y="{cy - 0.45 * s}" width="{0.56 * s}" height="{0.9 * s}" rx="{0.1 * s}" fill="none" stroke="{c}" stroke-width="{0.08 * s}"/>'
            f'<circle cx="{cx}" cy="{cy + 0.32 * s}" r="{0.05 * s}" fill="{c}"/>')


def handset(cx, cy, s, c=CR):
    # classic handset silhouette
    return (f'<path transform="translate({cx - s / 2},{cy - s / 2}) scale({s / 100})" d="M28 14 C22 14 14 22 16 32 C20 56 44 80 68 84 '
            f'C78 86 86 78 86 72 L86 64 C86 60 82 58 78 57 L66 54 C62 53 58 55 56 58 L52 63 C42 58 36 52 31 42 L36 38 C39 36 41 32 40 28 '
            f'L37 17 C36 15 33 14 30 14 Z" fill="{c}"/>')


def pin(cx, cy, s, c=MI, hole=True):
    """map pin, tip at (cx, cy + 0.5 s)."""
    h = f'<circle cx="{cx}" cy="{cy - 0.12 * s}" r="{0.13 * s}" fill="{NV}"/>' if hole else ""
    return (f'<path d="M{cx} {cy + 0.5 * s} C{cx - 0.12 * s} {cy + 0.25 * s} {cx - 0.34 * s} {cy + 0.05 * s} {cx - 0.34 * s} {cy - 0.14 * s} '
            f'A{0.34 * s} {0.34 * s} 0 1 1 {cx + 0.34 * s} {cy - 0.14 * s} C{cx + 0.34 * s} {cy + 0.05 * s} {cx + 0.12 * s} {cy + 0.25 * s} {cx} {cy + 0.5 * s} Z" '
            f'fill="{c}"/>' + h)


def globe(cx, cy, r, c=CR):
    w = r * 0.12
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{c}" stroke-width="{w}"/>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="{r * 0.45}" ry="{r}" fill="none" stroke="{c}" stroke-width="{w}"/>'
            f'<path d="M{cx - r} {cy} L{cx + r} {cy} M{cx - r * 0.85} {cy - r * 0.5} L{cx + r * 0.85} {cy - r * 0.5} M{cx - r * 0.85} {cy + r * 0.5} L{cx + r * 0.85} {cy + r * 0.5}" stroke="{c}" stroke-width="{w * 0.8}"/>')


def tick_path(x, y, s, c=MI, w=None):
    w = w or 0.14 * s
    return f'<path d="M{x - 0.35 * s} {y} L{x - 0.1 * s} {y + 0.25 * s} L{x + 0.38 * s} {y - 0.28 * s}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'


# ------------------------------------------------------------------ square glyphs (GLYPHS, existing glyph_html)
SQ = {
    "star": DS._svg(star(50, 52, 42, True)),
    "clock": DS._svg(f'<circle cx="50" cy="50" r="40" fill="none" stroke="{CR}" stroke-width="6"/>'
                     + "".join(f'<path d="M50 14 L50 22" stroke="{CR}" stroke-width="5" stroke-linecap="round" transform="rotate({a} 50 50)"/>' for a in range(0, 360, 90))
                     + f'<path d="M50 50 L50 26" stroke="{CR}" stroke-width="6" stroke-linecap="round"/>'
                       f'<path d="M50 50 L68 60" stroke="{MI}" stroke-width="6" stroke-linecap="round"/>'
                       f'<circle cx="50" cy="50" r="5" fill="{MI}"/>'
                       f'<path d="M14 10 A44 44 0 0 1 40 4" fill="none" stroke="{MI}" stroke-width="4" stroke-linecap="round" opacity=".7"/>'
                       f'<path d="M36 0 L42 4 L36 9" fill="none" stroke="{MI}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>'),
    "calendar": DS._svg(f'<rect x="14" y="20" width="72" height="66" rx="8" fill="none" stroke="{CR}" stroke-width="6"/>'
                        f'<path d="M14 38 L86 38" stroke="{CR}" stroke-width="5"/>'
                        f'<path d="M32 12 L32 26 M68 12 L68 26" stroke="{CR}" stroke-width="6" stroke-linecap="round"/>'
                        + "".join(f'<rect x="{24 + c * 14}" y="{46 + r * 12}" width="8" height="6" rx="2" fill="{CR}" opacity="{.35 if (r, c) != (2, 3) else 1}"/>'
                                  for r in range(3) for c in range(4))
                        + f'<path d="M86 64 L64 86 L64 70 Q64 64 70 64 Z" fill="{MI}"/>'),
    "tick-plain": DS._svg(tick_path(50, 50, 80, w=11)),
    "pizza": DS._svg(f'<path d="M50 88 L14 22 Q50 6 86 22 Z" fill="none" stroke="{CR}" stroke-width="6" stroke-linejoin="round"/>'
                     f'<path d="M14 22 Q50 6 86 22" fill="none" stroke="{AM}" stroke-width="9" stroke-linecap="round"/>'
                     f'<circle cx="42" cy="36" r="6" fill="{RD}"/><circle cx="58" cy="50" r="6" fill="{RD}"/><circle cx="48" cy="64" r="5" fill="{RD}"/>'),
    "tooth": DS._svg(f'<path d="M28 18 C18 18 12 30 16 44 C20 56 24 62 26 76 C28 90 36 90 38 80 L42 62 C44 56 56 56 58 62 L62 80 C64 90 72 90 74 76 '
                     f'C76 62 80 56 84 44 C88 30 82 18 72 18 C62 18 58 24 50 24 C42 24 38 18 28 18 Z" fill="none" stroke="{CR}" stroke-width="6" stroke-linejoin="round"/>'),
    "dog": DS._svg(f'<path d="M26 30 L18 54 L30 56 Z M74 30 L82 54 L70 56 Z" fill="{CR}"/>'
                   f'<ellipse cx="50" cy="52" rx="24" ry="26" fill="none" stroke="{CR}" stroke-width="6"/>'
                   f'<circle cx="41" cy="48" r="4" fill="{CR}"/><circle cx="59" cy="48" r="4" fill="{CR}"/>'
                   f'<ellipse cx="50" cy="62" rx="7" ry="5" fill="{CR}"/>'),
    "house": DS._svg(f'<path d="M16 48 L50 18 L84 48" fill="none" stroke="{CR}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
                     f'<path d="M24 42 L24 84 L76 84 L76 42" fill="none" stroke="{CR}" stroke-width="6" stroke-linejoin="round"/>'
                     f'<rect x="43" y="60" width="14" height="24" fill="none" stroke="{CR}" stroke-width="5"/>'),
}

# ------------------------------------------------------------------ wide glyphs
def _stars_chip(n):
    return (stars_row(n, 14, 50, 32, 14), 400, 100, True)


def _msg_request():
    # a message bubble: three text lines (RTL-aligned, no words), a star row, a mint button
    g = (f'<path d="M14 12 Q14 4 22 4 L198 4 Q206 4 206 12 L206 150 Q206 158 198 158 L60 158 L36 176 L40 158 L22 158 Q14 158 14 150 Z" '
         f'fill="none" stroke="{CR}" stroke-width="4" stroke-linejoin="round"/>'
         + bar(46, 22, 146, 10) + bar(76, 42, 116, 10, o=.75) + bar(100, 62, 92, 10, o=.75)
         + stars_row(5, 38, 96, 15, 8, 5).replace(f'fill="{AM}"', 'fill="none"').replace(f'stroke="{AM}"', f'stroke="{AM}"')
         + f'<rect x="58" y="122" width="104" height="24" rx="12" fill="{MI}"/>')
    return (g, 220, 180, True)


def _reply_draft():
    # an incoming review (avatar, stars, two lines), then the drafted reply (reply arrow + three mint-tinted lines)
    g = (f'<circle cx="176" cy="24" r="14" fill="none" stroke="{CR}" stroke-width="4"/>'
         + stars_row(5, 30, 24, 11, 5)
         + bar(40, 48, 150, 9, o=.6) + bar(80, 64, 110, 9, o=.6)
         + f'<path d="M14 86 L206 86" stroke="{GREY}" stroke-width="3" stroke-dasharray="6 6"/>'
         + f'<path d="M196 104 L182 114 L196 124 M182 114 L166 114 Q154 114 154 128" fill="none" stroke="{MI}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
         + bar(20, 106, 124, 10, c=MI, o=.85) + bar(40, 124, 104, 10, c=MI, o=.85) + bar(70, 142, 74, 10, c=MI, o=.85))
    return (g, 220, 165, True)


def _sum_row(icon):
    ic = {"phone": handset(206, 40, 60, CR), "pin": pin(206, 36, 64, CR), "site": globe(206, 40, 26, CR)}[icon]
    bars = "".join(f'<rect x="{18 + k * 34}" y="{68 - h}" width="22" height="{h}" rx="4" fill="{MI}" opacity="{.55 + .15 * k}"/>'
                   for k, h in enumerate((16, 26, 38, 52)))
    return (ic + bars + f'<path d="M10 70 L160 70" stroke="{GREY}" stroke-width="3" stroke-linecap="round"/>', 250, 80, False)


def _sum_card():
    # the monthly-summary card's header: a calendar mark and a title rule (no words)
    g = (f'<rect x="196" y="6" width="34" height="30" rx="5" fill="none" stroke="{CR}" stroke-width="4"/>'
         f'<path d="M196 16 L230 16" stroke="{CR}" stroke-width="3"/>' + bar(70, 14, 112, 12, o=.8))
    return (g, 250, 300, True)


WIDE = {
    "chip-5": _stars_chip(5), "chip-4": _stars_chip(4), "chip-3": _stars_chip(3),
    "msg-request": _msg_request(), "reply-draft": _reply_draft(),
    "sum-card": _sum_card(), "sum-phone": _sum_row("phone"), "sum-pin": _sum_row("pin"), "sum-site": _sum_row("site"),
}
EXTRA_WIDE = {}       # filled by story-specific modules (ST20 map cards)

_orig_glyph_html = DS.glyph_html


def glyph_html(name, x0, y0, x1, y1, card=True):
    wd = {**WIDE, **EXTRA_WIDE}
    if name not in wd:
        return _orig_glyph_html(name, x0, y0, x1, y1, card)
    inner, vw, vh, has_card = wd[name]
    from dash_overlays import SCREEN
    w, h = x1 - x0, y1 - y0
    card_css = f"background:{SCREEN};border:6px solid {CR};border-radius:34px;box-sizing:border-box;" if (card and has_card) else ""
    pad = 26 if (card and has_card) else 0
    sw, sh = w - 2 * pad, h - 2 * pad
    s = min(sw / vw, sh / vh)
    svg = (f'<svg viewBox="0 0 {vw} {vh}" width="{vw * s:.0f}" height="{vh * s:.0f}" style="display:block">{inner}</svg>')
    return (f'<div style="position:absolute;left:{x0}px;top:{y0}px;width:{w}px;height:{h}px;{card_css}display:flex;align-items:center;'
            f'justify-content:center">{svg}</div>')


DS.GLYPHS.update(SQ)
DS.glyph_html = glyph_html


# ------------------------------------------------------------------ ST20: map pins, profile + page cards
def _icon(name, cx, cy, sz):
    """small line icons inside pins / cards (sz = box edge in svg units)."""
    k = sz / 100.0
    g = {"pizza": SQ["pizza"], "tooth": SQ["tooth"], "dog": SQ["dog"], "house": SQ["house"]}.get(name)
    if g:
        inner = g[g.index(">") + 1:g.rindex("</svg>")]
        return f'<g transform="translate({cx - sz / 2},{cy - sz / 2}) scale({k})">{inner}</g>'
    if name == "wrench":
        return (f'<g transform="translate({cx - sz / 2},{cy - sz / 2}) scale({k})"><path d="M30 78 L62 46 M70 18 A18 18 0 1 0 82 40 L70 40 L60 30 L60 18 Z" '
                f'fill="none" stroke="{CR}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>')
    if name == "roller":
        return (f'<g transform="translate({cx - sz / 2},{cy - sz / 2}) scale({k})"><rect x="16" y="14" width="60" height="22" rx="6" fill="none" stroke="{CR}" stroke-width="7"/>'
                f'<path d="M76 25 L86 25 L86 48 L50 52 L50 64" fill="none" stroke="{CR}" stroke-width="6" stroke-linejoin="round"/>'
                f'<rect x="43" y="64" width="14" height="26" rx="4" fill="{CR}"/></g>')
    if name == "bulb":
        return (f'<g transform="translate({cx - sz / 2},{cy - sz / 2}) scale({k})"><path d="M50 12 A26 26 0 0 0 34 58 L36 70 L64 70 L66 58 A26 26 0 0 0 50 12 Z" '
                f'fill="none" stroke="{CR}" stroke-width="7" stroke-linejoin="round"/><path d="M38 80 L62 80 M42 90 L58 90" stroke="{CR}" stroke-width="7" stroke-linecap="round"/></g>')
    raise KeyError(name)


def _pin_icon(icon, fill=NV, edge=CR):
    body = (f'<path d="M50 126 C40 104 10 84 10 50 A40 40 0 1 1 90 50 C90 84 60 104 50 126 Z" fill="{fill}" stroke="{edge}" stroke-width="6" stroke-linejoin="round"/>')
    ic = _icon(icon, 50, 50, 60) if icon else ""
    if fill != NV and icon:      # mint pin: navy icon
        ic = ic.replace(f'stroke="{CR}"', f'stroke="{NV}"').replace(f'fill="{CR}"', f'fill="{NV}"')
    return (body + ic, 100, 130, False)


def _profile_card():
    g = (f'<circle cx="236" cy="40" r="26" fill="none" stroke="{CR}" stroke-width="5"/>'
         f'<circle cx="236" cy="33" r="9" fill="{CR}"/><path d="M219 56 Q236 42 253 56" fill="none" stroke="{CR}" stroke-width="5"/>'
         + bar(80, 22, 130, 14) + bar(120, 46, 90, 10, o=.6)
         + pin(28, 92, 34, MI) + bar(56, 86, 150, 10, o=.6)
         + handset(28, 124, 28, MI) + bar(56, 118, 110, 10, o=.6))
    return (g, 280, 140, True)


def _page_card(icon):
    g = (f'<rect x="4" y="4" width="152" height="18" rx="6" fill="none" stroke="{GREY}" stroke-width="3"/>'
         f'<circle cx="16" cy="13" r="3" fill="{GREY}"/><circle cx="27" cy="13" r="3" fill="{GREY}"/>'
         + _icon(icon, 80, 66, 60) + bar(30, 104, 100, 9, o=.7) + bar(46, 120, 68, 9, o=.5))
    return (g, 160, 132, True)


def _links3():
    # three mint links from the profile card (top centre) down to the three page cards
    g = "".join(f'<path d="M390 0 C390 50 {x} 40 {x} 110" fill="none" stroke="{MI}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 14"/>'
                for x in (120, 390, 660))
    return (g, 780, 110, False)


WIDE.update({
    "pin-pizza": _pin_icon("pizza"), "pin-tooth": _pin_icon("tooth"), "pin-dog": _pin_icon("dog"),
    "pin-his": _pin_icon("house", fill=MI, edge=MI),
    "profile": _profile_card(), "page-wrench": _page_card("wrench"), "page-roller": _page_card("roller"), "page-bulb": _page_card("bulb"),
    "links3": _links3(),
})


# ------------------------------------------------------------------ the demo-business tag on a clip shot ("demo_tag": true)
_orig_story_frame = DS.Build.story_frame


def story_frame(self, s, t):
    o = _orig_story_frame(self, s, t)
    if s.get("demo_tag"):
        from dash_compose import over
        over(o, *self.LY["tdemo"])
    return o


DS.Build.story_frame = story_frame

if __name__ == "__main__":
    DS.main()
