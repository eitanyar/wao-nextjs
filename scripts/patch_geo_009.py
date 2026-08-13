#!/usr/bin/env python3
"""Deterministic patch 009 — geo-bot conversational redesign (task 008 strings).
Token-level str.replace with exact expected counts; aborts and writes nothing on
any mismatch. All Hebrew is pre-authored/approved — this script only relocates bytes."""

ROUTE = "src/app/api/geo-bot/route.ts"
PROMPTS = "src/lib/geo/prompts.ts"

# ── BOTH-FILES literal pairs (expected exactly 1 occurrence in EACH file) ──────
BOTH = [
    # T0 — expertise reframe
    ("יאללה, מתחילים — ספר לי על העסק שלך. מה אתה עושה, ומה השירות שהכי מכניס לך כסף?",
     "יאללה, מתחילים. ספר לי — מה התחום שבו אתה הכתובת? מה השירות שלקוחות מגיעים אליך במיוחד בשבילו?"),
    # T5 — typography only: ASCII hyphen 3-4 → en-dash 3–4
    ("מה 3-4 השאלות שלקוחות הכי שואלים אותך בטלפון?",
     "מה 3–4 השאלות שלקוחות הכי שואלים אותך בטלפון?"),
    # T7 C1 — pause-to-reflect
    ("שמעת על זה שגוגל מציג היום תשובות AI בראש חיפוש, לפני כל התוצאות הרגילות? ראית את זה קורה בתחום שלך?",
     "בוא נעצור רגע לחשוב. גוגל מציג היום תשובת AI שלמה מעל תוצאות החיפוש. יצא לך לחפש את השירות שלך בגוגל ולראות מה התשובה אומרת?"),
]

# ── PROMPTS-ONLY literal pairs (expected 1 in prompts.ts, 0 in route.ts) ───────
E8_NEW = "ומי אצלך מאשר תוכן לפני שהוא עולה לאתר — אתה מהנייד, או מישהו אחר? ומה מספר הוואטסאפ שלו?"
PROMPTS_ONLY = [
    # T7 C2 TRUE branch
    ("נבדקתי עכשיו — כשמחפשים ״[aioQuery]״ בגוגל, יש שם תשובת AI. אנחנו הולכים לשים אותך שם.",
     "בדקתי עכשיו — כשמחפשים ״[aioQuery]״ בגוגל, מופיעה שם תשובת AI. בוא נשים אותך בתוך התשובה הזו."),
    # T7 C2 FALSE branch — FOMO removed, relief register
    ("בתחום שלך גוגל עדיין בונה את תשובות ה-AI — זה חלון הזדמנויות מושלם להיכנס לפני שכולם מבינים מה קורה.",
     "בתחום שלך גוגל עדיין בונה את תשובות ה-AI. זה בדיוק הזמן להיכנס — המקום עוד פנוי."),
    # T8 E8b (prompts variant has "בצוות") → converge to E8_NEW
    ("ולגבי אישורים — מי מאשר תוכן לפני שהוא עולה לאתר? אתה מהנייד, או מישהו אחר בצוות? ומה מספר הוואטסאפ שלו?",
     E8_NEW),
]

# ── ROUTE-ONLY literal pairs (expected 1 in route.ts, 0 in prompts.ts) ─────────
ROUTE_ONLY = [
    # T8 E8a (route variant, no "בצוות") → converge to E8_NEW
    ("ולגבי אישורים — מי מאשר תוכן לפני שהוא עולה לאתר? אתה מהנייד, או מישהו אחר? ומה מספר הוואטסאפ שלו?",
     E8_NEW),
]

# ── PROMPTS-ONLY block insertions (anchor replacement, expected 1 in prompts) ──
PACE_LEAD_BLOCK = """### PACE→LEAD CONNECTION MOMENTS — AI AS THE OWNER'S ALLY (critical):
- Silently detect the owner's archetype from T0. Never announce the detection.
- Exactly 1, at most 2 moments per session.
- Placement: only within T0–T3 (early bonding window).
- Use a line ONLY when the truth is certain for this specific owner.
  If uncertain — skip the moment entirely. Zero is better than fake.
- Each moment = Pace line + Lead line. Max 2 sentences, each ≤15 words (TTS rule).
  Singular male, no emoji.
- Framing: Pace validates that his craft is safe from AI. Lead offers to recruit
  the AI to recommend him. AI is the ALLY, never the thief. The emotional target
  is RELIEF: he is safe, and the expensive marketing middleman comes off his plate.
  His customers search in a hurry, often under pressure — that urgency belongs to
  THEM. Never transfer it onto the owner.

#### Pace→Lead Library (runtime picks at most 2)
- Hands-on trades (plumber, electrician, locksmith, mechanic, gardener, AC, mover):
  Pace: "את העבודה שלך עם הידיים — אף AI לא יחליף."
  Lead: "אבל הוא יכול להגיד את השם שלך למי שמחפש בעל מקצוע בדיוק עכשיו."
- Craft / creative-physical (photographer, hairdresser, stylist, designer):
  Pace: "AI יכול לייצר תמונה — אבל העין והידיים שלך הן רק שלך."
  Lead: "אז ניתן לו להמליץ עליך למי שמחפש מישהו אמיתי באזור שלך."
- Human-care / in-person (therapist, trainer, coach, tutor, alternative medicine):
  Pace: "אנשים שואלים את ה-AI — אבל רוצים בן אדם אמיתי שהם סומכים עליו."
  Lead: "אז נדאג שאתה תהיה הבן אדם שהוא שולח אליו."
"""

