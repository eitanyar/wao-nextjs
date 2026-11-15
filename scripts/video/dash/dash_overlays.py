"""Shared overlay builders for Dash ads (wordmark, banner, end card, demo tag, captions), rendered by headless
Chrome through render_overlays.mjs. Generalised from the S1-15 pilot (same markup, sizes and safe-zone fitting).
No Hebrew here: every string is passed in by the episode, loaded byte-exact from its source."""
import html, json, os, subprocess
from dash_layout import W, H, GOOGLE_SAFE, CAP_BOTTOM, STORY_Y, CW, CH

E = html.escape
NAVY, OFF, MUTED, MINT, LOGO = "#0D1117", "#F2F5F9", "#9AA7B5", "#4AE3B5", "#36ddb5"
CREAM = "#F8EFDC"   # Dash/doodle off-white sampled from the cab plate (248,239,220)
SCREEN = "#111522"  # screen navy sampled from the plate (17,21,34)
TOOLS = os.path.dirname(os.path.abspath(__file__))
from dash_paths import ROOT


def _fav():
    f = open(f"{ROOT}/public/favicon.svg", encoding="utf-8").read().strip()
    f = f.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" class="fav">')
    assert 'class="fav"' in f
    return f


class Overlays:
    def __init__(self):
        self.jobs, self.captions = [], []

    def job(self, name, w, h, body, css="", script="", transparent=True):
        self.jobs.append(dict(name=name, width=w, height=h, body=body, css=css, script=script, transparent=transparent))

    # ---------------------------------------------------------------- output-frame layers
    def wordmark(self, name="wordmark"):
        css = f"""#wm{{position:absolute;left:{GOOGLE_SAFE[0]+12}px;top:{GOOGLE_SAFE[1]+8}px;height:56px;display:flex;align-items:center;gap:10px;direction:ltr;padding:0 14px 0 0;
border-radius:14px;background:rgba(13,17,23,.78)}} #wm .fav{{width:56px;height:56px}}
#wm span{{font-weight:800;font-size:44px;letter-spacing:-.04em;color:{LOGO}}}"""
        self.job(name, W, H, f'<div id="wm" data-m="wordmark">{_fav()}<span>WAO</span></div>', css)

    def banner(self, text, name="banner", font_px=76):
        """Bottom-anchored inside the Google safe box (rotation + pointer included)."""
        css = f"""#wrap{{position:absolute;left:{GOOGLE_SAFE[0]}px;width:{GOOGLE_SAFE[2]-GOOGLE_SAFE[0]+1}px;bottom:{H-CAP_BOTTOM+16}px;display:flex;justify-content:center}}
#b{{position:relative;background:{OFF};color:{NAVY};font-weight:700;font-size:{font_px}px;line-height:1.2;padding:.22em .62em .3em;border-radius:.42em;
border:6px solid {NAVY};box-shadow:0 0 0 4px {OFF};transform:rotate(-2deg);white-space:nowrap}}
#b:before{{content:"";position:absolute;left:50%;top:-34px;margin-left:-26px;border:26px solid transparent;border-bottom:34px solid {OFF};border-top:0}}"""
        fit = f"""window.__fit=()=>{{const b=document.getElementById('b');let f={font_px};
for(let i=0;i<30&&b.getBoundingClientRect().width>{GOOGLE_SAFE[2]-GOOGLE_SAFE[0]-24};i++){{f*=0.96;b.style.fontSize=f+'px';}}window.__font=f;}};"""
        self.job(name, W, H, f'<div id="wrap"><div id="b" dir="rtl" lang="he" data-m="banner">{E(text)}</div></div>', css, fit)

    def endcard(self, product, product_dir, stamp, cta, url, price=None, name="endcard", headline=None):
        """The S1-15 end card: logo, product, stamp, CTA pill, url (+ optional price line). Auto-fitted into the
        Google 9:16 safe zone. product_dir: "ltr" for a Latin name, "rtl" for a Hebrew one."""
        gx0, gy0, gx1, gy1 = GOOGLE_SAFE
        half = min(540 - gx0, gx1 - 540)
        k = 4.0
        css = f"""#ec{{position:absolute;left:{540-half}px;width:{2*half}px;top:{gy0}px;height:{gy1-gy0+1}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:{(7 if headline else 10)*k}px;text-align:center}}
.logo{{display:flex;align-items:center;gap:{8*k}px;direction:ltr}} .logo .fav{{width:{30*k}px;height:{30*k}px}}
.logo span{{font-weight:800;font-size:{32*k}px;letter-spacing:-.04em;color:{LOGO};line-height:1.1}}
.prod{{font-weight:800;font-size:{24*k}px;color:{OFF};direction:{product_dir};unicode-bidi:isolate;line-height:1.15;white-space:nowrap}}
.stamp{{font-size:{13.6*k}px;color:{MUTED};font-weight:500;direction:rtl;unicode-bidi:isolate;text-wrap:balance;line-height:1.3}}
.price{{font-size:{13.6*k}px;color:{OFF};font-weight:500;direction:rtl;unicode-bidi:isolate}}
.head{{font-weight:700;font-size:{16*k}px;color:{OFF};direction:rtl;unicode-bidi:isolate;text-wrap:balance;line-height:1.25;max-width:{2*half-40}px}}
.btn{{background:{MINT};color:{NAVY};font-weight:700;border-radius:999px;padding:{9*k}px {16*k}px;font-size:{15.2*k}px;direction:rtl;unicode-bidi:isolate;white-space:nowrap}}
.url{{font-weight:500;color:{OFF};font-size:{16*k}px;direction:ltr;unicode-bidi:isolate}}"""
        fit = f"""window.__fit=()=>{{const ec=document.getElementById('ec');let z=1;
for(let i=0;i<30;i++){{const over=[...ec.children].some(c=>c.getBoundingClientRect().width>{2*half-8});const tall=ec.scrollHeight>ec.clientHeight;
if(!over&&!tall)break;z*=0.97;ec.style.zoom=z;}}window.__zoom=z;}};"""
        lang = ' lang="he"' if product_dir == "rtl" else ""
        body = f"""<div id="ec">
<div class="logo" data-m="logo">{_fav()}<span data-m="wao">WAO</span></div>
<div class="prod" dir="{product_dir}"{lang} data-m="product">{E(product)}</div>
<div class="stamp" dir="rtl" lang="he" data-m="stamp">{E(stamp)}</div>
{f'<div class="price" dir="rtl" lang="he" data-m="price">{E(price)}</div>' if price else ''}
{f'<div class="head" dir="rtl" lang="he" data-m="headline">{E(headline)}</div>' if headline else ''}
<div class="btn" dir="rtl" lang="he" data-m="cta">{E(cta)}</div>
<div class="url" dir="ltr" data-m="url">{E(url)}</div>
</div>"""
        self.job(name, W, H, body, css, fit, transparent=False)

    # ---------------------------------------------------------------- screen-canvas layers (CW x CH)
    def demo_tag(self, label, name="tdemo"):
        """Small quiet tag, top-left of the story area on every real-screen frame."""
        css = f"""#t{{position:absolute;left:14px;top:{STORY_Y+14}px;padding:4px 14px 6px;border-radius:9px;background:rgba(13,17,23,.84);
border:1.5px solid rgba(242,245,249,.28);font-weight:500;font-size:25px;line-height:1.25;color:{OFF};white-space:nowrap;unicode-bidi:isolate}}"""
        self.job(name, CW, CH, f'<div id="t" dir="rtl" lang="he" data-m="tdemo">{E(label)}</div>', css)

    # ---------------------------------------------------------------- captions (pipeline splitCards + captionPage)
    def caption(self, line, text, groups=None):
        """groups: optional word counts per card (keeps an idiom on one card); default = pipeline splitCards."""
        self.captions.append(dict(line=line, text=text, **({"groups": groups} if groups else {})))

    def render(self, out):
        gx0, gy0, gx1, gy1 = GOOGLE_SAFE
        caption_css = f".safe{{top:{gy0}px;left:{gx0}px;right:{W-gx1-1}px;bottom:{H-CAP_BOTTOM}px}}"
        os.makedirs(out, exist_ok=True)
        jf = os.path.join(out, "jobs.json")
        json.dump(dict(jobs=self.jobs, captions=self.captions, captionCss=caption_css), open(jf, "w", encoding="utf-8"), ensure_ascii=False)
        subprocess.run(["node", os.path.join(TOOLS, "render_overlays.mjs"), jf, out], check=True, cwd=ROOT)
