#!/usr/bin/env python3
"""
Hebrew grammar checker / fixer for WAO site content.

Modes:
  check (default) — report issues, make no changes
  fix             — apply fixes and print a change report

Usage (run from WSL terminal, NOT through Claude Code):
    python3 scripts/hebrew-grammar-check.py                   # check src/data + src/app
    python3 scripts/hebrew-grammar-check.py src/              # check full src/
    python3 scripts/hebrew-grammar-check.py --fix             # fix src/data + src/app
    python3 scripts/hebrew-grammar-check.py src/data/knowledge.ts --fix
"""

import getpass
import json
import os
import re
import sys
import textwrap
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("ERROR: run `pip3 install anthropic --break-system-packages` first")
    sys.exit(1)

# ── API key ───────────────────────────────────────────────────────────────────
API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not API_KEY:
    try:
        API_KEY = getpass.getpass("Anthropic API key (hidden): ")
    except (KeyboardInterrupt, EOFError):
        print("\nCancelled.")
        sys.exit(1)
if not API_KEY:
    print("ERROR: no API key provided.")
    sys.exit(1)

HEBREW = re.compile(r"[א-תװ-״יִ-פֿ]")
MODEL = "claude-haiku-4-5-20251001"

# ── Prompts ───────────────────────────────────────────────────────────────────
CHECK_PROMPT = """\
אתה מגיה עברית מקצועי לאתר SEO עברי. סקור את שורות הקוד הבאות וזהה שגיאות.

בדוק בדיוק את הנקודות הבאות — אל תדווח על שגיאות סגנון אחרות:

1. שם פועל מול פועל מוטה — "זנחת X" (גוף שני עבר) במקום "זניחת X" (שם פועל בנסמך)
2. ה- לעומת ש- בפסוקית זיקה — כינוי מוכר דורש ה ("המעמיקים"), לא-מוכר דורש ש
3. מקף חסר בין קידומת עברית למילה באנגלית — "בWAO" במקום "ב-WAO", "לCluster" במקום "ל-Cluster"
4. סיומת גוף שלישי על מילה אנגלית — "לעדכנה" / "לקוראה" כשהמילה שהסיומת מתייחסת אליה היא מילה אנגלית
5. שגיאות כתיב ברורות — מילה עברית שגויה לחלוטין (למשל "ולל" במקום "וללא")

לכל ממצא ציין: הטקסט המדויק עם השגיאה, סוג השגיאה, והתיקון המוצע.
אם אין שגיאות מסוג זה — השב "✓ נקי" בלבד.

שורות לבדיקה:
---
{text}
---"""

FIX_PROMPT = """\
You are a Hebrew grammar checker for a Hebrew SEO website codebase.
Review the source lines below for ONLY these five error types:

1. Conjugated verb as label heading: "זנחת X" (past-2nd-person) → "זניחת X" (verbal-noun construct)
2. ה vs ש relative clause: known/definite antecedent needs ה prefix, unknown/indefinite needs ש
3. Missing hyphen between Hebrew prefix and English word: "בWAO"→"ב-WAO", "לCluster"→"ל-Cluster", "שPillar"→"ש-Pillar"
4. Pronominal suffix on an English word: "לעדכנה" when the referent is an English word like Pillar/Cluster
5. Clear Hebrew misspelling: e.g. "ולל" instead of "וללא"

Return ONLY a valid JSON array — no markdown fences, no explanation outside the array.
Each element:
  "original" : exact substring as it appears in the source (copy character-for-character)
  "fixed"    : corrected replacement
  "reason"   : one short English label (e.g. "missing hyphen", "verbal noun", "ה vs ש")

If no issues found, return exactly: []

Source lines:
---
{text}
---"""

# ── File helpers ──────────────────────────────────────────────────────────────
def extract_hebrew_lines(path: Path) -> list[tuple[int, str]]:
    try:
        source = path.read_text(encoding="utf-8")
    except Exception:
        return []
    results = []
    for i, line in enumerate(source.splitlines(), 1):
        if not HEBREW.search(line):
            continue
        stripped = line.strip()
        if stripped.startswith(("//", "import ", "*", "<!--", "}")):
            continue
        results.append((i, stripped))
    return results

