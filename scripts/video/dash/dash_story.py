"""STORY BUILDER: one full-screen Dash story ad from a JSON shot list (scratch/video-dash/<st>/story.json).
Global flags (any position): --out-root DIR (default scratch/video-out/stories; env DASH_OUT_ROOT),
--build-dir DIR (default <story.json dir>/story-build; env DASH_BUILD_DIR). Paths: dash_paths.py.

    python3 dash_story.py prep     <story.json>     voice: splice re-voiced lines, tighten long silences, measure
                                                    line windows / pauses on the mouth gate, local STT word starts
    python3 dash_story.py overlays <story.json>     Chrome-rendered PNGs (wordmark, captions, banner, END, tag,
                                                    bubbles, glyphs)
    python3 dash_story.py render   <story.json> [--timeline-only]
    python3 dash_story.py preview  <story.json> <t1,t2,...>     single frames -> <build>/pv/
    python3 dash_story.py evidence <story.json>
    python3 dash_story.py sheets   <story.json>
    python3 dash_story.py endcard  <story.json>     re-render only the END card and re-join the tail

Built on the shared toolkit (dash_full / dash_compose / dash_overlays / dash_strings / dash_evidence / dash_face_x +
scripts/video/lib/dash_face.py), the A1-30 / A2-30 full-screen builds as models. Changes nothing they rely on.
Outputs: scratch/video-out/stories/<id>/<id>_9x16_he_FULL.mp4 (+ .timeline.json, .evidence.txt, sheets).
Build artifacts: scratch/video-dash/<id>/story-build/ (prepared voice WAV, timing.json, ov/, pv/).

No Hebrew in this file and none typed in story.json: every on-screen string is loaded from a named source
(captions = the script JSON's voice line, minus its leading [tag] and its niqqud: the same rule that made every
`display` field of the approved Dash scripts JSON, validated against all of them in `evidence`).

==================================================================== story.json schema
{
  "id": "st05",                                   output name; outputs go to scratch/video-out/stories/<id>/
  "title": "...",                                 free text (English)
  "script": {"json": "docs/copy/stories/story-voice-scripts-2026-11-13.json",
             "path": ["episodes", "ST05", "script_30"], "field": "voice"},
  "voice": {
    "src": "scratch/video-dash/st05/audio/a/ST05/full.mp3",      the recording (never modified)
    "splice": [{"line": 0, "take": "<mp3 of the re-voiced line>"}],   optional: replace whole lines
    "tighten": {"between": 0.34, "intra": 0.26, "gaps": {"3|4": 0.44}}  optional: cap gate-silent runs (s); only
                                                  silence is removed, from the middle of each run
    "line_gap_db": -70, "line_gap_min": 0.38      how line boundaries are found (the concat's digital silences)
  },
  "banner_line": 4,                               optional: that line shows as a banner (display minus its final
                                                  period) instead of captions
  "banner": {"from": "L4", "to": "L4|L5"},        banner window (time expressions, below)
  "no_captions": [ ],                             optional: further lines without captions
  "endcard": "adsbot-v2" | "sitebot",
  "end": {"at": "L8.end+0.20", "hold": 3.8},      END fade-in time and hold (default and required: END_HOLD 3.8 s)
  "blinks": "auto" | ["expr", ...], "slow_blinks": ["expr", ...],   auto = one blink in every between-line pause
  "glances": [["expr", "expr"]],                  sarcastic tile glance windows
  "clips": {"sink": {"src": "...mp4", "ss": 0.5, "place": "auto" | [k, ox, oy],
                     "fit": [x0, y0, x1, y1], "push_row": 160}},
                                                  auto: the clip's measured ink box fitted into `fit` (default
                                                  x0-1080, y300-1085: above the caption band), k <= 1.5
  "shots": [                                      contiguous; each ends where the next starts
    {"id": "est", "kind": "face", "to": "0.6", "expr": "tired"},
    {"id": "a", "kind": "clip", "clip": "sink", "to": "L1|L2", "enter": "push", "tile": "tired",
     "clip_t": [0.0, 4.4] | "warp": [["expr", clip_s], ...], "zoom": [1.0, 1.04]},
    {"id": "v", "kind": "face", "to": "L4.w3", "expr": "deadpan"},
    {"id": "b", "kind": "clip", ..., "exit": "pull"},       pull back out over its last 0.30 s (inside a pause)
    {"id": "p", "kind": "rec", "to": "L5|L6", "tile": ["calm", "mint"], "tap": "L5.w4",
     "fade_rows": [{"row": 0, "at": "L4.w2"}]},             the A2-15 leads recording, full-frame
    {"id": "s", "kind": "still", "src": "<png>", "to": "...", "zoom": [1.0, 1.05], "tile": "calm"}
  ],
  "overlays": [                                   drawn on story shots (ride along through push / pull)
    {"kind": "bubble", "id": "b1", "box": [x0, y0, x1, y1], "tip": [x, y] | {"clip": "sink", "xy": [x, y]},
     "glyph": "?" | "<glyph name>", "from": "expr", "to": "expr", "on": ["a", "b"]},
    {"kind": "glyph", "id": "g1", "glyph": "compressor-noentry", "box": [...], "from": "expr", "to": "expr"},
    {"kind": "coins", "id": "c", "events": [{"at": "expr", "from": pt, "to": pt, "lift": 60, "flight": 0.36,
                                               "into": "b1"}], "keep": true, "r": 22}
  ]
}
Time expressions: "<anchor>[+-seconds]". Anchors (all measured from the prepared voice in timing.json):
  "L3" voice onset of line 3, "L3.end" its last voiced frame, "L3.w5" STT start of display word 5 (0-based),
  "L3|L4" the middle of the gate-silent pause between lines 3 and 4 (".a" / ".b" its start / end), "END" the END
  fade-in, "audio.end", or a plain number (seconds).
Points: [x, y] output px, or {"clip": key, "xy": [x, y]} clip px through that clip's placement.
Glyph names: "?" (a Latin question mark, measured), "phone-ring", "compressor-noentry", "megaphone-q", "tick",
  "coin", "bars", "invoice", "site-one-bar", "phone-off". Add new ones in GLYPHS (pipeline-drawn SVG, no words).
Page card overlay (Site Bot product moment), title sliced from a voice line's display text, never typed:
  {"kind": "pagecard", "id": "pc0", "title": {"line": 5, "after": ". ", "split": ", ", "part": 0},
   "box": [x0, y0, x1, y1], "from": expr, "to": expr, "slide": 140, "tick": expr | null, "on": [shot ids]}
Shot "exit_dur": pull length (default 0.30 s) for a pull inside a shorter mid-line pause.
Timing rules (2026-11-14): shot edges, pull spans and caption starts sit on whole frames (k / 30); an edge inside a
  pause stays inside it and a pull keeps its whole span inside it. Each caption card appears on the frame nearest its
  first word's measured voice onset (VoiceOnsets); the previous card holds through the pause. `evidence` fails on a
  card that leads its voice by more than 0.15 s, and on any shot edge off the frame grid.
Tile values: "deadpan" | "tired" | "calm" | "excited" | "sarcastic", or [expr, "cream" | "mint"].
Real screens (2026-11-14, dash_screen_text.py): a shot of kind "rec", a shot with "demo_tag" or "screen": true, or a
  clip whose clips entry has "screen": true. A clip / still screen is cleared to its own background from
  SCREEN_CLEAR_Y down (just above the caption band), so place it with the UI the voice names above that line.
  `evidence` OCRs every real-screen shot (local RapidOCR) and fails on test / placeholder strings or on screen text
  under a caption card or banner; it also fails when the recorder manifest behind the clip flags a test name.
"""
import hashlib, json, math, os, re, subprocess, sys, unicodedata
TOOLS = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS)
import numpy as np
from PIL import Image, ImageDraw
from dash_full import *
import dash_full as DF
import dash_paths as P
from dash_screen_text import is_screen, clear_band, screen_text_evidence

ROOT = P.ROOT
SR = 44100
GATE = -45.0
PUSH2_DUR = 0.60                      # a later push back in (A1-30 push2)
WHISPER_PY = f"{ROOT}/scratch/voice-venv/bin/python"
WHISPER = f"{ROOT}/scripts/voice/lib/whisper_stt.py"
REC_DIR = f"{ROOT}/scratch/video-dash/a2-15/rec"
REC = f"{REC_DIR}/AL1_dash.mp4"
REC_MANIFEST = f"{REC_DIR}/recordings.manifest.json"
SEED = f"{ROOT}/scratch/video-dash/a2-15/sandbox/seed.json"
SANDBOX = f"{ROOT}/scratch/video-dash/a2-15/sandbox/run"
# the leads page geometry (A1-30 / A2-15 full): CSS px of the recorded page -> output px
PRD_K0, PRD_K1 = 1.24, 1.31
PRD_ANCHOR_CSS, PRD_ANCHOR_OUT = (340.0, 369.0), (467.5, 859.0)
PRD_TITLE_TOP_CSS, PRD_TABLE_CSS = 116.0, (20.0, 218.0, 660.0, 537.0)
PRD_BODY_TOP_CSS = 270.0              # first lead row's top edge (measured on AL1_dash.png at CSS scale); rows split the
                                      # table body evenly, one per seeded lead (4 leads -> 66.75 CSS px each)
TAG_EXPR = {"tired", "deadpan", "calm", "excited", "sarcastic"}


def rp(p):
    return p if os.path.isabs(p) else os.path.join(ROOT, p)