T3_REDIRECT_BLOCK = """### HARD-TRUTH REDIRECT — thin substrate (one moment, only when genuinely triggered):
Trigger (for the model): fire ONLY when ALL of these are true —
  (a) T1 revealed no website OR no indexable content,
  (b) T2 revealed no Search Console access,
  (c) T3 revealed contentOwner = nobody.
If any substrate exists (a site with content, or GSC, or anyone owning the content) —
do NOT fire. This is an honest pause, never a scare, never a scripted doom line.
Deliver it once, right after acknowledging the T3 answer, then continue to T4 as usual.

Spoken Hebrew for the owner:
"רגע, לפני שנמשיך — אני רוצה להיות איתך גלוי. כדי שגוגל וה-AI ימליצו עליך, צריך תוכן שהם יכולים לקרוא. עכשיו הבסיס הזה עוד לא שם. אז נתחיל בצעד הראשון — נבנה נוכחות בסיסית שגוגל יכול לקרוא. ואז נחבר את האתר לכלי החיפוש ונמשיך."
"""

# anchor -> replacement (insert block BEFORE the anchor, blank line between)
PROMPTS_INSERTS = [
    ("### QUESTION SEQUENCE",
     PACE_LEAD_BLOCK + "\n### QUESTION SEQUENCE"),
    ('T4: "באילו ערים ואזורים אתה עובד?',
     T3_REDIRECT_BLOCK + '\nT4: "באילו ערים ואזורים אתה עובד?'),
]


def load(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def apply_pairs(content, path, pairs, expected):
    for old, new in pairs:
        actual = content.count(old)
        assert actual == expected, f"{path}: OLD {old!r} expected {expected}, found {actual}"
        content = content.replace(old, new)
    return content


def assert_absent(content, path, pairs):
    for old, _ in pairs:
        n = content.count(old)
        assert n == 0, f"{path}: expected ABSENT, found {n}× {old!r}"


# ── route.ts ──────────────────────────────────────────────────────────────────
route0 = load(ROUTE)
dbl_r = route0.count("\\\\n")
route = route0
assert_absent(route, ROUTE, PROMPTS_ONLY)          # prompts-only olds must not be here
route = apply_pairs(route, ROUTE, BOTH, 1)
route = apply_pairs(route, ROUTE, ROUTE_ONLY, 1)
assert route.count("\\\\n") == dbl_r, f"{ROUTE}: introduced double-escaped newlines"
assert route != route0, f"{ROUTE}: no change made"

# ── prompts.ts ────────────────────────────────────────────────────────────────
prompts0 = load(PROMPTS)
dbl_p = prompts0.count("\\\\n")
prompts = prompts0
assert_absent(prompts, PROMPTS, ROUTE_ONLY)        # route-only old must not be here
prompts = apply_pairs(prompts, PROMPTS, BOTH, 1)
prompts = apply_pairs(prompts, PROMPTS, PROMPTS_ONLY, 1)
prompts = apply_pairs(prompts, PROMPTS, PROMPTS_INSERTS, 1)  # anchors, exactly 1 each
assert prompts.count("\\\\n") == dbl_p, f"{PROMPTS}: introduced double-escaped newlines"
assert prompts != prompts0, f"{PROMPTS}: no change made"

# ── T8 dual-path convergence: both files must byte-match on the NEW T8 line ────
assert route.count(E8_NEW) == 1, f"{ROUTE}: E8_NEW count != 1"
assert prompts.count(E8_NEW) == 1, f"{PROMPTS}: E8_NEW count != 1"

# ── write ─────────────────────────────────────────────────────────────────────
with open(ROUTE, "w", encoding="utf-8") as f:
    f.write(route)
with open(PROMPTS, "w", encoding="utf-8") as f:
    f.write(prompts)
print(f"patched {ROUTE}")
print(f"patched {PROMPTS}")
print("OK — all assertions passed")