def collect_files(targets: list[str]) -> list[Path]:
    files: list[Path] = []
    for t in targets:
        p = Path(t)
        if p.is_file():
            files.append(p)
        elif p.is_dir():
            files.extend(p.rglob("*.tsx"))
            files.extend(p.rglob("*.ts"))
        else:
            print(f"WARNING: {t} not found, skipping")
    return [
        f for f in files
        if ".next" not in str(f) and "node_modules" not in str(f)
    ]

def chunk_lines(lines: list[tuple[int, str]], max_chars: int = 5000) -> list[str]:
    chunks: list[str] = []
    current: list[str] = []
    size = 0
    for lineno, text in lines:
        entry = f"[line {lineno}] {text}"
        if size + len(entry) > max_chars and current:
            chunks.append("\n".join(current))
            current, size = [], 0
        current.append(entry)
        size += len(entry)
    if current:
        chunks.append("\n".join(current))
    return chunks

# ── API ───────────────────────────────────────────────────────────────────────
def call_api(client: anthropic.Anthropic, prompt: str) -> str:
    msg = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text.strip()

def check_chunk(client: anthropic.Anthropic, text: str) -> str:
    return call_api(client, CHECK_PROMPT.format(text=text))

def fix_chunk(client: anthropic.Anthropic, text: str) -> list[dict]:
    raw = call_api(client, FIX_PROMPT.format(text=text))
    # Strip accidental markdown fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE).strip()
    try:
        result = json.loads(raw)
        return result if isinstance(result, list) else []
    except json.JSONDecodeError:
        print(f"  WARNING: could not parse API response:\n{textwrap.indent(raw[:300], '    ')}")
        return []

# ── Modes ─────────────────────────────────────────────────────────────────────
def run_check(client: anthropic.Anthropic, files: list[Path]) -> None:
    found = False
    for path in sorted(files):
        lines = extract_hebrew_lines(path)
        if not lines:
            continue
        file_issues: list[str] = []
        for chunk in chunk_lines(lines):
            result = check_chunk(client, chunk)
            if "נקי" not in result and result.strip():
                file_issues.append(result)
        if file_issues:
            found = True
            print(f"\n{'─' * 64}")
            print(f"📄  {path}")
            print(f"{'─' * 64}")
            for issue in file_issues:
                print(textwrap.indent(issue, "  "))
    if not found:
        print("\n✓ לא נמצאו שגיאות.")

def run_fix(client: anthropic.Anthropic, files: list[Path]) -> None:
    total = 0
    for path in sorted(files):
        lines = extract_hebrew_lines(path)
        if not lines:
            continue

        all_fixes: list[dict] = []
        for chunk in chunk_lines(lines):
            all_fixes.extend(fix_chunk(client, chunk))

        if not all_fixes:
            continue

        source = path.read_text(encoding="utf-8")
        applied: list[tuple[str, str, str]] = []

        for fix in all_fixes:
            orig   = fix.get("original", "").strip()
            fixed  = fix.get("fixed", "").strip()
            reason = fix.get("reason", "")
            if orig and fixed and orig != fixed and orig in source:
                source = source.replace(orig, fixed, 1)
                applied.append((orig, fixed, reason))

        if applied:
            path.write_text(source, encoding="utf-8")
            total += len(applied)
            print(f"\n📄  {path}  ({len(applied)} fix{'es' if len(applied) != 1 else ''})")
            for orig, fixed, reason in applied:
                print(f"  ✓  [{reason}]")
                print(f"     Before: {orig[:90]}")
                print(f"     After:  {fixed[:90]}")

    print(f"\n{'═' * 64}")
    print(f"  Total fixes applied: {total}")
    print(f"{'═' * 64}")

# ── Entry point ───────────────────────────────────────────────────────────────
def main() -> None:
    args = sys.argv[1:]
    fix_mode = "--fix" in args
    paths = [a for a in args if not a.startswith("--")]

    # Default: src/data and src/app relative to the project root (two levels up from this script)
    project_root = Path(__file__).resolve().parent.parent
    if not paths:
        paths = [str(project_root / "src" / "data"), str(project_root / "src" / "app")]

    files = collect_files(paths)
    if not files:
        print("No .tsx/.ts files found.")
        sys.exit(0)

    mode_label = "FIX" if fix_mode else "CHECK"
    print(f"[{mode_label}] {len(files)} file(s)\n")
    client = anthropic.Anthropic(api_key=API_KEY)

    if fix_mode:
        run_fix(client, files)
    else:
        run_check(client, files)

if __name__ == "__main__":
    main()
