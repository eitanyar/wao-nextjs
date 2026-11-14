"""Shared string loaders for Dash ads. Every on-screen string is read byte-exact from a named source file.
No Hebrew is typed in this file; patterns match on structure (keys, fences, arrows), never on Hebrew words."""
import json, re
from dash_paths import ROOT

SCRIPTS = f"{ROOT}/docs/copy/video-dash-v2-scripts-2026-11-12.json"
CONFIG = f"{ROOT}/data/video/config.json"


def one(pattern, text, what, flags=re.S):
    """Exactly one distinct match of `pattern` (first group) in `text`."""
    m = re.findall(pattern, text, flags=flags)
    assert len(set(m)) == 1, (what, m)
    return m[0]


def read(path):
    return open(path, encoding="utf-8").read()


def script_lines(episode, section):
    """episodes.<ep>.<section> list of {voice, display, ...} from the approved scripts JSON."""
    return json.load(open(SCRIPTS, encoding="utf-8"))["episodes"][episode][section]


def waocopy_json(path):
    """A waocopy output whose payload is inside a ```json fence (exactly one)."""
    return json.loads(one(r"```json\n(.*?)\n```", read(path), f"json fence in {path}"))


def landing_value(ts_path, key):
    """A "key": "value" literal from a generated landing-copy TS file. Returns (value, occurrences)."""
    t = read(ts_path)
    vals = re.findall(r'"%s":\s*"([^"]+)"' % re.escape(key), t)
    assert vals and len(set(vals)) == 1, (key, vals)
    return vals[0], len(vals)


def product_url(product):
    return json.load(open(CONFIG))["products"][product]["url"]


def demo_label():
    """«demo business» tag text: s1-15 demo-site patches, demo_label (a JSON-encoded string) .text."""
    dp = json.load(open(f"{ROOT}/docs/copy/s1-15-demo-site-patches-2026-11-14.waocopy.json", encoding="utf-8"))
    return json.loads(dp["demo_label"])["text"]


def review_arrow_target(review_path, section_heading_prefix):
    """The first  `"old"` → `"new"`  target inside the review section whose heading starts with the prefix."""
    t = read(review_path)
    sec = one(r"\n(## %s.*?)(?=\n## |\Z)" % re.escape(section_heading_prefix), t, f"section {section_heading_prefix}")
    pairs = re.findall(r'`"([^"`]+)"` → `"([^"`]+)"`', sec)
    assert pairs, ("no arrow pair in", section_heading_prefix)
    return pairs[0]   # (old, new)


ADS_ENDCARD_V2 = f"{ROOT}/docs/copy/ads-bot-end-card-v2-2026-11-14.waocopy.json"


def ads_endcard_v2(set_index=0):
    """Ads Bot END card v2 (Eitan + Noa, 2026-11-14: Set 1): stamp + CTA from the waocopy JSON fence, sets[0].
    The file's landing_cta_match.if_set_1 must equal the card's CTA (same promise on card and page)."""
    j = waocopy_json(ADS_ENDCARD_V2)
    s = j["sets"][set_index]
    assert j["landing_cta_match"][f"if_set_{set_index + 1}"] == s["cta"], "landing_cta_match must repeat the card CTA"
    return dict(stamp=s["stamp"], cta=s["cta"])
