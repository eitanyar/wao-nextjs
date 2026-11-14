"""Seat-2 entry point, kept for old command lines. The seat-2 extension (glyphs "bars" / "invoice" / "site-one-bar" /
"phone-off", the "pagecard" overlay and its evidence, per-shot "exit_dur") is merged into the shared builder
dash_story.py (scripts/video/dash); this file only forwards to it.

    python3 dash_story_seat2.py <prep|overlays|render|preview|evidence|sheets|endcard> <story.json> [...]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dash_story as DS

if __name__ == "__main__":
    DS.main()
