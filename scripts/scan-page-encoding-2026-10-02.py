#!/usr/bin/env python3
"""Reject unrelated scripts and common UTF-8 mojibake in the landing pages."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES = (
    ROOT / "src/app/(app)/site-bot/page.tsx",
    ROOT / "src/app/(app)/google-ads/page.tsx",
)
FORBIDDEN = re.compile(
    r"[\u0400-\u052f\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff"
    r"\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]"
    r"|\u00c3[\u0080-\u00bf\u00a2]"
    r"|\u00e2[\u0080-\u00bf\u20ac\u2122]"
    r"|\ufffd"
)


def main() -> int:
    failed = False
    for page in PAGES:
        text = page.read_text(encoding="utf-8", errors="strict")
        matches = list(FORBIDDEN.finditer(text))
        for match in matches:
            line = text.count("\n", 0, match.start()) + 1
            print(f"FAIL {page.relative_to(ROOT)}:{line}: U+{ord(match.group()[0]):04X}")
        if not matches:
            print(f"PASS {page.relative_to(ROOT)}: no forbidden script or mojibake markers")
        failed |= bool(matches)
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
