#!/usr/bin/env python3
"""Build a Cloudflare Bulk Redirects CSV from the legacy redirects in next.config.ts.

One row per old path. Cloudflare rejects "/a" and "/a/" in one list as duplicates, yet an exact
"/a" row does NOT match a "/a/" request (live test 2026-11-27). So every row uses subpath matching
(no path suffix kept): "/a" then also catches "/a/" and old WordPress extras like "/a/feed/".
Before adding a source, make sure it is not a parent folder of a live page. Percent-encoding is uppercase, which is
what browsers send. Pass --lowercase to emit the lowercase form instead. Source URLs
have no scheme (matches http + https) and include subdomains (matches www), so every
variant of an old URL goes straight to https://www.wao.co.il<new path> in one hop.

Usage: python3 scripts/ops/build-cloudflare-redirects-csv.py [out.csv]
CSV format per Cloudflare docs: no header row;
SOURCE,TARGET,STATUS,PRESERVE_QUERY,INCLUDE_SUBDOMAINS,SUBPATH,PRESERVE_PATH_SUFFIX
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HOST = "wao.co.il"
TARGET_ORIGIN = "https://www.wao.co.il"

config = (ROOT / "next.config.ts").read_text(encoding="utf-8")
start = config.index("const legacyRedirects")
end = config.index("\n] as const;", start)
rules = re.findall(
    r"source:\s*['\"]([^'\"]+)['\"],\s*destination:\s*['\"]([^'\"]+)['\"]",
    config[start:end],
)

# Same precedence as Next.js: the first rule for a path wins.
by_path: dict[str, str] = {}
for source, destination in rules:
    by_path.setdefault(source.rstrip("/"), destination)

rows: list[str] = []
seen: set[str] = set()
for bare, destination in by_path.items():
    upper = re.sub(r"%[0-9a-fA-F]{2}", lambda m: m.group(0).upper(), bare)
    lower = re.sub(r"%[0-9a-fA-F]{2}", lambda m: m.group(0).lower(), bare)
    target = TARGET_ORIGIN + ("" if destination == "/" else destination)
    if destination == "/":
        target += "/"
    for path in ((lower,) if "--lowercase" in sys.argv else (upper,)):
        source = HOST + path
        if source in seen:
            continue
        seen.add(source)
        rows.append(f"{source},{target},301,TRUE,TRUE,TRUE,FALSE")

args = [a for a in sys.argv[1:] if not a.startswith("--")]
out = Path(args[0]) if args else ROOT / "docs/ops/cloudflare-bulk-redirects.csv"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("\n".join(rows) + "\n", encoding="utf-8")
print(f"{len(by_path)} old URLs -> {len(rows)} rows -> {out}")
