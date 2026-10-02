#!/usr/bin/env python3
"""Apply the reviewed Hebrew copy bundle with exact baseline occurrence assertions."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "docs/copy/site-bot-page-copy-2026-10-02.json"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Check counts without writing")
    args = parser.parse_args()
    bundle = json.loads(BUNDLE.read_text(encoding="utf-8"))
    path = ROOT / bundle["page"]
    original = path.read_text(encoding="utf-8")
    matches = []
    for index, pair in enumerate(bundle["pairs"], 1):
        old, new, expected = pair["old"], pair["new"], pair["count"]
        assert old and new and old != new, f"pair {index}: empty/identical replacement"
        count = original.count(old)
        assert count == expected, f"pair {index}: expected {expected}, found {count}: {old!r}"
        print(f"{index:02d}: {count}/{expected} exact matches")
        offset = 0
        while (offset := original.find(old, offset)) != -1:
            matches.append((offset, offset + len(old), index, new))
            offset += len(old)
    # Prefer a complete long phrase over a shorter old string contained within it.
    chosen = []
    for match in sorted(matches, key=lambda m: (-(m[1] - m[0]), m[0])):
        if not any(match[0] < item[1] and item[0] < match[1] for item in chosen):
            chosen.append(match)
    selected = {item[2] for item in chosen}
    assert selected == set(range(1, len(bundle["pairs"]) + 1)), "a replacement is shadowed by another: " + str(set(range(1, len(bundle["pairs"]) + 1)) - selected)
    updated = original
    for start, end, index, new in sorted(chosen, reverse=True):
        old_fragment = updated[start:end]
        updated = updated[:start] + old_fragment.replace(old_fragment, new, 1) + updated[end:]
    assert updated != original
    if args.check:
        print(f"CHECK OK: {len(bundle['pairs'])} pairs, {len(chosen)} non-overlapping replacements; no write")
    else:
        path.write_text(updated, encoding="utf-8")
        print(f"APPLIED: {len(chosen)} replacements in {path}")


if __name__ == "__main__":
    main()
