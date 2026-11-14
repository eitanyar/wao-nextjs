"""Locations for the Dash story toolkit. Code lives in scripts/video/dash; assets, story specs, build artifacts and
outputs stay in gitignored scratch/. ROOT is the repo root, derived from this file's location."""
import os

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(TOOLS, "..", "..", ".."))
LIB = os.path.join(ROOT, "scripts", "video", "lib")             # the packaged face rig + caption/page libs
OUT_ROOT = os.environ.get("DASH_OUT_ROOT") or os.path.join(ROOT, "scratch", "video-out", "stories")
BUILD_DIR = os.environ.get("DASH_BUILD_DIR") or None            # None: <story.json dir>/story-build


def take_flags(argv):
    """Strip --out-root DIR / --build-dir DIR from argv (any position), apply them, return the rest."""
    global OUT_ROOT, BUILD_DIR
    rest, i = [], 0
    while i < len(argv):
        if argv[i] in ("--out-root", "--build-dir"):
            assert i + 1 < len(argv), f"{argv[i]} needs a directory"
            if argv[i] == "--out-root": OUT_ROOT = argv[i + 1]
            else: BUILD_DIR = argv[i + 1]
            i += 2
        else:
            rest.append(argv[i]); i += 1
    return rest
