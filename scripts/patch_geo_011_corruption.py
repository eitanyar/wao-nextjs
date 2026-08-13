#!/usr/bin/env python3
"""Repair Qwen-injected foreign-script/garbled fragments in the GEO onboarding page.
Byte-exact old->new str.replace; asserts each old appears exactly once; writes nothing on mismatch."""
PAGE = "src/app/(app)/geo/onboarding/page.tsx"
SUBS = [
    # error toast: garbled נ偡ים -> ננסה ("let's try again")
    ('content: "אוי, נראה שיש לנו תקלת תקשורת קלה. בוא נ偡ים שוב!" }',
     'content: "אוי, נראה שיש לנו תקלת תקשורת קלה. בוא ננסה שוב!" }'),
    # progress label: tab + "bgogle" typo -> "בדיקת AI בגוגל"
    ('{ label: "בדיקת AI\tbgogle", field: "aioDetected"',
     '{ label: "בדיקת AI בגוגל", field: "aioDetected"'),
    # subtitle: Chinese 顺着溪流 injected; also fix past->present tense for a pre-collection header
    ('הבוט אסף את הפרטים הנדרשים顺着溪流.',
     'הבוט אוסף את הפרטים הנדרשים.'),
    # sim banner: garbled הapus -> clean sentence
    ('מצב דגמה פעיל. הapus את התשובות דרך הזרימה המוכנה.',
     'מצב הדגמה פעיל. התשובות רצות דרך הזרימה המוכנה.'),
    # input placeholder: Portuguese -> Hebrew
    ('placeholder=" continuar here"',
     'placeholder="כתוב כאן…"'),
    # info-panel heading: Portuguese "sobre" -> Hebrew
    ('sobre GEO/AIO?',
     'מה זה GEO/AIO?'),
    # info-panel body: garbage "TOUTS" -> clean gloss of AI Overview
    ('AI Overview (התשובה של גוגל על TOUTS).',
     'AI Overview (התשובה של גוגל בראש התוצאות).'),
]
with open(PAGE, encoding="utf-8") as f:
    c = c0 = f.read()
for old, new in SUBS:
    n = c.count(old)
    assert n == 1, f"expected 1 occurrence, found {n}: {old!r}"
    c = c.replace(old, new)
assert c != c0
with open(PAGE, "w", encoding="utf-8") as f:
    f.write(c)
print(f"OK — {len(SUBS)} corruption sites repaired")
