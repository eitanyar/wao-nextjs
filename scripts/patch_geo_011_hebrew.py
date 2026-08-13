#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Patch script for geo onboarding page (task 011).
Replaces ASCII placeholder tokens with approved Hebrew strings.

Usage: python3 scripts/patch_geo_011_hebrew.py
"""

PAGE = "src/app/(app)/geo/onboarding/page.tsx"
SUBS = [
    ('"__GEO_GREETING__"', '"היי, אני אדם. בוא נבנה ביחד נוכחות שגוגל וה-AI ישמחו להמליץ עליה. נתחיל?"'),
    ('"__GEO_CONFIRM__"',  '"תודה! קיבלנו את כל הפרטים. נשלח לך בוואטסאפ את תוכנית העבודה הראשונה שלך."'),
]

def main():
    with open(PAGE, encoding="utf-8") as f:
        c = c0 = f.read()
    
    for old, new in SUBS:
        count = c.count(old)
        assert count == 1, f"Expected 1 occurrence of {old}, found {count}"
        c = c.replace(old, new)
    
    assert c != c0, "No substitutions made - check placeholder tokens"
    
    with open(PAGE, "w", encoding="utf-8") as f:
        f.write(c)
    
    print("OK — Hebrew tokens substituted")

if __name__ == "__main__":
    main()