def sh256(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


# ==================================================================== strings (nothing typed)
TAG_RE = re.compile(r"^\[[^\]]+\]\s*")


def display_from_voice(voice):
    """The approved scripts' display rule: drop the leading [tag] and the Hebrew points (niqqud / cantillation,
    combining marks U+0591-U+05C7). Punctuation (maqaf, geresh, gershayim) stays."""
    s = TAG_RE.sub("", voice, count=1)
    s = "".join(c for c in s if not (0x591 <= ord(c) <= 0x5C7 and unicodedata.category(c) == "Mn"))
    assert "[" not in s and s == s.strip() and "  " not in s, s
    return s


def validate_display_rule():
    """display_from_voice() against every display field of the approved Dash scripts JSON (the WAO! END lines,
    whose display adds the brand by design, are the only exceptions)."""
    from dash_strings import SCRIPTS
    d = json.load(open(SCRIPTS, encoding="utf-8"))["episodes"]
    ok = bad = skip = 0
    for ep in d.values():
        for sec in ep.values():
            if not isinstance(sec, list): continue
            for l in sec:
                if not isinstance(l, dict) or "display" not in l or "voice" not in l: continue
                if l["display"].startswith("WAO! "): skip += 1; continue
                if display_from_voice(l["voice"]) == l["display"]: ok += 1
                else: bad += 1
    return ok, bad, skip


class Strings:
    def __init__(self, spec):
        sc = spec["script"]
        node = json.load(open(rp(sc["json"]), encoding="utf-8"))
        for k in sc["path"]: node = node[k]
        self.voice = [l[sc.get("field", "voice")] for l in node]
        self.n = len(self.voice)
        self.display = [display_from_voice(v) for v in self.voice]
        self.src = f'{sc["json"]} {".".join(sc["path"])}[i].{sc.get("field", "voice")}'
        self.S, self.SOURCES = {}, {}
        bl = spec.get("banner_line")
        skip = set(spec.get("no_captions", [])) | ({bl} if bl is not None else set())
        self.caption_lines = [i for i in range(self.n) if i not in skip]
        for i in self.caption_lines:
            self.S[f"caption_L{i}"] = self.display[i]
            self.SOURCES[f"caption_L{i}"] = self.src.replace("[i]", f"[{i}]") + " (tag + niqqud dropped)"
        if bl is not None:
            d = self.display[bl]
            assert d.endswith("."), "banner line must end with a period"
            self.S["banner"] = d[:-1]
            assert self.S["banner"] + "." == d
            self.SOURCES["banner"] = self.src.replace("[i]", f"[{bl}]") + " display minus its final period (asserted)"
        kind = spec["endcard"]
        if kind == "adsbot-v2":
            sys.path.insert(0, f"{ROOT}/scratch/video-dash/a2-15/build/tools")
            import a2_15_strings as A15
            from dash_strings import ads_endcard_v2
            a = A15.load()
            v2 = ads_endcard_v2(0)
            self.S.update(product=a["product"], url=a["url"], stamp=v2["stamp"], cta=v2["cta"], demo_label=a["demo_label"])
            self.leads = a["leads"]
            self.product_dir = "rtl"
            self.SOURCES.update(product=A15.SOURCES["product"], url=A15.SOURCES["url"], demo_label=A15.SOURCES["demo_label"],
                                stamp="ads-bot-end-card-v2 waocopy JSON sets[0].stamp (END card v2, Set 1, Noa PASS)",
                                cta="ads-bot-end-card-v2 waocopy JSON sets[0].cta (== its landing_cta_match.if_set_1)")
        elif kind == "sitebot":
            sys.path.insert(0, f"{ROOT}/scratch/video-dash/s1-15/build/tools")
            import strings as S1
            s = S1.load()
            lex = json.load(open(f"{ROOT}/data/voice/pronunciation-lexicon.json", encoding="utf-8"))
            lid = json.load(open(f"{ROOT}/data/video/config.json"))["products"]["site-bot"]["nameLexiconId"]
            ent = [e for e in lex["entries"] if e["id"] == lid]
            assert len(ent) == 1
            self.S.update(product=ent[0]["clean"], url=s["url"], stamp=s["stamp"], cta=s["cta"], demo_label=s["demo_label"])
            self.leads = None
            self.product_dir = "rtl" if re.search(r"[֐-׿]", ent[0]["clean"]) else "ltr"
            self.SOURCES.update(product="lexicon entry config products.site-bot.nameLexiconId .clean", url="config products.site-bot.url",
                                stamp="site-bot landingCopy.generated.ts launch_stamp (S1-15 END)", cta="site-bot landingCopy.generated.ts cta_primary (S1-15 END)",
                                demo_label="s1-15-demo-site-patches waocopy JSON demo_label .text")
        else:
            raise SystemExit(f"unknown endcard {kind}")
        assert "price" not in self.S


# ==================================================================== voice prep (no model call but local STT)
def pcm16(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).copy()


def db_curve(x, hop=0.005, win=0.040):
    """dBFS of a 40 ms window every 5 ms (the mouth gate's window)."""
    f = x.astype(np.float64) / 32768.0
    c = np.concatenate([[0.0], np.cumsum(f * f)])
    n = int(len(f) / (hop * SR))
    centers = (np.arange(n) * hop * SR).astype(int)
    h = int(win * SR / 2)
    a, b = np.clip(centers - h, 0, len(f)), np.clip(centers + h, 0, len(f))
    ms = (c[b] - c[a]) / np.maximum(b - a, 1)
    return 10 * np.log10(ms + 1e-18), hop


def runs_below(db, hop, thr, min_s):
    s = db < thr
    out, st = [], None
    for i, v in enumerate(list(s) + [False]):
        if v and st is None: st = i
        if not v and st is not None:
            if (i - st) * hop >= min_s: out.append((st * hop, i * hop))
            st = None
    return out


def voiced_span(x, a, b):
    """first / last time above the gate inside samples [a, b)."""
    db, hop = db_curve(x[a:b])
    v = np.where(db >= GATE)[0]
    assert len(v), "no voice in the window"
    return a / SR + v[0] * hop, a / SR + (v[-1] + 1) * hop


def line_splits(x, n, thr, min_s):
    """split points (s) between the n lines: the middle of each long digital silence (the voice-check concat)."""
    db, hop = db_curve(x)
    rs = [r for r in runs_below(db, hop, thr, min_s) if r[0] > 0.05 and r[1] < len(x) / SR - 0.05]
    assert len(rs) == n - 1, (f"found {len(rs)} line gaps for {n} lines; set voice.line_gap_min / line_gap_db", rs)
    return [round((a + b) / 2, 4) for a, b in rs]


def prep(story):
    spec, B = story.spec, story
    v = spec["voice"]
    S = Strings(spec)
    src = rp(v["src"])
    x = pcm16(src)
    splits = line_splits(x, S.n, v.get("line_gap_db", -70), v.get("line_gap_min", 0.38))
    report = dict(source=v["src"], source_sha256=sh256(src), source_duration=len(x) / SR, splits_source=splits, splices=[], removed=[])
    # ---- splice whole lines (the new take keeps the old line's lead-in and tail silences)
    for sp in v.get("splice", []):
        i = sp["line"]
        bnd = [0.0] + splits + [len(x) / SR]
        a, b = int(bnd[i] * SR), int(bnd[i + 1] * SR)
        on, off = voiced_span(x, a, b)
        take = pcm16(rp(sp["take"]))
        ton, toff = voiced_span(take, 0, len(take))
        lead, tail = on - bnd[i], bnd[i + 1] - off
        s0, s1 = int(round((ton - lead) * SR)), int(round((toff + tail) * SR))
        pad0, pad1 = max(0, -s0), max(0, s1 - len(take))
        seg = np.concatenate([np.zeros(pad0, np.int16), take[max(0, s0):min(len(take), s1)], np.zeros(pad1, np.int16)])
        old = x[a:b]
        rms = lambda y: float(20 * np.log10(np.sqrt(np.mean((y.astype(np.float64) / 32768) ** 2)) + 1e-12))
        x = np.concatenate([x[:a], seg, x[b:]])
        dl = (len(seg) - (b - a)) / SR
        splits = [s if k < i else s + dl for k, s in enumerate(splits)]
        report["splices"].append(dict(line=i, take=sp["take"], take_sha256=sh256(rp(sp["take"])), old_window=[bnd[i], bnd[i + 1]],
                                      old_voice=[on, off], take_voice=[ton, toff], lead_in=lead, tail=tail,
                                      old_len=(b - a) / SR, new_len=len(seg) / SR, delta=dl, rms_old_db=rms(old), rms_new_db=rms(seg)))
    # ---- tighten: cap every gate-silent run; between-line runs (holding a split) get `between`, others `intra`
    tg = v.get("tighten")
    keep = []          # (src_start, src_end) of the kept pieces, for the word-preservation check
    if tg:
        db, hop = db_curve(x)
        runs = runs_below(db, hop, GATE, 0.12)
        cuts = []
        for a, b in runs:
            if a < 0.05 or b > len(x) / SR - 0.05: continue        # lead-in / tail stay
            inside = [k for k, s in enumerate(splits) if a <= s <= b]
            if inside:
                k = inside[0]
                cap = tg.get("gaps", {}).get(f"{k}|{k + 1}", tg["between"])
            else:
                cap = tg["intra"]
            if b - a > cap + 0.01:
                rm = (b - a) - cap
                c0 = (a + b) / 2 - rm / 2
                cuts.append((int(round(c0 * SR)), int(round((c0 + rm) * SR)), "between" if inside else "intra", a, b))
        pieces, pos = [], 0
        XF = int(0.005 * SR)
        out = []
        for c0, c1, kind, a, b in cuts:
            out.append(x[pos:c0]); keep.append((pos, c0)); pos = c1
            report["removed"].append(dict(kind=kind, run=[round(a, 3), round(b, 3)], removed=[c0 / SR, c1 / SR], seconds=(c1 - c0) / SR,
                                          max_db_removed=float(db_curve(x[c0 - 900:c1 + 900])[0].max())))
        out.append(x[pos:]); keep.append((pos, len(x)))
        y = out[0].astype(np.float32)
        for seg in out[1:]:
            seg = seg.astype(np.float32)
            n = min(XF, len(y), len(seg))
            r = np.linspace(0, 1, n, dtype=np.float32)
            y[-n:] = y[-n:] * (1 - r) + seg[:n] * r
            y = np.concatenate([y, seg[n:]])
        y = np.clip(np.rint(y), -32768, 32767).astype(np.int16)
        # map the split points
        def mp(t):
            s = int(t * SR); d = 0
            for c0, c1, *_ in cuts:
                if c1 <= s: d += c1 - c0
                elif c0 <= s < c1: return (c0 - d) / SR
            return (s - d) / SR
        splits = [mp(s) for s in splits]
        report["tighten"] = tg
        x_pre = x
        x = y
    else:
        x_pre = x
    os.makedirs(B.build, exist_ok=True)
    wav = f"{B.build}/voice.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", wav], input=x.tobytes(), check=True)
    report.update(prepared=os.path.relpath(wav, ROOT), prepared_sha256=sh256(wav), duration=len(x) / SR, splits=splits)
    # ---- words preserved: every voiced sample of the pre-tighten audio is in the prepared audio, byte-exact,
    # except the 5 ms crossfades inside removed silences
    if keep:
        db, hop = db_curve(x_pre)
        voiced = np.repeat(db >= GATE, int(round(hop * SR)))[:len(x_pre)]
        voiced = np.concatenate([voiced, np.ones(len(x_pre) - len(voiced), bool)])     # the unmeasured tail counts as voiced
        kept = np.zeros(len(x_pre), bool)
        for a, b in keep: kept[a:b] = True
        lost = int((voiced & ~kept).sum())
        report["voiced_samples_removed"] = lost
        assert lost == 0, ("tighten removed voiced samples", lost)
    # ---- the mouth gate on the prepared audio (same function, same frames as the render)
    from dash_face import mouth_levels
    import dash_evidence as ev
    nf = int(math.ceil(len(x) / SR * FPS)) + 1
    _, fdb = mouth_levels(wav, FPS, nf, full_db="auto", edges=(0.12, 0.50, 0.78))
    runs = ev.silent_runs(fdb)
    bnd = [0.0] + splits + [len(x) / SR]
    lines = []
    for i in range(S.n):
        fr = [f for f in range(int(bnd[i] * FPS), min(int(bnd[i + 1] * FPS) + 1, nf)) if fdb[f] >= GATE]
        lines.append(dict(i=i, window=[bnd[i], bnd[i + 1]], t0=round(fr[0] / FPS, 3), t1=round((fr[-1] + 1) / FPS, 3)))
    gaps = []
    for i in range(S.n - 1):
        cand = [(a, b) for a, b in runs if a < lines[i + 1]["t0"] + 0.02 and b > lines[i]["t1"] - 0.02]
        assert cand, ("no gate-silent run between lines", i)
        a, b = max(cand, key=lambda r: r[1] - r[0])
        gaps.append(dict(between=[i, i + 1], a=round(a, 3), b=round(b, 3)))
    # ---- local STT (faster-whisper, zero cost) for word starts
    stt = json.loads(subprocess.run([WHISPER_PY, "-I", WHISPER, wav], capture_output=True, text=True, check=True).stdout)
    words = [w for w in stt["words"] if w.get("type", "word") == "word"]
    assign_word_starts(S, lines, words)
    report.update(lines=lines, gaps=gaps, stt_model="local faster-whisper (scripts/voice/lib/whisper_stt.py)",
                  stt_raw=[dict(text=w["text"], start=w["start"]) for w in words])
    json.dump(report, open(B.timing_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"prepared {wav}: {report['source_duration']:.2f}s -> {report['duration']:.2f}s")
    for l in lines:
        print(f"  L{l['i']}: {l['t0']:6.2f}-{l['t1']:6.2f}s  words stt/display {l['stt_words']}/{l['display_words']}{'' if l['words'] else '  (no word starts: captions by character position)'}")
    for g in gaps: print(f"  gap L{g['between'][0]}|L{g['between'][1]}: gate-silent {g['a']:.2f}-{g['b']:.2f}s ({g['b'] - g['a']:.2f}s)")


def align_stt(S, lines, words):
    """display word index (whole script, in order) -> STT start. The STT words are aligned to the display words in
    order (a word's timestamp may drift across a line split, so assigning by window alone mis-counts): 1:1 where the
    token runs agree or have the same length; a re-chunked run (a maqaf pair heard as two, a word heard as two other
    words, e.g. one display word STT-heard as two) maps each display word to the STT word under the same relative
    letter position, so a word-count mismatch no longer leaves a line without word starts."""
    import difflib
    norm = lambda w: re.sub(r"[^\u05D0-\u05EAA-Za-z0-9]", "", w)
    disp = [(l["i"], k, w) for l in lines for k, w in enumerate(S.display[l["i"]].split(" "))]
    sm = difflib.SequenceMatcher(None, [norm(w) for _, _, w in disp], [norm(w["text"]) for w in words], autojunk=False)
    start = {}
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op == "equal" or (op == "replace" and a1 - a0 == b1 - b0):
            for k in range(a1 - a0): start[a0 + k] = words[b0 + k]["start"]
        elif op == "replace":
            dl = [max(1, len(norm(w))) for _, _, w in disp[a0:a1]]; sl = [max(1, len(norm(w["text"]))) for w in words[b0:b1]]
            D, Sn = float(sum(dl)), float(sum(sl))
            sst, c = [], 0
            for n in sl: sst.append(c / Sn); c += n
            c = 0
            for k, n in enumerate(dl):
                j = max(m for m, e in enumerate(sst) if e <= c / D + 1e-9)
                start[a0 + k] = words[b0 + j]["start"]; c += n
    return disp, start


def assign_word_starts(S, lines, words):
    disp, start = align_stt(S, lines, words)
    for l in lines:
        idx = [n for n, (i, _, _) in enumerate(disp) if i == l["i"]]
        l["display_words"] = len(idx)
        l["stt_words"] = sum(1 for n in idx if n in start)
        l["stt"] = " ".join(w["text"] for w in words if l["window"][0] <= w["start"] < l["window"][1])
        # a start that drifted before the line's voice onset (or past its end) is clamped into the line
        l["words"] = [round(min(max(start[n], l["t0"]), l["t1"]), 3) for n in idx] if all(n in start for n in idx) else None


def stt_words(story, T):
    """the local STT words of the prepared voice: from timing.json (stt_raw, written by prep) or a cached local
    faster-whisper run over the prepared WAV (zero cost, no model API)."""
    if T.get("stt_raw"): return T["stt_raw"]
    cache = f"{story.build}/stt.json"
    if not (os.path.exists(cache) and json.load(open(cache)).get("prepared_sha256") == T["prepared_sha256"]):
        stt = json.loads(subprocess.run([WHISPER_PY, "-I", WHISPER, rp(T["prepared"])], capture_output=True, text=True, check=True).stdout)
        json.dump(dict(prepared_sha256=T["prepared_sha256"], words=[dict(text=w["text"], start=w["start"]) for w in stt["words"] if w.get("type", "word") == "word"]),
                  open(cache, "w", encoding="utf-8"), ensure_ascii=False)
    return json.load(open(cache, encoding="utf-8"))["words"]


# ==================================================================== voice onsets (caption timing)
ONSET_GATE = -40.0          # speech gate for caption onsets: breaths / room tone between words sit at -40..-45 dB and
                            # are not the word (the -45 dB mouth gate would call them voice and start a card early)
ONSET_RUN_MIN = 0.05        # a run below ONSET_GATE (5 ms hop) this long is a pause
ONSET_BLIP = 0.06           # voiced blips shorter than this (a click, a breath edge) do not end a pause
ONSET_TAIL_DB = -32.0       # ...and only if that stretch stays below speech level (a decay / breath), or is <= 0.10 s
ONSET_TAIL = 0.25           # STT puts a word that follows a pause at the previous word's END (it absorbs the pause):
                            # a pause starting this soon after the STT start is the one before the word
ONSET_DIP_DB, ONSET_DIP_MIN = -33.0, 0.02     # inside running speech (no pause before the word) the STT start is
ONSET_DEEP_DB = -38.0                           # refined to a loudness dip within -0.10..+0.15 s of it: the first deep
                                                # one (min <= -38 dB), else the nearest below -35 dB; never further, so
                                                # a mid-speech card stays within the STT's own error
ONSET_AGREE = 0.03          # ...except when a dip (<= -35 dB) ends within this of the STT start: STT and loudness agree
                            # on the boundary there, and a later deeper dip is a stop closure INSIDE the word (the
                            # silence before a plosive), not its start (ST16 cap_3_1, 2026-11-14: +0.153 s late)
END_HOLD = 3.8              # the house END-card hold (s) for every story; `evidence` fails on any other value
CAP_EARLY_MAX = 0.15        # a caption card may lead its first word's voice onset by at most this (evidence fails)


class VoiceOnsets:
    """voice onsets of the prepared WAV on its loudness (db_curve: 5 ms hop, 40 ms window), speech gate ONSET_GATE."""
    def __init__(self, wav):
        x = pcm16(wav)
        db, hop = db_curve(x)
        merged = []
        for a, b in runs_below(db, hop, ONSET_GATE, ONSET_RUN_MIN):
            if merged and a - merged[-1][1] < ONSET_BLIP: merged[-1] = (merged[-1][0], b)
            else: merged.append((a, b))
        self.runs = merged
        self.db, self.hop = db, hop
        self.dips = [(a, b, float(db[int(a / hop):max(int(b / hop), int(a / hop) + 1)].min()))
                     for a, b in runs_below(db, hop, ONSET_DIP_DB, ONSET_DIP_MIN)]

    def pause_at(self, t, nxt=None, line_start=False):
        """the pause a card at t sits in or just before (the previous word's tail), or None. nxt: the next word's
        STT start; when STT starts the next word right at the pause's START, the pause belongs AFTER this word (a short
        word, then a comma) and the card stays. line_start: t is a measured line onset (not an STT start), so a
        loud stretch before the pause is the line's first word, not the previous word's tail (is_tail)."""
        for a, b in self.runs:
            if a <= t < b: return a, b
        for a, b in self.runs:
            if t < a <= t + ONSET_TAIL and (nxt is None or abs(nxt - a) > 0.08) and (not line_start or self.is_tail(t, a)): return a, b
        return None

    def is_tail(self, t, a):
        """the voiced stretch t..a before a pause is a TAIL (the previous word decaying, a breath) when it is short
        (<= 0.10 s) or never reaches speech level (peak < ONSET_TAIL_DB); a loud stretch is a word of its own."""
        i0, i1 = int(t / self.hop), max(int(a / self.hop), int(t / self.hop) + 1)
        return a - t <= 0.10 or float(self.db[i0:i1].max()) < ONSET_TAIL_DB

    def onset(self, t, nxt=None, lo=None, hi=None, dips=True):
        """(onset, how) of the word whose STT start is t (dips=False: t is already a measured line onset)."""
        ls = not dips
        p = self.pause_at(t, nxt, ls)
        if p: return self.settle(p[1], nxt, ls), "pause"
        if ls: return self.settle(t, nxt, True), "line"
        # a dip ending at / past the NEXT word's STT start is that word's boundary, not this one's (ST16 cap_3_2)
        ok = lambda b: (lo is None or b > lo + 0.10) and (nxt is None or b < nxt - ONSET_AGREE)
        on, how = t, "stt"
        deep = [(a, b, m) for a, b, m in self.dips if t - 0.10 <= b <= t + 0.15 and m <= ONSET_DEEP_DB and ok(b)]
        ds = [(a, b, m) for a, b, m in self.dips if t - 0.10 <= b <= t + 0.15 and m <= -35.0 and ok(b)]
        agree = [(a, b, m) for a, b, m in ds if abs(b - t) <= ONSET_AGREE]
        if agree: on, how = min(agree, key=lambda r: abs(r[1] - t))[1], "dip"   # STT and loudness agree on the boundary
        elif deep: on, how = min(deep, key=lambda r: r[1])[1], "dip"      # the first deep dip at / after the STT start
        elif ds: on, how = min(ds, key=lambda r: abs(r[1] - t))[1], "dip"
        st = self.settle(on, nxt)
        return st, ("pause" if st != on else how)

    def settle(self, on, nxt=None, line_start=False):
        """the card's FRAME must not land in a pause, or in a breath / tail just before one, either: move on to that
        pause's end until it holds."""
        for _ in range(4):
            p = self.pause_at(frame_round(on), nxt, line_start)
            if not p or p[1] <= on: return on
            on = p[1]
        return on


def frame_ceil(t):
    """the first frame time >= t (k / FPS, the same float the renderer compares: f / FPS)."""
    k = int(math.ceil(t * FPS - 1e-6))
    return k / FPS


def frame_round(t):
    return int(round(t * FPS)) / FPS


# ==================================================================== the story
class Story:
    def __init__(self, path):
        self.path = os.path.abspath(path)
        self.spec = json.load(open(self.path, encoding="utf-8"))
        self.id = self.spec["id"]
        self.dir = os.path.dirname(self.path)
        self.build = os.path.abspath(P.BUILD_DIR) if P.BUILD_DIR else f"{self.dir}/story-build"
        self.ov = f"{self.build}/ov"
        self.timing_path = f"{self.build}/timing.json"
        self.out_dir = f"{os.path.abspath(P.OUT_ROOT)}/{self.id}"
        self.mp4 = f"{self.out_dir}/{self.id}_9x16_he_FULL.mp4"

    def timing(self):
        assert os.path.exists(self.timing_path), "run `prep` first"
        T = json.load(open(self.timing_path, encoding="utf-8"))
        assert sh256(rp(T["prepared"])) == T["prepared_sha256"], "prepared voice changed since prep"
        assert sh256(rp(self.spec["voice"]["src"])) == T["source_sha256"], "voice source changed since prep: re-run prep"
        return T


class Times:
    """time expressions -> seconds, all from timing.json."""
    def __init__(self, T, end_t=None):
        self.T, self.end_t = T, end_t
        self.L = {l["i"]: l for l in T["lines"]}
        self.G = {tuple(g["between"]): g for g in T["gaps"]}

    def anchor(self, a):
        try: return float(a)
        except ValueError: pass
        if a == "END":
            assert self.end_t is not None; return self.end_t
        if a == "audio.end": return self.T["duration"]
        m = re.fullmatch(r"L(\d+)\|L(\d+)(?:\.(a|b|mid))?", a)
        if m:
            i, j = int(m[1]), int(m[2]); assert j == i + 1, a
            g = self.G[(i, j)]
            return {"a": g["a"], "b": g["b"]}.get(m[3], round((g["a"] + g["b"]) / 2, 3))
        m = re.fullmatch(r"L(\d+)(?:\.(end|w(\d+)))?", a)
        if m:
            l = self.L[int(m[1])]
            if not m[2]: return l["t0"]
            if m[2] == "end": return l["t1"]
            assert l["words"], f"no STT word starts for L{m[1]} (word count mismatch): use L/gap anchors"
            return l["words"][int(m[3])]
        raise ValueError(f"bad time anchor {a!r}")

    def __call__(self, e):
        if isinstance(e, (int, float)): return float(e)
        m = re.fullmatch(r"(.+?)([+-]\d*\.?\d+)?", e.strip())
        return round(self.anchor(m[1]) + (float(m[2]) if m[2] else 0.0), 3)


# ==================================================================== drawing helpers (no text)
SSD = 3
CREAM = (248, 239, 220)
NAVY = (13, 17, 23)
AMBER = (0xF2, 0xC1, 0x4E)
AMBER_SIDE = (0xC9, 0x97, 0x2E)


def _layer(size):
    return Image.new("RGBA", (size[0] * SSD, size[1] * SSD), (0, 0, 0, 0))


def _down(im, size):
    a = np.asarray(im.resize(size, Image.LANCZOS), np.float32)
    return a[..., :3], a[..., 3:] / 255.0


def coin(rx, ry, thick):
    """one amber coin (top face ellipse + rim), the A1-30 / A2-30 look."""
    w, h = int(2 * rx + 8), int(2 * ry + thick + 8)
    im = _layer((w, h)); d = ImageDraw.Draw(im)
    s = lambda v: v * SSD
    cx, yt = w / 2, 4 + ry
    yb = yt + thick
    lw = max(1, round(1.8 * SSD))
    d.ellipse([s(cx - rx), s(yb - ry), s(cx + rx), s(yb + ry)], fill=AMBER_SIDE + (255,), outline=NAVY + (255,), width=lw)
    d.rectangle([s(cx - rx), s(yt), s(cx + rx), s(yb)], fill=AMBER_SIDE + (255,))
    d.line([s(cx - rx), s(yt), s(cx - rx), s(yb)], fill=NAVY + (255,), width=lw)
    d.line([s(cx + rx), s(yt), s(cx + rx), s(yb)], fill=NAVY + (255,), width=lw)
    d.ellipse([s(cx - rx), s(yt - ry), s(cx + rx), s(yt + ry)], fill=AMBER + (255,), outline=NAVY + (255,), width=lw)
    rgb, a = _down(im, (w, h))
    return rgb, a, (w / 2, yt)


_COINS = {}


def put_coin(out, x, y, rx, ry, thick, alpha=1.0):
    from dash_compose import over
    key = (round(rx, 1), round(max(ry, 1.5), 1), round(thick, 1))
    if key not in _COINS: _COINS[key] = coin(*key)
    rgb, a, (ax, ay) = _COINS[key]
    over(out, rgb, a * alpha, int(round(x - ax)), int(round(y - ay)))


def arc(p0, p1, u, lift):
    return p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u - lift * 4 * u * (1 - u)


# ==================================================================== glyphs (pipeline SVG, no words)
C_CREAM, C_MINT, C_RED, C_AMBER = "#F8EFDC", "#4AE3B5", "#FF5E5E", "#F2C14E"


def _svg(inner, vb=100):
    return f'<svg viewBox="0 0 {vb} {vb}" width="100%" height="100%" style="display:block">{inner}</svg>'


GLYPHS = {
    "phone-ring": _svg(f'<rect x="34" y="18" width="32" height="60" rx="7" fill="none" stroke="{C_CREAM}" stroke-width="5"/>'
                       f'<circle cx="50" cy="69" r="3.5" fill="{C_CREAM}"/>'
                       f'<path d="M22 32 Q14 48 22 64 M78 32 Q86 48 78 64" fill="none" stroke="{C_MINT}" stroke-width="5" stroke-linecap="round"/>'
                       f'<path d="M12 24 Q0 48 12 72 M88 24 Q100 48 88 72" fill="none" stroke="{C_MINT}" stroke-width="4" stroke-linecap="round" opacity=".6"/>'),
    "compressor-noentry": _svg(f'<rect x="8" y="26" width="64" height="48" rx="6" fill="none" stroke="{C_CREAM}" stroke-width="5"/>'
                               f'<circle cx="30" cy="50" r="14" fill="none" stroke="{C_CREAM}" stroke-width="4"/>'
                               f'<path d="M30 38 L30 62 M18 50 L42 50" stroke="{C_CREAM}" stroke-width="3"/>'
                               + "".join(f'<path d="M52 {y} L64 {y}" stroke="{C_CREAM}" stroke-width="3" stroke-linecap="round"/>' for y in (38, 46, 54, 62))
                               + f'<circle cx="72" cy="72" r="19" fill="#111522" stroke="{C_RED}" stroke-width="6"/>'
                               f'<path d="M61 72 L83 72" stroke="{C_RED}" stroke-width="7" stroke-linecap="round"/>'),
    "megaphone": _svg(f'<path d="M14 42 L14 60 L30 60 L66 78 L66 24 L30 42 Z" fill="none" stroke="{C_CREAM}" stroke-width="5" stroke-linejoin="round"/>'
                      f'<path d="M30 60 L36 82 L46 82 L42 64" fill="none" stroke="{C_CREAM}" stroke-width="5" stroke-linejoin="round"/>'
                      f'<path d="M76 40 Q82 51 76 62" fill="none" stroke="{C_MINT}" stroke-width="4" stroke-linecap="round"/>'),
    "tick": _svg(f'<circle cx="50" cy="50" r="40" fill="none" stroke="{C_MINT}" stroke-width="7"/>'
                 f'<path d="M30 52 L45 66 L71 36" fill="none" stroke="{C_MINT}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'),
    "coin": _svg(f'<ellipse cx="50" cy="56" rx="34" ry="16" fill="#C9972E" stroke="#0D1117" stroke-width="3"/>'
                 f'<ellipse cx="50" cy="48" rx="34" ry="16" fill="{C_AMBER}" stroke="#0D1117" stroke-width="3"/>'),
}
C_GREY = "#5E6878"
GLYPHS.update({        # seat-2 (ST04 / ST07 / ST13)
    "bars": _svg(f'<rect x="14" y="26" width="72" height="11" rx="5.5" fill="{C_CREAM}"/>'
                 f'<rect x="14" y="45" width="58" height="11" rx="5.5" fill="{C_CREAM}" opacity=".85"/>'
                 f'<rect x="14" y="64" width="40" height="11" rx="5.5" fill="{C_CREAM}" opacity=".7"/>'),
    "invoice": _svg(f'<path d="M22 8 L64 8 L80 24 L80 92 L22 92 Z" fill="{C_CREAM}" stroke="#0D1117" stroke-width="2.5" stroke-linejoin="round"/>'
                    f'<path d="M64 8 L64 24 L80 24" fill="none" stroke="#0D1117" stroke-width="2.5" stroke-linejoin="round"/>'
                    + "".join(f'<rect x="31" y="{y}" width="{w}" height="5" rx="2.5" fill="#9AA7B5"/>' for y, w in ((32, 30), (44, 40), (54, 34), (64, 40)))
                    + '<rect x="31" y="77" width="40" height="8" rx="3" fill="#C9972E"/>'),
    "site-one-bar": _svg(f'<rect x="26" y="6" width="48" height="88" rx="9" fill="none" stroke="{C_CREAM}" stroke-width="5"/>'
                         f'<circle cx="50" cy="85" r="3" fill="{C_CREAM}"/>'
                         f'<rect x="33" y="16" width="34" height="7" rx="3.5" fill="{C_CREAM}" opacity=".45"/>'
                         f'<rect x="35" y="36" width="30" height="12" rx="6" fill="{C_CREAM}"/>'),
    "phone-off": _svg(f'<rect x="34" y="18" width="32" height="60" rx="7" fill="none" stroke="{C_GREY}" stroke-width="5"/>'
                      f'<circle cx="50" cy="69" r="3.5" fill="{C_GREY}"/>'),
})
GLYPH_Q = {"megaphone-q": "megaphone"}      # glyph + a measured Latin question mark


def glyph_html(name, x0, y0, x1, y1, card=True):
    """a glyph card (screen navy, cream line) filling the box; "?" / "*-q" add a measured question mark."""
    from dash_overlays import SCREEN, MINT as MINT_H
    w, h = x1 - x0, y1 - y0
    card_css = f"background:{SCREEN};border:6px solid {C_CREAM};border-radius:34px;box-sizing:border-box;" if card else ""
    q = f'<div data-m="q" style="font-weight:800;font-size:{int(h * 0.62)}px;line-height:1;color:{MINT_H};direction:ltr">?</div>'
    if name == "?":
        inner = q
    elif name in GLYPH_Q:
        inner = f'<div style="width:{int(h * 0.72)}px;height:{int(h * 0.72)}px">{GLYPHS[GLYPH_Q[name]]}</div>' + q
    else:
        inner = f'<div style="width:{int(min(w, h) * 0.78)}px;height:{int(min(w, h) * 0.78)}px">{GLYPHS[name]}</div>'
    return (f'<div style="position:absolute;left:{x0}px;top:{y0}px;width:{w}px;height:{h}px;{card_css}display:flex;align-items:center;'
            f'justify-content:center;gap:6px">{inner}</div>')


def bubble_html(box, tip, glyph):
    """speech bubble: rounded body, a tail to the tip, the glyph inside (A1-30 bubble style)."""
    from dash_overlays import SCREEN
    x0, y0, x1, y1 = box
    tx, ty = tip
    # tail from the body edge nearest the tip
    bx = min(max(tx, x0 + 50), x1 - 50)
    by = y1 if ty > y1 else y0 if ty < y0 else (y0 + y1) / 2
    vert = ty > y1 or ty < y0
    if vert:
        b0, b1 = (bx - 26, by), (bx + 26, by)
    else:
        bx = x1 if tx > x1 else x0
        b0, b1 = (bx, by - 26), (bx, by + 26)
    svg = f"""<svg width="{W}" height="{H}" style="position:absolute;left:0;top:0">
<path d="M{b0[0]:.1f} {b0[1]:.1f} L{tx:.1f} {ty:.1f} L{b1[0]:.1f} {b1[1]:.1f} Z" fill="{SCREEN}" stroke="{C_CREAM}" stroke-width="6" stroke-linejoin="round"/>
<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" rx="40" fill="{SCREEN}" stroke="{C_CREAM}" stroke-width="6"/>
<path d="M{b0[0] + (3 if not vert else 4):.1f} {b0[1] + (0 if not vert else (-3 if by == y1 else 3)):.1f} L{b1[0] - (0 if not vert else 4):.1f} {b1[1] + (0 if not vert else (-3 if by == y1 else 3)):.1f}" stroke="{SCREEN}" stroke-width="8"/>
</svg>"""
    pad = 18
    return svg + glyph_html(glyph, x0 + pad, y0 + pad, x1 - pad, y1 - pad, card=False)


# ==================================================================== page card (Site Bot product moment)
def card_titles(S, t):
    """the page-card title: a slice of the voice line's display text (no typing): display[line] after the first
    `after`, final period dropped, split on `split`, element `part`."""
    d = S.display[t["line"]]
    i = d.index(t["after"])
    rest = d[i + len(t["after"]):]
    assert rest.endswith("."), rest
    parts = rest[:-1].split(t["split"])
    return parts[t["part"]], parts, f'{S.src.replace("[i]", "[" + str(t["line"]) + "]")} display after the first {t["after"]!r}, final period dropped, split on {t["split"]!r}, part {t["part"]}'


def pagecard_html(box, title):
    from dash_overlays import SCREEN, OFF, MUTED, E
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    dots = "".join(f'<span style="width:14px;height:14px;border-radius:7px;background:{c};display:inline-block"></span>' for c in (MUTED, MUTED, MUTED))
    return (f'<div style="position:absolute;left:{x0}px;top:{y0}px;width:{w}px;height:{h}px;background:{SCREEN};border:6px solid {C_CREAM};'
            f'border-radius:30px;box-sizing:border-box;overflow:hidden">'
            f'<div style="height:34px;border-bottom:3px solid rgba(248,239,220,.35);display:flex;gap:9px;align-items:center;padding:0 22px;direction:ltr">{dots}</div>'
            f'<div style="position:absolute;right:34px;top:52px;left:{int(h * 0.62) + 40}px;direction:rtl;text-align:right">'
            f'<div dir="rtl" lang="he" data-m="title" style="font-weight:800;font-size:62px;line-height:1.1;color:{OFF};white-space:nowrap">{E(title)}</div>'
            f'<div style="margin-top:16px;height:12px;width:72%;margin-left:auto;border-radius:6px;background:rgba(154,167,181,.55)"></div>'
            f'<div style="margin-top:10px;height:12px;width:50%;margin-left:auto;border-radius:6px;background:rgba(154,167,181,.35)"></div>'
            f'</div></div>')


def tick_box(box):
    x0, y0, x1, y1 = box
    sz = int((y1 - y0) * 0.62)
    cy = (y0 + 34 + y1) // 2
    return [x0 + 26, cy - sz // 2, x0 + 26 + sz, cy - sz // 2 + sz]


# ==================================================================== build
def tile_spec(v):
    if v is None: return None
    if isinstance(v, str): v = [v, "cream"]
    assert v[0] in TAG_EXPR and v[1] in ("cream", "mint"), v
    return tuple(v)


def ink_box(fc, thr=60):
    """the clip's ink box (clip px): pixels far from its flat background on every 10th frame, 0.2-99.8 percentile
    (the wan backdrop's faint panel texture stays out)."""
    fr = fc.frames[::10].astype(np.int16)
    d = (np.abs(fr - np.array(fc.bg, np.int16)).max(3) > thr).any(0)
    ys, xs = np.where(d)
    return (int(np.percentile(xs, 0.2)), int(np.percentile(ys, 0.2)), int(np.percentile(xs, 99.8)) + 1, int(np.percentile(ys, 99.8)) + 1)


def measure_place(fc, spec):
    """placement from the measured ink box. spec "auto" / {"fit": [x0, y0, x1, y1]}: the whole ink box fitted into the
    box (default x0-1080, y300-1085: above the caption band), ground on its bottom, k <= 1.5.
    {"k": k, "bottom": y, "cx": x}: scale k, ink bottom on output row y, ink centre on output column x (the top may
    leave the frame: use it when the action sits low and the sky does not matter)."""
    bx0, by0, bx1, by1 = ink_box(fc)
    if isinstance(spec, dict) and "k" in spec:
        k = spec["k"]
        return (k, round(spec.get("cx", W / 2) - k * (bx0 + bx1) / 2, 1), round(spec["bottom"] - k * by1, 1)), (bx0, by0, bx1, by1)
    x0, y0, x1, y1 = spec.get("fit", (0, 300, W, 1085)) if isinstance(spec, dict) else (0, 300, W, 1085)
    k = min(FULL_K, (x1 - x0) / (bx1 - bx0), (y1 - y0) / (by1 - by0))
    return (round(k, 4), round((x0 + x1) / 2 - k * (bx0 + bx1) / 2, 1), round(y1 - k * by1, 1)), (bx0, by0, bx1, by1)


class Build:
    def __init__(self, story, need_frames=True):
        self.story = story
        spec = story.spec
        self.spec = spec
        self.T = story.timing()
        self.S = Strings(spec)
        tm = Times(self.T)
        self.fruns = self._frame_runs()
        self.END_T = self.snap_edge(tm(spec["end"]["at"]))
        self.tm = Times(self.T, self.END_T)
        self.TOTAL = round(self.END_T + spec["end"].get("hold", END_HOLD), 2)
        self.AUDIO = rp(self.T["prepared"])
        self.L = {l["i"]: (l["t0"], l["t1"]) for l in self.T["lines"]}
        # clips
        self.clips, self.places, self.ink = {}, {}, {}
        for key, c in spec.get("clips", {}).items():
            fc = FullClip(rp(c["src"]), ss=c.get("ss", 0.5))
            self.clips[key] = fc
            if c.get("place", "auto") == "auto" or isinstance(c.get("place"), dict):
                self.places[key], self.ink[key] = measure_place(fc, c.get("place", "auto"))
            else:
                self.places[key] = tuple(c["place"])
            fc.place = self.places[key]
        # shots
        self.shots, t = [], 0.0
        for s in spec["shots"]:
            s = dict(s)
            s["t0"] = t
            if s.get("to") == "END": s["t1"] = self.END_T
            else:
                raw = self.tm(s["to"])
                s["t1"] = self.snap_edge(raw, pull=s.get("exit_dur", PULL_DUR) if s.get("exit") == "pull" else None)
                s["t1_raw"] = raw
            assert s["t1"] > s["t0"], ("shot runs backwards", s["id"], s["t0"], s["t1"])
            t = s["t1"]
            s["tile"] = tile_spec(s.get("tile"))
            self.shots.append(s)
        assert abs(t - self.END_T) < 1e-6, f"the last shot must end at the END fade-in ({self.END_T}): set its to to END"
        assert self.shots[0]["kind"] == "face", "a story opens on Dash at the dashboard (EST)"
        self.EST_FACE_END = self.shots[0]["t1"]
        self.overlays = spec.get("overlays", [])
        for o in self.overlays:
            if "from" in o: o["t0"] = self.tm(o["from"])
            if "to" in o: o["t1"] = self.tm(o["to"])
            if o["kind"] == "coins":
                for e in o["events"]: e["t"] = self.tm(e["at"])
            if o["kind"] == "pagecard" and o.get("tick"): o["tick_t"] = self.tm(o["tick"])
        self.groups = {}
        self.blinks = self._blinks()
        self.slow_blinks = [self.tm(e) for e in spec.get("slow_blinks", [])]
        self.glances = [(self.tm(a), self.tm(b)) for a, b in spec.get("glances", [])]

    # ---------------------------------------------------------------- frame snapping
    def _frame_runs(self):
        """gate-silent runs of the prepared voice in whole frames (the per-frame loudness the mouth, the cut checks and
        the evidence use): [(x, y)] with x, y multiples of 1 / FPS."""
        from dash_face import mouth_levels
        import dash_evidence as ev
        nf = int(math.ceil((self.T["duration"] + 15.0) * FPS))     # past the voice: the silent tail under the END card
        _, fdb = mouth_levels(rp(self.T["prepared"]), FPS, nf, full_db="auto", edges=(0.12, 0.50, 0.78))
        return [(int(round(x * FPS)) / FPS, int(round(y * FPS)) / FPS) for x, y in ev.silent_runs(fdb)]

    def snap_edge(self, t, pull=None):
        """a shot edge on a whole frame (k / FPS: the frame that first shows the next shot). An edge inside a
        gate-silent run stays inside it; a pull (duration `pull`) ending at the edge keeps its whole span inside the
        run (the edge moves to the latest frame that allows it, never into the next line's first voiced frame)."""
        k = frame_round(t)
        r = next(((x, y) for x, y in self.fruns if x - 1e-6 <= t <= y + 1e-6), None)
        if r is None: return k
        x, y = r
        k = min(max(k, x), y)
        if pull is not None:
            pf = int(round(pull * FPS)) / FPS
            if k - pf < x - 1e-6: k = min(y, frame_ceil(x + pf))
        return k

    # ---------------------------------------------------------------- helpers
    def pt(self, p, shot=None):
        if isinstance(p, dict):
            k, ox, oy = self.places[p["clip"]]
            return k * p["xy"][0] + ox, k * p["xy"][1] + oy
        return tuple(p)

    def _blinks(self):
        b = self.spec.get("blinks", "auto")
        if b == "auto":
            return [round(g["a"] + 0.05, 2) for g in self.T["gaps"] if g["b"] - g["a"] >= 0.30 and g["a"] + 0.05 < self.END_T]
        return [self.tm(e) for e in b]

    def shot_at(self, t):
        for s in self.shots:
            if s["t0"] <= t < s["t1"]: return s
        return self.shots[-1] if t >= self.shots[-1]["t1"] else None     # under the END fade the last shot runs on

    def push_window(self, s):
        if s.get("enter") != "push": return None
        d = s.get("enter_dur", PUSH_DUR if s["t0"] == self.EST_FACE_END else PUSH2_DUR)
        return s["t0"], s["t0"] + d

    def pull_window(self, s):
        """per-shot "exit_dur" (default PULL_DUR 0.30, in whole frames): a punchline pull inside a mid-line pause shorter
        than 0.30 s. The evidence checks the whole pull span sits inside one gate-silent run."""
        if s.get("exit") != "pull": return None
        return s["t1"] - int(round(s.get("exit_dur", PULL_DUR) * FPS)) / FPS, s["t1"]

    def tile_state(self, t):
        s = self.shot_at(t)
        if s is None or t >= self.END_T or s["kind"] == "face" or not s["tile"]: return None
        pw, pl = self.push_window(s), self.pull_window(s)
        if pw and t < pw[1]: return None
        if pl and t >= pl[0]: return None
        return s["tile"]

    def face_state(self, t):
        from dash_compose import CREAM_F, MINT_F
        s = self.shot_at(t)
        if s is None: return "deadpan", CREAM_F
        if s["kind"] == "face":
            return s.get("expr", "deadpan"), (MINT_F if s.get("color") == "mint" else CREAM_F)
        st = s["tile"] or ("deadpan", "cream")
        e = st[0] if st[0] != "sarcastic" else "deadpan"     # the strip / full face rig has no sarcastic
        return e, (MINT_F if st[1] == "mint" else CREAM_F)

    def pop_starts(self):
        out = []
        for k, s in enumerate(self.shots):
            if s["kind"] == "face" or not s["tile"]: continue
            pw = self.push_window(s)
            if pw: out.append(pw[1])
            elif k and self.shots[k - 1]["kind"] == "face": out.append(s["t0"])
        return out

    def hard_cuts(self):
        """shot boundaries with no camera move across them (must sit in a pause), and the END fade."""
        out = []
        for a, b in zip(self.shots, self.shots[1:]):
            if b.get("enter") == "push" or a.get("exit") == "pull": continue
            out.append((f"{a['id']} -> {b['id']}", b["t0"]))
        return out + [("END fade", self.END_T)]

    # ---------------------------------------------------------------- overlays (Chrome PNGs)
    def overlay_jobs(self, o):
        from dash_overlays import Overlays
        S = self.S.S
        o.wordmark()
        if "banner" in S: o.banner(S["banner"])
        o.endcard(S["product"], self.S.product_dir, S["stamp"], S["cta"], S["url"], price=None)
        tdemo_job(o, S["demo_label"])
        for ov in self.overlays:
            if ov["kind"] == "bubble":
                o.job(ov["id"], W, H, bubble_html(ov["box"], self.pt(ov["tip"]), ov.get("glyph", "?")))
            elif ov["kind"] == "glyph":
                o.job(ov["id"], W, H, glyph_html(ov["glyph"], *ov["box"]))
            elif ov["kind"] == "pagecard":
                title, _, _ = card_titles(self.S, ov["title"])
                o.job(ov["id"], W, H, pagecard_html(ov["box"], title))
                if ov.get("tick"):
                    o.job(ov["id"] + "t", W, H, glyph_html("tick", *tick_box(ov["box"]), card=False))
        for i in self.S.caption_lines:
            o.caption(i, S[f"caption_L{i}"], groups=self.groups.get(i))

    # ---------------------------------------------------------------- per-frame
    def setup_render(self):
        from dash_compose import Composer, CREAM as CREAM_C
        from dash_face_x import DashFaceX
        ov = self.story.ov
        self.comp = comp = Composer(self.AUDIO, self.TOTAL, ov, self.EST_FACE_END, 1.1)
        comp.set_blinks(self.blinks, slow=self.slow_blinks)
        self.tile = Tile(comp.plate_pil)
        self.face_t = DashFaceX(color=CREAM_C, glances=self.glances)
        self.LY = {}
        for o in self.overlays:
            if o["kind"] in ("bubble", "glyph", "pagecard"):
                self.LY[o["id"]] = comp.rgba(o["id"])
            if o["kind"] == "pagecard" and o.get("tick"):
                self.LY[o["id"] + "t"] = comp.rgba(o["id"] + "t")
        self.LY["tdemo"] = comp.rgba("tdemo")
        self.pages, self.moves = {}, {}
        m = json.load(open(REC_MANIFEST))["clips"]["AL1_dash"]
        assert m["status"] == "ok", m.get("problems")
        self.rec_meta = m
        for s in self.shots:
            if s["kind"] == "rec":
                tap = self.tm(s["tap"])
                mark_t = next(k["t"] for k in m["marks"] if k["name"] == "tap")
                page = Page(REC, int(m["cssViewport"].split("x")[0]), PRD_K0, PRD_K1, s["t0"], tap - 0.40, PRD_ANCHOR_CSS, PRD_ANCHOR_OUT,
                            mark_t=mark_t, at=tap, crop_css_h=640)
                bg = page.frames[0][-8:].reshape(-1, 3).mean(0)
                assert np.abs(bg - np.array(PAGE_BG)).max() <= 3, ("page background moved", bg)
                s["tap_t"] = tap
                for r in s.get("fade_rows", []): r["t"] = self.tm(r["at"])
                self.pages[s["id"]] = page
        for s in self.shots:
            if s["kind"] == "face": continue
            place, row, fill = self.src_place(s)
            pw = self.push_window(s)
            if pw:
                cam0 = None if pw[0] == self.EST_FACE_END else scr_camera()
                self.moves[(s["id"], "push")] = Push(comp, full_m0(place, row), (1.0, 0.0, 0.0), pw[0], pw[1], cam0=cam0, fill=fill)
            pl = self.pull_window(s)
            if pl:
                self.moves[(s["id"], "pull")] = Push(comp, full_m0(place, row), (1.0, 0.0, 0.0), pl[0], pl[1], cam0=scr_camera(), fill=fill, reverse=True)

    def src_place(self, s):
        """(placement of the story source in the composed frame, phone-layout row, fill) for the push / pull."""
        if s["kind"] == "clip":
            c = self.spec["clips"][s["clip"]]
            fc = self.clips[s["clip"]]
            return self.places[s["clip"]], c.get("push_row", 160), fc.bg
        if s["kind"] == "rec":
            return (FULL_K, 0.0, 0.0), 0, PAGE_BG
        return (FULL_K, 0.0, 0.0), 0, (17, 21, 34)

    def clip_t(self, s, t):
        if "warp" in s:
            ks = [(self.tm(a), c) for a, c in s["warp"]]
            return float(np.interp(t, [k[0] for k in ks], [k[1] for k in ks]))
        c0, c1 = s.get("clip_t", [0.0, None])
        if c1 is None: return c0 + (t - s["t0"])
        u = (t - s["t0"]) / (s["t1"] - s["t0"])
        return c0 + (c1 - c0) * u

    def zoom_place(self, s, place):
        if "zoom" not in s: return place
        z0, z1 = s["zoom"]
        z = z0 + (z1 - z0) * ease(clamp01((self._t - s["t0"]) / (s["t1"] - s["t0"])))
        k, ox, oy = place
        cx, cy = s.get("zoom_c", (W / 2, 690))
        return (k * z, cx - z * (cx - ox), cy - z * (cy - oy))

    @staticmethod
    def clip_image(fc, ct, blend=True):
        """the clip frame at clip time ct; between two frames a blend, or (blend=False, real screens: a blend of a
        scrolling page ghosts its text) the nearest frame"""
        fi = min(max(ct * FPS, 0.0), len(fc.frames) - 1.0)
        if not blend: return Image.fromarray(fc.frames[int(round(fi))])
        i0 = int(math.floor(fi)); a = fi - i0
        if a < 0.05 or i0 + 1 >= len(fc.frames): return Image.fromarray(fc.frames[i0])
        if a > 0.95: return Image.fromarray(fc.frames[i0 + 1])
        mix = fc.frames[i0].astype(np.float32) * (1 - a) + fc.frames[i0 + 1].astype(np.float32) * a
        return Image.fromarray(np.clip(np.rint(mix), 0, 255).astype(np.uint8))

    def story_frame(self, s, t):
        from dash_compose import over
        self._t = t
        if s["kind"] == "clip":
            fc = self.clips[s["clip"]]
            ct = self.clip_t(s, min(t, s["t1"] - 1e-3))       # under the END fade: the shot's last frame
            assert -1e-6 <= ct <= fc.seconds() - 1 / FPS + 1e-6, (f"shot {s['id']}: clip time {ct:.2f}s runs off {s['clip']} ({fc.seconds():.2f}s)")
            o = place_src(self.clip_image(fc, ct, blend=not is_screen(self.spec, s)), self.zoom_place(s, fc.place), fc.bg)
        elif s["kind"] == "still":
            im = Image.open(rp(s["src"])).convert("RGB")
            place = tuple(s.get("place", (FULL_K * 720 / im.size[0], 0.0, 0.0)))
            bg = tuple(int(v) for v in np.median(np.asarray(im)[-40:].reshape(-1, 3), 0))
            o = place_src(im, self.zoom_place(s, place), bg)
        elif s["kind"] == "rec":
            page = self.pages[s["id"]]
            o = page.frame(t)
            self.fade_rows(o, s, page, t)
            over(o, *self.LY["tdemo"])
            return o
        else:
            raise ValueError(s["kind"])
        if is_screen(self.spec, s):          # builder rule: a real screen never runs under the caption band
            clear_band(o, fc.bg if s["kind"] == "clip" else bg)
        self.draw_overlays(o, s, t)
        return o

    def fade_rows(self, o, s, page, t):
        rows = s.get("fade_rows", [])
        if not rows: return
        n = len(json.load(open(SEED, encoding="utf-8"))["leads"])
        x0, _, x1, y1 = PRD_TABLE_CSS
        rh = (y1 - PRD_BODY_TOP_CSS) / n
        k = page.kt(t)
        for r in rows:
            u = ease(clamp01((t - r["t"]) / 0.35))
            if u <= 0: continue
            ry0 = PRD_BODY_TOP_CSS + r["row"] * rh
            X0, Y0, X1, Y1 = page.rect_out((x0 + 1.5, ry0 + 1.0, x1 - 1.5, ry0 + rh - 1.0), k)
            X0, Y0, X1, Y1 = int(math.ceil(X0)), int(math.ceil(Y0)), int(X1), int(Y1)
            reg = o[Y0:Y1, X0:X1]
            bgc = np.median(o[Y0:Y1, X0 + 2:X0 + 14].reshape(-1, 3), 0)     # the row's own fill (left margin)
            o[Y0:Y1, X0:X1] = reg * (1 - u) + bgc * u

    def draw_overlays(self, o, s, t):
        from dash_compose import over, scaled_layer
        for ov in self.overlays:
            on = ov.get("on")
            if on is not None and s["id"] not in on: continue
            if ov["kind"] in ("bubble", "glyph"):
                if not (ov["t0"] <= t < ov["t1"]): continue
                u = min(1.0, (t - ov["t0"]) / 0.16)
                fade = min(1.0, (ov["t1"] - t) / ov.get("fade", 0.25)) if ov.get("fade_out", True) else 1.0
                rgb, a = self.LY[ov["id"]]
                bx = ov["box"]
                if u < 1: rgb, a = scaled_layer(rgb, a, 0.85 + 0.15 * ease(u), (bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2)
                over(o, rgb, a * min(ease(u), max(0.0, fade)))
            elif ov["kind"] == "coins":
                r = ov.get("r", 22)
                for k, e in enumerate(ov["events"]):
                    fl = e.get("flight", 0.36)
                    p0, p1 = self.pt(e["from"]), self.pt(e["to"])
                    if e["t"] <= t < e["t"] + fl:
                        u = (t - e["t"]) / fl
                        x, y = arc(p0, p1, u, e.get("lift", 60))
                        put_coin(o, x, y, r, r * abs(math.cos(u * math.pi * 2.0)) + 3, r * 0.3)
                    elif t >= e["t"] + fl and ov.get("keep", True) and not e.get("vanish") and t < ov.get("t1", 1e9):
                        put_coin(o, p1[0], p1[1], r, r * 0.36, r * 0.3)        # lands and stays
        for ov in self.overlays:                # page cards draw after the other overlays (the seat-2 order)
            if ov["kind"] != "pagecard": continue
            on = ov.get("on")
            if on is not None and s["id"] not in on: continue
            if not (ov["t0"] <= t < ov["t1"]): continue
            u = ease(clamp01((t - ov["t0"]) / 0.30))
            dx = int(round(ov.get("slide", 140) * (1 - u)))       # slides in from the right (RTL reading start)
            rgb, a = self.LY[ov["id"]]
            if dx:
                rgb = np.roll(rgb, dx, axis=1); a = np.roll(a, dx, axis=1)
                rgb[:, :dx] = 0; a[:, :dx] = 0
            over(o, rgb, a * u)
            if ov.get("tick") and t >= ov["tick_t"]:
                v = clamp01((t - ov["tick_t"]) / 0.16)
                rgb, a = self.LY[ov["id"] + "t"]
                bx = tick_box(ov["box"])
                if v < 1: rgb, a = scaled_layer(rgb, a, 0.6 + 0.4 * ease(v), (bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2)
                over(o, rgb, a * ease(v))

    def base(self, f, t):
        s = self.shot_at(t)
        if s["kind"] == "face":
            return dashboard_face(self.comp, f, t, *self.face_state(t))
        o = self.story_frame(s, t)
        pw, pl = self.push_window(s), self.pull_window(s)
        u8 = lambda a: Image.fromarray(np.clip(np.rint(a), 0, 255).astype(np.uint8))
        if pw and t < pw[1]:
            return self.moves[(s["id"], "push")].frame(t, u8(o), strip_canvas(self.comp, self.face_state(t)[0], self.face_state(t)[1], f, t))
        if pl and t >= pl[0]:
            return self.moves[(s["id"], "pull")].frame(t, u8(o), strip_canvas(self.comp, self.face_state(t)[0], self.face_state(t)[1], f, t))
        return o

    def word_starts(self):
        """{line: [STT start per display word]}: timing.json's, and for a line prep left without them (a word-count
        mismatch) the re-chunking alignment of align_stt over the same local STT words."""
        ws = {l["i"]: l["words"] for l in self.T["lines"] if l["words"]}
        miss = [l for l in self.T["lines"] if not l["words"]]
        if miss:
            lines = [dict(l) for l in self.T["lines"]]
            assign_word_starts(self.S, lines, stt_words(self.story, self.T))
            for l in lines:
                if l["i"] not in ws:
                    assert l["words"], ("still no word starts", l["i"])
                    ws[l["i"]] = l["words"]
        return ws

    def caption_ends(self):
        ends = {}
        for i in self.S.caption_lines:
            if i + 1 < self.S.n:
                g = next(g for g in self.T["gaps"] if g["between"][0] == i)
                # end in the pause after the line, at the shot boundary if one falls in it
                bs = [s["t0"] for s in self.shots if g["a"] - 0.05 <= s["t0"] <= g["b"] + 0.05]
                pl = [self.pull_window(s)[0] for s in self.shots if self.pull_window(s) and g["a"] - 0.05 <= self.pull_window(s)[0] <= g["b"]]
                ends[i] = min(pl + bs) if (pl or bs) else frame_round((g["a"] + g["b"]) / 2)
            else:
                ends[i] = self.END_T
        return ends

    def captions(self):
        """caption cards on the VOICE: each card appears on the frame nearest its first word's voice onset (measured
        on the loudness of the prepared WAV, VoiceOnsets: the end of the pause before the word, or the loudness dip
        at the word boundary inside running speech; the STT start only locates the word). During a pause the
        previous card holds (a card ends where the next starts); the line's last card ends in the pause after it."""
        vo = VoiceOnsets(self.AUDIO)
        ws = self.word_starts()
        ends = self.caption_ends()
        cards = json.load(open(f"{self.story.ov}/cards.json"))
        out = []
        for i in self.S.caption_lines:
            text = self.S.S[f"caption_L{i}"]
            cs = [c for c in cards if c["line"] == i]
            assert " ".join(c["text"] for c in cs) == text, ("cards must rebuild the line", i)
            w = ws[i]
            assert len(w) == len(text.split(" ")), ("word starts != display words", i)
            row = []
            for k, c in enumerate(cs):
                j = text[:c["start"]].count(" ")
                est = self.L[i][0] if k == 0 else w[j]
                nxt = w[j + 1] if j + 1 < len(w) else None
                lo = row[-1]["onset"] if row else None
                on, how = vo.onset(est, nxt, lo=lo, dips=k > 0)
                st = frame_round(on)
                if row: st = max(st, row[-1]["start"] + 2 / FPS)
                row.append(dict(name=c["name"], text=c["text"], line=i, start=st, onset=round(on, 3), how=how, word=j, stt=est, first=k == 0))
            for k, c in enumerate(row):
                c["end"] = row[k + 1]["start"] if k + 1 < len(row) else ends[i]
                assert c["end"] > c["start"], ("caption card runs backwards", c["name"], c["start"], c["end"])
            out += row
        return out

    def make_cut(self):
        comp = self.comp
        caps = self.captions()
        banners = []
        if "banner" in self.S.S:
            bm = comp.measure["banner"]["els"]["banner"]
            bw = self.spec["banner"]
            banners = [dict(name="banner", layer=comp.rgba("banner"), center=((bm["left"] + bm["right"]) / 2, (bm["top"] + bm["bottom"]) / 2),
                            t0=self.tm(bw["from"]), t1=self.tm(bw["to"]))]
        return Cut(comp, self.tile, self.face_t, caps, banners, self.END_T, self.tile_state, pop_starts=self.pop_starts())

    def shot_rows(self):
        rows = []
        for s in self.shots:
            pw, pl = self.push_window(s), self.pull_window(s)
            a, b = s["t0"], s["t1"]
            if pw: rows.append([f"PUSH through the screen into {s['id']}", pw[0], pw[1]]); a = pw[1]
            end = pl[0] if pl else b
            desc = s.get("note", s["kind"] + (f" {s.get('clip', '')}" if s["kind"] == "clip" else ""))
            rows.append([f"{s['id']}: {desc}" + (f" + tile {s['tile'][0]}/{s['tile'][1]}" if s["tile"] and s["kind"] != "face" else "")
                         + (f" (Dash {s.get('expr', 'deadpan')})" if s["kind"] == "face" else ""), a, end])
            if pl: rows.append([f"PULL back out of {s['id']} to the dashboard", pl[0], pl[1]])
        rows.append(["END card", self.END_T, self.TOTAL])
        return rows


# ==================================================================== commands
def cards_out(ov):
    """caption cards whose alpha box leaves the Google safe box (a card that wrapped to two lines)."""
    gx0, gy0, gx1, gy1 = GOOGLE_SAFE
    out = []
    for c in json.load(open(f"{ov}/cards.json")):
        a = np.asarray(Image.open(f"{ov}/{c['name']}.png").convert("RGBA"))[..., 3]
        ys, xs = np.where(a > 0)
        if xs.min() < gx0 or xs.max() > gx1 or ys.min() < gy0 or ys.max() > gy1: out.append(c)
    return out


def overlays_cmd(story):
    """Chrome render. Captions use the pipeline's splitCards; a card that leaves the safe box (wrapped to two
    lines) gets its line re-split by word groups (story.json caption_groups, else the offending card halves),
    the A1-30 GROUPS fix, then a re-render. Presentation only: the cards still rebuild the line byte-exact."""
    from dash_overlays import Overlays
    b = Build(story)
    b.groups = {int(k): v for k, v in story.spec.get("caption_groups", {}).items()}
    for attempt in range(3):
        o = Overlays()
        b.overlay_jobs(o)
        o.render(story.ov)
        bad = cards_out(story.ov)
        if not bad: break
        cards = json.load(open(f"{story.ov}/cards.json"))
        for li in sorted({c["line"] for c in bad}):
            g = []
            for c in [c for c in cards if c["line"] == li]:
                w = c["text"].split(" ")
                n = len(w)
                if c in bad and n > 1:
                    # split after an inner word ending in punctuation (splitCards breaks there anyway), else halves
                    cut = [k + 1 for k in range(n - 1) if w[k][-1] in ",.?!:;"]
                    k = min(cut, key=lambda k: abs(k - n / 2)) if cut else (n + 1) // 2
                    g += [k, n - k]
                else:
                    g += [n]
            b.groups[li] = g
            print(f"  L{li}: a card left the safe box, re-split as word groups {g}")
    assert not cards_out(story.ov), "caption cards still leave the safe box: set caption_groups in story.json"
    json.dump(b.groups, open(f"{story.ov}/caption_groups.json", "w"))


def render_cmd(story, only=None, timeline_only=False):
    b = Build(story)
    b.setup_render()
    cut = b.make_cut()
    for s in b.shots:          # every clip shot stays on real frames (no freeze past the clip's end)
        if s["kind"] == "clip":
            fc = b.clips[s["clip"]]
            for t in np.linspace(s["t0"], s["t1"] - 1e-3, 40):
                ct = b.clip_t(s, t)
                assert -1e-6 <= ct <= fc.seconds() - 1 / FPS + 1e-6, (s["id"], round(t, 2), round(ct, 2), fc.seconds())
    if only is not None:
        END = b.comp.rgb("endcard")
        os.makedirs(f"{story.build}/pv", exist_ok=True)
        for t in only:
            f = int(round(t * FPS))
            fr = cut.finish_frame(b.base(f, t), f, t)
            if f >= cut.fe:
                k = min(1.0, (f - cut.fe + 1) / END_FADE); fr = fr * (1 - k) + END * k
            p = f"{story.build}/pv/pv_{t:05.2f}.png"
            Image.fromarray(np.clip(np.rint(fr), 0, 255).astype(np.uint8)).save(p)
            print("wrote", p)
        return
    os.makedirs(story.out_dir, exist_ok=True)
    if not timeline_only: cut.encode(story.mp4, b.base, b.AUDIO, b.TOTAL, f"{story.ov}/endcard.png")
    rec = {}
    for s in b.shots:
        if s["kind"] == "rec":
            p = b.pages[s["id"]]
            rec[s["id"]] = dict(offset=p.offset, tap_at=s["tap_t"], k0=PRD_K0, k1=PRD_K1, t0=s["t0"], t1=s["tap_t"] - 0.40,
                                marked_at=p.offset + next(k["t"] for k in b.rec_meta["marks"] if k["name"] == "marked"),
                                ends_at=p.offset + p.seconds(), fade_rows=[dict(row=r["row"], t=r["t"]) for r in s.get("fade_rows", [])])
    write_timeline(story.mp4, b.comp, cut, b.face_state, b.TOTAL, dict(
        story=story.id, shots=b.shot_rows(), moves={f"{k[0]}:{k[1]}": m.info() for k, m in b.moves.items()},
        blinks=b.blinks, slow_blinks=b.slow_blinks, glances=b.glances,
        tile=dict(x0=TILE_X0, y0=TILE_Y0, size=TILE, orange=b.tile.orange), places=b.places, ink=b.ink,
        overlays=[{k: v for k, v in o.items()} for o in b.overlays], rec=rec, lines=b.L, end_t=b.END_T, total=b.TOTAL))
    print("timeline:", story.mp4.replace(".mp4", ".timeline.json"))


def pagecard_evidence(b, story):
    import dash_evidence as ev
    ov = story.ov
    cards = [o for o in b.overlays if o["kind"] == "pagecard"]
    if not cards: return
    m = json.load(open(f"{ov}/measure.json"))
    print("\n== page cards (Site Bot product moment): titles sliced from the voice line, never typed")
    st = ev.StringTable()
    for c in cards:
        title, parts, src = card_titles(b.S, c["title"])
        st.chk(f"{c['id']} title", m[c["id"]]["els"]["title"]["text"], title, src)
        assert set(m[c["id"]]["els"]) == {"title"}, m[c["id"]]["els"]
    st.print()
    st.script_scan(ov)
    ev.caption_dirs(m, [c["id"] for c in cards])
    names = [c["id"] for c in cards] + [c["id"] + "t" for c in cards if c.get("tick")]
    ev.safe_zone(ov, names, "page cards and their ticks")
    capc = json.load(open(f"{ov}/cards.json"))
    cap_top = min(int(np.where(np.asarray(Image.open(f"{ov}/{c['name']}.png").convert("RGBA"))[..., 3] > 0)[0].min()) for c in capc)
    for n in names:
        al = np.asarray(Image.open(f"{ov}/{n}.png").convert("RGBA"))[..., 3]
        ys, xs = np.where(al > 8)
        clear = xs.max() < TILE_X0 or ys.min() >= TILE_CLEAR_Y
        print(f"  {n:6s} x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()}: clear of the tile (and its shadow, rows >= {TILE_CLEAR_Y}) {clear}, above the captions (top y{cap_top}) {ys.max() < cap_top}")
        assert clear and ys.max() < cap_top
    for c in cards:
        print(f"  {c['id']}: slides in {c['t0']:.2f}s (0.30 s), held to {c['t1']:.2f}s" + (f", mint tick {c['tick_t']:.2f}s" if c.get("tick") else ""))
    print("  (no Google UI, no demo-site screen in this shot, so no demo tag: the tag rides only on real-screen shots)")


def caption_onset_evidence(b, tl):
    """every caption card vs its first word's voice onset, measured on the prepared WAV's loudness (not on the
    builder's stored times). A card is EARLY when the first frame that shows it sits in a pause, or in the last
    ONSET_TAIL s of the previous word before a pause (the STT 'start at the previous word's end' failure): its
    lead = the end of that pause - that frame. FAIL if any lead > CAP_EARLY_MAX. Also prints the offset of every
    card vs its measured onset (negative = early)."""
    vo = VoiceOnsets(b.AUDIO)
    ws = b.word_starts()
    print(f"\n== caption onset: every card's first shown frame vs its first word's voice onset (loudness, {ONSET_GATE:.0f} dB speech gate; "
          f"FAIL if a card leads its voice by > {CAP_EARLY_MAX:.2f} s)")
    worst_e, worst_l, ok = 0.0, 0.0, True
    for c in tl["captions"]:
        ft = frame_ceil(c["start"])
        w = ws[c["line"]]
        j = c.get("word", 0)
        nxt = w[j + 1] if j + 1 < len(w) else None
        p = vo.pause_at(ft, nxt, line_start=c.get("first", False))
        lead = (p[1] - ft) if p else 0.0
        onset = p[1] if p else c.get("onset", ft)
        off = ft - onset
        worst_e, worst_l = min(worst_e, off), max(worst_l, off)
        bad = lead > CAP_EARLY_MAX + 1e-6
        ok &= not bad
        print(f"  {c['name']:9s} shows {ft:6.3f}s  voice onset {onset:6.3f}s ({'pause end' if p else c.get('how', '?')})  offset {off:+.3f}s"
              + ("  EARLY -> FAIL" if bad else ""))
    print(f"  worst offsets: earliest {worst_e:+.3f}s, latest {worst_l:+.3f}s")
    assert ok, "a caption card appears more than %.2f s before its voice" % CAP_EARLY_MAX
    return worst_e, worst_l


def frame_snap_evidence(b):
    print("\n== shot edges on whole frames (k / FPS) and cuts / pulls inside whole-frame gate-silent runs")
    for s in b.shots:
        k = s["t1"] * FPS
        print(f"  {s['id']:8s} ends {s['t1']:7.4f}s = frame {k:.4f}" + (f" (expr {s['t1_raw']:.3f}s)" if "t1_raw" in s else ""))
        assert abs(k - round(k)) < 1e-6, ("shot edge off the frame grid", s["id"], s["t1"])
    for s in b.shots:
        pl = b.pull_window(s)
        if not pl: continue
        r = next(((x, y) for x, y in b.fruns if x - 1e-6 <= pl[0] and pl[1] <= y + 1e-6), None)
        print(f"  pull out of {s['id']}: frames {round(pl[0] * FPS)}-{round(pl[1] * FPS) - 1} -> " + (f"inside silent frames {round(r[0] * FPS)}-{round(r[1] * FPS) - 1}" if r else "NOT inside one pause"))
        assert r


def evidence_cmd(story):
    import dash_evidence as ev
    b = Build(story)
    T, S, ov, mp4 = b.T, b.S, story.ov, story.mp4
    print(f"#### {story.id}: {story.spec.get('title', '')}\n#### {mp4}")
    ev.probe(mp4)
    print(f"\n== voice prep (source never modified): {T['source']}")
    print(f"  source {T['source_duration']:.2f}s sha256 {T['source_sha256'][:16]}…  ->  prepared {T['prepared']} {T['duration']:.2f}s")
    for sp in T["splices"]:
        print(f"  splice L{sp['line']}: take {sp['take']} (sha256 {sp['take_sha256'][:16]}…), old line {sp['old_len']:.2f}s -> new {sp['new_len']:.2f}s "
              f"(lead-in {sp['lead_in']:.2f}s and tail {sp['tail']:.2f}s kept from the old line); RMS old {sp['rms_old_db']:.1f} dB, new {sp['rms_new_db']:.1f} dB")
    if T.get("removed"):
        tot = sum(r["seconds"] for r in T["removed"])
        print(f"  tighten {T['tighten']}: {len(T['removed'])} pauses shortened, {tot:.2f}s of silence removed")
        for r in T["removed"]:
            print(f"    {r['kind']:7s} pause {r['run'][0]:.2f}-{r['run'][1]:.2f}s ({r['run'][1] - r['run'][0]:.2f}s): removed {r['seconds']:.2f}s from its middle, loudest 40 ms window there {r['max_db_removed']:.1f} dBFS")
            assert r["max_db_removed"] < GATE
        print(f"  voiced samples removed: {T['voiced_samples_removed']} (every sample above the -45 dB gate kept byte-exact)")
        assert T["voiced_samples_removed"] == 0
    print("  lines (gate-measured voice windows) and local STT word counts:")
    for l in T["lines"]:
        print(f"    L{l['i']}: {l['t0']:6.2f}-{l['t1']:6.2f}s  STT words {l['stt_words']} / display words {l['display_words']}  STT: {l['stt']}")
    ok, bad, skip = validate_display_rule()
    print(f"\n== caption rule (tag + niqqud dropped) vs the approved Dash scripts' display fields: {ok} match, {bad} differ, {skip} END lines skipped")
    assert bad == 0
    m = json.load(open(f"{ov}/measure.json"))
    cards = json.load(open(f"{ov}/cards.json"))
    st = ev.StringTable()
    for i in S.caption_lines:
        st.chk(f"caption L{i} (cards joined)", " ".join(c["text"] for c in cards if c["line"] == i), S.S[f"caption_L{i}"], S.SOURCES[f"caption_L{i}"])
    for c in cards:
        st.chk(f"  card {c['name']}", m[c["name"]]["els"]["cap"]["text"], c["text"], "card split of the display line")
    if "banner" in S.S:
        st.chk("banner", m["banner"]["els"]["banner"]["text"], S.S["banner"], S.SOURCES["banner"])
    for k in ("product", "stamp", "cta", "url"):
        st.chk(f"end {k}", m["endcard"]["els"][k]["text"], S.S[k], S.SOURCES[k])
    st.chk("end wordmark", m["endcard"]["els"]["wao"]["text"], "WAO", "config brand.wordmark")
    st.chk("corner wordmark", m["wordmark"]["els"]["wordmark"]["text"].strip(), "WAO", "config brand.wordmark")
    st.chk("demo label", m["tdemo"]["els"]["tdemo"]["text"], S.S["demo_label"], S.SOURCES["demo_label"])
    for o in b.overlays:
        if o["kind"] in ("bubble", "glyph"):
            els = m[o["id"]]["els"]
            if "q" in els: st.chk(f"{o['id']} glyph", els["q"]["text"], "?", "pipeline glyph (question mark, no words)")
            assert set(els) <= {"q"}, ("an overlay carries text", o["id"], els)
    assert "price" not in m["endcard"]["els"], "no price line on the END card"
    if S.leads is not None:
        seed = json.load(open(SEED, encoding="utf-8"))
        for l, src in zip(seed["leads"], S.leads):
            st.chk(f"lead {l['id']} name", l["name"], src["name"], "a2-15 waocopy JSON demo_leads[].name")
        served = json.load(open(f"{SANDBOX}/leads.json", encoding="utf-8"))
        assert [x["name"].encode() for x in served] == [x["name"].encode() for x in seed["leads"]]
    st.print()
    st.script_scan(ov)
    ev.caption_dirs(m, (["banner"] if "banner" in S.S else []) + ["endcard", "tdemo"] + [c["name"] for c in cards][:1])
    ov_names = [o["id"] for o in b.overlays if o["kind"] in ("bubble", "glyph")]
    ev.safe_zone(ov, ["wordmark", "tdemo"] + (["banner"] if "banner" in S.S else []) + ov_names + [c["name"] for c in cards],
                 "captions, banner, wordmark, demo tag, bubbles, glyphs")
    if story.spec["endcard"] == "adsbot-v2": endcard_v2_evidence(m, ov)
    from dash_compose import decode
    tile = Tile(decode(PLATE_SRC, 720, 1280, ss=PLATE_T)[0])
    tl = json.load(open(mp4.replace(".mp4", ".timeline.json")))
    samples = [round((a + c) / 2, 2) for n, a, c in tl["shots"] if "tile" in n][:6]
    tb = tile_evidence(tile, m, ov, cards, mp4, samples, extra_names=(["banner"] if "banner" in S.S else []))
    print("\n== bubbles / glyphs vs the reaction tile and the caption band")
    cap_top = min(int(np.where(np.asarray(Image.open(f"{ov}/{c['name']}.png").convert("RGBA"))[..., 3] > 0)[0].min()) for c in cards)
    for n in ov_names:
        al = np.asarray(Image.open(f"{ov}/{n}.png").convert("RGBA"))[..., 3]
        ys, xs = np.where(al > 8)
        clear = xs.max() < tb[0] or ys.min() > tb[3]
        print(f"  {n:8s} x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()}: clear of the tile {clear}, above the captions (top y{cap_top}) {ys.max() < cap_top}")
        assert clear and ys.max() < cap_top
    ev.endcard(m, mp4, b.END_T + 0.4, b.TOTAL - 0.4)
    print(f"  END card: fade-in starts {b.END_T:.2f}s, held to {b.TOTAL:.2f}s = {b.TOTAL - b.END_T:.2f}s (>= 3.5)")
    assert b.TOTAL - b.END_T >= 3.5
    assert abs(b.TOTAL - b.END_T - END_HOLD) < 0.011, f"END hold {b.TOTAL - b.END_T:.2f}s != the house {END_HOLD:.2f}s: set end.hold"
    endcard_parts(mp4)
    if tl["rec"]:
        print("\n== the Ads Bot leads recording (A2-15 take, full-frame)")
        rm = json.load(open(REC_MANIFEST))["clips"]["AL1_dash"]
        print(f"  {rm['file']}  {rm['width']}x{rm['height']}  sha256 {rm['sha256'][:16]}…  status {rm['status']}")
        assert sh256(f"{ROOT}/{rm['file']}") == rm["sha256"]
        for sid, r in tl["rec"].items():
            li = next(i for i, (a, c) in b.L.items() if a - 0.3 <= r["tap_at"] <= c)
            print(f"  shot {sid}: recording t=0 at {r['offset']:.2f}s; tap ring {r['tap_at']:.2f}s inside L{li} ({b.L[li][0]:.2f}-{b.L[li][1]:.2f}s); marked {r['marked_at']:.2f}s; last real frame {r['ends_at']:.2f}s")
            for fr in r["fade_rows"]:
                print(f"    lead row {fr['row']} ({S.leads[fr['row']]['type'] if S.leads else '?'}) fades out from {fr['t']:.2f}s (0.35 s)")
            for k in (PRD_K0, PRD_K1):
                ox, oy = PRD_ANCHOR_OUT[0] - k * PRD_ANCHOR_CSS[0], PRD_ANCHOR_OUT[1] - k * PRD_ANCHOR_CSS[1]
                x0, y0, x1, y1 = PRD_TABLE_CSS
                print(f"    k={k:.2f}: table x{k*x0+ox:.0f}-{k*x1+ox:.0f} y{k*y0+oy:.0f}-{k*y1+oy:.0f}; caption top y{cap_top}")
                assert k * x0 + ox >= GOOGLE_SAFE[0] and k * x1 + ox <= GOOGLE_SAFE[2] + 1 and k * y1 + oy < cap_top
    print("\n== clips: placement (out = k*src + offset) and the time map (no freeze past a clip's end)")
    for key, p in b.places.items():
        fc = b.clips[key]
        print(f"  {key}: {story.spec['clips'][key]['src']} ({fc.seconds():.2f}s after the trim) place k={p[0]} ox={p[1]} oy={p[2]}" + (f"; ink box clip {b.ink[key]}" if key in b.ink else ""))
    for s in b.shots:
        if s["kind"] == "clip":
            c0, c1 = b.clip_t(s, s["t0"]), b.clip_t(s, s["t1"] - 1e-3)
            sp = (c1 - c0) / (s["t1"] - s["t0"])
            print(f"  shot {s['id']:6s} {s['t0']:6.2f}-{s['t1']:6.2f}s plays {s['clip']} {c0:.2f}->{c1:.2f}s (mean speed {sp:.2f}x)")
    print("\n== overlays timeline")
    for o in b.overlays:
        if o["kind"] == "coins":
            print(f"  coins {o['id']}: " + ", ".join(f"{e['t']:.2f}s" for e in o["events"]))
        else:
            print(f"  {o['kind']} {o['id']} ({o.get('glyph', '?')}): {o['t0']:.2f}-{o['t1']:.2f}s")
    print("\n== shots")
    for n, a_, c_ in tl["shots"]: print(f"  {a_:6.2f}-{c_:6.2f}  {n}")
    frame_snap_evidence(b)
    ok_c = check_in_silence(tl, b.hard_cuts() + [(f"blink {x}", x) for x in b.blinks] + [(f"slow blink {x}", x) for x in b.slow_blinks], "hard cuts and blinks")
    pulls = [(f"pull out of {s['id']}", *b.pull_window(s)) for s in b.shots if b.pull_window(s)]
    ok_p = check_span_in_silence(tl, pulls, "pull-outs") if pulls else True
    for s in b.shots:
        pw = b.push_window(s)
        if pw:
            seam(mp4, pw[1] - 1 / FPS, pw[1] + 0.001, f"push -> full-bleed {s['id']}")
    assert ok_c and ok_p
    ev.mouth_table(tl, [], b.TOTAL)
    ok = ev.pause_report(tl, gaps_from_lines(b.L, b.TOTAL))
    ev.captions(tl)
    caption_onset_evidence(b, tl)
    pagecard_evidence(b, story)
    b.setup_render()
    ok_s = screen_text_evidence(b, tl, ov, f"{story.build}/screen-ocr", rec_src=REC, mp4=mp4)
    assert ok_s, "a real screen shows test / placeholder text, or screen text sits under a caption"
    data_clients_clean()
    print("\nall pauses closed (gate-measured):", ok)
    assert ok
    print(f"\nTOTAL {b.TOTAL:.2f}s (voice {T['duration']:.2f}s + END)")


def main():
    argv = P.take_flags(sys.argv)
    if len(argv) < 3: raise SystemExit(__doc__)
    cmd, story = argv[1], Story(argv[2])
    if cmd == "prep": prep(story)
    elif cmd == "overlays": overlays_cmd(story)
    elif cmd == "render": render_cmd(story, timeline_only="--timeline-only" in argv)
    elif cmd == "preview": render_cmd(story, only=[float(x) for x in argv[3].split(",")])
    elif cmd == "evidence": evidence_cmd(story)
    elif cmd == "sheets":
        import dash_evidence as ev
        b = Build(story)
        ev.sheets(story.mp4, story.mp4[:-4], b.TOTAL)
        print("wrote", story.mp4[:-4] + "_contact_4fps.png", story.mp4[:-4] + "_strip_1fps.png")
    elif cmd == "endcard":
        b = Build(story)
        rerender_endcard(story.ov, lambda o: o.endcard(b.S.S["product"], b.S.product_dir, b.S.S["stamp"], b.S.S["cta"], b.S.S["url"], price=None))
        Cut.finish(story.mp4, os.path.abspath(f"{story.ov}/endcard.png"))
    else: raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
