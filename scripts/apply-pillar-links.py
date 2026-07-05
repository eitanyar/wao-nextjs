import re

with open('src/data/knowledge.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Verify initial slug count
initial_slug_count = content.count('slug:')
assert initial_slug_count == 98, f"Expected 98 slugs, got {initial_slug_count}"

swaps = [
    # GEO Bot swaps (→ /geo)
    (
        '''    pillarLinks: [
      { label: "AI Overviews — ה-GEO של גוגל", href: "/knowledge/ai-overviews" },
      { label: "קידום ישויות — הבסיס ל-GEO", href: "/knowledge/entity-seo" },
    ],''',
        '''    pillarLinks: [
      { label: "שירות GEO לעסקים — הבוט שעושה את זה בשבילך", href: "/geo" },
      { label: "קידום ישויות — הבסיס ל-GEO", href: "/knowledge/entity-seo" },
    ],'''
    ),
    (
        '''    pillarLinks: [
      { label: "GEO — אופטימיזציה למנועי AI", href: "/knowledge/generative-engine-optimization" },
      { label: "חיפושים ללא הקלקה — תנועה ללא לחיצה", href: "/knowledge/zero-click-searches" },
    ],''',
        '''    pillarLinks: [
      { label: "GEO — אופטימיזציה למנועי AI", href: "/knowledge/generative-engine-optimization" },
      { label: "להיכנס לתשובות ה-AI של גוגל — שירות GEO Bot", href: "/geo" },
    ],'''
    ),
    (
        '''    pillarLinks: [
      { label: "GEO — אופטימיזציה למנועי AI", href: "/knowledge/generative-engine-optimization" },
      { label: "קידום ישויות — הבסיס לציטוטים", href: "/knowledge/entity-seo" },
    ],''',
        '''    pillarLinks: [
      { label: "רוצה שגוגל יצטט אותך? כך עובד GEO Bot", href: "/geo" },
      { label: "קידום ישויות — הבסיס לציטוטים", href: "/knowledge/entity-seo" },
    ],'''
    ),
    (
        '''    pillarLinks: [
      { label: "GEO — אופטימיזציה למנועי AI", href: "/knowledge/generative-engine-optimization" },
      { label: "AI Overviews — כיצד להופיע", href: "/knowledge/ai-overviews" },
    ],''',
        '''    pillarLinks: [
      { label: "GEO — אופטימיזציה למנועי AI", href: "/knowledge/generative-engine-optimization" },
      { label: "שירות GEO Bot — להפוך למקור שה-AI בוחר", href: "/geo" },
    ],'''
    ),
    (
        '''    pillarLinks: [
      { label: "AEO", href: "/knowledge/aeo" },
      { label: "GEO", href: "/knowledge/generative-engine-optimization" },
    ],''',
        '''    pillarLinks: [
      { label: "AEO", href: "/knowledge/aeo" },
      { label: "GEO Bot — להופיע בתשובות של מנועי ה-AI", href: "/geo" },
    ],'''
    ),
    (
        '''    pillarLinks: [
      { label: "AI Overviews — גורם לחיפושים ללא הקלקה", href: "/knowledge/ai-overviews" },
      { label: "GEO — להפיק ערך מ-AI", href: "/knowledge/generative-engine-optimization" },
    ],''',
        '''    pillarLinks: [
      { label: "AI Overviews — גורם לחיפושים ללא הקלקה", href: "/knowledge/ai-overviews" },
      { label: "GEO Bot — להפיק לקוחות גם בלי הקלקה", href: "/geo" },
    ],'''
    ),
    # GMB Bot swaps (→ /google-business)
    (
        '''    pillarLinks: [
      { label: "קידום מקומי — המדריך המלא", href: "/knowledge/local-seo" },
      { label: "תיבת המפה — כיצד להיכנס לשלושת הראשונים", href: "/knowledge/local-pack" },
    ],''',
        '''    pillarLinks: [
      { label: "קידום מקומי — המדריך המלא", href: "/knowledge/local-seo" },
      { label: "בוט שמנהל את הפרופיל בגוגל בשבילך — ₪149 לחודש", href: "/google-business" },
    ],'''
    ),
    (
        '''    pillarLinks: [
      { label: "גוגל לעסק שלי — אופטימיזציה", href: "/knowledge/google-my-business" },
      { label: "קידום מקומי — המדריך המלא", href: "/knowledge/local-seo" },
    ],''',
        '''    pillarLinks: [
      { label: "גוגל לעסק שלי — אופטימיזציה", href: "/knowledge/google-my-business" },
      { label: "GMB Bot — פרופיל פעיל שמכניס אותך לתיבת המפה", href: "/google-business" },
    ],'''
    ),
    (
        '''    pillarLinks: [
      { label: "אופטימיזציה מלאה של גוגל לעסק שלי", href: "/knowledge/google-my-business" },
      { label: "כיצד להיכנס לשלושת הראשונים בתיבת המפה", href: "/knowledge/local-pack" },
    ],''',
        '''    pillarLinks: [
      { label: "אופטימיזציה מלאה של גוגל לעסק שלי", href: "/knowledge/google-my-business" },
      { label: "ניהול גוגל לעסק שלי על אוטומט — GMB Bot", href: "/google-business" },
    ],'''
    ),
    (
        '''    pillarLinks: [
      { label: "קידום מקומי — הבסיס", href: "/knowledge/local-seo" },
      { label: "גוגל לעסק שלי — עקביות הפרופיל", href: "/knowledge/google-my-business" },
    ],''',
        '''    pillarLinks: [
      { label: "קידום מקומי — הבסיס", href: "/knowledge/local-seo" },
      { label: "GMB Bot — פרופיל גוגל מעודכן תמיד", href: "/google-business" },
    ],'''
    ),
]

for i, (old, new) in enumerate(swaps):
    count_before = content.count(old)
    assert count_before == 1, f"Swap {i}: expected 1 occurrence of OLD, got {count_before}"
    content = content.replace(old, new)
    count_after = content.count(new)
    assert count_after == 1, f"Swap {i}: expected 1 occurrence of NEW after replace, got {count_after}"
    print(f"Swap {i+1}/10: OK")

# Verify slug count unchanged
final_slug_count = content.count('slug:')
assert final_slug_count == 98, f"Slug count changed: {initial_slug_count} → {final_slug_count}"

with open('src/data/knowledge.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Done. {len(swaps)} swaps applied. Slug count: {final_slug_count} (unchanged).")
